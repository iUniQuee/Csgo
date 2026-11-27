import { useEffect, useRef, useState } from 'react';

export type RadarDuelist = {
  name: string;
  role: string;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
};

export type RadarEconomy = { ours: string; theirs: string };
export type RadarTactic = 'Aggressive Rush' | 'Slow Default' | 'Defensive / Anti-Eco';

export type RadarMapId = 'Mirage' | 'Inferno' | 'Ancient' | 'Dust2' | 'Nuke';

type Point = { x: number; y: number };
type Lane = 'A' | 'B' | 'mid';
type Side = 'ct' | 't';
type ZoneKind = 'site' | 'spawn' | 'corridor' | 'room';

type Zone = { d: string; kind?: ZoneKind };
type MapLabel = { x: number; y: number; text: string; tone?: 'site' | 'spawn' | 'muted'; rotate?: number };
type RadarMap = {
  name: RadarMapId;
  areas: Zone[];
  walls: string[];
  labels: MapLabel[];
  spawns: { ct: Point; t: Point };
  sites: { A: Point; B: Point };
  ctRoutes: Record<Lane, Point[]>;
  tRoutes: Record<Lane, Point[]>;
  holdAngles: Record<Lane, number>;
};

const p = (x: number, y: number): Point => ({ x, y });
const rect = (x: number, y: number, width: number, height: number): string => `M${x} ${y}H${x + width}V${y + height}H${x}Z`;
const poly = (...points: Array<[number, number]>): string => `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const zone = (d: string, kind: ZoneKind = 'room'): Zone => ({ d, kind });

const MAPS: Record<RadarMapId, RadarMap> = {
  Mirage: {
    name: 'Mirage',
    areas: [
      zone(rect(38, 3, 24, 11), 'spawn'),
      zone(rect(40, 14, 20, 18)),
      zone(rect(68, 12, 26, 22), 'site'),
      zone(rect(6, 14, 24, 20), 'site'),
      zone(rect(45, 32, 10, 54), 'corridor'),
      zone(rect(38, 88, 24, 10), 'spawn'),
      zone(poly([58, 44], [68, 34], [82, 40], [82, 62], [60, 62])),
      zone(rect(84, 36, 12, 28)),
      zone(rect(30, 38, 14, 26), 'corridor'),
      zone(rect(18, 34, 12, 14), 'corridor'),
      zone(rect(30, 64, 15, 10), 'corridor'),
      zone(rect(62, 14, 8, 14), 'corridor'),
    ],
    walls: ['M68 34H62', 'M82 40H84', 'M68 12V34', 'M30 14V22', 'M6 34H18', 'M45 32H40', 'M55 32H62', 'M55 58H60', 'M30 64H45', 'M68 62H82'],
    labels: [
      { x: 50, y: 58, text: 'MID', tone: 'muted', rotate: -90 },
      { x: 81, y: 18, text: 'A SITE', tone: 'site' },
      { x: 18, y: 19, text: 'B SITE', tone: 'site' },
      { x: 50, y: 8, text: 'CT SPAWN', tone: 'spawn' },
      { x: 50, y: 94, text: 'T SPAWN', tone: 'spawn' },
      { x: 90, y: 50, text: 'PALACE', tone: 'muted', rotate: -90 },
      { x: 37, y: 51, text: 'APPS', tone: 'muted' },
      { x: 71, y: 56, text: 'RAMP', tone: 'muted' },
    ],
    spawns: { ct: p(50, 9), t: p(50, 93) },
    sites: { A: p(81, 25), B: p(18, 26) },
    ctRoutes: {
      A: [p(50, 9), p(60, 18), p(70, 26), p(78, 29)],
      B: [p(50, 9), p(38, 18), p(26, 24), p(20, 30)],
      mid: [p(50, 9), p(50, 22), p(50, 40)],
    },
    tRoutes: {
      A: [p(50, 93), p(50, 76), p(53, 60), p(62, 48), p(72, 34), p(80, 28)],
      B: [p(50, 93), p(40, 80), p(34, 62), p(28, 46), p(18, 34), p(18, 27)],
      mid: [p(50, 93), p(50, 64), p(50, 42), p(58, 34), p(74, 27)],
    },
    holdAngles: { A: 140, B: 40, mid: 90 },
  },
  Inferno: {
    name: 'Inferno',
    areas: [
      zone(rect(38, 3, 24, 11), 'spawn'),
      zone(rect(64, 10, 30, 24), 'site'),
      zone(rect(4, 64, 26, 24), 'site'),
      zone(rect(36, 86, 22, 11), 'spawn'),
      zone(rect(42, 36, 16, 50), 'corridor'),
      zone(poly([8, 32], [24, 32], [30, 64], [18, 70], [8, 62]), 'corridor'),
      zone(rect(58, 36, 18, 18)),
      zone(rect(58, 54, 14, 20), 'corridor'),
      zone(rect(56, 28, 14, 10), 'corridor'),
      zone(rect(38, 20, 24, 12), 'corridor'),
      zone(rect(4, 44, 12, 14)),
      zone(rect(28, 72, 16, 14)),
      zone(rect(30, 76, 12, 14), 'corridor'),
    ],
    walls: ['M64 28H56', 'M72 28V10', 'M64 34H58', 'M42 36H38', 'M42 54H38', 'M58 64H56', 'M30 64H42', 'M30 40H24', 'M18 44V64', 'M12 64V72', 'M28 86H8'],
    labels: [
      { x: 79, y: 16, text: 'A SITE', tone: 'site' },
      { x: 17, y: 70, text: 'B SITE', tone: 'site' },
      { x: 50, y: 58, text: 'MID', tone: 'muted', rotate: -90 },
      { x: 17, y: 46, text: 'BANANA', tone: 'muted', rotate: -70 },
      { x: 50, y: 8, text: 'CT SPAWN', tone: 'spawn' },
      { x: 47, y: 91, text: 'T SPAWN', tone: 'spawn' },
      { x: 67, y: 45, text: 'APPS', tone: 'muted' },
      { x: 63, y: 32, text: 'ARCH', tone: 'muted' },
      { x: 10, y: 51, text: 'PIT', tone: 'muted' },
      { x: 36, y: 79, text: 'LIBRARY', tone: 'muted' },
    ],
    spawns: { ct: p(50, 9), t: p(47, 90) },
    sites: { A: p(78, 24), B: p(16, 76) },
    ctRoutes: {
      A: [p(50, 9), p(62, 18), p(72, 22), p(76, 29)],
      B: [p(50, 9), p(36, 30), p(24, 48), p(18, 68)],
      mid: [p(50, 9), p(50, 30), p(48, 44)],
    },
    tRoutes: {
      A: [p(44, 95), p(46, 78), p(54, 62), p(64, 46), p(72, 32), p(76, 24)],
      B: [p(44, 95), p(30, 88), p(24, 76), p(16, 68), p(14, 76)],
      mid: [p(44, 95), p(48, 72), p(50, 52), p(60, 40), p(70, 30), p(76, 24)],
    },
    holdAngles: { A: 155, B: 25, mid: 90 },
  },
  Ancient: {
    name: 'Ancient',
    areas: [
      zone(rect(38, 3, 24, 10), 'spawn'),
      zone(rect(66, 14, 28, 22), 'site'),
      zone(rect(6, 16, 26, 22), 'site'),
      zone(rect(38, 86, 24, 11), 'spawn'),
      zone(rect(44, 32, 12, 54), 'corridor'),
      zone(rect(62, 40, 16, 14)),
      zone(rect(20, 42, 18, 16)),
      zone(poly([58, 34], [68, 24], [84, 36], [84, 54], [66, 58])),
      zone(poly([6, 38], [22, 38], [30, 54], [18, 64], [6, 56])),
      zone(rect(40, 70, 20, 16), 'corridor'),
      zone(rect(38, 14, 10, 16), 'corridor'),
      zone(rect(52, 14, 10, 16), 'corridor'),
      zone(rect(30, 68, 14, 14), 'corridor'),
      zone(rect(72, 40, 14, 18)),
    ],
    walls: ['M66 24H58', 'M66 36H62', 'M78 36V40', 'M30 38V42', 'M20 58V64', 'M18 64V70', 'M38 30H30', 'M50 30H56', 'M40 70H30', 'M56 58V70'],
    labels: [
      { x: 80, y: 18, text: 'A SITE', tone: 'site' },
      { x: 18, y: 20, text: 'B SITE', tone: 'site' },
      { x: 50, y: 58, text: 'MID', tone: 'muted', rotate: -90 },
      { x: 70, y: 47, text: 'DONUT', tone: 'muted' },
      { x: 29, y: 50, text: 'CAVE', tone: 'muted' },
      { x: 50, y: 8, text: 'CT SPAWN', tone: 'spawn' },
      { x: 50, y: 93, text: 'T SPAWN', tone: 'spawn' },
      { x: 37, y: 75, text: 'RAMP', tone: 'muted' },
      { x: 79, y: 50, text: 'TEMPLE', tone: 'muted' },
    ],
    spawns: { ct: p(50, 9), t: p(50, 93) },
    sites: { A: p(80, 26), B: p(18, 28) },
    ctRoutes: {
      A: [p(50, 9), p(62, 18), p(72, 24), p(78, 30)],
      B: [p(50, 9), p(38, 18), p(26, 24), p(18, 32)],
      mid: [p(50, 9), p(50, 30), p(50, 44)],
    },
    tRoutes: {
      A: [p(50, 94), p(56, 78), p(64, 60), p(72, 46), p(78, 32)],
      B: [p(50, 94), p(42, 78), p(34, 58), p(22, 44), p(18, 30)],
      mid: [p(50, 94), p(50, 66), p(50, 44), p(62, 34), p(76, 27)],
    },
    holdAngles: { A: 160, B: 20, mid: 90 },
  },
  Dust2: {
    name: 'Dust2',
    areas: [
      zone(rect(38, 3, 24, 11), 'spawn'),
      zone(rect(68, 12, 28, 22), 'site'),
      zone(rect(4, 12, 28, 22), 'site'),
      zone(rect(68, 86, 24, 12), 'spawn'),
      zone(rect(44, 34, 12, 48), 'corridor'),
      zone(poly([84, 86], [94, 74], [94, 44], [84, 30], [84, 52]), 'corridor'),
      zone(rect(82, 54, 12, 14)),
      zone(rect(56, 32, 12, 16), 'corridor'),
      zone(poly([52, 86], [64, 94], [70, 86], [58, 78], [48, 68], [36, 60], [28, 48], [22, 34]), 'corridor'),
      zone(rect(22, 34, 16, 22), 'corridor'),
      zone(rect(46, 72, 20, 16), 'corridor'),
      zone(rect(52, 48, 8, 8)),
      zone(rect(62, 28, 12, 14), 'corridor'),
      zone(rect(30, 22, 14, 10), 'corridor'),
    ],
    walls: ['M68 34H56', 'M84 30H94', 'M82 54H94', 'M84 68H94', 'M62 28H56', 'M44 34H36', 'M44 60H36', 'M46 72H38', 'M30 34H22', 'M38 44H22', 'M68 12V34'],
    labels: [
      { x: 82, y: 18, text: 'A SITE', tone: 'site' },
      { x: 18, y: 18, text: 'B SITE', tone: 'site' },
      { x: 50, y: 58, text: 'MID', tone: 'muted', rotate: -90 },
      { x: 90, y: 58, text: 'LONG A', tone: 'muted', rotate: -90 },
      { x: 62, y: 38, text: 'CATWALK', tone: 'muted' },
      { x: 46, y: 73, text: 'TUNNELS', tone: 'muted' },
      { x: 50, y: 8, text: 'CT SPAWN', tone: 'spawn' },
      { x: 80, y: 92, text: 'T SPAWN', tone: 'spawn' },
    ],
    spawns: { ct: p(50, 9), t: p(80, 92) },
    sites: { A: p(82, 24), B: p(18, 24) },
    ctRoutes: {
      A: [p(50, 9), p(64, 18), p(76, 24), p(82, 30)],
      B: [p(50, 9), p(38, 18), p(24, 24), p(18, 30)],
      mid: [p(50, 9), p(50, 28), p(50, 44)],
    },
    tRoutes: {
      A: [p(80, 94), p(90, 82), p(90, 60), p(88, 44), p(82, 30)],
      B: [p(80, 94), p(64, 94), p(52, 84), p(38, 76), p(26, 62), p(22, 44), p(20, 28)],
      mid: [p(80, 94), p(64, 76), p(52, 60), p(50, 44), p(62, 34), p(78, 26)],
    },
    holdAngles: { A: 160, B: 20, mid: 90 },
  },
  Nuke: {
    name: 'Nuke',
    areas: [
      zone(rect(40, 3, 20, 10), 'spawn'),
      zone(rect(66, 16, 28, 24), 'site'),
      zone(rect(8, 54, 26, 24), 'site'),
      zone(rect(38, 86, 24, 11), 'spawn'),
      zone(rect(72, 40, 22, 44), 'corridor'),
      zone(rect(56, 58, 16, 20), 'corridor'),
      zone(rect(62, 30, 10, 10)),
      zone(rect(26, 24, 22, 14)),
      zone(rect(42, 44, 14, 10), 'corridor'),
      zone(rect(38, 34, 12, 48), 'corridor'),
      zone(rect(56, 14, 14, 18), 'corridor'),
      zone(rect(18, 44, 18, 14), 'corridor'),
      zone(rect(4, 36, 14, 14)),
    ],
    walls: ['M66 28H56', 'M72 40H66', 'M56 58H50', 'M72 58H56', 'M56 78H50', 'M42 54H38', 'M42 44H38', 'M38 34H26', 'M48 34V14', 'M36 44H18', 'M18 54H4'],
    labels: [
      { x: 80, y: 20, text: 'A SITE', tone: 'site' },
      { x: 21, y: 60, text: 'B SITE', tone: 'site' },
      { x: 83, y: 64, text: 'OUTSIDE', tone: 'muted', rotate: -90 },
      { x: 64, y: 66, text: 'RAMP', tone: 'muted' },
      { x: 67, y: 35, text: 'HUT', tone: 'muted' },
      { x: 37, y: 31, text: 'GARAGE', tone: 'muted' },
      { x: 49, y: 49, text: 'VENTS', tone: 'muted' },
      { x: 50, y: 8, text: 'CT SPAWN', tone: 'spawn' },
      { x: 50, y: 91, text: 'T SPAWN', tone: 'spawn' },
    ],
    spawns: { ct: p(50, 9), t: p(50, 91) },
    sites: { A: p(80, 28), B: p(21, 66) },
    ctRoutes: {
      A: [p(50, 9), p(62, 18), p(72, 24), p(78, 32)],
      B: [p(50, 9), p(40, 26), p(30, 44), p(22, 62)],
      mid: [p(50, 9), p(50, 30), p(50, 44)],
    },
    tRoutes: {
      A: [p(50, 94), p(72, 88), p(86, 76), p(88, 58), p(78, 44), p(78, 34)],
      B: [p(50, 94), p(44, 82), p(36, 74), p(28, 70), p(24, 62)],
      mid: [p(50, 94), p(58, 74), p(64, 58), p(72, 44), p(78, 36)],
    },
    holdAngles: { A: 160, B: 20, mid: 90 },
  },
};

type Agent = {
  id: string;
  side: Side;
  name: string;
  role: string;
  ovr: number;
  aim: number;
  rfl: number;
  sns: number;
  clt: number;
  x: number;
  y: number;
  angle: number;
  baseAngle: number;
  lane: Lane;
  path: Point[];
  waypoint: number;
  speed: number;
  moving: boolean;
  holding: boolean;
  alive: boolean;
  sweep: number;
  alert: Point | null;
  alertUntil: number;
  range: number;
  halfAngle: number;
  rechamberMs: number;
  nextShotAt: number;
  silent: boolean;
  forcedOutUntil: number;
  blindUntil: number;
  utilityThrown: boolean;
};

type Marker = { id: string; x: number; y: number; side: Side; name: string };
type Ring = { id: string; x: number; y: number; at: number; side: Side };
type Tracer = { id: string; from: Point; to: Point; side: Side; type: 'front' | 'flank' | 'angle'; miss?: boolean; at: number };
type Smoke = { id: string; x: number; y: number; radius: number; at: number; until: number };
type Fire = { id: string; x: number; y: number; radius: number; at: number; until: number };
type Flash = { id: string; x: number; y: number; at: number; until: number };
type Clutch = { side: Side; name: string; enemies: number } | null;
type C4 = { x: number; y: number; site: 'A' | 'B'; at: number } | null;
type RadarState = {
  tick: number;
  agents: Agent[];
  markers: Marker[];
  rings: Ring[];
  tracers: Tracer[];
  smokes: Smoke[];
  fires: Fire[];
  flashes: Flash[];
  c4: C4;
  fakeUsed: boolean;
  clutch: Clutch;
  event: string;
  respawnAt: number | null;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const angleTo = (from: Point, to: Point): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const angleGap = (first: number, second: number): number => Math.abs((((first - second) % 360) + 540) % 360 - 180);
const distance = (first: Point, second: Point): number => Math.hypot(first.x - second.x, first.y - second.y);
const turnToward = (current: number, target: number, maxStep: number): number => {
  const gap = ((target - current + 540) % 360) - 180;
  return current + clamp(gap, -maxStep, maxStep);
};

const powerOf = (agent: Agent): number => agent.aim * 0.55 + agent.ovr * 0.3 + agent.rfl * 0.15 + (agent.role === 'AWPer' ? 11 : 0);

const laneForRole = (role: string): Lane => role === 'IGL' ? 'mid' : role === 'Entry' || role === 'AWPer' ? 'A' : 'B';

const createAgent = (player: RadarDuelist, side: Side, map: RadarMap, index: number): Agent => {
  const lane = laneForRole(player.role);
  const path = (side === 'ct' ? map.ctRoutes : map.tRoutes)[lane];
  const start = path[0] ?? (side === 'ct' ? map.spawns.ct : map.spawns.t);
  const site = lane === 'B' ? map.sites.B : map.sites.A;
  const offset = (index % 3 - 1) * 0.7;
  const awp = player.role === 'AWPer';
  const entry = player.role === 'Entry';
  return {
    id: `${side}-${index}`,
    side,
    name: player.name,
    role: player.role,
    ovr: player.ovr,
    aim: player.aim,
    rfl: player.rfl,
    sns: player.sns,
    clt: player.clt,
    x: start.x + offset,
    y: start.y,
    angle: side === 'ct' ? map.holdAngles[lane] : angleTo(start, site),
    baseAngle: side === 'ct' ? map.holdAngles[lane] : angleTo(start, site),
    lane,
    path,
    waypoint: 1,
    speed: (2.05 + clamp((player.ovr - 55) / 36, 0, 1.1)) * (entry ? 1.12 : 1),
    moving: true,
    holding: false,
    alive: true,
    sweep: index * 1.9,
    alert: null,
    alertUntil: 0,
    range: awp ? 31 : 23,
    halfAngle: awp ? 15 : 33,
    rechamberMs: awp ? 1500 : 0,
    nextShotAt: 0,
    silent: player.role === 'Lurker' || player.role === 'Rifler',
    forcedOutUntil: 0,
    blindUntil: 0,
    utilityThrown: false,
  };
};

const createRadarRound = (map: RadarMap, ours: RadarDuelist[], theirs: RadarDuelist[]): RadarState => {
  const agents = [
    ...ours.slice(0, 5).map((player, index) => createAgent(player, 'ct', map, index)),
    ...theirs.slice(0, 5).map((player, index) => createAgent(player, 't', map, index)),
  ];
  return {
    tick: 0,
    agents,
    markers: [],
    rings: [],
    tracers: [],
    smokes: [],
    fires: [],
    flashes: [],
    c4: null,
    fakeUsed: false,
    clutch: null,
    event: 'Radar online. Vision cones active — utility and role perks enabled.',
    respawnAt: null,
  };
};

const conePath = (range = 18, halfAngle = 33): string => {
  const half = (halfAngle * Math.PI) / 180;
  const left = { x: range * Math.cos(-half), y: range * Math.sin(-half) };
  const right = { x: range * Math.cos(half), y: range * Math.sin(half) };
  return `M0 0L${left.x.toFixed(2)} ${left.y.toFixed(2)}A${range} ${range} 0 0 1 ${right.x.toFixed(2)} ${right.y.toFixed(2)}Z`;
};

const pointSegmentDistance = (point: Point, start: Point, end: Point): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};

const canSee = (viewer: Agent, target: Agent, smokes: Smoke[], now: number): boolean => {
  if (!viewer.alive || !target.alive || now < viewer.blindUntil) return false;
  if (distance(viewer, target) > viewer.range) return false;
  if (angleGap(viewer.angle, angleTo(viewer, target)) > viewer.halfAngle) return false;
  return !smokes.some((smoke) => pointSegmentDistance({ x: smoke.x, y: smoke.y }, viewer, target) < smoke.radius);
};

const advanceRadar = (state: RadarState, map: RadarMap, ours: RadarDuelist[], theirs: RadarDuelist[], economy: RadarEconomy, tactic: RadarTactic): RadarState => {
  const now = Date.now();
  if (state.respawnAt !== null) {
    if (now < state.respawnAt) return state;
    return createRadarRound(map, ours, theirs);
  }

  const agents = state.agents.map((agent) => ({ ...agent, alert: agent.alert ? { ...agent.alert } : null }));
  const tick = state.tick + 1;
  const rings = state.rings.filter((ring) => now - ring.at < 1500);
  const tracers = state.tracers.filter((tracer) => now - tracer.at < 850);
  const markers = [...state.markers];
  const smokes = state.smokes.filter((smoke) => now < smoke.until);
  const fires = state.fires.filter((fire) => now < fire.until);
  const flashes = state.flashes.filter((flash) => now < flash.until);
  let c4 = state.c4;
  let event = state.event;
  let fakeUsed = state.fakeUsed;
  let clutch = state.clutch;
  let respawnAt: number | null = null;

  agents.forEach((agent) => {
    if (!agent.alive) return;

    // Molotovs deny the corner: a holding defender is pushed out and must re-peek.
    if (agent.forcedOutUntil > now) {
      const fire = fires.find((zone) => distance(agent, zone) < zone.radius + 1.6);
      if (fire) {
        const dx = agent.x - fire.x;
        const dy = agent.y - fire.y;
        const gap = Math.hypot(dx, dy) || 1;
        agent.x += (dx / gap) * 1.05;
        agent.y += (dy / gap) * 1.05;
        agent.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        agent.holding = false;
        agent.moving = true;
        event = `MOLOTOV denies cover — ${agent.name} is forced out.`;
        return;
      }
      agent.forcedOutUntil = 0;
    }

    if (agent.waypoint < agent.path.length) {
      const target = agent.path[agent.waypoint];
      const dx = target.x - agent.x;
      const dy = target.y - agent.y;
      const gap = Math.hypot(dx, dy);
      if (gap < 1.1) {
        agent.waypoint += 1;
        return;
      }
      const executing = agent.role === 'Entry' && agent.waypoint >= agent.path.length - 2;
      const tacticSpeed = agent.side === 't' && tactic === 'Aggressive Rush' ? 1.12 : agent.side === 'ct' && tactic === 'Defensive / Anti-Eco' ? 0.94 : 1;
      const step = Math.min(gap, agent.speed * (executing ? (tactic === 'Aggressive Rush' ? 1.48 : 1.28) : 1) * tacticSpeed);
      agent.x += (dx / gap) * step;
      agent.y += (dy / gap) * step;
      agent.angle = angleTo(agent, target);
      agent.moving = true;
      if (agent.alertUntil > now && agent.alert) {
        agent.angle = turnToward(agent.angle, angleTo(agent, agent.alert), 13);
      }
      // Lurkers and riflers walk silently: no footstep ring and no sound alert.
      if (!agent.silent && tick % 3 === 0) {
        rings.push({ id: `${now}-${agent.id}`, x: agent.x, y: agent.y, at: now, side: agent.side });
      }
      if (!agent.silent) {
        agents.forEach((other) => {
          if (other.side === agent.side || !other.alive) return;
          if (distance(other, agent) <= 24) {
            other.alert = { x: agent.x, y: agent.y };
            other.alertUntil = now + 1800;
          }
        });
      }
      return;
    }

    agent.moving = false;
    if (!agent.holding) {
      agent.holding = true;
      if (agent.side === 't' && !c4) {
        const site = agent.lane === 'B' ? 'B' : 'A';
        const sitePoint = map.sites[site];
        c4 = { x: sitePoint.x, y: sitePoint.y, site, at: now };
        event = `C4 PLANTED at ${site} · defenders rotating to retake.`;
      }
    }
    if (agent.alertUntil > now && agent.alert) {
      agent.angle = turnToward(agent.angle, angleTo(agent, agent.alert), 15);
    } else {
      agent.angle = agent.baseAngle + Math.sin((tick + agent.sweep) * 0.12) * 24;
    }
  });

  // Support sets up the execute: smoke the site, flash the defenders, molotov the anchor.
  const support = agents.find((agent) => agent.side === 't' && (agent.role === 'Support' || agent.role === 'Lurker') && agent.alive && !agent.utilityThrown);
  if (support && support.waypoint >= support.path.length - 2) {
    const site = support.lane === 'B' ? 'B' : 'A';
    const sitePoint = map.sites[site];
    const holdRoute = map.ctRoutes[site];
    const holdPoint = holdRoute[holdRoute.length - 1] ?? sitePoint;
    const approachRoute = map.tRoutes[site];
    const flashPoint = approachRoute[approachRoute.length - 2] ?? sitePoint;
    support.utilityThrown = true;
    smokes.push({ id: `${now}-smoke`, x: sitePoint.x, y: sitePoint.y, radius: 6.4, at: now, until: now + 8000 });
    flashes.push({ id: `${now}-flash`, x: flashPoint.x, y: flashPoint.y, at: now, until: now + 460 });
    fires.push({ id: `${now}-fire`, x: holdPoint.x, y: holdPoint.y, radius: 5.6, at: now, until: now + 6500 });
    agents.filter((agent) => agent.side === 'ct' && agent.alive).forEach((agent) => {
      if (distance(agent, flashPoint) < 24 && angleGap(agent.angle, angleTo(agent, flashPoint)) < 85) {
        agent.blindUntil = now + 2000;
      }
    });
    event = `SUPPORT executes ${site}: smoke + flash + molotov. Entry is clear to push.`;
  }

  // IGL mid-round fake: the call pulls defenders toward the wrong site.
  if (!fakeUsed && tick === 16) {
    const igl = agents.find((agent) => agent.side === 't' && agent.role === 'IGL' && agent.alive);
    if (igl) {
      const aCount = agents.filter((agent) => agent.side === 't' && agent.alive && agent.lane === 'A').length;
      const bCount = agents.filter((agent) => agent.side === 't' && agent.alive && agent.lane === 'B').length;
      const from = aCount >= bCount ? 'A' : 'B';
      const to: 'A' | 'B' = from === 'A' ? 'B' : 'A';
      agents.filter((agent) => agent.side === 'ct' && agent.alive).slice(0, 3).forEach((agent) => {
        agent.path = [{ x: agent.x, y: agent.y }, ...map.ctRoutes[to].slice(1)];
        agent.waypoint = 1;
        agent.holding = false;
        agent.baseAngle = map.holdAngles[to];
      });
      fakeUsed = true;
      event = `IGL calls FAKE ${from} → ROTATE ${to} · defenders pulled out of position.`;
    }
  }

  // Fire zones force any remaining angle-holder to move immediately.
  fires.forEach((fire) => {
    agents.forEach((agent) => {
      if (agent.side !== 'ct' || !agent.alive) return;
      if (distance(agent, fire) < fire.radius) {
        agent.forcedOutUntil = now + 2400;
        agent.holding = false;
      }
    });
  });

  if (tick % 2 === 0) {
    const pairs: Array<{ ct: Agent; t: Agent; gap: number }> = [];
    agents.forEach((ct) => {
      if (ct.side !== 'ct' || !ct.alive) return;
      agents.forEach((t) => {
        if (t.side !== 't' || !t.alive) return;
        const gap = distance(ct, t);
        if (gap <= 15) pairs.push({ ct, t, gap });
      });
    });
    pairs.sort((a, b) => a.gap - b.gap);

    const ready = (agent: Agent): boolean => agent.rechamberMs === 0 || now >= agent.nextShotAt;

    for (const pair of pairs) {
      const ctSees = canSee(pair.ct, pair.t, smokes, now);
      const tSees = canSee(pair.t, pair.ct, smokes, now);
      if (!ctSees && !tSees) continue;
      if (!ready(pair.ct) && !ready(pair.t)) continue;

      let winner: Agent;
      let loser: Agent;
      let type: Tracer['type'];

      if (ctSees && tSees) {
        const antiEco = tactic === 'Defensive / Anti-Eco' && economy.theirs === 'Eco' ? 7 : 0;
        const ctRating = (ready(pair.ct) ? powerOf(pair.ct) : 0) + (pair.ct.holding ? 9 : 2) + antiEco;
        const tRating = ready(pair.t) ? powerOf(pair.t) : 0;
        const ctChance = clamp(1 / (1 + Math.pow(10, -(ctRating - tRating) / 22)), 0.12, 0.88);
        const ctWins = Math.random() < ctChance;
        winner = ctWins ? pair.ct : pair.t;
        loser = ctWins ? pair.t : pair.ct;
        type = 'front';
        pair.ct.nextShotAt = now + pair.ct.rechamberMs;
        pair.t.nextShotAt = now + pair.t.rechamberMs;
        tracers.push({ id: `${now}-win-${winner.id}`, from: { x: winner.x, y: winner.y }, to: { x: loser.x, y: loser.y }, side: winner.side, type, at: now });
        tracers.push({ id: `${now}-miss-${loser.id}`, from: { x: loser.x, y: loser.y }, to: { x: winner.x, y: winner.y }, side: loser.side, type, miss: true, at: now });
      } else {
        const attacker = ctSees ? pair.ct : pair.t;
        if (!ready(attacker)) continue;
        const victim = ctSees ? pair.t : pair.ct;
        const behind = angleGap(victim.angle, angleTo(victim, attacker)) > 100;
        const flankChance = 0.9 + Math.random() * 0.05;
        const attackerWins = Math.random() < flankChance;
        winner = attackerWins ? attacker : victim;
        loser = attackerWins ? victim : attacker;
        type = behind ? 'flank' : 'angle';
        attacker.nextShotAt = now + attacker.rechamberMs;
        tracers.push({ id: `${now}-${winner.id}`, from: { x: winner.x, y: winner.y }, to: { x: loser.x, y: loser.y }, side: winner.side, type, at: now });
        event = behind
          ? `${winner.name} catches ${loser.name} from behind · FLANK.`
          : `${winner.name} punishes ${loser.name} outside their cone.`;
      }

      loser.alive = false;
      markers.push({ id: `${now}-${loser.id}`, x: loser.x, y: loser.y, side: loser.side, name: loser.name });

      if (type === 'front') {
        event = pair.ct.holding || pair.t.holding
          ? `${winner.name} wins the angle hold against ${loser.name}${winner.role === 'AWPer' ? ' with the AWP' : ''}.`
          : `${winner.name} wins the head-on duel against ${loser.name}.`;
      }

      const ctAlive = agents.filter((agent) => agent.side === 'ct' && agent.alive);
      const tAlive = agents.filter((agent) => agent.side === 't' && agent.alive);
      if (!clutch) {
        if (ctAlive.length === 1 && tAlive.length > 1) clutch = { side: 'ct', name: ctAlive[0].name, enemies: tAlive.length };
        else if (tAlive.length === 1 && ctAlive.length > 1) clutch = { side: 't', name: tAlive[0].name, enemies: ctAlive.length };
      }

      if (!ctAlive.length || !tAlive.length) {
        const hero = ctAlive[0] ?? tAlive[0];
        if (clutch && hero && clutch.side === hero.side) {
          event = `1v${clutch.enemies} CLUTCH! ${hero.name} closes it out.`;
        } else {
          event = ctAlive.length ? 'Round secured · all attackers eliminated.' : 'Round lost · defenders eliminated.';
        }
        respawnAt = now + 1500;
        return {
          tick,
          agents,
          markers,
          rings,
          tracers,
          smokes,
          fires,
          flashes,
          c4,
          fakeUsed,
          clutch,
          event,
          respawnAt,
        };
      }
      break;
    }
  }

  return { tick, agents, markers, rings, tracers, smokes, fires, flashes, c4, fakeUsed, clutch, event, respawnAt };
};

export function TacticalRadar({ mapId, ours, theirs, opponentName, round, paused, speed, broadcast, economy, tactic }: {
  mapId: RadarMapId;
  ours: RadarDuelist[];
  theirs: RadarDuelist[];
  opponentName: string;
  round: number;
  paused: boolean;
  speed: number;
  broadcast?: boolean;
  economy: RadarEconomy;
  tactic: RadarTactic;
}) {
  const map = MAPS[mapId];
  const rosterKey = `${ours.map((player) => player.name).join('|')}::${theirs.map((player) => player.name).join('|')}`;
  const rosterRef = useRef({ ours, theirs });
  rosterRef.current = { ours, theirs };
  const economyRef = useRef(economy);
  economyRef.current = economy;
  const tacticRef = useRef(tactic);
  tacticRef.current = tactic;
  const initial = useRef<RadarState | null>(null);
  if (!initial.current) initial.current = createRadarRound(map, ours, theirs);
  const [state, setState] = useState<RadarState>(() => initial.current as RadarState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const fresh = createRadarRound(MAPS[mapId], rosterRef.current.ours, rosterRef.current.theirs);
    stateRef.current = fresh;
    setState(fresh);
  }, [mapId, rosterKey]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const next = advanceRadar(stateRef.current, MAPS[mapId], rosterRef.current.ours, rosterRef.current.theirs, economyRef.current, tacticRef.current);
      stateRef.current = next;
      setState(next);
    }, speed === 2 ? 230 : 380);
    return () => window.clearInterval(timer);
  }, [mapId, paused, speed]);

  const now = Date.now();
  return (
    <div className="radar-shell">
      <div className="radar-topline">
        <span className="radar-live-tag"><i /> {broadcast ? 'LIVE BROADCAST RADAR' : 'LIVE TACTICAL RADAR'}</span>
        <strong>{map.name.toUpperCase()}</strong>
        <span className={`radar-economy ${economy.ours.toLowerCase().replace(/\s+/g, '-')}`}>{economy.ours} · {economy.theirs}</span>
        <span className="radar-tactic">{tactic}</span>
        <span className="radar-round">ROUND {Math.min(round, 24)}</span>
      </div>
      <div className="radar-map-wrap">
        <svg className="radar-svg" viewBox="0 0 100 100" role="img" aria-label={`${map.name} tactical radar`}>
          <defs>
            <radialGradient id="radar-vignette" cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#0b1a24" stopOpacity="0" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.78" />
            </radialGradient>
            <pattern id="radar-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M5 0H0V5" fill="none" stroke="rgba(94,234,212,.07)" strokeWidth="0.18" />
            </pattern>
            <filter id="radar-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="0.55" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect className="radar-bg" x="0" y="0" width="100" height="100" />
          <rect x="0" y="0" width="100" height="100" fill="url(#radar-grid)" />
          <rect x="0" y="0" width="100" height="100" fill="url(#radar-vignette)" />
          <g className="radar-floor">
            {map.areas.map((area, index) => <path key={`area-${index}`} className={`radar-area ${area.kind ?? 'room'}`} d={area.d} />)}
            {map.walls.map((wall, index) => <path key={`wall-${index}`} className="radar-wall" d={wall} />)}
          </g>
          <g className="radar-labels">
            {map.labels.map((label) => (
              <text
                key={label.text}
                className={`radar-label ${label.tone ?? 'muted'}`}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
              >
                {label.text}
              </text>
            ))}
          </g>
          <g className="radar-sites">
            {(['A', 'B'] as const).map((site) => {
              const point = map.sites[site];
              return <g key={site} className={`radar-site ${site.toLowerCase()}`} transform={`translate(${point.x} ${point.y})`}><circle r="4.2" /><text textAnchor="middle" y="1.25">{site}</text></g>;
            })}
          </g>
          <g className="radar-rings">
            {state.rings.map((ring) => <circle key={ring.id} className={`radar-sound ${ring.side}`} cx={ring.x} cy={ring.y} r="5" />)}
          </g>
          <g className="radar-cones">
            {state.agents.filter((agent) => agent.alive && now >= agent.blindUntil).map((agent) => (
              <g key={`cone-${agent.id}`} className="radar-cone-unit" style={{ transform: `translate(${agent.x}px, ${agent.y}px)` }}>
                <g transform={`rotate(${agent.angle})`}>
                  <path className={`radar-cone ${agent.side} ${agent.role === 'AWPer' ? 'awp' : ''}`} d={conePath(agent.range, agent.halfAngle)} />
                </g>
              </g>
            ))}
          </g>
          <g className="radar-flashes">
            {state.flashes.map((flash) => (
              <g key={flash.id} className="radar-flash-burst" transform={`translate(${flash.x} ${flash.y})`}>
                <circle r="4.8" />
                <path d="M0 -5L1.1 -1.1L5 0L1.1 1.1L0 5L-1.1 1.1L-5 0L-1.1 -1.1Z" />
              </g>
            ))}
          </g>
          <g className="radar-utility">
            {state.smokes.map((smoke) => (
              <g key={smoke.id} className="radar-smoke-group" transform={`translate(${smoke.x} ${smoke.y})`}>
                <circle className="radar-smoke" r={smoke.radius} />
                <circle className="radar-smoke-ring" r={smoke.radius} />
                <text textAnchor="middle" y="-0.5">SMOKE</text>
              </g>
            ))}
            {state.fires.map((fire) => (
              <g key={fire.id} className="radar-fire-group" transform={`translate(${fire.x} ${fire.y})`}>
                <circle className="radar-fire" r={fire.radius} />
                {[0, 1, 2, 3, 4].map((index) => (
                  <path
                    key={index}
                    className="radar-flame"
                    d="M0 -1.7L1.15 1.35L-1.15 1.35Z"
                    transform={`rotate(${index * 72}) translate(0 -${(fire.radius * 0.62).toFixed(2)})`}
                  />
                ))}
                <text textAnchor="middle" y="-0.4">FIRE</text>
              </g>
            ))}
          </g>
          <g className="radar-tracers">
            {state.tracers.map((tracer) => (
              <g key={tracer.id} className={`radar-tracer ${tracer.side} ${tracer.type} ${tracer.miss ? 'miss' : ''}`} filter="url(#radar-glow)">
                <line x1={tracer.from.x} y1={tracer.from.y} x2={tracer.to.x} y2={tracer.to.y} />
                {!tracer.miss && <circle className="radar-muzzle" cx={tracer.from.x} cy={tracer.from.y} r="1.1" />}
              </g>
            ))}
          </g>
          {state.c4 && (
            <g className="radar-c4" transform={`translate(${state.c4.x} ${state.c4.y})`}>
              <circle className="c4-pulse" r="5.5" />
              <circle className="c4-core" r="2.4" />
              <text textAnchor="middle" y="-5.4">C4</text>
            </g>
          )}
          <g className="radar-markers">
            {state.markers.map((marker) => (
              <g key={marker.id} className={`radar-kill ${marker.side}`} transform={`translate(${marker.x} ${marker.y})`}>
                <path d="M-1.8 -1.8L1.8 1.8M1.8 -1.8L-1.8 1.8" />
                <text textAnchor="middle" y="3.7">{marker.name}</text>
              </g>
            ))}
          </g>
          <g className="radar-agents">
            {state.agents.filter((agent) => agent.alive).map((agent) => (
              <g key={agent.id} className={`radar-agent ${agent.side}`} style={{ transform: `translate(${agent.x}px, ${agent.y}px)` }}>
                <circle className="radar-agent-glow" r="3.1" />
                <circle className="radar-dot" r="1.45" />
                <text className={`radar-name ${agent.side}`} textAnchor="middle" y="-2.8">{agent.name}</text>
                {now < agent.blindUntil && (
                  <g className="radar-blind" transform="translate(0 -4.5)">
                    <circle r="1.7" />
                    <text textAnchor="middle" y="0.7">✦</text>
                  </g>
                )}
              </g>
            ))}
          </g>
          <g className="radar-compass" transform="translate(93 8)">
            <path d="M0 -3L1.6 2H-1.6Z" />
            <text textAnchor="middle" y="5.4">N</text>
          </g>
        </svg>
      </div>
      <div className="radar-foot">
        <div className="radar-legend">
          <span><i className="legend-dot ct" /> YOUR FIVE</span>
          <span><i className="legend-dot t" /> {opponentName.toUpperCase()}</span>
          <span><i className="legend-cone" /> VISION</span>
          <span><i className="legend-ring" /> FOOTSTEPS</span>
          <span><i className="legend-smoke" /> SMOKE</span>
          <span><i className="legend-fire" /> FIRE</span>
          <span><i className="legend-flash" /> FLASH</span>
          <span><i className="legend-c4" /> C4</span>
        </div>
        <div className="radar-event">{state.event}</div>
      </div>
    </div>
  );
}
