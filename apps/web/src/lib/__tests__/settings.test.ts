import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storage } from "../storage";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type Settings,
} from "../settings";
import { TANK_COLORS } from "../../constants/tankColors";

// storage reads window.localStorage at call time; install a fresh in-memory
// fake (jsdom's own localStorage is not reliably writable in this environment).
let store: Record<string, string>;
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

beforeEach(() => {
  store = {};
  const fake = {
    getItem: (k: string) =>
      Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k: string, v: unknown) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
  vi.stubGlobal("localStorage", fake);
  Object.defineProperty(window, "localStorage", {
    value: fake,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalLocalStorage) {
    Object.defineProperty(window, "localStorage", originalLocalStorage);
  }
});

describe("normalizeSettings", () => {
  it("returns the defaults for a missing blob", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a partial blob over the defaults", () => {
    const settings = normalizeSettings({
      musicVolume: 0.1,
      effects: { bloom: false },
      keybindings: { plant: "KeyE" },
    });

    expect(settings.musicVolume).toBe(0.1);
    expect(settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(settings.effects.bloom).toBe(false);
    expect(settings.effects.particles).toBe(DEFAULT_SETTINGS.effects.particles);
    expect(settings.keybindings.plant).toBe("KeyE");
    expect(settings.keybindings.up).toBe(DEFAULT_SETTINGS.keybindings.up);
  });

  it("rejects corrupted values instead of trusting the blob", () => {
    const settings = normalizeSettings({
      sfxVolume: 5,
      musicVolume: -1,
      touchControls: "evil",
      autoFire: "yes",
      keybindings: { up: "" },
      effects: { bloom: "yes", particles: 0 },
      tank: { bodyIndex: 999, turretIndex: -2 },
    } as unknown as Partial<Settings>);

    expect(settings.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(settings.musicVolume).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(settings.touchControls).toBe(DEFAULT_SETTINGS.touchControls);
    expect(settings.autoFire).toBe(DEFAULT_SETTINGS.autoFire);
    expect(settings.keybindings.up).toBe(DEFAULT_SETTINGS.keybindings.up);
    expect(settings.effects.bloom).toBe(DEFAULT_SETTINGS.effects.bloom);
    expect(settings.effects.particles).toBe(DEFAULT_SETTINGS.effects.particles);
    expect(settings.tank).toEqual(DEFAULT_SETTINGS.tank);
  });

  it("seeds the tank from the legacy body/turret keys when the blob predates tank", () => {
    storage.setTankColors(3, 5, TANK_COLORS[3]!, TANK_COLORS[5]!);

    const settings = normalizeSettings({
      musicVolume: 0.2,
      tank: undefined,
    });

    expect(settings.tank).toEqual({ bodyIndex: 3, turretIndex: 5 });
  });
});

describe("loadSettings / saveSettings", () => {
  it("loads the stored blob (forward-safe over defaults)", () => {
    storage.setSettings({ musicVolume: 0.05 });
    expect(loadSettings().musicVolume).toBe(0.05);
  });

  it("persists the tank in both the settings blob and the legacy keys", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      tank: { bodyIndex: 2, turretIndex: 4 },
    };

    saveSettings(settings);

    expect(storage.getSettings<Settings>()).toEqual(settings);
    expect(storage.getBodyIndex()).toBe(2);
    expect(storage.getTurretIndex()).toBe(4);
    expect(window.localStorage.getItem("tank_body_color")).toBe(TANK_COLORS[2]);
    expect(window.localStorage.getItem("tank_turret_color")).toBe(
      TANK_COLORS[4]
    );
  });
});
