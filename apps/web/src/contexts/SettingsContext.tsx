import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  loadSettings,
  saveSettings,
  normalizeSettings,
  DEFAULT_SETTINGS,
  KEY_PRESETS,
  type Settings,
  type GameAction,
  type EffectSettings,
  type PresetName,
  type TankSelection,
  type TouchControlsMode,
} from "../lib/settings";
import { applyKeyBindings } from "../engine/InputHandler";
import { setSfxVolume, setMusicVolume } from "../audio";
import { settingsApi } from "../api";
import { useAuth } from "./AuthContext";

interface SettingsContextValue {
  settings: Settings;
  setKeybinding: (action: GameAction, code: string) => void;
  applyPreset: (preset: PresetName) => void;
  setEffect: (effect: keyof EffectSettings, value: boolean) => void;
  setVolume: (channel: "sfx" | "music", value: number) => void;
  setTank: (selection: TankSelection) => void;
  setTouchControls: (mode: TouchControlsMode) => void;
  setAutoFire: (value: boolean) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

// Coalesce the stream of changes produced by sliders/rebinds into one write.
// Also keeps the API's per-IP rate limit comfortable during a long tweak session.
const SAVE_DEBOUNCE_MS = 750;

/**
 * Holds the user's settings (keybindings, effects, volumes, tank selection),
 * persists every change to localStorage, and — while signed in — mirrors the
 * whole blob to the player's account so it follows them across devices:
 *
 *   • on login, the account copy wins and is applied locally (a brand-new
 *     account is seeded from the current local settings);
 *   • afterwards every change is written locally immediately and to the API
 *     after a short debounce.
 *
 * Keybindings are pushed into the imperative input layer so a remap takes
 * effect immediately — even mid-game. Effect toggles are applied to the running
 * engine by GameCanvas (which owns the engine ref); they live here only as
 * state + persistence. Anonymous players keep the original localStorage-only
 * behaviour.
 */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const { user } = useAuth();
  const username = user?.username ?? null;

  // Latest settings for the async hydration callback (avoids stale closures).
  const settingsRef = useRef(settings);
  // Username whose account settings have been loaded successfully. Until this
  // matches the signed-in user, changes stay local: uploading the local blob
  // before the server copy is known would overwrite the account with another
  // device's preferences (and with defaults on a fresh install).
  const hydratedUser = useRef<string | null>(null);
  // The settings update triggered by a server hydrate should not be echoed
  // straight back to the server.
  const skipNextRemoteSave = useRef(false);
  const pendingSave = useRef<Settings | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushRemoteSave = useCallback(() => {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingSave.current;
    pendingSave.current = null;
    if (!pending) return;
    // Fire-and-forget: local persistence already succeeded, and a transient
    // API failure must never block gameplay. The next change retries the sync.
    void settingsApi.update({ settings: pending }).catch(() => {});
  }, []);

  const scheduleRemoteSave = useCallback(
    (value: Settings) => {
      pendingSave.current = value;
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushRemoteSave, SAVE_DEBOUNCE_MS);
    },
    [flushRemoteSave]
  );

  // Hydrate from the account whenever the signed-in player changes.
  useEffect(() => {
    if (username === null) {
      hydratedUser.current = null;
      pendingSave.current = null;
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      return;
    }

    let cancelled = false;
    hydratedUser.current = null;

    void settingsApi
      .get()
      .then(({ settings: remote }) => {
        if (cancelled) return;
        hydratedUser.current = username;
        if (remote !== null) {
          skipNextRemoteSave.current = true;
          setSettings(normalizeSettings(remote));
        } else {
          // First save for this account: adopt what this device already has.
          void settingsApi
            .update({ settings: settingsRef.current })
            .catch(() => {});
        }
      })
      .catch(() => {
        // Offline, or a backend that predates account settings. Keep using the
        // local blob; hydratedUser stays null so we never clobber the account.
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // Persist + apply on every change (and on mount, so saved bindings/volumes
  // are live before any game or menu music starts).
  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    applyKeyBindings(settings.keybindings);
    // Push the volume sliders onto the shared audio bus so they apply app-wide
    // (UI sounds + music), even when no game engine is mounted.
    setSfxVolume(settings.sfxVolume);
    setMusicVolume(settings.musicVolume);

    if (username === null || hydratedUser.current !== username) return;
    if (skipNextRemoteSave.current) {
      skipNextRemoteSave.current = false;
      return;
    }
    scheduleRemoteSave(settings);
  }, [settings, username, scheduleRemoteSave]);

  // Don't lose the last edit if the tab is closed/hidden before the debounce.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRemoteSave();
    };
    window.addEventListener("pagehide", flushRemoteSave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushRemoteSave);
      document.removeEventListener("visibilitychange", onHide);
      flushRemoteSave();
    };
  }, [flushRemoteSave]);

  const setKeybinding = useCallback((action: GameAction, code: string) => {
    setSettings((prev) => ({
      ...prev,
      keybindings: { ...prev.keybindings, [action]: code },
    }));
  }, []);

  const applyPreset = useCallback((preset: PresetName) => {
    setSettings((prev) => ({
      ...prev,
      keybindings: { ...KEY_PRESETS[preset] },
    }));
  }, []);

  const setEffect = useCallback(
    (effect: keyof EffectSettings, value: boolean) => {
      setSettings((prev) => ({
        ...prev,
        effects: { ...prev.effects, [effect]: value },
      }));
    },
    []
  );

  const setVolume = useCallback((channel: "sfx" | "music", value: number) => {
    setSettings((prev) => ({
      ...prev,
      [channel === "sfx" ? "sfxVolume" : "musicVolume"]: value,
    }));
  }, []);

  const setTank = useCallback((selection: TankSelection) => {
    setSettings((prev) => ({ ...prev, tank: selection }));
  }, []);

  const setTouchControls = useCallback((mode: TouchControlsMode) => {
    setSettings((prev) => ({ ...prev, touchControls: mode }));
  }, []);

  const setAutoFire = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, autoFire: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(structuredClone(DEFAULT_SETTINGS));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setKeybinding,
      applyPreset,
      setEffect,
      setVolume,
      setTank,
      setTouchControls,
      setAutoFire,
      resetSettings,
    }),
    [
      settings,
      setKeybinding,
      applyPreset,
      setEffect,
      setVolume,
      setTank,
      setTouchControls,
      setAutoFire,
      resetSettings,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
