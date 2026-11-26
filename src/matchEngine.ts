export type SimRole = 'Entry' | 'AWPer' | 'IGL' | 'Rifler' | 'Lurker';

export type Duelist = {
  name: string;
  role: SimRole;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
};

export type FeedTag = 'AWP' | 'CLUTCH' | 'ACE' | 'ROUND';

export type FeedLine = { text: string; tag?: FeedTag };

export type RoundInput = {
  squad: Duelist[];
  teamRating: number;
  chemistry: number;
  perks: string[];
  opponentName: string;
  opponentOvr: number;
  round: number;
};

export type RoundSim = {
  usWon: boolean;
  lines: FeedLine[];
  usAlive: number;
  themAlive: number;
  mvp: string;
};

const ROLES: SimRole[] = ['Entry', 'AWPer', 'IGL', 'Rifler', 'Lurker'];
const ENEMY_ROLES: SimRole[] = ['Entry', 'AWPer', 'Rifler', 'Lurker', 'IGL'];
const ENEMY_OFFSETS = [-2, 1, 2, -1, 0];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** Weighted duel rating: aim dominates, reflexes support it. */
export const duelRating = (player: Duelist, bonus = 0): number => clamp(player.aim * 0.62 + player.rfl * 0.38 + bonus, 0, 120);

/** Logistic duel odds — a 10-14 rating edge is roughly a 74-82% duel win chance. */
export const duelWinChance = (attacker: Duelist, defender: Duelist, attackerBonus = 0, defenderBonus = 0): number => {
  const diff = duelRating(attacker, attackerBonus) - duelRating(defender, defenderBonus);
  return clamp(1 / (1 + Math.pow(10, -diff / 22)), 0.05, 0.95);
};

/** Clutch boost once a player is the last one standing (1vN). */
const clutchBonus = (player: Duelist): number => clamp(3 + (player.clt - 80) * 0.4, 2, 9);

const TEAM_CHEM_SCALE = 25;

type Alive = { unit: Duelist; bonus: number };

const buildSquad = (input: RoundInput, teamBonus: number): Alive[] => {
  const base = clamp(input.teamRating > 0 ? input.teamRating : 70, 50, 99);
  return ROLES.map((role) => {
    const found = input.squad.find((player) => player.role === role);
    const unit: Duelist = found ?? { name: `Academy ${role}`, role, ovr: base, aim: base, rfl: base, sns: base, clt: base };
    return { unit, bonus: teamBonus };
  });
};

const buildOpponent = (input: RoundInput): Alive[] =>
  ENEMY_ROLES.map((role, index) => {
    const ovr = clamp(input.opponentOvr + ENEMY_OFFSETS[index], 50, 99);
    const unit: Duelist = {
      name: `${input.opponentName} #${index + 1}`,
      role,
      ovr,
      aim: clamp(ovr + (role === 'Entry' ? 2 : 1), 0, 99),
      rfl: clamp(ovr, 0, 99),
      sns: clamp(ovr + (role === 'AWPer' ? 3 : -2), 0, 99),
      clt: clamp(ovr - 1, 0, 99),
    };
    return { unit, bonus: 0 };
  });

export function simulateRound(input: RoundInput): RoundSim {
  const round = input.round;
  const perks = input.perks;
  const teamBonus = clamp(input.chemistry / TEAM_CHEM_SCALE, 0, 4) + (perks.includes('Aim Coach') ? 2 : 0) + (perks.includes('Tactical Genius') ? 1 : 0);
  const us = buildSquad(input, teamBonus);
  const them = buildOpponent(input);

  const ourNames = new Set(us.map((entry) => entry.unit.name));
  const lines: FeedLine[] = [];
  const kills = new Map<string, number>();
  const bump = (player: Alive): number => {
    const next = (kills.get(player.unit.name) ?? 0) + 1;
    kills.set(player.unit.name, next);
    if (next === 5) lines.push({ tag: 'ACE', text: `R${round} [${player.unit.name}] ACES the round — five kills, no answer.` });
    return next;
  };
  const trade = (winner: Alive, loser: Alive, note?: string): void => {
    lines.push({ text: `R${round} [${winner.unit.name}] ${note ?? 'wins the duel'} over ${loser.unit.name} (${us.length}v${them.length}).` });
  };

  // Opening phase — Entry fraggers take the first duel, AWPers can steal an opening pick on a long angle.
  const ourAwp = us.find((entry) => entry.unit.role === 'AWPer');
  const ourEntry = us.find((entry) => entry.unit.role === 'Entry');
  const theirEntry = them.find((entry) => entry.unit.role === 'Entry') ?? them[0];
  const awpChance = clamp(0.22 + ((ourAwp?.unit.sns ?? 70) - 70) / 110 + teamBonus / 45, 0.12, 0.62);

  if (ourAwp && Math.random() < awpChance) {
    const victim = pick(them);
    bump(ourAwp);
    them.splice(them.indexOf(victim), 1);
    lines.push({ tag: 'AWP', text: `R${round} [${ourAwp.unit.name}] AWP opening pick on ${victim.unit.name} — long angle held, ${them.length} left.` });
  } else if (ourEntry) {
    const won = Math.random() < duelWinChance(ourEntry.unit, theirEntry.unit, ourEntry.bonus + 2, theirEntry.bonus);
    if (won) {
      bump(ourEntry);
      them.splice(them.indexOf(theirEntry), 1);
      lines.push({ text: `R${round} [${ourEntry.unit.name}] entry frags ${theirEntry.unit.name} to open the site (${us.length}v${them.length}).` });
    } else {
      bump(theirEntry);
      us.splice(us.indexOf(ourEntry), 1);
      lines.push({ text: `R${round} [${theirEntry.unit.name}] stops our entry push — ${us.length}v${them.length}.` });
    }
  }

  let clutchHero: Alive | null = null;
  let clutchEnemies = 0;
  let clutchKills = 0;

  while (us.length && them.length) {
    if (us.length === 1) {
      clutchHero = clutches(clutchHero, us[0]);
      if (!clutchEnemies) clutchEnemies = them.length;
    }
    const attacker = pick(us);
    const defender = pick(them);
    const clutchEdge = us.length === 1 ? clutchBonus(attacker.unit) : 0;
    const enemyEdge = them.length === 1 ? clutchBonus(defender.unit) : 0;
    const usWins = Math.random() < duelWinChance(attacker.unit, defender.unit, attacker.bonus + clutchEdge, defender.bonus + enemyEdge);
    if (usWins) {
      bump(attacker);
      them.splice(them.indexOf(defender), 1);
      if (us.length === 1 && clutchHero) clutchKills += 1;
      trade(attacker, defender);
    } else {
      bump(defender);
      us.splice(us.indexOf(attacker), 1);
      trade(defender, attacker);
    }
  }

  const usWon = them.length === 0;
  if (usWon && clutchHero && clutchKills >= 2) {
    lines.push({ tag: 'CLUTCH', text: `R${round} [${clutchHero.unit.name}] closes it out with a 1v${clutchEnemies} clutch — ${clutchKills} straight duels under pressure.` });
  }

  const mvp = [...kills.entries()].filter(([name]) => ourNames.has(name)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? [...ourNames][0] ?? '910';

  return { usWon, lines, usAlive: us.length, themAlive: them.length, mvp };
}

// Keeps the clutch hero reference stable across loop iterations.
function clutches(current: Alive | null, next: Alive): Alive {
  return current ?? next;
}
