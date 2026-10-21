import { describe, expect, it } from "vitest";
import {
  BARS,
  TOTAL_STEPS,
  bassNote,
  buildScore,
  chordVoicing,
  eventsForStep,
  midiToFreq,
} from "../score";

describe("score generation", () => {
  it("builds an eight-bar score with one chord per bar", () => {
    const score = buildScore("menu", 1);
    expect(score.chords).toHaveLength(BARS);
    expect(score.chordTones).toHaveLength(BARS);
    expect(score.melody).toHaveLength(BARS * 8);
    expect(score.bass).toHaveLength(BARS);
    expect(score.totalSteps).toBe(TOTAL_STEPS);
  });

  it("is deterministic for a given seed and varies with another seed", () => {
    expect(buildScore("game", 42)).toEqual(buildScore("game", 42));
    expect(buildScore("game", 42).melody).not.toEqual(
      buildScore("game", 43).melody
    );
  });

  it("uses different progressions for menu and game", () => {
    expect(buildScore("menu", 1).chords.slice(0, 4)).toEqual([
      "C",
      "Am",
      "F",
      "G",
    ]);
    expect(buildScore("game", 1).chords.slice(0, 4)).toEqual([
      "C",
      "G",
      "Am",
      "F",
    ]);
  });

  it("keeps melody notes inside the C4–A5 register", () => {
    for (const mode of ["menu", "game"] as const) {
      for (const note of buildScore(mode, 7).melody) {
        if (note == null) continue;
        expect(note).toBeGreaterThanOrEqual(60);
        expect(note).toBeLessThanOrEqual(81);
      }
    }
  });

  it("puts chord tones on strong beats", () => {
    const score = buildScore("game", 9);
    for (let bar = 0; bar < BARS; bar++) {
      const chord = new Set(score.chordTones[bar]!.map((n) => n % 12));
      for (const slot of [0, 4]) {
        const note = score.melody[bar * 8 + slot];
        if (note == null) continue;
        expect(chord.has(note % 12)).toBe(true);
      }
    }
  });

  it("builds bass roots in the C2–A1 pocket", () => {
    expect(bassNote(48)).toBe(36); // C2
    expect(bassNote(57)).toBe(33); // A1, not A2
    expect(bassNote(55)).toBe(43); // G2
  });

  it("voices chords as ascending triads", () => {
    expect(chordVoicing("C")).toEqual([48, 52, 55]);
    expect(chordVoicing("Am")).toEqual([57, 60, 64]);
  });

  it("converts MIDI to frequency with A4 = 440 Hz", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });
});

describe("intensity layer gates", () => {
  const count = (mode: "menu" | "game", intensity: number) => {
    const score = buildScore(mode, 3);
    const counts: Record<string, number> = {};
    for (let step = 0; step < TOTAL_STEPS; step++) {
      for (const event of eventsForStep(score, step, intensity)) {
        counts[event.layer] = (counts[event.layer] ?? 0) + 1;
      }
    }
    return counts;
  };

  it("keeps intensity 0 to melody, bass and menu arp/hat colour", () => {
    const counts = count("game", 0);
    expect(counts.melody).toBeGreaterThan(0);
    expect(counts.bass).toBeGreaterThan(0);
    expect(counts.kick ?? 0).toBe(0);
    expect(counts.snare ?? 0).toBe(0);
    expect(counts.cymbal ?? 0).toBe(0);
    expect(counts.timpani ?? 0).toBe(0);
  });

  it("adds kick and timpani at intensity 1", () => {
    const counts = count("game", 1);
    expect(counts.kick).toBeGreaterThan(0);
    expect(counts.timpani).toBeGreaterThan(0);
    expect(counts.snare ?? 0).toBe(0);
  });

  it("adds snare and hats at intensity 2", () => {
    const counts = count("game", 2);
    expect(counts.snare).toBeGreaterThan(0);
    expect(counts.hat).toBeGreaterThan(0);
    expect(counts.cymbal ?? 0).toBe(0);
  });

  it("adds arp and cymbal at intensity 3", () => {
    const counts = count("game", 3);
    expect(counts.arp).toBeGreaterThan(0);
    expect(counts.cymbal).toBeGreaterThan(0);
  });

  it("doubles the hats at intensity 4", () => {
    expect(count("game", 4).hat).toBeGreaterThan(count("game", 3).hat);
  });

  it("plays no game percussion on the menus", () => {
    const counts = count("menu", 0);
    expect(counts.kick ?? 0).toBe(0);
    expect(counts.snare ?? 0).toBe(0);
    expect(counts.cymbal ?? 0).toBe(0);
    expect(counts.timpani ?? 0).toBe(0);
    expect(counts.melody).toBeGreaterThan(0);
    expect(counts.bass).toBeGreaterThan(0);
  });

  it("keeps every velocity inside 0..1", () => {
    const score = buildScore("game", 5);
    for (let step = 0; step < TOTAL_STEPS; step++) {
      for (const event of eventsForStep(score, step, 4)) {
        expect(event.velocity).toBeGreaterThan(0);
        expect(event.velocity).toBeLessThanOrEqual(1);
      }
    }
  });
});
