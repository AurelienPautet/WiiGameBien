import { describe, expect, it, vi } from "vitest";
import { SoundManager } from "../SoundManager.js";

// MINE_FUSE_TICKS — the standard fuse length, in 60 Hz simulation ticks.
const FUSE = 300;

describe("SoundManager mine fuse warnings", () => {
  it("stays silent until the warning window starts", () => {
    const sounds = new SoundManager();
    const beep = vi.spyOn(sounds, "playFuse").mockImplementation(() => {});

    for (let timealive = 0; timealive < FUSE - 81; timealive++) {
      sounds.playFuses([{ id: 1, timealive }], FUSE);
    }

    expect(beep).not.toHaveBeenCalled();
  });

  it("beeps faster and more urgently as the fuse runs out", () => {
    const sounds = new SoundManager();
    const beeps: Array<{ at: number; urgency: number }> = [];
    let now = 0;
    vi.spyOn(sounds, "playFuse").mockImplementation((urgency) => {
      beeps.push({ at: now, urgency });
    });

    for (now = 0; now <= FUSE; now++) {
      sounds.playFuses([{ id: 1, timealive: now }], FUSE);
    }

    expect(beeps.length).toBeGreaterThanOrEqual(5);
    // First beep lands with the visual flash; the last one is just before the
    // blast and has built up real urgency.
    expect(beeps[0]!.at).toBeLessThanOrEqual(FUSE - 80);
    expect(beeps.at(-1)!.at).toBeLessThan(FUSE);
    expect(beeps.at(-1)!.urgency).toBeGreaterThan(0.8);

    for (let i = 1; i < beeps.length; i++) {
      expect(beeps[i]!.urgency).toBeGreaterThan(beeps[i - 1]!.urgency);
    }
    const gaps = beeps.slice(1).map((b, i) => b.at - beeps[i]!.at);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]!);
    }
  });

  it("schedules each mine independently and drops resolved ones", () => {
    const sounds = new SoundManager();
    const urgencies: number[] = [];
    vi.spyOn(sounds, "playFuse").mockImplementation((urgency) => {
      urgencies.push(urgency);
    });

    // Two mines at different fuse ages warn together; the older one is more urgent.
    sounds.playFuses(
      [
        { id: 1, timealive: 230 },
        { id: 2, timealive: 290 },
      ],
      FUSE
    );
    expect(urgencies).toHaveLength(2);
    expect(urgencies[1]).toBeGreaterThan(urgencies[0]!);

    // Id 1 already has a beep scheduled, so this tick stays quiet...
    urgencies.length = 0;
    sounds.playFuses([{ id: 1, timealive: 235 }], FUSE);
    expect(urgencies).toHaveLength(0);

    // ...and a later tick fires it again.
    sounds.playFuses([{ id: 1, timealive: 250 }], FUSE);
    expect(urgencies).toHaveLength(1);
  });

  it("ignores mines beyond the warning window and mines without ids", () => {
    const sounds = new SoundManager();
    const beep = vi.spyOn(sounds, "playFuse").mockImplementation(() => {});

    sounds.playFuses(
      [
        { timealive: 290 }, // no id — e.g. a snapshot before ids were assigned
        { id: 3, timealive: 0 },
      ],
      FUSE
    );

    expect(beep).not.toHaveBeenCalled();
  });
});
