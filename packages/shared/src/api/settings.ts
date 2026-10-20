import { z } from "zod";

// Account-backed player preferences: the same blob the web client persists in
// localStorage, plus the selected tank colours. Kept in @ouigame/shared so the
// API validates exactly what the client writes (and the web reuses the inferred
// types instead of maintaining a second interface).
//
// Key codes are KeyboardEvent.code values (layout-independent physical keys).
// The max length is a sanity bound, not an enumeration: every physical key is
// legal, and a future key must not require an API change.
export const GameActionSchema = z.enum([
  "up",
  "down",
  "left",
  "right",
  "plant",
]);
export type GameAction = z.infer<typeof GameActionSchema>;

export const KeyBindingsSchema = z.object({
  up: z.string().min(1).max(40),
  down: z.string().min(1).max(40),
  left: z.string().min(1).max(40),
  right: z.string().min(1).max(40),
  plant: z.string().min(1).max(40),
});
export type KeyBindings = z.infer<typeof KeyBindingsSchema>;

export const EffectSettingsSchema = z.object({
  bloom: z.boolean(),
  screenShake: z.boolean(),
  aberration: z.boolean(),
  vignette: z.boolean(),
  shockwaves: z.boolean(),
  particles: z.boolean(),
  flashes: z.boolean(),
  scenery: z.boolean(),
});
export type EffectSettings = z.infer<typeof EffectSettingsSchema>;

export const TouchControlsModeSchema = z.enum(["auto", "on", "off"]);
export type TouchControlsMode = z.infer<typeof TouchControlsModeSchema>;

// Indices into the client's TANK_COLORS palette (order is stable). The API does
// not know the palette size, so it only enforces a non-negative integer and a
// loose upper bound; the client clamps on read.
export const TankSelectionSchema = z.object({
  bodyIndex: z.number().int().nonnegative().max(1000),
  turretIndex: z.number().int().nonnegative().max(1000),
});
export type TankSelection = z.infer<typeof TankSelectionSchema>;

export const GameSettingsSchema = z.object({
  keybindings: KeyBindingsSchema,
  effects: EffectSettingsSchema,
  sfxVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  touchControls: TouchControlsModeSchema,
  autoFire: z.boolean(),
  tank: TankSelectionSchema,
});
export type GameSettings = z.infer<typeof GameSettingsSchema>;

// GET /settings — null when the player has never saved preferences (the client
// then seeds the account with its local settings).
export const PlayerSettingsResponseSchema = z.object({
  settings: GameSettingsSchema.nullable(),
});
export type PlayerSettingsResponse = z.infer<
  typeof PlayerSettingsResponseSchema
>;

// PUT /settings
export const SavePlayerSettingsRequestSchema = z.object({
  settings: GameSettingsSchema,
});
export type SavePlayerSettingsRequest = z.infer<
  typeof SavePlayerSettingsRequestSchema
>;
