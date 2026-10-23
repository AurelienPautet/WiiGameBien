import { describe, expect, it } from "vitest";
import { wallPieces } from "../wallTexture";
import type { EnvBlock } from "../PostProcessor";

const tile = (gx: number, gy: number, type = 1): EnvBlock => ({
  position: { x: gx * 50, y: gy * 50 },
  size: { w: 50, h: 50 },
  type,
});

const find = (blocks: EnvBlock[], gx: number, gy: number) =>
  wallPieces(blocks)[
    blocks.findIndex(
      (b) => b.position.x === gx * 50 && b.position.y === gy * 50
    )
  ]!;

const lines = (p: ReturnType<typeof find>) =>
  p.outline.filter((o) => o.kind === "line");
const arcs = (p: ReturnType<typeof find>) =>
  p.outline.filter((o) => o.kind === "arc");

describe("wallPieces", () => {
  it("rounds all four corners of an isolated tile and insets its outline", () => {
    const p = find([tile(0, 0)], 0, 0);
    expect(p.fillRadii).toEqual([10, 10, 10, 10]);
    expect(lines(p)).toHaveLength(4);
    expect(arcs(p)).toHaveLength(4);
    // Every edge is trimmed to the arc tangency points (10px from each corner).
    expect(lines(p)).toEqual(
      expect.arrayContaining([
        { kind: "line", x0: 10, y0: 0, x1: 40, y1: 0 },
        { kind: "line", x0: 50, y0: 10, x1: 50, y1: 40 },
        { kind: "line", x0: 10, y0: 50, x1: 40, y1: 50 },
        { kind: "line", x0: 0, y0: 10, x1: 0, y1: 40 },
      ])
    );
  });

  it("keeps a straight run flush with a continuous top/bottom outline", () => {
    const blocks = [tile(0, 0), tile(1, 0), tile(2, 0)];
    const [a, b, c] = [0, 1, 2].map((i) => find(blocks, i, 0));

    // Middle tile: no rounding, full-width edges.
    expect(b!.fillRadii).toEqual([0, 0, 0, 0]);
    expect(b!.outline.filter((o) => o.kind === "line")).toEqual([
      { kind: "line", x0: 50, y0: 0, x1: 100, y1: 0 },
      { kind: "line", x0: 50, y0: 50, x1: 100, y1: 50 },
    ]);

    // Neighbouring edge strokes meet exactly at the seams.
    const topA = lines(a!)[0]!;
    const topB = lines(b!)[0]!;
    const topC = lines(c!)[0]!;
    expect([topA.x1, topA.y1]).toEqual([50, 0]);
    expect([topB.x0, topB.y0]).toEqual([50, 0]);
    expect([topB.x1, topB.y1]).toEqual([100, 0]);
    expect([topC.x0, topC.y0]).toEqual([100, 0]);
    // Only the two run ends are rounded.
    expect(arcs(a!)).toHaveLength(2);
    expect(arcs(b!)).toHaveLength(0);
    expect(arcs(c!)).toHaveLength(2);
  });

  it("T junction: outlines meet the fillet instead of leaving a notch", () => {
    // Horizontal bar at row 0 (x 0..150) with a column hanging below at x=50.
    const blocks = [tile(0, 0), tile(1, 0), tile(2, 0), tile(1, 1)];
    const left = find(blocks, 0, 0); // bar tile left of the junction
    const above = find(blocks, 1, 0); // bar tile above the column
    const column = find(blocks, 1, 1);

    // The tile left of the junction stops its bottom ink 10px before the
    // column edge; the fillet arc bridges the last 10px.
    const leftBottom = lines(left).find((l) => l.y0 === 50)!;
    expect(leftBottom.x1).toBe(40); // 50 (tile edge) - 10 (fillet radius)

    // The tile above the column owns both concave fillets and no bottom ink.
    expect(above!.nubs).toHaveLength(2);
    expect(lines(above!)).toHaveLength(1); // only its open top edge
    expect(above!.outline.filter((o) => o.kind === "line")[0]).toMatchObject({
      y0: 0,
      y1: 0,
    });

    // The column starts its left ink 10px below the bar, at the arc tangency.
    const colLeft = lines(column).find((l) => l.x0 === 50 && l.y0 > 50)!;
    expect(colLeft.y0).toBe(60);

    // Arc endpoints land exactly on the trimmed line ends: (40,50) -> (50,60).
    const fillet = arcs(above!).find(
      (a) =>
        a.cx === 40 &&
        a.cy === 60 &&
        a.r === 10 &&
        Math.abs(a.a0 + Math.PI / 2) < 1e-9
    )!;
    const start = {
      x: fillet.cx + fillet.r * Math.cos(fillet.a0),
      y: fillet.cy + fillet.r * Math.sin(fillet.a0),
    };
    const end = {
      x: fillet.cx + fillet.r * Math.cos(fillet.a1),
      y: fillet.cy + fillet.r * Math.sin(fillet.a1),
    };
    expect(start).toEqual({ x: 40, y: 50 });
    expect(end).toEqual({ x: 50, y: 60 });
  });

  it("joins a sand/stone boundary with ink on both tiles", () => {
    const blocks = [tile(0, 0, 1), tile(1, 0, 2)];
    const stone = find(blocks, 0, 0);
    const sand = find(blocks, 1, 0);
    // Both expose the shared edge, so each draws the vertical ink stroke there.
    expect(lines(stone).some((l) => l.x0 === 50 && l.x1 === 50)).toBe(true);
    expect(lines(sand).some((l) => l.x0 === 50 && l.x1 === 50)).toBe(true);
    // Both round their corners on the shared side -> the outline is continuous.
    expect(arcs(stone).length).toBe(4);
    expect(arcs(sand).length).toBe(4);
  });

  it("fills the four inner corners of a ring pocket with fillets", () => {
    // 5x3 ring: top/bottom rows plus the middle row's end caps.
    const blocks = [
      tile(0, 0),
      tile(1, 0),
      tile(2, 0),
      tile(0, 1),
      tile(2, 1),
      tile(0, 2),
      tile(1, 2),
      tile(2, 2),
    ];
    const nubs = wallPieces(blocks).reduce((n, p) => n + p.nubs.length, 0);
    expect(nubs).toBe(4);
    // The pocket edges have no stray ink inside the open corridor.
    const middle = find(blocks, 0, 1);
    expect(lines(middle).every((l) => l.x0 === 0 || l.x1 === 50)).toBe(true);
  });
});
