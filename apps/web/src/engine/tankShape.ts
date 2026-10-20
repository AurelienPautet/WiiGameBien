// Single source of truth for the tank SHAPE, drawn to a 2D canvas. Both the
// in-game Renderer and the menu <TankAvatar> call this, so the tank looks
// pixel-identical everywhere (Home, Tank-Select, Shop, Profile, Rankings, in-game).
//
// Clean diep.io silhouette: a flat circular hull with a single barrel poking
// out toward the aim direction, both with a thick dark outline. No treads, no
// gear hub — that clutter is what made earlier versions read like a cog.
//
// The optional hull PAINT (shop cosmetic) is a pattern clipped to the hull disc
// and drawn in a contrast tone derived from the body colour, so it stays legible
// on every team hue (including black and white) and drains with the ammo gauge.
import {
  palette,
  tankColors,
  desaturateHex,
  contrastTone,
} from "../theme/palette";
import { normalizePaint } from "../constants/tankPaints";

const INK = palette.ink;

export interface DrawTankOpts {
  /** hull centre */
  cx: number;
  cy: number;
  /** hull radius (everything scales from this) */
  r: number;
  /** body colour NAME (see constants/tankColors) */
  bodyColor: string;
  /** barrel colour NAME */
  turretColor: string;
  /** barrel direction in radians (0 = pointing right) */
  angle: number;
  /** draw the AI marker dot */
  isBot?: boolean;
  /**
   * Loaded-ammo fraction (0..1) used as a hull ammo gauge: 1 → full team hue,
   * 0 → washed-out grey (every shot in flight). Only the hull fill drains; the
   * barrel and ink outline stay coloured so team identity survives at empty.
   * Omitted (default 1) for menu avatars, which always show full colour.
   */
  ammoFraction?: number;
  /**
   * Hull paint id from the shop (constants/tankPaints). Unknown/absent → the
   * plain hull, so old snapshots and stale storage render exactly as before.
   */
  paint?: string;
}

// How far the barrel tip reaches from the hull centre, in units of r. Callers
// size their viewport with this so the barrel never clips.
export const TANK_REACH = 1.55;

// A five-point star centred at (x, y), filled with the current fillStyle.
function star(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  outer: number,
  inner: number,
  points = 5
): void {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
}

// One licking flame: `bottom` is its base line, `height` how far the tip rises.
function flame(
  c: CanvasRenderingContext2D,
  x: number,
  bottom: number,
  width: number,
  height: number
): void {
  c.beginPath();
  c.moveTo(x - width, bottom);
  c.quadraticCurveTo(
    x - width * 0.2,
    bottom - height * 0.45,
    x,
    bottom - height
  );
  c.quadraticCurveTo(
    x + width * 0.2,
    bottom - height * 0.45,
    x + width,
    bottom
  );
  c.quadraticCurveTo(x, bottom + height * 0.25, x - width, bottom);
  c.closePath();
  c.fill();
}

/**
 * Paint the hull disc. Everything is in hull-local coordinates (origin = hull
 * centre, units = r) and clipped to the hull circle, so a pattern can never
 * bleed past the ink outline. No-op for the plain hull.
 */
function paintHull(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  paint: string,
  hullFill: string
): void {
  if (paint === "plain") return;
  // Darken light hulls / lighten dark ones so the pattern always reads. Two
  // tones give camo its soft two-tone look; the rest use the stronger one.
  const tone = contrastTone(hullFill, 0.55);
  const soft = contrastTone(hullFill, 0.3);

  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();
  c.translate(cx, cy);

  switch (paint) {
    case "stripes": {
      c.rotate(-Math.PI / 4);
      c.fillStyle = tone;
      const step = r * 0.52;
      for (let i = -3; i <= 3; i++) {
        c.fillRect(i * step, -r * 1.6, r * 0.2, r * 3.2);
      }
      break;
    }
    case "checker": {
      const cell = r / 2.5;
      c.fillStyle = tone;
      for (let row = -3; row <= 3; row++) {
        for (let col = -3; col <= 3; col++) {
          if ((row + col) % 2 !== 0) continue;
          c.fillRect(col * cell, row * cell, cell, cell);
        }
      }
      break;
    }
    case "hazard": {
      // Bold warning rings — reads as a target/beacon from a distance.
      c.strokeStyle = tone;
      c.lineWidth = r * 0.16;
      c.beginPath();
      c.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, r * 0.74, 0, Math.PI * 2);
      c.stroke();
      break;
    }
    case "camo": {
      c.fillStyle = tone;
      const blobs: Array<[number, number, number, number, number]> = [
        [-0.42, -0.34, 0.4, 0.3, 0.5],
        [0.38, -0.2, 0.34, 0.26, -0.4],
        [0.04, 0.4, 0.36, 0.24, 0.2],
        [-0.42, 0.5, 0.24, 0.18, -0.3],
        [0.54, 0.44, 0.2, 0.16, 0.6],
      ];
      for (const [x, y, rx, ry, rot] of blobs) {
        c.beginPath();
        c.ellipse(x * r, y * r, rx * r, ry * r, rot, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = soft;
      const softBlobs: Array<[number, number, number, number]> = [
        [-0.08, -0.58, 0.22, 0.16],
        [0.62, -0.5, 0.16, 0.12],
        [-0.6, 0.08, 0.18, 0.14],
      ];
      for (const [x, y, rx, ry] of softBlobs) {
        c.beginPath();
        c.ellipse(x * r, y * r, rx * r, ry * r, 0.3, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case "bolt": {
      c.fillStyle = tone;
      c.beginPath();
      c.moveTo(0.14 * r, -0.9 * r);
      c.lineTo(-0.38 * r, -0.04 * r);
      c.lineTo(-0.06 * r, -0.04 * r);
      c.lineTo(-0.22 * r, 0.9 * r);
      c.lineTo(0.44 * r, -0.12 * r);
      c.lineTo(0.1 * r, -0.12 * r);
      c.lineTo(0.36 * r, -0.9 * r);
      c.closePath();
      c.fill();
      break;
    }
    case "stars": {
      c.fillStyle = tone;
      star(c, -0.34 * r, -0.3 * r, 0.34 * r, 0.14 * r);
      star(c, 0.37 * r, 0.05 * r, 0.26 * r, 0.11 * r);
      star(c, -0.02 * r, 0.45 * r, 0.2 * r, 0.085 * r);
      break;
    }
    case "flames": {
      c.fillStyle = tone;
      c.globalAlpha = 0.92;
      flame(c, -0.5 * r, 0.97 * r, 0.32 * r, 0.9 * r);
      flame(c, -0.02 * r, 1.05 * r, 0.4 * r, 1.12 * r);
      flame(c, 0.52 * r, 0.95 * r, 0.3 * r, 0.82 * r);
      c.globalAlpha = 1;
      break;
    }
    default:
      break;
  }

  c.restore();
}

export function drawTank(c: CanvasRenderingContext2D, o: DrawTankOpts): void {
  const { cx, cy, r, angle, isBot } = o;
  const body = tankColors(o.bodyColor);
  const turret = tankColors(o.turretColor);
  if (body.fill === "transparent") return;

  c.save();
  c.lineJoin = "round";
  c.strokeStyle = INK;

  // Barrel — drawn first so its base tucks under the hull and only the
  // protruding length shows. A touch tapered toward the muzzle.
  const baseW = r * 0.62;
  const tipW = r * 0.54;
  const len = r * TANK_REACH;
  c.save();
  c.translate(cx, cy);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, -baseW / 2);
  c.lineTo(len, -tipW / 2);
  c.lineTo(len, tipW / 2);
  c.lineTo(0, baseW / 2);
  c.closePath();
  c.fillStyle = turret.fill;
  c.lineWidth = r * 0.2;
  c.fill();
  c.stroke();
  c.restore();

  // Hull — its fill drains toward grey as the tank empties its magazine.
  const ammo = o.ammoFraction ?? 1;
  const hullFill = ammo >= 1 ? body.fill : desaturateHex(body.fill, 1 - ammo);
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = hullFill;
  c.fill();

  // Shop paint on top of the fill, still under the ink outline (so the hull
  // silhouette stays crisp whatever the pattern does at the rim).
  paintHull(c, cx, cy, r, normalizePaint(o.paint), hullFill);

  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.lineWidth = r * 0.22;
  c.stroke();

  // Bots get a small dark centre dot so they read as AI at a glance.
  if (isBot) {
    c.beginPath();
    c.arc(cx, cy, r * 0.26, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
  }

  c.restore();
}
