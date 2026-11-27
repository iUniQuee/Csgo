/**
 * Synthesized CS2 radar sound effects, built entirely on the Web Audio API.
 *
 * No audio files are loaded: every shot, utility deployment and C4 cue is an
 * oscillator / filtered-noise envelope generated in the browser. The module
 * shares the app-wide mute flag from `utils/sound`, and the AudioContext is
 * created lazily on the first cue so autoplay-blocked browsers stay silent
 * until the player interacts.
 */
import { isSoundMuted } from './sound';

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Context for a one-shot cue, or null when muted / unsupported. */
function ready(): AudioContext | null {
  if (isSoundMuted()) return null;
  return getContext();
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
  noise = buffer;
  return buffer;
}

/** Attack/decay envelope; returns the gain node so callers can chain it. */
function envelope(ctx: AudioContext, start: number, duration: number, peak: number, attack = 0.005): GainNode {
  const gain = ctx.createGain();
  const level = Math.max(0.0002, peak);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(ctx.destination);
  return gain;
}

/** Filtered noise burst: the body of gunshots, smoke hiss and fire rumble. */
function noiseHit(
  ctx: AudioContext,
  start: number,
  duration: number,
  peak: number,
  type: BiquadFilterType,
  frequency: number,
  q = 1,
): BiquadFilterNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, start);
  filter.Q.value = q;
  source.connect(filter).connect(envelope(ctx, start, duration, peak, 0.004));
  source.start(start, Math.random() * 0.6);
  source.stop(start + duration + 0.03);
  return filter;
}

/** One pitched oscillator with an exponential pitch glide. */
function tone(
  ctx: AudioContext,
  start: number,
  duration: number,
  from: number,
  to: number,
  peak: number,
  type: OscillatorType = 'sine',
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  osc.connect(envelope(ctx, start, duration, peak));
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

/**
 * Crisp rifle/pistol report for tracer fire. `count` is the number of fresh
 * tracers in the tick; heavy AWP cracks are sprinkled in for variety.
 */
export function playRadarGunfire(count = 1): void {
  const ctx = ready();
  if (!ctx) return;
  const shots = Math.min(3, Math.max(1, Math.floor(count)));
  for (let index = 0; index < shots; index += 1) {
    const start = ctx.currentTime + index * 0.045;
    const awp = Math.random() < 0.12;
    const pistol = !awp && Math.random() < 0.24;
    const peak = (awp ? 0.2 : pistol ? 0.085 : 0.13) * (0.85 + Math.random() * 0.3);
    noiseHit(ctx, start, awp ? 0.16 : pistol ? 0.065 : 0.1, peak, 'bandpass', awp ? 760 : pistol ? 2600 : 1500, 0.9);
    tone(ctx, start, awp ? 0.18 : 0.09, awp ? 150 : 210, 58, peak * 0.75, 'triangle');
    if (!pistol) noiseHit(ctx, start + 0.008, 0.05, peak * 0.32, 'highpass', 2400, 0.7);
  }
}

/** Airy whoosh + hiss as a smoke grenade blooms on the radar. */
export function playRadarSmoke(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  const filter = noiseHit(ctx, start, 0.55, 0.12, 'lowpass', 700, 0.8);
  filter.frequency.setValueAtTime(480, start);
  filter.frequency.exponentialRampToValueAtTime(2300, start + 0.17);
  filter.frequency.exponentialRampToValueAtTime(420, start + 0.55);
  tone(ctx, start, 0.4, 320, 160, 0.045, 'sine');
}

/** Molotov ignition: low rumble with a scatter of crackles. */
export function playRadarFire(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  noiseHit(ctx, start, 0.7, 0.11, 'lowpass', 420, 0.7);
  tone(ctx, start, 0.55, 120, 68, 0.075, 'triangle');
  for (let index = 0; index < 5; index += 1) {
    noiseHit(ctx, start + 0.05 + Math.random() * 0.45, 0.035, 0.045 + Math.random() * 0.04, 'bandpass', 1800 + Math.random() * 1600, 1.5);
  }
}

/** Quiet periodic crackle while a molotov keeps burning. */
export function playRadarCrackle(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  for (let index = 0; index < 2; index += 1) {
    noiseHit(ctx, start + Math.random() * 0.2, 0.03, 0.028 + Math.random() * 0.03, 'bandpass', 1600 + Math.random() * 1800, 1.6);
  }
}

/** The iconic ~735 Hz C4 pulse. */
export function playRadarC4Beep(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  tone(ctx, start, 0.075, 735, 735, 0.1, 'sine');
  tone(ctx, start, 0.05, 1470, 1470, 0.028, 'square');
}

/** Deep low boom when the C4 timer runs out. */
export function playRadarDetonation(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  tone(ctx, start, 1.1, 120, 32, 0.32, 'sine');
  tone(ctx, start, 0.7, 72, 28, 0.26, 'triangle');
  noiseHit(ctx, start, 1, 0.2, 'lowpass', 260, 0.6);
}

/** Clean high chime when a Counter-Terrorist completes the defuse. */
export function playRadarDefuse(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  tone(ctx, start, 0.16, 987.77, 987.77, 0.1, 'sine');
  tone(ctx, start + 0.13, 0.5, 1318.51, 1318.51, 0.085, 'sine');
  tone(ctx, start + 0.13, 0.5, 1975.53, 1975.53, 0.028, 'triangle');
}

/** Two-note chime for taking a radar round. */
export function playRadarRoundWin(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  [783.99, 1046.5].forEach((frequency, index) => tone(ctx, start + index * 0.1, 0.3, frequency, frequency, 0.075, 'triangle'));
}

/** Short triumphant fanfare when the match is won. */
export function playRadarFanfare(): void {
  const ctx = ready();
  if (!ctx) return;
  const start = ctx.currentTime;
  const melody = [523.25, 659.25, 783.99, 1046.5];
  melody.forEach((frequency, index) => tone(ctx, start + index * 0.1, 0.24, frequency, frequency, 0.095, 'square'));
  const end = start + melody.length * 0.1;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency) => tone(ctx, end, 0.7, frequency, frequency, 0.045, 'triangle'));
}
