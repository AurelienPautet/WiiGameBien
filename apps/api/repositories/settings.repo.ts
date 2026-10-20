// Player settings data access — PURE Drizzle queries. The blob is validated at
// the route boundary (Zod) and returned as-is; shaping/defensive parsing lives
// in the service.
import { db, schema } from "@ouigame/db";
import { eq } from "drizzle-orm";
import type { GameSettings } from "@ouigame/shared/api";

const { playerSettings } = schema;

// The player's settings row, or null if they have never saved preferences.
async function getPlayerSettings(playerId: number) {
  const rows = await db
    .select({ settings: playerSettings.settings })
    .from(playerSettings)
    .where(eq(playerSettings.playerId, playerId));
  return rows[0] ?? null;
}

// One row per player: insert on first save, update in place afterwards.
async function upsertPlayerSettings(playerId: number, settings: GameSettings) {
  await db
    .insert(playerSettings)
    .values({ playerId, settings })
    .onConflictDoUpdate({
      target: playerSettings.playerId,
      set: { settings, updatedTimestamp: new Date() },
    });
}

export { getPlayerSettings, upsertPlayerSettings };
