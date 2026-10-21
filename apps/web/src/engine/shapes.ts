// Shared "diep.io arcade" canvas drawing primitives — the SINGLE source of
// truth for the field, blocks, holes, spawn flags and tanks. Both the in-game
// Renderer and the LevelEditor import these, so the editor preview is drawn by
// the exact same code that draws the live game (no drift).
import { palette, mixHex } from "../theme/palette";
import { drawTank } from "./tankShape";

export { drawTank };

const INK = palette.ink;
const WALL_FILL = "#7d848e";
const PLATFORM_FILL = "#cbb287";

// Corner radius (board px) for the rounded look that matches the DOM UI
// (--radius-arcade). Only *convex* corners of a merged wall region are rounded;
// it's clamped per block to half the smaller side so thin tiles stay sane. The
// WebGL wall shader (postfx/shaders.ts) uses the same value.
export const BLOCK_RADIUS = 10;

// A hole's visual disc is inset from its 50px cell by this much. The inset keeps
// the circle clear of the rounded inner corners of surrounding wall blocks (a
// full-cell circle gets clipped into a rounded square when ringed by walls) and
// leaves a clean floor margin instead of touching neighbouring tiles. Collision
// still uses the full cell. Shared with the WebGL SDF bake in PostProcessor.
export const HOLE_INSET_PX = 5;

// Hole throat colours, shared by the 2D fallback/thumbnails and the WebGL shader
// so both paths stay in sync. The rim is a shade darker than the wall ink so a
// pit reads as a void rather than a raised tyre.
export const HOLE_INK_HEX = "#0a0c12";
export const HOLE_DEEP_HEX = "#10141c";
export const HOLE_CORE_HEX = "#07080d";

// Lighter floor than the raw palette field, so the in-game board reads whiter.
// Matches the WebGL field shader's WHITEN (postfx/shaders.ts) toward white.
const FIELD_WHITEN = 0.7;

export interface BlockShape {
  position: { x: number; y: number };
  size: { w: number; h: number };
  /** 1 = wall, 2 = platform */
  type: number;
}

export interface HoleShape {
  position: { x: number; y: number };
  size: { w: number; h: number };
}

/** Light graph-paper field: solid fill + faint grid lines at `cell` spacing. */
export function paintField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number
): void {
  ctx.fillStyle = mixHex(palette.field, "#ffffff", FIELD_WHITEN);
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = palette.fieldLine;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += cell) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += cell) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Wall/platform tiles that merge into one solid shape: flush fills (so adjacent
 * same-type cells tile seamlessly) + a thick ink outline only on edges that
 * face empty space (or a different type).
 *
 * A tile corner is *convex* (and so gets a rounded radius) only when both of the
 * two edges meeting there are exposed; interior corners stay sharp so merged
 * runs read as one rounded slab and the ink follows the rounded perimeter with
 * no gap where two exposed edges meet.
 */
export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: BlockShape[]
): void {
  const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  const occ = new Map<string, number>();
  for (const b of blocks) occ.set(key(b.position.x, b.position.y), b.type);

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const b of blocks) {
    const { x, y } = b.position;
    const { w, h } = b.size;
    const t = b.type;
    const has = (nx: number, ny: number) => occ.get(key(nx, ny)) === t;
    // Exposed edges (no same-type neighbour on that side).
    const top = !has(x, y - h);
    const right = !has(x + w, y);
    const bottom = !has(x, y + h);
    const left = !has(x - w, y);
    // Convex corners round; clamp radius to the tile so thin tiles stay valid.
    const r = Math.min(BLOCK_RADIUS, w / 2, h / 2);
    const rTL = top && left ? r : 0;
    const rTR = top && right ? r : 0;
    const rBR = bottom && right ? r : 0;
    const rBL = bottom && left ? r : 0;
    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;

    // Fill: the tile with convex corners rounded.
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
    ctx.fillStyle = t === 1 ? WALL_FILL : PLATFORM_FILL;
    ctx.fill();

    // Ink outline: only the exposed edges, joined through the rounded corners.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (top) {
      ctx.moveTo(x0 + rTL, y0);
      ctx.lineTo(x1 - rTR, y0);
      if (rTR) ctx.arcTo(x1, y0, x1, y0 + rTR, rTR);
    }
    if (right) {
      ctx.moveTo(x1, y0 + rTR);
      ctx.lineTo(x1, y1 - rBR);
      if (rBR) ctx.arcTo(x1, y1, x1 - rBR, y1, rBR);
    }
    if (bottom) {
      ctx.moveTo(x1 - rBR, y1);
      ctx.lineTo(x0 + rBL, y1);
      if (rBL) ctx.arcTo(x0, y1, x0, y1 - rBL, rBL);
    }
    if (left) {
      ctx.moveTo(x0, y1 - rBL);
      ctx.lineTo(x0, y0 + rTL);
      if (rTL) ctx.arcTo(x0, y0, x0 + rTL, y0, rTL);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Round ink-drawn pits — the 2D twin of the WebGL hole shader (used by the
 * no-WebGL fallback and the static level thumbnails). Adjacent holes are drawn
 * as one merged pit: every pass fills the union of all hole circles plus
 * capsules between touching neighbours, so a run reads as a continuous trench
 * instead of a row of separate dots. The GL path animates the spiral; here it is
 * baked as two flat arcs per tile, with the same two-tone throat and thick ink
 * rim as the shader so thumbnails stay on-style.
 */
export function drawHoles(
  ctx: CanvasRenderingContext2D,
  holes: readonly HoleShape[]
): void {
  if (holes.length === 0) return;

  const pits = holes.map((h) => {
    const s = Math.min(h.size.w, h.size.h);
    const inset = Math.min(HOLE_INSET_PX, s * 0.1);
    return {
      h,
      cx: h.position.x + h.size.w / 2,
      cy: h.position.y + h.size.h / 2,
      r: Math.max(1, s / 2 - inset),
    };
  });
  const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  const byKey = new Map<string, number>();
  pits.forEach((p, i) => byKey.set(key(p.h.position.x, p.h.position.y), i));

  // Touching pairs get a capsule between their centres. A filled 2x2 block also
  // gets one diagonal capsule, which fills the little diamond left in its
  // middle (same construction as the GL SDF bake).
  const links: Array<[number, number]> = [];
  pits.forEach((p, i) => {
    const { x, y } = p.h.position;
    const { w, h } = p.h.size;
    const right = byKey.get(key(x + w, y));
    const down = byKey.get(key(x, y + h));
    if (right !== undefined) links.push([i, right]);
    if (down !== undefined) links.push([i, down]);
    if (right !== undefined && down !== undefined) {
      const diag = byKey.get(key(x + w, y + h));
      if (diag !== undefined) links.push([i, diag]);
    }
  });

  const baseAlpha = ctx.globalAlpha;
  const t = Math.PI * 2;
  ctx.save();

  // Fill the union of every pit's circle and capsule at a given radius scale.
  const fillUnion = (scale: number, color: string) => {
    ctx.fillStyle = color;
    for (const p of pits) {
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, p.r * scale, 0, t);
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    for (const [a, b] of links) {
      const ra = pits[a]!.r * scale;
      const rb = pits[b]!.r * scale;
      const rr = Math.min(ra, rb);
      if (rr <= 0) continue;
      ctx.lineWidth = rr * 2;
      ctx.beginPath();
      ctx.moveTo(pits[a]!.cx, pits[a]!.cy);
      ctx.lineTo(pits[b]!.cx, pits[b]!.cy);
      ctx.stroke();
    }
  };

  ctx.globalAlpha = baseAlpha;
  fillUnion(1, HOLE_INK_HEX); // ink silhouette
  fillUnion(0.82, HOLE_DEEP_HEX); // outer throat tone, leaves a rim band
  fillUnion(0.55, HOLE_CORE_HEX); // near-black centre

  // Two thin, flat spiral ribbons per tile — blue and violet opposite each
  // other — plus a pale bevel just inside the rim.
  ctx.lineCap = "round";
  for (const p of pits) {
    const r = p.r;
    ctx.globalAlpha = baseAlpha * 0.8;
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.strokeStyle = palette.blueD;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, r * 0.58, -0.55, 1.75);
    ctx.stroke();

    ctx.globalAlpha = baseAlpha * 0.65;
    ctx.strokeStyle = palette.purpleD;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, r * 0.58, 2.6, 4.9);
    ctx.stroke();

    ctx.globalAlpha = baseAlpha * 0.7;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = palette.teal;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, r * 0.78, -2.55, -1.0);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw one hole (palette icons and single-cell previews). */
export function drawHole(ctx: CanvasRenderingContext2D, h: HoleShape): void {
  drawHoles(ctx, [h]);
}

/** Spawn-point marker — a little yellow pennant on an ink pole (editor only). */
export function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number
): void {
  const px = x + s * 0.34;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, y + s * 0.2);
  ctx.lineTo(px, y + s * 0.82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px, y + s * 0.22);
  ctx.lineTo(x + s * 0.74, y + s * 0.36);
  ctx.lineTo(px, y + s * 0.5);
  ctx.closePath();
  ctx.fillStyle = palette.yellow;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
