import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  gains: [] as Array<{ gain: { value: number }; outputs: unknown[] }>,
  shapers: [] as Array<{ curve: Float32Array; oversample: string }>,
}));

// The synth only needs a tiny subset of Tone's graph API. These fakes let us
// assert the shape of the saturation chain without a real AudioContext (jsdom
// has none).
vi.mock("../tone", () => {
  class FakeNode {
    outputs: unknown[] = [];

    connect<T>(node: T): T {
      this.outputs.push(node);
      return node;
    }

    dispose(): void {}
  }

  class FakeParam {
    value = 0;

    setValueAtTime(value: number): this {
      this.value = value;
      return this;
    }

    linearRampToValueAtTime(value: number): this {
      this.value = value;
      return this;
    }

    exponentialRampToValueAtTime(value: number): this {
      this.value = value;
      return this;
    }
  }

  class Gain extends FakeNode {
    gain = new FakeParam();

    constructor(value = 1) {
      super();
      this.gain.value = value;
      state.gains.push(this);
    }
  }

  class WaveShaper extends FakeNode {
    curve: Float32Array;
    oversample = "none";

    constructor(curve: Float32Array) {
      super();
      this.curve = curve;
      state.shapers.push(this);
    }
  }

  class Oscillator extends FakeNode {
    frequency = new FakeParam();
    detune = new FakeParam();
    onstop: (() => void) | null = null;

    constructor(opts: { frequency: number }) {
      super();
      this.frequency.value = opts.frequency;
    }

    start(): void {}
    stop(): void {}
  }

  class Noise extends FakeNode {
    onstop: (() => void) | null = null;

    start(): void {}
    stop(): void {}
  }

  class Filter extends FakeNode {
    frequency = new FakeParam();
    Q = new FakeParam();
  }

  class Panner extends FakeNode {}

  const Tone = {
    immediate: () => 0,
    Oscillator,
    Noise,
    Gain,
    WaveShaper,
    Filter,
    Panner,
  };

  return {
    getTone: () => Tone,
    getSfxDestination: () => new FakeNode(),
  };
});

import { noise, tone } from "../synth";

describe("synth drive", () => {
  beforeEach(() => {
    state.gains.length = 0;
    state.shapers.length = 0;
  });

  it("applies the requested drive as pre-gain before the shaper", () => {
    tone({ freq: 440, duration: 0.1, drive: 2.2 });

    expect(state.gains.some((g) => g.gain.value === 2.2)).toBe(true);
    expect(state.shapers).toHaveLength(1);
    expect(state.shapers[0]?.oversample).toBe("2x");
  });

  it("leaves the signal unsaturated when no drive is requested", () => {
    tone({ freq: 440, duration: 0.1 });

    expect(state.shapers).toHaveLength(0);
    expect(state.gains.some((g) => g.gain.value === 2.2)).toBe(false);
  });

  it("applies the requested drive to noise bursts too", () => {
    noise({ duration: 0.1, drive: 1.6 });

    expect(state.gains.some((g) => g.gain.value === 1.6)).toBe(true);
    expect(state.shapers).toHaveLength(1);
    expect(state.shapers[0]?.oversample).toBe("2x");
  });
});
