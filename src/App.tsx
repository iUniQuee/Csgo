import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { simulateRound, type Duelist, type FeedLine } from './matchEngine';
import { advanceEcoState, ecoTeamById, ecoTeamsInDivision, readEcoState, resetEcoState, saveEcoState, teamAvgOvr, teamRoster, teamTier, type EcoState, type EcoTeam, type OvrRange } from './ecosystem';
import {
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
  Target,
  TrendingUp,
  Trophy,
  Zap,
  UserRound,
  Users,
  X,
} from 'lucide-react';

type Page = 'squad' | 'store' | 'club' | 'arena' | 'profile';
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Star' | 'Icon';
type Role = 'AWPer' | 'Entry' | 'IGL' | 'Rifler' | 'Lurker';
type Perk = 'Tactical Genius' | 'Aim Coach' | 'Scout Master';
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
type OwnedCard = PlayerCard & { instanceId: string; level: number };
type CardPower = { ovr: number; aim: number; rfl: number; sns: number; clt: number };
const CARD_MAX_LEVEL = 5;
const cardLevel = (level?: number): number => Math.min(CARD_MAX_LEVEL, Math.max(1, level || 1));
const cardBonus = (level?: number): number => { const lvl = cardLevel(level); return lvl <= 1 ? 0 : lvl === CARD_MAX_LEVEL ? 5 : lvl - 1; };
const cardPower = (card: { ovr: number; aim: number; rfl: number; sns: number; clt: number; level?: number }): CardPower => { const bonus = cardBonus(card.level); return { ovr: Math.min(99, card.ovr + bonus), aim: Math.min(99, card.aim + bonus), rfl: Math.min(99, card.rfl + bonus), sns: Math.min(99, card.sns + bonus), clt: Math.min(99, card.clt + bonus) }; };
type Profile = { nickname: string; teamName: string; avatar: Avatar; perk: Perk; perk2?: Perk };
type PackId = 'bronze' | 'silver' | 'gold' | 'major' | 'daily' | 'awp' | 'rifle' | 'asia' | 'igl';
type DropRow = [Tier, number];
type PackDefinition = { id: PackId; name: string; price: number; tier: Tier; art: string; tagline: string; description: string; odds: string; count: number; badge?: string; color?: string; soft?: string; bulk?: boolean };
type SaveData = { profile: Profile; coins: number; owned: OwnedCard[]; squad: Record<Role, string>; page: Page; newCardIds: string[]; managerXp: number; league?: LeagueState; dailyClaimAt?: number; rewardedLevel?: number; lastActiveAt?: number; quests?: QuestState };
type PackCard = OwnedCard & { revealed?: boolean };
type Division = { name: string; ovr: number; ovrMin: number; ovrMax: number; reward: number };
type LeagueTeam = { id: string; name: string; ovr: number; played: number; wins: number; losses: number; roundDiff: number; points: number };
type LeagueTrophy = { season: number; division: string; place: number };
type SeasonSummary = { season: number; divisionIndex: number; place: number; payout: number; promoted: boolean; relegated: boolean; trophy: boolean; teams: LeagueTeam[] };
type LeagueMatchLog = { dayKey: string; slot: number; opponent: string; won: boolean; us: number; them: number; coins: number };
type LeagueDayResult = { dayKey: string; division: number; rank: number; promoted: boolean; relegated: boolean; coins: number; wins: number; losses: number };
type LeagueState = { division: number; season: number; monthKey?: string; matchday: number; teams: LeagueTeam[]; trophies: LeagueTrophy[]; summary: SeasonSummary | null; dayKey?: string; slot?: number; lastSlotAt?: number; dayResult?: LeagueDayResult | null };
type QuestId = 'packs' | 'squad' | 'scrim';
type QuestState = { day: string; packs: number; squad: number; scrim: number; claimed: QuestId[]; scrimWins: number };

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

const divisions: Division[] = [
  { name: 'Bronze', ovr: 59, ovrMin: 58, ovrMax: 60, reward: 1500 },
  { name: 'Silver', ovr: 62, ovrMin: 61, ovrMax: 62, reward: 2500 },
  { name: 'Gold Nova', ovr: 64, ovrMin: 63, ovrMax: 64, reward: 3500 },
  { name: 'Master Guardian', ovr: 66, ovrMin: 65, ovrMax: 68, reward: 5000 },
  { name: 'Guardian Elite', ovr: 70, ovrMin: 69, ovrMax: 70, reward: 7000 },
  { name: 'Vanguard', ovr: 72, ovrMin: 71, ovrMax: 72, reward: 9500 },
  { name: 'Legendary Eagle', ovr: 74, ovrMin: 73, ovrMax: 74, reward: 12000 },
  { name: 'Supreme Legend', ovr: 76, ovrMin: 75, ovrMax: 77, reward: 15000 },
  { name: 'World Class', ovr: 79, ovrMin: 78, ovrMax: 79, reward: 19000 },
  { name: 'Pro Series', ovr: 81, ovrMin: 80, ovrMax: 81, reward: 24000 },
  { name: 'Eagle Elite', ovr: 83, ovrMin: 82, ovrMax: 83, reward: 30000 },
  { name: 'Prime Division', ovr: 85, ovrMin: 84, ovrMax: 86, reward: 38000 },
  { name: 'Major Elite', ovr: 88, ovrMin: 87, ovrMax: 88, reward: 48000 },
  { name: 'Supreme Elite', ovr: 90, ovrMin: 89, ovrMax: 90, reward: 60000 },
  { name: 'Global Elite', ovr: 96, ovrMin: 91, ovrMax: 97, reward: 100000 },
];

const leagueMatchdays = 24;
const ecoRanges: OvrRange[] = divisions.map((item) => ({ min: item.ovrMin, max: item.ovrMax }));
let ecoSnapshot: EcoTeam[] = readEcoState(ecoRanges).teams;

function createLeagueTeams(divisionIndex: number): LeagueTeam[] {
  const division = divisions[divisionIndex];
  const base = { played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 };
  const pool = ecoTeamsInDivision(ecoSnapshot, divisionIndex);
  // Division 1 has 15 AI clubs + the user's custom team; every other division is a full 16-club table.
  const roster: { id: string; name: string; ovr: number }[] = pool.length
    ? pool.map((team) => ({ id: team.id, name: team.name, ovr: team.ovr }))
    : Array.from({ length: divisionIndex === 0 ? 15 : 16 }, (_, index) => ({ id: `ai-${index}`, name: `AI Club ${index + 1}`, ovr: division.ovrMax }));
  const ai: LeagueTeam[] = roster.map((team) => ({ ...base, ...team }));
  return [{ ...base, id: 'user', name: 'YOUR CLUB', ovr: 0 }, ...ai];
}

function createSeason(divisionIndex: number, season: number, trophies: LeagueTrophy[], monthKey = monthKeyOf(Date.now())): LeagueState {
  return { division: divisionIndex, season, monthKey, matchday: 0, teams: createLeagueTeams(divisionIndex), trophies, summary: null };
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
  const chance = 1 / (1 + Math.pow(10, (away.ovr - home.ovr) / 14));
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
  { id: 'packs', title: 'Open 1 Pack', note: 'Claim or buy any pack in the Store', reward: 300, target: 1 },
  { id: 'squad', title: 'Check / Update Squad', note: 'Review or edit your active lineup', reward: 200, target: 1 },
  { id: 'scrim', title: 'Play 2 Scrimmage Matches', note: 'Friendly matches from the Arena', reward: 500, target: 2 },
];
const createQuestState = (day = dayKeyOf(Date.now())): QuestState => ({ day, packs: 0, squad: 0, scrim: 0, claimed: [], scrimWins: 0 });
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
  const table = sortLeague(league.teams.map((team) => (team.id === 'user' ? { ...team, ovr: teamRating || team.ovr } : team)));
  const userRow = table.find((team) => team.id === 'user');
  const rank = Math.max(1, table.findIndex((team) => team.id === 'user') + 1);
  const promoted = rank <= 3 && league.division < divisions.length - 1;
  const relegated = rank >= 14 && league.division > 0;
  const nextDivision = promoted ? league.division + 1 : relegated ? league.division - 1 : league.division;
  const coins = promoted ? promotionCoins(nextDivision) : 0;
  const dayKey = league.dayKey ?? dayKeyOf(Date.now());
  const dayResult: LeagueDayResult = { dayKey, division: league.division, rank, promoted, relegated, coins, wins: userRow?.wins ?? 0, losses: userRow?.losses ?? 0 };
  const teams = nextDivision === league.division ? league.teams.map(emptyTeamStats) : createLeagueTeams(nextDivision);
  const trophies = rank <= 3 ? [...league.trophies, { season: league.season, division: divisions[league.division].name, place: rank }] : league.trophies;
  return { league: { ...league, division: nextDivision, teams, trophies, slot: 0, matchday: 0, dayResult, dayKey: dayKeyAfter(dayKey) }, dayResult, coins };
}

function advanceLeague(league: LeagueState, now: number, teamRating: number): { league: LeagueState; matches: LeagueMatchLog[]; coins: number; dayResult: LeagueDayResult | null } {
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
  Bronze: { color: '#a9784a', soft: 'rgba(169,120,74,.14)', price: 500, sell: 100, subtitle: 'Academy rookie' },
  Silver: { color: '#c3cbd9', soft: 'rgba(195,203,217,.14)', price: 900, sell: 250, subtitle: 'Tier-2 professional' },
  Gold: { color: '#f5c451', soft: 'rgba(245,196,81,.14)', price: 1500, sell: 400, subtitle: 'Tier-1 star' },
  Star: { color: '#d98cff', soft: 'rgba(217,140,255,.14)', price: 0, sell: 1500, subtitle: 'Walkout elite' },
  Icon: { color: '#55e8ef', soft: 'rgba(85,232,239,.14)', price: 0, sell: 4000, subtitle: 'Major legend' },
};
const perkDetails: Record<Perk, string> = {
  'Tactical Genius': '+3 Team Chemistry',
  'Aim Coach': '+2 Aim to all players',
  'Scout Master': '+15% Coins from Quick Sell',
};
const avatarDetails: Record<Avatar, { label: string; icon: ReactNode; color: string }> = {
  falcon: { label: 'Tactical Headset', icon: <Headphones />, color: '#f97316' },
  wolf: { label: 'Cyber Wolf', icon: <PawPrint />, color: '#a78bfa' },
  visor: { label: 'Crosshair', icon: <Crosshair />, color: '#22d3ee' },
  tiger: { label: 'Dragon', icon: <Flame />, color: '#fbbf24' },
  ghost: { label: 'Trophy Crown', icon: <Crown />, color: '#94a3b8' },
  sentinel: { label: 'MVP Star', icon: <Star />, color: '#34d399' },
};

const playerSeed: Array<[string, string, string, Role, number, Tier]> = [
  // Bronze · academy and Tier-3 prospects (55-64 OVR)
  ['Patsi', 'PARIVISION', 'RU', 'Entry', 60, 'Bronze'], ['k1to', 'BIG', 'DE', 'Entry', 60, 'Bronze'], ['Annihilation', 'ATOX', 'MN', 'Entry', 59, 'Bronze'], ['br0', 'Monte', 'UA', 'Entry', 58, 'Bronze'],
  ['Woro2k', 'Monte', 'UA', 'AWPer', 61, 'Bronze'], ['headtr1ck', 'B8', 'UA', 'AWPer', 61, 'Bronze'], ['KEi', '9INE', 'PL', 'AWPer', 60, 'Bronze'], ['regali', '9INE', 'RO', 'AWPer', 58, 'Bronze'],
  ['sdy', 'Monte', 'UA', 'IGL', 62, 'Bronze'], ['Jerry', 'PARIVISION', 'RU', 'IGL', 59, 'Bronze'], ['Goofy', '9INE', 'PL', 'IGL', 58, 'Bronze'], ['yAmi', 'ATOX', 'MN', 'IGL', 57, 'Bronze'],
  ['DemQQ', 'Monte', 'UA', 'Rifler', 59, 'Bronze'], ['npl', 'B8', 'UA', 'Rifler', 58, 'Bronze'], ['xerolte', 'Chinggis Warriors', 'MN', 'Rifler', 60, 'Bronze'],
  ['Qikert', 'PARIVISION', 'KZ', 'Lurker', 62, 'Bronze'], ['JDC', 'BIG', 'DE', 'Lurker', 59, 'Bronze'],
  // Silver · Tier-2 professionals (65-74 OVR)
  ['zorte', 'BetBoom', 'RU', 'AWPer', 72, 'Silver'], ['Krad', 'BetBoom', 'RU', 'Entry', 70, 'Silver'], ['nafany', 'BetBoom', 'RU', 'IGL', 68, 'Silver'], ['s1ren', 'BetBoom', 'RU', 'Rifler', 69, 'Silver'], ['gokushima', 'BetBoom', 'RU', 'Lurker', 67, 'Silver'],
  ['Maka', '3DMAX', 'FR', 'IGL', 70, 'Silver'], ['Djoko', '3DMAX', 'FR', 'Entry', 68, 'Silver'], ['Lucky', '3DMAX', 'FR', 'AWPer', 69, 'Silver'], ['Graviti', '3DMAX', 'FR', 'Rifler', 67, 'Silver'], ['bodyy', '3DMAX', 'FR', 'Lurker', 66, 'Silver'],
  ['MUTiRiS', 'SAW', 'PT', 'IGL', 71, 'Silver'], ['roman', 'SAW', 'PT', 'Rifler', 69, 'Silver'], ['story', 'SAW', 'PT', 'AWPer', 68, 'Silver'], ['aragornN', 'SAW', 'PT', 'Entry', 65, 'Silver'],
  ['jottAAA', 'Sangal', 'TR', 'Rifler', 70, 'Silver'], ['ngiN', 'Sangal', 'TR', 'IGL', 67, 'Silver'], ['Soulfly', 'Sangal', 'TR', 'Entry', 66, 'Silver'], ['imoRR', 'Sangal', 'TR', 'Lurker', 65, 'Silver'],
  ['kabal', 'ATOX', 'MN', 'IGL', 69, 'Silver'], ['dok', 'ATOX', 'MN', 'Rifler', 66, 'Silver'], ['MiQ', 'ATOX', 'MN', 'AWPer', 65, 'Silver'],
  ['ncl', 'Chinggis Warriors', 'MN', 'Entry', 68, 'Silver'], ['nin9', 'Chinggis Warriors', 'MN', 'Rifler', 67, 'Silver'], ['Zilkenberg', 'Chinggis Warriors', 'MN', 'AWPer', 66, 'Silver'],
  ['1eeR', 'Nemiga', 'BY', 'AWPer', 72, 'Silver'], ['Jyo', 'Nemiga', 'BY', 'IGL', 68, 'Silver'], ['mds', 'Nemiga', 'BY', 'Entry', 67, 'Silver'],
  ['tabseN', 'BIG', 'DE', 'IGL', 73, 'Silver'], ['Krimbo', 'BIG', 'DE', 'Rifler', 71, 'Silver'], ['hyped', 'BIG', 'DE', 'AWPer', 68, 'Silver'],
  ['REZ', 'GamerLegion', 'SE', 'Rifler', 72, 'Silver'], ['Tauson', 'GamerLegion', 'DK', 'Entry', 68, 'Silver'], ['acoR', 'GamerLegion', 'DK', 'AWPer', 70, 'Silver'], ['Sdaim', 'GamerLegion', 'PL', 'Lurker', 69, 'Silver'],
  ['insani', 'MIBR', 'BR', 'Entry', 70, 'Silver'], ['VINI', 'Imperial', 'BR', 'Rifler', 69, 'Silver'], ['chelo', 'Imperial', 'BR', 'Lurker', 68, 'Silver'],
  // Gold · solid Tier-1 pros (75-84 OVR)
  ['Techno4K', 'The MongolZ', 'MN', 'Rifler', 82, 'Gold'], ['910', 'The MongolZ', 'MN', 'IGL', 82, 'Gold'], ['mzinho', 'The MongolZ', 'MN', 'Rifler', 80, 'Gold'],
  ['jL', 'NAVI', 'LT', 'Entry', 83, 'Gold'], ['Aleksib', 'NAVI', 'FI', 'IGL', 79, 'Gold'], ['w0nderful', 'NAVI', 'UA', 'AWPer', 83, 'Gold'], ['b1t', 'NAVI', 'UA', 'Rifler', 80, 'Gold'], ['iM', 'NAVI', 'RO', 'Entry', 78, 'Gold'],
  ['karrigan', 'FaZe Clan', 'DK', 'IGL', 78, 'Gold'], ['frozen', 'FaZe Clan', 'SK', 'Rifler', 84, 'Gold'], ['EliGE', 'FaZe Clan', 'US', 'Rifler', 83, 'Gold'], ['rain', 'FaZe Clan', 'NO', 'Entry', 80, 'Gold'],
  ['apEX', 'Team Vitality', 'FR', 'IGL', 76, 'Gold'], ['mezii', 'Team Vitality', 'GB', 'Lurker', 79, 'Gold'],
  ['magixx', 'Team Spirit', 'RU', 'Lurker', 78, 'Gold'], ['zont1x', 'Team Spirit', 'RU', 'Rifler', 80, 'Gold'], ['chopper', 'Team Spirit', 'RU', 'IGL', 75, 'Gold'],
  ['Brollan', 'MOUZ', 'SE', 'Rifler', 82, 'Gold'], ['torzsi', 'MOUZ', 'HU', 'AWPer', 80, 'Gold'], ['siuhy', 'MOUZ', 'PL', 'IGL', 79, 'Gold'],
  ['huNter-', 'G2 Esports', 'BA', 'Entry', 83, 'Gold'], ['Snax', 'G2 Esports', 'PL', 'IGL', 75, 'Gold'], ['HeavyGod', 'G2 Esports', 'IL', 'Rifler', 82, 'Gold'],
  ['TeSeS', 'Team Falcons', 'DK', 'Lurker', 78, 'Gold'], ['Magisk', 'Team Falcons', 'DK', 'IGL', 76, 'Gold'], ['degster', 'Team Falcons', 'RU', 'AWPer', 82, 'Gold'], ['kyousuke', 'Team Falcons', 'RU', 'Rifler', 79, 'Gold'],
  ['FalleN', 'FURIA', 'BR', 'AWPer', 78, 'Gold'], ['yuurih', 'FURIA', 'BR', 'Rifler', 81, 'Gold'], ['KSCERATO', 'FURIA', 'BR', 'Lurker', 82, 'Gold'], ['molodoy', 'FURIA', 'BR', 'Entry', 80, 'Gold'], ['YEKINDAR', 'FURIA', 'LV', 'Entry', 79, 'Gold'],
  ['biguzera', 'paiN Gaming', 'BR', 'IGL', 77, 'Gold'], ['nqz', 'paiN Gaming', 'BR', 'AWPer', 78, 'Gold'], ['snow', 'paiN Gaming', 'BR', 'Rifler', 75, 'Gold'], ['dav1deuS', 'paiN Gaming', 'BR', 'Lurker', 76, 'Gold'],
  ['Twistzz', 'Team Liquid', 'CA', 'Rifler', 83, 'Gold'], ['NAF', 'Team Liquid', 'CA', 'Lurker', 79, 'Gold'], ['ultimate', 'Team Liquid', 'SE', 'AWPer', 80, 'Gold'],
  ['jabbi', 'Astralis', 'DK', 'Entry', 79, 'Gold'], ['Staehr', 'Astralis', 'DK', 'Rifler', 80, 'Gold'], ['HooXi', 'Astralis', 'DK', 'IGL', 77, 'Gold'],
  ['kyxsan', 'HEROIC', 'MK', 'IGL', 78, 'Gold'], ['sjuush', 'HEROIC', 'DK', 'Rifler', 76, 'Gold'], ['yxngstxr', 'HEROIC', 'SE', 'Entry', 75, 'Gold'], ['NertZ', 'HEROIC', 'IL', 'Lurker', 81, 'Gold'],
  ['JT', 'Complexity', 'ZA', 'IGL', 76, 'Gold'], ['hallzerk', 'Complexity', 'NO', 'AWPer', 79, 'Gold'], ['Grim', 'Complexity', 'US', 'Rifler', 78, 'Gold'],
  ['XANTARES', 'Eternal Fire', 'TR', 'Entry', 84, 'Gold'], ['MAJ3R', 'Eternal Fire', 'TR', 'IGL', 75, 'Gold'], ['woxic', 'Eternal Fire', 'TR', 'AWPer', 80, 'Gold'], ['Wicadia', 'Eternal Fire', 'TR', 'Rifler', 83, 'Gold'],
  ['electroNic', 'Virtus.pro', 'RU', 'Rifler', 81, 'Gold'], ['FL1T', 'Virtus.pro', 'RU', 'Lurker', 80, 'Gold'], ['fame', 'Virtus.pro', 'RU', 'Entry', 78, 'Gold'], ['ICY', 'Virtus.pro', 'RU', 'AWPer', 79, 'Gold'], ['Perfecto', 'Virtus.pro', 'RU', 'IGL', 78, 'Gold'],
  // Star · walkout elites (85-89 OVR)
  ['bLitz', 'The MongolZ', 'MN', 'IGL', 87, 'Star'], ['Senzu', 'The MongolZ', 'MN', 'AWPer', 87, 'Star'], ['ropz', 'Team Vitality', 'EE', 'Lurker', 88, 'Star'], ['broky', 'FaZe Clan', 'LV', 'AWPer', 86, 'Star'],
  ['flameZ', 'Team Vitality', 'IL', 'Entry', 86, 'Star'], ['xertioN', 'MOUZ', 'IL', 'Entry', 86, 'Star'], ['Jimpphat', 'MOUZ', 'FI', 'Lurker', 86, 'Star'], ['Spinx', 'Team Vitality', 'IL', 'Rifler', 85, 'Star'], ['stavn', 'Astralis', 'DK', 'Lurker', 86, 'Star'],
  // Icon · Major MVPs and legends (90-96 OVR)
  ['ZywOo', 'Team Vitality', 'FR', 'AWPer', 96, 'Icon'], ['Prime s1mple', 'NAVI', 'UA', 'AWPer', 96, 'Icon'], ['donk', 'Team Spirit', 'RU', 'Entry', 95, 'Icon'], ['m0NESY', 'G2 Esports', 'RU', 'AWPer', 94, 'Icon'],
  ['NiKo', 'Team Falcons', 'BA', 'Rifler', 91, 'Icon'], ['sh1ro', 'Team Spirit', 'RU', 'AWPer', 90, 'Icon'], ['device', 'Astralis', 'DK', 'AWPer', 90, 'Icon'], ['f0rest', 'Ninjas in Pyjamas', 'SE', 'Rifler', 90, 'Icon'],
  ['GeT_RiGhT', 'Ninjas in Pyjamas', 'SE', 'Lurker', 90, 'Icon'], ['coldzera', 'Legacy', 'BR', 'Lurker', 90, 'Icon'],
];

const database: PlayerCard[] = playerSeed.map(([name, team, country, role, ovr, tier], index) => ({
  id: `player-${index + 1}`,
  name, team, country, role, ovr, tier,
  aim: Math.min(99, ovr + (index % 5) - 2),
  rfl: Math.min(99, ovr + ((index * 3) % 5) - 2),
  sns: Math.min(99, ovr + ((index * 2) % 5) - 2),
  clt: Math.min(99, ovr + ((index * 4) % 5) - 2),
}));

const emptySquad: Record<Role, string> = { Entry: '', AWPer: '', IGL: '', Rifler: '', Lurker: '' };

const createStarterCards = (): OwnedCard[] => {
  return roles.map((role) => {
    const academy = database.filter((card) => card.tier === 'Bronze' && card.role === role && card.ovr >= 58 && card.ovr <= 62);
    const pool = academy.length ? academy : database.filter((card) => card.tier === 'Bronze' && card.role === role);
    const card = pool[Math.floor(Math.random() * pool.length)] ?? pickCard(database.filter((item) => item.tier === 'Bronze'));
    return { ...card, instanceId: `starter-${randomId()}-${card.id}`, level: 1 };
  });
};
const createProfile = (): Profile => ({ nickname: '', teamName: 'The MongolZ', avatar: 'falcon', perk: 'Tactical Genius' });
const randomId = (): string => Math.random().toString(36).slice(2, 10);
const dropTables: Record<PackId, DropRow[]> = {
  daily: [['Bronze', 70], ['Silver', 25], ['Gold', 5]],
  bronze: [['Bronze', 75], ['Silver', 24], ['Gold', 1]],
  silver: [['Bronze', 30], ['Silver', 55], ['Gold', 14], ['Star', 1]],
  gold: [['Silver', 35], ['Gold', 58], ['Star', 6], ['Icon', 1]],
  awp: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  rifle: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  asia: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  igl: [['Silver', 25], ['Gold', 63], ['Star', 10], ['Icon', 2]],
  major: [['Gold', 50], ['Star', 40], ['Icon', 10]],
};
const rollTier = (table: DropRow[]): Tier => {
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [tier, weight] of table) { if (roll < weight) return tier; roll -= weight; }
  return table[table.length - 1][0];
};

const XP_STEP = 1000;
const LEVEL_REWARD = 1000;
const SECOND_PERK_LEVEL = 5;
const VIP_LEVEL = 10;
const VIP_DISCOUNT = 0.15;
const PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PITY_LIMIT = 30;
const PITY_STORAGE_KEY = 'cs2-packs-without-icon';
const readIconPity = (): number => {
  try {
    const raw = Number(localStorage.getItem(PITY_STORAGE_KEY));
    return Number.isFinite(raw) ? Math.min(PITY_LIMIT, Math.max(0, Math.floor(raw))) : 0;
  } catch { return 0; }
};

const managerLevel = (xp: number): number => Math.floor(Math.max(0, xp) / XP_STEP) + 1;
const levelProgress = (xp: number): number => ((Math.max(0, xp) % XP_STEP) / XP_STEP) * 100;
const levelFloorXp = (level: number): number => (level - 1) * XP_STEP;
const countdownLabel = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const packCatalog: PackDefinition[] = [
  { id: 'bronze', name: 'Bronze Pack', price: 500, tier: 'Bronze', art: 'BRONZE', tagline: 'Academy talent', description: 'A reliable starting point: Bronze rookies with a real shot at a Silver upgrade.', odds: '75% Bronze · 24% Silver · 1% Gold', count: 3, bulk: true },
  { id: 'silver', name: 'Silver Pack', price: 800, tier: 'Silver', art: 'SILVER', tagline: 'Mid-table value', description: 'Three cards with a strong Silver base and a genuine Star chase.', odds: '30% Bronze · 55% Silver · 14% Gold · 1% Star', count: 3, badge: 'VALUE PICK', color: '#cbd5e1', soft: 'rgba(203,213,225,.14)', bulk: true },
  { id: 'gold', name: 'Gold Pack', price: 1500, tier: 'Gold', art: 'GOLD', tagline: 'Established star', description: 'Tier-1 talent with a clean Silver floor and a shot at a walkout.', odds: '35% Silver · 58% Gold · 6% Star · 1% Icon', count: 3, badge: 'MOST POPULAR', bulk: true },
  { id: 'major', name: 'Major Legend Pack', price: 5000, tier: 'Icon', art: 'MAJOR', tagline: 'Major legend', description: 'Only the biggest names from the biggest stage.', odds: '50% Gold · 40% Star · 10% Icon', count: 3 },
  { id: 'daily', name: 'Daily Free Pack', price: 0, tier: 'Gold', art: 'FREE', tagline: 'Every 24 hours', description: 'Two free cards daily, with Silver and better always possible.', odds: '70% Bronze · 25% Silver · 5% Gold', count: 2, badge: 'FREE DAILY', color: '#34d399', soft: 'rgba(52,211,153,.14)' },
  { id: 'awp', name: 'AWPer & Sniper Pack', price: 2200, tier: 'Star', art: 'AWP', tagline: 'Snipers only', description: 'Three dedicated AWPers. Chase m0NESY, ZywOo, sh1ro or broky.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#22d3ee', soft: 'rgba(34,211,238,.14)' },
  { id: 'rifle', name: 'Rifler & Entry Pack', price: 2200, tier: 'Gold', art: 'RIFLE', tagline: 'Riflers & Entry', description: 'Three riflers or entry fraggers built to open every site.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#f97316', soft: 'rgba(249,115,22,.14)' },
  { id: 'igl', name: 'IGL & Support Pack', price: 2200, tier: 'Star', art: 'IGL', tagline: 'In-game leaders', description: 'Three in-game leaders and support minds: bLitz, Aleksib, karrigan, apEX and more.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'ROLE GUARANTEE', color: '#38bdf8', soft: 'rgba(56,189,248,.14)' },
  { id: 'asia', name: 'Asian & Regional Masters', price: 2000, tier: 'Star', art: 'ASIA', tagline: 'Chemistry boost', description: 'Weighted toward The MongolZ and regional talent for instant links.', odds: '25% Silver · 63% Gold · 10% Star · 2% Icon', count: 3, badge: 'REGIONAL', color: '#a78bfa', soft: 'rgba(167,139,250,.14)' },
];

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
const generatePack = (id: PackId, forceIcon = false): PackCard[] => {
  const table = dropTables[id];
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

  useEffect(() => {
    const now = Date.now();
    const saved = localStorage.getItem('cs2-ultimate-team-save');
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
      nextLeague = { ...data.league, monthKey: data.league.monthKey ?? monthKeyOf(now) };
      const elapsedMonths = data.league.monthKey ? monthsBetween(data.league.monthKey, monthKeyOf(now)) : 0;
      if (elapsedMonths > 0) {
        let division = nextLeague.division;
        let season = nextLeague.season;
        let working = nextLeague;
        let coinsEarned = 0;
        const bonusCards: PackCard[] = [];
        for (let month = 0; month < elapsedMonths; month += 1) {
          const table = sortLeague(working.teams);
          const place = Math.max(1, table.findIndex((team) => team.id === 'user') + 1);
          coinsEarned += Math.round(divisions[division].reward * 0.3);
          bonusCards.push(...generatePack(place <= 3 ? 'major' : 'gold'));
          division = Math.max(0, division - rolloverDrop(division));
          season += 1;
          working = createSeason(division, season, working.trophies);
        }
        nextLeague = working;
        nextCoins += coinsEarned;
        nextOwned = [...nextOwned, ...bonusCards.map((card) => { const copy = { ...card, level: cardLevel(card.level) }; delete copy.revealed; return copy; })];
        freshIds.push(...bonusCards.map((card) => card.instanceId));
        setSeasonNotice({ season, from: data.league.division, to: division, coins: coinsEarned, packs: bonusCards.length });
      }
    } else {
      nextLeague = createSeason(0, 1, data.league?.trophies ?? []);
    }
    if (!nextLeague.lastSlotAt) nextLeague = { ...nextLeague, lastSlotAt: data.lastActiveAt && data.lastActiveAt > 0 ? data.lastActiveAt : now };
    const today = dayKeyOf(now);
    const savedQuests = data.quests;
    const loadedQuests: QuestState = savedQuests && savedQuests.day === today
      ? { ...createQuestState(today), ...savedQuests, claimed: Array.isArray(savedQuests.claimed) ? savedQuests.claimed : [] }
      : createQuestState(today);
    leagueRef.current = nextLeague;
    questsRef.current = loadedQuests;
    setQuests(loadedQuests);
    setProfile(data.profile); setCoins(nextCoins); setOwned(nextOwned); setSquad(data.squad); setPage(data.page); setNewCardIds(freshIds); setManagerXp(nextXp); setRewardedLevel(data.rewardedLevel ?? managerLevel(savedXp)); setDailyClaimAt(data.dailyClaimAt ?? 0); setLeague(nextLeague); setLastActiveAt(now);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || showCreation) return;
    const data: SaveData = { profile, coins, owned, squad, page, newCardIds, managerXp, league, dailyClaimAt, rewardedLevel, lastActiveAt, quests };
    localStorage.setItem('cs2-ultimate-team-save', JSON.stringify(data));
  }, [hydrated, showCreation, profile, coins, owned, squad, page, newCardIds, managerXp, league, dailyClaimAt, rewardedLevel, lastActiveAt, quests]);

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
    if (after === before) return;
    ecoRef.current = after;
    ecoSnapshot = after.teams;
    setEcosystem(after);
    const current = leagueRef.current;
    const incoming = new Map(ecoTeamsInDivision(after.teams, current.division).map((team) => [team.id, team]));
    const kept = current.teams.filter((team) => team.id === 'user' || incoming.has(team.id));
    const missing = [...incoming.values()].filter((team) => !kept.some((row) => row.id === team.id));
    if (!missing.length && kept.length === current.teams.length) return;
    const next: LeagueState = {
      ...current,
      teams: [
        ...kept.map((team) => { const eco = incoming.get(team.id); return eco ? { ...team, name: eco.name, ovr: eco.ovr } : team; }),
        ...missing.map((team) => ({ id: team.id, name: team.name, ovr: team.ovr, played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 })),
      ],
    };
    leagueRef.current = next;
    setLeague(next);
  }, []);
  const settleLeagueClock = useCallback((now: number): void => {
    const current = leagueRef.current;
    const result = advanceLeague(current, now, teamRatingRef.current);
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
  const dailyReadyAt = dailyClaimAt + PACK_COOLDOWN_MS;

  useEffect(() => {
    if (!hydrated || showCreation || level <= rewardedLevel) return;
    const bonus = (level - rewardedLevel) * LEVEL_REWARD;
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
  const teamRating = squadCards.length ? Math.round(squadCards.reduce((sum, card) => sum + cardPower(card).ovr, 0) / squadCards.length) : 0;
  teamRatingRef.current = teamRating;
  const chemistry = calculateChemistry(squadCards, perks);
  const squadDuelists: Duelist[] = squadCards.map((card) => {
    const power = cardPower(card);
    return { name: card.name, role: card.role, ovr: power.ovr, aim: power.aim, rfl: power.rfl, sns: power.sns, clt: power.clt };
  });
  const openCreation = (nextProfile: Profile): void => {
    const starters = createStarterCards();
    const nextSquad = { ...emptySquad };
    starters.forEach((card) => { nextSquad[card.role] = card.instanceId; });
    setProfile(nextProfile); setOwned(starters); setSquad(nextSquad); setShowCreation(false); setToast('Starter squad assembled. Welcome to Ultimate Team.');
  };
  const resetProfile = (): void => { localStorage.removeItem('cs2-ultimate-team-save'); localStorage.removeItem(PITY_STORAGE_KEY); const freshEco = resetEcoState(ecoRanges); ecoSnapshot = freshEco.teams; ecoRef.current = freshEco; setEcosystem(freshEco); setIconPity(0); setProfile(createProfile()); setCoins(2500); setOwned([]); setSquad(emptySquad); setNewCardIds([]); setManagerXp(0); setRewardedLevel(1); setDailyClaimAt(0); setLevelUp(null); setLeague(createSeason(0, 1, [])); setPage('squad'); setShowCreation(true); setPack(null); setRecap(null); setSeasonNotice(null); setLastActiveAt(Date.now()); const freshQuests = createQuestState(); questsRef.current = freshQuests; setQuests(freshQuests); const freshLeague = createSeason(0, 1, []); leagueRef.current = freshLeague; setLeague(freshLeague); };
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
    const complete = count >= definition.target;
    const next: QuestState = { ...base, [id]: count, claimed: complete ? [...base.claimed, id] : base.claimed };
    questsRef.current = next;
    setQuests(next);
    if (complete) {
      setCoins((value) => value + definition.reward);
      setToast(`Daily quest complete: ${definition.title} · +${definition.reward.toLocaleString()} coins`);
    }
  };
  const updateSquad = (next: Record<Role, string>): void => { setSquad(next); bumpQuest('squad'); };
  const resolveScrimmage = (won: boolean): void => {
    bumpQuest('scrim');
    if (!won) { setToast('Scrimmage lost — no coins, but the daily quest counted.'); return; }
    const current = questsRef.current;
    const today = dayKeyOf(Date.now());
    const base = current.day === today ? current : createQuestState(today);
    if (base.scrimWins >= SCRIM_WIN_CAP) {
      setToast(`Scrimmage win · daily paid-win cap reached (${SCRIM_WIN_CAP}/${SCRIM_WIN_CAP})`);
      return;
    }
    const next: QuestState = { ...base, scrimWins: base.scrimWins + 1 };
    questsRef.current = next;
    setQuests(next);
    setCoins((value) => value + SCRIM_WIN_COINS);
    setManagerXp((value) => value + 10);
    setToast(`Scrimmage win: +${SCRIM_WIN_COINS} coins · ${next.scrimWins}/${SCRIM_WIN_CAP} paid wins today`);
  };
  const quickSell = (card: OwnedCard): void => {
    const multiplier = perks.includes('Scout Master') ? 1.15 : 1;
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
  };
  const purchasePack = (id: PackId, times = 1): void => {
    const definition = packCatalog.find((item) => item.id === id);
    if (!definition) return;
    const quantity = id === 'daily' ? 1 : Math.max(1, Math.min(5, Math.floor(times)));
    const unitPrice = Math.round(definition.price * (level >= VIP_LEVEL ? 1 - VIP_DISCOUNT : 1));
    const totalPrice = unitPrice * quantity;
    if (id === 'daily') { if (Date.now() < dailyReadyAt) return; }
    else if (coins < totalPrice) return;
    const generated: PackCard[] = [];
    let pity = iconPity;
    let pityHit = false;
    for (let index = 0; index < quantity; index += 1) {
      const guarantee = id !== 'daily' && pity >= PITY_LIMIT;
      const cards = generatePack(id, guarantee);
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
    bumpQuest('packs');
  }; 
  const awardArenaWin = (reward: number, xp: number, message?: string): void => { setCoins((current) => current + reward); setManagerXp((current) => current + xp); setToast(message ?? `Victory reward: +${reward.toLocaleString()} coins · +${xp} XP`); };
  useEffect(() => { if (hydrated && page === 'squad') bumpQuest('squad'); }, [hydrated, page]);

  if (!hydrated) return null;
  return <div className="ultimate-app min-h-screen bg-[#0f172a] text-slate-200">
    <Sidebar page={page} setPage={setPage} profile={profile} league={league} />
    <main className="ultimate-main">
      <Header profile={profile} coins={coins} onReset={resetProfile} />
      <div className="ultimate-content">
        {page === 'squad' && <SquadPage owned={owned} squad={squad} setSquad={updateSquad} teamRating={teamRating} chemistry={chemistry} profile={profile} onGoClub={() => setPage('club')} />}
        {page === 'store' && <StorePage coins={coins} level={level} dailyReadyAt={dailyReadyAt} iconPity={iconPity} onBuyPack={purchasePack} />}
        {page === 'club' && <ClubPage owned={owned} squad={squad} setSquad={updateSquad} newCardIds={newCardIds} onSell={quickSell} onUpgrade={upgradeCard} />}
        {page === 'arena' && <ArenaPage teamRating={teamRating} chemistry={chemistry} perks={perks} league={league} setLeague={applyLeague} onWin={awardArenaWin} squad={squadDuelists} ecosystem={ecosystem.teams} quests={quests} scrimWins={quests.day === dayKeyOf(Date.now()) ? quests.scrimWins : 0} onScrimmage={resolveScrimmage} />}
        {page === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} managerXp={managerXp} trophies={league.trophies} />}
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
  const dropped = info.from - info.to;
  return <div className="league-overlay"><div className="season-modal"><div className="season-emblem trophy"><Trophy size={26} /></div><div className="eyebrow orange">{seasonLabel(info.season)} BEGINS</div><h2>A new month, a new season.</h2><p>The last season has closed. Rewards have been paid and your club was soft-reset for the new climb.</p><div className="season-stats"><span><small>PRIZE</small><strong><Coins size={13} /> {info.coins.toLocaleString()}</strong></span><span><small>PACKS</small><strong>+{info.packs} cards</strong></span><span><small>RESET</small><strong>{dropped === 0 ? 'No drop' : `-${dropped} div`}</strong></span></div><div className="season-movement"><RotateCcw size={15} /> Division {info.from + 1} → Division {info.to + 1} · {divisions[info.to].name}</div><button className="primary-button season-continue" onClick={onClose}>Start {seasonLabel(info.season)} <ChevronRight size={15} /></button></div></div>;
}

function Sidebar({ page, setPage, profile, league }: { page: Page; setPage: (page: Page) => void; profile: Profile; league: LeagueState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const items: Array<{ id: Page; label: string; icon: typeof Users; note?: string }> = [
    { id: 'squad', label: 'My Squad', icon: Users, note: 'LINEUP' }, { id: 'store', label: 'Store / Packs', icon: Store, note: 'PACKS' }, { id: 'club', label: 'My Club', icon: LayoutGrid, note: 'COLLECTION' }, { id: 'arena', label: 'Play Arena', icon: Swords, note: 'STEP 2' }, { id: 'profile', label: 'Profile', icon: UserRound, note: 'MANAGER' },
  ];
  return <aside className="ut-sidebar"><div className="ut-logo"><div className="ut-logo-icon"><Crosshair size={19} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="manager-mini"><div className="avatar-circle" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div><strong>{profile.nickname || 'New Manager'}</strong><span>{profile.teamName}</span></div></div><div className="sidebar-label">MAIN MENU</div><nav>{items.map(({ id, label, icon: Icon, note }) => <button key={id} className={`ut-nav ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={17} /><span>{label}</span><small>{note}</small></button>)}</nav><div className="sidebar-bottom"><div className="season-card"><Sparkles size={15} className="text-orange-400" /><div><strong>{seasonLabel(league.season)}</strong><span>Road to the Major</span></div></div><div className="season-timer"><small>ENDS IN</small><strong>{seasonCountdown(now)}</strong></div><div className="sidebar-version">ULTIMATE TEAM · 2026</div></div></aside>;
}

function Header({ profile, coins, onReset }: { profile: Profile; coins: number; onReset: () => void }) {
  return <header className="ut-header"><div className="mobile-title">CS2 <span>ULTIMATE TEAM</span></div><div className="header-spacer" /><div className="header-manager"><div className="avatar-circle small" style={{ backgroundColor: avatarDetails[profile.avatar].color }}>{avatarDetails[profile.avatar].icon}</div><div className="header-manager-name"><span>MANAGER</span><strong>{profile.nickname || 'New Manager'}</strong></div></div><div className="header-team"><span>TEAM</span><strong>{profile.teamName}</strong></div><div className="coin-balance"><Coins size={16} /><div><span>COINS</span><strong>{coins.toLocaleString()}</strong></div></div><button className="reset-profile" onClick={onReset}><RotateCcw size={14} /> Reset Profile</button></header>;
}

function SquadPage({ owned, squad, setSquad, teamRating, chemistry, profile, onGoClub }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; teamRating: number; chemistry: number; profile: Profile; onGoClub: () => void }) {
  return <><PageTitle eyebrow="MY CLUB / ACTIVE LINEUP" title="My Squad" subtitle="Build your strongest five and chase the perfect chemistry." action={<button className="outline-button" onClick={onGoClub}><Grid2X2 size={15} /> Browse Club</button>} /><div className="squad-hero"><div className="squad-hero-copy"><div className="eyebrow orange">ACTIVE SQUAD</div><h2>{profile.teamName}</h2><p>Five roles. One server. Make every card count.</p><div className="squad-stat-row"><div><span>TEAM OVR</span><strong>{teamRating || '--'}</strong></div><div><span>CHEMISTRY</span><strong className="green-text">{chemistry}/100</strong></div><div><span>CARDS</span><strong>{owned.length}</strong></div></div></div><div className="squad-emblem"><Trophy size={42} /><span>TMZ</span></div></div><div className="section-row"><div><div className="eyebrow">STARTING FIVE</div><h3>Formation 1-1-1-1-1</h3></div><div className="chem-meter"><span>CHEMISTRY</span><div><i style={{ width: `${chemistry}%` }} /></div></div></div><div className="squad-grid">{roles.map((role) => <SquadSlot key={role} role={role} card={owned.find((item) => item.instanceId === squad[role])} onGoClub={onGoClub} onRemove={() => setSquad({ ...squad, [role]: '' })} />)}</div><div className="squad-tip"><Sparkles size={16} /><span><strong>Squad tip:</strong> Same-team links and shared nationalities increase chemistry. Add a player from The MongolZ to unlock a strong green link.</span></div></>;
}

function SquadSlot({ role, card, onGoClub, onRemove }: { role: Role; card?: OwnedCard; onGoClub: () => void; onRemove: () => void }) {
  return <div className={`squad-slot ${card ? 'filled' : ''}`}>{card ? <><button className="remove-slot" onClick={onRemove}><X size={13} /></button><FutCard card={card} compact /></> : <button className="empty-slot" onClick={onGoClub}><div className="plus-mark">+</div><strong>{role}</strong><span>ADD PLAYER</span></button>}<div className="slot-label">{role}</div></div>;
}

function FutCard({ card, compact = false, onClick, locked = false, isNew = false }: { card: PlayerCard & { level?: number }; compact?: boolean; onClick?: () => void; locked?: boolean; isNew?: boolean }) {
  const config = tierConfig[card.tier];
  const power = cardPower(card);
  const level = cardLevel(card.level);
  return <button className={`fut-card tier-${card.tier.toLowerCase()} ${compact ? 'compact' : ''} ${locked ? 'locked' : ''}`} onClick={onClick} style={{ '--tier-color': config.color, '--tier-soft': config.soft } as React.CSSProperties}><div className="card-shine" />{isNew && <span className="new-card-badge">NEW</span>}<div className="card-top"><span className="card-ovr">{locked ? '?' : power.ovr}</span><span className="card-role">{card.role}</span><div className="card-rarity-icon">{card.tier === 'Icon' ? <Crown size={13} /> : card.tier === 'Star' ? <Star size={13} /> : <Medal size={13} />}</div></div><div className="card-portrait">{!locked && card.level !== undefined && <span className={`card-level ${level === CARD_MAX_LEVEL ? 'max' : ''}`}>{level === CARD_MAX_LEVEL && <Star size={8} fill="currentColor" />} LVL {level}{level === CARD_MAX_LEVEL ? ' MAX' : ''}</span>}{locked ? <LockKeyhole size={compact ? 25 : 34} /> : <><span className="tier-emblem">{card.tier === 'Icon' ? <Crown size={compact ? 14 : 18} /> : card.tier === 'Star' ? <Star size={compact ? 14 : 18} /> : card.tier === 'Gold' ? <Medal size={compact ? 14 : 18} /> : <Shield size={compact ? 14 : 18} />}</span><span className="country-flag">{countryFlag(card.country)}</span><small>{card.team}</small></>}</div><div className="card-name">{locked ? 'UNOWNED' : card.name}</div><div className="card-meta"><span>{countryFlag(card.country)} {card.country}</span><span>{card.tier}</span></div><div className="card-stats"><span><b>{locked ? '--' : power.aim}</b> AIM</span><span><b>{locked ? '--' : power.rfl}</b> RFL</span><span><b>{locked ? '--' : power.sns}</b> SNS</span><span><b>{locked ? '--' : power.clt}</b> CLT</span></div></button>;
}

function StorePage({ coins, level, dailyReadyAt, iconPity, onBuyPack }: { coins: number; level: number; dailyReadyAt: number; iconPity: number; onBuyPack: (id: PackId, times?: number) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const vip = level >= VIP_LEVEL;
  const remaining = Math.max(0, dailyReadyAt - now);
  const dailyReady = remaining === 0;
  const pityProgress = Math.min(100, Math.round((iconPity / PITY_LIMIT) * 100));
  return <>
    <PageTitle eyebrow="TRANSFER MARKET" title="Store / Packs" subtitle="Every pack is saved to My Club the moment you open it. Packs hold 2 or 3 cards." />
    {vip && <div className="vip-strip"><Percent size={15} /><strong>VIP STORE DISCOUNT</strong><span>Level {level} manager: every pack is {Math.round(VIP_DISCOUNT * 100)}% cheaper.</span></div>}
    <div className="pity-strip"><Crown size={15} /><strong>ICON PITY</strong><div className="pity-meter"><i style={{ width: `${pityProgress}%` }} /></div><span>{iconPity} / {PITY_LIMIT} paid packs without an Icon · Icon guaranteed on pack {PITY_LIMIT + 1}</span></div>
    <div className="pack-grid">
      {packCatalog.map((pack) => {
        const price = Math.round(pack.price * (vip ? 1 - VIP_DISCOUNT : 1));
        const cooling = pack.id === 'daily' && !dailyReady;
        const disabled = pack.id === 'daily' ? !dailyReady : coins < price;
        return <PackProduct key={pack.id} pack={pack} price={price} discount={vip} disabled={disabled} bulkDisabled={coins < price * 5} cooldownLabel={cooling ? countdownLabel(remaining) : undefined} onBuy={() => onBuyPack(pack.id)} onBuyBulk={pack.bulk ? () => onBuyPack(pack.id, 5) : undefined} />;
      })}
    </div>
  </>;
}

function PackProduct({ pack, price, discount, disabled, bulkDisabled, cooldownLabel, onBuy, onBuyBulk }: { pack: PackDefinition; price: number; discount: boolean; disabled: boolean; bulkDisabled?: boolean; cooldownLabel?: string; onBuy: () => void; onBuyBulk?: () => void }) {
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
      <div className="pack-buy-row">
        <button className="buy-button" disabled={disabled} onClick={onBuy}>{isDaily ? <Gift size={15} /> : <Coins size={15} />}{isDaily ? 'FREE' : price.toLocaleString()}<span>{cooldownLabel ? `READY IN ${cooldownLabel}` : isDaily ? 'CLAIM PACK' : 'BUY PACK'}</span></button>
        {onBuyBulk && <button className="buy-button buy-bulk" disabled={bulkDisabled} onClick={onBuyBulk} title={`Open 5 packs for ${(price * 5).toLocaleString()} coins`}><span>BUY 5×</span><b>{(price * 5).toLocaleString()}</b></button>}
      </div>
      {discount && pack.price > 0 && <small className="pack-vip">VIP −{Math.round(VIP_DISCOUNT * 100)}% <s>{pack.price.toLocaleString()}</s></small>}
      {isDaily && <small className="pack-cooldown">{cooldownLabel ? 'One free pack every 24 hours' : 'Free pack ready to claim'}</small>}
    </div>
  </div>;
}

function ClubPage({ owned, squad, setSquad, newCardIds, onSell, onUpgrade }: { owned: OwnedCard[]; squad: Record<Role, string>; setSquad: (squad: Record<Role, string>) => void; newCardIds: string[]; onSell: (card: OwnedCard) => void; onUpgrade: (card: OwnedCard) => void }) {
  const [view, setView] = useState<'owned' | 'catalog'>('owned');
  const [tierFilter, setTierFilter] = useState<Tier | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<Role | 'All'>('All');
  const [query, setQuery] = useState('');
  const filtered = owned.filter((card) => (tierFilter === 'All' || card.tier === tierFilter) && (roleFilter === 'All' || card.role === roleFilter) && card.name.toLowerCase().includes(query.toLowerCase()));
  const addToSquad = (card: OwnedCard): void => { if (Object.values(squad).includes(card.instanceId)) return; setSquad({ ...squad, [card.role]: card.instanceId }); };
  const ownedIds = new Set(owned.map((card) => card.id));
  const copies = (card: OwnedCard): number => owned.filter((item) => item.id === card.id).length;
  return <><PageTitle eyebrow="YOUR COLLECTION" title="My Club" subtitle={view === 'owned' ? `${owned.length} player cards collected across five tiers.` : `Explore every player available in the ${database.length}-card database.`} action={<div className="club-tabs"><button className={view === 'owned' ? 'active' : ''} onClick={() => setView('owned')}>My Owned Cards <span>{owned.length}</span></button><button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>All Players Catalog <span>{database.length}</span></button></div>} />{view === 'owned' ? <><div className="club-toolbar"><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player..." /></div><div className="filter-group"><Filter size={14} className="text-slate-500" /><select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as Tier | 'All')}><option value="All">All Tiers</option>{tiers.map((tier) => <option key={tier}>{tier}</option>)}</select><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | 'All')}><option value="All">All Roles</option>{roles.map((role) => <option key={role}>{role}</option>)}</select></div></div>{filtered.length ? <div className="club-grid">{filtered.map((card) => <div className="club-item" key={card.instanceId}><FutCard card={card} isNew={newCardIds.includes(card.instanceId)} onClick={() => addToSquad(card)} /><div className="club-actions"><button onClick={() => addToSquad(card)} className={Object.values(squad).includes(card.instanceId) ? 'active' : ''}>{Object.values(squad).includes(card.instanceId) ? <BadgeCheck size={14} /> : <Shield size={14} />} {Object.values(squad).includes(card.instanceId) ? 'In Squad' : `Use as ${card.role}`}</button>{copies(card) > 1 && cardLevel(card.level) < CARD_MAX_LEVEL && <button onClick={() => onUpgrade(card)} className="upgrade-button"><TrendingUp size={13} /> Upgrade (Lvl +1)<b>×{copies(card)}</b></button>}<button onClick={() => onSell(card)} className="sell-button"><Coins size={13} /> {tierConfig[card.tier].sell}</button></div></div>)}</div> : <div className="empty-club"><Box size={32} /><h3>No cards found</h3><p>Try another filter or open a pack to grow your club.</p></div>}</> : <Catalog ownedIds={ownedIds} newCardIds={newCardIds} />}</>;
}

function Catalog({ ownedIds, newCardIds }: { ownedIds: Set<string>; newCardIds: string[] }) {
  const catalogTiers: Tier[] = ['Icon', 'Star', 'Gold', 'Silver', 'Bronze'];
  return <div className="catalog-view"><div className="catalog-note"><Gem size={15} /> Owned cards are shown in full color. Locked cards reveal their tier and player details once collected.</div>{catalogTiers.map((tier) => <section className="catalog-section" key={tier}><div className="catalog-heading"><div><div className="eyebrow" style={{ color: tierConfig[tier].color }}>{tier === 'Icon' ? 'ICON / MVP' : tier.toUpperCase()}</div><h3>{tier === 'Icon' ? 'Major legends' : tierConfig[tier].subtitle}</h3></div><span>{database.filter((card) => card.tier === tier && ownedIds.has(card.id)).length} / {database.filter((card) => card.tier === tier).length} collected</span></div><div className="catalog-grid">{database.filter((card) => card.tier === tier).map((card) => { const owned = ownedIds.has(card.id); const fresh = newCardIds.some((id) => owned && id.endsWith(`-${card.id}`)); return <div className="catalog-item" key={card.id}><FutCard card={card} locked={!owned} isNew={fresh} /><div className={`catalog-status ${owned ? 'owned' : ''}`}>{owned ? <><BadgeCheck size={12} /> Collected</> : <><LockKeyhole size={12} /> Not packed</>}</div></div>; })}</div></section>)}</div>;
}

function ArenaPage({ teamRating, chemistry, perks, league, setLeague, onWin, squad, quests, scrimWins, onScrimmage, ecosystem }: { teamRating: number; chemistry: number; perks: Perk[]; league: LeagueState; setLeague: (next: LeagueState) => void; onWin: (reward: number, xp: number, message?: string) => void; squad: Duelist[]; quests: QuestState; scrimWins: number; onScrimmage: (won: boolean) => void; ecosystem: EcoTeam[] }) {
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
  const [browseDivision, setBrowseDivision] = useState<number | null>(null);
  const [scoutTeam, setScoutTeam] = useState<EcoTeam | null>(null);
  const slotStartRef = useRef<number | null>(null);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const quickOpponents = [{ id: 'tier2', name: 'Tier 2 Mix', ovr: 72, reward: 500, color: 'bronze' }, { id: 'g2faze', name: 'G2 / FaZe', ovr: 82, reward: 1000, color: 'gold' }, { id: 'vitality', name: 'Vitality / Spirit', ovr: 88, reward: 2000, color: 'star' }];
  const division = divisions[league.division];
  const pairs = leagueSlotPairs(league);
  const leagueOpponentId = pairs.find((pair) => pair.includes('user'))?.find((id) => id !== 'user');
  const leagueOpponentTeam = league.teams.find((team) => team.id === leagueOpponentId);
  const quickOpponent = quickOpponents.find((item) => item.id === opponentId) ?? quickOpponents[0];
  const leagueOpponent = leagueOpponentTeam ? { id: leagueOpponentTeam.id, name: leagueOpponentTeam.name, ovr: leagueOpponentTeam.ovr, reward: LEAGUE_WIN_COINS, color: 'gold' } : quickOpponent;
  const opponent = leagueLive ? leagueOpponent : scrimLive && scrimOpponent ? scrimOpponent : quickOpponent;
  const sortedTeams = sortLeague(league.teams);
  const slot = league.slot ?? 0;
  const liveHour = liveSlotHour(now);
  const liveWindowStart = liveHour === null ? null : slotStartOfDay(dayStartOf(now), liveHour);
  const liveReady = liveWindowStart !== null && (league.lastSlotAt ?? 0) < liveWindowStart;
  const nextStart = liveReady && liveWindowStart !== null ? liveWindowStart : liveHour !== null && liveWindowStart !== null ? liveWindowStart + 3600000 : nextSlotAt(now);
  const nextHour = new Date(nextStart).getHours();
  const countdown = clockCountdown(nextStart - now);

  const beginMatch = (kind: 'quick' | 'league' | 'scrim'): void => {
    setLeagueLive(kind === 'league');
    setScrimLive(kind === 'scrim');
    if (kind === 'scrim') {
      const pool = league.teams.filter((team) => team.id !== 'user');
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? league.teams[0];
      setScrimOpponent({ id: pick.id, name: pick.name, ovr: pick.ovr, reward: SCRIM_WIN_COINS, color: 'bronze' });
    }
    setSpeed(1); setLive(true); setPaused(false); setResult(null); setResultNote(''); setRound(1);
    setScore({ us: 0, them: 0 }); setAlive({ us: 5, them: 5 });
    setFeed([{ text: kind === 'league' ? 'R1 [Freeze] LIVE league broadcast · 1x speed only.' : 'R1 [Freeze] Pistol round begins. Both teams purchase.' }]);
  };

  useEffect(() => {
    if (live || result) return;
    if (!liveReady || liveWindowStart === null) return;
    if (slotStartRef.current === liveWindowStart) return;
    slotStartRef.current = liveWindowStart;
    setMode('league');
    beginMatch('league');
  }, [live, result, liveReady, liveWindowStart]);

  const finish = (won: boolean, finalScore: { us: number; them: number }): void => {
    setLive(false); setResult(won ? 'win' : 'loss');
    if (leagueLive) {
      const start = slotStartRef.current;
      const settled = start === null ? null : settleLiveLeagueSlot(league, start, teamRating, won, finalScore);
      if (settled && settled.league !== league) {
        setLeague(settled.league);
        onWin(settled.coins, 40, `${won ? 'League win' : 'League loss'}: +${settled.coins.toLocaleString()} coins · +40 XP`);
        if (settled.dayResult) setDayResult(settled.dayResult);
      }
      setResultNote(`${won ? 'League win' : 'League loss'} · +${(won ? LEAGUE_WIN_COINS : LEAGUE_LOSS_COINS).toLocaleString()} coins · 16-team table updated`);
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
    const sim = simulateRound({ squad, teamRating, chemistry, perks, opponentName: opponent.name, opponentOvr: opponent.ovr, round });
    const nextScore = { us: score.us + (sim.usWon ? 1 : 0), them: score.them + (sim.usWon ? 0 : 1) };
    const summary: FeedLine = { tag: 'ROUND', text: `R${round} ${sim.usWon ? 'ROUND WON' : 'ROUND LOST'} · survivors ${sim.usAlive}—${sim.themAlive} · ${nextScore.us}:${nextScore.them} · MVP ${sim.mvp}` };
    setAlive({ us: sim.usAlive, them: sim.themAlive });
    setFeed((current) => [summary, ...[...sim.lines].reverse(), ...current].slice(0, 14));
    setScore(nextScore); setRound((current) => current + 1);
    if (nextScore.us >= 13 || nextScore.them >= 13) finish(nextScore.us >= 13, nextScore);
  }, [live, paused, result, perks, squad, teamRating, chemistry, opponent.name, opponent.ovr, round, score, leagueLive, scrimLive, scrimWins, league]);
  useEffect(() => { if (!live || paused || result) return; const timer = window.setInterval(playRound, speed === 2 && !leagueLive ? 750 : 1500); return () => window.clearInterval(timer); }, [live, paused, result, speed, leagueLive, playRound]);

  const questPanel = <div className="quest-panel">
    <div className="quest-head"><div><div className="eyebrow orange">DAILY QUESTS</div><h3>Extra coin routes</h3></div><span>Resets at 00:00 · {quests.claimed.length}/{dailyQuests.length} complete</span></div>
    <div className="quest-list">{dailyQuests.map((quest) => { const value = Math.min(quest.target, questValue(quests, quest.id)); const done = quests.claimed.includes(quest.id); return <div key={quest.id} className={`quest-row ${done ? 'done' : ''}`}><span className="quest-icon">{done ? <BadgeCheck size={15} /> : <Target size={15} />}</span><div className="quest-copy"><strong>{quest.title}</strong><small>{quest.note}</small><div className="quest-bar"><i style={{ width: `${Math.round((value / quest.target) * 100)}%` }} /></div></div><span className="quest-progress">{value}/{quest.target}</span><b className="quest-reward"><Coins size={12} /> +{quest.reward}</b></div>; })}</div>
  </div>;

  const recapModal = dayResult ? <MatchRecapModal info={{ matches: [], coins: dayResult.coins, day: dayResult }} onClose={() => setDayResult(null)} /> : null;
  const roadmap = showRoadmap ? <LeagueRoadmap current={league.division} onClose={() => setShowRoadmap(false)} onOpen={(division) => { setShowRoadmap(false); setBrowseDivision(division); }} /> : null;
  if (live || result) return <><ArenaLive broadcast={leagueLive} resultNote={resultNote} opponent={opponent} score={score} round={round} feed={feed} alive={alive} paused={paused} speed={speed} setSpeed={setSpeed} onPause={() => setPaused((current) => !current)} onRound={playRound} onSkip={() => finish(true, score.us >= score.them || score.them >= 13 ? score : { us: Math.max(score.us, 13), them: score.them })} result={result} onExit={() => { setLive(false); setResult(null); setLeagueLive(false); setScrimLive(false); slotStartRef.current = null; }} />{recapModal}</>;
  return <><PageTitle eyebrow="COMPETITIVE PLAY" title="Play Arena" subtitle="League matches run automatically every hour at :30 — play friendlies and daily quests while you wait." /><div className="arena-mode-bar"><div className="club-tabs arena-mode-toggle"><button className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>Quick Match</button><button className={mode === 'league' ? 'active' : ''} onClick={() => setMode('league')}>League Season <span>16 Teams</span></button></div><span className="arena-mode-note">{mode === 'quick' ? 'Pick any opponent and play a single match.' : `Division ${league.division + 1} of 15 · ${division.name} · Season ${league.season}`}</span></div>
    {questPanel}
    {mode === 'quick' ? <div className="arena-lobby"><div className="arena-lobby-art"><div className="arena-radar"><div className="radar-ring one" /><div className="radar-ring two" /><div className="radar-cross" /><div className="arena-dot one" /><div className="arena-dot two" /><div className="arena-dot three" /></div><div className="arena-lobby-emblem"><Swords size={34} /></div></div><div className="arena-lobby-copy"><div className="eyebrow orange">ARENA MATCHMAKING</div><h2>Choose your opponent.</h2><p>Your active five, chemistry, and manager perks influence every round. Win the BO1 to collect the listed coin reward.</p><div className="arena-stat-line"><span><small>TEAM OVR</small><strong>{teamRating || '--'}</strong></span><span><small>CHEMISTRY</small><strong>{chemistry}</strong></span><span><small>XP ON WIN</small><strong>+{100 + quickOpponent.reward / 10}</strong></span></div><div className="opponent-list">{quickOpponents.map((item) => <button key={item.id} className={`opponent-option ${opponentId === item.id ? 'selected' : ''}`} onClick={() => setOpponentId(item.id)}><span className={`opponent-tier ${item.color}`}>{item.ovr}</span><span><strong>{item.name}</strong><small>{item.ovr} OVR AI opponent</small></span><b><Coins size={13} /> +{item.reward.toLocaleString()}</b></button>)}</div><button className="primary-button arena-start" onClick={() => beginMatch('quick')}><Play size={16} fill="currentColor" /> START MATCH</button><button className="league-ghost arena-scrim" onClick={() => beginMatch('scrim')}><Swords size={15} /> Play Scrimmage (Friendly) <span>{scrimWins}/{SCRIM_WIN_CAP} paid wins</span></button></div></div>
    : <div className="league-shell"><div className="league-hero"><div className="league-rank-badge"><Crown size={20} /><strong>{league.division + 1}</strong><span>DIVISION</span></div><div className="league-hero-copy"><div className="eyebrow orange">DIVISION {league.division + 1} OF 15 · {seasonLabel(league.season).toUpperCase()} · ENDS IN {seasonCountdown(Date.now()).toUpperCase()}</div><h2>{division.name}</h2><p>16-team league · 24 hourly matches per day · Opponent OVR {division.ovrMin}–{division.ovrMax}</p><div className="league-zone-legend"><span className="promotion">Promote 1–3 at 00:00</span><span className="relegation">Relegate 14–16 at 00:00</span><span><Coins size={12} /> +{LEAGUE_WIN_COINS} win / +{LEAGUE_LOSS_COINS} loss</span></div></div><div className="league-progress"><span>TODAY</span><strong>{Math.min(slot, SLOTS_PER_DAY)} / {SLOTS_PER_DAY}</strong><div className="league-progress-bar"><i style={{ width: `${Math.round((Math.min(slot, SLOTS_PER_DAY) / SLOTS_PER_DAY) * 100)}%` }} /></div><small>{leagueOpponentTeam ? `Next: ${leagueOpponentTeam.name} · ${leagueOpponentTeam.ovr} OVR` : 'Next opponent loading'}</small></div></div>
      <div className="match-clock-card"><div className="match-clock-copy"><div className="eyebrow orange">{liveReady ? 'LIVE BROADCAST WINDOW' : 'HOURLY LEAGUE SCHEDULE'}</div><strong>{liveReady ? 'League match is LIVE now — 2D tactical broadcast, 1x speed only.' : `Next League Match starts at ${slotClockLabel(nextHour)} (in ${countdown})`}</strong><small>{liveReady ? 'Stay on this page to watch the tactical map in real time.' : 'Matches simulate automatically at every :30 — even while you are offline.'}</small></div><div className="match-clock-right"><span className={`clock-big ${liveReady ? 'is-live' : ''}`}>{liveReady ? 'LIVE' : countdown}</span><small>{liveReady ? `Window closes ${String(liveHour ?? 0).padStart(2, '0')}:35` : `Kick-off ${slotClockLabel(nextHour)}`}</small></div></div>
      <div className="league-actions"><button className="primary-button" onClick={() => beginMatch('scrim')}><Swords size={16} /> Play Scrimmage (Friendly)</button><button className="league-ghost" onClick={() => setShowRoadmap(true)}><LayoutGrid size={15} /> View League Roadmap</button><span className="league-prize"><Trophy size={13} /> Friendly wins +{SCRIM_WIN_COINS} · {scrimWins}/{SCRIM_WIN_CAP} paid wins today</span></div><div className="league-table"><div className="league-table-head"><span>#</span><span>CLUB</span><span>P</span><span>W</span><span>L</span><span>RD</span><span>PTS</span></div>{sortedTeams.map((team, index) => { const rank = index + 1; const zone = rank <= 3 ? 'promotion' : rank >= 14 ? 'relegation' : ''; return <div key={team.id} className={`league-row ${zone} ${team.id === 'user' ? 'is-user' : ''}`}><span className="league-rank">{rank}</span><span className="league-club">{team.id === 'user' ? <b>YOUR CLUB</b> : <button className="team-link" onClick={() => setScoutTeam(ecoTeamById(ecosystem, team.id) ?? null)}>{team.name}</button>}{team.id === 'user' && <i>YOU</i>}<small>OVR {team.ovr || teamRating}</small></span><span>{team.played}</span><span>{team.wins}</span><span>{team.losses}</span><span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span><strong>{team.points}</strong></div>; })}</div></div>}
    {roadmap}
    {browseDivision !== null && <DivisionBrowser division={browseDivision} ecosystem={ecosystem} onDivision={setBrowseDivision} onTeam={setScoutTeam} onClose={() => setBrowseDivision(null)} />}
    {scoutTeam && <TeamRosterModal team={scoutTeam} onClose={() => setScoutTeam(null)} />}
    {recapModal}
  </>;
}


function LeagueRoadmap({ current, onClose, onOpen }: { current: number; onClose: () => void; onOpen: (division: number) => void }) {
  return <div className="league-overlay" onClick={onClose}><div className="roadmap-modal" onClick={(event) => event.stopPropagation()}><button className="overlay-close" onClick={onClose}><X size={18} /></button><div className="eyebrow orange">LEAGUE ROADMAP</div><h2>15 divisions. One summit.</h2><p>Finish 1–3 to promote, 14–16 to relegate. Click any division to scout its 16 clubs — including divisions you have not reached yet.</p><div className="roadmap-list">{divisions.map((item, index) => ({ ...item, index })).reverse().map((item) => <button key={item.name} className={`roadmap-row ${item.index === current ? 'current' : ''} ${item.index < current ? 'cleared' : ''}`} onClick={() => onOpen(item.index)}><span className="roadmap-badge">{item.index === divisions.length - 1 ? <Crown size={15} /> : item.index + 1}</span><div><strong>{item.name}</strong><small>OVR {item.ovrMin}–{item.ovrMax} · 1–3 Promotion</small></div><b><Coins size={12} /> {item.reward.toLocaleString()}</b>{item.index === current && <i className="roadmap-current">CURRENT</i>}<ChevronRight size={15} className="roadmap-open" /></button>)}</div></div></div>;
}

function DivisionBrowser({ division, ecosystem, onDivision, onTeam, onClose }: { division: number; ecosystem: EcoTeam[]; onDivision: (division: number) => void; onTeam: (team: EcoTeam) => void; onClose: () => void }) {
  const info = divisions[division];
  const table = ecoTeamsInDivision(ecosystem, division);
  return <div className="league-overlay division-overlay" onClick={onClose}><div className="division-modal" onClick={(event) => event.stopPropagation()}>
    <button className="overlay-close" onClick={onClose}><X size={18} /></button>
    <div className="division-modal-head">
      <div className="division-modal-copy"><div className="eyebrow orange">DIVISION {division + 1} OF 15 · {table.length} CLUBS</div><h2>{info.name}</h2><p>OVR {info.ovrMin}–{info.ovrMax} · Season prize <Coins size={12} /> {info.reward.toLocaleString()} · Click any club to open its scouting report.</p></div>
      <div className="division-switch"><button onClick={() => onDivision(Math.max(0, division - 1))} disabled={division === 0} aria-label="Lower division">−</button><span><b>{division + 1}</b><small>/ 15</small></span><button onClick={() => onDivision(Math.min(divisions.length - 1, division + 1))} disabled={division === divisions.length - 1} aria-label="Higher division">+</button></div>
    </div>
    <div className="league-table division-table">
      <div className="league-table-head"><span>#</span><span>CLUB</span><span>P</span><span>W</span><span>L</span><span>RD</span><span>PTS</span></div>
      {table.map((team, index) => { const rank = index + 1; const zone = rank <= 3 ? 'promotion' : rank >= 14 ? 'relegation' : ''; return <div key={team.id} className={`league-row ${zone}`}>
        <span className="league-rank">{rank}</span>
        <span className="league-club"><button className="team-link" onClick={() => onTeam(team)}>{team.name}</button><small>OVR {team.ovr} · FORM {team.form.length ? team.form.join('-') : '—'}</small></span>
        <span>{team.played}</span><span>{team.wins}</span><span>{team.losses}</span><span>{team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}</span><strong>{team.points}</strong>
      </div>; })}
      {!table.length && <div className="division-empty">No clubs registered in this division yet.</div>}
    </div>
    <div className="division-note"><span className="promotion">1–3 promote at 00:00</span><span className="relegation">14–16 relegate at 00:00</span><span>All 15 divisions move every midnight</span></div>
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
    <div className="roster-foot"><span><Shield size={13} /> {team.played} matches played this season</span><span>Ranks 1–3 promote · 14–16 relegate at 00:00</span></div>
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
    {day && <div className={`recap-day ${day.promoted ? 'up' : day.relegated ? 'down' : ''}`}><div><strong>Daily standings finalized at 00:00</strong><small>Division {day.division + 1} · rank #{day.rank} of 16 · {day.wins}W {day.losses}L</small></div><b>{day.promoted ? <><Sparkles size={14} /> Promoted to Division {nextDivision} · +{day.coins.toLocaleString()} coins</> : day.relegated ? <><RotateCcw size={14} /> Relegated to Division {nextDivision}</> : <><BadgeCheck size={14} /> Stayed in Division {nextDivision}</>}</b></div>}
    <button className="primary-button season-continue" onClick={onClose}>Continue <ChevronRight size={15} /></button>
  </div></div>;
}

function ArenaLive({ opponent, score, round, feed, alive, paused, speed, setSpeed, onPause, onRound, onSkip, result, onExit, broadcast, resultNote }: { opponent: { name: string; ovr: number; reward: number }; score: { us: number; them: number }; round: number; feed: FeedLine[]; alive: { us: number; them: number }; paused: boolean; speed: number; setSpeed: (speed: number) => void; onPause: () => void; onRound: () => void; onSkip: () => void; result: 'win' | 'loss' | null; onExit: () => void; broadcast?: boolean; resultNote?: string }) {
  const dots = Array.from({ length: 10 }, (_, index) => ({ id: index, x: 10 + ((index * 31 + round * 7) % 80), y: 15 + ((index * 47 + round * 5) % 72), team: index < 5 ? 'ct' : 't' }));
  return <div className="arena-live-page"><div className="arena-live-head"><div><div className="eyebrow orange">{broadcast ? <><span className="broadcast-dot" /> LIVE LEAGUE BROADCAST</> : 'LIVE ARENA'} · ROUND {Math.min(round, 24)}</div><div className="live-score"><strong>THE MONGOLZ</strong><b>{score.us}</b><span>:</span><b className="enemy-score">{score.them}</b><strong>{opponent.name.toUpperCase()}</strong></div></div><div className="arena-live-meta"><span><small>ALIVE</small><b>{alive.us} — {alive.them}</b></span><span><small>AI OVR</small><b>{opponent.ovr}</b></span></div></div><div className="arena-live-grid"><div><div className="tactical-map"><div className="map-grid" />{dots.map((dot) => <div className={`tactical-dot ${dot.team}`} style={{ left: `${dot.x}%`, top: `${dot.y}%` }} key={dot.id}><span>{dot.team === 'ct' ? ['910', 'bLitz', 'Senzu', 'Techno4K', 'mzinho'][dot.id] : ['AI-1', 'AI-2', 'AI-3', 'AI-4', 'AI-5'][dot.id - 5]}</span></div>)}<div className="site-marker a">A</div><div className="site-marker b">B</div><span className="map-caption">ANCIENT · TACTICAL VIEW</span></div><div className="arena-controls"><button onClick={onPause} className="control-button">{paused ? <Play size={14} fill="currentColor" /> : <span>Ⅱ</span>} {paused ? 'Play' : 'Pause'}</button>{broadcast ? <span className="broadcast-controls"><span className="broadcast-dot" /> LIVE · 1x speed · no skip</span> : <><button onClick={() => setSpeed(speed === 2 ? 1 : 2)} className={`control-button ${speed === 2 ? 'selected' : ''}`}><Zap size={14} /> 2x Speed</button><button onClick={onRound} className="control-button">Skip Round <ChevronRight size={14} /></button><button onClick={onSkip} className="control-button accent">Skip to Result <Trophy size={14} /></button></>}</div></div><div className="arena-feed"><div className="feed-title"><span>ROUND FEED</span><i>LIVE</i></div>{feed.map((line, index) => <div className={`arena-feed-line ${index === 0 ? 'latest' : ''}`} key={`${line.text}-${index}`}><span />{line.tag && <b className={`feed-tag ${line.tag.toLowerCase()}`}>{line.tag}</b>}{line.text}</div>)}</div></div>{result && <div className="arena-result"><div className={result === 'win' ? 'result-icon win' : 'result-icon loss'}>{result === 'win' ? <Trophy size={28} /> : <Shield size={28} />}</div><div className="eyebrow">MATCH COMPLETE</div><h2>{result === 'win' ? 'VICTORY' : 'DEFEAT'}</h2><p>{resultNote || (result === 'win' ? `You beat ${opponent.name} and earned ${opponent.reward.toLocaleString()} coins.` : `${opponent.name} takes the server this time. Rebuild and try again.`)}</p><button className="primary-button" onClick={onExit}>Return to Arena <ChevronRight size={15} /></button></div>}</div>;
}

function ProfilePage({ profile, setProfile, managerXp, trophies }: { profile: Profile; setProfile: (profile: Profile) => void; managerXp: number; trophies: LeagueTrophy[] }) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [teamName, setTeamName] = useState(profile.teamName);
  const level = managerLevel(managerXp);
  const progress = levelProgress(managerXp);
  const secondSlot = level >= SECOND_PERK_LEVEL;
  const vip = level >= VIP_LEVEL;
  const save = (): void => setProfile({ ...profile, nickname: nickname.trim() || 'Manager', teamName: teamName.trim() || 'The MongolZ' });
  const perkIcon = (perk: Perk, size: number): ReactNode => perk === 'Tactical Genius' ? <Target size={size} /> : perk === 'Aim Coach' ? <Crosshair size={size} /> : <Search size={size} />;
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
        <p>{profile.teamName}</p>
        <div className="profile-level">
          <span>SEASON LEVEL</span>
          <strong>{level}</strong>
          <div><i style={{ width: `${progress}%` }} /></div>
          <small>{managerXp - levelFloorXp(level)} / {XP_STEP} XP · next level +{LEVEL_REWARD.toLocaleString()} coins</small>
        </div>
        <div className="level-rewards">
          <div className="level-reward unlocked"><BadgeCheck size={13} /><span>LV 1</span><strong>1 active perk</strong></div>
          <div className={`level-reward ${secondSlot ? 'unlocked' : ''}`}>{secondSlot ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 5</span><strong>2nd perk slot</strong></div>
          <div className={`level-reward ${vip ? 'unlocked' : ''}`}>{vip ? <BadgeCheck size={13} /> : <Lock size={13} />}<span>LV 10</span><strong>VIP −15% store</strong></div>
        </div>
        <div className="trophy-cabinet">
          <div className="eyebrow">TROPHY CABINET {trophies.length > 0 && <b className="trophy-count">{trophies.length}</b>}</div>
          {trophies.length ? <div className="trophy-list">{[...trophies].reverse().map((trophy) => <div className="trophy-item" key={`${trophy.season}-${trophy.division}-${trophy.place}`}><Trophy size={16} /><span><strong>{trophy.division}</strong><small>Season {trophy.season} · #{trophy.place}</small></span></div>)}</div> : <p className="trophy-empty">Finish top 3 in a league season to lift your first trophy.</p>}
        </div>
      </div>
      <div className="profile-settings">
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
          <div className="eyebrow">MANAGER PERKS</div>
          <p className="perk-hint">Slot 1 is always active. Slot 2 unlocks at Level {SECOND_PERK_LEVEL}{vip ? ' · VIP discount active' : ''}.</p>
          <div className="perk-slot-label">SLOT 1 · ACTIVE</div>
          <div className="perk-picker">{(['Tactical Genius', 'Aim Coach', 'Scout Master'] as Perk[]).map((perk) => perkButton(perk, 1))}</div>
          <div className="perk-slot-label">SLOT 2 {!secondSlot && <span><Lock size={10} /> LEVEL {SECOND_PERK_LEVEL}</span>}</div>
          {secondSlot
            ? <div className="perk-picker">{(['Tactical Genius', 'Aim Coach', 'Scout Master'] as Perk[]).map((perk) => perkButton(perk, 2))}</div>
            : <div className="perk-locked"><Lock size={16} /><span><strong>Second perk slot locked</strong><small>Reach Level {SECOND_PERK_LEVEL} to run two perks at once.</small></span></div>}
        </div>
        <button onClick={save} className="primary-button profile-save"><Pencil size={14} /> Save Profile</button>
      </div>
    </div>
  </>;
}

function CreationModal({ onComplete }: { onComplete: (profile: Profile) => void }) { const [profile, setProfile] = useState<Profile>(createProfile); const complete = (): void => onComplete({ ...profile, nickname: profile.nickname.trim() || 'Coach' }); return <div className="creation-screen"><div className="creation-panel"><div className="creation-intro"><div className="ut-logo centered"><div className="ut-logo-icon"><Crosshair size={22} /></div><div><strong>CS2</strong><span>ULTIMATE TEAM</span></div></div><div className="eyebrow orange">WELCOME TO {seasonLabel(1).toUpperCase()}</div><h1>Build your legacy.</h1><p>Assemble a squad from the biggest names in Counter-Strike and take your club to the Major.</p><div className="intro-points"><span><Sparkles size={15} /> {database.length} real player cards</span><span><Trophy size={15} /> 5 card tiers</span><span><Coins size={15} /> 2,500 starter coins</span></div></div><div className="creation-form"><div className="eyebrow">MANAGER SETUP · 01</div><h2>Who is calling the shots?</h2><label className="creation-label"><span>Manager Nickname</span><input autoFocus value={profile.nickname} onChange={(event) => setProfile({ ...profile, nickname: event.target.value })} placeholder="Enter your nickname" maxLength={22} /></label><label className="creation-label"><span>Team Name</span><input value={profile.teamName} onChange={(event) => setProfile({ ...profile, teamName: event.target.value })} maxLength={22} /></label><div className="creation-label"><span>Choose your manager avatar</span><div className="avatar-picker creation-avatars">{(Object.keys(avatarDetails) as Avatar[]).map((avatar) => <button key={avatar} onClick={() => setProfile({ ...profile, avatar })} className={profile.avatar === avatar ? 'selected' : ''} style={{ '--avatar-color': avatarDetails[avatar].color } as React.CSSProperties}><span>{avatarDetails[avatar].icon}</span><small>{avatarDetails[avatar].label}</small></button>)}</div></div><div className="creation-label"><span>Select your team perk</span><div className="perk-picker creation-perks">{(['Tactical Genius', 'Aim Coach', 'Scout Master'] as Perk[]).map((perk) => <button key={perk} onClick={() => setProfile({ ...profile, perk })} className={profile.perk === perk ? 'selected' : ''}><span className="perk-icon">{perk === 'Tactical Genius' ? <Target size={16} /> : perk === 'Aim Coach' ? <Crosshair size={16} /> : <Search size={16} />}</span><span><strong>{perk}</strong><small>{perkDetails[perk]}</small></span></button>)}</div></div><button className="primary-button creation-submit" onClick={complete}>Create manager & open starter squad <ChevronRight size={16} /></button></div></div></div>; }

function PackOverlay({ pack, onClose, onReveal, onRevealAll, onContinue }: { pack: PackCard[]; onClose: () => void; onReveal: (instanceId: string) => void; onRevealAll: () => void; onContinue: () => void }) { const revealedCount = pack.filter((card) => card.revealed).length; return <div className="pack-overlay"><div className="pack-modal"><button className="overlay-close" onClick={onClose}><X size={18} /></button><div className="eyebrow orange">PACK OPENING · SAVED TO CLUB</div><h2>Reveal your players</h2><p>Every card is already secured in My Club. Reveal them now, then review your new collection.</p><div className="pack-cards">{pack.map((card) => <div className="reveal-wrap" key={card.instanceId}>{card.revealed ? <div className="revealed-card"><FutCard card={card} isNew /><div className="revealed-actions"><span className="actioned"><BadgeCheck size={14} /> Saved to My Club</span></div></div> : <button className="face-down" onClick={() => onReveal(card.instanceId)}><div className="face-logo"><Crosshair size={30} /><span>CS2</span></div><div className="face-lines" /><span>CLICK TO REVEAL</span></button>}</div>)}</div><div className="reveal-footer"><span>{revealedCount} / {pack.length} revealed</span>{revealedCount < pack.length ? <button className="primary-button" onClick={onRevealAll}><Sparkles size={15} /> Reveal All</button> : <button className="primary-button" onClick={onContinue}>Continue to My Club <ChevronRight size={15} /></button>}</div></div></div>; }

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) { return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function countryFlag(country: string): string { const flags: Record<string, string> = { BR: '🇧🇷', SK: '🇸🇰', UA: '🇺🇦', RU: '🇷🇺', DE: '🇩🇪', PL: '🇵🇱', RO: '🇷🇴', IL: '🇮🇱', MN: '🇲🇳', LT: '🇱🇹', FI: '🇫🇮', DK: '🇩🇰', HU: '🇭🇺', EE: '🇪🇪', BA: '🇧🇦', FR: '🇫🇷', LV: '🇱🇻', NO: '🇳🇴', CA: '🇨🇦', US: '🇺🇸', SE: '🇸🇪', TR: '🇹🇷', PT: '🇵🇹', BY: '🇧🇾', GB: '🇬🇧', MK: '🇲🇰', ZA: '🇿🇦', KZ: '🇰🇿' }; return flags[country] ?? '🏳️'; }
function calculateChemistry(cards: OwnedCard[], perks: Perk[]): number { if (!cards.length) return 0; const teams = new Set(cards.map((card) => card.team)); const countries = new Set(cards.map((card) => card.country)); const links = cards.reduce((sum, card, index) => sum + cards.slice(index + 1).filter((other) => other.team === card.team || other.country === card.country).length, 0); return Math.min(100, Math.round((cards.length / 5) * 48 + Math.min(30, links * 7) + Math.max(0, teams.size === 1 ? 12 : 0) + Math.max(0, countries.size === 1 ? 8 : 0) + (perks.includes('Tactical Genius') ? 3 : 0))); }

export default App;
