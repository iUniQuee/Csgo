/**
 * 240-team CS2 ranking ecosystem: 15 divisions x 16 clubs.
 * Everything is local, deterministic and seeded — no external APIs.
 */

export type EcoRole = 'AWPer' | 'Entry' | 'IGL' | 'Rifler' | 'Support';

export type EcoPlayer = {
  name: string;
  role: EcoRole;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
};

export type EcoTeam = {
  id: string;
  name: string;
  division: number;
  ovr: number;
  played: number;
  wins: number;
  losses: number;
  roundDiff: number;
  points: number;
  form: ('W' | 'L')[];
};

export type EcoState = {
  day: string;
  month: string;
  teams: EcoTeam[];
};

export type OvrRange = { min: number; max: number };

export const ECO_STORAGE_KEY = 'cs2-ecosystem';
export const ECO_DIVISIONS = 15;
export const ECO_TEAMS_PER_DIVISION = 16;

/* ------------------------------------------------------------------ */
/* Team names, strongest division first (index 0 = Division 15)        */
/* ------------------------------------------------------------------ */

const ELITE = [
  'FURIA', 'MOUZ', 'Team Spirit', 'Team Vitality', 'Team Falcons', 'Aurora', 'BetBoom Team', 'NAVI',
  'Nemiga', 'The MongolZ', 'FUT Esports', 'G2 Esports', 'PARIVISION', '1WIN', 'Legacy', 'MIBR',
];

const SUPREME_ELITE = [
  'Team Liquid', '9z', 'Astralis', 'FaZe Clan', 'Eternal Fire', 'NiP', 'fnatic', 'M80',
  'HEROIC', 'B8', 'Luminosity', 'GamerLegion', 'BIG', 'TYLOO', 'HOTU', 'Sangal',
];

const MAJOR_ELITE = [
  'paiN Gaming', 'Wildcard', 'Lynn Vision', 'SINNERS', 'NRG', 'Imperial', 'ATOX', 'Chinggis Warriors',
  'SAW', '3DMAX', 'Virtus.pro', 'Complexity', 'ENCE', 'OG', 'Cloud9', 'Sharks Esports',
];

const PRIME = [
  'Fluxo', 'RED Canids', 'TeamOne', 'BESTIA', 'Isurus', 'W7M Esports', 'Case Esports', 'Movistar Riders',
  'KOI', 'Bravos', 'Rebels Gaming', 'Zero Tenacity', 'ECLOT', 'Sampi', 'Enterprise', 'ALTERNATE aTTaX',
];

const EAGLE = [
  'Apeks', 'Endpoint', 'Into the Breach', 'GODSENT', 'Entropiq', 'forZe', 'K23', 'Illuminar',
  'Budapest Five', 'PACT', 'eSuba', 'Team Universe', 'Ambush Esports', 'Nexus', 'Dynamo Eclot', 'Partizan',
];

const PRO = [
  'ECSTATIC', 'MASONIC', 'Sprout', 'Sashi', 'Tricked', 'Viperio', 'GTZ Esports', 'Rogue',
  'Forsaken', 'KOVA', 'Dignitas', 'Noble', 'Villainous', 'Reason Gaming', 'Wicked Gaming', 'Team BLVK',
];

const WORLD_CLASS = [
  'TeamSolid', 'ODDIK', 'Galo do Cerrado', 'Dusty Roots', 'Hype Gaming', 'Patins da Ferrari', 'Meta Gaming', 'Boca Juniors Gaming',
  'Corinthians Esports', 'Fuscão', 'Flamengo Esports', 'Los Grandes', 'Vivo Keyd Stars', 'INTZ', 'Santos e-Sports', 'Cruzeiro Esports',
];

const SUPREME_LEGEND = [
  'Rare Atom', 'Newhappy', 'Wings Up', 'Invictus Gaming', 'Survivor Gaming', 'Clutch Gaming', 'Ground Zero', 'Rooster',
  'Grayhound', 'VERTEX', 'KZG', 'Mindfreak', 'SemperFi', 'DXA Esports', 'Bandits', 'Steel Helmet',
];

const ACADEMY_ORGS = [
  'NAVI', 'Spirit', 'MOUZ', 'FURIA', 'The MongolZ', 'Vitality', 'G2', 'FaZe', 'Liquid', 'Astralis',
  'NiP', 'fnatic', 'HEROIC', 'BIG', 'ENCE', 'paiN', 'Imperial', 'Complexity', 'Virtus.pro', '9z',
  'MIBR', 'Legacy', 'BetBoom', 'Aurora', 'Falcons', 'TYLOO', 'Rare Atom', 'ATOX', 'Chinggis Warriors', 'SAW',
  '3DMAX', 'GamerLegion', 'B8', 'Nemiga', 'PARIVISION', 'Wildcard', 'NRG', 'M80',
];

const ACADEMY_SUFFIXES = ['Academy', 'Junior', 'NXT', 'Youth', 'Prospects', 'Rising', 'Development', 'Talents', 'Reserve', 'Blue'];

const academyLabel = (org: string): string => (org === 'The MongolZ' ? 'MongolZ' : org);

const ACADEMY_TEAMS: string[] = (() => {
  const names: string[] = [];
  for (const suffix of ACADEMY_SUFFIXES) {
    for (const org of ACADEMY_ORGS) {
      names.push(`${academyLabel(org)} ${suffix}`);
    }
  }
  return names;
})();

const TOP_DIVISIONS: string[][] = [ELITE, SUPREME_ELITE, MAJOR_ELITE, PRIME, EAGLE, PRO, WORLD_CLASS, SUPREME_LEGEND];

/** Names grouped by division index (0 = Bronze/Division 1 ... 14 = Global Elite). */
const DIVISION_POOLS: string[][] = (() => {
  const pools: string[][] = [];
  for (let index = 0; index < ECO_DIVISIONS; index += 1) {
    const topIndex = ECO_DIVISIONS - 1 - index;
    if (topIndex >= 0) {
      pools[index] = TOP_DIVISIONS[topIndex];
    } else {
      pools[index] = [];
    }
  }
  // Divisions 1-7: 111 academy / regional clubs, strongest names in Division 7.
  let cursor = 0;
  for (let index = 6; index >= 0; index -= 1) {
    const size = index === 0 ? 15 : 16;
    pools[index] = ACADEMY_TEAMS.slice(cursor, cursor + size);
    cursor += size;
  }
  return pools;
})();

/* ------------------------------------------------------------------ */
/* Real 5-man rosters for the top 44 clubs                             */
/* ------------------------------------------------------------------ */

const REAL_ROSTERS: Record<string, [string, EcoRole][]> = {
  FURIA: [['molodoy', 'AWPer'], ['YEKINDAR', 'Entry'], ['FalleN', 'IGL'], ['yuurih', 'Rifler'], ['KSCERATO', 'Support']],
  MOUZ: [['torzsi', 'AWPer'], ['Brollan', 'Entry'], ['xertioN', 'IGL'], ['Jimpphat', 'Rifler'], ['spinx', 'Support']],
  'Team Spirit': [['sh1ro', 'AWPer'], ['donk', 'Entry'], ['chopper', 'IGL'], ['zont1x', 'Rifler'], ['magixx', 'Support']],
  'Team Vitality': [['ZywOo', 'AWPer'], ['flameZ', 'Entry'], ['apEX', 'IGL'], ['ropz', 'Rifler'], ['mezii', 'Support']],
  'Team Falcons': [['m0NESY', 'AWPer'], ['kyousuke', 'Entry'], ['kyxsan', 'IGL'], ['NiKo', 'Rifler'], ['TeSeS', 'Support']],
  Aurora: [['woxic', 'AWPer'], ['XANTARES', 'Entry'], ['MAJ3R', 'IGL'], ['jottAAA', 'Rifler'], ['Wicadia', 'Support']],
  'BetBoom Team': [['zorte', 'AWPer'], ['Magnojez', 'Entry'], ['nafany', 'IGL'], ['Ax1Le', 'Rifler'], ['S1ren', 'Support']],
  NAVI: [['w0nderful', 'AWPer'], ['iM', 'Entry'], ['Aleksib', 'IGL'], ['b1t', 'Rifler'], ['jL', 'Support']],
  Nemiga: [['k1Ry4', 'AWPer'], ['1eeR', 'Entry'], ['boX', 'IGL'], ['Xant3r', 'Rifler'], ['zweih', 'Support']],
  'The MongolZ': [['mzinho', 'AWPer'], ['Techno4K', 'Entry'], ['910', 'IGL'], ['bLitz', 'Rifler'], ['Senzu', 'Support']],
  'FUT Esports': [['reiko', 'AWPer'], ['dem0n', 'Entry'], ['AtaKaptan', 'IGL'], ['lauNX', 'Rifler'], ['coolio', 'Support']],
  'G2 Esports': [['SunPayus', 'AWPer'], ['malbsMd', 'Entry'], ['hades', 'IGL'], ['huNter-', 'Rifler'], ['HeavyGod', 'Support']],
  PARIVISION: [['nota', 'AWPer'], ['BELCHONOKK', 'Entry'], ['Jame', 'IGL'], ['Qikert', 'Rifler'], ['xiELO', 'Support']],
  '1WIN': [['deko', 'AWPer'], ['lattykk', 'Entry'], ['NickelBack', 'IGL'], ['TRAVIS', 'Rifler'], ['kl1m', 'Support']],
  Legacy: [['latto', 'AWPer'], ['n1ssim', 'Entry'], ['b4rtiN', 'IGL'], ['dumau', 'Rifler'], ['saadzin', 'Support']],
  MIBR: [['brnz4n', 'AWPer'], ['insani', 'Entry'], ['Lucaozy', 'IGL'], ['exit', 'Rifler'], ['drop', 'Support']],

  'Team Liquid': [['ultimate', 'AWPer'], ['NertZ', 'Entry'], ['siuhy', 'IGL'], ['NAF', 'Rifler'], ['Twistzz', 'Support']],
  '9z': [['buda', 'AWPer'], ['meyern', 'Entry'], ['dgt', 'IGL'], ['luchov', 'Rifler'], ['max', 'Support']],
  Astralis: [['devise', 'AWPer'], ['jabbi', 'Entry'], ['HooXi', 'IGL'], ['stavn', 'Rifler'], ['Staehr', 'Support']],
  'FaZe Clan': [['broky', 'AWPer'], ['rain', 'Entry'], ['karrigan', 'IGL'], ['frozen', 'Rifler'], ['jcobbb', 'Support']],
  'Eternal Fire': [['paz', 'AWPer'], ['S3NSEY', 'Entry'], ['imoRR', 'IGL'], ['Calyx', 'Rifler'], ['j3kie', 'Support']],
  NiP: [['r1nkle', 'AWPer'], ['ewjerkz', 'Entry'], ['Snappi', 'IGL'], ['xKacpersky', 'Rifler'], ['sjuush', 'Support']],
  fnatic: [['MATYS', 'AWPer'], ['jambo', 'Entry'], ['fear', 'IGL'], ['blameF', 'Rifler'], ['KRIMZ', 'Support']],
  M80: [['slaxz-', 'AWPer'], ['reck', 'Entry'], ['s1n', 'IGL'], ['Swisher', 'Rifler'], ['JBa', 'Support']],
  HEROIC: [['xfl0ud', 'AWPer'], ['sausol', 'Entry'], ['lNZ', 'IGL'], ['tN1R', 'Rifler'], ['Chr1zN', 'Support']],
  B8: [['headtr1ck', 'AWPer'], ['kensizor', 'Entry'], ['alex666', 'IGL'], ['npl', 'Rifler'], ['esenthial', 'Support']],
  Luminosity: [['zock', 'AWPer'], ['togs', 'Entry'], ['DeStiNy', 'IGL'], ['shz', 'Rifler'], ['dok', 'Support']],
  GamerLegion: [['Tauson', 'AWPer'], ['Kursy', 'Entry'], ['PR', 'IGL'], ['REZ', 'Rifler'], ['acoR', 'Support']],
  BIG: [['hyped', 'AWPer'], ['gr1ks', 'Entry'], ['tabseN', 'IGL'], ['krimbo', 'Rifler'], ['JDC', 'Support']],
  TYLOO: [['Mercury', 'AWPer'], ['Moseyuh', 'Entry'], ['Attacker', 'IGL'], ['JamYoung', 'Rifler'], ['Jee', 'Support']],
  HOTU: [['bluewh1te', 'AWPer'], ['lollipop21k', 'Entry'], ['Krad', 'IGL'], ['n0rb3r7', 'Rifler'], ['Mokujin', 'Support']],
  Sangal: [['mahone', 'AWPer'], ['soulfly', 'Entry'], ['SaMey', 'IGL'], ['jottAAA', 'Rifler'], ['YZZ', 'Support']],

  'paiN Gaming': [['nqz', 'AWPer'], ['dav1deuS', 'Entry'], ['biguzera', 'IGL'], ['snow', 'Rifler'], ['kauez', 'Support']],
  Wildcard: [['fr3nd', 'AWPer'], ['phzy', 'Entry'], ['stanislaw', 'IGL'], ['susp', 'Rifler'], ['vinS', 'Support']],
  'Lynn Vision': [['z4kr', 'AWPer'], ['Starry', 'Entry'], ['C4LLM3SU3', 'IGL'], ['Westmelon', 'Rifler'], ['EmiliaQAQ', 'Support']],
  SINNERS: [['beastik', 'AWPer'], ['SHOCK', 'Entry'], ['ZEDKO', 'IGL'], ['majky', 'Rifler'], ['Pepo', 'Support']],
  NRG: [['oSee', 'AWPer'], ['Jeorge', 'Entry'], ['nitr0', 'IGL'], ['brehze', 'Rifler'], ['vexite', 'Support']],
  Imperial: [['noway', 'AWPer'], ['decenty', 'Entry'], ['VINI', 'IGL'], ['chelo', 'Rifler'], ['boltz', 'Support']],
  ATOX: [['MiQ', 'AWPer'], ['Zesta', 'Entry'], ['kabal', 'IGL'], ['dobu', 'Rifler'], ['yAmi', 'Support']],
  'Chinggis Warriors': [['Wonder', 'AWPer'], ['Gin', 'Entry'], ['Geneka', 'IGL'], ['Machinegun', 'Rifler'], ['Pupy', 'Support']],
  SAW: [['story', 'AWPer'], ['kWAJA', 'Entry'], ['MUTiRiS', 'IGL'], ['aragornN', 'Rifler'], ['Shr', 'Support']],
  '3DMAX': [['Graviti', 'AWPer'], ['Ex3rcice', 'Entry'], ['Maka', 'IGL'], ['Lucky', 'Rifler'], ['bodyy', 'Support']],
  'Virtus.pro': [['fame', 'AWPer'], ['ICY', 'Entry'], ['electroNic', 'IGL'], ['FL4MUS', 'Rifler'], ['Perfecto', 'Support']],
  Complexity: [['hallzerk', 'AWPer'], ['Grim', 'Entry'], ['JT', 'IGL'], ['EliGE', 'Rifler'], ['nicoodoz', 'Support']],
  ENCE: [['podi', 'AWPer'], ['Neityu', 'Entry'], ['gla1ve', 'IGL'], ['sdy', 'Rifler'], ['F1KU', 'Support']],
  OG: [['regali', 'AWPer'], ['M1key', 'Entry'], ['spooke', 'IGL'], ['Buzz', 'Rifler'], ['Thomas', 'Support']],
  Cloud9: [['glowiing', 'AWPer'], ['KaiR0N-', 'Entry'], ['r0nd', 'IGL'], ['HObbit', 'Rifler'], ['interz', 'Support']],
  'Sharks Esports': [['Gafolo', 'AWPer'], ['koala', 'Entry'], ['drg', 'IGL'], ['rdnzao', 'Rifler'], ['Lucca', 'Support']],
};

const NICKNAMES = [
  'volt', 'n0va', 'kryp', 'zenq', 'r4zor', 'lumen', 'prism', 'shade', 'nexo', 't1de', 'vanta', 'glint',
  'onix', 'pulse', 'quark', 'sable', 'trace', 'umbra', 'vexo', 'wraith', 'yuki', 'zephyr', 'arc', 'blitz',
  'cinder', 'drift', 'echo', 'flint', 'ghost', 'haven', 'iris', 'jolt', 'kilo', 'lynx', 'mirage', 'north',
  'opal', 'pyro', 'quest', 'raven', 'spark', 'thorn', 'unity', 'vapor', 'wisp', 'xeno', 'yarn', 'zenith',
  'aether', 'bolt', 'cobalt', 'delta', 'ember', 'frost', 'gamma', 'hex', 'ion', 'jinx', 'karma', 'lucid',
  'moth', 'nyx', 'orbit', 'pixel', 'quartz', 'rune', 'silk', 'tempo', 'ultra', 'void', 'wren', 'yield',
  'zone', 'ace', 'basil', 'crypt', 'dusk', 'flux', 'grit', 'husk', 'jade', 'kryptic', 'loop', 'murk',
  'neon', 'onyx', 'pique', 'quill', 'rift', 'sway', 'tundra', 'urban', 'venom', 'woad', 'xray', 'yonder', 'zinc',
];

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

const hashOf = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const rngOf = (seed: number): (() => number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const slug = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const dayKey = (now: number): string => {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const monthKey = (now: number): string => {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/* Rosters & scouting                                                  */
/* ------------------------------------------------------------------ */

export const teamTier = (ovr: number): 'Icon' | 'Star' | 'Gold' | 'Silver' | 'Bronze' => {
  if (ovr >= 93) return 'Icon';
  if (ovr >= 86) return 'Star';
  if (ovr >= 78) return 'Gold';
  if (ovr >= 68) return 'Silver';
  return 'Bronze';
};

const ROLE_ORDER: EcoRole[] = ['AWPer', 'Entry', 'IGL', 'Rifler', 'Support'];
const ROLE_SHAPE: Record<EcoRole, [number, number, number, number]> = {
  AWPer: [4, -3, 3, -1],
  Entry: [2, 4, -3, -2],
  IGL: [-2, -2, 2, 5],
  Rifler: [2, 2, -1, -1],
  Support: [-1, -2, 2, 3],
};
const OVR_SPREAD = [1, 0, 1, -1, -2];

const statLine = (team: EcoTeam, name: string, role: EcoRole, index: number): EcoPlayer => {
  const rand = rngOf(hashOf(`${team.name}:${name}:${team.ovr}`));
  const ovr = clamp(team.ovr + OVR_SPREAD[index] + Math.round(rand() * 2) - 1, 58, 99);
  const [aim, rfl, sns, clt] = ROLE_SHAPE[role];
  const jitter = (): number => Math.round(rand() * 4) - 2;
  return {
    name,
    role,
    ovr,
    aim: clamp(ovr + aim + jitter(), 50, 99),
    rfl: clamp(ovr + rfl + jitter(), 50, 99),
    sns: clamp(ovr + sns + jitter(), 50, 99),
    clt: clamp(ovr + clt + jitter(), 50, 99),
  };
};

export const teamRoster = (team: EcoTeam): EcoPlayer[] => {
  const real = REAL_ROSTERS[team.name];
  if (real && real.length === 5) {
    return real.map(([name, role], index) => statLine(team, name, role, index));
  }
  const rand = rngOf(hashOf(`${team.name}:roster`));
  const used = new Set<string>();
  return ROLE_ORDER.map((role, index) => {
    let name = NICKNAMES[Math.floor(rand() * NICKNAMES.length) % NICKNAMES.length];
    let guard = 0;
    while (used.has(name) && guard < 50) {
      name = NICKNAMES[Math.floor(rand() * NICKNAMES.length) % NICKNAMES.length];
      guard += 1;
    }
    used.add(name);
    return statLine(team, name, role, index);
  });
};

export const teamAvgOvr = (team: EcoTeam): number => {
  const roster = teamRoster(team);
  return Math.round(roster.reduce((total, player) => total + player.ovr, 0) / roster.length);
};

export const hasRealRoster = (name: string): boolean => Boolean(REAL_ROSTERS[name]);

/* ------------------------------------------------------------------ */
/* Creation, persistence                                               */
/* ------------------------------------------------------------------ */

const buildTeams = (ranges: OvrRange[]): EcoTeam[] => {
  const teams: EcoTeam[] = [];
  for (let division = 0; division < ECO_DIVISIONS; division += 1) {
    const names = DIVISION_POOLS[division] ?? [];
    const range = ranges[division] ?? { min: 58, max: 60 };
    const seed = rngOf(hashOf(`eco-init-${division}`));
    names.forEach((name, index) => {
      const span = Math.max(1, names.length - 1);
      const base = range.max - (index / span) * (range.max - range.min);
      const ovr = clamp(Math.round(base), range.min, range.max);
      const form: ('W' | 'L')[] = Array.from({ length: 5 }, () => (seed() > 0.45 ? 'W' : 'L'));
      teams.push({
        id: `eco-${slug(name)}`,
        name,
        division,
        ovr,
        played: 0,
        wins: 0,
        losses: 0,
        roundDiff: 0,
        points: 0,
        form,
      });
    });
  }
  return teams;
};

export const createEcoState = (ranges: OvrRange[], now = Date.now()): EcoState => ({
  day: dayKey(now),
  month: monthKey(now),
  teams: buildTeams(ranges),
});

const validTeams = (teams: EcoTeam[]): boolean => {
  if (!Array.isArray(teams) || teams.length !== ECO_DIVISIONS * ECO_TEAMS_PER_DIVISION - 1) return false;
  return teams.every((team) => typeof team.name === 'string' && team.division >= 0 && team.division < ECO_DIVISIONS);
};

export const readEcoState = (ranges: OvrRange[], now = Date.now()): EcoState => {
  try {
    const raw = localStorage.getItem(ECO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EcoState;
      if (parsed && validTeams(parsed.teams)) {
        return {
          day: parsed.day || dayKey(now),
          month: parsed.month || monthKey(now),
          teams: parsed.teams.map((team) => ({
            ...team,
            form: Array.isArray(team.form) ? team.form.slice(-5) : [],
            ovr: clamp(team.ovr, 55, 99),
          })),
        };
      }
    }
  } catch { /* storage unavailable or corrupted */ }
  return createEcoState(ranges, now);
};

export const saveEcoState = (state: EcoState): void => {
  try { localStorage.setItem(ECO_STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
};

/** The AI clubs of one division (15 in Division 1 where the user holds a slot). */
export const ecoTeamsInDivision = (teams: EcoTeam[], division: number): EcoTeam[] =>
  teams.filter((team) => team.division === division).sort((a, b) => b.points - a.points || b.roundDiff - a.roundDiff || b.ovr - a.ovr);

export const ecoTeamById = (teams: EcoTeam[], id: string): EcoTeam | undefined => teams.find((team) => team.id === id);

/* ------------------------------------------------------------------ */
/* Midnight ecosystem cycle                                            */
/* ------------------------------------------------------------------ */

const simulateDivisionDay = (group: EcoTeam[], day: string): EcoTeam[] => {
  const results = new Map<string, { wins: number; losses: number; diff: number; form: ('W' | 'L')[] }>();
  group.forEach((team) => results.set(team.id, { wins: 0, losses: 0, diff: 0, form: [...team.form] }));

  for (let round = 0; round < 3; round += 1) {
    const shuffled = [...group].sort((a, b) => hashOf(`${day}:${round}:${a.id}`) - hashOf(`${day}:${round}:${b.id}`));
    for (let index = 0; index + 1 < shuffled.length; index += 2) {
      const first = shuffled[index];
      const second = shuffled[index + 1];
      const rand = rngOf(hashOf(`${day}:${round}:${first.id}:${second.id}`));
      const chance = 1 / (1 + 10 ** ((second.ovr - first.ovr) / 12));
      const firstWon = rand() < chance;
      const margin = 4 + Math.floor(rand() * 10);
      const winner = firstWon ? results.get(first.id) : results.get(second.id);
      const loser = firstWon ? results.get(second.id) : results.get(first.id);
      if (!winner || !loser) continue;
      winner.wins += 1;
      winner.diff += margin;
      winner.form.push('W');
      loser.losses += 1;
      loser.diff -= margin;
      loser.form.push('L');
    }
  }

  return group.map((team) => {
    const record = results.get(team.id);
    if (!record) return team;
    return {
      ...team,
      played: team.played + record.wins + record.losses,
      wins: team.wins + record.wins,
      losses: team.losses + record.losses,
      roundDiff: team.roundDiff + record.diff,
      points: team.points + record.wins * 3,
      form: record.form.slice(-5),
    };
  });
};

/**
 * Runs one full midnight cycle across all 15 divisions: every AI club plays a
 * short daily series, then ranks 1-3 climb one division and ranks 14-16 drop.
 * Division 15 has no promotion target and Division 1 has no floor.
 */
export const advanceEcoState = (state: EcoState, now: number, ranges: OvrRange[]): EcoState => {
  const day = dayKey(now);
  if (state.day === day) return state;

  const nextMonth = monthKey(now);
  const monthChanged = nextMonth !== state.month;

  let teams = state.teams;
  for (let division = 0; division < ECO_DIVISIONS; division += 1) {
    const group = teams.filter((team) => team.division === division);
    if (group.length < 2) continue;
    const simulated = simulateDivisionDay(group, day);
    const map = new Map(simulated.map((team) => [team.id, team]));
    teams = teams.map((team) => (team.division === division ? map.get(team.id) ?? team : team));
  }

  const moved = new Map<string, number>();
  for (let division = 0; division < ECO_DIVISIONS; division += 1) {
    const table = ecoTeamsInDivision(teams, division);
    if (division < ECO_DIVISIONS - 1) {
      table.slice(0, 3).forEach((team) => moved.set(team.id, division + 1));
    }
    if (division > 0) {
      table.slice(-3).forEach((team) => moved.set(team.id, division - 1));
    }
  }

  const regrouped = teams.map((team) => {
    const target = moved.get(team.id);
    if (target === undefined) return team;
    return { ...team, division: target };
  });

  const byDivision = new Map<number, EcoTeam[]>();
  regrouped.forEach((team) => {
    const bucket = byDivision.get(team.division) ?? [];
    bucket.push(team);
    byDivision.set(team.division, bucket);
  });

  teams = regrouped.map((team) => {
    const bucket = [...(byDivision.get(team.division) ?? [])].sort((a, b) => b.ovr - a.ovr);
    const range = ranges[team.division] ?? { min: 58, max: 60 };
    const position = bucket.findIndex((entry) => entry.id === team.id);
    const span = Math.max(1, bucket.length - 1);
    const ovr = clamp(Math.round(range.max - (position / span) * (range.max - range.min)), range.min, range.max);
    const promoted = moved.get(team.id) !== undefined;
    const carried = promoted || monthChanged;
    return {
      ...team,
      ovr,
      played: carried ? 0 : team.played,
      wins: carried ? 0 : team.wins,
      losses: carried ? 0 : team.losses,
      roundDiff: carried ? 0 : team.roundDiff,
      points: carried ? 0 : team.points,
    };
  });

  return { day, month: nextMonth, teams };
};

/** Manual reset used by "new career" profile resets. */
export const resetEcoState = (ranges: OvrRange[], now = Date.now()): EcoState => {
  const fresh = createEcoState(ranges, now);
  saveEcoState(fresh);
  return fresh;
};
