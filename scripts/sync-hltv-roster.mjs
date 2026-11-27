#!/usr/bin/env node
/**
 * Monthly HLTV pro-scene roster sync.
 *
 * Refreshes `public/data/monthly-roster.json`, the app's runtime overlay on the
 * built-in 1,200-player card database. Each run:
 *   1. reads the previous roster snapshot (which stores every player's base OVR),
 *   2. fetches the most recent month of HLTV player stats (Top 50 filter),
 *   3. applies HLTV ratings, known team transfers and a small deterministic
 *      monthly form adjustment to every player,
 *   4. writes the new snapshot for the app to pick up on its next load.
 *
 * HLTV has no public API and may block automated requests. When that happens the
 * script logs the reason and still writes a valid deterministic monthly refresh,
 * so the scheduled workflow and the in-app badge keep advancing.
 *
 * Usage:
 *   node scripts/sync-hltv-roster.mjs
 *   node scripts/sync-hltv-roster.mjs --offline   # skip the network fetch
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROSTER_PATH = resolve(ROOT, 'public/data/monthly-roster.json');
const OFFLINE = process.argv.includes('--offline') || process.env.HLTV_SYNC_OFFLINE === '1';
const HLTV_ORIGIN = 'https://www.hltv.org';
const REQUEST_TIMEOUT_MS = 20_000;
const MIN_OVR = 40;
const MAX_OVR = 99;
const MIN_STAT = 30;

const TEAM_ALIASES = {
  vitality: 'Team Vitality',
  spirit: 'Team Spirit',
  falcons: 'Team Falcons',
  navi: 'NAVI',
  g2: 'G2 Esports',
  faze: 'FaZe Clan',
  mouz: 'MOUZ',
  liquid: 'Team Liquid',
  mongolz: 'The MongolZ',
};

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(value)));

const decodeHtml = (value) => String(value ?? '').replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity) => {
  const key = entity.toLowerCase();
  if (key === 'amp') return '&';
  if (key === 'lt') return '<';
  if (key === 'gt') return '>';
  if (key === 'quot') return '"';
  if (key === 'apos' || key === 'nbsp') return key === 'nbsp' ? ' ' : "'";
  if (key.startsWith('#x')) return String.fromCodePoint(Number.parseInt(key.slice(2), 16) || 32);
  if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(1), 10) || 32);
  return match;
});

/** Stable 32-bit hash so the same month always produces the same form drift. */
const hash = (value) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** Previous calendar month, the window used for the new monthly form. */
const previousMonthWindow = (now) => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: isoDate(start), end: isoDate(end) };
};

const cellText = (html) => decodeHtml(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function parseHltvPlayerRows(html) {
  const rows = [];
  for (const row of String(html).split(/<tr\b/i).slice(1)) {
    const playerMatch = row.match(/href="\/player\/(\d+)\/[^"]*"[^>]*>([\s\S]{1,300}?)<\/a>/i);
    if (!playerMatch) continue;
    const teamMatch = row.match(/href="\/team\/(\d+)\/[^"]*"[^>]*>([\s\S]{1,300}?)<\/a>/i);
    const ratingMatch = row.match(/class="[^"]*ratingCol[^"]*"[^>]*>\s*(?:<[^>]+>\s*)*([0-9]\.[0-9]{2})/i)
      ?? row.match(/\b([01]\.[0-9]{2})\b/);
    const rating = ratingMatch ? Number(ratingMatch[1]) : Number.NaN;
    const name = cellText(playerMatch[2]);
    if (!name || !Number.isFinite(rating) || rating <= 0 || rating > 3) continue;
    rows.push({ name, team: teamMatch ? cellText(teamMatch[2]) : '', rating });
  }
  return rows;
}

async function fetchHltvPlayers(now) {
  const { start, end } = previousMonthWindow(now);
  const url = `${HLTV_ORIGIN}/stats/players?startDate=${start}&endDate=${end}&rankingFilter=Top50`;
  if (OFFLINE) return { rows: [], sourceUrl: url, reason: 'offline mode' };
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'CS2-Ultimate-Team-monthly-roster-sync/1.0 (+https://github.com/iUniQuee/Csgo)',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseHltvPlayerRows(await response.text());
    if (!rows.length) throw new Error('no player rows found in the response');
    return { rows, sourceUrl: url };
  } catch (error) {
    return { rows: [], sourceUrl: url, reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Resolves an HLTV team label to one of the app's 240 real clubs. */
function buildTeamResolver(teamNames) {
  const known = new Set(teamNames);
  const byNormalized = new Map(teamNames.map((name) => [normalize(name), name]));
  const stripped = new Map(teamNames.map((name) => [normalize(name).replace(/^team/, ''), name]));

  return (rawTeam) => {
    const normalized = normalize(rawTeam);
    if (!normalized) return null;
    if (byNormalized.has(normalized)) return byNormalized.get(normalized);
    const withoutPrefix = normalized.replace(/^team/, '');
    if (stripped.has(withoutPrefix)) return stripped.get(withoutPrefix);
    const alias = TEAM_ALIASES[normalized] ?? TEAM_ALIASES[withoutPrefix];
    if (alias && known.has(alias)) return alias;
    return null;
  };
}

function monthlyFormDrift(player, monthKey) {
  return (hash(`${monthKey}:${player.id}:${player.name}`) % 5) - 2;
}

async function main() {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(ROSTER_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${ROSTER_PATH}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(snapshot.players) || snapshot.players.length < 100) {
    throw new Error('monthly-roster.json is missing its player roster seed');
  }

  const players = snapshot.players;
  const knownTeams = [...new Set(players.map((player) => player.team).filter(Boolean))];
  const resolveTeam = buildTeamResolver(knownTeams);
  const hltv = await fetchHltvPlayers(now);

  const rowsByName = new Map();
  for (const row of hltv.rows) {
    const key = normalize(row.name);
    if (!key) continue;
    const list = rowsByName.get(key);
    if (list) list.push(row);
    else rowsByName.set(key, [row]);
  }

  let matched = 0;
  let transfers = 0;
  for (const player of players) {
    const previousOvr = clamp(Number(player.ovr) || 1, 1, MAX_OVR);
    const baseOvr = clamp(Number(player.baseOvr) || previousOvr, MIN_OVR, MAX_OVR);
    const candidates = rowsByName.get(normalize(player.name)) ?? [];
    const resolvedLocalTeam = resolveTeam(player.team);
    const row = candidates.find((entry) => resolveTeam(entry.team) === resolvedLocalTeam)
      ?? (candidates.length === 1 ? candidates[0] : null);

    let form = monthlyFormDrift(player, monthKey);
    if (row) {
      matched += 1;
      player.rating = Math.round(row.rating * 100) / 100;
      form += clamp(Math.round((row.rating - 1.1) * 16), -4, 6);
      const transferTo = resolveTeam(row.team);
      if (transferTo && transferTo !== player.team) {
        player.team = transferTo;
        transfers += 1;
      }
    } else if (!Number.isFinite(Number(player.rating))) {
      // Keep the last known HLTV rating while the feed is unavailable.
      player.rating = null;
    }

    const ovr = clamp(baseOvr + form, MIN_OVR, MAX_OVR);
    const shift = ovr - previousOvr;
    player.baseOvr = baseOvr;
    player.ovr = ovr;
    player.form = form;
    for (const stat of ['aim', 'rfl', 'sns', 'clt']) {
      player[stat] = clamp((Number(player[stat]) || ovr) + shift, MIN_STAT, MAX_OVR);
    }
  }

  const source = hltv.rows.length ? 'hltv' : 'fallback';
  const next = {
    generatedAt: now.toISOString(),
    month: monthKey,
    source,
    hltv: {
      matched,
      transfers,
      rows: hltv.rows.length,
      sourceUrl: hltv.sourceUrl,
      ...(hltv.reason ? { warning: hltv.reason } : {}),
    },
    players,
  };

  await mkdir(dirname(ROSTER_PATH), { recursive: true });
  await writeFile(ROSTER_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

  console.log(`Monthly roster ${monthKey} written: ${players.length} players, ${matched} HLTV rating matches, ${transfers} transfers, source=${source}${hltv.reason ? ` (${hltv.reason})` : ''}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
