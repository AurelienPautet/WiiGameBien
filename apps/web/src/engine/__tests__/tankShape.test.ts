import { describe, it, expect } from "vitest";
import { drawTank } from "../tankShape";
import { TANK_PAINTS } from "../../constants/tankPaints";
import { tankColors, contrastTone, desaturateHex } from "../../theme/palette";

// A recording stand-in for CanvasRenderingContext2D. jsdom has no 2D canvas
// implementation, and the drawing assertions here are about WHICH paint ops run
// (clipped patterns in a contrast tone), not pixels — so we capture the calls.
interface Call {
  op: string;
  fillStyle?: string;
  strokeStyle?: string;
}

function fakeCtx() {
  const calls: Call[] = [];
  let fillStyle = "";
  let strokeStyle = "";
  let lineWidth = 1;
  const record = (op: string) => calls.push({ op, fillStyle, strokeStyle });

  const ctx = {
    lineJoin: "round",
    globalAlpha: 1,
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(v: string) {
      strokeStyle = v;
    },
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(v: number) {
      lineWidth = v;
    },
    save: () => record("save"),
    restore: () => record("restore"),
    beginPath: () => record("beginPath"),
    closePath: () => record("closePath"),
    moveTo: () => record("moveTo"),
    lineTo: () => record("lineTo"),
    quadraticCurveTo: () => record("quadraticCurveTo"),
    arc: () => record("arc"),
    ellipse: () => record("ellipse"),
    rect: () => record("rect"),
    clip: () => record("clip"),
    translate: () => record("translate"),
    rotate: () => record("rotate"),
    fill: () => record("fill"),
    stroke: () => record("stroke"),
    fillRect: () => record("fillRect"),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const draw = (paint?: string, bodyColor = "orange", ammoFraction = 1) => {
  const { ctx, calls } = fakeCtx();
  drawTank(ctx, {
    cx: 100,
    cy: 100,
    r: 40,
    bodyColor,
    turretColor: "blue",
    angle: 0,
    ammoFraction,
    ...(paint !== undefined ? { paint } : {}),
  });
  return calls;
};

const count = (calls: Call[], op: string) =>
  calls.filter((c) => c.op === op).length;

describe("drawTank hull paints", () => {
  it("draws no paint overlay for the plain hull", () => {
    const calls = draw("plain");
    expect(count(calls, "clip")).toBe(0);
    expect(count(calls, "save")).toBe(count(calls, "restore"));
  });

  it("treats a missing or unknown paint id as plain", () => {
    const plain = draw("plain");
    const missing = draw();
    const unknown = draw("rainbow");
    const ops = (calls: Call[]) => calls.map((c) => c.op);
    expect(ops(missing)).toEqual(ops(plain));
    expect(ops(unknown)).toEqual(ops(plain));
  });

  it.each(TANK_PAINTS.filter((p) => p.id !== "plain").map((p) => p.id))(
    "clips the %s pattern to the hull and balances save/restore",
    (id) => {
      const calls = draw(id);
      expect(count(calls, "clip")).toBe(1);
      expect(count(calls, "save")).toBe(count(calls, "restore"));
      // Every paint actually paints something inside the clip.
      expect(
        count(calls, "fill") + count(calls, "fillRect") + count(calls, "stroke")
      ).toBeGreaterThan(3);
    }
  );

  it("uses a contrast tone derived from the hull so patterns read on any colour", () => {
    const body = tankColors("orange").fill;
    const tone = contrastTone(body, 0.55);
    const calls = draw("stripes", "orange");
    expect(calls.some((c) => c.op === "fillRect" && c.fillStyle === tone)).toBe(
      true
    );
  });

  it("fades the pattern with the ammo gauge (desaturated hull base)", () => {
    const body = tankColors("orange").fill;
    const empty = desaturateHex(body, 1);
    const full = draw("checker", "orange", 1);
    const drained = draw("checker", "orange", 0);

    const hullTones = (calls: Call[]) =>
      new Set(
        calls.filter((c) => c.op === "fillRect").map((c) => c.fillStyle ?? "")
      );

    expect(hullTones(full).has(contrastTone(body, 0.55))).toBe(true);
    expect(hullTones(drained).has(contrastTone(empty, 0.55))).toBe(true);
    expect(hullTones(drained).has(contrastTone(body, 0.55))).toBe(false);
    // Sanity: the empty-hull fill itself is the desaturated body colour.
    expect(drained.some((c) => c.op === "fill" && c.fillStyle === empty)).toBe(
      true
    );
  });
});
