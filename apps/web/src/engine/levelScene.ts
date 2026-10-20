// Flat level layout → board-space geometry, shared by the level editor's live
// preview and the static thumbnail renderer (lib/levelThumbnail). Keeping the
// extraction here means a re-rendered admin thumbnail is drawn from exactly the
// same entities the editor shows.
import { drawFlag, drawTank } from "./shapes";
import type { EnvBlock, EnvHole } from "./PostProcessor";
import { CELL_SIZE, GRID_COLS } from "../constants/level";

// Block cell codes stored in a level layout array.
export const BLOCKS = {
  EMPTY: -1,
  WALL: 1,
  PLATFORM: 2,
  FLAG: 3,
  HOLE: 4,
  BOT_BROWN: 11, // Brown — stationary turret
  BOT_GREY: 12, // Grey — basic mobile soldier
  BOT_TEAL: 13, // Teal — no-rebound rockets
  BOT_GREEN: 14, // Green — stationary ricochet sniper
  BOT_YELLOW: 15, // Yellow — miner
  BOT_PURPLE: 16, // Purple — fast rapid-fire warrior
  BOT_MAGENTA: 17, // Magenta — rapid-fire rover, never dodges
  BOT_WHITE: 18, // White — rapid fire, near-blind
  BOT_BLACK: 19, // Black — elite: fast rockets + mines
};

// Bot block id → tank colour name (shared with the game palette).
export const BOT_COLOR: Record<number, string> = {
  [BLOCKS.BOT_BROWN]: "brown",
  [BLOCKS.BOT_GREY]: "grey",
  [BLOCKS.BOT_TEAL]: "teal",
  [BLOCKS.BOT_GREEN]: "green",
  [BLOCKS.BOT_YELLOW]: "yellow",
  [BLOCKS.BOT_PURPLE]: "purple",
  [BLOCKS.BOT_MAGENTA]: "magenta",
  [BLOCKS.BOT_WHITE]: "white",
  [BLOCKS.BOT_BLACK]: "black",
};

export interface LevelSceneEntities {
  blocks: EnvBlock[];
  holes: EnvHole[];
  flags: { x: number; y: number }[];
  bots: { x: number; y: number; color: string }[];
}

// Turn the flat layout array into board-space geometry: walls/platforms and
// holes feed the WebGL environment; flags/bots are 2D overlay markers.
export function extractEntities(layout: number[]): LevelSceneEntities {
  const cell = { w: CELL_SIZE, h: CELL_SIZE };
  const blocks: EnvBlock[] = [];
  const holes: EnvHole[] = [];
  const flags: { x: number; y: number }[] = [];
  const bots: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < layout.length; i++) {
    const block = layout[i];
    if (block === undefined || block < 0) continue;
    const x = (i % GRID_COLS) * CELL_SIZE;
    const y = Math.floor(i / GRID_COLS) * CELL_SIZE;
    if (block === BLOCKS.WALL || block === BLOCKS.PLATFORM) {
      blocks.push({ position: { x, y }, size: cell, type: block });
    } else if (block === BLOCKS.HOLE) {
      holes.push({ position: { x, y }, size: cell });
    } else if (block === BLOCKS.FLAG) {
      flags.push({ x, y });
    } else {
      const color = BOT_COLOR[block];
      if (color) bots.push({ x, y, color });
    }
  }
  return { blocks, holes, flags, bots };
}

// Draw the overlay markers (spawn flags + bot tanks) — same primitives the game
// uses for tanks, so they bloom/composite identically. `time` (seconds) drives
// the flags' idle wave; omit it for a static thumbnail snapshot.
export function drawFlagsAndBots(
  ctx: CanvasRenderingContext2D,
  flags: { x: number; y: number }[],
  bots: { x: number; y: number; color: string }[],
  time = 0
): void {
  flags.forEach((f) => drawFlag(ctx, f.x, f.y, CELL_SIZE, time));
  bots.forEach((b) =>
    drawTank(ctx, {
      cx: b.x + CELL_SIZE / 2,
      cy: b.y + CELL_SIZE / 2,
      r: CELL_SIZE * 0.4,
      bodyColor: b.color,
      turretColor: b.color,
      angle: -Math.PI / 2,
      isBot: true,
    })
  );
}
