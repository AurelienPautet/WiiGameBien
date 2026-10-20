// Procedural waving flag — the shared "pretty flag" primitive used by the
// round-start spawn animation (spawnAnim.ts), the level editor preview and the
// static level thumbnails (levelScene.ts).
//
// The cloth is a strip of vertical slices whose top/bottom edges follow two
// travelling waves. It is filled in the game's flat-fill + thick-ink language:
// one base colour, one flat darker hem tone that follows the bottom edge, and
// a darker hoist sleeve. No gradients, no shadows, no ornaments — the wave and
// the ink silhouette do the work.
//
// The lifecycle is parameterised by `enter` / `exit` (0..1):
//  - enter: the pole springs out of the ground, then the cloth unfurls with a
//    small overshoot while dust kicks up from the base;
//  - idle: the cloth keeps waving, with slow gusts;
//  - exit: the cloth folds back into the pole and the whole rig sinks + fades,
//    leaving a last puff of dust.
import { mixHex, palette } from "../theme/palette";
import { clamp } from "./interpolation";

const INK = palette.ink;

// Fraction of the round-start spawn animation (progress 0..1) over which the
// flag is planted/unfurled, and the fraction over which it folds away again.
// SPAWN_ANIM_MS is 2600, so these are roughly 470ms in and 310ms out.
export const FLAG_ENTER_END = 0.18;
export const FLAG_EXIT_START = 0.88;

export interface FlagPresence {
  /** 0 = not planted yet, 1 = fully planted and unfurled. */
  enter: number;
  /** 0 = fully present, 1 = gone (folded away). */
  exit: number;
}

/**
 * Map round-start spawn progress (0..1) to the flag's enter/exit envelope.
 * Pure so the timing can be unit tested without a canvas.
 */
export function spawnFlagPresence(progress: number): FlagPresence {
  const p = clamp(progress, 0, 1);
  return {
    enter: clamp(p / FLAG_ENTER_END, 0, 1),
    exit: clamp((p - FLAG_EXIT_START) / (1 - FLAG_EXIT_START), 0, 1),
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

// Small overshoot so the pole pops out of the ground and the cloth snaps open.
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface DrawWavingFlagOpts {
  /** Ground contact point of the pole, board px. */
  baseX: number;
  baseY: number;
  /**
   * Scale unit. The pole is ~2.4 units tall; the cloth is ~1.65 × 0.95 units,
   * so callers pass the flag's overall "radius" and everything stays in
   * proportion.
   */
  unit: number;
  /** Cloth fill (a #rrggbb colour). */
  fill: string;
  /** Wave phase in seconds. Defaults to 0 (a static, already-waving snapshot). */
  time?: number;
  /** 0 = hidden → 1 = planted/unfurled. Defaults to 1. */
  enter?: number;
  /** 0 = present → 1 = folded away. Defaults to 0. */
  exit?: number;
  /** Draw the plant/fold dust puffs. Defaults to true. */
  ground?: boolean;
}

/** Number of vertical slices the cloth is sampled into for the wave. */
const SLICES = 18;

export function drawWavingFlag(
  c: CanvasRenderingContext2D,
  o: DrawWavingFlagOpts
): void {
  const u = Math.max(0.001, o.unit);
  const rawEnter = clamp(o.enter ?? 1, 0, 1);
  const exit = clamp(o.exit ?? 0, 0, 1);
  if (exit >= 1) return;

  const time = o.time ?? 0;
  const fill = o.fill;

  // Enter: the pole rises first, then the cloth unfurls from the hoist. Exit:
  // the cloth folds into the pole and the rig sinks a little as it fades.
  const poleT = Math.max(0, easeOutBack(clamp(rawEnter / 0.72, 0, 1)));
  const unfurlT = clamp((rawEnter - 0.22) / 0.78, 0, 1);
  const unfurl = Math.max(0, easeOutBack(unfurlT));
  const foldT = easeInCubic(exit);
  const ground = o.ground !== false;

  // Fade only in the last stretch of the exit; the fold/sink does the rest.
  const alpha = 1 - clamp((exit - 0.55) / 0.45, 0, 1);
  if (alpha <= 0.001) return;

  const poleH = 2.4 * u * poleT * (1 - foldT * 0.42);
  const poleTop = o.baseY - poleH;
  const clothW = 1.65 * u * unfurl * (1 - foldT);
  const clothH = 0.95 * u * Math.max(0.06, unfurl) * (1 - foldT * 0.3);
  const clothTop = poleTop + 0.04 * u;

  c.save();
  c.globalAlpha = alpha;
  c.lineJoin = "round";
  c.lineCap = "round";

  // Pole (drawn first so the cloth's hoist overlaps it) — a plain ink line,
  // no finial: the flat art keeps its silhouettes simple.
  if (poleH > 0.5) {
    c.strokeStyle = INK;
    c.lineWidth = 0.12 * u;
    c.beginPath();
    c.moveTo(o.baseX, o.baseY);
    c.lineTo(o.baseX, poleTop);
    c.stroke();
  }

  if (clothH > 0.08 * u && clothW > 0.03 * u) {
    drawCloth(c, {
      x: o.baseX,
      top: clothTop,
      w: clothW,
      h: clothH,
      fill,
      time,
      unfurl,
      foldT,
      u,
    });
  }

  // Plant dust while the flag enters; a last puff while it folds away.
  if (ground) {
    if (rawEnter > 0 && rawEnter < 1) {
      dustRing(c, o.baseX, o.baseY, u, rawEnter, alpha);
    } else if (exit > 0) {
      dustRing(c, o.baseX, o.baseY, u, exit, alpha);
    }
  }

  c.restore();
}

interface ClothParams {
  x: number;
  top: number;
  w: number;
  h: number;
  fill: string;
  time: number;
  unfurl: number;
  foldT: number;
  u: number;
}

/**
 * The cloth itself: sample the two edges, clip to the resulting silhouette,
 * paint the flat fills, then outline. Split out so drawWavingFlag stays
 * readable.
 */
function drawCloth(c: CanvasRenderingContext2D, p: ClothParams): void {
  const { x, top: clothTop, w: clothW, h: clothH, fill, time, foldT, u } = p;

  // Wave amplitude grows toward the fly (the hoist is nailed to the pole) and
  // speeds up / gets choppier while the flag folds away.
  const flutter = foldT * 0.2;
  const phase = time * (4.2 + flutter * 22);
  const gust = 0.68 + 0.32 * Math.sin(time * 1.7 + 0.8);
  const amp = clothH * 0.17 * gust * (0.55 + 0.45 * p.unfurl);

  const wave = (s: number, v: number): number => {
    const grow = s * s;
    return (
      Math.sin(phase + s * 5.1 + v * 1.1) * amp * grow +
      Math.sin(phase * 0.57 + s * 2.6 - v * 0.8) * amp * 0.55 * grow +
      Math.sin(phase * 1.7 + s * 7.4 + v * 2.2) *
        amp *
        Math.sin(foldT * 9) *
        0.3 *
        grow
    );
  };

  const xAt = (s: number) => x + s * clothW;
  const topAt = (s: number) => clothTop + wave(s, 0);
  const botAt = (s: number) => clothTop + clothH + wave(s, 1);
  // Swallowtail fly: a shallow V notch on the free edge, once the cloth is
  // wide enough for it to read.
  const notch = clothW * 0.15;
  const midY = (topAt(1) + botAt(1)) / 2;

  const trace = () => {
    c.beginPath();
    c.moveTo(xAt(0), topAt(0));
    for (let i = 1; i <= SLICES; i++) {
      const s = i / SLICES;
      c.lineTo(xAt(s), topAt(s));
    }
    if (notch > 0.18 * u) c.lineTo(xAt(1) - notch, midY);
    for (let i = SLICES - 1; i >= 0; i--) {
      const s = i / SLICES;
      c.lineTo(xAt(s), botAt(s));
    }
    c.closePath();
  };

  c.save();
  trace();
  c.clip();

  // Flat cel-shaded cloth: base colour plus one darker hem tone. The hem band
  // follows the bottom edge, so it ripples with the wave.
  c.fillStyle = fill;
  c.fillRect(x - u, clothTop - u * 2, clothW + u * 2, clothH + u * 4);

  c.fillStyle = mixHex(fill, INK, 0.16);
  c.beginPath();
  c.moveTo(xAt(0), botAt(0));
  for (let i = 1; i <= SLICES; i++) {
    const s = i / SLICES;
    c.lineTo(xAt(s), botAt(s));
  }
  for (let i = SLICES; i >= 0; i--) {
    const s = i / SLICES;
    c.lineTo(xAt(s), botAt(s) - clothH * 0.28);
  }
  c.closePath();
  c.fill();

  // Hoist sleeve: a darker flat band where the cloth meets the pole.
  c.fillStyle = mixHex(fill, INK, 0.28);
  c.fillRect(x, clothTop - u, Math.max(0.07 * u, 1), clothH + u * 2);

  c.restore();

  // Ink outline along the wavy silhouette, matching the rest of the arcade art.
  trace();
  c.strokeStyle = INK;
  c.lineWidth = Math.max(1.8, 0.13 * u);
  c.stroke();
}

/** An expanding, fading ellipse of dust at the pole's foot. */
function dustRing(
  c: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  u: number,
  t: number,
  alpha: number
): void {
  const p = clamp(t, 0, 1);
  const grow = easeOutCubic(p);
  const r = 0.3 * u + 0.7 * u * grow;
  c.save();
  c.globalAlpha = alpha * (1 - p) * 0.55;
  c.strokeStyle = palette.inkSoft;
  c.lineWidth = Math.max(1, 0.09 * u * (1 - p));
  c.beginPath();
  c.ellipse(baseX, baseY + 0.04 * u, r, r * 0.34, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}
