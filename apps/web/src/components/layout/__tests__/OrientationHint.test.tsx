import { describe, it, expect, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { renderWithProviders } from "../../../test/renderWithProviders";
import {
  GameProvider,
  SettingsProvider,
  AuthProvider,
  useGame,
} from "../../../contexts";
import { OrientationHint } from "../OrientationHint";
import { storage } from "../../../lib/storage";
import { DEFAULT_SETTINGS } from "../../../lib/settings";
import type { Settings } from "../../../lib/settings";

// matchMedia is a global mutation (jsdom exists, its matchMedia is a stub that
// matches nothing), so drive orientation/pointer per test and restore after.
const originalMatchMedia = window.matchMedia;

const mockMedia = ({
  portrait,
  coarse = true,
}: {
  portrait: boolean;
  coarse?: boolean;
}) => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("orientation: portrait")
      ? portrait
      : query.includes("pointer: coarse")
        ? coarse
        : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

// A page-level nav + a "start a test game" button, both exercised through the
// real providers: game mode is what turns "/" into a blocking stage route.
const GoTo = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {label}
    </button>
  );
};

const StartTestGame = () => {
  const { startTestGame } = useGame();
  return (
    <button type="button" onClick={() => startTestGame([1, 2, 3])}>
      start-test-game
    </button>
  );
};

const renderHint = (
  path = "/",
  settings: Partial<Settings> = { touchControls: "on" },
  extra?: ReactNode
) => {
  storage.setSettings({ ...DEFAULT_SETTINGS, ...settings });
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <SettingsProvider>
          <GameProvider>
            <OrientationHint />
            {extra}
          </GameProvider>
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

const rotatePrompt = () =>
  screen.queryByText("Rotate your device to landscape");
const continueButton = () =>
  screen.queryByRole("button", { name: "Continue anyway" });

describe("OrientationHint", () => {
  it("asks a portrait phone to rotate, on the responsive pages", () => {
    mockMedia({ portrait: true });
    renderHint("/");
    expect(rotatePrompt()).toBeTruthy();
    expect(continueButton()).toBeTruthy();
  });

  it("stays hidden in landscape", () => {
    mockMedia({ portrait: false });
    renderHint("/");
    expect(rotatePrompt()).toBeNull();
  });

  it("stays hidden on a desktop (no touch controls)", () => {
    mockMedia({ portrait: true, coarse: false });
    renderHint("/", { touchControls: "auto" });
    expect(rotatePrompt()).toBeNull();
  });

  it("can be dismissed per page, and comes back on the other pages", () => {
    mockMedia({ portrait: true });
    renderHint(
      "/",
      undefined,
      <>
        <GoTo to="/levels" label="go-levels" />
        <GoTo to="/" label="go-home" />
      </>
    );

    fireEvent.click(continueButton()!);
    expect(rotatePrompt()).toBeNull();

    // Same hint on the next page, even after dismissing on Home…
    fireEvent.click(screen.getByRole("button", { name: "go-levels" }));
    expect(rotatePrompt()).toBeTruthy();
    expect(continueButton()).toBeTruthy();

    // …and both dismissed pages stay dismissed (a single remembered page would
    // forget Home the moment Levels is dismissed).
    fireEvent.click(continueButton()!);
    fireEvent.click(screen.getByRole("button", { name: "go-home" }));
    expect(rotatePrompt()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "go-levels" }));
    expect(rotatePrompt()).toBeNull();
  });

  it("hard-blocks the editors (no dismiss)", () => {
    mockMedia({ portrait: true });
    renderHint("/editor");
    expect(rotatePrompt()).toBeTruthy();
    expect(continueButton()).toBeNull();
  });

  it("hard-blocks the game once a run starts on /", () => {
    mockMedia({ portrait: true });
    renderHint("/", undefined, <StartTestGame />);
    expect(continueButton()).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "start-test-game" }));
    expect(rotatePrompt()).toBeTruthy();
    expect(continueButton()).toBeNull();
  });
});
