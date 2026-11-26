/**
 * Dynamic 240-slot multiplayer matchmaking engine.
 *
 * The competitive ladder is a fixed grid: 15 divisions x 16 teams = 240 base seats.
 * Every division is one or more 16-team rooms ("Zone A", "Zone B", ...). Real humans
 * always keep a seat: a bot is removed to make room, and a full room of humans opens
 * a new zone (except Division 15, which is a single Top 16 World Elite room).
 *
 * Everything in this module is pure: no React, no storage, no network.
 */

export const DIVISION_COUNT = 15;
export const ZONE_SIZE = 16;
export const BASE_SLOTS = DIVISION_COUNT * ZONE_SIZE; // 240
export const MAX_ZONES = 8; // hard safety cap per division
export const PROMOTION_SLOTS = 3;
export const RELEGATION_SLOTS = 3;

export type TeamKind = 'player' | 'human' | 'bot';

export type SquadCard = {
  name: string;
  role: string;
  level: number;
  ovr: number;
  team?: string;
  country?: string;
};

export type LeagueTeam = {
  id: string;
  name: string;
  ovr: number;
  played: number;
  wins: number;
  losses: number;
  roundDiff: number;
  points: number;
  /** 'player' = local user, 'human' = real online manager, 'bot' = AI pro team. */
  kind?: TeamKind;
  manager?: string;
  avatar?: string;
  perk?: string;
  perk2?: string;
  squad?: SquadCard[];
  /** Arrival ticket: a mid-day joiner sits below every team already in the room on 0 points. */
  joinedAt?: number;
};

export type BotSeed = { id: string; name: string; ovr: number };

export type HumanSeed = {
  id: string;
  name: string;
  manager: string;
  kind?: 'player' | 'human';
  avatar?: string;
  perk?: string;
  perk2?: string;
  squad?: SquadCard[];
  ovr?: number;
};

export type ZoneTable = LeagueTeam[];

export type JoinResult = {
  zones: ZoneTable[];
  /** Index of the zone the human landed in (0 = Zone A). -1 when there was no seat. */
  zone: number;
  zoneCount: number;
  /** Id of the bot that lost its seat, when a bot was removed. */
  replacedBot: string | null;
  /** True when every room was full of humans and the division has no new zone. */
  overflow: boolean;
};

export type Movement = {
  promoted: boolean;
  relegated: boolean;
  next: number;
};

const LEVEL_BONUS: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 };

export const zoneLabel = (index: number): string => `Zone ${String.fromCharCode(65 + Math.max(0, Math.min(25, index)))}`;

export const teamKind = (team: LeagueTeam): TeamKind => team.kind ?? 'bot';

export const isHumanTeam = (team: LeagueTeam): boolean => teamKind(team) !== 'bot';

export const cardPower = (card: SquadCard): number => Math.min(99, card.ovr + (LEVEL_BONUS[Math.min(5, Math.max(1, card.level))] ?? 0));

/** Team OVR of a 5-card squad: average card power, rounded. */
export function squadOvr(cards: SquadCard[]): number {
  if (!cards.length) return 50;
  const total = cards.reduce((sum, card) => sum + cardPower(card), 0);
  return Math.round(total / cards.length);
}

/** League table order: points, round difference, wins, then OVR. */
export function compareTeams(a: LeagueTeam, b: LeagueTeam): number {
  return b.points - a.points || b.roundDiff - a.roundDiff || b.wins - a.wins || (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || b.ovr - a.ovr || a.name.localeCompare(b.name);
}

export const sortZone = (teams: ZoneTable): ZoneTable => [...teams].sort(compareTeams);

export function rankInZone(teams: ZoneTable, teamId: string): number {
  const index = sortZone(teams).findIndex((team) => team.id === teamId);
  return index < 0 ? teams.length : index + 1;
}

/** The last bot in league order: Rank 16 first, then 15, 14, ... */
export function lowestRankedBot(teams: ZoneTable): LeagueTeam | null {
  const bots = sortZone(teams).filter((team) => teamKind(team) === 'bot');
  return bots.length ? bots[bots.length - 1] : null;
}

const emptyStats = { played: 0, wins: 0, losses: 0, roundDiff: 0, points: 0 } as const;

export function createBotTeam(bot: BotSeed, division: number, zone: number): LeagueTeam {
  return {
    ...emptyStats,
    id: `${bot.id}-d${division + 1}-z${zone + 1}`,
    name: bot.name,
    ovr: bot.ovr,
    kind: 'bot',
  };
}

/** A real manager / the local player enters a fresh season with an empty record. */
export function createHumanTeam(seed: HumanSeed): LeagueTeam {
  const squad = seed.squad ?? [];
  return {
    ...emptyStats,
    id: seed.id,
    name: seed.name,
    ovr: seed.ovr ?? squadOvr(squad),
    kind: seed.kind ?? 'human',
    manager: seed.manager,
    avatar: seed.avatar,
    perk: seed.perk,
    perk2: seed.perk2,
    squad,
  };
}

function rotate<T>(items: T[], offset: number): T[] {
  if (!items.length) return items;
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Build one room: the humans that belong here plus AI pro teams for every free seat,
 * in that order. Always returns `ZONE_SIZE` teams when the bot pool is large enough.
 */
export function createZone(opts: { division: number; zone?: number; bots: BotSeed[]; humans?: LeagueTeam[] }): ZoneTable {
  const zone = opts.zone ?? 0;
  const humans = (opts.humans ?? []).slice(0, ZONE_SIZE);
  const teams: ZoneTable = humans.map((team) => ({ ...team }));
  for (const bot of rotate(opts.bots, zone * ZONE_SIZE)) {
    if (teams.length >= ZONE_SIZE) break;
    teams.push(createBotTeam(bot, opts.division, zone));
  }
  return teams.slice(0, ZONE_SIZE);
}

/**
 * Seat a human in an existing room by removing the lowest-ranked bot.
 * The human is appended at the bottom of the table with 0 points.
 */
export function joinZone(teams: ZoneTable, human: LeagueTeam): { teams: ZoneTable; replacedBot: string | null } | null {
  if (teams.length < ZONE_SIZE) {
    const ticket = Math.max(0, ...teams.map((team) => team.joinedAt ?? 0)) + 1;
    return { teams: [...teams, { ...human, points: 0, joinedAt: ticket }], replacedBot: null };
  }
  const victim = lowestRankedBot(teams);
  if (!victim) return null;
  const remaining = teams.filter((team) => team.id !== victim.id);
  const ticket = Math.max(0, ...teams.map((team) => team.joinedAt ?? 0)) + 1;
  return { teams: [...remaining, { ...human, points: 0, joinedAt: ticket }], replacedBot: victim.id };
}

/**
 * Assign a human to a division.
 *
 * - Existing zones are filled first (bot replacement, lowest rank first).
 * - Divisions 1-14 open Zone B, Zone C, ... once every room is 16 real humans.
 * - Division 15 never opens a second zone: 16 seats, World Elite only.
 */
export function assignHumanToDivision(
  zones: ZoneTable[],
  human: LeagueTeam,
  opts: { division: number; botFactory: (zone: number) => BotSeed[] },
): JoinResult {
  const next = zones.map((zone) => zone.map((team) => ({ ...team })));
  for (let index = 0; index < next.length; index += 1) {
    const seated = joinZone(next[index], human);
    if (seated) {
      next[index] = seated.teams;
      return { zones: next, zone: index, zoneCount: next.length, replacedBot: seated.replacedBot, overflow: false };
    }
  }
  const lastDivision = opts.division >= DIVISION_COUNT - 1;
  if (!lastDivision && next.length < MAX_ZONES) {
    const zoneIndex = next.length;
    const room = createZone({ division: opts.division, zone: zoneIndex, bots: opts.botFactory(zoneIndex) });
    const seated = joinZone(room, human);
    if (seated) {
      next.push(seated.teams);
      return { zones: next, zone: zoneIndex, zoneCount: next.length, replacedBot: seated.replacedBot, overflow: false };
    }
  }
  return { zones: next, zone: 0, zoneCount: next.length, replacedBot: null, overflow: true };
}

/**
 * Promotion seats for a division table.
 * The Global Elite room (Div 15) always takes exactly the 3 highest scorers from Div 14,
 * no matter how many zones Div 14 has. Every other division gives 3 seats to a single
 * zone and 2 seats per zone once the division is split.
 */
export function promotionSlots(fromDivision: number, zoneCount: number): number {
  if (fromDivision + 1 >= DIVISION_COUNT - 1) return PROMOTION_SLOTS;
  return Math.max(1, zoneCount) > 1 ? 2 : PROMOTION_SLOTS;
}

export function divisionOutcome(division: number, rank: number, zoneCount = 1): Movement {
  const promoted = rank <= promotionSlots(division, zoneCount) && division < DIVISION_COUNT - 1;
  const relegated = rank > ZONE_SIZE - RELEGATION_SLOTS && division > 0;
  return {
    promoted,
    relegated,
    next: promoted ? division + 1 : relegated ? division - 1 : division,
  };
}

export type ConsolidationResult = {
  zones: ZoneTable[];
  zoneCount: number;
  /** Div 15 safety valve: humans that could not fit into the 16 World Elite seats. */
  overflow: LeagueTeam[];
};

/**
 * 00:00 consolidation: pack every human upward into Zone A first, then Zone B, ...
 * and fill the remaining empty seats with AI pro teams for the new day.
 * Div 15 is never split; any extra humans beyond 16 are returned as overflow.
 */
export function consolidateZones(
  zones: ZoneTable[],
  opts: { division: number; botFactory: (zone: number) => BotSeed[] },
): ConsolidationResult {
  const humans = zones
    .flat()
    .filter(isHumanTeam)
    .sort(compareTeams);
  const lastDivision = opts.division >= DIVISION_COUNT - 1;
  const seated = lastDivision ? humans.slice(0, ZONE_SIZE) : humans.slice(0, ZONE_SIZE * MAX_ZONES);
  const overflow = lastDivision ? humans.slice(ZONE_SIZE) : [];
  const zoneCount = Math.max(1, Math.ceil(seated.length / ZONE_SIZE));
  const nextZones: ZoneTable[] = [];
  for (let index = 0; index < zoneCount; index += 1) {
    const roomHumans = seated.slice(index * ZONE_SIZE, (index + 1) * ZONE_SIZE);
    nextZones.push(createZone({ division: opts.division, zone: index, bots: opts.botFactory(index), humans: roomHumans }));
  }
  return { zones: nextZones, zoneCount, overflow };
}
