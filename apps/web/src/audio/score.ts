/**
 * Procedural score generation.
 *
 * Pure music theory + note scheduling data: no Web Audio, no DOM. The Tone
 * engine in `music.ts` reads these events on every sixteenth step. Keeping the
 * composition here means it can be unit-tested in jsdom and re-used by a
 * future editor/DAW export.
 *
 * The harmonic content comes from Tonal (chord voicings and MIDI notes); the
 * melodic material is a seeded random walk that favours chord tones on strong
 * beats and stepwise motion everywhere else. Different seeds produce different
 * phrases while the chord grid and the intensity layer gates stay fixed.
 */
import { Chord, Note } from "@tonaljs/tonal";

export type MusicMode = "menu" | "game";

export type LayerName =
  | "melody"
  | "bass"
  | "arp"
  | "timpani"
  | "kick"
  | "snare"
  | "hat"
  | "cymbal";

export const STEPS_PER_BAR = 16;
export const BARS = 8;
export const TOTAL_STEPS = STEPS_PER_BAR * BARS;

/** Eight eighth-note melody slots per bar (one every other sixteenth). */
const SLOTS_PER_BAR = 8;

export const BPM: Record<MusicMode, number> = { menu: 80, game: 104 };

export interface Score {
  mode: MusicMode;
  seed: number;
  bpm: number;
  /** Number of sixteenth steps in one pass of the loop. */
  totalSteps: number;
  /** One chord name per bar. */
  chords: string[];
  /** Ascending chord voicing per bar (MIDI, octave 3–4). */
  chordTones: number[][];
  /** Melody per eighth-note slot; null = rest. */
  melody: (number | null)[];
  /** Bass root per bar (octave 1–2). */
  bass: number[];
  /** Bass fifth per bar. */
  fifth: number[];
  /** Arpeggio notes per bar (octave 4–5). */
  arp: number[][];
  /** Timpani note per bar. */
  timpani: number[];
}

export interface NoteStepEvent {
  layer: "melody" | "bass" | "arp" | "timpani";
  midi: number;
  duration: number;
  velocity: number;
}

export interface DrumStepEvent {
  layer: "kick" | "snare" | "hat" | "cymbal";
  duration: number;
  velocity: number;
  /** Open hats ring a little longer and brighter. */
  open?: boolean;
}

export type StepEvent = NoteStepEvent | DrumStepEvent;

// Menu stays on the classic I–vi–IV–V; a round leans on I–V–vi–IV, which has
// more forward motion without leaving C major. Chord symbols are written out
// because Tonal's Roman-numeral parser does not preserve minor quality.
const PROGRESSIONS: Record<MusicMode, string[]> = {
  menu: ["C", "Am", "F", "G"],
  game: ["C", "G", "Am", "F"],
};

const SCALE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81];

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Small, fast, deterministic PRNG — same seed, same soundtrack. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** MIDI note → frequency in Hz (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Build an ascending close-position voicing for a chord, rooted in octave 3. */
export function chordVoicing(name: string): number[] {
  const notes = Chord.get(name).notes;
  const voicing: number[] = [];
  for (const pitchClass of notes) {
    let midi = Note.midi(`${pitchClass}3`) ?? 48;
    while (voicing.length > 0 && midi <= voicing[voicing.length - 1]!) {
      midi += 12;
    }
    voicing.push(midi);
  }
  return voicing;
}

/** Roots around C2–G2; A and B drop to octave 1 to stay in the same pocket. */
export function bassNote(rootMidi: number): number {
  let midi = rootMidi - 12;
  while (midi > 43) midi -= 12;
  return midi;
}

/** Every chord tone across the melody register (C4–A5). */
function melodyPool(voicing: number[]): number[] {
  const pool: number[] = [];
  for (const note of voicing) {
    for (let midi = note; midi <= 81; midi += 12) {
      if (midi >= 60) pool.push(midi);
    }
  }
  return [...new Set(pool)].sort((a, b) => a - b);
}

function nearest(pool: number[], target: number): number {
  let best = pool[0] ?? target;
  for (const note of pool) {
    if (Math.abs(note - target) < Math.abs(best - target)) best = note;
  }
  return best;
}

/** Move a scale step or two from `prev`; falls back to a chromatic clamp. */
function scaleStep(prev: number, delta: number): number {
  const index = SCALE.indexOf(prev);
  if (index < 0) return prev;
  const next = index + delta;
  if (next < 0 || next >= SCALE.length) return prev;
  return SCALE[next]!;
}

/**
 * Generate two bars (16 eighth-note slots) of melody over `startBar`/`startBar+1`.
 * Strong beats are chord tones; weak beats walk the scale with occasional rests.
 */
function phrase(
  chordTones: number[][],
  rng: () => number,
  startBar: number,
  startNote: number,
  endOnRoot: boolean
): (number | null)[] {
  const slots: (number | null)[] = [];
  let prev = startNote;

  for (let offset = 0; offset < 2; offset++) {
    const bar = startBar + offset;
    const voicing = chordTones[bar] ?? chordTones[0] ?? [48, 52, 55];
    const pool = melodyPool(voicing);
    const rootPitch = (voicing[0] ?? 48) % 12;
    const rootPool = pool.filter((n) => n % 12 === rootPitch);

    for (let slot = 0; slot < SLOTS_PER_BAR; slot++) {
      const index = offset * SLOTS_PER_BAR + slot;
      const strong = slot === 0 || slot === 4;
      const last = index === SLOTS_PER_BAR * 2 - 1;

      if (last) {
        const note = nearest(endOnRoot ? rootPool : pool, prev);
        slots.push(note);
        prev = note;
        continue;
      }

      // Leave a little air off the beat, but never on beat one.
      if (!strong && rng() < 0.14) {
        slots.push(null);
        continue;
      }

      let note: number;
      if (strong) {
        const lift = slot === 0 ? 2 : 0;
        const target = prev + lift + (rng() < 0.5 ? -2 : 2);
        note = nearest(pool, target);
      } else {
        const delta =
          rng() < 0.7 ? (rng() < 0.5 ? -1 : 1) : rng() < 0.5 ? -2 : 2;
        note = scaleStep(prev, delta);
        // Don't let the walk drift too far from the current harmony.
        if (Math.abs(note - nearest(pool, note)) > 4)
          note = nearest(pool, note);
      }

      while (note < 60) note += 12;
      while (note > 81) note -= 12;
      slots.push(note);
      prev = note;
    }
  }

  return slots;
}

/**
 * Build an eight-bar score: a two-bar question/answer pair, then a varied
 * repeat that cadences on the dominant so the loop turns over naturally.
 */
export function buildScore(mode: MusicMode, seed: number): Score {
  const rng = mulberry32(seed);
  const base = PROGRESSIONS[mode];
  const chords = [...base, ...base];
  const chordTones = chords.map(chordVoicing);

  const first = phrase(chordTones, rng, 0, 67, false);
  const second = phrase(
    chordTones,
    rng,
    2,
    first[first.length - 1] ?? 67,
    true
  );

  // The repeat lifts its opening note an octave for a bit of lift, then
  // answers with a fresh phrase that ends on the dominant.
  const repeat = first.map((note, index) =>
    index === 0 && note != null && note + 12 <= 81 ? note + 12 : note
  );
  const answer = phrase(
    chordTones,
    rng,
    6,
    repeat[repeat.length - 1] ?? 67,
    true
  );

  return {
    mode,
    seed,
    bpm: BPM[mode],
    totalSteps: TOTAL_STEPS,
    chords,
    chordTones,
    melody: [...first, ...second, ...repeat, ...answer],
    bass: chordTones.map((voicing) => bassNote(voicing[0] ?? 48)),
    fifth: chordTones.map((voicing) => bassNote(voicing[0] ?? 48) + 7),
    arp: chordTones.map((voicing) => {
      const root = voicing[0] ?? 48;
      return [...voicing.map((note) => note + 12), root + 24];
    }),
    timpani: chordTones.map((voicing) => bassNote(voicing[0] ?? 48) + 12),
  };
}

/** Tiny deterministic value in [-1, 1) used to humanise velocities. */
function jitter(seed: number, step: number): number {
  let h = seed ^ Math.imul(step + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (((h ^ (h >>> 16)) >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * The notes/percussion for one sixteenth step, given the live intensity
 * (0 = quiet … 4 = mayhem). This is the contract the game feeds through
 * `setMusicIntensity`, and it is deliberately pure so the layer gates can be
 * tested without an AudioContext.
 */
export function eventsForStep(
  score: Score,
  step: number,
  intensity: number
): StepEvent[] {
  const level = Math.max(0, Math.min(4, Math.round(intensity)));
  const game = score.mode === "game";
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS;
  const inBar = step % STEPS_PER_BAR;
  const events: StepEvent[] = [];
  const human = jitter(score.seed, step);

  // Melody — every eighth, with a touch of velocity movement.
  if (inBar % 2 === 0) {
    const midi = score.melody[bar * SLOTS_PER_BAR + inBar / 2];
    if (midi != null) {
      const accent = inBar === 0 ? 0.08 : 0;
      events.push({
        layer: "melody",
        midi,
        duration: 0.18,
        velocity: clamp01(0.52 + level * 0.05 + accent + human * 0.04),
      });
    }
  }

  // Bass — root on beat 1, fifth on beat 3 (the marching oom-pah).
  if (inBar === 0) {
    events.push({
      layer: "bass",
      midi: score.bass[bar] ?? 36,
      duration: 0.3,
      velocity: 0.62,
    });
  }
  if (inBar === 8) {
    events.push({
      layer: "bass",
      midi: score.fifth[bar] ?? 43,
      duration: 0.3,
      velocity: 0.55,
    });
  }

  // Arp — calm eighths on the menus, sixteenths once a round is busy.
  const arpActive = game ? level >= 3 : true;
  if (arpActive && (game || inBar % 2 === 0)) {
    const chord = score.arp[bar] ?? [];
    const index = game
      ? inBar % Math.max(1, chord.length)
      : (inBar / 2) % Math.max(1, chord.length);
    const midi = chord[index];
    if (midi != null) {
      events.push({
        layer: "arp",
        midi,
        duration: 0.12,
        velocity: clamp01(0.34 + level * 0.025 + human * 0.02),
      });
    }
  }

  // Soft shaker — eighths, doubling to sixteenths at full intensity.
  const hatActive = game ? level >= 2 : true;
  const sixteenthHats = game && level >= 4;
  if (hatActive && (sixteenthHats || inBar % 2 === 0)) {
    const open = inBar === 6 || inBar === 14;
    events.push({
      layer: "hat",
      open,
      duration: open ? 0.06 : 0.025,
      velocity: open ? 0.22 : 0.16,
    });
  }

  if (game) {
    // Kick on 1 & 3, plus a couple of syncopated pushes when things get loud.
    if (level >= 1 && (inBar === 0 || inBar === 8)) {
      events.push({ layer: "kick", duration: 0.16, velocity: 0.8 });
    }
    if (level >= 3 && (inBar === 10 || inBar === 14)) {
      events.push({ layer: "kick", duration: 0.1, velocity: 0.45 });
    }

    // Backbeat on 2 & 4, with a small fill at the end of every fourth bar.
    if (level >= 2 && (inBar === 4 || inBar === 12)) {
      events.push({ layer: "snare", duration: 0.12, velocity: 0.55 });
    }
    if (level >= 2 && bar % 4 === 3 && (inBar === 14 || inBar === 15)) {
      events.push({
        layer: "snare",
        duration: 0.1,
        velocity: 0.35 + (inBar - 14) * 0.1,
      });
    }

    // Cymbal wash at the top of alternate bars.
    if (level >= 3 && inBar === 0 && bar % 2 === 0) {
      events.push({ layer: "cymbal", duration: 0.5, velocity: 0.3 });
    }

    // Timpani downbeat, plus a pickup into the second half.
    if (level >= 1 && inBar === 0) {
      events.push({
        layer: "timpani",
        midi: score.timpani[bar] ?? 48,
        duration: 0.35,
        velocity: 0.6,
      });
    }
    if (level >= 3 && bar % 4 === 3 && inBar === 8) {
      events.push({
        layer: "timpani",
        midi: score.timpani[bar] ?? 48,
        duration: 0.25,
        velocity: 0.4,
      });
    }
  }

  return events;
}
