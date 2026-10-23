/**
 * CPU-baked wall artwork.
 *
 * The wall pass used to build each tile's rounded silhouette analytically in
 * the fragment shader from per-tile neighbour flags. That approach could not
 * see beyond one tile: at a T junction the pieces (edge stroke, inner fillet,
 * suppression mask) came from different quads and met at slightly wrong
 * distances, leaving light notches in the ink and stray rounded corners.
 *
 * Instead, the merged wall region is rasterised on the CPU — with the same
 * rounded-fill semantics as the 2D fallback (`shapes.drawBlocks`) — whenever
 * the block set changes:
 *
 *   - every tile's fill is a rounded rect, rounded only at *convex* corners
 *     (both meeting edges exposed), so straight runs stay flush;
 *   - at every *concave* corner (both meeting edges covered, the diagonal cell
 *     open) exactly one tile owns a fillet: a small square-minus-quarter-disc
 *     nub rounds the junction into the open diagonal;
 *   - the ink outline is stroked along the exposed edges, trimmed to the arc
 *     tangency points and joined by those same arcs, so the outline is one
 *     continuous curve with no gaps at any junction.
 *
 * The bake encodes three coverage masks in one RGBA texture, using additive
 * canvas compositing so a pixel covered by two shapes keeps both masks:
 *
 *   R = ink (stroke) coverage
 *   G = stone fill coverage × 0.5
 *   B = sand  fill coverage × 0.5
 *   A = total coverage (for straight-alpha compositing over the field)
 *
 * The shader colours the fills procedurally (animated grain / hazard stripes,
 * gated by G/B), overlays ink from R, and uses A for the alpha. The bake runs
 * only when the block set changes; the per-frame path is one texture sample.
 */
import { BLOCK_RADIUS } from "./shapes";
import type { EnvBlock } from "./PostProcessor";

/** Stone fill mask value (half coverage so ink can be added on top). */
const HALF = 128;
/** Additive canvas colours for the three masks. */
const STONE_MASK = `rgb(0, ${HALF}, 0)`;
const SAND_MASK = `rgb(0, 0, ${HALF})`;
const INK_MASK = "rgb(255, 0, 0)";

/** A rounded corner arc (canvas angles, +x = 0, +y down). */
interface Arc {
  cx: number;
  cy: number;
  r: number;
  a0: number;
  a1: number;
  ccw: boolean;
}

/** One stroke piece: a straight edge or a join arc. */
export type WallPrim =
  | { kind: "line"; x0: number; y0: number; x1: number; y1: number }
  | ({ kind: "arc" } & Arc);

/** A concave-corner fillet nub, owned by the tile diagonal to the notch. */
export interface WallFillet {
  /** Corner point shared by the four cells. */
  px: number;
  py: number;
  /** Direction of the open diagonal quadrant from the corner. */
  dx: number;
  dy: number;
  r: number;
}

export interface WallTilePieces {
  x: number;
  y: number;
  w: number;
  h: number;
  type: number;
  /** Fill rounded-rect radii: TL, TR, BR, BL (0 = square corner). */
  fillRadii: [number, number, number, number];
  /** Fill fillet nubs at concave corners owned by this tile. */
  nubs: WallFillet[];
  /** Ink outline primitives owned by this tile. */
  outline: WallPrim[];
}

const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;

const mod2pi = (a: number) =>
  ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/** Pick the sweep direction whose arc passes through `through`. */
function arcThrough(a0: number, a1: number, through: number): boolean {
  const ccwSweep = mod2pi(a0 - a1);
  const toThrough = mod2pi(a0 - through);
  return toThrough <= ccwSweep; // ccw = decreasing angle in canvas terms
}

/** Arc centred on the fillet circle, tangent to the two edges at the corner. */
function cornerArc(
  px: number,
  py: number,
  dx: number,
  dy: number,
  r: number,
  fillet: boolean
): Arc {
  // Convex corners round with the centre *inside* the wall (opposite the open
  // diagonal); concave fillets use the centre inside the open diagonal. Either
  // way the arc bulges toward the corner point.
  const cx = px + (fillet ? dx : -dx) * r;
  const cy = py + (fillet ? dy : -dy) * r;
  const tx = fillet ? dx : -dx;
  const ty = fillet ? dy : -dy;
  // Tangency points on the two edges meeting at the corner.
  const t1x = px + tx * r;
  const t1y = py;
  const t2x = px;
  const t2y = py + ty * r;
  const a0 = Math.atan2(t1y - cy, t1x - cx);
  const a1 = Math.atan2(t2y - cy, t2x - cx);
  // The arc always bulges toward the corner point.
  const through = Math.atan2(py - cy, px - cx);
  return {
    cx,
    cy,
    r,
    a0,
    a1,
    ccw: arcThrough(a0, a1, through),
  };
}

/**
 * Pure per-tile geometry: fill corner radii, fillet nubs and outline
 * primitives. Corners are TL, TR, BR, BL; exposed edges have no same-type
 * neighbour abutting.
 */
export function wallPieces(
  blocks: EnvBlock[],
  radius = BLOCK_RADIUS
): WallTilePieces[] {
  const occ = new Map<string, number>();
  for (const b of blocks) occ.set(key(b.position.x, b.position.y), b.type);
  const has = (x: number, y: number, t: number) =>
    occ.get(key(x, y)) === t ? 1 : 0;

  const out: WallTilePieces[] = [];
  for (const b of blocks) {
    const { x, y } = b.position;
    const { w, h } = b.size;
    const t = b.type;
    const r = Math.min(radius, w / 2, h / 2);
    const x1 = x + w;
    const y1 = y + h;

    const eT = 1 - has(x, y - h, t);
    const eR = 1 - has(x + w, y, t);
    const eB = 1 - has(x, y + h, t);
    const eL = 1 - has(x - w, y, t);
    const dTR = has(x + w, y - h, t);
    const dBR = has(x + w, y + h, t);
    const dBL = has(x - w, y + h, t);
    const dTL = has(x - w, y - h, t);

    // TL, TR, BR, BL — meeting edges plus the diagonal cell across the corner.
    const corners = [
      { px: x, py: y, eA: eL, eB: eT, diag: dTL, dx: -1, dy: -1 },
      { px: x1, py: y, eA: eR, eB: eT, diag: dTR, dx: 1, dy: -1 },
      { px: x1, py: y1, eA: eR, eB: eB, diag: dBR, dx: 1, dy: 1 },
      { px: x, py: y1, eA: eL, eB: eB, diag: dBL, dx: -1, dy: 1 },
    ] as const;

    const fillRadii: [number, number, number, number] = [0, 0, 0, 0];
    const nubs: WallFillet[] = [];
    const outline: WallPrim[] = [];

    corners.forEach((c, i) => {
      const convex = c.eA === 1 && c.eB === 1;
      if (convex && r > 0) {
        fillRadii[i] = r;
        outline.push({
          kind: "arc",
          ...cornerArc(c.px, c.py, c.dx, c.dy, r, false),
        });
      } else if (c.eA === 0 && c.eB === 0 && c.diag === 0 && r > 0) {
        // Concave corner: this tile is the one diagonally opposite the notch,
        // so it owns the fillet material and its outline arc.
        nubs.push({ px: c.px, py: c.py, dx: c.dx, dy: c.dy, r });
        outline.push({
          kind: "arc",
          ...cornerArc(c.px, c.py, c.dx, c.dy, r, true),
        });
      }
    });

    // Edge strokes, trimmed by r at each end whose corner is rounded (either a
    // convex arc at this tile or a fillet shared with the diagonal neighbour).
    const trim = (diag: number, e1: number, e2: number) =>
      diag === 1 || (e1 === 1 && e2 === 1) ? r : 0;

    if (eT) {
      outline.push({
        kind: "line",
        x0: x + trim(dTL, eT, eL),
        y0: y,
        x1: x1 - trim(dTR, eT, eR),
        y1: y,
      });
    }
    if (eB) {
      outline.push({
        kind: "line",
        x0: x + trim(dBL, eB, eL),
        y0: y1,
        x1: x1 - trim(dBR, eB, eR),
        y1,
      });
    }
    if (eL) {
      outline.push({
        kind: "line",
        x0: x,
        y0: y + trim(dTL, eL, eT),
        x1: x,
        y1: y1 - trim(dBL, eL, eB),
      });
    }
    if (eR) {
      outline.push({
        kind: "line",
        x0: x1,
        y0: y + trim(dTR, eR, eT),
        x1,
        y1: y1 - trim(dBR, eR, eB),
      });
    }

    out.push({ x, y, w, h, type: t, fillRadii, nubs, outline });
  }
  return out;
}

/** Stable signature of the wall geometry, used to skip redundant bakes. */
export function wallSignature(blocks: EnvBlock[]): string {
  let s = "";
  for (const b of blocks) {
    s += `${Math.round(b.position.x)},${Math.round(b.position.y)},${Math.round(
      b.size.w
    )},${Math.round(b.size.h)},${b.type};`;
  }
  return s;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radii: [number, number, number, number]
): void {
  const [rTL, rTR, rBR, rBL] = radii;
  ctx.beginPath();
  ctx.moveTo(x0 + rTL, y0);
  ctx.lineTo(x1 - rTR, y0);
  if (rTR) ctx.arcTo(x1, y0, x1, y0 + rTR, rTR);
  ctx.lineTo(x1, y1 - rBR);
  if (rBR) ctx.arcTo(x1, y1, x1 - rBR, y1, rBR);
  ctx.lineTo(x0 + rBL, y1);
  if (rBL) ctx.arcTo(x0, y1, x0, y1 - rBL, rBL);
  ctx.lineTo(x0, y0 + rTL);
  if (rTL) ctx.arcTo(x0, y0, x0 + rTL, y0, rTL);
  ctx.closePath();
}

/** The little square-minus-quarter-disc that fills a concave corner. */
function filletPath(ctx: CanvasRenderingContext2D, f: WallFillet): void {
  const { px, py, dx, dy, r } = f;
  const cx = px + dx * r;
  const cy = py + dy * r;
  const t1x = px + dx * r;
  const t1y = py;
  const t2x = px;
  const t2y = py + dy * r;
  const a0 = Math.atan2(t1y - cy, t1x - cx);
  const a1 = Math.atan2(t2y - cy, t2x - cx);
  const through = Math.atan2(-dy, -dx);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(t1x, t1y);
  ctx.arc(cx, cy, r, a0, a1, arcThrough(a0, a1, through));
  ctx.closePath();
}

function addArcPath(ctx: CanvasRenderingContext2D, a: Arc): void {
  ctx.moveTo(a.cx + a.r * Math.cos(a.a0), a.cy + a.r * Math.sin(a.a0));
  ctx.arc(a.cx, a.cy, a.r, a.a0, a.a1, a.ccw);
}

/**
 * Rasterise the wall region into an RGBA mask canvas at board resolution.
 * The caller owns the canvas and reuses it across bakes.
 */
export function bakeWallMasks(
  ctx: CanvasRenderingContext2D,
  blocks: EnvBlock[],
  width: number,
  height: number,
  radius = BLOCK_RADIUS,
  outline = 4
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter"; // add mask channels
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = outline;

  const pieces = wallPieces(blocks, radius);

  // Fills first (half coverage in their type channel), then fillet nubs, then
  // the ink stroke on top (full coverage in red).
  for (const p of pieces) {
    ctx.fillStyle = p.type === 1 ? STONE_MASK : SAND_MASK;
    roundedRect(ctx, p.x, p.y, p.x + p.w, p.y + p.h, p.fillRadii);
    ctx.fill();
    if (p.nubs.length) {
      for (const nub of p.nubs) {
        filletPath(ctx, nub);
        ctx.fill();
      }
    }
  }

  ctx.strokeStyle = INK_MASK;
  for (const p of pieces) {
    ctx.beginPath();
    for (const prim of p.outline) {
      if (prim.kind === "line") {
        ctx.moveTo(prim.x0, prim.y0);
        ctx.lineTo(prim.x1, prim.y1);
      } else {
        addArcPath(ctx, prim);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}
