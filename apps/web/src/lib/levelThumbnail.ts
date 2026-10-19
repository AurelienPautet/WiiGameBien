// Static thumbnail rendering for saved level previews — a 2D render of the
// whole level with no ghost/animation, decoupled from the GL canvas so it's
// stable and needs no readback. Used by BOTH the editor's save path and the
// admin "re-render all thumbnails" maintenance job, so one visual-style change
// plus one admin click rewrites every stored preview consistently.
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../constants/canvas";
import { CELL_SIZE } from "../constants/level";
import { paintField, drawBlocks, drawHole } from "../engine/shapes";
import { drawFlagsAndBots, extractEntities } from "../engine/levelScene";

// JPEG quality for the stored preview — the small-blob budget the levels_img
// bytea column has always held.
const THUMBNAIL_QUALITY = 0.1;

// Render the layout to a JPEG data URL, or null when the canvas can't render.
export function renderLevelThumbnail(layout: number[]): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paintField(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE);
  const { blocks, holes, flags, bots } = extractEntities(layout);
  drawBlocks(ctx, blocks);
  holes.forEach((h) => drawHole(ctx, h));
  drawFlagsAndBots(ctx, flags, bots);
  return canvas.toDataURL("image/jpeg", THUMBNAIL_QUALITY);
}

// Render + encode straight to the hex wire format the API stores (raw JPEG
// bytes as hex, matching the save contract). Returns null when the canvas
// can't render or the data URL is malformed.
export function renderLevelThumbnailHex(layout: number[]): string | null {
  const dataUrl = renderLevelThumbnail(layout);
  if (dataUrl === null) return null;

  const base64 = dataUrl.split(",")[1];
  if (base64 === undefined) return null;

  const binary = atob(base64);
  let hex = "";
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

// Pull the flat layout array out of a level's stored `content` json envelope
// (`{ data: number[] }`), or null when the row isn't shaped like one. Used by
// the admin re-render job to skip malformed/legacy rows rather than crash.
export function levelLayoutFromContent(content: unknown): number[] | null {
  if (typeof content !== "object" || content === null) return null;
  const data = (content as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;

  const cells: unknown[] = data;
  const layout: number[] = [];
  for (const cell of cells) {
    if (typeof cell !== "number") return null;
    layout.push(cell);
  }
  return layout;
}
