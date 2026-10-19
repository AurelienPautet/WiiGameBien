import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../../i18n";

const state = vi.hoisted(() => ({
  user: null as { username: string; isAdmin: boolean } | null,
  openModal: vi.fn(),
}));

vi.mock("../../../contexts", () => ({
  useAuth: () => ({ user: state.user }),
  useSocket: () => ({ isConnected: true, onlineCount: 1 }),
  useModal: () => ({ openModal: state.openModal, activeModal: null }),
  MODALS: {
    MY_LEVELS: "myLevels",
    MY_CAMPAIGNS: "myCampaigns",
    SETTINGS: "settings",
    AUTH: "auth",
    PROFILE: "profile",
  },
}));
import { Sidebar } from "../Sidebar";

beforeEach(async () => {
  state.user = null;
  state.openModal.mockClear();
  await i18n.changeLanguage("en");
});

describe("simplified sidebar", () => {
  it("offers login without claiming an account is connected when only the socket is connected", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    const account = screen.getByTitle("Log in");
    expect(within(account).queryByText("Connected")).toBeNull();
    fireEvent.click(account);
    expect(state.openModal).toHaveBeenCalledWith("auth");
  });

  it("identifies the signed-in account and opens its profile", () => {
    state.user = { username: "Pilot", isAdmin: false };
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    const account = screen.getByRole("button", { name: /Pilot/ });
    expect(within(account).getByText("Your profile")).toBeTruthy();
    expect(within(account).queryByText("Connected")).toBeNull();
    fireEvent.click(account);
    expect(state.openModal).toHaveBeenCalledWith("profile");
  });

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
