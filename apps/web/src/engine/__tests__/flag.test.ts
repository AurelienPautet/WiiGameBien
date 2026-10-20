import { describe, it, expect } from "vitest";
import {
  FLAG_ENTER_END,
  FLAG_EXIT_START,
  drawWavingFlag,
  spawnFlagPresence,
} from "../flag.js";

describe("spawnFlagPresence", () => {
  it("plants the flag over the first slice of the spawn animation", () => {
    expect(spawnFlagPresence(0)).toEqual({ enter: 0, exit: 0 });
    expect(spawnFlagPresence(FLAG_ENTER_END / 2).enter).toBeCloseTo(0.5);
    expect(spawnFlagPresence(FLAG_ENTER_END)).toEqual({ enter: 1, exit: 0 });
  });

  it("holds the flag up through the drop", () => {
    for (const p of [FLAG_ENTER_END, 0.3, 0.5, 0.7, FLAG_EXIT_START]) {
      expect(spawnFlagPresence(p)).toEqual({ enter: 1, exit: 0 });
    }
  });

  it("folds the flag away at the end", () => {
    const mid = spawnFlagPresence((FLAG_EXIT_START + 1) / 2);
    expect(mid.exit).toBeCloseTo(0.5);
    expect(spawnFlagPresence(1)).toEqual({ enter: 1, exit: 1 });
  });

  it("clamps progress outside 0..1", () => {
    expect(spawnFlagPresence(-2)).toEqual({ enter: 0, exit: 0 });
    expect(spawnFlagPresence(4)).toEqual({ enter: 1, exit: 1 });
  });
});

// Minimal recording 2D context: every drawing method is a no-op that records
// its name, so we can assert the lifecycle reaches the expected draw stages
// without pulling a native canvas into jsdom.
function makeCtx() {
  const calls: string[] = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy(
    {},
    {
      get(_target, prop) {
        if (
          prop === "createLinearGradient" ||
          prop === "createRadialGradient"
        ) {
          return () => gradient;
        }
        calls.push(String(prop));
        return () => {};
      },
      set() {
        return true;
      },
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("drawWavingFlag", () => {
  it("draws nothing before the flag enters", () => {
    const { ctx, calls } = makeCtx();
    drawWavingFlag(ctx, {
      baseX: 100,
      baseY: 120,
      unit: 20,
      fill: "#00b2e1",
      enter: 0,
    });
    expect(calls).not.toContain("stroke");
    expect(calls).not.toContain("fill");
    expect(calls).not.toContain("clip");
  });

  it("draws nothing once the exit is complete", () => {
    const { ctx, calls } = makeCtx();
    drawWavingFlag(ctx, {
      baseX: 100,
      baseY: 120,
      unit: 20,
      fill: "#00b2e1",
      exit: 1,
    });
    expect(calls).toEqual([]);
  });

  it("renders every visible lifecycle frame without throwing", () => {
    for (const progress of [0.09, 0.18, 0.3, 0.5, 0.7, 0.88, 0.94, 0.99]) {
      const { ctx, calls } = makeCtx();
      const { enter, exit } = spawnFlagPresence(progress);
      expect(() =>
        drawWavingFlag(ctx, {
          baseX: 100,
          baseY: 120,
          unit: 20,
          fill: "#00b2e1",
          time: progress * 2.6,
          enter,
          exit,
        })
      ).not.toThrow();
      // Pole + cloth + ink outline reach the canvas.
      expect(calls).toContain("stroke");
      expect(calls).toContain("fill");
    }
  });
});
