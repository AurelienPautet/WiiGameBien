import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import "../../../i18n";
import i18n from "../../../i18n";

const state = vi.hoisted(() => ({
  onlineCount: 0,
  openModal: vi.fn(),
  activeModal: null,
}));
vi.mock("../../../contexts", () => ({
  useAuth: () => ({ user: null }),
  useSocket: () => ({ onlineCount: state.onlineCount, isConnected: true }),
  useModal: () => ({
    openModal: state.openModal,
    activeModal: state.activeModal,
  }),
  MODALS: {
    CAMPAIGN_SELECTOR: "campaignSelector",
    ROOM_SELECTOR: "roomSelector",
    TANK_SELECT: "tankSelect",
  },
}));
vi.mock("../../../hooks/api", () => ({ useRankings: () => ({ data: [] }) }));
vi.mock("../../../audio", () => ({ ui: { click: vi.fn(), hover: vi.fn() } }));

import { LandingPage } from "../LandingPage";

function Home() {
  return (
    <MemoryRouter>
      <MotionConfig reducedMotion="always">
        <LandingPage />
      </MotionConfig>
    </MemoryRouter>
  );
}

beforeEach(async () => {
  state.onlineCount = 0;
  state.openModal.mockClear();
  await i18n.changeLanguage("en");
});

describe("home mode recommendation", () => {
  it.each([0, 1, 99])(
    "features a playable campaign below 100 connected players (%i)",
    (count) => {
      state.onlineCount = count;
      const { container } = render(<Home />);
      expect(
        container.querySelector('[data-featured-mode="campaign"] h2')
          ?.textContent
      ).toBe("Campaign");
      fireEvent.click(
        screen.getByRole("button", { name: "Play", exact: true })
      );
      expect(state.openModal).toHaveBeenCalledWith("campaignSelector");
      // Online remains accessible even when it is not the recommended mode.
      fireEvent.click(screen.getByRole("button", { name: /Multiplayer/ }));
      expect(state.openModal).toHaveBeenCalledWith("roomSelector");
    }
  );

  it("switches at exactly 100 and reacts to live count changes in both directions", () => {
    state.onlineCount = 99;
    const { container, rerender } = render(<Home />);
    state.onlineCount = 100;
    rerender(<Home />);
    expect(
      container.querySelector('[data-featured-mode="online"] h2')?.textContent
    ).toBe("Multiplayer");
    fireEvent.click(screen.getByRole("button", { name: "Play", exact: true }));
    expect(state.openModal).toHaveBeenLastCalledWith("roomSelector");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Campaign One adventure|Campaign Cleared levels/,
      })
    );
    expect(state.openModal).toHaveBeenLastCalledWith("campaignSelector");
    state.onlineCount = 99;
    rerender(<Home />);
    expect(
      container.querySelector('[data-featured-mode="campaign"]')
    ).not.toBeNull();
    expect(container.querySelectorAll(".home-mode-card")).toHaveLength(2);
  });
});
