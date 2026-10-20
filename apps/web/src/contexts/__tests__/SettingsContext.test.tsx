import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEFAULT_SETTINGS } from "../../lib/settings";
import { storage } from "../../lib/storage";
import { SettingsProvider, useSettings } from "../SettingsContext";

// SettingsProvider only needs the signed-in user from auth, and talks to the
// API through settingsApi. Mock both so the sync contract is testable without
// a server. The engine/audio sinks are side effects, not subjects here.
const mocks = vi.hoisted(() => ({
  auth: { user: null as { username: string } | null },
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../AuthContext", () => ({
  useAuth: () => ({ user: mocks.auth.user }),
}));
vi.mock("../../api", () => ({
  settingsApi: { get: mocks.get, update: mocks.update },
}));
vi.mock("../../engine/InputHandler", () => ({
  applyKeyBindings: vi.fn(),
}));
vi.mock("../../audio", () => ({
  setSfxVolume: vi.fn(),
  setMusicVolume: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const renderSettings = () => renderHook(() => useSettings(), { wrapper });

// storage reads window.localStorage at call time; install a fresh in-memory
// fake so persisted state is deterministic.
let store: Record<string, string>;
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

beforeEach(() => {
  mocks.auth.user = null;
  mocks.get.mockReset();
  mocks.update.mockReset();
  mocks.update.mockResolvedValue({ success: true });

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

describe("account hydration", () => {
  it("applies the account settings on login (and persists the tank locally)", async () => {
    mocks.auth.user = { username: "ada" };
    mocks.get.mockResolvedValue({
      settings: {
        ...DEFAULT_SETTINGS,
        musicVolume: 0.05,
        keybindings: { ...DEFAULT_SETTINGS.keybindings, up: "KeyZ" },
        tank: { bodyIndex: 3, turretIndex: 4 },
      },
    });

    const { result } = renderSettings();

    await waitFor(() => expect(result.current.settings.musicVolume).toBe(0.05));
    expect(result.current.settings.keybindings.up).toBe("KeyZ");
    expect(result.current.settings.tank).toEqual({
      bodyIndex: 3,
      turretIndex: 4,
    });
    expect(storage.getBodyIndex()).toBe(3);
    expect(storage.getTurretIndex()).toBe(4);
    // Hydrating must not echo the server copy straight back.
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("seeds a brand-new account with the local settings", async () => {
    storage.setSettings({
      ...DEFAULT_SETTINGS,
      tank: { bodyIndex: 2, turretIndex: 2 },
    });
    mocks.auth.user = { username: "new-player" };
    mocks.get.mockResolvedValue({ settings: null });

    renderSettings();

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          tank: { bodyIndex: 2, turretIndex: 2 },
        }),
      })
    );
  });

  it("does not upload local settings before the account copy is known", async () => {
    // A GET that never settles stands in for a slow/offline server.
    mocks.get.mockReturnValue(new Promise(() => {}));
    mocks.auth.user = { username: "ada" };

    const { result } = renderSettings();
    act(() => result.current.setVolume("music", 0.1));

    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("signed-in changes", () => {
  it("saves a change to the account after the debounce", async () => {
    mocks.auth.user = { username: "ada" };
    mocks.get.mockResolvedValue({ settings: DEFAULT_SETTINGS });

    const { result } = renderSettings();
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());

    act(() => result.current.setVolume("music", 0.25));

    await waitFor(
      () =>
        expect(mocks.update).toHaveBeenCalledWith({
          settings: expect.objectContaining({ musicVolume: 0.25 }),
        }),
      { timeout: 2000 }
    );
  });

  it("never calls the API for anonymous players", async () => {
    mocks.auth.user = null;
    const { result } = renderSettings();

    act(() => result.current.setVolume("music", 0.1));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
