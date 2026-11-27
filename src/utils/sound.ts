/**
 * Synthesized sound effects built on the Web Audio API. No audio files are
 * loaded: every sound is a short oscillator envelope generated in the browser.
 * The AudioContext is created lazily on the first user gesture so browsers
 * that block autoplay stay silent until the player interacts.
 */

const MUTE_KEY = 'cs2ut-sound-muted';

export type SoundName = 'click' | 'reveal' | 'win';

let context: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<(value: boolean) => void>();

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

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

/** One enveloped tone starting `delay` seconds from `start`. */
function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

const RARITY_NOTES: Record<string, number[]> = {
  Bronze: [523.25, 659.25],
  Silver: [523.25, 659.25, 783.99],
  Gold: [523.25, 659.25, 783.99, 1046.5],
  Star: [523.25, 659.25, 783.99, 1046.5],
  Icon: [523.25, 659.25, 783.99, 1046.5],
  Wonderkid: [659.25, 830.61, 987.77, 1318.51],
  TOTW: [587.33, 739.99, 880, 1174.66],
  'Major MVP': [523.25, 659.25, 783.99, 1046.5, 1318.51],
};

/** Crisp, short tick for buttons and coin claims. */
function playClick(ctx: AudioContext): void {
  const now = ctx.currentTime;
  tone(ctx, 1800, now, 0.035, 0.12, 'square');
  tone(ctx, 900, now + 0.005, 0.03, 0.05, 'triangle');
}

/** Ascending chime; the higher the rarity, the more notes and a rich top chord. */
function playReveal(ctx: AudioContext, rarity: string): void {
  const notes = RARITY_NOTES[rarity] ?? RARITY_NOTES.Bronze;
  const now = ctx.currentTime;
  notes.forEach((frequency, index) => {
    tone(ctx, frequency, now + index * 0.09, 0.45, 0.14, 'sine');
  });
  if (rarity === 'Gold' || rarity === 'Icon' || rarity === 'Star') {
    const chordStart = now + notes.length * 0.09;
    [1046.5, 1318.5, 1568].forEach((frequency) => tone(ctx, frequency, chordStart, 0.8, 0.09, 'triangle'));
  }
}

/** Short triumphant fanfare: rising arpeggio resolving to a held chord. */
function playWin(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const melody = [392, 523.25, 659.25, 783.99];
  melody.forEach((frequency, index) => tone(ctx, frequency, now + index * 0.1, 0.22, 0.13, 'square'));
  const end = now + melody.length * 0.1;
  [523.25, 659.25, 783.99].forEach((frequency) => tone(ctx, frequency, end, 0.6, 0.1, 'triangle'));
}

/**
 * Play a named sound. `rarity` only affects 'reveal'. Does nothing when muted
 * or when Web Audio is unavailable.
 */
export function playSound(name: SoundName, rarity = 'Bronze'): void {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  if (name === 'click') playClick(ctx);
  else if (name === 'reveal') playReveal(ctx, rarity);
  else playWin(ctx);
}

export function isSoundMuted(): boolean {
  return muted;
}

/** Set the mute flag, persist it and notify subscribers. */
export function setSoundMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode); the in-memory flag still applies.
  }
  listeners.forEach((listener) => listener(value));
}

/** Subscribe to mute changes; returns an unsubscribe function. */
export function subscribeSoundMuted(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
