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
  version: number;
  day: string;
  month: string;
  teams: EcoTeam[];
};

export type OvrRange = { min: number; max: number };

export const ECO_STORAGE_KEY = 'cs2-ecosystem';
const ECO_STATE_VERSION = 2;
export const ECO_DIVISIONS = 15;
export const ECO_TEAMS_PER_DIVISION = 16;

/* ------------------------------------------------------------------ */
/* Real world database: 50 clubs x exact 5-man roster (Nov 2026)       */
/* Strongest club first, OVR follows the Top 250 world ranking curve.  */
/* ------------------------------------------------------------------ */

export type WorldEntry = [name: string, role: EcoRole, ovr: number, country: string];

export const WORLD_DB: Record<string, WorldEntry[]> = {
  FURIA: [['KSCERATO', 'Support', 93, 'BR'], ['molodoy', 'AWPer', 90, 'KZ'], ['FalleN', 'IGL', 88, 'BR'], ['yuurih', 'Rifler', 87, 'BR'], ['YEKINDAR', 'Entry', 87, 'LV']],
  MOUZ: [['torzsi', 'AWPer', 91, 'HU'], ['xertioN', 'Support', 90, 'IL'], ['Spinx', 'Rifler', 89, 'IL'], ['xelex', 'Entry', 87, 'KZ'], ['PR', 'IGL', 86, 'PL']],
  'Team Vitality': [['ZywOo', 'AWPer', 95, 'FR'], ['ropz', 'Rifler', 89, 'EE'], ['flameZ', 'Entry', 87, 'IL'], ['mezii', 'IGL', 86, 'GB'], ['jL', 'Support', 84, 'LT']],
  'Team Spirit': [['donk', 'Entry', 96, 'RU'], ['sh1ro', 'AWPer', 93, 'RU'], ['zont1x', 'Rifler', 86, 'UA'], ['magixx', 'Support', 84, 'RU'], ['tN1R', 'IGL', 81, 'BY']],
  'Team Falcons': [['m0NESY', 'AWPer', 94, 'RU'], ['NiKo', 'Rifler', 90, 'BA'], ['kyousuke', 'Entry', 86, 'RU'], ['TeSeS', 'Support', 84, 'DK'], ['karrigan', 'IGL', 82, 'DK']],
  Aurora: [['XANTARES', 'Entry', 90, 'TR'], ['woxic', 'AWPer', 87, 'TR'], ['Wicadia', 'Rifler', 87, 'TR'], ['Jimpphat', 'Support', 84, 'FI'], ['kyxsan', 'IGL', 84, 'MK']],
  'G2 Esports': [['huNter-', 'IGL', 88, 'BA'], ['HeavyGod', 'Support', 87, 'IL'], ['MATYS', 'Entry', 86, 'PL'], ['NertZ', 'Rifler', 85, 'IL'], ['r1nkle', 'AWPer', 84, 'PL']],
  NAVI: [['w0nderful', 'AWPer', 89, 'UA'], ['b1t', 'Rifler', 87, 'UA'], ['iM', 'Entry', 85, 'RO'], ['makazze', 'Support', 84, 'XK'], ['Aleksib', 'IGL', 83, 'FI']],
  'The MongolZ': [['Techno', 'Entry', 88, 'MN'], ['910', 'IGL', 86, 'MN'], ['bLitz', 'Rifler', 85, 'MN'], ['cobrazera', 'AWPer', 85, 'MN'], ['nin9', 'Support', 84, 'MN']],
  'BetBoom Team': [['Magnojez', 'Entry', 88, 'RU'], ['zorte', 'AWPer', 86, 'RU'], ['S1ren', 'Rifler', 85, 'RU'], ['d1Ledez', 'Support', 84, 'RU'], ['Boombl4', 'IGL', 83, 'RU']],
  'FUT Esports': [['dem0n', 'Entry', 87, 'TR'], ['xfl0ud', 'IGL', 86, 'TR'], ['Krabeni', 'Rifler', 85, 'XK'], ['dziugss', 'Support', 84, 'LT'], ['SunPayus', 'AWPer', 83, 'ES']],
  'Team Liquid': [['NAF', 'Rifler', 87, 'CA'], ['EliGE', 'Entry', 86, 'US'], ['malbsMd', 'Support', 85, 'GT'], ['Jorko', 'AWPer', 83, 'SE'], ['JT', 'IGL', 82, 'ZA']],
  Nemiga: [['KaiR0N-', 'AWPer', 87, 'RU'], ['Xant3r', 'Rifler', 85, 'RU'], ['syph0', 'Entry', 84, 'RU'], ['khaN', 'IGL', 83, 'BY'], ['robo', 'Support', 82, 'BY']],
  PARIVISION: [['Jame', 'AWPer', 86, 'RU'], ['FL1T', 'Rifler', 85, 'RU'], ['HObbit', 'Entry', 84, 'KZ'], ['xiELO', 'Support', 83, 'RU'], ['zweih', 'IGL', 82, 'RU']],
  '1WIN': [['Ax1Le', 'Rifler', 88, 'RU'], ['nafany', 'IGL', 85, 'RU'], ['BELCHONOKK', 'Entry', 83, 'RU'], ['fame', 'AWPer', 82, 'RU'], ['ArtFr0st', 'Support', 81, 'RU']],
  Legacy: [['latto', 'AWPer', 85, 'BR'], ['dumau', 'Entry', 84, 'BR'], ['n1ssim', 'Support', 83, 'BR'], ['arT', 'IGL', 83, 'BR'], ['try', 'Rifler', 83, 'BR']],
  HEROIC: [['Brollan', 'Rifler', 87, 'SE'], ['susp', 'AWPer', 84, 'SE'], ['Chr1zN', 'IGL', 82, 'DK'], ['nilo', 'Entry', 80, 'SE'], ['MartinezSa', 'Support', 79, 'ES']],
  'FaZe Clan': [['frozen', 'Rifler', 87, 'SK'], ['Twistzz', 'Entry', 86, 'CA'], ['jcobbb', 'AWPer', 82, 'LV'], ['Neityu', 'Support', 79, 'FR'], ['JBOEN', 'IGL', 76, 'DK']],
  MIBR: [['insani', 'Entry', 85, 'BR'], ['nqz', 'AWPer', 84, 'BR'], ['LNZ', 'IGL', 82, 'BR'], ['tomaszin', 'Rifler', 79, 'BR'], ['venomzera', 'Support', 78, 'BR']],
  Astralis: [['phzy', 'AWPer', 84, 'SE'], ['siuhy', 'IGL', 84, 'PL'], ['ryu', 'Rifler', 81, 'LT'], ['Staehr', 'Support', 79, 'DK'], ['cmtry', 'Entry', 78, 'UA']],
  GamerLegion: [['REZ', 'Rifler', 85, 'SE'], ['Tauson', 'AWPer', 82, 'DK'], ['FL4MUS', 'Entry', 81, 'RU'], ['hypex', 'Support', 78, 'SK'], ['shalfey', 'IGL', 77, 'RU']],
  BIG: [['tabseN', 'IGL', 84, 'DE'], ['blameF', 'Rifler', 83, 'DK'], ['faveN', 'Entry', 81, 'DE'], ['JDC', 'AWPer', 78, 'DE'], ['gr1ks', 'Support', 75, 'RS']],
  B8: [['alex666', 'IGL', 83, 'UA'], ['npl', 'AWPer', 82, 'UA'], ['kensizor', 'Entry', 80, 'UA'], ['s1zzi', 'Rifler', 77, 'UA'], ['esenthial', 'Support', 76, 'UA']],
  TYLOO: [['JamYoung', 'Rifler', 83, 'CN'], ['Mercury', 'AWPer', 81, 'CN'], ['zhokiNg', 'IGL', 79, 'CN'], ['Moseyuh', 'Entry', 78, 'CN'], ['Zero', 'Support', 74, 'CN']],
  'Eternal Fire': [['jottAAA', 'Entry', 82, 'TR'], ['MisteM', 'AWPer', 80, 'ZA'], ['regali', 'Rifler', 78, 'RO'], ['Soulfly', 'IGL', 78, 'TR'], ['Kvem', 'Support', 75, 'UA']],
  paiN: [['biguzera', 'IGL', 82, 'BR'], ['snow', 'AWPer', 80, 'BR'], ['saffee', 'Rifler', 78, 'BR'], ['Rkzinho', 'Entry', 76, 'BR'], ['Tatu', 'Support', 75, 'BR']],
  SAW: [['story', 'AWPer', 82, 'PT'], ['MUTiRiS', 'IGL', 80, 'PT'], ['ewjerkz', 'Rifler', 78, 'PT'], ['NOPEEj', 'Entry', 76, 'PT'], ['krazy', 'Support', 73, 'PT']],
  fnatic: [['jambo', 'Rifler', 81, 'GB'], ['fEAR', 'IGL', 79, 'SE'], ['mazay', 'AWPer', 78, 'PL'], ['jackasmo', 'Entry', 77, 'PL'], ['cairne', 'Support', 73, 'GB']],
  NiP: [['stavn', 'Rifler', 84, 'DK'], ['sjuush', 'Support', 80, 'DK'], ['Krimbo', 'Entry', 79, 'DE'], ['adamb', 'IGL', 75, 'SE'], ['xKacpersky', 'AWPer', 69, 'PL']],
  Imperial: [['chelo', 'Rifler', 80, 'BR'], ['VINI', 'IGL', 79, 'BR'], ['noway', 'AWPer', 78, 'BR'], ['decenty', 'Entry', 77, 'BR'], ['saadzin', 'Support', 72, 'BR']],
  M80: [['JBa', 'IGL', 81, 'US'], ['Lake', 'AWPer', 79, 'US'], ['s1n', 'Rifler', 78, 'US'], ['slaxz-', 'Support', 77, 'DE'], ['Swisher', 'Entry', 70, 'US']],
  NRG: [['Grim', 'Rifler', 80, 'US'], ['hallzerk', 'AWPer', 79, 'NO'], ['nitr0', 'IGL', 77, 'US'], ['Jeorge', 'Entry', 74, 'US'], ['Sonic', 'Support', 74, 'US']],
  '3DMAX': [['Maka', 'IGL', 79, 'FR'], ['Lucky', 'AWPer', 77, 'FR'], ['Graviti', 'Rifler', 77, 'FR'], ['misutaaa', 'Entry', 75, 'FR'], ['Kursy', 'Support', 72, 'FR']],
  ATOX: [['MiQ', 'AWPer', 78, 'MN'], ['kabal', 'IGL', 77, 'MN'], ['dobu', 'Rifler', 75, 'MN'], ['Zesta', 'Entry', 74, 'MN'], ['AccuracyTG', 'Support', 73, 'MN']],
  'Chinggis Warriors': [['sk0R', 'Rifler', 78, 'MN'], ['cool4st', 'AWPer', 76, 'MN'], ['ROUX', 'Entry', 74, 'MN'], ['tikuak', 'IGL', 73, 'MN'], ['fury5k', 'Support', 73, 'MN']],
  'BC.Game': [['s1mple', 'AWPer', 82, 'UA'], ['Magisk', 'IGL', 77, 'DK'], ['Senzu', 'Rifler', 74, 'MN'], ['mzinho', 'Entry', 72, 'MN'], ['asap', 'Support', 66, 'SE']],
  FlyQuest: [['jks', 'IGL', 78, 'AU'], ['INS', 'Rifler', 75, 'AU'], ['aliStair', 'AWPer', 74, 'AU'], ['Vexite', 'Entry', 72, 'AU'], ['nettik', 'Support', 69, 'AU']],
  BESTIA: [['drop', 'AWPer', 75, 'BR'], ['kauez', 'Rifler', 74, 'BR'], ['buda', 'Support', 73, 'AR'], ['cass1n', 'Entry', 72, 'AR'], ['timo', 'IGL', 71, 'BR']],
  Metizport: [['Plopski', 'Rifler', 76, 'SE'], ['stanislaw', 'IGL', 75, 'CA'], ['MaiL09', 'AWPer', 72, 'SE'], ['forsyy', 'Entry', 71, 'SE'], ['F1KU', 'Support', 68, 'PL']],
  FOKUS: [['podi', 'AWPer', 75, 'SE'], ['ztr', 'IGL', 73, 'SE'], ['Matheos', 'Rifler', 72, 'GR'], ['Banjo', 'Entry', 70, 'SE'], ['jocab', 'Support', 69, 'SE']],
  Betclic: [['ultimate', 'AWPer', 66, 'PT'], ['Prism', 'Rifler', 65, 'PT'], ['Qlocuu', 'Entry', 64, 'PL'], ['Demho', 'IGL', 63, 'PL'], ['ex1st', 'Support', 62, 'PL']],
  PRIVATE: [['1eeR', 'AWPer', 65, 'BY'], ['H4SAN4TOR', 'Rifler', 64, 'RU'], ['sh1nejezzz', 'Entry', 63, 'RU'], ['sowalio', 'IGL', 62, 'RU'], ['z1k4', 'Support', 61, 'BY']],
  'Iberian Soul': [['alex', 'AWPer', 64, 'ES'], ['dav1g', 'Rifler', 63, 'ES'], ['mopoz', 'IGL', 62, 'ES'], ['sausol', 'Entry', 61, 'ES'], ['Ag1l', 'Support', 60, 'PT']],
  'Fluxo W7M': [['dav1deuS', 'AWPer', 63, 'BR'], ['exit', 'Rifler', 62, 'BR'], ['kye', 'Entry', 61, 'BR'], ['Ltz', 'IGL', 60, 'BR'], ['zevy', 'Support', 59, 'BR']],
  Sangal: [['R4DYX', 'Rifler', 62, 'TR'], ['Joey', 'AWPer', 61, 'TR'], ['adamS', 'IGL', 60, 'TR'], ['bnox', 'Entry', 59, 'TR'], ['puuha', 'Support', 58, 'TR']],
  UNiTY: [['2high', 'AWPer', 61, 'CZ'], ['Dytor', 'Rifler', 60, 'CZ'], ['KWERTZZ', 'Entry', 59, 'CZ'], ['M1key', 'IGL', 58, 'CZ'], ['Sn0w', 'Support', 57, 'CZ']],
  Nexus: [['s0und', 'AWPer', 60, 'RO'], ['HOLY', 'Rifler', 59, 'RO'], ['shield', 'Entry', 58, 'RO'], ['fNk', 'IGL', 57, 'RO'], ['Nexius', 'Support', 56, 'RO']],
  '5star': [['rate', 'AWPer', 59, 'BR'], ['NEUZ', 'Rifler', 58, 'BR'], ['ariucle', 'Entry', 57, 'BR'], ['clouden', 'IGL', 56, 'BR'], ['hoolig4n', 'Support', 55, 'BR']],
  'Spirit Academy': [['k0gaSs', 'AWPer', 58, 'RU'], ['Kiryasoo', 'Rifler', 57, 'RU'], ['Netrix', 'Entry', 56, 'RU'], ['s1nside', 'IGL', 55, 'RU'], ['VILBy', 'Support', 55, 'RU']],
  'NAVI Junior': [['FAZERY', 'AWPer', 57, 'UA'], ['kodak', 'Rifler', 56, 'UA'], ['MahaR', 'Entry', 55, 'UA'], ['skizzyee', 'IGL', 55, 'UA'], ['yoki', 'Support', 55, 'UA']],
};

export const WORLD_TEAMS: string[] = Object.keys(WORLD_DB);

export type WorldPlayer = { name: string; role: EcoRole; ovr: number; country: string; team: string };

export const WORLD_PLAYERS: WorldPlayer[] = WORLD_TEAMS.flatMap((team) =>
  (WORLD_DB[team] ?? []).map(([name, role, ovr, country]) => ({ team, name, role, ovr, country })),
);

const worldAvgOvr = (name: string): number => {
  const roster = WORLD_DB[name];
  if (!roster || !roster.length) return 0;
  return Math.round(roster.reduce((total, entry) => total + entry[2], 0) / roster.length);
};

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

/**
 * OVR window of each division (index 0 = Bronze / Division 1 ... 14 = Global Elite).
 * The real 250-player world database is spread across this ladder by each club's
 * true five-man average, so a top club averages ~86-92 and academy clubs sit at 55-64.
 * Keep this in sync with the `divisions` table in App.tsx.
 */
export const DIVISION_BANDS: [number, number][] = [
  [55, 58], [59, 59], [60, 60], [61, 61], [62, 62], [63, 63], [64, 64],
  [65, 66], [67, 68], [69, 70], [71, 72], [73, 74], [75, 77], [78, 82], [83, 92],
];

/** Names grouped by division index (0 = Bronze/Division 1 ... 14 = Global Elite). */
const DIVISION_POOLS: string[][] = (() => {
  const fillers = [...TOP_DIVISIONS.flat(), ...ACADEMY_TEAMS];
  const used = new Set<string>();
  const pools: string[][] = [];
  let cursor = 0;
  for (let index = ECO_DIVISIONS - 1; index >= 0; index -= 1) {
    const [min, max] = DIVISION_BANDS[index];
    const size = index === 0 ? ECO_TEAMS_PER_DIVISION - 1 : ECO_TEAMS_PER_DIVISION;
    // Real clubs take the divisions that match their exact five-man average.
    const names = WORLD_TEAMS.filter((name) => {
      const avg = worldAvgOvr(name);
      return avg >= min && avg <= max && !used.has(name);
    }).slice(0, size);
    names.forEach((name) => used.add(name));
    // Remaining slots are regional / academy filler clubs from the same ladder.
    while (names.length < size) {
      const next = fillers[cursor];
      cursor += 1;
      if (next === undefined) break;
      if (used.has(next) || WORLD_DB[next]) continue;
      used.add(next);
      names.push(next);
    }
    pools[index] = names;
  }
  return pools;
})();

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

const statLine = (team: EcoTeam, name: string, role: EcoRole, index: number, fixedOvr?: number): EcoPlayer => {
  const rand = rngOf(hashOf(`${team.name}:${name}:${team.ovr}`));
  const ovr = clamp(fixedOvr ?? team.ovr + OVR_SPREAD[index] + Math.round(rand() * 2) - 1, 58, 99);
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
  const real = WORLD_DB[team.name];
  if (real && real.length === 5) {
    return real.map(([name, role, ovr], index) => statLine(team, name, role, index, ovr));
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
  const real = worldAvgOvr(team.name);
  if (real) return real;
  const roster = teamRoster(team);
  return Math.round(roster.reduce((total, player) => total + player.ovr, 0) / roster.length);
};

export const hasRealRoster = (name: string): boolean => Boolean(WORLD_DB[name]);

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
      // Real clubs keep their exact world-database average, never a range guess.
      const ovr = worldAvgOvr(name) || clamp(Math.round(base), range.min, range.max);
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
  version: ECO_STATE_VERSION,
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
      if (parsed && parsed.version === ECO_STATE_VERSION && validTeams(parsed.teams)) {
        return {
          version: ECO_STATE_VERSION,
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
      const chance = 1 / (1 + 10 ** ((second.ovr - first.ovr) / 6));
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
    // Real world clubs keep their database average across promotions too.
    const ovr = worldAvgOvr(team.name)
      || clamp(Math.round(range.max - (position / span) * (range.max - range.min)), range.min, range.max);
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

  return { version: ECO_STATE_VERSION, day, month: nextMonth, teams };
};

/** Manual reset used by "new career" profile resets. */
export const resetEcoState = (ranges: OvrRange[], now = Date.now()): EcoState => {
  const fresh = createEcoState(ranges, now);
  saveEcoState(fresh);
  return fresh;
};
