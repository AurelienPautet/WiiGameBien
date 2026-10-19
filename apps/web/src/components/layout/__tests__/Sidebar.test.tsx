import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../../i18n";

vi.mock("../../../contexts", () => ({
  useAuth: () => ({ user: null }),
  useSocket: () => ({ isConnected: true, onlineCount: 1 }),
  useModal: () => ({ openModal: vi.fn(), activeModal: null }),
  MODALS: {
    MY_LEVELS: "myLevels",
    MY_CAMPAIGNS: "myCampaigns",
    SETTINGS: "settings",
  },
}));
import { Sidebar } from "../Sidebar";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("simplified sidebar", () => {
  it("keeps only Home, Rankings, and My creations in the main navigation", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    const links = within(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).getAllByRole("link");
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      "Home",
      "Rankings",
      "My creations",
    ]);
  });

  it.each(["/editor", "/campaign-editor"])(
    "keeps My creations highlighted while editing at %s",
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <Sidebar />
        </MemoryRouter>
      );
      const link = screen.getByRole("link", { name: "My creations" });
      expect(link.classList.contains("is-active")).toBe(true);
      expect(link.getAttribute("href")).toBe(
        path === "/campaign-editor" ? "/creations?tab=campaigns" : "/creations"
      );
    }
  );
});
