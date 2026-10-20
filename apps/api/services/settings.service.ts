// Account-backed player settings: read/write one preferences blob per player.
// The route validates incoming payloads with the shared Zod schema; the read
// side re-parses defensively so a stored blob written by an older/newer schema
// degrades to "no server settings" instead of leaking an invalid shape.
import { GameSettingsSchema, type GameSettings } from "@ouigame/shared/api";
import * as repo from "../repositories/settings.repo";

async function getSettings(playerId: number) {
  const row = await repo.getPlayerSettings(playerId);
  if (row === null) return { settings: null };

  const parsed = GameSettingsSchema.safeParse(row.settings);
  return { settings: parsed.success ? parsed.data : null };
}

async function saveSettings(playerId: number, settings: GameSettings) {
  await repo.upsertPlayerSettings(playerId, settings);
  return { success: true as const };
}

export { getSettings, saveSettings };
