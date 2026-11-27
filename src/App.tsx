import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { simulateRound, type Duelist, type FeedLine } from './matchEngine';
import {
  assignHumanToDivision,
  createHumanTeam,
  createZone,
  divisionOutcome,
  joinZone,
  promotionSlots,
  squadOvr,
  teamKind,
  ZONE_SIZE,
  zoneLabel,
  type BotSeed,
  type LeagueTeam,
  type SquadCard,
} from './utils/matchmakingEngine';
import { leagueService, type OnlineTeamRow, type TopClubRow } from './services/leagueService';
import { isSoundMuted, playSound, setSoundMuted, subscribeSoundMuted } from './utils/sound';
import { buyListing, cancelListing, claimSale, createListing, fetchMyListings, fetchOpenListings, marketPayout, MARKET_TAX, type MarketListing } from './services/marketService';
import { challengeService, type ChallengeManager } from './services/challengeService';
import { buildScoreboard, type MatchScoreboard } from './services/matchStats';
import { TacticalRadar, type RadarDuelist, type RadarMapId } from './components/TacticalRadar';
import { CountryFlag, PlayerSilhouette } from './components/CountryFlag';
const RARITY_RANK: Record<Tier, number> = { Bronze: 0, Silver: 1, Gold: 2, Star: 3, Icon: 4 };
const RADAR_MAPS: RadarMapId[] = ['Mirage', 'Inferno', 'Ancient', 'Dust2', 'Nuke'];
const pickRadarMap = (): RadarMapId => RADAR_MAPS[Math.floor(Math.random() * RADAR_MAPS.length)];
import { DEFAULT_ACCENT, EMBLEM_ACCENTS, EMBLEMS, TeamEmblem, type EmblemId } from './emblems';
import { loadCloudProfile, saveCloudProfile } from './services/profileService';
import { isSupabaseConfigured } from './services/supabase';
import { authErrorMessage, authService, type AuthSession } from './services/authService';
import { advanceEcoState, DIVISION_BANDS, ecoTeamById, ecoTeamsInDivision, readEcoState, saveEcoState, teamAvgOvr, teamRoster, teamTier, WORLD_PLAYERS, type EcoState, type EcoTeam, type OvrRange } from './ecosystem';
import {
  ArrowLeftRight,
  BadgeCheck,
  Box,
  ChevronRight,
  CircleHelp,
  Coins,
  Crosshair,
  Crown,
  Filter,
  Flame,
  Gem,
  Gift,
  Globe,
  Grid2X2,
  Headphones,
  LayoutGrid,
  Lock,
  LockKeyhole,
  LogOut,
  Mail,
  Medal,
  PawPrint,
  Pencil,
  Percent,
  Play,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Star,
  Store,
  Swords,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  UserRound,
  Users,
  X,
  Plus,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';

type Page = 'squad' | 'store' | 'club' | 'market' | 'arena' | 'profile';
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Star' | 'Icon';
type Role = 'AWPer' | 'Entry' | 'IGL' | 'Rifler' | 'Lurker';
type Perk = 'Tactical Genius' | 'Aim Coach' | 'Scout Master' | 'Clutch Master' | 'Match Prize Booster' | 'Pack Luck Boost';
type Avatar = 'falcon' | 'wolf' | 'visor' | 'tiger' | 'ghost' | 'sentinel';
type PlayerCard = {
  id: string;
  name: string;
  team: string;
  country: string;
  role: Role;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
  tier: Tier;
};
type OwnedCard = PlayerCard & { instanceId: string; level: number; xp?: number };
/** Supabase connection state shown in the header: live cloud save, syncing, or local mode. */
type CloudSync = 'off' | 'idle' | 'synced' | 'error';
type CardPower = { ovr: number; aim: number; rfl: number; sns: number; clt: number };
const CARD_MAX_LEVEL = 5;
const CARD_XP_STEP = 100;
const SCRIM_CARD_XP = 25;
const cardLevel = (level?: number): number => Math.min(CARD_MAX_LEVEL, Math.max(1, level || 1));
const cardXp = (xp?: number): number => Math.max(0, Math.floor(xp || 0));
const grantCardXp = (card: OwnedCard, amount: number): OwnedCard => {
  let xp = cardXp(card.xp) + Math.max(0, Math.floor(amount));
  let level = cardLevel(card.level);
  while (xp >= CARD_XP_STEP && level < CARD_MAX_LEVEL) { xp -= CARD_XP_STEP; level += 1; }
  if (level >= CARD_MAX_LEVEL) xp = Math.min(xp, CARD_XP_STEP);
  return { ...card, level, xp };
};
const cardBonus = (level?: number): number => { const lvl = cardLevel(level); return lvl <= 1 ? 0 : lvl === CARD_MAX_LEVEL ? 5 : lvl - 1; };
const cardPower = (card: { ovr: number; aim: number; rfl: number; sns: number; clt: number; level?: number }): CardPower => { const bonus = cardBonus(card.level); return { ovr: Math.min(99, card.ovr + bonus), aim: Math.min(99, card.aim + bonus), rfl: Math.min(99, card.rfl + bonus), sns: Math.min(99, card.sns + bonus), clt: Math.min(99, card.clt + bonus) }; };
const SLOT1_PERKS: Perk[] = ['Tactical Genius', 'Aim Coach', 'Scout Master'];
const SLOT2_PERKS: Perk[] = ['Clutch Master', 'Match Prize Booster', 'Pack Luck Boost'];
/** Slot 1 scales at LVL 15 / LVL 30, Slot 2 unlocks at LVL 5 and scales at LVL 20 / LVL 40. */
const perkTier = (level: number, slot: 1 | 2): 1 | 2 | 3 => slot === 1 ? (level >= 30 ? 3 : level >= 15 ? 2 : 1) : (level >= 40 ? 3 : level >= 20 ? 2 : 1);
const perkScale = (level: number, slot: 1 | 2, values: [number, number, number]): number => values[perkTier(level, slot) - 1];
const PLACEHOLDER_CLUB = /^(the\s*mongolz|tmz|your club)$/i;
const clubLabel = (teamName?: string): string => { const trimmed = (teamName ?? '').trim(); return !trimmed || PLACEHOLDER_CLUB.test(trimmed) ? 'YOUR CLUB' : trimmed; };
const clubMonogram = (teamName?: string): string => { const letters = clubLabel(teamName).replace(/[^a-z0-9]/gi, ''); return letters.slice(0, 3).toUpperCase() || 'MON'; };
const roleLabel = (role: Role): string => role === 'Lurker' ? 'Support' : role;
type Profile = { nickname: string; teamName: string; avatar: Avatar; perk: Perk; perk2?: Perk; badge?: string; emblem?: EmblemId; accent?: string };
type Tactic = 'Aggressive Rush' | 'Slow Default' | 'Defensive / Anti-Eco';
type EconomyRound = 'Pistol' | 'Eco' | 'Force Buy' | 'Full Buy';
type RoundEconomy = { ours: EconomyRound; theirs: EconomyRound };
type MatchHighlight = { kind: 'thrifty' | 'clutch'; title: string; note: string } | null;
const TACTICS: Array<{ id: Tactic; note: string }> = [
  { id: 'Aggressive Rush', note: 'Fast entries and early utility. High pressure, higher risk.' },
  { id: 'Slow Default', note: 'Balanced map control, timed utility and a mid-round fake.' },
  { id: 'Defensive / Anti-Eco', note: 'Hold angles, protect the anchors and punish eco rushes.' },
];
const economyForRound = (round: number): RoundEconomy => {
  const cycle = ((Math.max(1, round) - 1) % 8) + 1;
  if (cycle === 1) return { ours: 'Pistol', theirs: 'Pistol' };
  if (cycle === 2) return { ours: 'Eco', theirs: 'Full Buy' };
  if (cycle === 3) return { ours: 'Force Buy', theirs: 'Full Buy' };
  if (cycle === 6) return { ours: 'Full Buy', theirs: 'Eco' };
  if (cycle === 7) return { ours: 'Full Buy', theirs: 'Force Buy' };
  return { ours: 'Full Buy', theirs: 'Full Buy' };
};
const economyPower = (round: EconomyRound): number => round === 'Eco' ? -8 : round === 'Force Buy' ? -3 : round === 'Pistol' ? -2 : 0;
const withEconomy = (value: number, delta: number): number => Math.max(50, Math.min(99, value + delta));
type PackId = 'bronze' | 'silver' | 'gold' | 'major' | 'daily' | 'awp' | 'rifle' | 'asia' | 'igl';
type DropRow = [Tier, number];
type PackDefinition = { id: PackId; name: string; price: number; tier: Tier; art: string; tagline: string; description: string; odds: string; count: number; badge?: string; color?: string; soft?: string; bulk?: boolean };
type CareerStats = { matches: number; wins: number; mapCounts: Record<string, number> };
const createCareer = (): CareerStats => ({ matches: 0, wins: 0, mapCounts: {} });
const normalizeCareer = (value?: Partial<CareerStats>): CareerStats => ({
  matches: Math.max(0, Math.floor(Number(value?.matches) || 0)),
  wins: Math.max(0, Math.floor(Number(value?.wins) || 0)),
  mapCounts: value?.mapCounts && typeof value.mapCounts === 'object'
    ? Object.fromEntries(Object.entries(value.mapCounts).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])).map(([map, count]) => [map, Math.max(0, Math.floor(count))]))
    : {},
});
type SaveData = { profile: Profile; coins: number; owned: OwnedCard[]; squad: Record<Role, string>; page: Page; newCardIds: string[]; managerXp: number; league?: LeagueState; dailyClaimAt?: number; rewardedLevel?: number; lastActiveAt?: number; quests?: QuestState; claimedClubs?: string[]; career?: CareerStats };
type PackCard = OwnedCard & { revealed?: boolean };
type Division = { name: string; ovr: number; ovrMin: number; ovrMax: number; reward: number };
type LeagueTrophy = { season: number; division: string; place: number };
type SeasonSummary = { season: number; divisionIndex: number; place: number; payout: number; promoted: boolean; relegated: boolean; trophy: boolean; teams: LeagueTeam[] };
type LeagueMatchLog = { dayKey: string; slot: number; opponent: string; won: boolean; us: number; them: number; coins: number };
type LeagueDayResult = { dayKey: string; division: number; rank: number; promoted: boolean; relegated: boolean; coins: number; wins: number; losses: number };
type LeagueState = { division: number; season: number; monthKey?: string; matchday: number; teams: LeagueTeam[]; trophies: LeagueTrophy[]; summary: SeasonSummary | null; dayKey?: string; slot?: number; lastSlotAt?: number; dayResult?: LeagueDayResult | null; zone?: number; zoneCount?: number };
type QuestId = 'packs' | 'train' | 'scrim';
type QuestState = { day: string; packs: number; scrim: number; train: number; claimed: QuestId[]; scrimWins: number };

const monthKeyOf = (timestamp: number): string => { const date = new Date(timestamp); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const monthEndAt = (timestamp: number): number => { const date = new Date(timestamp); return new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime(); };
const monthIndex = (key: string): number => { const [year, month] = key.split('-').map(Number); return Number.isFinite(year) && Number.isFinite(month) ? year * 12 + month - 1 : Number.NaN; };
const monthsBetween = (from: string, to: string): number => { const diff = monthIndex(to) - monthIndex(from); return Number.isFinite(diff) ? Math.min(12, Math.max(0, diff)) : 0; };
const seasonCountdown = (now: number): string => { const remaining = Math.max(0, monthEndAt(now) - now); const days = Math.floor(remaining / 86400000); const hours = Math.floor((remaining % 86400000) / 3600000); return `${days}d ${hours}h`; };
const seasonLabel = (season: number): string => `Season ${String(season).padStart(2, '0')}`;
const IDLE_MIN_MS = 15 * 60 * 1000;
const IDLE_MAX_MS = 12 * 60 * 60 * 1000;
const idleHourlyRate = (divisionIndex: number): number => 50 + Math.round((Math.max(0, Math.min(divisions.length - 1, divisionIndex)) / (divisions.length - 1)) * 250);
const rolloverDrop = (divisionIndex: number): number => divisionIndex <= 2 ? 0 : divisionIndex <= 8 ? 2 : 3;

const divisionMeta: { name: string; reward: number }[] = [
  { name: 'Bronze', reward: 1500 },
  { name: 'Silver', reward: 2500 },
  { name: 'Gold Nova', reward: 3500 },
  { name: 'Master Guardian', reward: 5000 },
  { name: 'Guardian Elite', reward: 7000 },
  { name: 'Vanguard', reward: 9500 },
  { name: 'Legendary Eagle', reward: 12000 },
  { name: 'Supreme Legend', reward: 15000 },
  { name: 'World Class', reward: 19000 },
  { name: 'Pro Series', reward: 24000 },
  { name: 'Eagle Elite', reward: 30000 },
  { name: 'Prime Division', reward: 38000 },
  { name: 'Major Elite', reward: 48000 },
  { name: 'Supreme Elite', reward: 60000 },
  { name: 'Global Elite', reward: 100000 },
];

// OVR bands mirror the real 1,195-player database, so every division's clubs
// (real or filler) sit in one coherent, monotonic strength ladder.
const divisions: Division[] = divisionMeta.map((meta, index) => {
  const [ovrMin, ovrMax] = DIVISION_BANDS[index] ?? [58, 60];
  return { ...meta, ovrMin, ovrMax, ovr: Math.round((ovrMin + ovrMax) / 2) };
});

type RoadmapShape = 'chevron' | 'winged' | 'crest' | 'crown';
type RoadmapPalette = { color: string; deep: string; soft: string; glow: string; shape: RoadmapShape };

// The ladder palette deliberately mirrors CS2 rank progression: muted metals at
// the bottom, blue/cyan for the eagle tiers, violet-crimson for the elite band,
// and a warm gold summit for Global Elite.
const roadmapPalettes: RoadmapPalette[] = [
  { color: '#c88a5a', deep: '#4a2814', soft: 'rgba(200,138,90,.13)', glow: 'rgba(200,138,90,.28)', shape: 'chevron' },
  { color: '#b8c4d4', deep: '#334155', soft: 'rgba(184,196,212,.11)', glow: 'rgba(184,196,212,.24)', shape: 'chevron' },
  { color: '#f5c451', deep: '#6b4308', soft: 'rgba(245,196,81,.14)', glow: 'rgba(245,196,81,.36)', shape: 'chevron' },
  { color: '#93c5fd', deep: '#1e3a8a', soft: 'rgba(147,197,253,.12)', glow: 'rgba(147,197,253,.3)', shape: 'winged' },
  { color: '#5eead4', deep: '#115e59', soft: 'rgba(94,234,212,.12)', glow: 'rgba(94,234,212,.32)', shape: 'winged' },
  { color: '#38bdf8', deep: '#0c4a6e', soft: 'rgba(56,189,248,.13)', glow: 'rgba(56,189,248,.38)', shape: 'winged' },
  { color: '#60a5fa', deep: '#1e40af', soft: 'rgba(96,165,250,.13)', glow: 'rgba(96,165,250,.38)', shape: 'winged' },
  { color: '#c084fc', deep: '#4c1d95', soft: 'rgba(192,132,252,.14)', glow: 'rgba(192,132,252,.4)', shape: 'crest' },
  { color: '#a78bfa', deep: '#5b21b6', soft: 'rgba(167,139,250,.13)', glow: 'rgba(167,139,250,.38)', shape: 'crest' },
  { color: '#f472b6', deep: '#831843', soft: 'rgba(244,114,182,.13)', glow: 'rgba(244,114,182,.38)', shape: 'crest' },
  { color: '#22d3ee', deep: '#164e63', soft: 'rgba(34,211,238,.14)', glow: 'rgba(34,211,238,.4)', shape: 'winged' },
  { color: '#fbbf24', deep: '#78350f', soft: 'rgba(251,191,36,.15)', glow: 'rgba(251,191,36,.42)', shape: 'crest' },
  { color: '#fb7185', deep: '#7f1d1d', soft: 'rgba(251,113,133,.14)', glow: 'rgba(251,113,133,.4)', shape: 'crest' },
  { color: '#a855f7', deep: '#581c87', soft: 'rgba(168,85,247,.16)', glow: 'rgba(168,85,247,.46)', shape: 'crest' },
  { color: '#ffd166', deep: '#7c4a0a', soft: 'rgba(255,209,102,.19)', glow: 'rgba(255,209,102,.56)', shape: 'crown' },
];

const rankVars = (palette: RoadmapPalette): React.CSSProperties => ({
  '--rank-color': palette.color,
  '--rank-deep': palette.deep,
  '--rank-soft': palette.soft,
  '--rank-glow': palette.glow,
} as React.CSSProperties);

const leagueMatchdays = 24;
const ecoRanges: OvrRange[] = divisions.map((item) => ({ min: item.ovrMin, max: item.ovrMax }));
let ecoSnapshot: EcoTeam[] = readEcoState(ecoRanges).teams;

const ecoIdOf = (team: LeagueTeam): string => team.id.replace(/-d\d+-z\d+$/, '');

const RIVAL_HANDLES = ['V1PER', 'N0VA', 'KrypTic', 'Ashborne', 'Zephyr', 'Mako', 'Riven', 'Sable', 'Onyx', 'Halcyon', 'Draco', 'Echo', 'Frost', 'Kairo', 'Lumen', 'Nyx'];
const RIVAL_CLUBS = ['Viper Syndicate', 'Nova Order', 'KrypTic Esports', 'Ashborne', 'Zephyr Nine', 'Mako Five', 'Riven Collective', 'Sable Legion', 'Onyx Pact', 'Team Halcyon', 'Draco Prime', 'Echo Division', 'Frostline', 'Kairo Club', 'Lumen 5', 'Nyx Union'];
const RIVAL_AVATARS: string[] = ['falcon', 'wolf', 'visor', 'tiger', 'ghost', 'sentinel'];
const RIVAL_PERKS: Perk[] = [...SLOT1_PERKS, ...SLOT2_PERKS];
const ECO_ROLES = ['Entry', 'AWPer', 'IGL', 'Rifler', 'Support'];

/**
 * Deterministic real-manager rivals for the local fallback. They carry a 5-card squad,
 * card levels and a manager perk so PLAYER badges and the Team Roster Modal are real.
 * Once Supabase keys exist these are replaced by the live manager rows.
 */
function buildRivals(divisionIndex: number): LeagueTeam[] {
  const division = divisions[divisionIndex];
  const count = divisionIndex === 0 ? 0 : divisionIndex >= divisions.length - 2 ? 3 : 2;
  const band = WORLD_PLAYERS.filter((player) => player.ovr >= division.ovrMin - 4 && player.ovr <= division.ovrMax + 4);
  const pool = (band.length >= 10 ? band : WORLD_PLAYERS).slice().sort((a, b) => b.ovr - a.ovr);
  return Array.from({ length: count }, (_, index) => {
    const seed = divisionIndex * 41 + index * 7;
    const squad: SquadCard[] = ECO_ROLES.map((role, slot) => {
      const candidates = pool.filter((player) => player.role === role);
      const player = candidates.length ? candidates[(seed + slot * 3) % candidates.length] : pool[(seed + slot) % pool.length];
      return {
        name: player.name,
        role: role === 'Support' ? 'Lurker' : role,
        level: 1 + ((index + slot) % 3),
        ovr: player.ovr,
        team: player.team,
        country: player.country,
      };
    });
    return createHumanTeam({
      id: `human-d${divisionIndex + 1}-${index + 1}`,
      name: RIVAL_CLUBS[(divisionIndex * 3 + index) % RIVAL_CLUBS.length],
      manager: RIVAL_HANDLES[(divisionIndex * 5 + index) % RIVAL_HANDLES.length],
      avatar: RIVAL_AVATARS[(divisionIndex + index) % RIVAL_AVATARS.length],
      perk: RIVAL_PERKS[(divisionIndex + index) % RIVAL_PERKS.length],
      perk2: index % 2 === 0 ? RIVAL_PERKS[(divisionIndex + index + 2) % RIVAL_PERKS.length] : undefined,
      squad,
    });
  });
}

function divisionBots(divisionIndex: number): BotSeed[] {
  const division = divisions[divisionIndex];
  const pool = ecoTeamsInDivision(ecoSnapshot, divisionIndex);
  if (pool.length) return pool.map((team) => ({ id: team.id, name: team.name, ovr: team.ovr }));
  return Array.from({ length: ZONE_SIZE }, (_, index) => ({ id: `ai-d${divisionIndex + 1}-${index + 1}`, name: `AI Club ${index + 1}`, ovr: division.ovrMax }));
}

/**
 * A fresh 16-seat room for a division. Real managers keep their seats, the lowest-ranked
 * bot is replaced by the local player, and every other seat is an AI pro team.
 */
function createLeagueTeams(divisionIndex: number): LeagueTeam[] {
  const bots = divisionBots(divisionIndex);
  const rivals = buildRivals(divisionIndex);
  const user = createHumanTeam({ id: 'user', name: 'YOUR CLUB', manager: 'YOU', kind: 'player' });
  const room = createZone({ division: divisionIndex, bots, humans: rivals });
  const join = joinZone(room, user);
  return (join ? join.teams : room).slice(0, ZONE_SIZE);
}

/**
 * Keep the live league room in sync with the ecosystem. Older saves can still
 * list clubs from a previous pyramid (for example elite sides parked in
 * Division 1), so every bot seat is re-seeded from the current division pool
 * while the local club and real managers keep their seats.
 */
function reconcileLeagueTeams(league: LeagueState, ecoTeams: EcoTeam[]): LeagueState {
  const zone = league.zone ?? 0;
  const pool = ecoTeamsInDivision(ecoTeams, league.division);
  const poolById = new Map(pool.map((team) => [team.id, team]));
  // Division 1 is the bronze floor: the local club sits with 15 real bronze
  // clubs, so the synthetic fallback rivals do not take seats there.
  const humans = league.teams
    .filter((team) => teamKind(team) !== 'bot' && (league.division > 0 || !team.id.startsWith('human-d')))
    .slice(0, ZONE_SIZE);
  if (!humans.some((team) => team.id === 'user')) {
    humans.unshift(createHumanTeam({ id: 'user', name: 'YOUR CLUB', manager: 'YOU', kind: 'player' }));
  }
  const bots: LeagueTeam[] = [];
  const used = new Set<string>();
  league.teams.forEach((team) => {
    if (teamKind(team) !== 'bot') return;
    const eco = poolById.get(ecoIdOf(team));
    if (!eco || used.has(eco.id)) return;
    used.add(eco.id);
    bots.push(eco.name === team.name && eco.ovr === team.ovr ? team : { ...team, name: eco.name, ovr: eco.ovr });
  });
  const free = Math.max(0, ZONE_SIZE - humans.length - bots.length);
  pool.filter((eco) => !used.has(eco.id)).slice(0, free).forEach((eco) => {
    bots.push({ id: `${eco.id}-d${league.division + 1}-z${zone + 1}`, name: eco.name, ovr: eco.ovr, kind: 'bot', played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 });
  });
  const teams = [...humans, ...bots].slice(0, ZONE_SIZE);
  const unchanged = teams.length === league.teams.length && teams.every((team, index) => team === league.teams[index]);
  return unchanged ? league : { ...league, teams };
}

/**
 * Seat the real managers fetched from `league_teams` in the live room.
 *
 * Seat order is preserved so the day's schedule never reshuffles on a refresh:
 * existing seats are updated in place, a newcomer takes the lowest-ranked AI
 * club's seat, a departed manager frees one for the division's AI pool, and the
 * local club always keeps its own seat.
 */
function mergeOnlineRivals(league: LeagueState, online: LeagueTeam[]): LeagueState {
  const incoming = new Map(online.filter((team) => team.id !== 'user').map((team) => [team.id, team]));
  const room: LeagueTeam[] = [];
  league.teams.forEach((team) => {
    if (team.id === 'user') { room.push(team); return; }
    const fresh = incoming.get(team.id);
    if (fresh) { room.push(fresh); incoming.delete(team.id); return; }
    // A manager who left the zone frees their seat for an AI club below.
    if (teamKind(team) === 'bot') room.push(team);
  });
  [...incoming.values()].forEach((rival) => {
    const victim = room.length >= ZONE_SIZE
      ? sortLeague(room.filter((team) => teamKind(team) === 'bot')).pop()
      : undefined;
    if (victim) room[room.indexOf(victim)] = rival;
    else if (room.length < ZONE_SIZE) room.push(rival);
  });
  const bots = divisionBots(league.division);
  const used = new Set(room.map((team) => team.id));
  for (let index = 0; room.length < ZONE_SIZE && index < bots.length * 2; index += 1) {
    const seed = bots[index % bots.length];
    if (!seed) break;
    const id = `${seed.id}-d${league.division + 1}-z${(league.zone ?? 0) + 1}`;
    if (used.has(id)) continue;
    used.add(id);
    room.push({ id, name: seed.name, ovr: seed.ovr, kind: 'bot', played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 });
  }
  for (let filler = 1; room.length < ZONE_SIZE; filler += 1) {
    room.push({ id: `ai-fill-d${league.division + 1}-${filler}`, name: `AI Club ${filler}`, ovr: divisions[league.division].ovrMax, kind: 'bot', played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 });
  }
  const teams = room.slice(0, ZONE_SIZE);
  const unchanged = teams.length === league.teams.length && teams.every((team, index) => team === league.teams[index]);
  return unchanged ? league : { ...league, teams };
}

function createSeason(divisionIndex: number, season: number, trophies: LeagueTrophy[], monthKey = monthKeyOf(Date.now())): LeagueState {
  return { division: divisionIndex, season, monthKey, matchday: 0, teams: createLeagueTeams(divisionIndex), trophies, summary: null, zone: 0, zoneCount: 1 };
}

function sortLeague(teams: LeagueTeam[]): LeagueTeam[] {
  return [...teams].sort((a, b) => b.points - a.points || b.roundDiff - a.roundDiff || b.wins - a.wins || b.ovr - a.ovr);
}

function buildSchedule(teamIds: string[]): [string, string][][] {
  const pool = [...teamIds];
  const odd = pool.length % 2 === 1;
  if (odd) pool.push('bye');
  const rounds: [string, string][][] = [];
  for (let round = 0; round < pool.length - 1; round += 1) {
    const pairs: [string, string][] = [];
    for (let index = 0; index < pool.length / 2; index += 1) pairs.push([pool[index], pool[pool.length - 1 - index]]);
    if (odd) {
      const byeIndex = pairs.findIndex((pair) => pair.includes('bye'));
      const userBye = byeIndex >= 0 && pairs[byeIndex].includes('user');
      if (userBye && pairs.length > 1) {
        const otherIndex = pairs.findIndex((_, index) => index !== byeIndex);
        const opponent = pairs[otherIndex][0];
        pairs[byeIndex] = ['user', opponent];
        pairs.splice(otherIndex, 1);
      } else if (byeIndex >= 0) pairs.splice(byeIndex, 1);
    }
    rounds.push(pairs);
    pool.splice(1, 0, pool.pop() as string);
  }
  return rounds;
}

function simulateLeagueMatch(home: LeagueTeam, away: LeagueTeam): { homeScore: number; awayScore: number } {
  const chance = 1 / (1 + Math.pow(10, (away.ovr - home.ovr) / 6));
  const loserScore = 4 + Math.floor(Math.random() * 8);
  return Math.random() < chance ? { homeScore: 13, awayScore: loserScore } : { homeScore: loserScore, awayScore: 13 };
}

function seasonPayout(reward: number, place: number): number {
  if (place === 1) return reward;
  if (place === 2) return Math.round(reward * 0.6);
  if (place === 3) return Math.round(reward * 0.35);
  if (place <= 13) return Math.round(reward * 0.1);
  return Math.round(reward * 0.05);
}

const SLOTS_PER_DAY = 24;
const SLOT_OFFSET_MIN = 30;
const SLOT_WINDOW_MIN = 5;
const LEAGUE_WIN_COINS = 150;
const LEAGUE_LOSS_COINS = 30;
const SCRIM_WIN_COINS = 200;
const SCRIM_WIN_CAP = 5;
const DAY_MS = 86400000;

const dayKeyOf = (timestamp: number): string => { const date = new Date(timestamp); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const dayStartOf = (timestamp: number): number => { const date = new Date(timestamp); return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(); };
const dayKeyAfter = (key: string): string => { const [year, month, day] = key.split('-').map(Number); return dayKeyOf(new Date(year, month - 1, day + 1).getTime()); };
const slotStartOfDay = (dayStart: number, hour: number): number => dayStart + hour * 3600000 + SLOT_OFFSET_MIN * 60000;
const slotClockLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:30`;
const slotBoundaryAfter = (timestamp: number): number => {
  const dayStart = dayStartOf(timestamp);
  for (let hour = 0; hour < SLOTS_PER_DAY; hour += 1) {
    const start = slotStartOfDay(dayStart, hour);
    if (start > timestamp) return start;
  }
  return slotStartOfDay(dayStart + DAY_MS, 0);
};
const liveSlotHour = (timestamp: number): number | null => {
  const minutes = (timestamp - dayStartOf(timestamp)) / 60000;
  const hour = Math.floor(minutes / 60);
  const offset = minutes - hour * 60;
  return hour >= 0 && hour < SLOTS_PER_DAY && offset >= SLOT_OFFSET_MIN && offset < SLOT_OFFSET_MIN + SLOT_WINDOW_MIN ? hour : null;
};
const nextSlotAt = (timestamp: number): number => {
  const dayStart = dayStartOf(timestamp);
  const liveHour = liveSlotHour(timestamp);
  if (liveHour !== null) return slotStartOfDay(dayStart, liveHour);
  for (let hour = 0; hour < SLOTS_PER_DAY; hour += 1) {
    const start = slotStartOfDay(dayStart, hour);
    if (start > timestamp) return start;
  }
  return slotStartOfDay(dayStart + DAY_MS, 0);
};
const clockCountdown = (ms: number): string => { const total = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };

type QuestDefinition = { id: QuestId; title: string; note: string; reward: number; target: number };
const dailyQuests: QuestDefinition[] = [
  { id: 'scrim', title: 'Play 1 Scrimmage', note: 'Finish a friendly match in the Arena', reward: 100, target: 1 },
  { id: 'packs', title: 'Open 1 Card Pack', note: 'Open any pack from the Store', reward: 50, target: 1 },
  { id: 'train', title: 'Train a Player', note: 'Level up a card in My Club', reward: 75, target: 1 },
];
const createQuestState = (day = dayKeyOf(Date.now())): QuestState => ({ day, packs: 0, scrim: 0, train: 0, claimed: [], scrimWins: 0 });
const questDef = (id: QuestId): QuestDefinition => dailyQuests.find((quest) => quest.id === id) ?? dailyQuests[0];
const questValue = (quests: QuestState, id: QuestId): number => quests[id];
const emptyTeamStats = (team: LeagueTeam): LeagueTeam => ({ ...team, played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 });
const promotionCoins = (divisionIndex: number): number => Math.round(divisions[Math.max(0, Math.min(divisions.length - 1, divisionIndex))].reward * 0.15);

function leagueSlotPairs(league: LeagueState): [string, string][] {
  const schedule = buildSchedule(league.teams.map((team) => team.id));
  const slot = league.slot ?? 0;
  return schedule[slot % schedule.length] ?? [];
}

function applyLeaguePairs(teams: LeagueTeam[], pairs: [string, string][]): { userWon: boolean; us: number; them: number } {
  let userWon = false;
  let us = 0;
  let them = 0;
  pairs.forEach(([homeId, awayId]) => {
    if (homeId === 'bye' || awayId === 'bye') return;
    const home = teams.find((team) => team.id === homeId);
    const away = teams.find((team) => team.id === awayId);
    if (!home || !away) return;
    const outcome = simulateLeagueMatch(home, away);
    const homeWon = outcome.homeScore > outcome.awayScore;
    home.played += 1; away.played += 1;
    home.wins += homeWon ? 1 : 0; home.losses += homeWon ? 0 : 1;
    away.wins += homeWon ? 0 : 1; away.losses += homeWon ? 1 : 0;
    home.points += homeWon ? 3 : 0; away.points += homeWon ? 0 : 3;
    home.roundDiff += outcome.homeScore - outcome.awayScore;
    away.roundDiff += outcome.awayScore - outcome.homeScore;
    if (homeId === 'user') { userWon = homeWon; us = outcome.homeScore; them = outcome.awayScore; }
    if (awayId === 'user') { userWon = !homeWon; us = outcome.awayScore; them = outcome.homeScore; }
  });
  return { userWon, us, them };
}

function playLeagueSlot(league: LeagueState, teamRating: number): { league: LeagueState; log: LeagueMatchLog; coins: number } {
  const slot = league.slot ?? 0;
  const pairs = leagueSlotPairs(league);
  const teams = league.teams.map((team) => ({ ...team }));
  const user = teams.find((team) => team.id === 'user');
  if (user) user.ovr = teamRating || user.ovr || 60;
  const opponentId = pairs.find((pair) => pair.includes('user'))?.find((id) => id !== 'user');
  const opponentTeam = league.teams.find((team) => team.id === opponentId);
  const outcome = applyLeaguePairs(teams, pairs);
  const done = slot + 1;
  const coins = outcome.userWon ? LEAGUE_WIN_COINS : LEAGUE_LOSS_COINS;
  return {
    league: { ...league, teams, slot: done, matchday: done, dayResult: null },
    coins,
    log: { dayKey: league.dayKey ?? dayKeyOf(Date.now()), slot, opponent: opponentTeam?.name ?? 'BYE WEEK', won: outcome.userWon, us: outcome.us, them: outcome.them, coins },
  };
}

function finalizeLeagueDay(league: LeagueState, teamRating: number): { league: LeagueState; dayResult: LeagueDayResult; coins: number } {
  const zoneCount = league.zoneCount ?? 1;
  const table = sortLeague(league.teams.map((team) => (team.id === 'user' ? { ...team, ovr: teamRating || team.ovr } : team)));
  const userRow = table.find((team) => team.id === 'user');
  const rank = Math.max(1, table.findIndex((team) => team.id === 'user') + 1);
  // 1 zone: ranks 1-3 promote. Split division: ranks 1-2 in every zone promote.
  // Div 15 keeps exactly 3 seats open for the top 3 from Div 14, and the bottom 3 relegate.
  const movement = divisionOutcome(league.division, rank, zoneCount);
  const promoted = movement.promoted;
  const relegated = movement.relegated;
  const nextDivision = movement.next;
  const coins = promoted ? promotionCoins(nextDivision) : 0;
  const dayKey = league.dayKey ?? dayKeyOf(Date.now());
  const dayResult: LeagueDayResult = { dayKey, division: league.division, rank, promoted, relegated, coins, wins: userRow?.wins ?? 0, losses: userRow?.losses ?? 0 };
  // Same division: wipe records for the new day, humans keep their Zone A seat.
  // Moved up/down: rebuild the room, seeding real managers into Zone A before the bots.
  const teams = nextDivision === league.division ? league.teams.map(emptyTeamStats) : createLeagueTeams(nextDivision);
  const trophies = rank <= promotionSlots(league.division, zoneCount) ? [...league.trophies, { season: league.season, division: divisions[league.division].name, place: rank }] : league.trophies;
  return {
    league: {
      ...league,
      division: nextDivision,
      teams,
      trophies,
      slot: 0,
      matchday: 0,
      dayResult,
      dayKey: dayKeyAfter(dayKey),
      zone: nextDivision === league.division ? league.zone ?? 0 : 0,
      zoneCount: nextDivision === league.division ? zoneCount : 1,
    },
    dayResult,
    coins,
  };
}

function advanceLeague(league: LeagueState, now: number, teamRating: number, holdSlot: number | null = null): { league: LeagueState; matches: LeagueMatchLog[]; coins: number; dayResult: LeagueDayResult | null } {
  const cutoff = now - SLOT_WINDOW_MIN * 60000;
  if (!league.lastSlotAt) {
    return { league: { ...league, lastSlotAt: cutoff - 1, dayKey: league.dayKey ?? dayKeyOf(now), slot: league.slot ?? 0 }, matches: [], coins: 0, dayResult: null };
  }
  let state = league;
  const matches: LeagueMatchLog[] = [];
  let coins = 0;
  let dayResult: LeagueDayResult | null = null;
  let processed = 0;
  while (processed < 720) {
    const boundary = slotBoundaryAfter(state.lastSlotAt ?? 0);
    if (boundary > cutoff) break;
    // A live league match owns its slot: wait for the player's result instead of
    // simulating the decisive match and discarding it when the match ends.
    if (holdSlot !== null && boundary >= holdSlot) break;
    processed += 1;
    if (state.dayKey !== dayKeyOf(boundary)) {
      state = { ...state, dayKey: dayKeyOf(boundary), teams: state.teams.map(emptyTeamStats), slot: 0, matchday: 0 };
    }
    const played = playLeagueSlot(state, teamRating);
    state = { ...played.league, lastSlotAt: boundary };
    matches.push(played.log);
    coins += played.coins;
    if ((state.slot ?? 0) >= SLOTS_PER_DAY) {
      const finalized = finalizeLeagueDay(state, teamRating);
      state = finalized.league;
      dayResult = finalized.dayResult;
      coins += finalized.coins;
    }
  }
  if (!processed) return { league, matches, coins: 0, dayResult: null };
  return { league: state, matches, coins, dayResult };
}

function settleLiveLeagueSlot(league: LeagueState, slotStart: number, teamRating: number, won: boolean, score: { us: number; them: number }): { league: LeagueState; coins: number; dayResult: LeagueDayResult | null } {
  if ((league.lastSlotAt ?? 0) >= slotStart) return { league, coins: 0, dayResult: null };
  const slot = league.slot ?? 0;
  const pairs = leagueSlotPairs(league);
  const teams = league.teams.map((team) => ({ ...team }));
  const user = teams.find((team) => team.id === 'user');
  if (user) {
    user.ovr = teamRating || user.ovr || 60;
    user.played += 1;
    user.wins += won ? 1 : 0;
    user.losses += won ? 0 : 1;
    user.points += won ? 3 : 0;
    user.roundDiff += score.us - score.them;
  }
  applyLeaguePairs(teams, pairs.filter((pair) => !pair.includes('user')));
  const done = slot + 1;
  let state: LeagueState = { ...league, teams, slot: done, matchday: done, lastSlotAt: slotStart, dayResult: null };
  let coins = won ? LEAGUE_WIN_COINS : LEAGUE_LOSS_COINS;
  let dayResult: LeagueDayResult | null = null;
  if (done >= SLOTS_PER_DAY) {
    const finalized = finalizeLeagueDay(state, teamRating);
    state = finalized.league;
    dayResult = finalized.dayResult;
    coins += finalized.coins;
  }
  return { league: state, coins, dayResult };
}

const roles: Role[] = ['Entry', 'AWPer', 'IGL', 'Rifler', 'Lurker'];
const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Star', 'Icon'];
const tierConfig: Record<Tier, { color: string; soft: string; price: number; sell: number; subtitle: string }> = {
  Bronze: { color: '#a9784a', soft: 'rgba(169,120,74,.14)', price: 500, sell: 50, subtitle: 'Academy rookie' },
  Silver: { color: '#c3cbd9', soft: 'rgba(195,203,217,.14)', price: 900, sell: 120, subtitle: 'Tier-2 professional' },
  Gold: { color: '#f5c451', soft: 'rgba(245,196,81,.14)', price: 1500, sell: 350, subtitle: 'Tier-1 star' },
  Star: { color: '#d98cff', soft: 'rgba(217,140,255,.14)', price: 0, sell: 1000, subtitle: 'Walkout elite' },
  Icon: { color: '#55e8ef', soft: 'rgba(85,232,239,.14)', price: 0, sell: 3000, subtitle: 'Major legend' },
};
const perkDetails: Record<Perk, string> = {
  'Tactical Genius': '+3 → +6 → +10 Chemistry (LV 15 / 30)',
  'Aim Coach': '+2 → +4 → +6 AIM (LV 15 / 30)',
  'Scout Master': '+15% → +25% → +40% Quick Sell (LV 15 / 30)',
  'Clutch Master': '+3 → +6 → +9 CLT (LV 20 / 40)',
  'Match Prize Booster': '+20% → +35% → +50% Match Win Coins (LV 20 / 40)',
  'Pack Luck Boost': '+15% → +25% → +40% Star / Icon odds (LV 20 / 40)',
};
const avatarDetails: Record<Avatar, { label: string; icon: ReactNode; color: string }> = {
  falcon: { label: 'Tactical Headset', icon: <Headphones />, color: '#f97316' },
  wolf: { label: 'Cyber Wolf', icon: <PawPrint />, color: '#a78bfa' },
  visor: { label: 'Crosshair', icon: <Crosshair />, color: '#22d3ee' },
  tiger: { label: 'Dragon', icon: <Flame />, color: '#fbbf24' },
  ghost: { label: 'Trophy Crown', icon: <Crown />, color: '#94a3b8' },
  sentinel: { label: 'MVP Star', icon: <Star />, color: '#34d399' },
};

const roleFromEco = (role: string): Role => (role === 'Support' ? 'Lurker' : role) as Role;
const tierFromOvr = (ovr: number): Tier =>
  ovr >= 90 ? 'Icon' : ovr >= 85 ? 'Star' : ovr >= 75 ? 'Gold' : ovr >= 65 ? 'Silver' : 'Bronze';

// 1,200 real players across 240 real clubs (elite, silver and bronze databases).
const playerSeed: Array<[string, string, string, Role, number, Tier]> = WORLD_PLAYERS.map((player) => [
  player.name,
  player.team,
  player.country,
  roleFromEco(player.role),
  player.ovr,
  tierFromOvr(player.ovr),
]);

const database: PlayerCard[] = playerSeed.map(([name, team, country, role, ovr, tier], index) => ({
  id: `player-${index + 1}`,
  name, team, country, role, ovr, tier,
  aim: Math.min(99, ovr + (index % 5) - 2),
  rfl: Math.min(99, ovr + ((index * 3) % 5) - 2),
  sns: Math.min(99, ovr + ((index * 2) % 5) - 2),
  clt: Math.min(99, ovr + ((index * 4) % 5) - 2),
}));

const emptySquad: Record<Role, string> = { Entry: '', AWPer: '', IGL: '', Rifler: '', Lurker: '' };

/** The 240 real clubs of the card database, each with its five players. */
const CLUB_GROUPS: Array<{ name: string; players: PlayerCard[] }> = (() => {
  const groups = new Map<string, PlayerCard[]>();
  database.forEach((card) => { const list = groups.get(card.team); if (list) list.push(card); else groups.set(card.team, [card]); });
  return [...groups.entries()].map(([name, players]) => ({ name, players })).sort((a, b) => a.name.localeCompare(b.name));
})();
const CLUB_COMPLETION_TARGET = 5;
const CLUB_COMPLETION_REWARD = 5000;

const createStarterCards = (): OwnedCard[] => {
  return roles.map((role) => {
    const academy = database.filter((card) => card.tier === 'Bronze' && card.role === role && card.ovr >= 58 && card.ovr <= 62);
    const pool = academy.length ? academy : database.filter((card) => card.tier === 'Bronze' && card.role === role);
    const card = pool[Math.floor(Math.random() * pool.length)] ?? pickCard(database.filter((item) => item.tier === 'Bronze'));
    return { ...card, instanceId: `starter-${randomId()}-${card.id}`, level: 1 };
  });
};
const createProfile = (): Profile => ({ nickname: '', teamName: '', avatar: 'falcon', perk: 'Tactical Genius', emblem: 'shield', accent: DEFAULT_ACCENT });
const randomId = (): string => Math.random().toString(36).slice(2, 10);
/** Rebuilds an owned card from a market listing snapshot, with a fresh instance id. */
const cardFromSnapshot = (snapshot: Record<string, unknown>, prefix: string): OwnedCard | null => {
  const id = typeof snapshot.id === 'string' ? snapshot.id : '';
  const name = typeof snapshot.name === 'string' ? snapshot.name : '';
  const role = typeof snapshot.role === 'string' && roles.includes(snapshot.role as Role) ? snapshot.role as Role : null;
  if (!id || !name || !role) return null;
  const tier = typeof snapshot.tier === 'string' && ['Bronze', 'Silver', 'Gold', 'Star', 'Icon'].includes(snapshot.tier) ? snapshot.tier as Tier : 'Gold';
  const stat = (value: unknown, fallback: number): number => Math.min(99, Math.max(1, Math.round(Number(value) || fallback)));
  const ovr = stat(snapshot.ovr, 60);
  return {
    id, name, team: typeof snapshot.team === 'string' ? snapshot.team : 'Free agent', country: typeof snapshot.country === 'string' ? snapshot.country : '',
    role, tier, ovr, aim: stat(snapshot.aim, ovr), rfl: stat(snapshot.rfl, ovr), sns: stat(snapshot.sns, ovr), clt: stat(snapshot.clt, ovr),
    instanceId: `${prefix}-${randomId()}-${id}`, level: cardLevel(Number(snapshot.level)), xp: cardXp(Number(snapshot.xp)),
  };
};
const dropTables: Record<PackId, DropRow[]> = {
  daily: [['Bronze', 70], ['Silver', 25], ['Gold', 5]],
  bronze: [['Bronze', 75], ['Silver', 24], ['Gold', 1]],
  silver: [['Bronze', 30], ['Silver', 55], ['Gold', 14], ['Star', 1]],
  gold: [['Silver', 35], ['Gold', 58], ['Star', 6], ['Icon', 1]],
  awp: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  rifle: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  asia: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  igl: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  major: [['Gold', 60], ['Star', 37], ['Icon', 3]],
};
const rollTier = (table: DropRow[]): Tier => {
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [tier, weight] of table) { if (roll < weight) return tier; roll -= weight; }
  return table[table.length - 1][0];
};

const XP_STEP = 1000;
const MANAGER_MAX_LEVEL = 50;
const SECOND_PERK_LEVEL = 5;
const STORE_DISCOUNT_LEVEL = 10;
const STORE_DISCOUNT_DEEP_LEVEL = 35;
const STORE_DISCOUNT = 0.15;
const STORE_DISCOUNT_DEEP = 0.25;
const levelReward = (level: number): number => 500 + Math.round(level * 150);
const storeDiscount = (level: number): number => level >= STORE_DISCOUNT_DEEP_LEVEL ? STORE_DISCOUNT_DEEP : level >= STORE_DISCOUNT_LEVEL ? STORE_DISCOUNT : 0;
const storeDiscountLabel = (level: number): string => `${Math.round(storeDiscount(level) * 100)}%`;
const PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PITY_LIMIT = 30;
const PITY_STORAGE_KEY = 'cs2-packs-without-icon';
const SAVE_KEY = 'cs2-ultimate-team-save';
const readIconPity = (): number => {
  try {
    const raw = Number(localStorage.getItem(PITY_STORAGE_KEY));
    return Number.isFinite(raw) ? Math.min(PITY_LIMIT, Math.max(0, Math.floor(raw))) : 0;
  } catch { return 0; }
};

const managerLevel = (xp: number): number => Math.min(MANAGER_MAX_LEVEL, Math.floor(Math.max(0, xp) / XP_STEP) + 1);
const levelProgress = (xp: number): number => managerLevel(xp) >= MANAGER_MAX_LEVEL ? 100 : ((Math.max(0, xp) % XP_STEP) / XP_STEP) * 100;
const levelFloorXp = (level: number): number => (level - 1) * XP_STEP;
const countdownLabel = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const packDefinitions: PackDefinition[] = [
  { id: 'bronze', name: 'Bronze Pack', price: 500, tier: 'Bronze', art: 'BRONZE', tagline: 'Academy talent', description: 'A reliable starting point: Bronze rookies with a real shot at a Silver upgrade.', odds: '75% Bronze · 24% Silver · 1% Gold', count: 3, bulk: true },
  { id: 'silver', name: 'Silver Pack', price: 800, tier: 'Silver', art: 'SILVER', tagline: 'Mid-table value', description: 'Three cards with a strong Silver base and a genuine Star chase.', odds: '30% Bronze · 55% Silver · 14% Gold · 1% Star', count: 3, badge: 'VALUE PICK', color: '#cbd5e1', soft: 'rgba(203,213,225,.14)', bulk: true },
  { id: 'gold', name: 'Gold Pack', price: 1500, tier: 'Gold', art: 'GOLD', tagline: 'Established star', description: 'Tier-1 talent with a clean Silver floor and a shot at a walkout.', odds: '35% Silver · 58% Gold · 6% Star · 1% Icon', count: 3, badge: 'MOST POPULAR', bulk: true },
  { id: 'major', name: 'Major Legend Pack', price: 15000, tier: 'Icon', art: 'MAJOR', tagline: 'Major legend', description: 'Only the biggest names from the biggest stage.', odds: '60% Gold · 37% Star · 3% Icon', count: 3 },
  { id: 'daily', name: 'Daily Free Pack', price: 0, tier: 'Gold', art: 'FREE', tagline: 'Every 24 hours', description: 'Two free cards daily, with Silver and better always possible.', odds: '70% Bronze · 25% Silver · 5% Gold', count: 2, badge: 'FREE DAILY', color: '#34d399', soft: 'rgba(52,211,153,.14)' },
  { id: 'awp', name: 'AWPer & Sniper Pack', price: 2200, tier: 'Star', art: 'AWP', tagline: 'Snipers only', description: 'Three dedicated AWPers. Chase m0NESY, ZywOo, sh1ro or broky.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#22d3ee', soft: 'rgba(34,211,238,.14)' },
  { id: 'rifle', name: 'Rifler & Entry Pack', price: 2200, tier: 'Gold', art: 'RIFLE', tagline: 'Riflers & Entry', description: 'Three riflers or entry fraggers built to open every site.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#f97316', soft: 'rgba(249,115,22,.14)' },
  { id: 'igl', name: 'IGL & Support Pack', price: 2200, tier: 'Star', art: 'IGL', tagline: 'In-game leaders', description: 'Three in-game leaders and support minds: bLitz, Aleksib, karrigan, apEX and more.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#38bdf8', soft: 'rgba(56,189,248,.14)' },
  { id: 'asia', name: 'Asian & Regional Masters', price: 2000, tier: 'Star', art: 'ASIA', tagline: 'Chemistry boost', description: 'Weighted toward The MongolZ and regional talent for instant links.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'REGIONAL', color: '#a78bfa', soft: 'rgba(167,139,250,.14)' },
];
// Packs are shown cheapest first, so the free daily pack always leads the grid.
const packCatalog: PackDefinition[] = [...packDefinitions].sort((left, right) => left.price - right.price);

const pickCard = (pool: PlayerCard[]): PlayerCard => pool[Math.floor(Math.random() * pool.length)];
const toPackCard = (card: PlayerCard): PackCard => ({ ...card, instanceId: `${randomId()}-${card.id}`, level: 1, revealed: false });
const randomTierCard = (tier: Tier): PackCard => {
  const options = database.filter((card) => card.tier === tier);
  return toPackCard(pickCard(options.length ? options : database));
};
const rankedTiers: Tier[] = ['Icon', 'Star', 'Gold', 'Silver', 'Bronze'];
const bestTierCard = (pool: PlayerCard[], tier: Tier): PackCard => {
  for (let index = Math.max(0, rankedTiers.indexOf(tier)); index < rankedTiers.length; index += 1) {
    const options = pool.filter((card) => card.tier === rankedTiers[index]);
    if (options.length) return toPackCard(pickCard(options));
  }
  return randomTierCard(tier);
};
const roleTierCard = (wanted: Role[], table: DropRow[]): PackCard => bestTierCard(database.filter((card) => wanted.includes(card.role)), rollTier(table));
const mongolzPool = database.filter((card) => card.team === 'The MongolZ' || card.country === 'MN');
const regionalPool = database.filter((card) => card.tier !== 'Bronze' && ['MN', 'RU', 'UA', 'LT', 'FI', 'LV', 'EE', 'BA', 'IL'].includes(card.country));
const regionalCard = (table: DropRow[]): PackCard => {
  const tier = rollTier(table);
  const preferred = (Math.random() < 0.7 ? mongolzPool : regionalPool).filter((card) => card.tier === tier);
  return preferred.length ? toPackCard(pickCard(preferred)) : randomTierCard(tier);
};
const boostedTable = (table: DropRow[], luckPct: number): DropRow[] => luckPct > 0
  ? table.map(([tier, weight]) => [tier, tier === 'Star' || tier === 'Icon' ? weight * (1 + luckPct / 100) : weight] as DropRow)
  : table;
const generatePack = (id: PackId, forceIcon = false, luckPct = 0): PackCard[] => {
  const table = boostedTable(dropTables[id], luckPct);
  let cards: PackCard[];
  if (id === 'awp') cards = [0, 1, 2].map(() => roleTierCard(['AWPer'], table));
  else if (id === 'rifle') cards = [0, 1, 2].map(() => roleTierCard(['Entry', 'Rifler'], table));
  else if (id === 'igl') cards = [0, 1, 2].map(() => roleTierCard(['IGL'], table));
  else if (id === 'asia') cards = [0, 1, 2].map(() => regionalCard(table));
  else cards = Array.from({ length: id === 'daily' ? 2 : 3 }, () => randomTierCard(rollTier(table)));
  if (forceIcon) cards[0] = randomTierCard('Icon');
  return cards;
};

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudSync, setCloudSync] = useState<CloudSync>(isSupabaseConfigured ? 'idle' : 'off');
  const [profile, setProfile] = useState<Profile>(createProfile);
  const [coins, setCoins] = useState(2500);
  const [owned, setOwned] = useState<OwnedCard[]>([]);
  const [squad, setSquad] = useState<Record<Role, string>>(emptySquad);
  const [page, setPage] = useState<Page>('squad');
  const [showCreation, setShowCreation] = useState(false);
  const [pack, setPack] = useState<PackCard[] | null>(null);
  const [newCardIds, setNewCardIds] = useState<string[]>([]);
  const [managerXp, setManagerXp] = useState(0);
  const [league, setLeague] = useState<LeagueState>(() => createSeason(0, 1, []));
  const [toast, setToast] = useState('');
  const [dailyClaimAt, setDailyClaimAt] = useState(0);
  const [iconPity, setIconPity] = useState(readIconPity);
  const [rewardedLevel, setRewardedLevel] = useState(1);
  const [levelUp, setLevelUp] = useState<{ level: number; coins: number } | null>(null);
  const [recap, setRecap] = useState<{ matches: LeagueMatchLog[]; coins: number; day: LeagueDayResult | null } | null>(null);
  const [quests, setQuests] = useState<QuestState>(() => createQuestState());
  const [claimedClubs, setClaimedClubs] = useState<string[]>([]);
  const [career, setCareer] = useState<CareerStats>(createCareer);
  const [seasonNotice, setSeasonNotice] = useState<{ season: number; from: number; to: number; coins: number; packs: number } | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState(() => Date.now());
  const [ecosystem, setEcosystem] = useState<EcoState>(() => readEcoState(ecoRanges));
  const leagueRef = useRef(league);
  const ecoRef = useRef(ecosystem);
  ecoRef.current = ecosystem;
  leagueRef.current = league;
  const questsRef = useRef(quests);
  questsRef.current = quests;
  const teamRatingRef = useRef(0);
  // Set by ArenaPage while a live league match is in progress. The league clock
  // must not auto-simulate that slot before the player's result is recorded.
  const liveSlotRef = useRef<number | null>(null);

  // Sign-in gate: restore the Supabase (or local) session before anything else loads.
  useEffect(() => {
    let active = true;
    void authService.getSession().then((next) => {
      if (!active) return;
      setSession(next);
      setAuthReady(true);
    });
    const unsubscribe = authService.onChange((next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  // Each signed-in manager gets their own club save, with the legacy single save migrated.
  useEffect(() => {
    resetClub();
    if (!session) { setHydrated(false); return; }
    const now = Date.now();
    const perUserSave = localStorage.getItem(`${SAVE_KEY}:${session.userId}`);
    const legacySave = perUserSave ? null : localStorage.getItem(SAVE_KEY);
    const saved = perUserSave ?? legacySave;
    // The pre-auth save belongs to whoever signs in first; later accounts start fresh.
    if (legacySave) localStorage.removeItem(SAVE_KEY);
    const ecoLoaded = readEcoState(ecoRanges, now);
    ecoSnapshot = ecoLoaded.teams;
    ecoRef.current = ecoLoaded;
    setEcosystem(ecoLoaded);
    if (!saved) { setLastActiveAt(now); setShowCreation(true); setHydrated(true); return; }
    const data = JSON.parse(saved) as SaveData;
    const savedXp = data.managerXp ?? 0;
    let nextCoins = data.coins ?? 2500;
    let nextXp = savedXp;
    let nextOwned = (data.owned ?? []).map((card) => ({ ...card, level: cardLevel(card.level) }));
    const freshIds: string[] = [...(data.newCardIds ?? [])];
    let nextLeague: LeagueState;
    if (data.league && (data.league.teams?.length ?? 0) >= 16) {
      // Old saves predate zones: stamp team kinds, keep exactly 16 seats per room.
      let savedTeams = data.league.teams.map((team) => ({ ...team, kind: team.kind ?? (team.id === 'user' ? ('player' as const) : ('bot' as const)) } as LeagueTeam));
      if (savedTeams.length < ZONE_SIZE) {
        const extras = createLeagueTeams(data.league.division).filter((team) => teamKind(team) === 'bot' && !savedTeams.some((row) => ecoIdOf(row) === ecoIdOf(team)));
        savedTeams = [...savedTeams, ...extras].slice(0, ZONE_SIZE);
      }
      nextLeague = { ...data.league, teams: savedTeams, monthKey: data.league.monthKey ?? monthKeyOf(now), zone: data.league.zone ?? 0, zoneCount: data.league.zoneCount ?? 1 };
      const elapsedMonths = data.league.monthKey ? monthsBetween(data.league.monthKey, monthKeyOf(now)) : 0;
      if (elapsedMonths > 0) {
        const startDivision = nextLeague.division;
        let division = nextLeague.division;
        let season = nextLeague.season;
        let working = nextLeague;
        let coinsEarned = 0;
        const bonusCards: PackCard[] = [];
        for (let month = 0; month < elapsedMonths; month += 1) {
          const table = sortLeague(working.teams);
          const place = Math.max(1, table.findIndex((team) => team.id === 'user') + 1);
          const movement = divisionOutcome(division, place, working.zoneCount ?? 1);
          const promotionZone = place <= promotionSlots(division, working.zoneCount ?? 1);
          // Season close pays the division's placement prize, then the top promotion
          // seats move up. Only clubs outside the promotion seats take the soft reset.
          coinsEarned += seasonPayout(divisions[division].reward, place);
          bonusCards.push(...generatePack(place <= 3 ? 'major' : 'gold'));
          if (movement.promoted) division = Math.min(divisions.length - 1, division + 1);
          else if (!promotionZone) division = Math.max(0, division - rolloverDrop(division));
          season += 1;
          working = createSeason(division, season, working.trophies);
        }
        nextLeague = working;
        nextCoins += coinsEarned;
        nextOwned = [...nextOwned, ...bonusCards.map((card) => { const copy = { ...card, level: cardLevel(card.level) }; delete copy.revealed; return copy; })];
        freshIds.push(...bonusCards.map((card) => card.instanceId));
        setSeasonNotice({ season, from: startDivision, to: division, coins: coinsEarned, packs: bonusCards.length });
      }
    } else {
      nextLeague = createSeason(0, 1, data.league?.trophies ?? []);
    }
    // Drop stale bot seats saved before the 240-club pyramid was rebuilt, so
    // Play Arena always shows the real clubs of the current division.
    nextLeague = reconcileLeagueTeams(nextLeague, ecoLoaded.teams);
    if (!nextLeague.lastSlotAt) nextLeague = { ...nextLeague, lastSlotAt: data.lastActiveAt && data.lastActiveAt > 0 ? data.lastActiveAt : now };
    const today = dayKeyOf(now);
    const savedQuests = data.quests;
    const loadedQuests: QuestState = savedQuests && savedQuests.day === today
      ? { ...createQuestState(today), ...savedQuests, claimed: Array.isArray(savedQuests.claimed) ? savedQuests.claimed : [] }
      : createQuestState(today);
    leagueRef.current = nextLeague;
    questsRef.current = loadedQuests;
    setQuests(loadedQuests);
    const userRow = nextLeague.teams.find((team) => team.id === 'user');
    const nextCareer = data.career
      ? normalizeCareer(data.career)
      : { matches: Math.max(0, userRow?.played ?? 0), wins: Math.max(0, userRow?.wins ?? 0), mapCounts: {} };
    setProfile({
      ...data.profile,
      perk: SLOT1_PERKS.includes(data.profile.perk) ? data.profile.perk : 'Tactical Genius',
      perk2: data.profile.perk2 && SLOT2_PERKS.includes(data.profile.perk2) ? data.profile.perk2 : undefined,
    }); setCoins(nextCoins); setOwned(nextOwned); setSquad(data.squad); setPage(data.page); setNewCardIds(freshIds); setManagerXp(nextXp); setRewardedLevel(data.rewardedLevel ?? managerLevel(savedXp)); setDailyClaimAt(data.dailyClaimAt ?? 0); setLeague(nextLeague); setClaimedClubs(Array.isArray(data.claimedClubs) ? data.claimedClubs : []); setCareer(nextCareer); setLastActiveAt(now);
    setHydrated(true);
  }, [session?.userId]);

  useEffect(() => {
    if (!hydrated || showCreation || !session) return;
    const data: SaveData = { profile, coins, owned, squad, page, newCardIds, managerXp, league, dailyClaimAt, rewardedLevel, lastActiveAt, quests, claimedClubs, career };
    localStorage.setItem(`${SAVE_KEY}:${session.userId}`, JSON.stringify(data));
  }, [hydrated, showCreation, session?.userId, profile, coins, owned, squad, page, newCardIds, managerXp, league, dailyClaimAt, rewardedLevel, lastActiveAt, quests, claimedClubs, career]);

  // Only Supabase-backed sessions own cloud rows; local fallback accounts stay device-only.
  const cloudUserId = session && session.provider !== 'local' && isSupabaseConfigured ? session.userId : null;

  // Cloud restore: a manager signing in on a new device has no local save, so the
  // Supabase `profiles` row rebuilds the club, collection and daily quests.
  useEffect(() => {
    if (!hydrated || !cloudUserId) return;
    const userId = cloudUserId;
    let active = true;
    void loadCloudProfile(userId).then((remote) => {
      if (!active || !remote) return;
      // A save written on this device is newer than the row we just fetched: keep
      // it, and let the autosave below push it back up instead of clobbering it.
      let hasLocalSave = true;
      try { hasLocalSave = Boolean(localStorage.getItem(`${SAVE_KEY}:${userId}`)); } catch { /* storage unavailable */ }
      if (hasLocalSave) { setCloudSync('synced'); return; }
      const today = dayKeyOf(Date.now());
      const questEnvelope = remote.dailyQuests && typeof remote.dailyQuests === 'object' && !Array.isArray(remote.dailyQuests)
        ? remote.dailyQuests as QuestState & { career?: CareerStats }
        : null;
      const cloudCareer = questEnvelope?.career;
      const questFields = questEnvelope ? { ...questEnvelope } as Partial<QuestState> & { career?: CareerStats } : null;
      if (questFields) delete questFields.career;
      const savedQuests = questFields && typeof questFields.day === 'string' ? questFields as QuestState : null;
      const restoredQuests: QuestState = savedQuests && savedQuests.day === today
        ? { ...createQuestState(today), ...savedQuests, claimed: Array.isArray(savedQuests.claimed) ? savedQuests.claimed : [] }
        : createQuestState(today);
      const restoredCareer = cloudCareer ? normalizeCareer(cloudCareer) : createCareer();
      const savedPerks = remote.perks.filter((perk): perk is Perk => SLOT1_PERKS.includes(perk as Perk) || SLOT2_PERKS.includes(perk as Perk));
      const avatar = (Object.keys(avatarDetails) as Avatar[]).includes(remote.avatar as Avatar) ? remote.avatar as Avatar : 'falcon';
      const division = Math.min(divisions.length - 1, Math.max(0, Math.floor(remote.division)));
      const restoredLeague: LeagueState = { ...createSeason(division, 1, []), zone: Math.max(0, Math.floor(remote.zone)), zoneCount: 1 };
      const cards = (Array.isArray(remote.ownedCards) ? remote.ownedCards : [])
        .filter((card): card is OwnedCard => Boolean(card) && typeof (card as OwnedCard).instanceId === 'string')
        .map((card) => ({ ...card, level: cardLevel(card.level) }));
      const restoredSquad = { ...emptySquad };
      roles.forEach((role) => { const id = remote.activeSquad[role]; if (typeof id === 'string') restoredSquad[role] = id; });
      leagueRef.current = restoredLeague;
      questsRef.current = restoredQuests;
      const restoredEmblem = EMBLEMS.find((item) => item.id === remote.emblem)?.id ?? 'shield';
      setProfile({ nickname: remote.managerName, teamName: remote.clubName, avatar, perk: savedPerks[0] ?? 'Tactical Genius', perk2: savedPerks[1], badge: remote.clubBadge || undefined, emblem: restoredEmblem, accent: remote.accent || DEFAULT_ACCENT });
      setClaimedClubs(remote.claimedClubs);
      setCoins(Math.max(0, Math.floor(remote.coins)));
      setOwned(cards);
      setSquad(restoredSquad);
      setManagerXp(Math.max(0, Math.floor(remote.xp)));
      setRewardedLevel(managerLevel(remote.xp));
      setDailyClaimAt(0);
      setQuests(restoredQuests);
      setCareer(restoredCareer);
      setLeague(restoredLeague);
      setShowCreation(false);
      setCloudSync('synced');
      setToast('Cloud save loaded from Supabase.');
    });
    return () => { active = false; };
  }, [hydrated, cloudUserId]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(PITY_STORAGE_KEY, String(iconPity)); } catch { /* storage unavailable */ }
  }, [hydrated, iconPity]);

  useEffect(() => {
    if (!hydrated) return;
    saveEcoState(ecosystem);
  }, [hydrated, ecosystem]);

  const applyLeague = useCallback((next: LeagueState): void => { leagueRef.current = next; setLeague(next); }, []);
  const syncEcosystem = useCallback((now: number): void => {
    const before = ecoRef.current;
    const after = advanceEcoState(before, now, ecoRanges);
    if (after !== before) {
      ecoRef.current = after;
      ecoSnapshot = after.teams;
      setEcosystem(after);
    }
    // Reconcile even when the ecosystem did not roll over: this repairs stale
    // saved rooms whose bot seats no longer match the division's real clubs.
    const current = leagueRef.current;
    const next = reconcileLeagueTeams(current, after.teams);
    if (next !== current) {
      leagueRef.current = next;
      setLeague(next);
    }
  }, []);
  const settleLeagueClock = useCallback((now: number): void => {
    const current = leagueRef.current;
    const result = advanceLeague(current, now, teamRatingRef.current, liveSlotRef.current);
    if (result.league !== current) {
      leagueRef.current = result.league;
      setLeague(result.league);
      if (result.coins) setCoins((value) => value + result.coins);
      if (result.matches.length || result.dayResult) setRecap({ matches: result.matches, coins: result.coins, day: result.dayResult });
    }
    syncEcosystem(now);
    const today = dayKeyOf(now);
    if (questsRef.current.day !== today) {
      const fresh = createQuestState(today);
      questsRef.current = fresh;
      setQuests(fresh);
    }
  }, [syncEcosystem]);

  useEffect(() => {
    if (!hydrated || showCreation) return;
    settleLeagueClock(Date.now());
    const timer = window.setInterval(() => { setLastActiveAt(Date.now()); settleLeagueClock(Date.now()); }, 15000);
    const mark = (): void => { setLastActiveAt(Date.now()); settleLeagueClock(Date.now()); };
    document.addEventListener('visibilitychange', mark);
    window.addEventListener('focus', mark);
    window.addEventListener('beforeunload', mark);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', mark); window.removeEventListener('focus', mark); window.removeEventListener('beforeunload', mark); };
  }, [hydrated, showCreation, settleLeagueClock]);

  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timeout); }, [toast]);

  const level = managerLevel(managerXp);
  const perks = useMemo<Perk[]>(() => [profile.perk, ...(profile.perk2 ? [profile.perk2] : [])], [profile.perk, profile.perk2]);
  // Slot 1 scales at LVL 15 / 30, Slot 2 (unlocked LVL 5) at LVL 20 / 40.
  const perkValues = {
    chemistry: perks.includes('Tactical Genius') ? perkScale(level, 1, [3, 6, 10]) : 0,
    aim: perks.includes('Aim Coach') ? perkScale(level, 1, [2, 4, 6]) : 0,
    quickSellPct: perks.includes('Scout Master') ? perkScale(level, 1, [15, 25, 40]) : 0,
    clutch: perks.includes('Clutch Master') ? perkScale(level, 2, [3, 6, 9]) : 0,
    matchPrizePct: perks.includes('Match Prize Booster') ? perkScale(level, 2, [20, 35, 50]) : 0,
    packLuckPct: perks.includes('Pack Luck Boost') ? perkScale(level, 2, [15, 25, 40]) : 0,
  };
  const dailyReadyAt = dailyClaimAt + PACK_COOLDOWN_MS;

  useEffect(() => {
    if (!hydrated || showCreation || level <= rewardedLevel) return;
    let bonus = 0;
    for (let next = rewardedLevel + 1; next <= level; next += 1) bonus += levelReward(next);
    setCoins((current) => current + bonus);
    setRewardedLevel(level);
    setLevelUp({ level, coins: bonus });
  }, [hydrated, showCreation, level, rewardedLevel]);

  useEffect(() => {
    if (!levelUp) return;
    const timeout = window.setTimeout(() => setLevelUp(null), 4600);
    return () => window.clearTimeout(timeout);
  }, [levelUp]);

  const squadCards = roles.map((role) => owned.find((card) => card.instanceId === squad[role])).filter((card): card is OwnedCard => Boolean(card));
  const chemistry = calculateChemistry(squadCards, perks, perkValues.chemistry);
  // Team OVR = exact average of the 5 active cards + chemistry bonus.
  const chemBonus = squadCards.length ? Math.round(chemistry / 25) : 0;
  const teamRating = squadCards.length
    ? Math.min(99, Math.round(squadCards.reduce((sum, card) => sum + cardPower(card).ovr, 0) / squadCards.length) + chemBonus)
    : 0;
  teamRatingRef.current = teamRating;

  // Cloud save: debounce the live club into the `profiles` row, and mirror the seat
  // plus season record into `league_teams` so every division table sees real users.
  useEffect(() => {
    if (!hydrated || showCreation || !cloudUserId) return;
    const userId = cloudUserId;
    const userRow = league.teams.find((team) => team.id === 'user');
    const snapshot = {
      clubName: clubLabel(profile.teamName),
      managerName: profile.nickname || 'NEW MANAGER',
      avatar: profile.avatar,
      level,
      xp: managerXp,
      perks,
      coins,
      division: league.division,
      zone: league.zone ?? 0,
      ownedCards: owned,
      activeSquad: squad,
      dailyQuests: { ...quests, career },
      clubBadge: profile.badge ?? '',
      emblem: profile.emblem ?? 'shield',
      accent: profile.accent || DEFAULT_ACCENT,
      claimedClubs,
    };
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const ok = await saveCloudProfile(userId, snapshot);
        if (!cancelled) setCloudSync(ok ? 'synced' : 'error');
        // The league row has a foreign key to profiles; write it only after the
        // profile upsert has succeeded so a first-time manager never hits an FK race.
        if (!ok) return;
        await leagueService.saveMyTeam({
          userId,
          clubName: snapshot.clubName,
          division: snapshot.division,
          zone: snapshot.zone,
          squadOvr: Math.max(50, teamRating, userRow?.ovr ?? 0),
          wins: userRow?.wins ?? 0,
          losses: userRow?.losses ?? 0,
          roundDiff: userRow?.roundDiff ?? 0,
          points: userRow?.points ?? 0,
        });
      })();
    }, 900);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [hydrated, showCreation, cloudUserId, profile, managerXp, perks, coins, level, teamRating, league.division, league.zone, league.teams, owned, squad, quests, claimedClubs, career]);

  // Live zone: every real manager in this division + zone joins the room and the
  // remaining seats stay with AI clubs from `ecosystem.ts`. Refreshed every minute.
  useEffect(() => {
    if (!hydrated || showCreation || !cloudUserId) return;
    const userId = cloudUserId;
    const division = league.division;
    const zone = league.zone ?? 0;
    let active = true;
    const toSeat = (row: OnlineTeamRow): LeagueTeam => ({
      id: `online-${row.userId}`,
      name: row.clubName,
      manager: row.managerName,
      avatar: row.avatar,
      kind: 'human',
      ovr: row.squadOvr,
      played: row.wins + row.losses,
      wins: row.wins,
      losses: row.losses,
      roundDiff: row.roundDiff,
      points: row.points,
    });
    const pull = (): void => {
      void leagueService.fetchZone(division, zone).then((rows) => {
        if (!active) return;
        const current = leagueRef.current;
        if (current.division !== division || (current.zone ?? 0) !== zone) return;
        const rivals = rows.filter((row) => row.userId !== userId).map(toSeat);
        const next = mergeOnlineRivals(current, rivals);
        if (next !== current) { leagueRef.current = next; setLeague(next); }
      });
    };
    pull();
    const timer = window.setInterval(pull, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [hydrated, showCreation, cloudUserId, league.division, league.zone]);

  const squadDuelists: Duelist[] = squadCards.map((card) => {
    const power = cardPower(card);
    // matchEngine already adds a flat +2 for Aim Coach, so only the extra tiers are applied here.
    return { name: card.name, role: card.role, ovr: power.ovr,     aim: Math.min(99, power.aim + Math.max(0, perkValues.aim - 2) + (chemistry > 0 ? Math.ceil(chemistry / 20) : 0)), rfl: power.rfl, sns: power.sns, clt: Math.min(99, power.clt + perkValues.clutch) };
  });
  const openCreation = (nextProfile: Profile): void => {
    const starters = createStarterCards();
    const nextSquad = { ...emptySquad };
    starters.forEach((card) => { nextSquad[card.role] = card.instanceId; });
    const freshLeague = createSeason(0, 1, []);
    leagueRef.current = freshLeague;
    setLeague(freshLeague); setCoins(2500); setProfile(nextProfile); setOwned(starters); setSquad(nextSquad); setShowCreation(false); setCareer(createCareer()); setToast('Club created. You are in Division 1 · Zone A with 2,500 coins.');
  };
  /** Clears the loaded club between accounts; world state (ecosystem, pity) stays global. */
  function resetClub(): void {
    const freshLeague = createSeason(0, 1, []);
    const freshQuests = createQuestState();
    leagueRef.current = freshLeague;
    questsRef.current = freshQuests;
    setProfile(createProfile()); setClaimedClubs([]); setCoins(2500); setOwned([]); setSquad(emptySquad); setPage('squad'); setShowCreation(false); setNewCardIds([]); setManagerXp(0); setRewardedLevel(managerLevel(0)); setDailyClaimAt(0); setLevelUp(null); setLeague(freshLeague); setQuests(freshQuests); setPack(null); setRecap(null); setSeasonNotice(null); setCareer(createCareer()); setLastActiveAt(Date.now());
  }
  const handleLogout = (): void => {
    setSession(null);
    setHydrated(false);
    resetClub();
    void authService.signOut().catch(() => { /* the local session is already cleared */ });
  };
  const bumpQuest = (id: QuestId): void => {
    const current = questsRef.current;
    const today = dayKeyOf(Date.now());
    const base = current.day === today ? current : createQuestState(today);
    if (base.claimed.includes(id)) {
      if (base !== current) { questsRef.current = base; setQuests(base); }
      return;
    }
    const definition = questDef(id);
    const count = base[id] + 1;
    const next: QuestState = { ...base, [id]: count };
    questsRef.current = next;
    setQuests(next);
    if (count === definition.target) setToast(`Daily quest ready to claim: ${definition.title} · +${definition.reward} coins`);
  };
  const claimQuest = (id: QuestId): void => {
    const current = questsRef.current;
    const today = dayKeyOf(Date.now());
    const base = current.day === today ? current : createQuestState(today);
    const definition = questDef(id);
    if (base.claimed.includes(id) || base[id] < definition.target) return;
    const next: QuestState = { ...base, claimed: [...base.claimed, id] };
    questsRef.current = next;
    setQuests(next);
    setCoins((value) => value + definition.reward);
    setToast(`Quest claimed: ${definition.title} · +${definition.reward} coins`);
  };
  const awardMvpBonus = (amount: number): void => {
    setCoins((value) => value + amount);
    setToast(`Match MVP bonus · +${amount} coins`);
  };
  const recordCareerMatch = useCallback((won: boolean, map: RadarMapId): void => {
    setCareer((current) => ({
      matches: current.matches + 1,
      wins: current.wins + (won ? 1 : 0),
      mapCounts: { ...current.mapCounts, [map]: (current.mapCounts[map] ?? 0) + 1 },
    }));
  }, []);
  const updateSquad = (next: Record<Role, string>): void => { setSquad(next); };
  const resolveScrimmage = (won: boolean): void => {
    bumpQuest('scrim');
    if (!won) { setToast('Scrimmage lost — no coins, but the daily quest counted.'); return; }
    // Every starter earns card XP on a friendly win, even after the daily coin cap.
    const starterIds = new Set(Object.values(squad).filter(Boolean));
    setOwned((current) => current.map((card) => starterIds.has(card.instanceId) ? grantCardXp(card, SCRIM_CARD_XP) : card));
    const current = questsRef.current;
    const today = dayKeyOf(Date.now());
    const base = current.day === today ? current : createQuestState(today);
    if (base.scrimWins >= SCRIM_WIN_CAP) {
      setToast(`Scrimmage win · +${SCRIM_CARD_XP} XP per starter · daily paid-win cap reached (${SCRIM_WIN_CAP}/${SCRIM_WIN_CAP})`);
      return;
    }
    const next: QuestState = { ...base, scrimWins: base.scrimWins + 1 };
    questsRef.current = next;
    setQuests(next);
    const prize = Math.round(SCRIM_WIN_COINS * (1 + perkValues.matchPrizePct / 100));
    setCoins((value) => value + prize);
    setManagerXp((value) => value + 10);
    setToast(`Scrimmage win: +${prize} coins · +${SCRIM_CARD_XP} XP per starter · ${next.scrimWins}/${SCRIM_WIN_CAP} paid wins today`);
  };
  const quickSell = (card: OwnedCard): void => {
    const multiplier = 1 + perkValues.quickSellPct / 100;
    const value = Math.round(tierConfig[card.tier].sell * multiplier);
    setCoins((current) => current + value); setOwned((current) => current.filter((item) => item.instanceId !== card.instanceId));
    setSquad((current) => Object.fromEntries(Object.entries(current).map(([role, id]) => [role, id === card.instanceId ? '' : id])) as Record<Role, string>);
    setToast(`${card.name} sold for ${value.toLocaleString()} coins`);
  };
  const upgradeCard = (card: OwnedCard): void => {
    const currentLevel = cardLevel(card.level);
    if (currentLevel >= CARD_MAX_LEVEL) return;
    const duplicates = owned.filter((item) => item.id === card.id && item.instanceId !== card.instanceId);
    if (!duplicates.length) return;
    const inSquad = (item: OwnedCard): boolean => Object.values(squad).includes(item.instanceId);
    const duplicate = [...duplicates].sort((a, b) => cardLevel(a.level) - cardLevel(b.level) || Number(inSquad(a)) - Number(inSquad(b)))[0];
    const nextLevel = currentLevel + 1;
    setOwned((current) => current.filter((item) => item.instanceId !== duplicate.instanceId).map((item) => item.instanceId === card.instanceId ? { ...item, level: nextLevel } : item));
    if (inSquad(duplicate)) setSquad((current) => ({ ...current, [duplicate.role]: '' }));
    setNewCardIds((current) => current.filter((id) => id !== duplicate.instanceId));
    setToast(`${card.name} upgraded to LVL ${nextLevel}${nextLevel === CARD_MAX_LEVEL ? ' · MAX LEVEL REACHED' : ''} · 1 duplicate consumed`);
    bumpQuest('train');
  };
  const claimClubMilestone = (team: string): void => {
    const club = CLUB_GROUPS.find((group) => group.name === team);
    if (!club || claimedClubs.includes(team)) return;
    if (!club.players.every((player) => owned.some((card) => card.id === player.id))) return;
    setClaimedClubs((current) => current.includes(team) ? current : [...current, team]);
    setCoins((current) => current + CLUB_COMPLETION_REWARD);
    setProfile((current) => ({ ...current, badge: team }));
    setToast(`${team} completed · +${CLUB_COMPLETION_REWARD.toLocaleString()} coins · club badge equipped`);
  };
  const equipClubBadge = (team?: string): void => setProfile((current) => ({ ...current, badge: team }));
  const listOnMarket = async (card: OwnedCard, price: number): Promise<boolean> => {
    if (!cloudUserId) { setToast('Sign in with Supabase to trade on the transfer market.'); return false; }
    const ok = await createListing({ sellerId: cloudUserId, sellerClub: clubLabel(profile.teamName), price, cardId: card.id, card: { ...card } });
    if (!ok) { setToast('Could not list the card. Is the market_listings table created?'); return false; }
    setOwned((current) => current.filter((item) => item.instanceId !== card.instanceId));
    setNewCardIds((current) => current.filter((id) => id !== card.instanceId));
    setSquad((current) => Object.fromEntries(Object.entries(current).map(([role, id]) => [role, id === card.instanceId ? '' : id])) as Record<Role, string>);
    setToast(`${card.name} listed for ${price.toLocaleString()} coins · payout ${marketPayout(price).toLocaleString()} after ${Math.round(MARKET_TAX * 100)}% tax`);
    return true;
  };
  const buyMarketCard = async (listing: MarketListing): Promise<boolean> => {
    if (listing.sellerId === cloudUserId) { setToast('That is your own listing.'); return false; }
    if (coins < listing.price) { setToast(`Not enough coins — this card costs ${listing.price.toLocaleString()}.`); return false; }
    const imported = cardFromSnapshot(listing.card, 'market');
    if (!imported) { setToast('That listing could not be read.'); return false; }
    if (listing.sellerId.startsWith('bot:')) {
      setOwned((current) => [...current, imported]);
      setNewCardIds((current) => [...current, imported.instanceId]);
      setCoins((current) => current - listing.price);
      setToast(`${imported.name} joined your club from ${listing.sellerClub} · ${listing.price.toLocaleString()} coins spent`);
      return true;
    }
    if (!cloudUserId) { setToast('Sign in with Supabase to buy real player listings.'); return false; }
    const ok = await buyListing(listing.id);
    if (!ok) { setToast('That listing is no longer available.'); return false; }
    setOwned((current) => [...current, imported]);
    setNewCardIds((current) => [...current, imported.instanceId]);
    setCoins((current) => current - listing.price);
    setToast(`${imported.name} joined your club for ${listing.price.toLocaleString()} coins`);
    return true;
  };
  const cancelMarketListing = async (listing: MarketListing): Promise<boolean> => {
    if (!cloudUserId) return false;
    const ok = await cancelListing(listing.id, cloudUserId);
    if (!ok) { setToast('Could not cancel this listing.'); return false; }
    const restored = cardFromSnapshot(listing.card, 'cancel');
    if (restored) setOwned((current) => [...current, restored]);
    setToast(`${restored?.name ?? 'Card'} returned to your club.`);
    return true;
  };
  const claimMarketSale = async (listing: MarketListing): Promise<boolean> => {
    if (!cloudUserId) return false;
    const ok = await claimSale(listing.id, cloudUserId);
    if (!ok) { setToast('This payout was already claimed.'); return false; }
    const payout = marketPayout(listing.price);
    setCoins((current) => current + payout);
    setToast(`Sale payout claimed · +${payout.toLocaleString()} coins after ${Math.round(MARKET_TAX * 100)}% market tax`);
    return true;
  };
  const purchasePack = (id: PackId, times = 1): void => {
    const definition = packCatalog.find((item) => item.id === id);
    if (!definition) return;
    const quantity = id === 'daily' ? 1 : Math.max(1, Math.min(5, Math.floor(times)));
    const unitPrice = Math.round(definition.price * (1 - storeDiscount(level)));
    const totalPrice = unitPrice * quantity;
    if (id === 'daily') { if (Date.now() < dailyReadyAt) return; }
    else if (coins < totalPrice) return;
    const generated: PackCard[] = [];
    let pity = iconPity;
    let pityHit = false;
    for (let index = 0; index < quantity; index += 1) {
      const guarantee = id !== 'daily' && pity >= PITY_LIMIT;
      const cards = generatePack(id, guarantee, perkValues.packLuckPct);
      generated.push(...cards);
      if (id !== 'daily') {
        if (guarantee) pityHit = true;
        pity = cards.some((card) => card.tier === 'Icon') ? 0 : pity + 1;
      }
    }
    const cardsForClub = generated.map((card) => { const copy = { ...card, level: cardLevel(card.level) }; delete copy.revealed; return copy; });
    if (id === 'daily') { setDailyClaimAt(Date.now()); setToast('Daily free pack claimed. The next one unlocks in 24 hours.'); }
    else {
      setCoins((current) => current - totalPrice);
      setIconPity(pity);
      setToast(`${quantity > 1 ? `${quantity}× ` : ''}${definition.name} secured. ${generated.length} cards added to My Club.${pityHit ? ' ICON PITY TRIGGERED!' : ` Pity ${pity}/${PITY_LIMIT}.`}`);
    }
    setOwned((current) => [...current, ...cardsForClub]);
    setNewCardIds((current) => [...current, ...cardsForClub.map((card) => card.instanceId)]);
    setPack(generated);
    playSound('reveal', generated.reduce((best, card) => (RARITY_RANK[card.tier] > RARITY_RANK[best] ? card.tier : best), 'Bronze' as Tier));
    bumpQuest('packs');
  }; 
  const awardArenaWin = (reward: number, xp: number, message?: string): void => {
    const boosted = Math.round(reward * (1 + perkValues.matchPrizePct / 100));
    setCoins((current) => current + boosted);
    setManagerXp((current) => current + xp);
    playSound('win');
    setToast(message ?? `Victory reward: +${boosted.toLocaleString()} coins · +${xp} XP`);
  };

  if (!authReady) return <div className="auth-boot"><div className="auth-spinner" /><span>LOADING ULTIMATE TEAM</span></div>;
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  if (!hydrated) return <div className="auth-boot"><div className="auth-spinner" /><span>LOADING YOUR CLUB</span></div>;
  return <div spellCheck={false} className="ultimate-app min-h-screen bg-[#0f172a] text-slate-200">
    <Sidebar page={page} setPage={setPage} profile={profile} league={league} />
    <main className="ultimate-main">
      <Header profile={profile} coins={coins} cloud={cloudSync} onLogout={handleLogout} />
      <div className="ultimate-content">
        {page === 'squad' && <SquadPage owned={owned} squad={squad} setSquad={updateSquad} teamRating={teamRating} chemistry={chemistry} profile={profile} onGoClub={() => setPage('club')} quests={quests} onClaimQuest={claimQuest} />}
        {page === 'store' && <StorePage coins={coins} level={level} dailyReadyAt={dailyReadyAt} iconPity={iconPity} onBuyPack={purchasePack} />}
        {page === 'club' && <ClubPage owned={owned} squad={squad} setSquad={updateSquad} newCardIds={newCardIds} badge={profile.badge} claimedClubs={claimedClubs} onClaimClub={claimClubMilestone} onEquipBadge={equipClubBadge} onSell={quickSell} onUpgrade={upgradeCard} />}
        {page === 'market' && <MarketPage userId={cloudUserId} coins={coins} owned={owned} squad={squad} onList={listOnMarket} onBuy={buyMarketCard} onCancel={cancelMarketListing} onClaim={claimMarketSale} />}
        {page === 'arena' && <ArenaPage userId={cloudUserId} teamRating={teamRating} chemistry={chemistry} perks={perks} teamName={profile.teamName} emblem={profile.emblem} accent={profile.accent} league={league} setLeague={applyLeague} onWin={awardArenaWin} onMvpBonus={awardMvpBonus} squad={squadDuelists} ecosystem={ecosystem.teams} quests={quests} onClaimQuest={claimQuest} scrimWins={quests.day === dayKeyOf(Date.now()) ? quests.scrimWins : 0} onScrimmage={resolveScrimmage} onCareerMatch={recordCareerMatch} liveSlotRef={liveSlotRef} />}
        {page === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} managerXp={managerXp} trophies={league.trophies} career={career} />}
      </div>
    </main>
    {showCreation && <CreationModal onComplete={openCreation} />}
    {pack && <PackOverlay pack={pack} onClose={() => setPack(null)} onReveal={(instanceId) => setPack((current) => current?.map((card) => card.instanceId === instanceId ? { ...card, revealed: true } : card) ?? null)} onRevealAll={() => setPack((current) => current?.map((card) => ({ ...card, revealed: true })) ?? null)} onContinue={() => { setPack(null); setPage('club'); }} />}
    {toast && <div className="toast"><BadgeCheck size={17} /> {toast}</div>}
    {recap && <MatchRecapModal info={recap} onClose={() => setRecap(null)} />}
    {seasonNotice && <SeasonRolloverModal info={seasonNotice} onClose={() => setSeasonNotice(null)} />}
    {levelUp && <div className="level-up-banner" role="status" onClick={() => setLevelUp(null)}><div className="level-up-icon"><Sparkles size={22} /></div><div className="level-up-copy"><strong>LEVEL UP!</strong><span>Level {levelUp.level} reached · +{levelUp.coins.toLocaleString()} Coins</span></div><TrendingUp size={20} className="level-up-arrow" /></div>}
  </div>;
}

function SeasonRolloverModal({ info, onClose }: { info: { season: number; from: number; to: number; coins: number; packs: number }; onClose: () => void }) {
  const moved = info.to - info.from;
  const moveLabel = moved > 0 ? `+${moved} div` : moved < 0 ? `-${Math.abs(moved)} div` : 'No drop';
  return <div className="league-overlay"><div className="season-modal"><div className="season-emblem trophy"><Trophy size={26} /></div><div className="eyebrow orange">{seasonLabel(info.season)} BEGINS</div><h2>A new month, a new season.</h2><p>The last season has closed. Placement rewards have been paid and the standings reset for the new climb.</p><div className="season-stats"><span><small>PRIZE</small><strong><Coins size={13} /> {info.coins.toLocaleString()}</strong></span><span><small>PACKS</small><strong>+{info.packs} cards</strong></span><span><small>DIVISION</small><strong>{moveLabel}</strong></span></div><div className="season-movement">{moved > 0 ? <Sparkles size={15} /> : moved < 0 ? <RotateCcw size={15} /> : <BadgeCheck size={15} />} Division {info.from + 1} → Division {info.to + 1} · {divisions[info.to].name}{moved > 0 ? ' · Promoted' : ''}</div><button className="primary-button season-continue" onClick={onClose}>Start {seasonLabel(info.season)} <ChevronRight size={15} /></button></div></div>;
}

function Sidebar({ page, setPage, profile, league }: { page: Page; setPage: (page: Page) => void; profile: Profile; league: LeagueState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const items: Array<{ id: Page; label: string; icon: typeof Users; note?: string }> = [
    { id: 'squad', label: 'My Squad', icon: Users, note: 'LINEUP' }, { id: 'store', label: 'Store / Packs', icon: Store, note: 'PACKS' }, { id: 'club', label: 'My Club', icon: LayoutGrid, note: 'COLLECTION' }, { id: 'market', label: 'Market', icon: ArrowLeftRight, note: 'TRANSFERS' }, { id: 'arena', label: 'Play Arena', icon: Swords, note: 'STEP 2' }, { id: 'profile', label: 'Profile', icon: UserRound, note: 'MANAGER' },
  ];
  return <aside className="ut-sidebar"><div className="ut-logo"><div className="ut-logo-icon"><Crosshair size={19} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="manager-mini"><div className="avatar-circle" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div><strong>{profile.nickname || 'New Manager'}</strong><span>{clubLabel(profile.teamName)}</span></div></div><div className="sidebar-label">MAIN MENU</div><nav>{items.map(({ id, label, icon: Icon, note }) => <button key={id} className={`ut-nav ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span><small>{note}</small></button>)}</nav><div className="sidebar-bottom"><div className="season-card"><Sparkles size={15} className="text-orange-400" /><div><strong>{seasonLabel(league.season)}</strong><span>Road to the Major</span></div></div><div className="season-timer"><small>ENDS IN</small><strong>{seasonCountdown(now)}</strong></div><div className="sidebar-version">ULTIMATE TEAM · 2026</div></div></aside>;
}

function Header({ profile, coins, cloud, onLogout }: { profile: Profile; coins: number; cloud: CloudSync; onLogout: () => void }) {
  const [muted, setMuted] = useState(isSoundMuted);
  useEffect(() => subscribeSoundMuted(setMuted), []);
  const toggleMute = (): void => { const next = !isSoundMuted(); setSoundMuted(next); if (!next) playSound('click'); };
  const cloudLabel = cloud === 'off' ? 'LOCAL' : cloud === 'error' ? 'SYNC ISSUE' : cloud === 'idle' ? 'SYNCING' : 'CLOUD SAVE';
  const cloudHint = cloud === 'off'
    ? 'Local mode: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to save and play online'
    : cloud === 'error' ? 'Cloud save failed. Check your Supabase keys and run the SQL script.'
      : cloud === 'idle' ? 'Syncing your club with Supabase...' : 'Club, squad and division seat saved to Supabase';
  return <header className="ut-header"><div className="mobile-title">CS2 <span>ULTIMATE TEAM</span></div><div className="header-spacer" /><button className="sound-toggle" onClick={toggleMute} title={muted ? 'Sound off – click to unmute' : 'Sound on – click to mute'} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><div className={`cloud-state ${cloud}`} title={cloudHint}><i />{cloudLabel}</div><div className="header-manager"><div className="avatar-circle small" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div className="header-manager-name"><span>MANAGER</span><strong>{profile.nickname || 'New Manager'}</strong></div></div><div className="header-team"><span>TEAM</span><strong>{profile.badge && <i className="club-badge" title={`${profile.badge} club badge`}>{clubMonogram(profile.badge)}</i>}{clubLabel(profile.teamName)}</strong></div><div className="coin-balance"><Coins size={16} /><div><span>COINS</span><strong>{coins.toLocaleString()}</strong></div></div><button className="logout-profile" onClick={onLogout}><LogOut size={14} /> Log Out</button></header>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next: 'signin' | 'signup'): void => {
    if (busy || next === mode) return;
    setMode(next); setError(''); setNotice('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const result = await authService.signUp(email, password);
        if (result.session) onAuthenticated(result.session);
        else setNotice('Account created. Confirm your email address, then sign in.');
      } else {
        onAuthenticated(await authService.signIn(email, password));
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async (): Promise<void> => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await authService.signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return <div className="auth-gate">
    <div className="auth-glow" />
    <div className="auth-panel">
      <div className="auth-brand"><div className="auth-brand-mark"><Crosshair size={22} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div>
      <div className="auth-heading">
        <div className="eyebrow orange">{mode === 'signin' ? 'MANAGER LOGIN' : 'NEW MANAGER'}</div>
        <h1>{mode === 'signin' ? 'Welcome back, manager.' : 'Build your legacy.'}</h1>
        <p>{mode === 'signin' ? 'Sign in to load your club, squad and league standing.' : 'Create an account to claim your club, starter five and 2,500 coins.'}</p>
      </div>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>Sign In</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create Account</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field"><span>EMAIL</span><div><Mail size={15} /><input type="email" autoComplete="email" required value={email} placeholder="manager@club.gg" onChange={(event) => setEmail(event.target.value)} /></div></label>
        <label className="auth-field"><span>PASSWORD</span><div><LockKeyhole size={15} /><input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} placeholder="At least 6 characters" onChange={(event) => setPassword(event.target.value)} /></div></label>
        {error && <div className="auth-message error" role="alert">{error}</div>}
        {notice && <div className="auth-message success" role="status">{notice}</div>}
        <button type="submit" className="auth-submit" disabled={busy}>{busy ? <><span className="auth-spinner small" /> WORKING…</> : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ChevronRight size={16} /></>}</button>
      </form>
      <div className="auth-divider"><span>OR</span></div>
      <button type="button" className="auth-google" onClick={google} disabled={busy}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.8c2.2-2 3.7-5 3.7-8.7Z" /><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.8-2.9l-3.8-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8h-3.9v3.1A11.7 11.7 0 0 0 12 24Z" /><path fill="#FBBC05" d="M5.4 14.5a7 7 0 0 1 0-4.9V6.5h-3.9a11.7 11.7 0 0 0 0 10.5l3.9-2.5Z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.7l3.3-3.3A11.5 11.5 0 0 0 12 0 11.7 11.7 0 0 0 1.5 6.5l3.9 3.1A7 7 0 0 1 12 4.8Z" /></svg>
        Continue with Google
      </button>
      <div className="auth-foot">{authService.isRemote ? 'Secured by Supabase Auth' : 'Local preview mode · accounts stay on this device until Supabase keys are added'}</div>
    </div>
  </div>;
}

function ChemistryLinks({ owned, squad }: { owned: OwnedCard[]; squad: Record<Role, string> }) {
  const cardFor = (role: Role): OwnedCard | undefined => owned.find((card) => card.instanceId === squad[role]);
  const tone = (a?: OwnedCard, b?: OwnedCard): 'green' | 'yellow' | 'red' | 'empty' => {
    if (!a || !b) return 'empty';
    if (isUniversalIcon(a) || isUniversalIcon(b) || a.team === b.team) return 'green';
    if (a.country && a.country === b.country) return 'yellow';
    const region = chemistryRegion(a.country);
    if (region && region === chemistryRegion(b.country)) return 'yellow';
    return 'red';
  };
  return <div className="chem-links" aria-label="Chemistry links between the five roles">
    {roles.map((role, index) => {
      const card = cardFor(role);
      const next = index < roles.length - 1 ? cardFor(roles[index + 1]) : undefined;
      const linkTone = index < roles.length - 1 ? tone(card, next) : 'empty';
      return <div className="chem-link-unit" key={role}>
        <div className={`chem-node ${card ? `tier-${card.tier.toLowerCase()}` : 'empty'}`} style={card ? ({ '--chem-color': tierConfig[card.tier].color } as React.CSSProperties) : undefined}>
          <span>{roleLabel(role)}</span>
          <small>{card ? card.name.split(' ').slice(-1)[0] : 'EMPTY'}</small>
          {card && <CountryFlag code={card.country} />}
        </div>
        {index < roles.length - 1 && <div className={`chem-link ${linkTone}`} aria-label={`${roleLabel(role)} to ${roleLabel(roles[index + 1])} link`}><i /></div>}
      </div>;
    })}
  </div>;
}

function SquadPage({ owned, squad, setSquad, teamRating, chemistry, profile, onGoClub, quests, onClaimQuest }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; teamRating: number; chemistry: number; profile: Profile; onGoClub: () => void; quests: QuestState; onClaimQuest: (id: QuestId) => void }) {
  const chemAimPct = chemistry > 0 ? Math.ceil(chemistry / 20) : 0;
  return <>
    <PageTitle eyebrow="MY CLUB / ACTIVE LINEUP" title="My Squad" subtitle={clubLabel(profile.teamName)} action={<button className="outline-button" onClick={onGoClub}><Grid2X2 size={15} /> Browse Club</button>} />
    <div className="squad-hero">
      <div className="squad-hero-copy">
        <div className="eyebrow orange">ACTIVE SQUAD</div>
        <h2>{clubLabel(profile.teamName)}</h2>
        <p>Five roles. One server. Make every card count.</p>
        <div className="squad-stat-row">
          <div><span>TEAM OVR</span><strong>{teamRating || '--'}</strong></div>
          <div><span>CHEMISTRY</span><strong className="green-text">{chemistry}<small>/100</small></strong><em>+{chemAimPct}% AIM</em></div>
          <div><span>CARDS</span><strong>{owned.length}</strong></div>
        </div>
      </div>
      <div className="squad-emblem" style={{ '--emblem-color': avatarDetails[profile.avatar].color } as React.CSSProperties}>{avatarDetails[profile.avatar].icon}<span>{clubMonogram(profile.teamName)}</span></div>
    </div>
    <DailyQuestsPanel quests={quests} onClaim={onClaimQuest} compact />
    <div className="section-row">
      <div><div className="eyebrow">STARTING FIVE</div><h3>Active Lineup • 5 Roles</h3></div>
      <div className="chem-meter"><span>CHEMISTRY {chemistry}/100 · +{chemAimPct}% AIM</span><div><i style={{ width: `${chemistry}%` }} /></div></div>
    </div>
    <div className="chem-legend"><span className="chem-key team"><i />SAME PRO TEAM</span><span className="chem-key country"><i />SAME COUNTRY</span><span className="chem-key region"><i />SAME REGION</span><span className="chem-key icon"><i />ICON 90+ UNIVERSAL</span></div>
    <ChemistryLinks owned={owned} squad={squad} />
    <div className="squad-grid">{roles.map((role) => <SquadSlot key={role} role={role} card={owned.find((item) => item.instanceId === squad[role])} onGoClub={onGoClub} onRemove={() => setSquad({ ...squad, [role]: '' })} />)}</div>
    <div className="squad-tip"><Sparkles size={16} /><span><strong>Squad tip:</strong> Stack same pro team links for the strongest boost, then same country, then shared region ({'Europe/CIS'} · {'Asia-Pacific'} · {'Americas'}). Every 90+ Icon links green with anyone.</span></div>
  </>;
}

function DailyQuestsPanel({ quests, onClaim, compact = false }: { quests: QuestState; onClaim: (id: QuestId) => void; compact?: boolean }) {
  const claimedCount = quests.claimed.length;
  return <div className={`quest-panel ${compact ? 'compact' : ''}`}>
    <div className="quest-head"><div><div className="eyebrow orange">DAILY QUESTS</div><h3>Extra coin routes</h3></div><span>Resets at 00:00 · {claimedCount}/{dailyQuests.length} claimed</span></div>
    <div className="quest-list">{dailyQuests.map((quest) => {
      const value = Math.min(quest.target, questValue(quests, quest.id));
      const done = quests.claimed.includes(quest.id);
      const ready = !done && value >= quest.target;
      return <div key={quest.id} className={`quest-row ${done ? 'done' : ''} ${ready ? 'ready' : ''}`}>
        <span className="quest-icon">{done ? <BadgeCheck size={15} /> : <Target size={15} />}</span>
        <div className="quest-copy"><strong>{quest.title}</strong><small>{quest.note}</small><div className="quest-bar"><i style={{ width: `${Math.round((value / quest.target) * 100)}%` }} /></div></div>
        <span className="quest-progress">{value}/{quest.target}</span>
        <b className="quest-reward"><Coins size={12} /> +{quest.reward}</b>
        <button type="button" className="quest-claim" disabled={!ready} onClick={() => { playSound('click'); onClaim(quest.id); }}>{done ? 'Claimed' : ready ? 'Claim' : `${value}/${quest.target}`}</button>
      </div>;
    })}</div>
  </div>;
}

function SquadSlot({ role, card, onGoClub, onRemove }: { role: Role; card?: OwnedCard; onGoClub: () => void; onRemove: () => void }) {
  return <div className={`squad-slot ${card ? 'filled' : ''}`}>{card ? <><button className="remove-slot" onClick={onRemove}><X size={13} /></button><FutCard card={card} compact /></> : <button className="empty-slot" onClick={onGoClub}><div className="plus-mark">+</div><strong>{roleLabel(role)}</strong><span>ADD PLAYER</span></button>}<div className="slot-label">{roleLabel(role)}</div></div>;
}

function FutCard({ card, compact = false, onClick, locked = false, isNew = false }: { card: PlayerCard & { level?: number; xp?: number }; compact?: boolean; onClick?: () => void; locked?: boolean; isNew?: boolean }) {
  const config = tierConfig[card.tier];
  const power = cardPower(card);
  const level = cardLevel(card.level);
  const xp = cardXp(card.xp);
  const maxed = level === CARD_MAX_LEVEL;
  return <button className={`fut-card tier-${card.tier.toLowerCase()} ${compact ? 'compact' : ''} ${locked ? 'locked' : ''} ${!locked && power.ovr >= 99 ? 'maxed' : ''}`} onClick={onClick} style={{ '--tier-color': config.color, '--tier-soft': config.soft } as React.CSSProperties}>
    <span className="card-shield" aria-hidden="true" />
    <span className="card-shine" aria-hidden="true" />
    {isNew && <span className="new-card-badge">NEW</span>}
    <span className="card-body">
      <span className="card-top">
        <span className="card-ovr-block"><b className="card-ovr">{locked ? '?' : power.ovr}</b><i>OVR</i></span>
        <span className="card-role">{roleLabel(card.role)}</span>
        <span className="card-rarity-icon">{card.tier === 'Icon' ? <Crown size={13} /> : card.tier === 'Star' ? <Star size={13} /> : <Medal size={13} />}</span>
      </span>
      <span className="card-portrait">
        {locked ? <LockKeyhole size={compact ? 25 : 34} /> : <>
          <span className="card-watermark" aria-hidden="true"><CountryFlag code={card.country} /></span>
          <PlayerSilhouette compact={compact} />
          <span className="country-flag" title={card.country}><CountryFlag code={card.country} /></span>
          <span className="card-portrait-mark">{card.tier === 'Icon' ? <Crown size={compact ? 15 : 19} /> : <Shield size={compact ? 15 : 19} />}</span>
        </>}
      </span>
      <span className="card-name">{locked ? 'UNOWNED' : card.name}</span>
      <span className="card-team"><Shield size={10} />{locked ? 'FREE AGENT' : card.team}</span>
      <span className="card-stats"><span><b>{locked ? '--' : power.aim}</b>AIM</span><span><b>{locked ? '--' : power.rfl}</b>RFL</span><span><b>{locked ? '--' : power.sns}</b>SNS</span><span><b>{locked ? '--' : power.clt}</b>CLT</span></span>
      {!locked && <span className={`card-level ${maxed ? 'max' : ''}`} title={maxed ? 'Maximum card level' : `${xp} / ${CARD_XP_STEP} XP to next level`}>{maxed && <Star size={8} fill="currentColor" />} LVL {level}{maxed ? ' MAX' : ` · ${xp} XP`}</span>}
    </span>
  </button>;
}

function StorePage({ coins, level, dailyReadyAt, iconPity, onBuyPack }: { coins: number; level: number; dailyReadyAt: number; iconPity: number; onBuyPack: (id: PackId, times?: number) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const discountPct = storeDiscount(level);
  const remaining = Math.max(0, dailyReadyAt - now);
  const dailyReady = remaining === 0;
  const pityProgress = Math.min(100, Math.round((iconPity / PITY_LIMIT) * 100));
  return <>
    <PageTitle eyebrow="TRANSFER MARKET" title="Store / Packs" subtitle="Every pack is saved to My Club the moment you open it. Packs hold 2 or 3 cards." />
    {discountPct > 0 && <div className="vip-strip"><Percent size={15} /><strong>MANAGER STORE DISCOUNT</strong><span>Level {level} manager: every pack is {Math.round(discountPct * 100)}% cheaper ({storeDiscountLabel(level)}).</span></div>}
    <div className="pity-strip"><Crown size={15} /><strong>ICON PITY</strong><div className="pity-meter"><i style={{ width: `${pityProgress}%` }} /></div><span>{iconPity} / {PITY_LIMIT} paid packs without an Icon · Icon guaranteed on pack {PITY_LIMIT + 1}</span></div>
    <div className="pack-grid">
      {packCatalog.map((pack) => {
        const price = Math.round(pack.price * (1 - discountPct));
        const cooling = pack.id === 'daily' && !dailyReady;
        const disabled = pack.id === 'daily' ? !dailyReady : coins < price;
        return <PackProduct key={pack.id} pack={pack} price={price} discountPct={discountPct} disabled={disabled} bulkDisabled={coins < price * 5} cooldownLabel={cooling ? countdownLabel(remaining) : undefined} onBuy={() => onBuyPack(pack.id)} onBuyBulk={pack.bulk ? () => onBuyPack(pack.id, 5) : undefined} />;
      })}
    </div>
  </>;
}

function PackProduct({ pack, price, discountPct, disabled, bulkDisabled, cooldownLabel, onBuy, onBuyBulk }: { pack: PackDefinition; price: number; discountPct: number; disabled: boolean; bulkDisabled?: boolean; cooldownLabel?: string; onBuy: () => void; onBuyBulk?: () => void }) {
  const config = tierConfig[pack.tier];
  const accent = pack.color ?? config.color;
  const soft = pack.soft ?? config.soft;
  const isDaily = pack.id === 'daily';
  const symbol = isDaily ? <Gift size={36} /> : pack.id === 'awp' ? <Crosshair size={36} /> : pack.id === 'rifle' ? <Swords size={36} /> : pack.id === 'igl' ? <Users size={36} /> : pack.id === 'asia' ? <Globe size={36} /> : pack.id === 'silver' ? <Shield size={36} /> : pack.tier === 'Bronze' ? <Medal size={36} /> : pack.tier === 'Gold' ? <Trophy size={36} /> : <Crown size={36} />;
  return <div className={`pack-product ${pack.badge === 'MOST POPULAR' ? 'featured' : ''} ${isDaily ? 'daily-pack' : ''}`} style={{ '--pack-color': accent, '--pack-soft': soft } as React.CSSProperties}>
    {pack.badge && <div className="featured-label">{pack.badge}</div>}
    <div className="pack-art"><div className="pack-glow" /><div className="pack-symbol">{symbol}</div><strong>{pack.art}</strong><span>PLAYER PACK · {pack.count} CARDS</span></div>
    <div className="pack-copy">
      <div className="pack-title-row"><h3>{pack.name}</h3><span>{pack.tagline}</span></div>
      <p>{pack.description}</p>
      <div className="pack-odds"><span>DROP RATES</span><strong>{pack.odds}</strong></div>
      <div className={`pack-buy-row ${onBuyBulk ? 'has-bulk flex flex-col gap-2 w-full' : ''}`}>
        <button className={`buy-button ${onBuyBulk ? 'w-full py-3' : ''}`} disabled={disabled} onClick={onBuy}>{isDaily ? <Gift size={15} /> : <Coins size={15} />}{isDaily ? 'FREE' : price.toLocaleString()}<span>{cooldownLabel ? `READY IN ${cooldownLabel}` : isDaily ? 'CLAIM PACK' : 'BUY PACK'}</span></button>
        {onBuyBulk && <button className="buy-button buy-bulk w-full py-2.5" disabled={bulkDisabled} onClick={onBuyBulk} title={`Open 5 packs for ${(price * 5).toLocaleString()} coins`}><span>BUY 5×</span><b>{(price * 5).toLocaleString()}</b></button>}
      </div>
      {discountPct > 0 && pack.price > 0 && <small className="pack-vip">MANAGER −{Math.round(discountPct * 100)}% <s>{pack.price.toLocaleString()}</s></small>}
      {isDaily && <small className="pack-cooldown">{cooldownLabel ? 'One free pack every 24 hours' : 'Free pack ready to claim'}</small>}
    </div>
  </div>;
}

function ClubPage({ owned, squad, setSquad, newCardIds, badge, claimedClubs, onClaimClub, onEquipBadge, onSell, onUpgrade }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; newCardIds: string[]; badge?: string; claimedClubs: string[]; onClaimClub: (team: string) => void; onEquipBadge: (team?: string) => void; onSell: (card: OwnedCard) => void; onUpgrade: (card: OwnedCard) => void }) {
  const [view, setView] = useState<'owned' | 'catalog' | 'teams'>('owned');
  const [tierFilter, setTierFilter] = useState<Tier | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [query, setQuery] = useState('');
  const [sellTarget, setSellTarget] = useState<OwnedCard | null>(null);
  const filtered = owned.filter((card) => (tierFilter === 'All' || card.tier === tierFilter) && (roleFilter === 'All' || card.role === roleFilter) && card.name.toLowerCase().includes(query.toLowerCase()));
  const addToSquad = (card: OwnedCard): void => { if (Object.values(squad).includes(card.instanceId)) return; setSquad({ ...squad, [card.role]: card.instanceId }); };
  const ownedIds = new Set(owned.map((card) => card.id));
  const completedClubs = CLUB_GROUPS.filter((club) => club.players.every((player) => ownedIds.has(player.id))).length;
  const copies = (card: OwnedCard): number => owned.filter((item) => item.id === card.id).length;
  return <><PageTitle eyebrow="YOUR COLLECTION" title="My Club" subtitle={view === 'owned' ? `${owned.length} player cards collected across five tiers.` : view === 'teams' ? `Complete a real club's five-man roster to claim its badge and 5,000 coins.` : `Explore every player available in the ${database.length}-card database.`} action={<div className="club-tabs"><button className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>My Owned Cards <span>{owned.length}</span></button><button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>All Players Catalog <span>{database.length}</span></button><button className={view === 'teams' ? 'active' : ''} onClick={() => setView('teams')}>Teams <span>{completedClubs}/{CLUB_GROUPS.length}</span></button></div>} />{view === 'owned' ? <><div className="club-toolbar"><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player..." /></div><Filter size={14} className="text-slate-500" /><div className="pill-row">{(['All', 'Icon', 'Star', 'Gold', 'Silver', 'Bronze'] as (Tier | 'All')[]).map((tier) => <button key={tier} className={`filter-pill ${tierFilter === tier ? 'active' : ''}`} onClick={() => setTierFilter(tier)}>{tier}<span>{tier === 'All' ? owned.length : owned.filter((card) => card.tier === tier).length}</span></button>)}</div><div className="pill-row">{(['All', ...roles] as (Role | 'All')[]).map((role) => <button key={role} className={`filter-pill ${roleFilter === role ? 'active' : ''}`} onClick={() => setRoleFilter(role)}>{role === 'Lurker' ? 'Support' : role}</button>)}</div></div>{filtered.length ? <div className="club-grid">{filtered.map((card) => <div className="club-item" key={card.instanceId}><FutCard card={card} isNew={newCardIds.includes(card.instanceId)} onClick={() => addToSquad(card)} /><div className="club-actions"><button onClick={() => addToSquad(card)} className={Object.values(squad).includes(card.instanceId) ? 'active' : ''}>{Object.values(squad).includes(card.instanceId) ? <BadgeCheck size={14} /> : <Shield size={14} />} {Object.values(squad).includes(card.instanceId) ? 'In Squad' : `Use as ${card.role}`}</button>{copies(card) > 1 && cardLevel(card.level) < CARD_MAX_LEVEL && <button onClick={() => onUpgrade(card)} className="upgrade-button"><TrendingUp size={13} /> Upgrade (Lvl +1)<b>×{copies(card)}</b></button>}<button onClick={() => setSellTarget(card)} className="sell-button"><Coins size={13} /> Quick Sell +{tierConfig[card.tier].sell.toLocaleString()}</button></div></div>)}</div> : <div className="empty-club"><Box size={32} /><h3>No cards found</h3><p>Try another filter or open a pack to grow your club.</p></div>}</> : view === 'teams' ? <TeamsPanel owned={owned} badge={badge} claimedClubs={claimedClubs} onClaim={onClaimClub} onEquip={onEquipBadge} /> : <Catalog ownedIds={ownedIds} newCardIds={newCardIds} />}{sellTarget && <div className="league-overlay" onClick={() => setSellTarget(null)}><div className="confirm-modal" onClick={(event) => event.stopPropagation()}><div className="eyebrow orange">QUICK SELL</div><h3>Quick Sell {sellTarget.name}?</h3><p>{sellTarget.tier} · {sellTarget.role} · OVR {sellTarget.ovr}. This card leaves your club permanently.</p><strong className="confirm-value">+{tierConfig[sellTarget.tier].sell.toLocaleString()} Coins</strong><div className="confirm-actions"><button className="league-ghost" onClick={() => setSellTarget(null)}>Cancel</button><button className="primary-button" onClick={() => { onSell(sellTarget); setSellTarget(null); }}><Coins size={14} /> Quick Sell</button></div></div></div>}</>;
}

function Catalog({ ownedIds, newCardIds }: { ownedIds: Set<string>; newCardIds: string[] }) {
  const catalogTiers: Tier[] = ['Icon', 'Star', 'Gold', 'Silver', 'Bronze'];
  const [shownCount, setShownCount] = useState(24);
  const total = database.length;
  const loadMore = (): void => setShownCount((current) => Math.min(total, current + 24));
  const hasMore = shownCount < total;
  const resetKey = `${ownedIds.size}|${newCardIds.join(',')}`;
  useEffect(() => { setShownCount(24); }, [resetKey]);
  let budget = shownCount;
  return <div className="catalog-view"><div className="catalog-note"><Gem size={15} /> Owned cards are shown in full color. Locked cards reveal their tier and player details once collected.</div><div className="catalog-progress"><span>SHOWING {Math.min(shownCount, total).toLocaleString()} / {total.toLocaleString()} PLAYERS</span><div><i style={{ width: `${(Math.min(shownCount, total) / total) * 100}%` }} /></div></div>{catalogTiers.map((tier) => { const tierPool = database.filter((card) => card.tier === tier); const tierSlice = tierPool.slice(0, Math.max(0, budget)); budget -= tierPool.length; if (!tierSlice.length) return null; return <section className="catalog-section" key={tier}><div className="catalog-heading"><div><div className="eyebrow" style={{ color: tierConfig[tier].color }}>{tier === 'Icon' ? 'ICON / MVP' : tier.toUpperCase()}</div><h3>{tier === 'Icon' ? 'Major legends' : tierConfig[tier].subtitle}</h3></div><span>{database.filter((card) => card.tier === tier && ownedIds.has(card.id)).length} / {tierPool.length} collected</span></div><div className="catalog-grid">{tierSlice.map((card) => { const owned = ownedIds.has(card.id); const fresh = newCardIds.some((id) => owned && id.endsWith(`-${card.id}`)); return <div className="catalog-item" key={card.id}><FutCard card={card} locked={!owned} isNew={fresh} /><div className={`catalog-status ${owned ? 'owned' : ''}`}>{owned ? <><BadgeCheck size={12} /> Collected</> : <><LockKeyhole size={12} /> Not packed</>}</div></div>; })}</div></section>; })}
  {hasMore ? <button className="catalog-show-more" onClick={loadMore}><Plus size={14} /> Show More <span>+24</span></button> : <div className="catalog-show-more catalog-show-more-empty"><Check size={14} /> All cards loaded</div>}
  </div>;
}

function TeamsPanel({ owned, badge, claimedClubs, onClaim, onEquip }: { owned: OwnedCard[]; badge?: string; claimedClubs: string[]; onClaim: (team: string) => void; onEquip: (team?: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'progress' | 'complete' | 'claimed'>('all');
  const ownedIds = new Set(owned.map((card) => card.id));
  const rows = CLUB_GROUPS.map((club) => ({
    name: club.name,
    players: club.players,
    have: club.players.filter((player) => ownedIds.has(player.id)).length,
    claimed: claimedClubs.includes(club.name),
  }));
  const completed = rows.filter((row) => row.have === CLUB_COMPLETION_TARGET).length;
  const claimedCount = rows.filter((row) => row.claimed).length;
  const term = query.trim().toLowerCase();
  const shown = rows.filter((row) => {
    if (term && !row.name.toLowerCase().includes(term)) return false;
    if (filter === 'progress') return row.have > 0 && row.have < CLUB_COMPLETION_TARGET;
    if (filter === 'complete') return row.have === CLUB_COMPLETION_TARGET;
    if (filter === 'claimed') return row.claimed;
    return true;
  });
  return <div className="teams-view">
    <div className="teams-summary">
      <div className="teams-stat"><span>CLUBS COMPLETED</span><strong>{completed}<small>/{rows.length}</small></strong></div>
      <div className="teams-stat"><span>REWARDS CLAIMED</span><strong>{claimedCount}<small>/{rows.length}</small></strong></div>
      <div className="teams-reward-note"><Gift size={18} /><div><strong>5/5 roster completion</strong><p>Own all five real players of a club to claim <b>+{CLUB_COMPLETION_REWARD.toLocaleString()} Coins</b> and that club&apos;s badge as your team emblem.</p></div></div>
      {badge && <div className="teams-equipped"><span className="club-badge large">{clubMonogram(badge)}</span><div><span>EQUIPPED BADGE</span><strong>{badge}</strong></div><button onClick={() => onEquip(undefined)}>Remove</button></div>}
    </div>
    <div className="club-toolbar">
      <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search club..." /></div>
      <div className="pill-row">
        {([['all', 'All clubs'], ['progress', 'In progress'], ['complete', 'Completed'], ['claimed', 'Claimed']] as Array<['all' | 'progress' | 'complete' | 'claimed', string]>).map(([id, label]) => <button key={id} className={`filter-pill ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}<span>{id === 'all' ? rows.length : id === 'progress' ? rows.filter((row) => row.have > 0 && row.have < CLUB_COMPLETION_TARGET).length : id === 'complete' ? completed : claimedCount}</span></button>)}
      </div>
    </div>
    {shown.length ? <div className="teams-grid">{shown.map((row) => (
      <div key={row.name} className={`team-card ${row.have === CLUB_COMPLETION_TARGET ? 'complete' : ''} ${row.claimed ? 'claimed' : ''} ${badge === row.name ? 'equipped' : ''}`}>
        <div className="team-card-head">
          <span className="team-emblem">{clubMonogram(row.name)}</span>
          <div className="team-card-title"><strong>{row.name}</strong><small>{row.have}/{CLUB_COMPLETION_TARGET} collected</small></div>
          {row.claimed && <BadgeCheck size={16} className="team-check" />}
        </div>
        <div className="team-progress"><i style={{ width: `${(row.have / CLUB_COMPLETION_TARGET) * 100}%` }} /></div>
        <ul className="team-roster">{row.players.map((player) => { const have = ownedIds.has(player.id); return (
          <li key={player.id} className={have ? 'owned' : ''}><span>{player.name}</span><small>{player.role === 'Lurker' ? 'Support' : player.role} · {player.ovr}</small>{have ? <BadgeCheck size={12} /> : <Lock size={12} />}
        </li>); })}</ul>
        {row.have === CLUB_COMPLETION_TARGET ? (row.claimed
          ? <button className={`team-claim ${badge === row.name ? 'equipped' : ''}`} onClick={() => onEquip(badge === row.name ? undefined : row.name)}>{badge === row.name ? <><BadgeCheck size={13} /> Badge equipped · remove</> : <><Shield size={13} /> Equip club badge</>}</button>
          : <button className="team-claim ready" onClick={() => { playSound('click'); onClaim(row.name); }}><Gift size={13} /> Claim +{CLUB_COMPLETION_REWARD.toLocaleString()} & badge</button>)
          : <div className="team-claim locked"><Lock size={12} /> {CLUB_COMPLETION_TARGET - row.have} player{CLUB_COMPLETION_TARGET - row.have === 1 ? '' : 's'} missing</div>}
      </div>
    ))}</div> : <div className="empty-club"><Box size={32} /><h3>No clubs match</h3><p>Try another search or filter to find your next five-man roster.</p></div>}
  </div>;
}

const BOT_MARKET_CLUBS = CLUB_GROUPS.slice(0, 48).map((club) => club.name);
const createBotListing = (): MarketListing => {
  const card = database[Math.floor(Math.random() * database.length)];
  const base = tierConfig[card.tier].sell;
  return {
    id: `bot-listing-${randomId()}-${randomId()}`,
    sellerId: `bot:${randomId()}`,
    sellerClub: BOT_MARKET_CLUBS[Math.floor(Math.random() * BOT_MARKET_CLUBS.length)] ?? 'AI Manager FC',
    cardId: card.id,
    card: { ...card, level: 1, xp: 0 },
    price: Math.max(75, Math.round(base * (2.2 + Math.random() * 2.8))),
    status: 'open',
    buyerId: null,
    claimed: false,
    createdAt: Date.now() - Math.floor(Math.random() * 36_000_000),
  };
};

function MarketPage({ userId, coins, owned, squad, onList, onBuy, onCancel, onClaim }: { userId: string | null; coins: number; owned: OwnedCard[]; squad: Record<Role, string>; onList: (card: OwnedCard, price: number) => Promise<boolean>; onBuy: (listing: MarketListing) => Promise<boolean>; onCancel: (listing: MarketListing) => Promise<boolean>; onClaim: (listing: MarketListing) => Promise<boolean> }) {
  const [tab, setTab] = useState<'browse' | 'sell' | 'mine'>('browse');
  const [shop, setShop] = useState<MarketListing[]>([]);
  const [mine, setMine] = useState<MarketListing[]>([]);
  const [bots, setBots] = useState<MarketListing[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'AWPer' | 'IGL' | 'Entry' | 'Rifler' | 'Support'>('All');
  const [rarityFilter, setRarityFilter] = useState<Tier | 'All'>('All');
  const [priceSort, setPriceSort] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [sellTarget, setSellTarget] = useState<OwnedCard | null>(null);
  const [price, setPrice] = useState('750');
  const [buying, setBuying] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const inSquad = new Set(Object.values(squad).filter(Boolean));
  const reload = useCallback(async () => {
    if (!userId) { setShop([]); setMine([]); return; }
    setBusy(true);
    const [open, own] = await Promise.all([fetchOpenListings(), fetchMyListings(userId)]);
    setShop(open.filter((listing) => listing.sellerId !== userId));
    setMine(own);
    setBusy(false);
  }, [userId]);
  useEffect(() => { void reload(); }, [reload, tab]);
  useEffect(() => {
    const target = Math.max(0, 10 - shop.length);
    setBots((current) => {
      if (current.length === target) return current;
      if (current.length > target) return current.slice(0, target);
      return [...current, ...Array.from({ length: target - current.length }, createBotListing)];
    });
  }, [userId, shop.length, bots.length]);
  const term = query.trim().toLowerCase();
  const listed = [...shop, ...bots].filter((listing) => {
    const card = listing.card as { name?: string; team?: string; role?: string; tier?: string };
    if (term && !`${card.name ?? ''} ${card.team ?? ''} ${listing.sellerClub}`.toLowerCase().includes(term)) return false;
    if (roleFilter !== 'All') {
      const wanted = roleFilter === 'Support' ? 'Lurker' : roleFilter;
      if (String(card.role ?? 'Rifler') !== wanted) return false;
    }
    if (rarityFilter !== 'All' && String(card.tier ?? 'Gold') !== rarityFilter) return false;
    return true;
  }).sort((a, b) => priceSort === 'price-low' ? a.price - b.price : priceSort === 'price-high' ? b.price - a.price : b.createdAt - a.createdAt);
  const claimable = mine.filter((listing) => listing.status === 'sold' && !listing.claimed);
  const submitListing = async (): Promise<void> => {
    if (!sellTarget) return;
    const value = Math.max(1, Math.min(999999, Math.floor(Number(price) || 0)));
    const ok = await onList(sellTarget, value);
    if (ok) { setSellTarget(null); setPrice('750'); setTab('mine'); void reload(); }
  };
  const runBuy = async (listing: MarketListing): Promise<void> => {
    if (buying) return;
    setBuying(listing.id);
    try {
      const ok = await onBuy(listing);
      if (ok) {
        if (listing.sellerId.startsWith('bot:')) setBots((current) => current.filter((item) => item.id !== listing.id));
        void reload();
      }
    } finally {
      setBuying(null);
    }
  };
  const runCancel = async (listing: MarketListing): Promise<void> => { const ok = await onCancel(listing); setNote(ok ? 'Listing cancelled and card returned.' : 'Could not cancel this listing.'); if (ok) void reload(); };
  const runClaim = async (listing: MarketListing): Promise<void> => { const ok = await onClaim(listing); setNote(ok ? 'Payout added to your coins.' : 'Payout already claimed.'); if (ok) void reload(); };
  return <><PageTitle eyebrow="TRANSFERS" title="Market" subtitle="List surplus cards for your own price and buy from real managers. AI bot managers keep at least 10 listings live. Seller payouts are taxed 5%." action={<div className="club-tabs"><button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Browse <span>{shop.length + bots.length}</span></button><button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>Sell a card <span>{owned.length}</span></button><button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My listings <span>{mine.length}</span></button></div>} />
    {!userId && <div className="market-offline market-offline-banner"><Globe size={21} /><div><h3>AI market preview</h3><p>Bot managers are keeping 10 listings live. Connect Supabase to sell your own cards and trade with real managers.</p></div></div>}
    {tab === 'browse' ? <>
      <div className="market-toolbar">
        <div className="market-toolbar-top">
          <div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, club or seller..." /></div>
          <button className="league-ghost" onClick={() => void reload()} disabled={busy}>{busy ? 'Refreshing...' : 'Refresh'}</button>
        </div>
        <div className="market-filter-row">
          <div className="market-filter-group"><span>ROLE</span><div className="pill-row">{(['All', 'AWPer', 'IGL', 'Entry', 'Rifler', 'Support'] as const).map((role) => <button key={role} className={`filter-pill ${roleFilter === role ? 'active' : ''}`} onClick={() => setRoleFilter(role)}>{role}</button>)}</div></div>
          <div className="market-filter-group"><span>RARITY</span><div className="pill-row">{(['All', 'Bronze', 'Silver', 'Gold', 'Star', 'Icon'] as const).map((tier) => <button key={tier} className={`filter-pill ${rarityFilter === tier ? 'active' : ''}`} onClick={() => setRarityFilter(tier)}>{tier}</button>)}</div></div>
          <div className="market-filter-group"><span>PRICE</span><div className="pill-row"><button className={`filter-pill ${priceSort === 'newest' ? 'active' : ''}`} onClick={() => setPriceSort('newest')}>Newest</button><button className={`filter-pill ${priceSort === 'price-low' ? 'active' : ''}`} onClick={() => setPriceSort('price-low')}>Price ↑</button><button className={`filter-pill ${priceSort === 'price-high' ? 'active' : ''}`} onClick={() => setPriceSort('price-high')}>Price ↓</button></div></div>
          <small className="market-result-count">{listed.length} listings · {bots.length} AI managed</small>
        </div>
      </div>
      {listed.length ? <div className="market-grid">{listed.map((listing) => {
        const card = listing.card as { name?: string; team?: string; tier?: string; role?: string; ovr?: number; level?: number };
        const name = typeof card.name === 'string' ? card.name : 'Unknown player';
        const ovr = Math.min(99, Math.round(Number(card.ovr) || 0));
        const affordable = coins >= listing.price;
        const botListing = listing.sellerId.startsWith('bot:');
        return <div className="market-card" key={listing.id}>
          <div className="market-card-top"><span className="team-emblem">{clubMonogram(typeof card.team === 'string' ? card.team : listing.sellerClub)}</span><div><strong>{name}</strong><small>{String(card.tier ?? 'Gold')} · {card.role === 'Lurker' ? 'Support' : String(card.role ?? 'Rifler')} · OVR {ovr}{Number(card.level) > 1 ? ` · Lvl ${Number(card.level)}` : ''}</small></div></div>
          <div className="market-seller"><span>SELLER</span><strong>{listing.sellerClub}{botListing && <em className="market-ai-badge">AI BOT</em>}</strong></div>
          <div className="market-price"><Coins size={15} /><strong>{listing.price.toLocaleString()}</strong><span>coins</span></div>
          <button className="primary-button" disabled={!affordable || buying === listing.id} onClick={() => void runBuy(listing)}>{buying === listing.id ? 'Buying...' : affordable ? 'Buy now' : 'Not enough coins'}</button>
        </div>;
      })}</div> : <div className="empty-club"><Tag size={32} /><h3>{busy ? 'Loading listings...' : 'No cards on the market'}</h3><p>{query || roleFilter !== 'All' || rarityFilter !== 'All' ? 'No listing matches those filters.' : 'Be the first: list a surplus card from the Sell tab.'}</p></div>}
    </> : tab === 'sell' ? <>
      {sellTarget ? <div className="market-sell-panel">
        <div className="market-card-top"><span className="team-emblem">{clubMonogram(sellTarget.team)}</span><div><strong>{sellTarget.name}</strong><small>{sellTarget.tier} · {sellTarget.role} · OVR {sellTarget.ovr}{sellTarget.level > 1 ? ` · Lvl ${sellTarget.level}` : ''}</small></div></div>
        <label className="market-price-input"><span>Your price (coins)</span><input type="number" min={1} max={999999} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
        <div className="market-payout"><span>You receive</span><strong>{marketPayout(Math.max(0, Math.floor(Number(price) || 0))).toLocaleString()} coins</strong><small>{Math.round(MARKET_TAX * 100)}% market tax · {Math.max(0, Math.floor(Number(price) || 0)).toLocaleString()} − {Math.max(0, Math.floor(Number(price) || 0) - marketPayout(Math.max(0, Math.floor(Number(price) || 0)))).toLocaleString()}</small></div>
        <div className="confirm-actions"><button className="league-ghost" onClick={() => setSellTarget(null)}>Back</button><button className="primary-button" onClick={() => void submitListing()} disabled={!Number(price)}><Tag size={14} /> List on market</button></div>
      </div> : owned.length ? <div className="market-grid">{owned.map((card) => {
        const starting = inSquad.has(card.instanceId);
        return <div className={`market-card ${starting ? 'in-squad' : ''}`} key={card.instanceId}>
          <div className="market-card-top"><span className="team-emblem">{clubMonogram(card.team)}</span><div><strong>{card.name}</strong><small>{card.tier} · {card.role} · OVR {card.ovr}{card.level > 1 ? ` · Lvl ${card.level}` : ''}</small></div></div>
          <div className="market-seller"><span>QUICK SELL VALUE</span><strong>{tierConfig[card.tier].sell.toLocaleString()}</strong></div>
          <button className="primary-button" disabled={starting} onClick={() => { setSellTarget(card); setPrice(String(Math.max(50, tierConfig[card.tier].sell * 3))); }}>{starting ? 'In your squad' : 'Choose price'}</button>
        </div>;
      })}</div> : <div className="empty-club"><Box size={32} /><h3>No cards to sell</h3><p>Open a pack or complete a league day to find surplus players.</p></div>}
    </> : <>
      {note && <div className="market-note">{note}</div>}
      {claimable.length > 0 && <div className="market-claims">{claimable.map((listing) => { const card = listing.card as { name?: string }; return <div className="market-claim-row" key={listing.id}><div><strong>Sale · {typeof card.name === 'string' ? card.name : 'Card'}</strong><small>Sold for {listing.price.toLocaleString()} coins</small></div><button className="primary-button" onClick={() => void runClaim(listing)}><Coins size={13} /> Claim {marketPayout(listing.price).toLocaleString()}</button></div>; })}</div>}
      {mine.length ? <div className="market-list">{mine.map((listing) => {
        const card = listing.card as { name?: string; team?: string; tier?: string; ovr?: number };
        return <div className="market-list-row" key={listing.id}>
          <div className="market-card-top"><span className="team-emblem">{clubMonogram(String(card.team ?? ''))}</span><div><strong>{typeof card.name === 'string' ? card.name : 'Card'}</strong><small>{String(card.tier ?? 'Gold')} · OVR {Number(card.ovr) || 0}</small></div></div>
          <span className={`market-status ${listing.status}`}>{listing.status === 'sold' ? (listing.claimed ? 'Paid out' : 'Sold · payout ready') : 'Live'}</span>
          <strong className="market-list-price">{listing.price.toLocaleString()}</strong>
          {listing.status === 'open' ? <button className="league-ghost" onClick={() => void runCancel(listing)}>Cancel & return card</button> : listing.claimed ? <span className="market-muted">Settled</span> : <button className="primary-button" onClick={() => void runClaim(listing)}>Claim {marketPayout(listing.price).toLocaleString()}</button>}
        </div>;
      })}</div> : <div className="empty-club"><Tag size={32} /><h3>{busy ? 'Loading your listings...' : 'No listings yet'}</h3><p>Cards you put up for sale appear here with their status and payout.</p></div>}
    </>}
  </>;
}

function PreMatchTactics({ tactic, onChange }: { tactic: Tactic; onChange: (tactic: Tactic) => void }) {
  const active = TACTICS.find((item) => item.id === tactic) ?? TACTICS[1];
  return <div className="prematch-tactics">
    <div className="prematch-tactics-head"><span className="eyebrow orange">PRE-MATCH TACTICS</span><strong>{tactic}</strong><small>{active.note}</small></div>
    <div className="tactic-options">{TACTICS.map((item) => <button key={item.id} className={`tactic-option ${item.id === tactic ? 'active' : ''}`} onClick={() => onChange(item.id)}><span className="tactic-radio" /><b>{item.id}</b><small>{item.note}</small></button>)}</div>
  </div>;
}

function LeagueStandingsMini({ teams, divisionName, zone, teamName, emblem, accent }: { teams: LeagueTeam[]; divisionName: string; zone: string; teamName: string; emblem?: EmblemId; accent?: string }) {
  return <div className="standings-card">
    <div className="standings-head"><div><div className="eyebrow orange">LEAGUE STANDINGS · 16 TEAMS</div><h3>{divisionName} · {zone}</h3></div><span>Rank · Team · W/L · Round Diff · Points</span></div>
    <div className="league-table standings-table"><div className="league-table-head"><span>#</span><span>TEAM</span><span>W/L</span><span>RD</span><span>PTS</span></div>
      {teams.map((team, index) => <div key={team.id} className={`league-row ${team.id === 'user' ? 'is-user' : 'is-bot'}`}>
        <span className="league-rank">{index + 1}</span>
        <span className="league-club">{team.id === 'user' ? <><TeamEmblem emblem={emblem} accent={accent} size={16} /><b>{clubLabel(teamName)}</b><i>YOU</i></> : <b>{team.name}</b>}</span>
        <span>{team.wins}/{team.losses}</span>
        <span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span>
        <strong>{team.points}</strong>
      </div>)}
    </div>
  </div>;
}

function ArenaPage({ userId, teamRating, chemistry, perks, league, setLeague, onWin, onMvpBonus, squad, quests, onClaimQuest, scrimWins, onScrimmage, onCareerMatch, ecosystem, teamName, emblem, accent, liveSlotRef }: { teamRating: number; chemistry: number; perks: Perk[]; teamName: string; emblem?: EmblemId; accent?: string; league: LeagueState; setLeague: (next: LeagueState) => void; onWin: (reward: number, xp: number, message?: string) => void; onMvpBonus: (amount: number) => void; squad: Duelist[]; quests: QuestState; onClaimQuest: (id: QuestId) => void; scrimWins: number; onScrimmage: (won: boolean) => void; onCareerMatch: (won: boolean, map: RadarMapId) => void; ecosystem: EcoTeam[]; userId: string | null; liveSlotRef: { current: number | null } }) {
  const [mode, setMode] = useState<'quick' | 'league'>('league');
  const [opponentId, setOpponentId] = useState('tier2');
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ us: 0, them: 0 });
  const [feed, setFeed] = useState<FeedLine[]>([{ text: 'R1 [Freeze] Both teams are ready. Choose your pace.' }]);
  const [alive, setAlive] = useState({ us: 5, them: 5 });
  const [result, setResult] = useState<'win' | 'loss' | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [leagueLive, setLeagueLive] = useState(false);
  const [scrimLive, setScrimLive] = useState(false);
  const [scrimOpponent, setScrimOpponent] = useState<{ id: string; name: string; ovr: number; reward: number; color: string } | null>(null);
  const [dayResult, setDayResult] = useState<LeagueDayResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
    const [showRoadmap, setShowRoadmap] = useState(false);
  const [showTopClubs, setShowTopClubs] = useState(false);
  const [browseDivision, setBrowseDivision] = useState<number | null>(null);
  const [scoutTeam, setScoutTeam] = useState<EcoTeam | null>(null);
  const [managerTeam, setManagerTeam] = useState<LeagueTeam | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeTerm, setChallengeTerm] = useState('');
  const [challengeResults, setChallengeResults] = useState<ChallengeManager[] | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeSeries, setChallengeSeries] = useState<{ opponent: ChallengeManager; rounds: Array<{ round: number; usWon: boolean; usAlive: number; themAlive: number; mvp: string }>; us: number; them: number } | null>(null);
  const [scoreboard, setScoreboard] = useState<MatchScoreboard | null>(null);
  const [tactic, setTactic] = useState<Tactic>('Slow Default');
  const [radarMap, setRadarMap] = useState<RadarMapId>(() => pickRadarMap());
  const [highlight, setHighlight] = useState<MatchHighlight>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const zoneIndex = league.zone ?? 0;
  const zoneCount = league.zoneCount ?? 1;
  const promoteCount = promotionSlots(league.division, zoneCount);
  const humanCount = league.teams.filter((team) => teamKind(team) !== 'bot').length;
  const slotStartRef = useRef<number | null>(null);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => () => { if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current); }, []);

  const economy = economyForRound(round);
  const quickOpponents = [{ id: 'tier2', name: 'Tier 2 Mix', ovr: 72, reward: 500, color: 'bronze', ecoName: 'MIBR' }, { id: 'g2faze', name: 'G2 / FaZe', ovr: 82, reward: 1000, color: 'gold', ecoName: 'G2 Esports' }, { id: 'vitality', name: 'Vitality / Spirit', ovr: 88, reward: 2000, color: 'star', ecoName: 'Team Vitality' }];
  const division = divisions[league.division];
  const pairs = leagueSlotPairs(league);
  const leagueOpponentId = pairs.find((pair) => pair.includes('user'))?.find((id) => id !== 'user');
  const leagueOpponentTeam = league.teams.find((team) => team.id === leagueOpponentId);
  const quickOpponent = quickOpponents.find((item) => item.id === opponentId) ?? quickOpponents[0];
  const leagueOpponent = leagueOpponentTeam ? { id: leagueOpponentTeam.id, name: leagueOpponentTeam.name, ovr: leagueOpponentTeam.ovr, reward: LEAGUE_WIN_COINS, color: 'gold' } : quickOpponent;
  const opponent = leagueLive ? leagueOpponent : scrimLive && scrimOpponent ? scrimOpponent : quickOpponent;
  const sortedTeams = sortLeague(league.teams);
  const ourRank = Math.max(1, sortedTeams.findIndex((team) => team.id === 'user') + 1);
  const atTopDivision = league.division >= divisions.length - 1;
  const opponentTeam = leagueLive ? leagueOpponentTeam : scrimLive && scrimOpponent ? league.teams.find((team) => team.id === scrimOpponent.id) : undefined;
  const opponentEco = opponentTeam
    ? ecoTeamById(ecosystem, ecoIdOf(opponentTeam))
    : ecosystem.find((team) => team.name === quickOpponent.ecoName) ?? ecoTeamsInDivision(ecosystem, 0)[0];
  const opponentSquad = opponentTeam?.squad ?? [];
  const opponentRoster: RadarDuelist[] = opponentEco
    ? teamRoster(opponentEco).map((player) => ({ name: player.name, role: player.role, ovr: player.ovr, aim: player.aim, rfl: player.rfl, sns: player.sns, clt: player.clt }))
    : opponentSquad.slice(0, 5).map((card) => ({ name: card.name, role: card.role, ovr: card.ovr, aim: Math.min(99, card.ovr + 2), rfl: Math.min(99, card.ovr), sns: Math.min(99, card.ovr + 1), clt: Math.max(50, card.ovr - 1) }));
  const slot = league.slot ?? 0;
  const liveHour = liveSlotHour(now);
  const liveWindowStart = liveHour === null ? null : slotStartOfDay(dayStartOf(now), liveHour);
  const liveReady = liveWindowStart !== null && (league.lastSlotAt ?? 0) < liveWindowStart;
  const nextStart = liveReady && liveWindowStart !== null ? liveWindowStart : liveHour !== null && liveWindowStart !== null ? liveWindowStart + 3600000 : nextSlotAt(now);
  const nextHour = new Date(nextStart).getHours();
  const countdown = clockCountdown(nextStart - now);

  const showHighlight = useCallback((next: NonNullable<MatchHighlight>): void => {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    setHighlight(next);
    highlightTimerRef.current = window.setTimeout(() => { setHighlight(null); highlightTimerRef.current = null; }, 2800);
  }, []);

  const beginMatch = (kind: 'quick' | 'league' | 'scrim'): void => {
    setLeagueLive(kind === 'league');
    setScrimLive(kind === 'scrim');
    if (kind === 'scrim') {
      const pool = league.teams.filter((team) => team.id !== 'user');
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? league.teams[0];
      setScrimOpponent({ id: pick.id, name: pick.name, ovr: pick.ovr, reward: SCRIM_WIN_COINS, color: 'bronze' });
    }
    if (highlightTimerRef.current) { window.clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    setHighlight(null);
    setRadarMap(pickRadarMap());
    settledRef.current = false;
    setSpeed(1); setLive(true); setPaused(false); setResult(null); setResultNote(''); setScoreboard(null); setRound(1);
    setScore({ us: 0, them: 0 }); setAlive({ us: 5, them: 5 });
    const opening = economyForRound(1);
    setFeed([{ text: kind === 'league' ? `R1 [${opening.ours}] ${tactic} · ${opening.ours} vs ${opening.theirs} · LIVE league broadcast.` : `R1 [${opening.ours}] ${tactic} · Pistol round begins. Both teams purchase.` }]);
  };

  useEffect(() => {
    if (live || result) return;
    if (!liveReady || liveWindowStart === null) return;
    if (slotStartRef.current === liveWindowStart) return;
    slotStartRef.current = liveWindowStart;
    // Claim the slot for the player: the App clock will not simulate it while
    // this live match is on screen.
    liveSlotRef.current = liveWindowStart;
    setMode('league');
    beginMatch('league');
  }, [live, result, liveReady, liveWindowStart]);

  // Releasing the arena (navigation, sign-out, reload) must not strand the slot.
  useEffect(() => () => { liveSlotRef.current = null; }, [liveSlotRef]);

  const finish = (won: boolean, finalScore: { us: number; them: number }): void => {
    if (settledRef.current) return;
    settledRef.current = true;
    setLive(false); setResult(won ? 'win' : 'loss');
    onCareerMatch(won, radarMap);
    const board = buildScoreboard(squad, { name: opponent.name, ovr: opponent.ovr }, finalScore);
    setScoreboard(board);
    if (board.mvp.team === 'us') onMvpBonus(board.bonus);
    if (leagueLive) {
      const start = slotStartRef.current;
      const settled = start === null ? null : settleLiveLeagueSlot(league, start, teamRating, won, finalScore);
      liveSlotRef.current = null;
      if (settled && settled.league !== league) {
        setLeague(settled.league);
        onWin(settled.coins, 40, `${won ? 'League win' : 'League loss'}: +${settled.coins.toLocaleString()} coins · +40 XP`);
        if (settled.dayResult) setDayResult(settled.dayResult);
        const movementNote = settled.dayResult?.promoted
          ? ` · PROMOTED to ${divisions[settled.league.division].name}!`
          : settled.dayResult?.relegated ? ` · Relegated to ${divisions[settled.league.division].name}` : '';
        setResultNote(`${won ? 'League win' : 'League loss'} · +${settled.coins.toLocaleString()} coins · table updated${movementNote}`);
      } else {
        setResultNote(`${won ? 'League win' : 'League loss'} · this slot was already settled by the league clock`);
      }
      return;
    }
    if (scrimLive) {
      onScrimmage(won);
      setResultNote(won
        ? scrimWins >= SCRIM_WIN_CAP ? `Friendly win · daily paid-win cap reached (${SCRIM_WIN_CAP}/${SCRIM_WIN_CAP}) — no coins this time` : `Friendly win · +${SCRIM_WIN_COINS} coins · ${scrimWins + 1}/${SCRIM_WIN_CAP} paid wins today`
        : 'Friendly match lost · the daily quest still counted');
      return;
    }
    if (won) onWin(opponent.reward, 100 + opponent.reward / 10);
  };

  const playRound = useCallback((): void => {
    if (!live || paused || result) return;
    const roundEconomy = economyForRound(round);
    const antiEco = tactic === 'Defensive / Anti-Eco' && roundEconomy.theirs === 'Eco' ? 2 : 0;
    const ourBuy = economyPower(roundEconomy.ours) + antiEco;
    const theirBuy = economyPower(roundEconomy.theirs);
    const roundSquad = ourBuy === 0 ? squad : squad.map((player) => ({ ...player, ovr: withEconomy(player.ovr, ourBuy), aim: withEconomy(player.aim, ourBuy), rfl: withEconomy(player.rfl, ourBuy), sns: withEconomy(player.sns, ourBuy), clt: withEconomy(player.clt, ourBuy) }));
    const sim = simulateRound({ squad: roundSquad, teamRating: teamRating > 0 ? withEconomy(teamRating, ourBuy) : teamRating, chemistry, perks, opponentName: opponent.name, opponentOvr: withEconomy(opponent.ovr, theirBuy), round });
    const nextScore = { us: score.us + (sim.usWon ? 1 : 0), them: score.them + (sim.usWon ? 0 : 1) };
    const ecoUpset = (roundEconomy.ours === 'Eco' && roundEconomy.theirs === 'Full Buy' && sim.usWon)
      || (roundEconomy.theirs === 'Eco' && roundEconomy.ours === 'Full Buy' && !sim.usWon);
    if (ecoUpset) {
      showHighlight({
        kind: 'thrifty',
        title: 'THRIFTY!',
        note: roundEconomy.ours === 'Eco' ? `Eco buy upsets ${opponent.name}'s full buy.` : `${opponent.name} steals the round on an eco.`,
      });
    }
    const clutchLine = sim.lines.find((line) => line.tag === 'CLUTCH');
    const clutchMatch = clutchLine ? /1v(\d+)/.exec(clutchLine.text) : null;
    if (clutchMatch && Number(clutchMatch[1]) >= 2) {
      showHighlight({ kind: 'clutch', title: `1v${clutchMatch[1]} CLUTCH!`, note: `${sim.mvp} takes the impossible round.` });
    }
    const summary: FeedLine = { tag: 'ROUND', text: `R${round} [${roundEconomy.ours}] ${sim.usWon ? 'ROUND WON' : 'ROUND LOST'} · survivors ${sim.usAlive}—${sim.themAlive} · ${nextScore.us}:${nextScore.them} · MVP ${sim.mvp}` };
    setAlive({ us: sim.usAlive, them: sim.themAlive });
    setFeed((current) => [summary, ...[...sim.lines].reverse(), ...current].slice(0, 14));
    setScore(nextScore); setRound((current) => current + 1);
    if (nextScore.us >= 13 || nextScore.them >= 13) finish(nextScore.us >= 13, nextScore);
  }, [live, paused, result, perks, squad, teamRating, chemistry, opponent.name, opponent.ovr, round, score, leagueLive, scrimLive, scrimWins, league, tactic, showHighlight, radarMap, onCareerMatch]);
  useEffect(() => { if (!live || paused || result) return; const timer = window.setInterval(playRound, speed === 2 && !leagueLive ? 750 : 1500); return () => window.clearInterval(timer); }, [live, paused, result, speed, leagueLive, playRound]);

  const findChallengers = (term: string): void => {
    if (!userId) { setChallengeResults([]); return; }
    setChallengeBusy(true);
    void challengeService.search(term, userId).then((results) => { setChallengeResults(results); setChallengeBusy(false); });
  };
  const openChallenge = (): void => {
    setChallengeOpen(true); setChallengeSeries(null); setChallengeTerm(''); setChallengeResults(null); findChallengers('');
  };
  const startChallenge = (opponent: ChallengeManager): void => {
    const rounds: Array<{ round: number; usWon: boolean; usAlive: number; themAlive: number; mvp: string }> = [];
    let us = 0; let them = 0;
    for (let index = 1; index <= 3 && us < 2 && them < 2; index += 1) {
      const sim = simulateRound({ squad, teamRating, chemistry, perks, opponentName: opponent.clubName, opponentOvr: opponent.ovr, round: index });
      rounds.push({ round: index, usWon: sim.usWon, usAlive: sim.usAlive, themAlive: sim.themAlive, mvp: sim.mvp });
      if (sim.usWon) us += 1; else them += 1;
    }
    setChallengeSeries({ opponent, rounds, us, them });
    onScrimmage(us > them);
    onCareerMatch(us > them, radarMap);
    if (us > them) playSound('win');
  };
  const closeChallenge = (): void => { setChallengeOpen(false); setChallengeSeries(null); setChallengeResults(null); setChallengeTerm(''); };
  const challengeModal = challengeOpen ? <div className="league-overlay" onClick={closeChallenge}><div className="challenge-modal" onClick={(event) => event.stopPropagation()}>
    {challengeSeries ? <>
      <div className="eyebrow orange">FRIEND CHALLENGE · BEST OF 3</div>
      <h2>{challengeSeries.us > challengeSeries.them ? 'You won the series.' : 'Your friend took the series.'}</h2>
      <div className="challenge-scoreline"><div className="challenge-side"><span className="team-emblem">{clubMonogram(teamName)}</span><strong>{clubLabel(teamName)}</strong><small>OVR {teamRating || '--'}</small></div><b className="challenge-series-score">{challengeSeries.us} <i>:</i> {challengeSeries.them}</b><div className="challenge-side"><span className="team-emblem">{clubMonogram(challengeSeries.opponent.clubName)}</span><strong>{challengeSeries.opponent.clubName}</strong><small>{challengeSeries.opponent.managerName} · OVR {challengeSeries.opponent.ovr}</small></div></div>
      <div className="challenge-rounds">{challengeSeries.rounds.map((item) => <div key={item.round} className={`challenge-round ${item.usWon ? 'won' : 'lost'}`}><span>MAP {item.round}</span><strong>{item.usWon ? 'ROUND WON' : 'ROUND LOST'}</strong><small>survivors {item.usAlive}—{item.themAlive} · MVP {item.mvp}</small></div>)}</div>
      {challengeSeries.opponent.roster.length > 0 && <div className="challenge-opponent-roster"><span>THEIR ACTIVE FIVE</span><div>{challengeSeries.opponent.roster.map((spot) => <span key={`${spot.name}-${spot.role}`}><b>{spot.name}</b><small>{spot.role === 'Lurker' ? 'Support' : spot.role} · {spot.ovr}</small></span>)}</div></div>}
      <div className="confirm-actions"><button className="league-ghost" onClick={() => { setChallengeSeries(null); findChallengers(challengeTerm); }}>Challenge another club</button><button className="primary-button" onClick={closeChallenge}>Close</button></div>
    </> : <>
      <div className="eyebrow orange">FRIEND CHALLENGE · INSTANT BO3</div>
      <h2>Find a real club to face.</h2>
      <p className="challenge-sub">Search any manager&apos;s Club Name. Their active five plays you immediately in a Best-of-3 radar series — friendly rules, daily paid-win cap applies.</p>
      {!userId ? <div className="challenge-offline"><Globe size={20} /><span>Connect Supabase and sign in to challenge real managers. League, packs and AI scrimmages are unaffected.</span></div> : <>
        <form className="challenge-search" onSubmit={(event) => { event.preventDefault(); findChallengers(challengeTerm); }}><Search size={15} /><input autoFocus value={challengeTerm} onChange={(event) => setChallengeTerm(event.target.value)} placeholder="Search club name..." /><button type="submit" className="primary-button">{challengeBusy ? 'Searching...' : 'Search'}</button></form>
        <div className="challenge-results">{challengeResults === null ? <div className="challenge-empty">{challengeBusy ? 'Looking up clubs...' : 'Type a club name or press Search for the top clubs.'}</div> : challengeResults.length ? challengeResults.map((manager) => <div className="challenge-row" key={manager.userId}>
          <span className="team-emblem">{clubMonogram(manager.clubName)}</span>
          <div className="challenge-row-copy"><strong>{manager.clubName}</strong><small>{manager.managerName} · Div {manager.division + 1} · OVR {manager.ovr} · {manager.roster.length}/5 fielded</small>{manager.roster.length > 0 && <em>{manager.roster.map((spot) => `${spot.name} (${spot.ovr})`).join(' · ')}</em>}</div>
          <button className="primary-button" onClick={() => startChallenge(manager)}><Swords size={14} /> Challenge</button>
        </div>) : <div className="challenge-empty">No club matched &ldquo;{challengeTerm || 'any'}&rdquo;. Try part of the name.</div>}</div>
      </>}
      <div className="confirm-actions"><button className="league-ghost" onClick={closeChallenge}>Close</button></div>
    </>}
  </div></div> : null;
  const questPanel = <DailyQuestsPanel quests={quests} onClaim={onClaimQuest} />;
  const scoreboardModal = scoreboard ? <PostMatchScoreboard board={scoreboard} teamName={teamName} emblem={emblem} accent={accent} opponentName={scoreboard.opponentName} onClose={() => setScoreboard(null)} /> : null;

  const recapModal = dayResult ? <MatchRecapModal info={{ matches: [], coins: dayResult.coins, day: dayResult }} onClose={() => setDayResult(null)} /> : null;
  const roadmap = showRoadmap ? <LeagueRoadmap current={league.division} onClose={() => setShowRoadmap(false)} onOpen={(division) => { setShowRoadmap(false); setBrowseDivision(division); }} /> : null;
  if (live || result) return <><ArenaLive teamName={teamName} emblem={emblem} accent={accent} lineup={squad} opponentRoster={opponentRoster} economy={economy} tactic={tactic} radarMap={radarMap} highlight={highlight} broadcast={leagueLive} resultNote={resultNote} opponent={opponent} score={score} round={round} feed={feed} alive={alive} paused={paused} speed={speed} setSpeed={setSpeed} onPause={() => setPaused((current) => !current)} onRound={playRound} onSkip={() => finish(true, score.us >= score.them || score.them >= 13 ? score : { us: Math.max(score.us, 13), them: score.them })} result={result} onExit={() => { setLive(false); setResult(null); setScoreboard(null); setLeagueLive(false); setScrimLive(false); liveSlotRef.current = null; slotStartRef.current = null; }} />{scoreboardModal}{recapModal}</>;
  return <><PageTitle eyebrow="COMPETITIVE PLAY" title="Play Arena" subtitle="League matches run automatically every hour at :30 — play friendlies and daily quests while you wait." /><div className="arena-mode-bar"><div className="club-tabs arena-mode-toggle"><button className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>Quick Match</button><button className={mode === 'league' ? 'active' : ''} onClick={() => setMode('league')}>League Season <span>16 Teams</span></button></div><span className="arena-mode-note">{mode === 'quick' ? 'Pick any opponent and play a single match.' : `DIV ${league.division + 1} • ${zoneLabel(zoneIndex).toUpperCase()} · ${division.name} · ${zoneCount > 1 ? `${zoneCount} ZONES · ` : ''}Season ${league.season}`}</span></div>
    <PreMatchTactics tactic={tactic} onChange={setTactic} />
    {mode === 'quick' && <LeagueStandingsMini teams={sortedTeams} divisionName={division.name} zone={zoneLabel(zoneIndex)} teamName={teamName} emblem={emblem} accent={accent} />}
    {questPanel}
    {mode === 'quick' ? <div className="arena-lobby"><div className="arena-lobby-art"><div className="arena-radar"><div className="radar-ring one" /><div className="radar-ring two" /><div className="radar-cross" /><div className="arena-dot one" /><div className="arena-dot two" /><div className="arena-dot three" /></div><div className="arena-lobby-emblem"><Swords size={34} /></div></div><div className="arena-lobby-copy"><div className="eyebrow orange">ARENA MATCHMAKING</div><h2>Choose your opponent.</h2><p>Your active five, chemistry, and manager perks influence every round. Win the BO1 to collect the listed coin reward.</p><div className="arena-stat-line"><span><small>TEAM OVR</small><strong>{teamRating || '--'}</strong></span><span><small>CHEMISTRY</small><strong>{chemistry}</strong></span><span><small>XP ON WIN</small><strong>+{100 + quickOpponent.reward / 10}</strong></span></div><div className="opponent-list">{quickOpponents.map((item) => <button key={item.id} className={`opponent-option ${opponentId === item.id ? 'selected' : ''}`} onClick={() => setOpponentId(item.id)}><span className={`opponent-tier ${item.color}`}>{item.ovr}</span><span><strong>{item.name}</strong><small>{item.ovr} OVR AI opponent</small></span><b><Coins size={13} /> +{item.reward.toLocaleString()}</b></button>)}</div><button className="primary-button arena-start" onClick={() => beginMatch('quick')}><Play size={16} fill="currentColor" /> START MATCH</button><button className="league-ghost arena-scrim" onClick={() => beginMatch('scrim')}><Swords size={15} /> Play Scrimmage (Friendly) <span>{scrimWins}/{SCRIM_WIN_CAP} paid wins</span></button><button className="league-ghost arena-scrim" onClick={openChallenge}><Users size={15} /> Challenge Friend <span>Real club · Bo3</span></button></div></div>
    : <div className="league-shell"><div className="league-hero"><div className="league-rank-badge"><Crown size={20} /><strong>{league.division + 1}</strong><span>DIVISION</span></div><div className="league-hero-copy"><div className="eyebrow orange">DIVISION {league.division + 1} OF 15 · {zoneLabel(zoneIndex).toUpperCase()} · {seasonLabel(league.season).toUpperCase()} · ENDS IN {seasonCountdown(Date.now()).toUpperCase()}</div><div className="zone-badges"><span className="zone-badge">DIV {league.division + 1} • {zoneLabel(zoneIndex).toUpperCase()}</span>{zoneCount > 1 && <span className="zone-badge soft">{zoneCount} ZONES</span>}<span className="zone-badge soft">{humanCount} REAL MANAGERS · {ZONE_SIZE - humanCount} BOTS</span></div><h2>{division.name}</h2><p>16-team room · 24 hourly matches per day · Opponent OVR {division.ovrMin}–{division.ovrMax}{league.division === divisions.length - 1 ? ' · Top 16 World Elite' : ''}</p><div className="league-zone-legend"><span className="promotion">Promote 1–{promoteCount} after all {SLOTS_PER_DAY} matches</span>{league.division > 0 && <span className="relegation">Relegate 14–16 when the table closes</span>}<span><Coins size={12} /> +{LEAGUE_WIN_COINS} win / +{LEAGUE_LOSS_COINS} loss</span></div></div><div className="league-progress"><span>TODAY</span><strong>{Math.min(slot, SLOTS_PER_DAY)} / {SLOTS_PER_DAY}</strong><div className="league-progress-bar"><i style={{ width: `${Math.round((Math.min(slot, SLOTS_PER_DAY) / SLOTS_PER_DAY) * 100)}%` }} /></div><small>{leagueOpponentTeam ? `Next: ${leagueOpponentTeam.name} · ${leagueOpponentTeam.ovr} OVR` : 'Next opponent loading'}</small></div></div>
      <div className="match-clock-card"><div className="match-clock-copy"><div className="eyebrow orange">{liveReady ? 'LIVE BROADCAST WINDOW' : 'HOURLY LEAGUE SCHEDULE'}</div><strong>{liveReady ? 'League match is LIVE now — 2D tactical broadcast, 1x speed only.' : `Next League Match starts at ${slotClockLabel(nextHour)} (in ${countdown})`}</strong><small>{liveReady ? 'Stay on this page to watch the tactical map in real time.' : 'Matches simulate automatically at every :30 — even while you are offline.'}</small></div><div className="match-clock-right"><span className={`clock-big ${liveReady ? 'is-live' : ''}`}>{liveReady ? 'LIVE' : countdown}</span><small>{liveReady ? `Window closes ${String(liveHour ?? 0).padStart(2, '0')}:35` : `Kick-off ${slotClockLabel(nextHour)}`}</small></div></div>
      <div className="league-actions"><button className="primary-button" onClick={() => beginMatch('scrim')}><Swords size={16} /> Play Scrimmage (Friendly)</button><button className="league-ghost" onClick={openChallenge}><Users size={15} /> Challenge Friend</button><button className="league-ghost" onClick={() => setShowRoadmap(true)}><LayoutGrid size={15} /> View League Roadmap</button><button className="league-ghost" onClick={() => setShowTopClubs(true)}><Globe size={15} /> Global Top Clubs</button><span className="league-prize"><Trophy size={13} /> Friendly wins +{SCRIM_WIN_COINS} · {scrimWins}/{SCRIM_WIN_CAP} paid wins today</span></div><div className={`league-season-progress ${ourRank <= promoteCount ? 'in-zone' : ''}`}><div className="season-progress-main"><span className="eyebrow orange">SEASON PROGRESS</span><strong>Matches Played: {Math.min(slot, SLOTS_PER_DAY)} / {SLOTS_PER_DAY}</strong><small>{atTopDivision ? (ourRank <= promoteCount ? `In the promotion zone · finish Top ${promoteCount} when all ${SLOTS_PER_DAY} matches are played to defend the top division.` : `${SLOTS_PER_DAY - slot} matches left · climb into the Top ${promoteCount} before match ${SLOTS_PER_DAY} to defend your seat.`) : ourRank <= promoteCount ? `In the promotion zone · finish Top ${promoteCount} when all ${SLOTS_PER_DAY} matches are played to move up to ${divisions[league.division + 1].name}.` : `${SLOTS_PER_DAY - slot} matches left · you must climb into the Top ${promoteCount} before match ${SLOTS_PER_DAY} to be promoted.`}</small></div><div className="season-progress-metrics"><div><small>PROMOTION ZONE</small><strong>TOP {promoteCount}</strong></div><div><small>YOUR POSITION</small><strong>#{ourRank}</strong></div><div><small>DIVISION PRIZE</small><strong><Coins size={12} /> {division.reward.toLocaleString()}</strong></div></div><div className="league-progress-bar season"><i style={{ width: `${Math.round((Math.min(slot, SLOTS_PER_DAY) / SLOTS_PER_DAY) * 100)}%` }} /></div></div><div className="standings-head"><div><div className="eyebrow orange">LEAGUE STANDINGS · 16 TEAMS</div><h3>{division.name} · {zoneLabel(zoneIndex)}</h3></div><span>Rank · Team · W/L · Round Diff · Points</span></div><div className="league-table standings-table"><div className="league-table-head"><span>#</span><span>TEAM</span><span>W/L</span><span>RD</span><span>PTS</span></div>{sortedTeams.map((team, index) => { const rank = index + 1; const tierZone = rank <= promoteCount ? 'promotion' : league.division > 0 && rank >= 14 ? 'relegation' : ''; const isHuman = teamKind(team) !== 'bot'; const avatar = isHuman ? avatarDetails[(team.avatar ?? 'ghost') as Avatar] ?? avatarDetails.ghost : null; return <div key={team.id} className={`league-row ${tierZone} ${team.id === 'user' ? 'is-user' : ''} ${isHuman ? 'is-human' : 'is-bot'}`}><span className="league-rank">{rank}</span><span className="league-club">{team.id === 'user' ? <><TeamEmblem emblem={emblem} accent={accent} size={16} /><b>{clubLabel(teamName)}</b></> : <button className="team-link" onClick={() => isHuman ? setManagerTeam(team) : setScoutTeam(ecoTeamById(ecosystem, ecoIdOf(team)) ?? null)}>{team.name}</button>}<em className={`seat-badge ${isHuman ? 'player' : 'bot'}`}>{isHuman ? 'PLAYER' : 'BOT'}</em>{team.id === 'user' && <i>YOU</i>}<small className="seat-meta">{isHuman ? <><span className="seat-avatar" style={{ color: avatar?.color }}>{avatar?.icon}</span>{team.manager ?? 'MANAGER'} · OVR {team.ovr}</> : `AI PRO TEAM · OVR ${team.ovr || teamRating}`}</small></span><span>{team.wins}/{team.losses}</span><span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span><strong>{team.points}</strong></div>; })}</div></div>}
    {roadmap}
    {challengeModal}
    {showTopClubs && <GlobalClubsBoard onClose={() => setShowTopClubs(false)} />}
    {browseDivision !== null && <DivisionBrowser teamName={teamName} division={browseDivision} ecosystem={ecosystem} liveTeams={browseDivision === league.division ? sortedTeams : null} onDivision={setBrowseDivision} onTeam={setScoutTeam} onClose={() => setBrowseDivision(null)} />}
    {scoutTeam && <TeamRosterModal team={scoutTeam} onClose={() => setScoutTeam(null)} />}
    {managerTeam && <ManagerRosterModal team={managerTeam} division={league.division} zone={zoneLabel(zoneIndex)} onClose={() => setManagerTeam(null)} />}
    {recapModal}
  </>;
}


function PostMatchScoreboard({ board, teamName, emblem, accent, opponentName, onClose }: { board: MatchScoreboard; teamName: string; emblem?: EmblemId; accent?: string; opponentName: string; onClose: () => void }) {
  const rowsFor = (side: 'us' | 'them') => board.rows.filter((row) => row.team === side);
  const mvpOnOurTeam = board.mvp.team === 'us';
  return <div className="league-overlay postmatch-overlay" onClick={onClose}>
    <div className="postmatch-modal" onClick={(event) => event.stopPropagation()}>
      <button className="overlay-close" onClick={onClose} aria-label="Close scoreboard"><X size={18} /></button>
      <div className="postmatch-head">
        <div><div className="eyebrow orange">POST-MATCH REPORT · {board.rounds} ROUNDS</div><h2>{board.score.us > board.score.them ? 'Victory' : 'Defeat'} · {board.score.us}–{board.score.them}</h2></div>
        <span className={`postmatch-bonus ${mvpOnOurTeam ? 'paid' : ''}`}>{mvpOnOurTeam ? '+50 MVP BONUS' : 'MATCH COMPLETE'}</span>
      </div>
      <div className="postmatch-teams">
        <div className="postmatch-team"><TeamEmblem emblem={emblem} accent={accent} size={26} /><div><strong>{clubLabel(teamName)}</strong><small>ACTIVE FIVE</small></div><b>{board.score.us}</b></div>
        <span className="postmatch-vs">VS</span>
        <div className="postmatch-team opponent"><b>{board.score.them}</b><div><strong>{opponentName}</strong><small>OPPONENT</small></div><span className="team-emblem">{clubMonogram(opponentName)}</span></div>
      </div>
      {(['us', 'them'] as const).map((side) => <div className="postmatch-block" key={side}>
        <div className="postmatch-block-head"><span>PLAYER</span><span>K</span><span>D</span><span>ADR</span><span>RATING</span></div>
        {rowsFor(side).map((row) => <div key={`${row.team}-${row.name}`} className={`scoreboard-row ${row.mvp ? 'is-mvp' : ''}`}>
          <span className="scoreboard-player">{row.mvp && <i className="mvp-badge">★ MATCH MVP</i>}<b>{row.name}</b><small>{roleLabel(row.role)}</small></span>
          <span>{row.kills}</span><span>{row.deaths}</span><span>{row.adr}</span><strong>{row.rating.toFixed(2)}</strong>
        </div>)}
      </div>)}
      <div className="postmatch-foot">{mvpOnOurTeam ? <>★ <b>{board.mvp.name}</b> is your Match MVP — +50 coins added.</> : <>★ <b>{board.mvp.name}</b> took Match MVP for {opponentName}.</>}</div>
      <button className="primary-button postmatch-continue" onClick={onClose}>Continue</button>
    </div>
  </div>;
}

function RankEmblem({ shape }: { shape: RoadmapShape }) {
  return <span className={`rank-emblem shape-${shape}`}>
    <svg viewBox="0 0 44 44" aria-hidden="true">
      {shape !== 'chevron' && <>
        <path className="emblem-wing emblem-wing-left" d="M20 16 5 9l4.5 10L3 23l12 2.5z" />
        <path className="emblem-wing emblem-wing-right" d="M24 16 39 9l-4.5 10L41 23l-12 2.5z" />
      </>}
      <path className="emblem-shield" d="M22 4.5l12.5 4.6v9.4c0 7.6-4.8 12.8-12.5 16.2C14.3 31.3 9.5 26.1 9.5 18.5V9.1z" />
      <path className="emblem-inner" d="M22 8.2l8.7 3.2v7.1c0 5.5-3.3 9.4-8.7 12.2-5.4-2.8-8.7-6.7-8.7-12.2v-7.1z" />
      {shape === 'chevron' && <path className="emblem-chevron" d="M14 18.5l8-5.3 8 5.3v2.6l-8-5.3-8 5.3zM14 24l8-5.3 8 5.3v2.6l-8-5.3-8 5.3z" />}
      {shape === 'crown' && <path className="emblem-crown" d="M12.5 17.5l3.8-6.4 5.7 4.3 5.7-4.3 3.8 6.4z" />}
      {shape !== 'chevron' && shape !== 'crown' && <path className="emblem-star" d="M22 11.6l1.85 3.75 4.15.6-3 2.95.7 4.15L22 21.1l-3.7 1.95.7-4.15-3-2.95 4.15-.6z" />}
    </svg>
  </span>;
}

function LeagueRoadmap({ current, onClose, onOpen }: { current: number; onClose: () => void; onOpen: (division: number) => void }) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const currentRowRef = useRef<HTMLButtonElement | null>(null);
  const active = Math.max(0, Math.min(divisions.length - 1, current));
  const activeDivision = divisions[active];
  const activePalette = roadmapPalettes[active];
  const summitPalette = roadmapPalettes[divisions.length - 1];
  const rows = divisions.map((item, index) => ({ ...item, index, palette: roadmapPalettes[index] })).reverse();
  const climbPercent = Math.round(((active + 1) / divisions.length) * 100);

  useEffect(() => {
    const modal = modalRef.current;
    const row = currentRowRef.current;
    if (!modal || !row) return;
    const timer = window.setTimeout(() => {
      const modalBox = modal.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const target = modal.scrollTop + rowBox.top - modalBox.top - modal.clientHeight / 2 + rowBox.height / 2;
      modal.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [active]);

  return <div className="league-overlay" onClick={onClose}>
    <div className="roadmap-modal" ref={modalRef} onClick={(event) => event.stopPropagation()}>
      <button className="overlay-close" onClick={onClose} aria-label="Close league roadmap"><X size={18} /></button>
      <div className="roadmap-ambient" aria-hidden="true" />
      <header className="roadmap-head">
        <div className="roadmap-head-copy">
          <div className="eyebrow orange">LEAGUE ROADMAP · COMPETITIVE LADDER</div>
          <h2>15 divisions. One summit.</h2>
          <p>Finish 1–3 to promote, 14–16 to relegate. Every rank is scouting-ready — click any division to inspect its 16 clubs, including tiers you have not reached yet.</p>
        </div>
        <div className="roadmap-summit" style={rankVars(summitPalette)}>
          <span className="roadmap-summit-icon"><Crown size={19} /></span>
          <span><small>THE SUMMIT</small><strong>{divisions[divisions.length - 1].name}</strong></span>
        </div>
      </header>

      <div className="roadmap-climb" style={rankVars(activePalette)}>
        <div className="roadmap-climb-copy"><span>YOUR CLIMB</span><strong>{activeDivision.name}</strong><b>DIV {active + 1} / {divisions.length}</b></div>
        <div className="roadmap-climb-track"><i style={{ width: `${climbPercent}%` }} /><em style={{ left: `${climbPercent}%` }} /></div>
      </div>

      <div className="roadmap-list">
        {rows.map((item, rowIndex) => {
          const isCurrent = item.index === active;
          const isCleared = item.index < active;
          return <button
            key={item.name}
            type="button"
            ref={isCurrent ? currentRowRef : undefined}
            className={`roadmap-row ${isCurrent ? 'current' : ''} ${isCleared ? 'cleared' : ''} ${rowIndex === 0 ? 'is-first' : ''} ${rowIndex === rows.length - 1 ? 'is-last' : ''}`}
            style={rankVars(item.palette)}
            onClick={() => onOpen(item.index)}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${item.name}${isCurrent ? ', current division' : ''}`}
          >
            <span className="roadmap-step">
              <span className="roadmap-connector" aria-hidden="true" />
              <RankEmblem shape={item.palette.shape} />
            </span>
            <span className="roadmap-copy">
              <span className="roadmap-title-row"><strong>{item.name}</strong>{isCurrent && <i className="roadmap-current">CURRENT</i>}{isCleared && <i className="roadmap-cleared"><Check size={8} /> CLEARED</i>}</span>
              <small>OVR {item.ovrMin}–{item.ovrMax} · {item.index === divisions.length - 1 ? 'THE SUMMIT' : 'PROMOTE 1–3'}</small>
            </span>
            <span className="roadmap-reward"><span><Coins size={12} />{item.reward.toLocaleString()}</span><small>SEASON PRIZE</small></span>
            <ChevronRight size={14} className="roadmap-open" />
          </button>;
        })}
      </div>

      <footer className="roadmap-foot">
        <span><i className="roadmap-foot-dot promotion" />1–3 PROMOTE</span>
        <span><i className="roadmap-foot-dot relegation" />14–16 RELEGATE</span>
        <span className="roadmap-foot-hint">CLICK A DIVISION TO SCOUT <ChevronRight size={11} /></span>
      </footer>
    </div>
  </div>;
}

function GlobalClubsBoard({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<TopClubRow[] | null>(null);
  useEffect(() => {
    let active = true;
    void leagueService.fetchTopClubs().then((result) => { if (active) setRows(result); });
    return () => { active = false; };
  }, []);
  return <div className="league-overlay division-overlay" onClick={onClose}><div className="division-modal" onClick={(event) => event.stopPropagation()}>
    <button className="overlay-close" onClick={onClose}><X size={18} /></button>
    <div className="division-modal-head">
      <div className="division-modal-copy"><div className="eyebrow orange">GLOBAL LEADERBOARD · {rows?.length ?? 0} CLUBS</div><h2>Global Top Clubs</h2><p>Ranked by division, then points, then team rating (OVR).</p></div>
    </div>
    <div className="league-table division-table">
      <div className="league-table-head"><span>#</span><span>CLUB</span><span>DIV</span><span>W</span><span>L</span><span>RD</span><span>PTS</span></div>
      {rows?.map((club) => { const emblem = club.emblem as EmblemId; return <div key={club.userId} className="league-row">
        <span className="league-rank">{club.rank}</span>
        <span className="league-club"><TeamEmblem emblem={emblem} size={16} /><b>{clubLabel(club.clubName)}</b><small>{club.managerName} · OVR {club.teamOvr}</small></span>
        <span>{club.division + 1}</span><span>{club.wins}</span><span>{club.losses}</span><span>{club.roundDiff > 0 ? `+${club.roundDiff}` : club.roundDiff}</span><strong>{club.points}</strong>
      </div>; })}
      {rows && !rows.length && <div className="division-empty">No clubs on the global leaderboard yet.</div>}
      {!rows && <div className="division-empty">Loading the global leaderboard…</div>}
    </div>
  </div></div>;
}

function DivisionBrowser({ division, ecosystem, liveTeams, onDivision, onTeam, onClose, teamName }: { division: number; ecosystem: EcoTeam[]; teamName?: string; liveTeams: LeagueTeam[] | null; onDivision: (division: number) => void; onTeam: (team: EcoTeam) => void; onClose: () => void }) {
  const info = divisions[division];
  const ecoTable = ecoTeamsInDivision(ecosystem, division);
  const clubs = liveTeams ?? ecoTable;
  return <div className="league-overlay division-overlay" onClick={onClose}><div className="division-modal" onClick={(event) => event.stopPropagation()}>
    <button className="overlay-close" onClick={onClose}><X size={18} /></button>
    <div className="division-modal-head">
      <div className="division-modal-copy"><div className="eyebrow orange">DIVISION {division + 1} OF 15 · {clubs.length} CLUBS</div><h2>{info.name}</h2><p>OVR {info.ovrMin}–{info.ovrMax} · Season prize <Coins size={12} /> {info.reward.toLocaleString()} · Click any club to open its scouting report.</p></div>
      <div className="division-switch"><button onClick={() => onDivision(Math.max(0, division - 1))} disabled={division === 0} aria-label="Lower division">−</button><span><b>{division + 1}</b><small>/ 15</small></span><button onClick={() => onDivision(Math.min(divisions.length - 1, division + 1))} disabled={division === divisions.length - 1} aria-label="Higher division">+</button></div>
    </div>
    <div className="league-table division-table">
      <div className="league-table-head"><span>#</span><span>CLUB</span><span>P</span><span>W</span><span>L</span><span>RD</span><span>PTS</span></div>
      {liveTeams ? liveTeams.map((team, index) => { const rank = index + 1; const zone = rank <= 3 ? 'promotion' : division > 0 && rank >= 14 ? 'relegation' : ''; const eco = ecoTeamById(ecosystem, ecoIdOf(team)); return <div key={team.id} className={`league-row ${zone} ${team.id === 'user' ? 'is-user' : ''}`}>
        <span className="league-rank">{rank}</span>
        <span className="league-club">{eco ? <button className="team-link" onClick={() => onTeam(eco)}>{team.id === 'user' ? clubLabel(teamName) : team.name}</button> : <b>{team.id === 'user' ? clubLabel(teamName) : team.name}</b>}<em className={`seat-badge ${teamKind(team) === 'bot' ? 'bot' : 'player'}`}>{teamKind(team) === 'bot' ? 'BOT' : 'PLAYER'}</em>{team.id === 'user' && <i>YOU</i>}<small>{team.manager ? `${team.manager} · ` : ''}OVR {team.ovr}</small></span>
        <span>{team.played}</span><span>{team.wins}</span><span>{team.losses}</span><span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span><strong>{team.points}</strong>
      </div>; }) : ecoTable.map((team, index) => { const rank = index + 1; const zone = rank <= 3 ? 'promotion' : division > 0 && rank >= 14 ? 'relegation' : ''; return <div key={team.id} className={`league-row ${zone}`}>
        <span className="league-rank">{rank}</span>
        <span className="league-club"><button className="team-link" onClick={() => onTeam(team)}>{team.name}</button><small>OVR {team.ovr} · FORM {team.form.length ? team.form.join('-') : '—'}</small></span>
        <span>{team.played}</span><span>{team.wins}</span><span>{team.losses}</span><span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span><strong>{team.points}</strong>
      </div>; })}
      {!clubs.length && <div className="division-empty">No clubs registered in this division yet.</div>}
    </div>
    <div className="division-note"><span className="promotion">1–3 promote at 00:00</span>{division > 0 && <span className="relegation">14–16 relegate at 00:00</span>}<span>All 15 divisions move every midnight</span></div>
  </div></div>;
}

function ManagerRosterModal({ team, division, zone, onClose }: { team: LeagueTeam; division: number; zone: string; onClose: () => void }) {
  const squad = team.squad ?? [];
  const avatar = avatarDetails[(team.avatar ?? 'ghost') as Avatar] ?? avatarDetails.ghost;
  const info = divisions[Math.max(0, Math.min(divisions.length - 1, division))];
  const managerPerks = [team.perk, team.perk2].filter((perk): perk is string => Boolean(perk));
  return <div className="league-overlay roster-overlay" onClick={onClose}><div className="roster-modal manager-modal" onClick={(event) => event.stopPropagation()}>
    <button className="overlay-close" onClick={onClose}><X size={18} /></button>
    <div className="roster-head">
      <div className="manager-portrait" style={{ backgroundColor: avatar.color }}>{avatar.icon}</div>
      <div className="roster-head-copy"><div className="eyebrow orange">REAL MANAGER · DIV {division + 1} • {zone.toUpperCase()}</div><h2>{team.name}</h2><p>Manager <strong>{team.manager ?? 'MANAGER'}</strong> · {info.name} · Team OVR {team.ovr} · {team.points} pts · {team.wins}W–{team.losses}L</p>
        <div className="manager-perks">{managerPerks.length ? managerPerks.map((perk) => <span key={perk} className="perk-chip"><Target size={12} /> {perk}{perk in perkDetails ? ` · ${perkDetails[perk as Perk]}` : ''}</span>) : <span className="perk-chip">No manager perks</span>}</div>
      </div>
    </div>
    <div className="roster-grid">{squad.length ? squad.map((card) => { const power = Math.min(99, card.ovr + (card.level >= 5 ? 5 : Math.max(0, card.level - 1))); const tier = tierFromOvr(power); const config = tierConfig[tier]; return <div key={`${card.name}-${card.role}`} className="roster-card" style={{ '--tier-color': config.color, '--tier-soft': config.soft } as React.CSSProperties}>
      <span className="card-level-badge">LV {card.level}</span>
      <div className="roster-avatar" style={{ color: config.color }}>{card.name.slice(0, 2).toUpperCase()}</div>
      <strong>{card.name}</strong><small>{card.role}{card.team ? ` · ${card.team}` : ''}</small>
      <div className="roster-stats"><span><small>OVR</small><b>{power}</b></span><span><small>BASE</small><b>{card.ovr}</b></span><span><small>LEVEL</small><b>{card.level}</b></span></div>
    </div>; }) : <div className="division-empty">This manager has not locked a 5-card squad yet.</div>}</div>
    <div className="division-note"><span className="promotion">Promote 1–{promotionSlots(division, 1)} after {SLOTS_PER_DAY} matches</span><span className="relegation">Relegate 14–16 when the table closes</span><span>Team OVR = average of the 5 active cards</span></div>
  </div></div>;
}

function TeamRosterModal({ team, onClose }: { team: EcoTeam; onClose: () => void }) {
  const roster = teamRoster(team);
  const average = teamAvgOvr(team);
  const divisionInfo = divisions[team.division];
  return <div className="league-overlay roster-overlay" onClick={onClose}><div className="roster-modal" onClick={(event) => event.stopPropagation()}>
    <button className="overlay-close" onClick={onClose}><X size={18} /></button>
    <div className="roster-head">
      <div className="roster-badge" style={{ '--tier-color': tierConfig[teamTier(average)].color } as React.CSSProperties}><span>DIV {team.division + 1}</span><strong>{average}</strong><small>TEAM OVR</small></div>
      <div className="roster-head-copy"><div className="eyebrow orange">TEAM ROSTER &amp; SCOUTING</div><h2>{team.name}</h2><p>{divisionInfo.name} · Division {team.division + 1} of 15 · {team.wins}W–{team.losses}L · {team.roundDiff >= 0 ? '+' : ''}{team.roundDiff} round diff</p>
        <div className="roster-form"><span>RECENT FORM</span>{(team.form.length ? team.form : ['W']).map((entry, index) => <b key={`${entry}-${index}`} className={entry === 'W' ? 'win' : 'loss'}>{entry}</b>)}</div>
      </div>
    </div>
    <div className="roster-grid">{roster.map((player) => { const tier = teamTier(player.ovr); const config = tierConfig[tier]; return <div key={player.name} className="roster-card" style={{ '--tier-color': config.color, '--tier-soft': config.soft } as React.CSSProperties}>
      <div className="roster-card-top"><span className="roster-tier">{tier}</span><span className="roster-role">{player.role}</span></div>
      <strong className="roster-nick">{player.name}</strong>
      <div className="roster-ovr"><b>{player.ovr}</b><small>OVR</small></div>
      <div className="roster-stats"><span>AIM<b>{player.aim}</b></span><span>RFL<b>{player.rfl}</b></span><span>SNS<b>{player.sns}</b></span><span>CLT<b>{player.clt}</b></span></div>
    </div>; })}</div>
    <div className="roster-foot"><span><Shield size={13} /> {team.played} matches played this season</span><span>Ranks 1–3 promote · 14–16 relegate after {SLOTS_PER_DAY} matches</span></div>
  </div></div>;
}

function MatchRecapModal({ info, onClose }: { info: { matches: LeagueMatchLog[]; coins: number; day: LeagueDayResult | null }; onClose: () => void }) {
  const wins = info.matches.filter((match) => match.won).length;
  const losses = info.matches.length - wins;
  const day = info.day;
  const nextDivision = day ? (day.promoted ? day.division + 2 : day.relegated ? day.division : day.division + 1) : 0;
  return <div className="league-overlay"><div className="recap-modal">
    <div className={`recap-emblem ${day?.promoted ? 'up' : day?.relegated ? 'down' : ''}`}>{day?.promoted ? <Sparkles size={26} /> : day?.relegated ? <RotateCcw size={26} /> : <Trophy size={26} />}</div>
    <div className="eyebrow orange">MATCH RECAP{day ? ` · ${day.dayKey}` : ''}</div>
    <h2>{info.matches.length ? `${wins}W — ${losses}L while you were away` : 'Daily league report'}</h2>
    <p>Missed hourly :30 league matches were simulated automatically and the 16-team table is up to date.</p>
    <div className="recap-stats"><span><small>MATCHES</small><strong>{info.matches.length}</strong></span><span><small>WIN / LOSS</small><strong>{wins} / {losses}</strong></span><span><small>COINS</small><strong><Coins size={13} /> +{info.coins.toLocaleString()}</strong></span></div>
    {info.matches.length > 0 && <div className="match-recap-list">{info.matches.slice(-12).map((match, index) => <div key={`${match.dayKey}-${match.slot}-${index}`} className={`recap-row ${match.won ? 'win' : 'loss'}`}><span className="recap-slot">{slotClockLabel(match.slot)}</span><b>{match.opponent}</b><span className="recap-score">{match.us} : {match.them}</span><span className="recap-coins">+{match.coins.toLocaleString()}</span></div>)}</div>}
    {day && <div className={`recap-day ${day.promoted ? 'up' : day.relegated ? 'down' : ''}`}><div><strong>Season standings finalized after all {SLOTS_PER_DAY} matches</strong><small>Division {day.division + 1} · rank #{day.rank} of 16 · {day.wins}W {day.losses}L</small></div><b>{day.promoted ? <><Sparkles size={14} /> Promoted to Division {nextDivision} · +{day.coins.toLocaleString()} coins</> : day.relegated ? <><RotateCcw size={14} /> Relegated to Division {nextDivision}</> : <><BadgeCheck size={14} /> Stayed in Division {nextDivision}</>}</b></div>}
    <button className="primary-button season-continue" onClick={onClose}>Continue <ChevronRight size={15} /></button>
  </div></div>;
}

function ArenaLive({ opponent, score, round, feed, alive, paused, speed, setSpeed, onPause, onRound, onSkip, result, onExit, broadcast, resultNote, teamName, emblem, accent, lineup, opponentRoster, economy, tactic, radarMap, highlight }: { opponent: { name: string; ovr: number; reward: number }; teamName: string; emblem?: EmblemId; accent?: string; lineup: Duelist[]; opponentRoster: RadarDuelist[]; economy: RoundEconomy; tactic: Tactic; radarMap: RadarMapId; highlight: MatchHighlight; score: { us: number; them: number }; round: number; feed: FeedLine[]; alive: { us: number; them: number }; paused: boolean; speed: number; setSpeed: (speed: number) => void; onPause: () => void; onRound: () => void; onSkip: () => void; result: 'win' | 'loss' | null; onExit: () => void; broadcast?: boolean; resultNote?: string }) {
  return <div className="arena-live-page">{highlight && <div className={`match-highlight ${highlight.kind}`}><span className="match-highlight-icon">{highlight.kind === 'thrifty' ? <Coins size={20} /> : <Flame size={20} />}</span><div><strong>{highlight.title}</strong><small>{highlight.note}</small></div></div>}<div className="arena-live-head"><div><div className="eyebrow orange">{broadcast ? <><span className="broadcast-dot" /> LIVE LEAGUE BROADCAST</> : 'LIVE ARENA'} · ROUND {Math.min(round, 24)}</div><div className="live-score"><strong className="live-club-name"><TeamEmblem emblem={emblem} accent={accent} size={20} /> {clubLabel(teamName)}</strong><b>{score.us}</b><span>:</span><b className="enemy-score">{score.them}</b><strong>{opponent.name.toUpperCase()}</strong></div></div><div className="arena-live-meta"><span><small>ALIVE</small><b>{alive.us} — {alive.them}</b></span><span><small>ECONOMY</small><b>{economy.ours} / {economy.theirs}</b></span><span><small>AI OVR</small><b>{opponent.ovr}</b></span></div></div><div className="arena-live-grid"><div><TacticalRadar mapId={radarMap} ours={lineup} theirs={opponentRoster} opponentName={opponent.name} round={round} paused={paused} speed={speed} broadcast={broadcast} economy={economy} tactic={tactic} /><div className="arena-controls"><button onClick={onPause} className="control-button">{paused ? <Play size={14} fill="currentColor" /> : <span>Ⅱ</span>} {paused ? 'Play' : 'Pause'}</button>{broadcast ? <span className="broadcast-controls"><span className="broadcast-dot" /> LIVE · 1x speed · no skip</span> : <><button onClick={() => setSpeed(speed === 2 ? 1 : 2)} className={`control-button ${speed === 2 ? 'selected' : ''}`}><Zap size={14} /> 2x Speed</button><button onClick={onRound} className="control-button">Skip Round <ChevronRight size={14} /></button><button onClick={onSkip} className="control-button accent">Skip to Result <Trophy size={14} /></button></>}</div></div><div className="arena-feed"><div className="feed-title"><span>ROUND FEED</span><i>LIVE</i></div>{feed.map((line, index) => <div className={`arena-feed-line ${index === 0 ? 'latest' : ''}`} key={`${line.text}-${index}`}><span />{line.tag && <b className={`feed-tag ${line.tag.toLowerCase()}`}>{line.tag}</b>}{line.text}</div>)}</div></div>{result && <div className="arena-result"><div className={result === 'win' ? 'result-icon win' : 'result-icon loss'}>{result === 'win' ? <Trophy size={28} /> : <Shield size={28} />}</div><div className="eyebrow">MATCH COMPLETE</div><h2>{result === 'win' ? 'VICTORY' : 'DEFEAT'}</h2><p>{resultNote || (result === 'win' ? `You beat ${opponent.name} and earned ${opponent.reward.toLocaleString()} coins.` : `${opponent.name} takes the server this time. Rebuild and try again.`)}</p><button className="primary-button" onClick={onExit}>Return to Arena <ChevronRight size={15} /></button></div>}</div>;
}

function ProfilePage({ profile, setProfile, managerXp, trophies, career }: { profile: Profile; setProfile: (profile: Profile) => void; managerXp: number; trophies: LeagueTrophy[]; career: CareerStats }) {
  const totalMatches = career.matches;
  const winRate = totalMatches > 0 ? Math.round((career.wins / totalMatches) * 100) : 0;
  const favoriteMap = Object.entries(career.mapCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '—';
  const [nickname, setNickname] = useState(profile.nickname);
  const [teamName, setTeamName] = useState(profile.teamName);
  const level = managerLevel(managerXp);
  const progress = levelProgress(managerXp);
  const secondSlot = level >= SECOND_PERK_LEVEL;
  const discount = storeDiscount(level);
  const save = (): void => setProfile({ ...profile, nickname: nickname.trim() || 'Manager', teamName: teamName.trim() });
  const perkIcon = (perk: Perk, size: number): ReactNode => perk === 'Tactical Genius' ? <Target size={size} /> : perk === 'Aim Coach' ? <Crosshair size={size} /> : perk === 'Scout Master' ? <Search size={size} /> : perk === 'Clutch Master' ? <Flame size={size} /> : perk === 'Match Prize Booster' ? <Coins size={size} /> : <Gem size={size} />;
  const perkButton = (perk: Perk, slot: 1 | 2): ReactNode => {
    const selected = slot === 1 ? profile.perk === perk : profile.perk2 === perk;
    return <button key={`${slot}-${perk}`} onClick={() => slot === 1 ? setProfile({ ...profile, perk }) : setProfile({ ...profile, perk2: selected ? undefined : perk })} className={selected ? 'selected' : ''}><span className="perk-icon">{perkIcon(perk, 17)}</span><span><strong>{perk}</strong><small>{perkDetails[perk]}</small></span>{selected && <BadgeCheck size={16} />}</button>;
  };
  return <>
    <PageTitle eyebrow="MANAGER HUB" title="Profile" subtitle="Shape the identity behind your Ultimate Team." />
    <div className="profile-layout">
      <div className="profile-card">
        <div className="profile-portrait" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div>
        <h2>{profile.nickname || 'New Manager'}</h2>
        <p className="profile-club-line"><TeamEmblem emblem={profile.emblem} accent={profile.accent} size={16} /> {clubMonogram(profile.teamName)} · {clubLabel(profile.teamName)}</p>
        <div className="profile-level">
          <span>MANAGER LEVEL</span>
          <strong>{level >= MANAGER_MAX_LEVEL ? '50 MAX' : `${level} / ${MANAGER_MAX_LEVEL}`}</strong>
          <div><i style={{ width: `${progress}%` }} /></div>
          <small>{level >= MANAGER_MAX_LEVEL ? 'MAX LEVEL · every perk tier unlocked' : `${managerXp - levelFloorXp(level)} / ${XP_STEP} XP · next level +${levelReward(level + 1).toLocaleString()} coins`}</small>
        </div>
        <div className="level-rewards">
          <div className="level-reward unlocked"><BadgeCheck size={13} /><span>LV 1</span><strong>Perk slot 1</strong></div>
          <div className={`level-reward ${secondSlot ? 'unlocked' : ''}`}>{secondSlot ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 5</span><strong>Perk slot 2</strong></div>
          <div className={`level-reward ${discount >= 0.15 ? 'unlocked' : ''}`}>{discount >= 0.15 ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 10</span><strong>−15% store</strong></div>
          <div className={`level-reward ${discount >= 0.25 ? 'unlocked' : ''}`}>{discount >= 0.25 ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 35</span><strong>−25% store</strong></div>
          <div className={`level-reward ${level >= MANAGER_MAX_LEVEL ? 'unlocked' : ''}`}>{level >= MANAGER_MAX_LEVEL ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 50</span><strong>MAX cap</strong></div>
        </div>
        <div className="trophy-cabinet">
          <div className="eyebrow">TROPHY CABINET {trophies.length > 0 && <b className="trophy-count">{trophies.length}</b>}</div>
          {trophies.length ? <div className="trophy-list">{[...trophies].reverse().map((trophy) => <div className="trophy-item" key={`${trophy.season}-${trophy.division}-${trophy.place}`}><Trophy size={16} /><span><strong>{trophy.division}</strong><small>Season {trophy.season} · #{trophy.place}</small></span></div>)}</div> : <p className="trophy-empty">Finish top 3 in a league season to lift your first trophy.</p>}
        </div>
      </div>
      <div className="profile-settings">
        <div className="career-card">
          <div className="career-card-head"><div><div className="eyebrow orange">CAREER STATISTICS</div><h3>Manager record</h3></div><Trophy size={22} /></div>
          <div className="career-grid">
            <div><small>TOTAL MATCHES PLAYED</small><strong>{totalMatches}</strong><span>played</span></div>
            <div><small>WIN RATE %</small><strong>{winRate}%</strong><span>{career.wins} wins</span></div>
            <div><small>FAVORITE MAP</small><strong>{favoriteMap}</strong><span>{career.mapCounts[favoriteMap] ?? 0} matches</span></div>
            <div><small>TOTAL TROPHIES WON</small><strong>{trophies.length}</strong><span>lifted</span></div>
          </div>
        </div>
        <div className="settings-block">
          <div className="eyebrow">MANAGER DETAILS</div>
          <div className="field-grid">
            <label><span>Manager Nickname</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={22} /></label>
            <label><span>Team Name</span><input value={teamName} onChange={(event) => setTeamName(event.target.value)} maxLength={22} /></label>
          </div>
        </div>
        <div className="settings-block">
          <div className="eyebrow">CHOOSE AVATAR</div>
          <div className="avatar-picker">
            {(Object.keys(avatarDetails) as Avatar[]).map((avatar) => <button key={avatar} onClick={() => setProfile({ ...profile, avatar })} className={profile.avatar === avatar ? 'selected' : ''} style={{ '--avatar-color': avatarDetails[avatar].color } as React.CSSProperties}><span>{avatarDetails[avatar].icon}</span><small>{avatarDetails[avatar].label}</small></button>)}
          </div>
        </div>
        <div className="settings-block">
          <div className="eyebrow">CLUB EMBLEM &amp; ACCENT</div>
          <p className="perk-hint">Your crest appears next to your club name in League Standings and on every post-match scoreboard.</p>
          <div className="emblem-picker">{EMBLEMS.map((item) => <button key={item.id} type="button" onClick={() => setProfile({ ...profile, emblem: item.id })} className={profile.emblem === item.id ? 'selected' : ''}><TeamEmblem emblem={item.id} accent={profile.accent} size={22} /><small>{item.label}</small></button>)}</div>
          <div className="accent-picker">
            {EMBLEM_ACCENTS.map((color) => <button key={color} type="button" aria-label={`Accent ${color}`} onClick={() => setProfile({ ...profile, accent: color })} className={(profile.accent || DEFAULT_ACCENT) === color ? 'selected' : ''} style={{ backgroundColor: color }} />)}
          </div>
        </div>
        <div className="settings-block">
          <div className="eyebrow">MANAGER PERKS</div>
          <p className="perk-hint">Slot 1 is always active and scales at LVL 15 / 30. Slot 2 unlocks at Level {SECOND_PERK_LEVEL} and scales at LVL 20 / 40{discount ? ` · Store discount ${storeDiscountLabel(level)} active` : ''}.</p>
          <div className="perk-slot-label">SLOT 1 · ACTIVE · TIER {perkTier(level, 1)}/3</div>
          <div className="perk-picker">{SLOT1_PERKS.map((perk) => perkButton(perk, 1))}</div>
          <div className="perk-slot-label">SLOT 2 · TIER {perkTier(level, 2)}/3 {!secondSlot && <span><Lock size={10} /> LEVEL {SECOND_PERK_LEVEL}</span>}</div>
          {secondSlot
            ? <div className="perk-picker">{SLOT2_PERKS.map((perk) => perkButton(perk, 2))}</div>
            : <div className="perk-locked"><Lock size={16} /><span><strong>Second perk slot locked</strong><small>Reach Level {SECOND_PERK_LEVEL} to run two perks at once.</small></span></div>}
        </div>
        <button onClick={save} className="primary-button profile-save"><Pencil size={14} /> Save Profile</button>
      </div>
    </div>
  </>;
}

function CreationModal({ onComplete }: { onComplete: (profile: Profile) => void }) { const [profile, setProfile] = useState<Profile>(createProfile); const complete = (): void => { const nickname = profile.nickname.trim() || 'Coach'; onComplete({ ...profile, nickname, teamName: profile.teamName.trim() || `${nickname} Esports` }); }; return <div className="creation-screen"><div className="creation-panel"><div className="creation-intro"><div className="ut-logo centered"><div className="ut-logo-icon"><Crosshair size={22} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="eyebrow orange">WELCOME TO {seasonLabel(1).toUpperCase()}</div><h1>Build your legacy.</h1><p>Assemble a squad from the biggest names in Counter-Strike and take your club to the Major.</p><div className="intro-points"><span><Sparkles size={15} /> {database.length} real player cards</span><span><Trophy size={15} /> 5 card tiers</span><span><Coins size={15} /> 2,500 starter coins</span></div></div><div className="creation-form"><div className="eyebrow">MANAGER SETUP · 01</div><h2>Who is calling the shots?</h2><label className="creation-label"><span>Manager Nickname</span><input autoFocus value={profile.nickname} onChange={(event) => setProfile({ ...profile, nickname: event.target.value })} placeholder="Enter your nickname" maxLength={22} /></label><label className="creation-label"><span>Team Name</span><input value={profile.teamName} onChange={(event) => setProfile({ ...profile, teamName: event.target.value })} placeholder="Enter your club name" maxLength={22} /></label><div className="creation-label"><span>Choose your manager avatar</span><div className="avatar-picker creation-avatars">{(Object.keys(avatarDetails) as Avatar[]).map((avatar) => <button key={avatar} onClick={() => setProfile({ ...profile, avatar })} className={profile.avatar === avatar ? 'selected' : ''} style={{ '--avatar-color': avatarDetails[avatar].color } as React.CSSProperties}><span>{avatarDetails[avatar].icon}</span><small>{avatarDetails[avatar].label}</small></button>)}</div></div><div className="creation-label"><span>Select your team perk</span><div className="perk-picker creation-perks">{SLOT1_PERKS.map((perk) => <button key={perk} onClick={() => setProfile({ ...profile, perk })} className={profile.perk === perk ? 'selected' : ''}><span className="perk-icon">{perk === 'Tactical Genius' ? <Target size={16} /> : perk === 'Aim Coach' ? <Crosshair size={16} /> : <Search size={16} />}</span><span><strong>{perk}</strong><small>{perkDetails[perk]}</small></span></button>)}</div></div><button className="primary-button creation-submit" onClick={complete}>Create manager & open starter squad <ChevronRight size={16} /></button></div></div></div>; }

function PackOverlay({ pack, onClose, onReveal, onRevealAll, onContinue }: { pack: PackCard[]; onClose: () => void; onReveal: (instanceId: string) => void; onRevealAll: () => void; onContinue: () => void }) {
  const walkoutCard = pack.find((card) => card.tier === 'Icon') ?? pack.find((card) => card.tier === 'Star') ?? pack.find((card) => card.tier === 'Gold');
  const [walkout, setWalkout] = useState(Boolean(walkoutCard));
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!walkout) return;
    const timer = window.setTimeout(() => setStep((value) => value + 1), 950);
    return () => window.clearTimeout(timer);
  }, [walkout, step]);
  if (walkout && walkoutCard && step < 4) {
    return <div className="pack-overlay"><div className={`walkout tier-${walkoutCard.tier.toLowerCase()}`}>
      <button className="walkout-skip" onClick={() => setWalkout(false)}>Skip <ChevronRight size={13} /></button>
      <div className="walkout-flash" key={step} />
      <div className={`walkout-rays tier-${walkoutCard.tier.toLowerCase()}`} />
      <div className="walkout-tier">{walkoutCard.tier.toUpperCase()} WALKOUT</div>
      {step === 0 && <div className="walkout-flag"><CountryFlag code={walkoutCard.country} /></div>}
      {step === 1 && <div className="walkout-role"><span className={`tier-emblem tier-${walkoutCard.tier.toLowerCase()}`}>{walkoutCard.tier === 'Icon' ? <Crown size={40} /> : walkoutCard.tier === 'Star' ? <Star size={40} /> : <Trophy size={40} />}</span>{roleLabel(walkoutCard.role)}</div>}
      {step === 2 && <div className="walkout-team">{walkoutCard.team}</div>}
      {step === 3 && <div className="walkout-card"><FutCard card={walkoutCard} isNew /></div>}
      <div className="walkout-progress">{[0, 1, 2, 3].map((index) => <i key={index} className={index <= step ? 'on' : ''} />)}</div>
    </div></div>;
  }
  const revealedCount = pack.filter((card) => card.revealed).length;
  return <div className="pack-overlay"><div className="pack-modal"><button className="overlay-close" onClick={onClose}><X size={18} /></button><div className="eyebrow orange">PACK OPENING · SAVED TO CLUB</div><h2>Reveal your players</h2><p>Every card is already secured in My Club. Flip them one by one — Gold, Star and Icon pulls get a rarity walkout.</p><div className="pack-cards">{pack.map((card) => <div className="reveal-wrap" key={card.instanceId}>{card.revealed ? <div className="revealed-card" key={`${card.instanceId}-revealed`}><FutCard card={card} isNew /><div className="revealed-actions"><span className="actioned"><BadgeCheck size={14} /> Saved to My Club</span></div></div> : <button className="face-down" onClick={() => onReveal(card.instanceId)}><div className="face-logo"><Crosshair size={30} /><span>CS2</span></div><div className="face-lines" /><span>CLICK TO REVEAL</span></button>}</div>)}</div><div className="reveal-footer"><span>{revealedCount} / {pack.length} revealed</span>{revealedCount < pack.length ? <button className="primary-button" onClick={onRevealAll}><Sparkles size={15} /> Reveal All</button> : <button className="primary-button" onClick={onContinue}>Continue to My Club <ChevronRight size={15} /></button>}</div></div></div>;
}


function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
const CHEM_REGION: Record<string, string> = {
  SK: 'Europe/CIS', UA: 'Europe/CIS', RU: 'Europe/CIS', DE: 'Europe/CIS', PL: 'Europe/CIS', RO: 'Europe/CIS', IL: 'Europe/CIS',
  LT: 'Europe/CIS', FI: 'Europe/CIS', DK: 'Europe/CIS', HU: 'Europe/CIS', EE: 'Europe/CIS', BA: 'Europe/CIS', FR: 'Europe/CIS',
  LV: 'Europe/CIS', NO: 'Europe/CIS', SE: 'Europe/CIS', TR: 'Europe/CIS', PT: 'Europe/CIS', BY: 'Europe/CIS', GB: 'Europe/CIS',
  MK: 'Europe/CIS', ES: 'Europe/CIS', CZ: 'Europe/CIS', GR: 'Europe/CIS', RS: 'Europe/CIS', XK: 'Europe/CIS',
  MN: 'Asia-Pacific', KZ: 'Asia-Pacific', AU: 'Asia-Pacific', CN: 'Asia-Pacific',
  BR: 'Americas', CA: 'Americas', US: 'Americas', AR: 'Americas', GT: 'Americas',
};
const chemistryRegion = (country: string): string => CHEM_REGION[country.trim().toUpperCase()] ?? '';
const isUniversalIcon = (card: OwnedCard): boolean => card.tier === 'Icon' && cardPower(card).ovr >= 90;
function calculateChemistry(cards: OwnedCard[], perks: Perk[], tactChemBonus = 0): number {
  if (!cards.length) return 0;
  const icons = cards.map(isUniversalIcon);
  let pairPoints = 0;
  cards.forEach((card, index) => {
    cards.slice(index + 1).forEach((other, offset) => {
      if (icons[index] || icons[index + 1 + offset]) { pairPoints += 5; return; }
      if (card.team === other.team) { pairPoints += 8; return; }
      if (card.country === other.country) { pairPoints += 6; return; }
      const region = chemistryRegion(card.country);
      if (region && region === chemistryRegion(other.country)) pairPoints += 3;
    });
  });
  const tactical = perks.includes('Tactical Genius') ? Math.max(3, tactChemBonus) : tactChemBonus;
  return Math.min(100, Math.round((cards.length / 5) * 48 + Math.min(45, pairPoints) + Math.max(0, tactical)));
}

export default App;
