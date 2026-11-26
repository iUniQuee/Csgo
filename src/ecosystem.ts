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
const ECO_STATE_VERSION = 4;
export const ECO_DIVISIONS = 15;
export const ECO_TEAMS_PER_DIVISION = 16;

/* ------------------------------------------------------------------ */
/* Real world database: 239 clubs x exact 5-man roster (Nov 2026)      */
/* Div 11-15 world elite, Div 6-10 silver tier, Div 1-5 bronze tier.   */
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
  'Chinggis Warriors': [['sk0R', 'Rifler', 78, 'MN'], ['cool4st', 'AWPer', 76, 'MN'], ['ROUX', 'Entry', 74, 'MN'], ['tikuak', 'IGL', 73, 'MN'], ['yAmi', 'Support', 73, 'MN']],
  'BC.Game': [['s1mple', 'AWPer', 82, 'UA'], ['Magisk', 'IGL', 77, 'DK'], ['Senzu', 'Rifler', 74, 'MN'], ['mzinho', 'Entry', 72, 'MN'], ['asap', 'Support', 66, 'SE']],
  FlyQuest: [['jks', 'IGL', 78, 'AU'], ['INS', 'Rifler', 75, 'AU'], ['aliStair', 'AWPer', 74, 'AU'], ['Vexite', 'Entry', 72, 'AU'], ['nettik', 'Support', 69, 'AU']],
  BESTIA: [['Noktse', 'AWPer', 74, 'AR'], ['zock', 'Rifler', 73, 'BR'], ['buda', 'Support', 73, 'AR'], ['cass1n', 'Entry', 72, 'AR'], ['timo', 'IGL', 71, 'BR']],
  Metizport: [['Plopski', 'Rifler', 76, 'SE'], ['stanislaw', 'IGL', 75, 'CA'], ['MaiL09', 'AWPer', 72, 'SE'], ['forsyy', 'Entry', 71, 'SE'], ['F1KU', 'Support', 68, 'PL']],
  FOKUS: [['podi', 'AWPer', 75, 'SE'], ['ztr', 'IGL', 73, 'SE'], ['Matheos', 'Rifler', 72, 'GR'], ['Banjo', 'Entry', 70, 'SE'], ['jocab', 'Support', 69, 'SE']],
  Betclic: [['ultimate', 'AWPer', 66, 'PT'], ['Prism', 'Rifler', 65, 'PT'], ['Qlocuu', 'Entry', 64, 'PL'], ['Demho', 'IGL', 63, 'PL'], ['ex1st', 'Support', 62, 'PL']],
  PRIVATE: [['1eeR', 'AWPer', 65, 'BY'], ['H4SAN4TOR', 'Rifler', 64, 'RU'], ['sh1nejezzz', 'Entry', 63, 'RU'], ['sowalio', 'IGL', 62, 'RU'], ['z1k4', 'Support', 61, 'BY']],
  'Iberian Soul': [['alex', 'AWPer', 64, 'ES'], ['dav1g', 'Rifler', 63, 'ES'], ['mopoz', 'IGL', 62, 'ES'], ['sausol', 'Entry', 61, 'ES'], ['Ag1l', 'Support', 60, 'PT']],
  'Fluxo W7M': [['nak', 'AWPer', 63, 'BR'], ['exit', 'Rifler', 62, 'BR'], ['kye', 'Entry', 61, 'BR'], ['Ltz', 'IGL', 60, 'BR'], ['zevy', 'Support', 59, 'BR']],
  Sangal: [['R4DYX', 'Rifler', 62, 'TR'], ['Joey', 'AWPer', 61, 'TR'], ['adamS', 'IGL', 60, 'TR'], ['bnox', 'Entry', 59, 'TR'], ['puuha', 'Support', 58, 'TR']],
  UNiTY: [['2high', 'AWPer', 61, 'CZ'], ['Dytor', 'Rifler', 60, 'CZ'], ['KWERTZZ', 'Entry', 59, 'CZ'], ['M1key', 'IGL', 58, 'CZ'], ['Sn0w', 'Support', 57, 'CZ']],
  Nexus: [['s0und', 'AWPer', 60, 'RO'], ['HOLY', 'Rifler', 59, 'RO'], ['shield', 'Entry', 58, 'RO'], ['fNk', 'IGL', 57, 'RO'], ['Nexius', 'Support', 56, 'RO']],
  '5star': [['rate', 'AWPer', 59, 'BR'], ['NEUZ', 'Rifler', 58, 'BR'], ['ariucle', 'Entry', 57, 'BR'], ['clouden', 'IGL', 56, 'BR'], ['hoolig4n', 'Support', 55, 'BR']],
  'Spirit Academy': [['k0gaSs', 'AWPer', 58, 'RU'], ['Kiryasoo', 'Rifler', 57, 'RU'], ['Netrix', 'Entry', 56, 'RU'], ['s1nside', 'IGL', 55, 'RU'], ['VILBy', 'Support', 55, 'RU']],
  'NAVI Junior': [['FAZERY', 'AWPer', 57, 'UA'], ['kodak', 'Rifler', 56, 'UA'], ['MahaR', 'Entry', 55, 'UA'], ['skizzyee', 'IGL', 55, 'UA'], ['yoki', 'Support', 55, 'UA']],
  'MOUZ NXT': [['ay0k', 'AWPer', 66, 'LV'], ['Nikodeon', 'IGL', 64, 'DK'], ['deeN', 'Support', 63, 'LV'], ['eSx', 'Entry', 61, 'FR'], ['mixer', 'Rifler', 60, 'CN']],
  'BIG Academy': [['Maden', 'IGL', 65, 'ME'], ['prosus', 'Entry', 64, 'DE'], ['D0nii', 'Rifler', 63, 'UA'], ['Hrdina', 'Support', 61, 'SK'], ['aZe', 'AWPer', 60, 'TM']],
  'The Huns': [['controlez', 'IGL', 73, 'MN'], ['Bart4k', 'Rifler', 74, 'MN'], ['Cozen', 'Entry', 70, 'MN'], ['bexyz', 'Support', 72, 'MN'], ['DarkMeister', 'AWPer', 69, 'MN']],
  Eruption: [['COLDavaa', 'IGL', 67, 'MN'], ['MagnumZ', 'AWPer', 72, 'MN'], ['fury5k', 'Rifler', 70, 'MN'], ['xenization', 'Entry', 68, 'MN'], ['sideffect', 'Support', 69, 'MN']],
  'IHC Esports': [['Skywalker', 'IGL', 63, 'MN'], ['rhittacrit', 'AWPer', 68, 'MN'], ['Aapestt', 'Rifler', 66, 'MN'], ['NEUZ', 'Entry', 65, 'MN'], ['QQLIGHTNING', 'Support', 64, 'MN']],
  'Lynn Vision': [['Westmelon', 'IGL', 77, 'CN'], ['z4kr', 'AWPer', 82, 'CN'], ['Starry', 'Rifler', 82, 'CN'], ['EmiliaQAQ', 'Entry', 78, 'CN'], ['C4LLM3SU3', 'Support', 79, 'CN']],
  'Rare Atom': [['3gl', 'IGL', 67, 'CN'], ['Summer', 'AWPer', 72, 'CN'], ['ChildKing', 'Rifler', 70, 'CN'], ['L1haNg', 'Entry', 71, 'CN'], ['chengking', 'Support', 69, 'CN']],
  Monte: [['sdy', 'IGL', 80, 'UA'], ['mantuu', 'AWPer', 77, 'PL'], ['CYPHER', 'Rifler', 76, 'GB'], ['br0', 'Entry', 74, 'DK'], ['st0m4k', 'Support', 73, 'UA']],
  SINNERS: [['beastik', 'IGL', 78, 'CZ'], ['MoDo', 'AWPer', 80, 'RO'], ['SHOCK', 'Rifler', 79, 'CZ'], ['stressarN', 'Entry', 79, 'MK'], ['kisserek', 'Support', 76, 'PL']],
  '9z': [['max', 'IGL', 79, 'UY'], ['history', 'AWPer', 79, 'BR'], ['dgt', 'Rifler', 77, 'UY'], ['HUASOPEEK', 'Entry', 78, 'CL'], ['luchov', 'Support', 76, 'AR']],
  'RED Canids': [['reNTU', 'IGL', 72, 'BR'], ['drop', 'AWPer', 78, 'BR'], ['dav1deuS', 'Rifler', 79, 'CL'], ['chayJESUS', 'Entry', 74, 'BR'], ['kauez', 'Support', 73, 'BR']],
  OG: [['bodyy', 'IGL', 73, 'FR'], ['spooke', 'AWPer', 74, 'SE'], ['Chucky', 'Rifler', 71, 'BE'], ['Ex3rcice', 'Entry', 72, 'FR'], ['nut nut', 'Support', 70, 'DK']],
  'Virtus.pro': [['mir', 'IGL', 81, 'RU'], ['b1st', 'AWPer', 80, 'RU'], ['Patsi', 'Rifler', 78, 'RU'], ['AquaRS', 'Entry', 77, 'RU'], ['tO0RO', 'Support', 78, 'RU']],
  Wildcard: [['nEMANHA', 'IGL', 76, 'RS'], ['fr3nd', 'AWPer', 76, 'PL'], ['cxzi', 'Rifler', 75, 'US'], ['HexT', 'Entry', 77, 'CA'], ['reck', 'Support', 75, 'US']],
  '9INE': [['raalz', 'IGL', 76, 'DK'], ['flayy', 'AWPer', 77, 'PL'], ['kraghen', 'Rifler', 75, 'DK'], ['rim3', 'Entry', 74, 'TR'], ['b1elany', 'Support', 76, 'PL']],
  HOTU: [['kade0', 'IGL', 77, 'KZ'], ['frontales', 'AWPer', 75, 'RU'], ['n0rb3r7', 'Rifler', 79, 'RU'], ['mizu', 'Entry', 78, 'RU'], ['dwushka', 'Support', 76, 'RU']],
  Luminosity: [['yxngstxr', 'IGL', 72, 'SE'], ['afro', 'AWPer', 74, 'FR'], ['Rainwaker', 'Rifler', 73, 'BG'], ['AZUWU', 'Entry', 71, 'GB'], ['lux', 'Support', 72, 'BR']],
  Galorys: [['PKL', 'IGL', 69, 'BR'], ['detr0ittJ', 'AWPer', 74, 'BR'], ['gbb', 'Rifler', 73, 'BR'], ['tomate', 'Entry', 73, 'BR'], ['DeStiNy', 'Support', 72, 'BR']],
  'DENDELE CS': [['gafolo', 'IGL', 76, 'BR'], ['maxxkor', 'AWPer', 78, 'AR'], ['koala', 'Rifler', 75, 'BR'], ['rdnzao', 'Entry', 74, 'BR'], ['doc', 'Support', 73, 'BR']],
  'Phantom Esports': [['TMB', 'IGL', 74, 'DK'], ['nicoodoz', 'AWPer', 76, 'DK'], ['Kylar', 'Rifler', 73, 'PL'], ['KEi', 'Entry', 72, 'PL'], ['Kunai', 'Support', 71, 'PL']],
  'WhiteBIT Team': [['Psycho', 'IGL', 75, 'UA'], ['s4ltovsk1yy', 'AWPer', 74, 'UA'], ['DemQQ', 'Entry', 75, 'UA'], ['Smash', 'Rifler', 73, 'UA'], ['tyr1k', 'Support', 71, 'UA']],
  Alliance: [['twist', 'IGL', 72, 'SE'], ['eraa', 'AWPer', 71, 'SE'], ['bobeksde', 'Rifler', 71, 'SE'], ['avid', 'Entry', 69, 'SE'], ['upE', 'Support', 68, 'SE']],
  'Inner Circle': [['3ippoch', 'IGL', 67, 'UA'], ['headtr1ck', 'AWPer', 75, 'UA'], ['cptkurtka023', 'Rifler', 71, 'UA'], ['zeRRoFIX', 'Entry', 72, 'UA'], ['Dawy', 'Support', 70, 'UA']],
  'Misa Esports': [['emstar', 'IGL', 70, 'TR'], ['souv', 'AWPer', 66, 'TR'], ['cyber', 'Rifler', 69, 'TR'], ['Zuedsta', 'Entry', 68, 'TR'], ['h0kz', 'Support', 67, 'TR']],
  aimclub: [['zewts', 'IGL', 67, 'RO'], ['XELLOW', 'AWPer', 71, 'RO'], ['ragga', 'Rifler', 66, 'RO'], ['mhN1', 'Entry', 68, 'RO'], ['ADRON', 'Support', 65, 'RO']],
  'WRAITH PCIFIC': [['eNs', 'IGL', 71, 'TR'], ['lugseN', 'AWPer', 70, 'TR'], ['scolleN', 'Rifler', 69, 'TR'], ['jresy', 'Entry', 68, 'TR'], ['oyesil', 'Support', 67, 'TR']],
  BOJONG: [['Villeboe', 'IGL', 66, 'FI'], ['ArtwOo', 'AWPer', 65, 'FI'], ['BlNGB0NG', 'Rifler', 63, 'FI'], ['stunt', 'Entry', 64, 'FI'], ['jkzin', 'Support', 62, 'FI']],
  'paiN Academy': [['tsug', 'IGL', 63, 'BR'], ['mello', 'AWPer', 65, 'BR'], ['HaZze', 'Rifler', 61, 'BR'], ['Fkm', 'Entry', 62, 'BR'], ['glimmz', 'Support', 60, 'BR']],
  'G2 Ares': [['SHiNE', 'IGL', 71, 'SE'], ['Junyme', 'AWPer', 68, 'DK'], ['hitori', 'Rifler', 67, 'UZ'], ['yksjupe', 'Entry', 66, 'FI'], ['TMKj', 'Support', 65, 'PT']],
  'RED Canids Academy': [['rafa', 'IGL', 64, 'BR'], ['n1cks', 'AWPer', 66, 'BR'], ['gtw', 'Rifler', 63, 'BR'], ['sanc', 'Entry', 62, 'BR'], ['FasteR', 'Support', 61, 'BR']],
};

/* Silver database: 80 real Tier-2/Tier-3 clubs, Divisions 6-10 (65-74 OVR). */
export const SILVER_DB: Record<string, WorldEntry[]> = {
  Apeks: [['jkaem', 'IGL', 74, 'NO'], ['nawwk', 'AWPer', 74, 'SE'], ['STYKO', 'Rifler', 73, 'SK'], ['kyuubii', 'Entry', 72, 'CZ'], ['sense', 'Support', 71, 'NO']],
  'Amkal Esports': [['Dosia', 'IGL', 74, 'RU'], ['flamie', 'AWPer', 73, 'RU'], ['Xoma', 'Rifler', 72, 'RU'], ['Krad', 'Entry', 70, 'RU'], ['scooby', 'Support', 68, 'RU']],
  '9 Pandas': [['glowiing', 'IGL', 74, 'RU'], ['iDISBALANCE', 'AWPer', 73, 'RU'], ['seized', 'Rifler', 72, 'RU'], ['clax', 'Entry', 70, 'RU'], ['VILBy', 'Support', 69, 'RU']],
  EYEBALLERS: [['JW', 'IGL', 74, 'SE'], ['flusha', 'AWPer', 73, 'SE'], ['Peppzor', 'Rifler', 71, 'SE'], ['Bob', 'Entry', 69, 'SE'], ['Dahl', 'Support', 68, 'SE']],
  ECSTATIC: [['Nodios', 'IGL', 72, 'DK'], ['kraghen', 'AWPer', 72, 'DK'], ['Patti', 'Rifler', 70, 'SE'], ['Queenix', 'Entry', 69, 'DK'], ['salazar', 'Support', 67, 'DK']],
  'Passion UA': [['jambo', 'Rifler', 72, 'GB'], ['fear', 'AWPer', 71, 'SE'], ['sdy', 'IGL', 70, 'UA'], ['Kvem', 'Entry', 67, 'UA'], ['pr1metapz', 'Support', 66, 'UA']],
  Betera: [['lollipop21k', 'AWPer', 71, 'BY'], ['spardaus', 'IGL', 69, 'BY'], ['hext', 'Rifler', 67, 'BY'], ['hurtfrisk', 'Entry', 66, 'SE'], ['smth', 'Support', 65, 'BY']],
  Tricked: [['sirah', 'IGL', 70, 'DK'], ['kiR', 'AWPer', 69, 'DK'], ['b0RUP', 'Rifler', 68, 'DK'], ['TMB', 'Entry', 67, 'DK'], ['HECTOz', 'Support', 66, 'DK']],
  Viperio: [['desty', 'IGL', 69, 'GB'], ['Cagey', 'AWPer', 68, 'GB'], ['jaydee', 'Rifler', 67, 'GB'], ['Skyrix', 'Entry', 66, 'GB'], ['Jachro', 'Support', 65, 'GB']],
  Endpoint: [['Surreal', 'IGL', 70, 'GB'], ['dobbo', 'AWPer', 69, 'GB'], ['Krs7N', 'Rifler', 67, 'GB'], ['GiraffX', 'Entry', 66, 'GB'], ['Ardis', 'Support', 65, 'GB']],
  'Into the Breach': [['Thomas', 'IGL', 71, 'GB'], ['rallen', 'AWPer', 70, 'PL'], ['Adam9130', 'Rifler', 68, 'GB'], ['Rhyz', 'Entry', 66, 'GB'], ['Serpha', 'Support', 65, 'GB']],
  'Zero Tenacity': [['niki1', 'IGL', 71, 'RS'], ['neaLaN', 'AWPer', 70, 'KZ'], ['c0llins', 'Rifler', 68, 'RS'], ['Kind0', 'Entry', 67, 'RS'], ['VLDN', 'Support', 66, 'RS']],
  ECLOT: [['Dytor', 'IGL', 70, 'CZ'], ['forsyy', 'AWPer', 69, 'CZ'], ['Blytz', 'Rifler', 68, 'CZ'], ['kreaz', 'Entry', 67, 'CZ'], ['nbqq', 'Support', 66, 'CZ']],
  Sampi: [['sAv1or', 'IGL', 69, 'CZ'], ['Maki', 'AWPer', 68, 'CZ'], ['Poutník', 'Rifler', 67, 'CZ'], ['ZEDKO', 'Entry', 66, 'CZ'], ['MAXX', 'Support', 65, 'CZ']],
  Enterprise: [['Draken', 'AWPer', 71, 'SE'], ['Bååten', 'IGL', 69, 'SE'], ['Lekr0', 'Rifler', 69, 'SE'], ['grux', 'Entry', 67, 'SE'], ['KRS', 'Support', 65, 'SE']],
  'ALTERNATE aTTaX': [['kzy', 'IGL', 70, 'DE'], ['PerX', 'AWPer', 69, 'DE'], ['awzek', 'Rifler', 67, 'DE'], ['FreeZe', 'Entry', 66, 'DE'], ['PANIX', 'Support', 65, 'DE']],
  MASONIC: [['SkaJ', 'IGL', 69, 'NO'], ['Norskeren', 'AWPer', 68, 'NO'], ['Mikkel', 'Rifler', 67, 'DK'], ['Hugster', 'Entry', 66, 'NO'], ['beast', 'Support', 65, 'NO']],
  KOI: [['mopoz', 'IGL', 71, 'ES'], ['dav1g', 'AWPer', 70, 'ES'], ['alex', 'Rifler', 69, 'ES'], ['sausol', 'Entry', 67, 'ES'], ['Ag1l', 'Support', 66, 'PT']],
  'Case Esports': [['stadodo', 'IGL', 70, 'ES'], ['NOPEEj', 'AWPer', 69, 'PT'], ['krazy', 'Rifler', 68, 'PT'], ['ZELIN', 'Entry', 66, 'ES'], ['PALM1', 'Support', 65, 'ES']],
  'Rebels Gaming': [['Flayy', 'IGL', 69, 'ES'], ['DGL', 'AWPer', 68, 'ES'], ['kanarito', 'Rifler', 67, 'ES'], ['pau', 'Entry', 66, 'ES'], ['Vares', 'Support', 65, 'ES']],
  Bravos: [['Renato', 'IGL', 73, 'PT'], ['snapy', 'AWPer', 72, 'PT'], ['PIZITUH', 'Rifler', 71, 'PT'], ['MT', 'Entry', 69, 'PT'], ['Titin', 'Support', 68, 'PT']],
  'Rhyno Esports': [['r0mao', 'IGL', 70, 'PT'], ['zlynx', 'AWPer', 69, 'PT'], ['b1lbo', 'Rifler', 68, 'PT'], ['Frag', 'Entry', 66, 'PT'], ['M1KA', 'Support', 65, 'PT']],
  'GTZ Esports': [['XCR', 'IGL', 69, 'PT'], ['Kai', 'AWPer', 68, 'PT'], ['Mizzy', 'Rifler', 67, 'PT'], ['Slaxx', 'Entry', 66, 'PT'], ['D0m1n1k', 'Support', 65, 'PT']],
  'EC Brugge': [['Keoz', 'IGL', 71, 'BE'], ['Stev0se', 'AWPer', 70, 'BE'], ['Yuma', 'Rifler', 68, 'BE'], ['Nivera', 'Entry', 68, 'BE'], ['DockeR', 'Support', 66, 'BE']],
  'Team Secret': [['BORKUM', 'IGL', 70, 'PH'], ['DubsteP', 'AWPer', 69, 'PH'], ['Jremy', 'Rifler', 68, 'PH'], ['len', 'Entry', 66, 'PH'], ['Tel0r', 'Support', 65, 'PH']],
  Sashi: [['Fessor', 'IGL', 69, 'DK'], ['birdfromsky', 'AWPer', 68, 'DK'], ['Daffu', 'Rifler', 67, 'DK'], ['Rytter', 'Entry', 66, 'DK'], ['Lucky', 'Support', 65, 'DK']],
  'Johnny Speeds': [['isak', 'IGL', 72, 'SE'], ['Ro1f', 'AWPer', 71, 'SE'], ['Kevve', 'Rifler', 69, 'SE'], ['Viggo', 'Entry', 67, 'SE'], ['mwik', 'Support', 66, 'SE']],
  Lilmix: [['quix', 'IGL', 69, 'SE'], ['Dizzy', 'AWPer', 68, 'SE'], ['Hampus', 'Rifler', 67, 'SE'], ['Limp', 'Entry', 66, 'SE'], ['Zink', 'Support', 65, 'SE']],
  Insilio: [['FpS', 'IGL', 70, 'RU'], ['S0N1C', 'AWPer', 69, 'RU'], ['cronuss', 'Rifler', 67, 'RU'], ['sugaR', 'Entry', 66, 'RU'], ['fostar', 'Support', 65, 'RU']],
  CYBERSHOKE: [['fen2k', 'IGL', 71, 'RU'], ['Mokujin', 'AWPer', 70, 'RU'], ['SENSEi', 'Rifler', 68, 'RU'], ['Porya', 'Entry', 67, 'RU'], ['lov1kus', 'Support', 66, 'RU']],
  RUBY: [['Kaide', 'IGL', 71, 'RU'], ['Sange', 'AWPer', 70, 'RU'], ['r0nd', 'Rifler', 69, 'RU'], ['Nitro', 'Entry', 67, 'RU'], ['fenvicious', 'Support', 66, 'RU']],
  ARCRED: [['Sergiz', 'IGL', 69, 'RU'], ['cbf', 'AWPer', 68, 'RU'], ['Kirill', 'Rifler', 67, 'RU'], ['spirit', 'Entry', 65, 'RU'], ['mds', 'Support', 65, 'RU']],
  500: [['Calyx', 'IGL', 74, 'TR'], ['imoRR', 'AWPer', 74, 'TR'], ['Mertowsky', 'Rifler', 72, 'TR'], ['B1N', 'Entry', 71, 'TR'], ['Grus', 'Support', 70, 'TR']],
  'S2G Esports': [['D3m4', 'IGL', 71, 'TR'], ['M1sta', 'AWPer', 70, 'TR'], ['beyaz', 'Rifler', 68, 'TR'], ['T.c', 'Entry', 67, 'TR'], ['Kaan', 'Support', 66, 'TR']],
  'EZ Esports': [['zok', 'IGL', 69, 'TR'], ['Aykut', 'AWPer', 68, 'TR'], ['Mert', 'Rifler', 67, 'TR'], ['Ege', 'Entry', 65, 'TR'], ['Bora', 'Support', 64, 'TR']],
  'Istanbul Wildcats': [['Ruin', 'IGL', 69, 'TR'], ['Ataraxia', 'AWPer', 68, 'TR'], ['Cyrix', 'Rifler', 67, 'TR'], ['B4rbaros', 'Entry', 66, 'TR'], ['Zeyd', 'Support', 65, 'TR']],
  'HAVU Gaming': [['xseveN', 'IGL', 73, 'FI'], ['sLowi', 'AWPer', 72, 'FI'], ['Aerial', 'Rifler', 70, 'FI'], ['ZOREE', 'Entry', 68, 'FI'], ['p4nu', 'Support', 67, 'FI']],
  'JANO Esports': [['juho', 'IGL', 68, 'FI'], ['Sasu', 'AWPer', 67, 'FI'], ['Eemeli', 'Rifler', 66, 'FI'], ['Lauri', 'Entry', 65, 'FI'], ['Ville', 'Support', 64, 'FI']],
  Wolsung: [['KrizzeN', 'IGL', 70, 'PL'], ['Furlan', 'AWPer', 69, 'PL'], ['Szpero', 'Rifler', 68, 'PL'], ['mhL', 'Entry', 67, 'PL'], ['Stark', 'Support', 65, 'PL']],
  'los kogutos': [['darchevile', 'IGL', 69, 'PL'], ['Kamo', 'AWPer', 68, 'PL'], ['Bogdan', 'Rifler', 67, 'PL'], ['Michał', 'Entry', 65, 'PL'], ['Adam', 'Support', 64, 'PL']],
  Illuminar: [['TOAO', 'IGL', 69, 'PL'], ['EXUS', 'AWPer', 68, 'PL'], ['zaNNN', 'Rifler', 67, 'PL'], ['bEN', 'Entry', 66, 'PL'], ['Piotr', 'Support', 64, 'PL']],
  Permitta: [['dycha', 'IGL', 70, 'PL'], ['Goofy', 'AWPer', 69, 'PL'], ['Sobol', 'Rifler', 67, 'PL'], ['snatchie', 'Entry', 68, 'PL'], ['jedqr', 'Support', 65, 'PL']],
  forZe: [['Jerry', 'IGL', 71, 'RU'], ['xsepower', 'AWPer', 70, 'RU'], ['gokushima', 'Rifler', 68, 'RU'], ['Fierce', 'Entry', 67, 'RU'], ['Norwi', 'Support', 66, 'RU']],
  K23: [['X1LE', 'IGL', 69, 'KZ'], ['Hockey', 'AWPer', 68, 'KZ'], ['dvr', 'Rifler', 67, 'KZ'], ['Winsley', 'Entry', 66, 'KZ'], ['keemz', 'Support', 65, 'KZ']],
  Bebop: [['AiyvaN', 'IGL', 69, 'RU'], ['fer', 'AWPer', 68, 'KZ'], ['AdreN', 'Rifler', 67, 'KZ'], ['mou', 'Entry', 65, 'KZ'], ['fitch', 'Support', 65, 'KZ']],
  M1X: [['Vad1k', 'IGL', 69, 'RU'], ['Krad', 'AWPer', 68, 'RU'], ['Ryujin', 'Rifler', 67, 'RU'], ['S0tF1k', 'Entry', 66, 'RU'], ['Lamp', 'Support', 65, 'RU']],
  KOVA: [['zehm', 'IGL', 68, 'FI'], ['Twix', 'AWPer', 67, 'FI'], ['Osku', 'Rifler', 66, 'FI'], ['Jere', 'Entry', 65, 'FI'], ['Aleksi', 'Support', 64, 'FI']],
  'Hype Gaming': [['Neo', 'IGL', 68, 'LT'], ['Nyk', 'AWPer', 67, 'LT'], ['Klaud', 'Rifler', 66, 'LT'], ['Marius', 'Entry', 65, 'LT'], ['Tomas', 'Support', 64, 'LT']],
  'Wicked Gaming': [['malta', 'IGL', 69, 'AU'], ['tucks', 'AWPer', 68, 'AU'], ['Hatz', 'Rifler', 67, 'AU'], ['Noobster', 'Entry', 65, 'AU'], ['JDubs', 'Support', 65, 'AU']],
  'Reason Gaming': [['Rytter', 'IGL', 68, 'DK'], ['kiR', 'AWPer', 67, 'DK'], ['b0RUP', 'Rifler', 66, 'DK'], ['HECTOz', 'Entry', 65, 'DK'], ['salazar', 'Support', 65, 'DK']],
  Noble: [['Brehze', 'IGL', 70, 'US'], ['CeRq', 'AWPer', 69, 'BG'], ['FaNg', 'Rifler', 68, 'CA'], ['Stewie2K', 'Entry', 67, 'US'], ['autimatic', 'Support', 69, 'US']],
  Dignitas: [['f0rest', 'IGL', 70, 'SE'], ['Lekr0', 'AWPer', 69, 'SE'], ['draken', 'Rifler', 68, 'SE'], ['hallzerk', 'Entry', 67, 'NO'], ['friberg', 'Support', 66, 'SE']],
  Rogue: [['SicK', 'IGL', 69, 'US'], ['vice', 'AWPer', 68, 'US'], ['Hiko', 'Rifler', 67, 'US'], ['n0thing', 'Entry', 66, 'US'], ['steel', 'Support', 65, 'CA']],
  Sprout: [['Spinx', 'IGL', 71, 'IL'], ['syrsoN', 'AWPer', 70, 'DE'], ['kressy', 'Rifler', 68, 'DE'], ['sL1m3', 'Entry', 66, 'DE'], ['denis', 'Support', 65, 'DE']],
  PACT: [['Snax', 'IGL', 69, 'PL'], ['morelz', 'AWPer', 68, 'PL'], ['SZPERO', 'Rifler', 67, 'PL'], ['byali', 'Entry', 66, 'PL'], ['kamil', 'Support', 65, 'PL']],
  eSuba: [['NEO', 'IGL', 68, 'SK'], ['GuardiaN', 'AWPer', 69, 'SK'], ['Zero', 'Rifler', 67, 'SK'], ['kap1' , 'Entry', 65, 'SK'], ['barb1' , 'Support', 64, 'SK']],
  Partizan: [['c0llins', 'IGL', 67, 'RS'], ['DJOXiC', 'AWPer', 66, 'RS'], ['emi', 'Rifler', 65, 'RS'], ['Katalic', 'Entry', 64, 'RS'], ['Nexy', 'Support', 63, 'RS']],
  'Dynamo Eclot': [['Dytor', 'IGL', 68, 'CZ'], ['forsyy', 'AWPer', 67, 'CZ'], ['Blytz', 'Rifler', 66, 'CZ'], ['kreaz', 'Entry', 65, 'CZ'], ['nbqq', 'Support', 64, 'CZ']],
  Fraternitas: [['Sobol', 'IGL', 67, 'PL'], ['Kamo', 'AWPer', 66, 'PL'], ['Bogdan', 'Rifler', 65, 'PL'], ['Michał', 'Entry', 64, 'PL'], ['Adam', 'Support', 63, 'PL']],
  'Budapest Five': [['koloRR', 'IGL', 68, 'HU'], ['flasi', 'AWPer', 67, 'HU'], ['tibor', 'Rifler', 66, 'HU'], ['gabor', 'Entry', 65, 'HU'], ['zsolt', 'Support', 64, 'HU']],
  'Team BLVK': [['frozen', 'IGL', 71, 'SK'], ['Twistzz', 'AWPer', 70, 'CA'], ['ropz', 'Rifler', 69, 'EE'], ['broky', 'Entry', 68, 'LV'], ['karrigan', 'Support', 67, 'DK']],
  TeamSolid: [['yekindar', 'IGL', 70, 'LV'], ['broky', 'AWPer', 69, 'LV'], ['Jame', 'Rifler', 68, 'RU'], ['electroNic', 'Entry', 67, 'RU'], ['Perfecto', 'Support', 66, 'RU']],
  Nordavind: [['SkaJ', 'IGL', 67, 'NO'], ['Norskeren', 'AWPer', 66, 'NO'], ['Hugster', 'Rifler', 65, 'NO'], ['beast', 'Entry', 64, 'NO'], ['Mikkel', 'Support', 64, 'DK']],
  Heimo: [['Riku', 'IGL', 67, 'FI'], ['Sakke', 'AWPer', 66, 'FI'], ['Jonne', 'Rifler', 65, 'FI'], ['Mika', 'Entry', 64, 'FI'], ['Tomi', 'Support', 63, 'FI']],
  GODSENT: [['pronax', 'IGL', 68, 'SE'], ['flusha', 'AWPer', 67, 'SE'], ['JW', 'Rifler', 66, 'SE'], ['KRIMZ', 'Entry', 66, 'SE'], ['Lekr0', 'Support', 65, 'SE']],
  ENCE: [['Snappi', 'IGL', 70, 'DK'], ['sAw', 'AWPer', 68, 'FI'], ['doto', 'Rifler', 67, 'FI'], ['xseveN', 'Entry', 66, 'FI'], ['Aerial', 'Support', 66, 'FI']],
  Cloud9: [['interz', 'IGL', 70, 'RU'], ['sh1ro', 'AWPer', 69, 'RU'], ['Ax1Le', 'Rifler', 68, 'RU'], ['HObbit', 'Entry', 68, 'KZ'], ['nafany', 'Support', 67, 'RU']],
  Complexity: [['JT', 'IGL', 70, 'ZA'], ['hallzerk', 'AWPer', 69, 'NO'], ['EliGE', 'Rifler', 68, 'US'], ['floppy', 'Entry', 67, 'US'], ['Grim', 'Support', 67, 'US']],
  '100 Thieves': [['Liazz', 'IGL', 70, 'AU'], ['azr', 'AWPer', 68, 'AU'], ['USTILO', 'Rifler', 67, 'AU'], ['Gratisfaction', 'Entry', 66, 'NZ'], ['Rickeh', 'Support', 65, 'AU']],
  TeamOne: [['malbsMd', 'IGL', 70, 'GT'], ['pesadelo', 'AWPer', 69, 'BR'], ['b4rtiN', 'Rifler', 68, 'BR'], ['trk', 'Entry', 66, 'BR'], ['Leomonster', 'Support', 65, 'BR']],
  Isurus: [['meyern', 'IGL', 68, 'AR'], ['1962', 'AWPer', 67, 'AR'], ['Reversive', 'Rifler', 66, 'AR'], ['deco', 'Entry', 65, 'AR'], ['Noktse', 'Support', 64, 'AR']],
  ODDIK: [['coldzera', 'IGL', 71, 'BR'], ['pancc', 'AWPer', 69, 'BR'], ['WOOD7', 'Rifler', 68, 'BR'], ['Tuurtle', 'Entry', 67, 'BR'], ['matios', 'Support', 66, 'BR']],
  'W7M Esports': [['felps', 'IGL', 70, 'BR'], ['HEN1', 'AWPer', 69, 'BR'], ['LUCAS1', 'Rifler', 68, 'BR'], ['kNgV-', 'Entry', 67, 'BR'], ['bit', 'Support', 66, 'BR']],
  'B4 Esports': [['nyezin', 'IGL', 70, 'BR'], ['togs', 'AWPer', 69, 'BR'], ['luq', 'Rifler', 68, 'BR'], ['iss', 'Entry', 67, 'BR'], ['dam', 'Support', 66, 'BR']],
  'MEIA NOITE': [['abr', 'IGL', 70, 'BR'], ['bsd', 'AWPer', 69, 'BR'], ['JOTA', 'Rifler', 67, 'BR'], ['Jerr1', 'Entry', 66, 'BR'], ['fREQ', 'Support', 65, 'BR']],
  Voca: [['nosraC', 'IGL', 70, 'US'], ['junior', 'AWPer', 69, 'US'], ['MarKE', 'Rifler', 68, 'MX'], ['dare', 'Entry', 67, 'US'], ['snav', 'Support', 66, 'US']],
  SportsBetExpert: [['consti', 'IGL', 70, 'US'], ['Infinite', 'AWPer', 69, 'US'], ['motm', 'Rifler', 68, 'US'], ['shane', 'Entry', 67, 'US'], ['Peeping', 'Support', 66, 'US']],
  regain: [['sasha', 'IGL', 69, 'US'], ['grape', 'AWPer', 68, 'US'], ['Zucar', 'Rifler', 67, 'US'], ['z0mb1e', 'Entry', 66, 'US'], ['fuzenko', 'Support', 65, 'UA']],
  'Wanted Goons': [['LUKE4k', 'IGL', 69, 'US'], ['febreeze', 'AWPer', 68, 'US'], ['killerPandas', 'Rifler', 67, 'US'], ['hibui', 'Entry', 66, 'US'], ['chante', 'Support', 65, 'US']],
  JiJieHao: [['sinnopsyy', 'IGL', 73, 'XK'], ['m1N1', 'AWPer', 72, 'LB'], ['Bibu', 'Rifler', 71, 'IQ'], ['0SAMAS', 'Entry', 69, 'PS'], ['CacaNito', 'Support', 68, 'MK']],
};

/* Bronze database: 79 real academy/Tier-3/regional clubs, Divisions 1-5 (55-64 OVR). */
export const BRONZE_DB: Record<string, WorldEntry[]> = {
  'The MongolZ Academy': [['nuka', 'AWPer', 58, 'MN'], ['Temka', 'IGL', 56, 'MN'], ['Haku', 'Rifler', 55, 'MN'], ['Zorigt', 'Entry', 55, 'MN'], ['Azbayar', 'Support', 55, 'MN']],
  'FURIA Academy': [['Lucca', 'IGL', 59, 'BR'], ['Nykz', 'AWPer', 58, 'BR'], ['zmb', 'Rifler', 57, 'BR'], ['ksloks', 'Entry', 56, 'BR'], ['brnz4n', 'Support', 55, 'BR']],
  'MIBR Academy': [['card', 'IGL', 58, 'BR'], ['fozil', 'AWPer', 57, 'BR'], ['Trash', 'Rifler', 56, 'BR'], ['vina', 'Entry', 55, 'BR'], ['dnz', 'Support', 55, 'BR']],
  'Imperial Academy': [['f4st', 'IGL', 58, 'BR'], ['nekiz', 'AWPer', 57, 'BR'], ['tata', 'Rifler', 56, 'BR'], ['bruninho', 'Entry', 55, 'BR'], ['kzn', 'Support', 55, 'BR']],
  'Sharks Academy': [['vulp', 'IGL', 57, 'BR'], ['zockz', 'AWPer', 56, 'BR'], ['tatin', 'Rifler', 55, 'BR'], ['snowz', 'Entry', 55, 'BR'], ['ph1', 'Support', 55, 'BR']],
  'Astralis Talent': [['Altekz', 'IGL', 64, 'DK'], ['br0', 'AWPer', 63, 'DK'], ['MistR', 'Rifler', 62, 'DK'], ['sirah', 'Entry', 61, 'DK'], ['k0nfig', 'Support', 64, 'DK']],
  'fnatic Rising': [['Peppzor', 'IGL', 64, 'SE'], ['regali', 'AWPer', 63, 'RO'], ['Krs7N', 'Rifler', 61, 'GB'], ['GiraffX', 'Entry', 60, 'GB'], ['Serpha', 'Support', 59, 'GB']],
  'Young Ninjas': [['BluePho3nix', 'IGL', 63, 'SE'], ['MisteM', 'AWPer', 63, 'ZA'], ['susp', 'Rifler', 62, 'SE'], ['nilo', 'Entry', 61, 'SE'], ['Chr1zN', 'Support', 60, 'DK']],
  'Vitality Academy': [['Kursy', 'IGL', 63, 'FR'], ['misutaaa', 'AWPer', 62, 'FR'], ['Graviti', 'Rifler', 61, 'FR'], ['Lucky', 'Entry', 60, 'FR'], ['Maka', 'Support', 59, 'FR']],
  'ENCE Academy': [['sAw', 'IGL', 63, 'FI'], ['doto', 'AWPer', 62, 'FI'], ['xseveN', 'Rifler', 61, 'FI'], ['Aerial', 'Entry', 60, 'FI'], ['p4nu', 'Support', 59, 'FI']],
  'HEROIC Academy': [['susp', 'IGL', 63, 'SE'], ['nilo', 'AWPer', 62, 'SE'], ['Chr1zN', 'Rifler', 61, 'DK'], ['Brollan', 'Entry', 61, 'SE'], ['MartinezSa', 'Support', 59, 'ES']],
  'Complexity Academy': [['floppy', 'IGL', 63, 'US'], ['Grim', 'AWPer', 62, 'US'], ['Jeorge', 'Rifler', 61, 'US'], ['Sonic', 'Entry', 60, 'ZA'], ['JT', 'Support', 61, 'ZA']],
  'TYLOO Academy': [['somebody', 'IGL', 60, 'CN'], ['DD', 'AWPer', 59, 'CN'], ['Mo', 'Rifler', 58, 'CN'], ['Savage', 'Entry', 56, 'CN'], ['qz', 'Support', 55, 'CN']],
  'Eternal Fire Academy': [['jottAAA', 'IGL', 64, 'TR'], ['MisteM', 'AWPer', 63, 'ZA'], ['regali', 'Rifler', 62, 'RO'], ['Soulfly', 'Entry', 61, 'TR'], ['Kvem', 'Support', 60, 'UA']],
  'Aurora Academy': [['XANTARES', 'IGL', 64, 'TR'], ['woxic', 'AWPer', 63, 'TR'], ['Wicadia', 'Rifler', 62, 'TR'], ['Jimpphat', 'Entry', 61, 'FI'], ['kyxsan', 'Support', 60, 'MK']],
  'BetBoom Academy': [['Magnojez', 'IGL', 64, 'RU'], ['zorte', 'AWPer', 63, 'RU'], ['S1ren', 'Rifler', 62, 'RU'], ['d1Ledez', 'Entry', 61, 'RU'], ['Boombl4', 'Support', 60, 'RU']],
  '9z Academy': [['max', 'IGL', 63, 'UY'], ['history', 'AWPer', 62, 'BR'], ['dgt', 'Rifler', 61, 'UY'], ['HUASOPEEK', 'Entry', 60, 'CL'], ['luchov', 'Support', 59, 'AR']],
  'Fluxo Academy': [['exit', 'IGL', 59, 'BR'], ['kye', 'AWPer', 58, 'BR'], ['Ltz', 'Rifler', 57, 'BR'], ['zevy', 'Entry', 56, 'BR'], ['nak', 'Support', 55, 'BR']],
  'Monte Gen': [['sdy', 'IGL', 64, 'UA'], ['mantuu', 'AWPer', 63, 'PL'], ['CYPHER', 'Rifler', 62, 'GB'], ['br0', 'Entry', 61, 'DK'], ['st0m4k', 'Support', 60, 'UA']],
  'SINNERS Academy': [['beastik', 'IGL', 59, 'CZ'], ['MoDo', 'AWPer', 58, 'RO'], ['SHOCK', 'Rifler', 57, 'CZ'], ['stressarN', 'Entry', 56, 'MK'], ['kisserek', 'Support', 55, 'PL']],
  '9INE Academy': [['raalz', 'IGL', 59, 'DK'], ['flayy', 'AWPer', 58, 'PL'], ['kraghen', 'Rifler', 57, 'DK'], ['rim3', 'Entry', 56, 'TR'], ['b1elany', 'Support', 55, 'PL']],
  'GamerLegion Academy': [['REZ', 'IGL', 63, 'SE'], ['Tauson', 'AWPer', 62, 'DK'], ['FL4MUS', 'Rifler', 61, 'RU'], ['hypex', 'Entry', 60, 'SK'], ['shalfey', 'Support', 59, 'RU']],
  'Cloud9 Academy': [['interz', 'IGL', 59, 'RU'], ['sh1ro', 'AWPer', 58, 'RU'], ['Ax1Le', 'Rifler', 57, 'RU'], ['HObbit', 'Entry', 56, 'KZ'], ['nafany', 'Support', 55, 'RU']],
  'Nigma Galaxy': [['SicK', 'IGL', 58, 'US'], ['vice', 'AWPer', 57, 'US'], ['Hiko', 'Rifler', 56, 'US'], ['n0thing', 'Entry', 55, 'US'], ['steel', 'Support', 55, 'CA']],
  'VP.Prodigy': [['mir', 'IGL', 63, 'RU'], ['b1st', 'AWPer', 62, 'RU'], ['Patsi', 'Rifler', 61, 'RU'], ['AquaRS', 'Entry', 60, 'RU'], ['tO0RO', 'Support', 59, 'RU']],
  'Aurora Young Blud': [['XANTARES', 'IGL', 59, 'TR'], ['woxic', 'AWPer', 58, 'TR'], ['Wicadia', 'Rifler', 57, 'TR'], ['Jimpphat', 'Entry', 56, 'FI'], ['kyxsan', 'Support', 55, 'MK']],
  'Just Swing': [['gas', 'IGL', 63, 'CN'], ['Daniel', 'AWPer', 62, 'CN'], ['Purely', 'Rifler', 61, 'CN'], ['Sat0r1', 'Entry', 60, 'CN'], ['skrr', 'Support', 59, 'CN']],
  'BORING PLAYERS': [['D1zzyg', 'IGL', 59, 'CN'], ['Jun7', 'AWPer', 58, 'CN'], ['zdr', 'Rifler', 57, 'CN'], ['0z', 'Entry', 56, 'CN'], ['4ever', 'Support', 55, 'CN']],
  XDM: [['rubeN', 'IGL', 59, 'CN'], ['r1verLaKe', 'AWPer', 58, 'CN'], ['Shad0w', 'Rifler', 57, 'CN'], ['Kungao', 'Entry', 56, 'CN'], ['darkk', 'Support', 55, 'CN']],
  ScarX: [['X1RON', 'IGL', 59, 'IR'], ['Dant1k', 'AWPer', 58, 'IR'], ['kRYPt0N', 'Rifler', 57, 'IR'], ['mRmN', 'Entry', 56, 'IR'], ['Dili', 'Support', 55, 'IR']],
  'Alter Ego': [['PokemoN', 'IGL', 63, 'PK'], ['adeX', 'AWPer', 62, 'RO'], ['shadiy', 'Rifler', 61, 'LV'], ['Bloody', 'Entry', 60, 'PK'], ['laxiee', 'Support', 59, 'MN']],
  Rooster: [['rekonz', 'IGL', 60, 'AU'], ['chelleos', 'AWPer', 59, 'NZ'], ['SkulL', 'Rifler', 58, 'AU'], ['ADK', 'Entry', 57, 'AU'], ['foggers', 'Support', 56, 'AU']],
  KZG: [['Kras', 'IGL', 59, 'AU'], ['Crunchy', 'AWPer', 58, 'AU'], ['Mechanical', 'Rifler', 57, 'AU'], ['N1ghtraid', 'Entry', 56, 'VN'], ['Mingovi', 'Support', 55, 'VN']],
  SemperFi: [['SaVage', 'IGL', 59, 'AU'], ['7Kick', 'AWPer', 58, 'RO'], ['74LOR', 'Rifler', 57, 'AU'], ['Noobster', 'Entry', 56, 'AU'], ['miwo', 'Support', 55, 'ME']],
  'Ground Zero': [['apocdud', 'IGL', 60, 'AU'], ['hazr', 'AWPer', 59, 'AU'], ['sliimey', 'Rifler', 58, 'AU'], ['Omichella', 'Entry', 57, 'AU'], ['vision', 'Support', 56, 'AU']],
  Abyssal: [['dangeR', 'IGL', 58, 'AU'], ['zune', 'AWPer', 57, 'AU'], ['Forleks', 'Rifler', 56, 'AU'], ['vinhy', 'Entry', 55, 'AU'], ['blood', 'Support', 55, 'AU']],
  Villainous: [['DYLAN', 'IGL', 58, 'CA'], ['Sunk', 'AWPer', 57, 'US'], ['bright', 'Rifler', 56, 'US'], ['Burglar', 'Entry', 55, 'CA'], ['Jolts', 'Support', 55, 'US']],
  Marsborne: [['freshie', 'IGL', 58, 'CA'], ['nicx', 'AWPer', 57, 'US'], ['Grizz', 'Rifler', 56, 'US'], ['WUMBO', 'Entry', 55, 'US'], ['ogwizard', 'Support', 55, 'US']],
  'Chicken Coop': [['Crisp', 'IGL', 58, 'US'], ['Drop', 'AWPer', 57, 'CA'], ['Jared', 'Rifler', 56, 'US'], ['Wolffe', 'Entry', 55, 'US'], ['stesso', 'Support', 55, 'DK']],
  'Beyond Limits': [['doltn', 'IGL', 58, 'US'], ['Beastman', 'AWPer', 57, 'US'], ['flixxy', 'Rifler', 56, 'US'], ['Pr0mise', 'Entry', 55, 'US'], ['denz', 'Support', 55, 'CA']],
  'Nouns Esports': [['nosraC', 'IGL', 59, 'US'], ['junior', 'AWPer', 58, 'US'], ['MarKE', 'Rifler', 57, 'MX'], ['dare', 'Entry', 56, 'US'], ['snav', 'Support', 55, 'US']],
  'Party Astronauts': [['consti', 'IGL', 58, 'US'], ['Infinite', 'AWPer', 57, 'US'], ['motm', 'Rifler', 56, 'US'], ['shane', 'Entry', 55, 'US'], ['Peeping', 'Support', 55, 'US']],
  BOSS: [['autimatic', 'IGL', 60, 'US'], ['CeRq', 'AWPer', 59, 'BG'], ['Brehze', 'Rifler', 58, 'US'], ['Stewie2K', 'Entry', 57, 'US'], ['FaNg', 'Support', 56, 'CA']],
  'Take Flyte': [['sasha', 'IGL', 58, 'US'], ['grape', 'AWPer', 57, 'US'], ['Zucar', 'Rifler', 56, 'US'], ['z0mb1e', 'Entry', 55, 'US'], ['fuzenko', 'Support', 55, 'UA']],
  MIGHT: [['LUKE4k', 'IGL', 58, 'US'], ['febreeze', 'AWPer', 57, 'US'], ['killerPandas', 'Rifler', 56, 'US'], ['hibui', 'Entry', 55, 'US'], ['chante', 'Support', 55, 'US']],
  Vagrants: [['djay', 'IGL', 58, 'CA'], ['SLIGHT', 'AWPer', 57, 'US'], ['Cryptic', 'Rifler', 56, 'US'], ['Bwills', 'Entry', 55, 'US'], ['Sandman', 'Support', 55, 'US']],
  'FLUFFY AIMERS': [['freshie', 'IGL', 57, 'CA'], ['nicx', 'AWPer', 56, 'US'], ['Grizz', 'Rifler', 55, 'US'], ['WUMBO', 'Entry', 55, 'US'], ['ogwizard', 'Support', 55, 'US']],
  timbermen: [['Crisp', 'IGL', 57, 'US'], ['Drop', 'AWPer', 56, 'CA'], ['Jared', 'Rifler', 55, 'US'], ['Wolffe', 'Entry', 55, 'US'], ['stesso', 'Support', 55, 'DK']],
  ATK: [['Liazz', 'IGL', 59, 'AU'], ['azr', 'AWPer', 58, 'AU'], ['USTILO', 'Rifler', 57, 'AU'], ['Gratisfaction', 'Entry', 56, 'NZ'], ['Rickeh', 'Support', 55, 'AU']],
  'Extra Salt': [['JT', 'IGL', 59, 'ZA'], ['hallzerk', 'AWPer', 58, 'NO'], ['EliGE', 'Rifler', 57, 'US'], ['floppy', 'Entry', 56, 'US'], ['Grim', 'Support', 55, 'US']],
  'Bad News Bears': [['malta', 'IGL', 58, 'AU'], ['tucks', 'AWPer', 57, 'AU'], ['Hatz', 'Rifler', 56, 'AU'], ['Noobster', 'Entry', 55, 'AU'], ['JDubs', 'Support', 55, 'AU']],
  'O PLANO': [['coldzera', 'IGL', 60, 'BR'], ['pancc', 'AWPer', 59, 'BR'], ['WOOD7', 'Rifler', 58, 'BR'], ['Tuurtle', 'Entry', 57, 'BR'], ['matios', 'Support', 56, 'BR']],
  'Havan Liberty': [['felps', 'IGL', 59, 'BR'], ['HEN1', 'AWPer', 58, 'BR'], ['LUCAS1', 'Rifler', 57, 'BR'], ['kNgV-', 'Entry', 56, 'BR'], ['bit', 'Support', 55, 'BR']],
  SWS: [['nyezin', 'IGL', 58, 'BR'], ['togs', 'AWPer', 57, 'BR'], ['luq', 'Rifler', 56, 'BR'], ['iss', 'Entry', 55, 'BR'], ['dam', 'Support', 55, 'BR']],
  '00NATION': [['arT', 'IGL', 60, 'BR'], ['latto', 'AWPer', 59, 'BR'], ['dumau', 'Rifler', 58, 'BR'], ['n1ssim', 'Entry', 57, 'BR'], ['try', 'Support', 56, 'BR']],
  NomadS: [['Paranormal', 'IGL', 59, 'MN'], ['soloooS', 'AWPer', 58, 'MN'], ['Kamui', 'Rifler', 57, 'MN'], ['grizzly', 'Entry', 56, 'MN'], ['Cozen', 'Support', 55, 'MN']],
  NKT: [['Attacker', 'IGL', 59, 'CN'], ['xccurate', 'AWPer', 58, 'ID'], ['captainMo', 'Rifler', 57, 'CN'], ['Savage', 'Entry', 56, 'CN'], ['qz', 'Support', 55, 'CN']],
  Newhappy: [['somebody', 'IGL', 58, 'CN'], ['DD', 'AWPer', 57, 'CN'], ['Mo', 'Rifler', 56, 'CN'], ['B1N', 'Entry', 55, 'CN'], ['Zero', 'Support', 55, 'CN']],
  'Wings Up': [['gas', 'IGL', 58, 'CN'], ['Daniel', 'AWPer', 57, 'CN'], ['Purely', 'Rifler', 56, 'CN'], ['Sat0r1', 'Entry', 55, 'CN'], ['skrr', 'Support', 55, 'CN']],
  Bromo: [['D1zzyg', 'IGL', 57, 'CN'], ['Jun7', 'AWPer', 56, 'CN'], ['zdr', 'Rifler', 55, 'CN'], ['0z', 'Entry', 55, 'CN'], ['4ever', 'Support', 55, 'CN']],
  CatEvil: [['rubeN', 'IGL', 57, 'CN'], ['r1verLaKe', 'AWPer', 56, 'CN'], ['Shad0w', 'Rifler', 55, 'CN'], ['Kungao', 'Entry', 55, 'CN'], ['darkk', 'Support', 55, 'CN']],
  'Survivor Gaming': [['X1RON', 'IGL', 57, 'IR'], ['Dant1k', 'AWPer', 56, 'IR'], ['kRYPt0N', 'Rifler', 55, 'IR'], ['mRmN', 'Entry', 55, 'IR'], ['Dili', 'Support', 55, 'IR']],
  'Invictus Gaming': [['Attacker', 'IGL', 59, 'CN'], ['xccurate', 'AWPer', 58, 'ID'], ['captainMo', 'Rifler', 57, 'CN'], ['Savage', 'Entry', 56, 'CN'], ['qz', 'Support', 55, 'CN']],
  'Clutch Gaming': [['Kras', 'IGL', 58, 'AU'], ['Crunchy', 'AWPer', 57, 'AU'], ['Mechanical', 'Rifler', 56, 'AU'], ['N1ghtraid', 'Entry', 55, 'VN'], ['Mingovi', 'Support', 55, 'VN']],
  'Arcade Esports': [['SaVage', 'IGL', 57, 'AU'], ['7Kick', 'AWPer', 56, 'RO'], ['74LOR', 'Rifler', 55, 'AU'], ['Noobster', 'Entry', 55, 'AU'], ['miwo', 'Support', 55, 'ME']],
  Housebets: [['apocdud', 'IGL', 57, 'AU'], ['hazr', 'AWPer', 56, 'AU'], ['sliimey', 'Rifler', 55, 'AU'], ['Omichella', 'Entry', 55, 'AU'], ['vision', 'Support', 55, 'AU']],
  'Steel Helmet': [['dangeR', 'IGL', 57, 'AU'], ['zune', 'AWPer', 56, 'AU'], ['Forleks', 'Rifler', 55, 'AU'], ['vinhy', 'Entry', 55, 'AU'], ['blood', 'Support', 55, 'AU']],
  Bandits: [['DYLAN', 'IGL', 57, 'CA'], ['Sunk', 'AWPer', 56, 'US'], ['bright', 'Rifler', 55, 'US'], ['Burglar', 'Entry', 55, 'CA'], ['Jolts', 'Support', 55, 'US']],
  Mindfreak: [['rekonz', 'IGL', 56, 'AU'], ['chelleos', 'AWPer', 56, 'NZ'], ['SkulL', 'Rifler', 55, 'AU'], ['ADK', 'Entry', 55, 'AU'], ['foggers', 'Support', 55, 'AU']],
  VERTEX: [['Kras', 'IGL', 56, 'AU'], ['Crunchy', 'AWPer', 55, 'AU'], ['Mechanical', 'Rifler', 55, 'AU'], ['N1ghtraid', 'Entry', 55, 'VN'], ['Mingovi', 'Support', 55, 'VN']],
  'DXA Esports': [['dangeR', 'IGL', 55, 'AU'], ['zune', 'AWPer', 55, 'AU'], ['Forleks', 'Rifler', 55, 'AU'], ['vinhy', 'Entry', 55, 'AU'], ['blood', 'Support', 55, 'AU']],
  'Galo do Cerrado': [['nyezin', 'IGL', 56, 'BR'], ['togs', 'AWPer', 56, 'BR'], ['luq', 'Rifler', 55, 'BR'], ['iss', 'Entry', 55, 'BR'], ['dam', 'Support', 55, 'BR']],
  'Dusty Roots': [['Lucca', 'IGL', 56, 'BR'], ['Nykz', 'AWPer', 55, 'BR'], ['zmb', 'Rifler', 55, 'BR'], ['ksloks', 'Entry', 55, 'BR'], ['brnz4n', 'Support', 55, 'BR']],
  'Patins da Ferrari': [['card', 'IGL', 55, 'BR'], ['fozil', 'AWPer', 55, 'BR'], ['Trash', 'Rifler', 55, 'BR'], ['vina', 'Entry', 55, 'BR'], ['dnz', 'Support', 55, 'BR']],
  'Meta Gaming': [['f4st', 'IGL', 55, 'BR'], ['nekiz', 'AWPer', 55, 'BR'], ['tata', 'Rifler', 55, 'BR'], ['bruninho', 'Entry', 55, 'BR'], ['kzn', 'Support', 55, 'BR']],
  'Boca Juniors Gaming': [['max', 'IGL', 56, 'UY'], ['history', 'AWPer', 56, 'BR'], ['dgt', 'Rifler', 55, 'UY'], ['HUASOPEEK', 'Entry', 55, 'CL'], ['luchov', 'Support', 55, 'AR']],
  'Corinthians Esports': [['arT', 'IGL', 56, 'BR'], ['latto', 'AWPer', 55, 'BR'], ['dumau', 'Rifler', 55, 'BR'], ['n1ssim', 'Entry', 55, 'BR'], ['try', 'Support', 55, 'BR']],
  Fuscão: [['felps', 'IGL', 55, 'BR'], ['HEN1', 'AWPer', 55, 'BR'], ['LUCAS1', 'Rifler', 55, 'BR'], ['kNgV-', 'Entry', 55, 'BR'], ['bit', 'Support', 55, 'BR']],
  'Flamengo Esports': [['coldzera', 'IGL', 56, 'BR'], ['pancc', 'AWPer', 55, 'BR'], ['WOOD7', 'Rifler', 55, 'BR'], ['Tuurtle', 'Entry', 55, 'BR'], ['matios', 'Support', 55, 'BR']],
};

export const WORLD_TEAMS: string[] = Object.keys(WORLD_DB);
export const SILVER_TEAMS: string[] = Object.keys(SILVER_DB);
export const BRONZE_TEAMS: string[] = Object.keys(BRONZE_DB);
export const ALL_TEAMS: string[] = [...WORLD_TEAMS, ...SILVER_TEAMS, ...BRONZE_TEAMS];

export type WorldPlayer = { name: string; role: EcoRole; ovr: number; country: string; team: string };

/** One lookup for every real roster, used by the scouting screen and the card packs. */
export const REAL_DB: Record<string, WorldEntry[]> = { ...SILVER_DB, ...BRONZE_DB, ...WORLD_DB };

export const WORLD_PLAYERS: WorldPlayer[] = ALL_TEAMS.flatMap((team) =>
  (REAL_DB[team] ?? []).map(([name, role, ovr, country]) => ({ team, name, role, ovr, country })),
);

const worldAvgOvr = (name: string): number => {
  const roster = REAL_DB[name];
  if (!roster || !roster.length) return 0;
  return Math.round(roster.reduce((total, entry) => total + entry[2], 0) / roster.length);
};

/* ------------------------------------------------------------------ */
/* Team names, strongest division first (index 0 = Division 15)        */
/* ------------------------------------------------------------------ */

const byAverage = (teams: string[]): string[] => [...teams].sort(
  (a, b) => worldAvgOvr(b) - worldAvgOvr(a) || a.localeCompare(b),
);

/** Every club of each tier, strongest five-man average first. */
const WORLD_BY_OVR: string[] = byAverage(WORLD_TEAMS);
const SILVER_BY_OVR: string[] = byAverage(SILVER_TEAMS);
const BRONZE_BY_OVR: string[] = byAverage(BRONZE_TEAMS);

/**
 * OVR window of each division (index 0 = Bronze / Division 1 ... 14 = Global Elite).
 * Every window is measured from the true five-man averages of its 16 real clubs:
 * bronze academies sit at 55-64, silver Tier-2/3 at 65-74, elite clubs at 55-96.
 * Keep this in sync with the `divisions` table in App.tsx.
 */
export const DIVISION_BANDS: [number, number][] = (() => {
  const bands: [number, number][] = Array.from(
    { length: ECO_DIVISIONS },
    () => [55, 56] as [number, number],
  );
  const fill = (sorted: string[], lowestDivision: number): void => {
    for (let group = 0; group < 5; group += 1) {
      const division = lowestDivision + 4 - group;
      const averages = sorted
        .slice(group * ECO_TEAMS_PER_DIVISION, (group + 1) * ECO_TEAMS_PER_DIVISION)
        .map(worldAvgOvr);
      bands[division] = [Math.min(...averages), Math.max(...averages)];
    }
  };
  fill(BRONZE_BY_OVR, 0);
  fill(SILVER_BY_OVR, 5);
  fill(WORLD_BY_OVR, 10);
  return bands;
})();

/** Names grouped by division index (0 = Bronze/Division 1 ... 14 = Global Elite). */
const DIVISION_POOLS: string[][] = (() => {
  const pools: string[][] = Array.from({ length: ECO_DIVISIONS }, () => [] as string[]);
  const fill = (sorted: string[], lowestDivision: number): void => {
    for (let group = 0; group < 5; group += 1) {
      const division = lowestDivision + 4 - group;
      pools[division] = sorted.slice(group * ECO_TEAMS_PER_DIVISION, (group + 1) * ECO_TEAMS_PER_DIVISION);
    }
  };
  fill(BRONZE_BY_OVR, 0);
  fill(SILVER_BY_OVR, 5);
  fill(WORLD_BY_OVR, 10);
  // Division 1 fields 15 AI clubs: the player's own club holds the 16th seat.
  pools[0] = pools[0].slice(0, ECO_TEAMS_PER_DIVISION - 1);
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
  const ovr = clamp(fixedOvr ?? team.ovr + OVR_SPREAD[index] + Math.round(rand() * 2) - 1, 50, 99);
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
  const real = REAL_DB[team.name];
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

export const hasRealRoster = (name: string): boolean => Boolean(REAL_DB[name]);

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
