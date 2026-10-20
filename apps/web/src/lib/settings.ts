// User settings: configurable keyboard bindings, toggleable visual/audio
// effects, and the selected tank colours. Persisted as a single JSON blob in
// localStorage (via `storage`) for anonymous play, and — for logged-in players
// — mirrored to their account by SettingsContext so preferences follow them
// across devices.
//
// Two consumers read these:
//   • the imperative engine — keybindings drive InputHandler's key→action map;
//     effect flags gate the WebGL post-processor, particles and sounds.
//   • the React SettingsModal — edits these and persists them.
//
// normalizeSettings() always merges the stored blob over the defaults, so a
// settings blob written by an older build (missing a newly-added field) still
// resolves to a complete, valid Settings object.
import type {
  EffectSettings,
  GameAction,
  GameSettings,
  KeyBindings,
  TankSelection,
  TouchControlsMode,
} from "@ouigame/shared/api";
import { DEFAULT_TANK_INDEX, TANK_COLORS } from "../constants/tankColors";
import { storage } from "./storage";

// The canonical shape lives in @ouigame/shared/api (the API validates the same
// object); re-exported here so existing consumers keep importing from this
// module while there is only one definition to maintain.
export type {
  EffectSettings,
  GameAction,
  KeyBindings,
  TankSelection,
  TouchControlsMode,
};
export type Settings = GameSettings;

export const ACTION_LABELS: Record<GameAction, string> = {
  up: "Move up",
  down: "Move down",
  left: "Move left",
  right: "Move right",
  plant: "Plant mine",
};

export const EFFECT_LABELS: Record<keyof EffectSettings, string> = {
  bloom: "Bloom glow",
  screenShake: "Screen shake",
  aberration: "Chromatic aberration",
  vignette: "Vignette",
  shockwaves: "Shockwaves",
  particles: "Particles",
  flashes: "Damage / kill flashes",
  scenery: "Animated scenery",
};

export const DEFAULT_SETTINGS: Settings = {
  keybindings: {
    up: "KeyW",
    down: "KeyS",
    left: "KeyA",
    right: "KeyD",
    plant: "Space",
  },
  effects: {
    bloom: true,
    screenShake: true,
    aberration: true,
    vignette: true,
    shockwaves: true,
    particles: true,
    flashes: true,
    scenery: true,
  },
  // Music sits a bit under the effects by default.
  sfxVolume: 0.8,
  musicVolume: 0.3,
  touchControls: "auto",
  autoFire: true,
  tank: {
    bodyIndex: DEFAULT_TANK_INDEX,
    turretIndex: DEFAULT_TANK_INDEX,
  },
};

// Layout presets for the four movement keys (plant stays Space). The settings
// modal also surfaces "Arrows" — handy since arrow keys are a permanent
// movement fallback in the engine, but a preset makes the intent explicit.
export const KEY_PRESETS = {
  WASD: {
    up: "KeyW",
    down: "KeyS",
    left: "KeyA",
    right: "KeyD",
    plant: "Space",
  },
  ZQSD: {
    up: "KeyZ",
    down: "KeyS",
    left: "KeyQ",
    right: "KeyD",
    plant: "Space",
  },
  Arrows: {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    plant: "Space",
  },
} as const satisfies Record<string, KeyBindings>;

export type PresetName = keyof typeof KEY_PRESETS;

/** Name of the preset the bindings exactly match, or "Custom". */
export function matchPreset(b: KeyBindings): PresetName | "Custom" {
  for (const [name, preset] of Object.entries(KEY_PRESETS)) {
    if (
      (Object.keys(preset) as GameAction[]).every((a) => preset[a] === b[a])
    ) {
      return name as PresetName;
    }
  }
  return "Custom";
}

/** Human-readable label for a KeyboardEvent.code (e.g. "KeyW" → "W"). */
export function keyLabel(code: string): string {
  if (!code) return "—";
  const arrows: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };
  if (arrows[code]) return arrows[code]!;
  if (code === "Space") return "Space";
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1]!;
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1]!;
  // ShiftLeft/ControlRight/etc. → "Shift"/"Control", otherwise the raw code.
  const mod = /^(Shift|Control|Alt|Meta)(Left|Right)$/.exec(code);
  if (mod) return mod[1]!;
  return code;
}

// --- Validation/normalization helpers (also guard tampered localStorage) ---

function validCode(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 && value.length <= 40
    ? value
    : fallback;
}

function validBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validVolume(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : fallback;
}

function validTankIndex(value: unknown, fallback: number): number {
  // localStorage returns strings; null/"" must not coerce to a valid index 0.
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  if (value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 0 && n < TANK_COLORS.length ? n : fallback;
}

function validTouchControls(value: unknown): TouchControlsMode {
  return value === "auto" || value === "on" || value === "off"
    ? value
    : DEFAULT_SETTINGS.touchControls;
}

/**
 * Resolve a partial/stored settings blob into a complete, validated Settings
 * object. Used for both localStorage and the account copy: the fallback for the
 * tank selection is the legacy body/turret keys (older blobs predate `tank`).
 */
export function normalizeSettings(
  stored: Partial<Settings> | null | undefined
): Settings {
  if (!stored) return structuredClone(DEFAULT_SETTINGS);

  const keybindings: Partial<KeyBindings> = stored.keybindings ?? {};
  const effects: Partial<EffectSettings> = stored.effects ?? {};
  const tank: Partial<TankSelection> = stored.tank ?? {};

  const bodyFallback = validTankIndex(
    storage.getBodyIndex(),
    DEFAULT_SETTINGS.tank.bodyIndex
  );
  const turretFallback = validTankIndex(
    storage.getTurretIndex(),
    DEFAULT_SETTINGS.tank.turretIndex
  );

  return {
    keybindings: {
      up: validCode(keybindings.up, DEFAULT_SETTINGS.keybindings.up),
      down: validCode(keybindings.down, DEFAULT_SETTINGS.keybindings.down),
      left: validCode(keybindings.left, DEFAULT_SETTINGS.keybindings.left),
      right: validCode(keybindings.right, DEFAULT_SETTINGS.keybindings.right),
      plant: validCode(keybindings.plant, DEFAULT_SETTINGS.keybindings.plant),
    },
    effects: {
      bloom: validBoolean(effects.bloom, DEFAULT_SETTINGS.effects.bloom),
      screenShake: validBoolean(
        effects.screenShake,
        DEFAULT_SETTINGS.effects.screenShake
      ),
      aberration: validBoolean(
        effects.aberration,
        DEFAULT_SETTINGS.effects.aberration
      ),
      vignette: validBoolean(
        effects.vignette,
        DEFAULT_SETTINGS.effects.vignette
      ),
      shockwaves: validBoolean(
        effects.shockwaves,
        DEFAULT_SETTINGS.effects.shockwaves
      ),
      particles: validBoolean(
        effects.particles,
        DEFAULT_SETTINGS.effects.particles
      ),
      flashes: validBoolean(effects.flashes, DEFAULT_SETTINGS.effects.flashes),
      scenery: validBoolean(effects.scenery, DEFAULT_SETTINGS.effects.scenery),
    },
    sfxVolume: validVolume(stored.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    musicVolume: validVolume(stored.musicVolume, DEFAULT_SETTINGS.musicVolume),
    touchControls: validTouchControls(stored.touchControls),
    autoFire: validBoolean(stored.autoFire, DEFAULT_SETTINGS.autoFire),
    tank: {
      bodyIndex: validTankIndex(tank.bodyIndex, bodyFallback),
      turretIndex: validTankIndex(tank.turretIndex, turretFallback),
    },
  };
}

/** Load local settings, merging the stored blob over the defaults. */
export function loadSettings(): Settings {
  return normalizeSettings(storage.getSettings<Partial<Settings>>());
}

/**
 * Persist settings locally. The tank indices are also written to the legacy
 * body/turret keys so the imperative engine (which reads them at game start)
 * and any older code path stay in sync with the settings blob.
 */
export function saveSettings(settings: Settings): void {
  storage.setSettings(settings);
  const { bodyIndex, turretIndex } = settings.tank;
  storage.setTankColors(
    bodyIndex,
    turretIndex,
    TANK_COLORS[bodyIndex]!,
    TANK_COLORS[turretIndex]!
  );
}

/** Tank colour names for the current selection (for avatars). */
export function tankColorsFrom(selection: TankSelection): {
  body: string;
  turret: string;
} {
  return {
    body: TANK_COLORS[selection.bodyIndex] ?? TANK_COLORS[DEFAULT_TANK_INDEX]!,
    turret:
      TANK_COLORS[selection.turretIndex] ?? TANK_COLORS[DEFAULT_TANK_INDEX]!,
  };
}
