/**
 * The app's sound palette — every effect is built on the fly from oscillators
 * and filtered noise (see `synth.ts`), so nothing is downloaded and each play
 * can vary slightly. Names fall into three groups: in-game events, game-state
 * stingers (countdown / win / lose) and the UI click layer.
 *
 * Aesthetic: soft and rounded (sine / triangle, gentle noise) — a cute modern
 * io game, not a bright 8-bit arcade.
 */
import { clamp, noise, rand, tone } from "./synth";

export type VoiceName =
  // In-game events
  | "shoot"
  | "ricochet"
  | "bulletBurst"
  | "plant"
  | "explose"
  | "kill"
  // Game-state stingers
  | "countdownBeep"
  | "countdownGo"
  | "win"
  | "lose"
  | "draw"
  // UI
  | "uiClick"
  | "uiHover"
  | "uiToggleOn"
  | "uiToggleOff"
  | "uiOpen"
  | "uiClose"
  | "uiBack"
  | "uiTab"
  | "uiError"
  | "uiSuccess"
  | "notify";

type Voice = () => void;

// A few note frequencies (Hz) for the little jingles.
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

export const voices: Record<VoiceName, Voice> = {
  // ── In-game events ────────────────────────────────────────────────────────

  // Tank cannon: a sharp crack over a punchy blast and a low thump — weighty
  // and real (transient + body + sub-bass + smoke tail).
  shoot() {
    const j = rand(0.97, 1.04);
    // Crack — band-limited so it reads as a snap, not a hiss.
    noise({
      duration: 0.035,
      gain: 0.5,
      attack: 0.001,
      filter: "bandpass",
      freq: 2400 * j,
      q: 0.9,
      drive: 1.3,
    });
    // Blast body.
    noise({
      duration: 0.14,
      gain: 0.5,
      attack: 0.002,
      filter: "lowpass",
      freq: 1900 * j,
      freqEnd: 240,
      q: 1.1,
      drive: 1.0,
    });
    // Sub thump — the weight.
    tone({
      type: "sine",
      freq: 185 * j,
      freqEnd: 48,
      duration: 0.17,
      gain: 0.8,
      attack: 0.002,
      drive: 0.9,
    });
    // Smoke tail.
    noise({
      duration: 0.22,
      gain: 0.12,
      filter: "lowpass",
      freq: 650,
      freqEnd: 140,
      delay: 0.02,
    });
  },

  // Bullet bouncing off a wall: a metallic zing with a percussive "thock".
  ricochet() {
    const p = rand(0.95, 1.08);
    // Low thock — gives the bounce a body/impact.
    tone({
      type: "triangle",
      freq: 280,
      freqEnd: 110,
      duration: 0.075,
      gain: 0.4,
      attack: 0.0015,
      drive: 1.0,
    });
    // Metallic zing, pitch-dropping and slightly darker.
    tone({
      type: "triangle",
      freq: 1900 * p,
      freqEnd: 1100 * p,
      duration: 0.11,
      gain: 0.18,
      attack: 0.002,
      drive: 0.8,
    });
    // Resonant metallic ring.
    noise({
      duration: 0.085,
      gain: 0.15,
      filter: "bandpass",
      freq: 2200 * p,
      q: 6,
      drive: 0.9,
    });
  },

  // Final bounce: the bullet burst at the wall instead of bouncing — a compact
  // detonation pop with a short debris tail, lighter than the tank/mine explose.
  bulletBurst() {
    const p = rand(0.96, 1.05);
    // Snappy band-limited onset.
    noise({
      duration: 0.035,
      gain: 0.34,
      attack: 0.001,
      filter: "bandpass",
      freq: 1300 * p,
      q: 0.8,
      drive: 1.3,
    });
    // Short low body — weight without the long tail of a real explosion.
    tone({
      type: "sine",
      freq: 210 * p,
      freqEnd: 62,
      duration: 0.16,
      gain: 0.42,
      attack: 0.0015,
      drive: 1.0,
    });
    tone({
      type: "triangle",
      freq: 420 * p,
      freqEnd: 120,
      duration: 0.09,
      gain: 0.16,
      attack: 0.0015,
      drive: 0.9,
    });
    // Tiny debris crackle so it reads as a rupture, not a thud.
    noise({
      duration: 0.12,
      gain: 0.1,
      filter: "lowpass",
      freq: 2200,
      freqEnd: 500,
      delay: 0.02,
    });
  },

  // Mine placed: a solid mechanical clunk, then a dry arming tick a beat later
  // so the plant reads as "bomb planted", not just another explosion layer.
  plant() {
    noise({
      duration: 0.02,
      gain: 0.3,
      attack: 0.001,
      filter: "bandpass",
      freq: 1500,
      q: 0.9,
      drive: 1.1,
    });
    tone({
      type: "sine",
      freq: 240,
      freqEnd: 70,
      duration: 0.2,
      gain: 0.7,
      attack: 0.002,
      drive: 0.9,
    });
    // Arming tick: a short, dry click plus a tiny rise — "fuse is live".
    noise({
      duration: 0.008,
      gain: 0.09,
      filter: "bandpass",
      freq: 2600,
      q: 2.2,
      delay: 0.055,
    });
    tone({
      type: "triangle",
      freq: 620,
      freqEnd: 880,
      duration: 0.05,
      gain: 0.08,
      delay: 0.055,
      attack: 0.002,
    });
  },

  // Explosion (tank or mine): a sharp onset, a deep saturated rumble, sub-bass
  // weight and a debris tail.
  explose() {
    // Onset transient — a band-limited thump instead of a full-spectrum hiss.
    noise({
      duration: 0.045,
      gain: 0.55,
      attack: 0.0015,
      filter: "bandpass",
      freq: 1500,
      q: 0.7,
      drive: 1.5,
    });
    // Body rumble.
    noise({
      duration: 0.6,
      gain: 0.55,
      attack: 0.003,
      filter: "lowpass",
      freq: 900,
      freqEnd: 38,
      q: 0.8,
      drive: 1.1,
    });
    // Sub-bass weight.
    tone({
      type: "sine",
      freq: 88,
      freqEnd: 24,
      duration: 0.72,
      gain: 0.8,
      attack: 0.003,
      drive: 0.9,
    });
    tone({
      type: "triangle",
      freq: 190,
      freqEnd: 46,
      duration: 0.24,
      gain: 0.2,
      drive: 0.8,
    });
    // Debris crackle tail.
    noise({
      duration: 0.38,
      gain: 0.16,
      filter: "lowpass",
      freq: 2000,
      freqEnd: 320,
      delay: 0.03,
    });
  },

  // Kill confirmed: a snappy two-note hit.
  kill() {
    noise({
      duration: 0.018,
      gain: 0.2,
      filter: "bandpass",
      freq: 1700,
      q: 1.1,
    });
    tone({
      type: "triangle",
      freq: C5,
      duration: 0.1,
      gain: 0.22,
      attack: 0.002,
      drive: 0.8,
    });
    tone({
      type: "triangle",
      freq: G5,
      duration: 0.14,
      gain: 0.18,
      delay: 0.07,
      attack: 0.002,
      drive: 0.8,
    });
  },

  // ── Game-state stingers ───────────────────────────────────────────────────

  // Countdown 3-2-1: one soft round beep.
  countdownBeep() {
    tone({
      type: "sine",
      freq: 640,
      duration: 0.13,
      gain: 0.16,
      attack: 0.005,
    });
    tone({ type: "triangle", freq: 640, duration: 0.1, gain: 0.05 });
  },

  // Countdown "GO!": a warm rising lift.
  countdownGo() {
    tone({
      type: "triangle",
      freq: 660,
      freqEnd: 990,
      duration: 0.28,
      gain: 0.17,
      attack: 0.005,
    });
    tone({
      type: "sine",
      freq: 990,
      freqEnd: 1320,
      duration: 0.28,
      gain: 0.07,
      delay: 0.02,
    });
  },

  // Victory: a rising major arpeggio with a soft octave sparkle.
  win() {
    const seq = [C5, E5, G5, C6];
    for (let i = 0; i < seq.length; i++) {
      const f = seq[i]!;
      const at = i * 0.12;
      tone({
        type: "triangle",
        freq: f,
        duration: 0.22,
        gain: 0.16,
        delay: at,
      });
      tone({
        type: "sine",
        freq: f * 2,
        duration: 0.16,
        gain: 0.035,
        delay: at,
      });
    }
  },

  // Defeat: a soft, warm descending figure.
  lose() {
    const seq = [G4, E4, C4];
    for (let i = 0; i < seq.length; i++) {
      const f = seq[i]!;
      const at = i * 0.17;
      tone({
        type: "triangle",
        freq: f,
        duration: 0.32,
        gain: 0.13,
        delay: at,
      });
      tone({ type: "sine", freq: f / 2, duration: 0.32, gain: 0.1, delay: at });
    }
  },

  // Draw: two neutral, equal tones.
  draw() {
    tone({ type: "triangle", freq: A4, duration: 0.22, gain: 0.13 });
    tone({
      type: "triangle",
      freq: A4,
      duration: 0.22,
      gain: 0.13,
      delay: 0.18,
    });
  },

  // ── UI ────────────────────────────────────────────────────────────────────

  // Generic button press — a soft rounded pop.
  uiClick() {
    tone({
      type: "sine",
      freq: 520,
      freqEnd: 720,
      duration: 0.06,
      gain: 0.11,
      attack: 0.002,
    });
    tone({
      type: "triangle",
      freq: 1040,
      duration: 0.03,
      gain: 0.03,
      delay: 0.005,
    });
  },

  // Whisper-quiet tick as the pointer lands on something interactive.
  uiHover() {
    tone({
      type: "sine",
      freq: 1000,
      duration: 0.03,
      gain: 0.03,
      attack: 0.002,
    });
  },

  uiToggleOn() {
    tone({ type: "sine", freq: 560, duration: 0.07, gain: 0.1 });
    tone({ type: "sine", freq: 840, duration: 0.09, gain: 0.1, delay: 0.05 });
  },

  uiToggleOff() {
    tone({ type: "sine", freq: 760, duration: 0.07, gain: 0.1 });
    tone({ type: "sine", freq: 500, duration: 0.09, gain: 0.1, delay: 0.05 });
  },

  // Panel / modal opening — a soft upward swoosh.
  uiOpen() {
    tone({
      type: "sine",
      freq: 420,
      freqEnd: 640,
      duration: 0.16,
      gain: 0.09,
      attack: 0.01,
    });
    noise({
      duration: 0.16,
      gain: 0.04,
      filter: "lowpass",
      freq: 700,
      freqEnd: 1700,
    });
  },

  // Panel / modal closing — the swoosh in reverse.
  uiClose() {
    tone({ type: "sine", freq: 620, freqEnd: 380, duration: 0.14, gain: 0.09 });
    noise({
      duration: 0.14,
      gain: 0.04,
      filter: "lowpass",
      freq: 1700,
      freqEnd: 600,
    });
  },

  uiBack() {
    tone({ type: "sine", freq: 420, freqEnd: 300, duration: 0.09, gain: 0.1 });
  },

  uiTab() {
    tone({ type: "sine", freq: 560, duration: 0.05, gain: 0.08 });
    tone({
      type: "triangle",
      freq: 840,
      duration: 0.05,
      gain: 0.04,
      delay: 0.01,
    });
  },

  // Something went wrong — a soft, polite descending "uh-oh".
  uiError() {
    tone({ type: "triangle", freq: 420, duration: 0.14, gain: 0.11 });
    tone({
      type: "triangle",
      freq: 320,
      duration: 0.18,
      gain: 0.11,
      delay: 0.12,
    });
  },

  // Something went right — a gentle rising triad.
  uiSuccess() {
    tone({ type: "triangle", freq: C5, duration: 0.1, gain: 0.11 });
    tone({
      type: "triangle",
      freq: E5,
      duration: 0.1,
      gain: 0.11,
      delay: 0.07,
    });
    tone({ type: "sine", freq: G5, duration: 0.14, gain: 0.1, delay: 0.14 });
  },

  // Neutral attention chime for incoming toasts.
  notify() {
    tone({ type: "sine", freq: 740, duration: 0.09, gain: 0.08 });
    tone({ type: "sine", freq: 1110, duration: 0.07, gain: 0.04, delay: 0.05 });
  },
};

/**
 * Warning for a mine about to detonate. `urgency` (0..1) raises the pitch and
 * loudness and tightens the two-beep interval, so the last seconds accelerate
 * instead of repeating one flat tick.
 */
export function fuseWarning(urgency: number): void {
  const u = clamp(urgency, 0, 1);
  const base = 620 + u * 420;
  const gap = 0.075 - u * 0.03;
  const duration = 0.055 - u * 0.015;
  const peak = 0.18 + u * 0.08;

  tone({
    type: "triangle",
    freq: base,
    duration,
    gain: peak,
    attack: 0.002,
    drive: 1.1,
  });
  tone({
    type: "sine",
    freq: base * 2,
    duration: duration * 0.8,
    gain: peak * 0.3,
    attack: 0.002,
  });
  tone({
    type: "triangle",
    freq: base * 1.335,
    duration,
    gain: peak,
    delay: gap,
    attack: 0.002,
    drive: 1.1,
  });
  tone({
    type: "sine",
    freq: base * 1.335 * 2,
    duration: duration * 0.8,
    gain: peak * 0.3,
    delay: gap,
    attack: 0.002,
  });
}
