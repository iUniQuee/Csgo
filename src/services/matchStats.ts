import type { Duelist, SimRole } from '../matchEngine';

export type ScoreboardSide = 'us' | 'them';

export type ScoreboardRow = {
  name: string;
  role: SimRole;
  team: ScoreboardSide;
  kills: number;
  deaths: number;
  adr: number;
  rating: number;
  mvp: boolean;
};

export type MatchScoreboard = {
  opponentName: string;
  rows: ScoreboardRow[];
  mvp: ScoreboardRow;
  rounds: number;
  score: { us: number; them: number };
  bonus: number;
};

const SLOTS: SimRole[] = ['Entry', 'AWPer', 'IGL', 'Rifler', 'Lurker'];
const ROLE_LABEL: Record<SimRole, string> = { Entry: 'Entry', AWPer: 'AWPer', IGL: 'IGL', Rifler: 'Rifler', Lurker: 'Lurker' };

type Acc = { name: string; role: SimRole; skill: number; kills: number; deaths: number };

const rand = (): number => Math.random();

/** Weighted random index so the best-rated players collect more of a round's kills. */
const pickWeighted = (players: Acc[]): number => {
  const weights = players.map((player) => Math.pow(Math.max(0.15, player.skill) / 100, 2.4) + 0.05);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rand() * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return index;
  }
  return weights.length - 1;
};

const addKills = (players: Acc[], amount: number): void => {
  for (let index = 0; index < amount; index += 1) players[pickWeighted(players)].kills += 1;
};

/** Spread a number of deaths across a team, weighted toward the fraggers who entry first. */
const addDeaths = (players: Acc[], amount: number): void => {
  for (let index = 0; index < amount; index += 1) players[pickWeighted(players)].deaths += 1;
};

const buildOurs = (squad: Duelist[]): Acc[] => {
  const used = new Set<number>();
  return SLOTS.map((role) => {
    let found = squad.findIndex((player, index) => !used.has(index) && player.role === role);
    if (found < 0) found = squad.findIndex((_, index) => !used.has(index));
    if (found < 0) return { name: `Academy ${ROLE_LABEL[role]}`, role, skill: 55, kills: 0, deaths: 0 };
    used.add(found);
    const duelist = squad[found];
    return {
      name: duelist.name,
      role,
      skill: duelist.ovr * 0.55 + duelist.aim * 0.3 + duelist.rfl * 0.15,
      kills: 0,
      deaths: 0,
    };
  });
};

const buildTheirs = (opponentName: string, opponentOvr: number): Acc[] =>
  SLOTS.map((role, index) => ({
    name: `${opponentName} #${index + 1}`,
    role,
    skill: opponentOvr + (rand() - 0.5) * 8,
    kills: 0,
    deaths: 0,
  }));

/**
 * Builds a coherent 5v5 HLTV-style scoreboard for a finished match.
 * Each round awards five kills to the winning side and its survivor count decides
 * how many kills the losing side picked up, so team kill/death totals line up.
 */
export function buildScoreboard(
  squad: Duelist[],
  opponent: { name: string; ovr: number },
  score: { us: number; them: number },
): MatchScoreboard {
  const ours = buildOurs(squad);
  const theirs = buildTheirs(opponent.name, opponent.ovr);
  const rounds = Math.max(1, score.us + score.them);

  const winners: ScoreboardSide[] = [
    ...Array.from({ length: Math.max(0, score.us) }, () => 'us' as const),
    ...Array.from({ length: Math.max(0, score.them) }, () => 'them' as const),
  ];
  while (winners.length < rounds) winners.push(rand() > 0.5 ? 'us' : 'them');
  for (let index = winners.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    [winners[index], winners[swap]] = [winners[swap], winners[index]];
  }

  winners.slice(0, rounds).forEach((winner) => {
    const winningTeam = winner === 'us' ? ours : theirs;
    const losingTeam = winner === 'us' ? theirs : ours;
    const survivors = Math.floor(rand() * 5);
    addKills(winningTeam, 5);
    addKills(losingTeam, 5 - survivors);
    addDeaths(losingTeam, 5);
    addDeaths(winningTeam, 5 - survivors);
  });

  const rows: ScoreboardRow[] = [...ours, ...theirs].map((player) => {
    const side: ScoreboardSide = ours.includes(player) ? 'us' : 'them';
    const killsPerRound = player.kills / rounds;
    const deathsPerRound = player.deaths / rounds;
    const adr = Math.max(28, Math.min(158, Math.round(48 + killsPerRound * 52 + rand() * 16 - deathsPerRound * 3)));
    const kd = player.deaths === 0 ? player.kills : player.kills / player.deaths;
    const rating = Math.max(0.35, Math.min(1.95, Number((0.58 + kd * 0.28 + (adr - 70) / 320 + rand() * 0.06).toFixed(2))));
    return { name: player.name, role: player.role, team: side, kills: player.kills, deaths: player.deaths, adr, rating, mvp: false };
  });

  const mvp = [...rows].sort((a, b) => b.rating - a.rating || b.kills - a.kills || a.deaths - b.deaths)[0];
  mvp.mvp = true;
  rows.sort((a, b) => (a.team === b.team ? b.rating - a.rating : a.team === 'us' ? -1 : 1));

  return { opponentName: opponent.name, rows, mvp, rounds, score, bonus: mvp.team === 'us' ? 50 : 0 };
}
