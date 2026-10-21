import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the audio layer: this file only asserts which voice each event flag maps
// to. The voices themselves (and the fuse scheduler) are covered elsewhere.
vi.mock("../../audio", () => ({
  audioBus: { enabled: true, resume: vi.fn() },
  playSfx: vi.fn(),
  playFuseWarning: vi.fn(),
  setSfxVolume: vi.fn(),
  setMusicVolume: vi.fn(),
}));

import { playSfx } from "../../audio";
import { SoundManager } from "../SoundManager.js";

const sfx = vi.mocked(playSfx);

beforeEach(() => {
  sfx.mockClear();
});

describe("SoundManager.playSounds", () => {
  it("maps each event flag to its voice, in order", () => {
    const sounds = new SoundManager();

    sounds.playSounds({
      shoot: true,
      kill: true,
      explose: true,
      plant: true,
      ricochet: true,
      bounce_explode: true,
    });

    expect(sfx.mock.calls.map(([name]) => name)).toEqual([
      "shoot",
      "kill",
      "explose",
      "plant",
      "ricochet",
      // The last bounce — the bullet bursts, so it gets the burst pop.
      "bulletBurst",
    ]);
  });

  it("plays nothing for missing or empty events", () => {
    const sounds = new SoundManager();

    sounds.playSounds(null);
    sounds.playSounds(undefined);
    sounds.playSounds({});

    expect(sfx).not.toHaveBeenCalled();
  });
});
