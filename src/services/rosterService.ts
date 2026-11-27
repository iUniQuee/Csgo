/**
 * Monthly HLTV roster overlay.
 *
 * The generated `public/data/monthly-roster.json` is fetched on startup and
 * applied to the built-in card database. A missing or malformed file is not an
 * error: the app simply keeps its built-in ratings and transfers.
 */
export type RosterPlayer = {
  id?: string;
  name: string;
  team?: string;
  country?: string;
  role?: string;
  ovr: number;
  aim?: number;
  rfl?: number;
  sns?: number;
  clt?: number;
  baseOvr?: number;
  rating?: number | null;
  form?: number;
};

export type MonthlyRoster = {
  generatedAt?: string;
  month: string;
  source?: string;
  hltv?: { matched?: number; transfers?: number; rows?: number; warning?: string };
  players: RosterPlayer[];
};

export type RosterSyncState = {
  month: string;
  source: 'hltv' | 'fallback' | 'seed' | 'built-in';
  matched: number;
  generatedAt?: string;
  applied: boolean;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const currentMonthKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** `"2026-11"` becomes `"November 2026"`. */
export const monthYearLabel = (monthKey: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Math.min(12, Math.max(1, Number(match[2])));
  return `${MONTHS[month - 1]} ${year}`;
};

export const fallbackRosterSync = (): RosterSyncState => ({
  month: currentMonthKey(),
  source: 'built-in',
  matched: 0,
  applied: false,
});

const readSource = (source: unknown): RosterSyncState['source'] => {
  const value = typeof source === 'string' ? source.toLowerCase() : '';
  if (value === 'hltv') return 'hltv';
  if (value === 'fallback') return 'fallback';
  if (value === 'seed' || value.startsWith('seed:')) return 'seed';
  return 'fallback';
};

const isRosterPlayer = (value: unknown): value is RosterPlayer => {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.name === 'string' && row.name.length > 0 && Number.isFinite(Number(row.ovr));
};

export async function fetchMonthlyRoster(): Promise<MonthlyRoster | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/monthly-roster.json`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<MonthlyRoster>;
    if (!data || !Array.isArray(data.players)) return null;
    const players = data.players.filter(isRosterPlayer).slice(0, 5000);
    if (!players.length) return null;
    const month = typeof data.month === 'string' && /^\d{4}-\d{2}$/.test(data.month) ? data.month : currentMonthKey();
    return {
      month,
      generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : undefined,
      source: typeof data.source === 'string' ? data.source : 'fallback',
      hltv: data.hltv && typeof data.hltv === 'object' ? data.hltv : undefined,
      players,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const syncStateFromRoster = (roster: MonthlyRoster, applied: boolean): RosterSyncState => ({
  month: roster.month,
  source: readSource(roster.source),
  matched: Math.max(0, Math.round(Number(roster.hltv?.matched) || 0)),
  generatedAt: roster.generatedAt,
  applied,
});
