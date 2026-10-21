import { describe, it, expect } from "vitest";
import { spawnFlagBase } from "../spawnAnim.js";

// Regression for: "the spawn flag is offset to the left of the spawn point".
// The pole used to be planted at cx - 2.1r (almost a full cell away), so the
// marker read as belonging to the neighbouring cell. It now stands exactly on
// the spawn point; the foot keeps its small downward ground offset.
describe("spawnFlagBase", () => {
  it("plants the pole exactly on the spawn x", () => {
    for (const [cx, cy, r] of [
      [500, 300, 23],
      [50, 50, 20],
      [1234, 987, 42],
    ] as const) {
      expect(spawnFlagBase(cx, cy, r).x).toBe(cx);
    }
  });

  it("keeps the foot a little below the hull centre, on the ground", () => {
    expect(spawnFlagBase(500, 300, 23)).toEqual({ x: 500, y: 300 + 23 * 0.55 });
  });

  it("scales the ground offset with the hull radius", () => {
    const small = spawnFlagBase(0, 0, 10);
    const large = spawnFlagBase(0, 0, 40);
    expect(small.y).toBeCloseTo(5.5);
    expect(large.y).toBeCloseTo(22);
  });
});
