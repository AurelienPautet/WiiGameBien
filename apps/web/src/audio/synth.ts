/**
 * Low-level procedural synthesis primitives, running on Tone.js.
 *
 * Each call schedules a few short-lived Tone sources + envelopes on the shared
 * Tone context and disposes them when they stop — no pooling, no audio files.
 * The named sounds in `voices.ts` layer these together. Keeping this API narrow
 * means the voice recipes stay readable and untouched.
 */
import type * as ToneNS from "tone";
import { getSfxDestination, getTone } from "./tone";

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Random float in [min, max) — used for subtle per-shot pitch variation. */
export const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

// Exponential ramps can't reach 0, so envelopes decay to this near-silence.
const MIN_GAIN = 0.0001;

// Shared soft-clip (tanh) curve for the optional `drive` saturation.
let shaperCurve: Float32Array<ArrayBuffer> | null = null;
function softClipCurve(): Float32Array<ArrayBuffer> {
  if (shaperCurve) return shaperCurve;
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.5 * x);
  }
  shaperCurve = curve;
  return curve;
}

interface Disposable {
  dispose: () => unknown;
}

function disposeLater(...nodes: (Disposable | null)[]): void {
  for (const node of nodes) {
    if (!node) continue;
    try {
      node.dispose();
    } catch {
      // Already disposed with its source — nothing to do.
    }
  }
}

export interface ToneOpts {
  /** Start frequency (Hz). */
  freq: number;
  /** Optional glide target (Hz), reached at the end of the sound. */
  freqEnd?: number;
  type?: "sine" | "square" | "sawtooth" | "triangle";
  /** Delay before the sound starts, in seconds. */
  delay?: number;
  /** Total length, in seconds. */
  duration: number;
  /** Peak gain (0..1). */
  gain?: number;
  /** Attack time, in seconds. */
  attack?: number;
  /** Glide curve used for `freqEnd`. */
  glide?: "exp" | "lin";
  /** Stereo position (-1 left .. 1 right). */
  pan?: number;
  detune?: number;
  /** Waveshaper saturation amount (pre-gain into a tanh curve). */
  drive?: number;
}

/** A single enveloped oscillator, optionally pitch-gliding and panned. */
export function tone(opts: ToneOpts): void {
  const T = getTone();
  const out = getSfxDestination();
  if (!T || !out) return;

  // `immediate()` skips Tone's scheduling look-ahead so shots stay snappy.
  const start = T.immediate() + 0.005 + (opts.delay ?? 0);
  const end = start + opts.duration;
  const peak = Math.max(MIN_GAIN, opts.gain ?? 0.3);
  const attack = Math.min(opts.attack ?? 0.005, opts.duration * 0.5);

  const osc = new T.Oscillator({
    frequency: opts.freq,
    type: opts.type ?? "sine",
  });
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.freqEnd != null) {
    const target = Math.max(1, opts.freqEnd);
    if ((opts.glide ?? "exp") === "lin") {
      osc.frequency.linearRampToValueAtTime(target, end);
    } else {
      osc.frequency.exponentialRampToValueAtTime(target, end);
    }
  }
  if (opts.detune != null) osc.detune.setValueAtTime(opts.detune, start);

  const env = new T.Gain(MIN_GAIN);
  env.gain.setValueAtTime(MIN_GAIN, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  env.gain.exponentialRampToValueAtTime(MIN_GAIN, end);

  let head: ToneNS.ToneAudioNode = osc;
  let shaper: ToneNS.WaveShaper | null = null;
  if (opts.drive != null) {
    shaper = new T.WaveShaper(softClipCurve(), 1024);
    head.connect(shaper);
    head = shaper;
  }
  head.connect(env);

  let panner: ToneNS.Panner | null = null;
  if (opts.pan != null) {
    panner = new T.Panner(clamp(opts.pan, -1, 1));
    env.connect(panner);
    panner.connect(out);
  } else {
    env.connect(out);
  }

  osc.onstop = () => disposeLater(osc, env, shaper, panner);
  osc.start(start);
  osc.stop(end + 0.03);
}

export interface NoiseOpts {
  delay?: number;
  duration: number;
  gain?: number;
  attack?: number;
  /** Biquad shaping the burst (lowpass/highpass/bandpass). */
  filter?: BiquadFilterType;
  /** Filter start frequency (Hz). */
  freq?: number;
  /** Filter glide target (Hz). */
  freqEnd?: number;
  /** Filter resonance. */
  q?: number;
  pan?: number;
  /** Waveshaper saturation amount (pre-gain into a tanh curve). */
  drive?: number;
}

/** An enveloped white-noise burst through an optional sweeping filter. */
export function noise(opts: NoiseOpts): void {
  const T = getTone();
  const out = getSfxDestination();
  if (!T || !out) return;

  const start = T.immediate() + 0.005 + (opts.delay ?? 0);
  const end = start + opts.duration;
  const peak = Math.max(MIN_GAIN, opts.gain ?? 0.3);
  const attack = Math.min(opts.attack ?? 0.002, opts.duration * 0.5);

  const src = new T.Noise("white");
  const env = new T.Gain(MIN_GAIN);
  env.gain.setValueAtTime(MIN_GAIN, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  env.gain.exponentialRampToValueAtTime(MIN_GAIN, end);

  let head: ToneNS.ToneAudioNode = src;
  let filter: ToneNS.Filter | null = null;
  if (opts.filter) {
    const freq = opts.freq ?? 1000;
    filter = new T.Filter({
      type: opts.filter,
      frequency: freq,
      Q: opts.q ?? 1,
    });
    filter.frequency.setValueAtTime(freq, start);
    if (opts.freqEnd != null) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, opts.freqEnd),
        end
      );
    }
    src.connect(filter);
    head = filter;
  }

  let shaper: ToneNS.WaveShaper | null = null;
  if (opts.drive != null) {
    shaper = new T.WaveShaper(softClipCurve(), 1024);
    head.connect(shaper);
    head = shaper;
  }
  head.connect(env);

  let panner: ToneNS.Panner | null = null;
  if (opts.pan != null) {
    panner = new T.Panner(clamp(opts.pan, -1, 1));
    env.connect(panner);
    panner.connect(out);
  } else {
    env.connect(out);
  }

  src.onstop = () => disposeLater(src, env, filter, shaper, panner);
  src.start(start);
  src.stop(end + 0.03);
}
