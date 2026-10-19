import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import i18n from "../../i18n";

const state = vi.hoisted(() => ({
  signedIn: true,
  openModal: vi.fn(),
  startSoloGame: vi.fn(),
  startCampaign: vi.fn(),
  deleteLevel: vi.fn(),
  deleteCampaign: vi.fn(),
}));
vi.mock("../../contexts", () => ({
  useAuth: () => ({
    user: state.signedIn ? { username: "pilot" } : null,
    isLoading: false,
  }),
  useModal: () => ({ openModal: state.openModal }),
  useGame: () => ({ startSoloGame: state.startSoloGame }),
  useToast: () => ({ addToast: vi.fn(), TOAST_TYPES: { ERROR: "error" } }),
  MODALS: { AUTH: "auth" },
}));
vi.mock("../../hooks/api", () => ({
  useDeleteLevel: () => ({ mutate: state.deleteLevel }),
  useDeleteCampaign: () => ({ mutate: state.deleteCampaign }),
}));
vi.mock("../../hooks/useStartCampaign", () => ({
  useStartCampaign: () => ({ start: state.startCampaign }),
}));
vi.mock("../../audio", () => ({
  ui: { click: vi.fn(), hover: vi.fn(), tab: vi.fn() },
}));

type SelectorProps = {
  onCreate?: () => void;
  onEdit?: (id: number) => void;
  onPlay?: (id: number) => void;
  onDelete?: (id: number) => void;
};
vi.mock("../../components/ui", () => ({
  LevelSelector: (props: SelectorProps) => (
    <div data-testid="levels">
      <button onClick={props.onCreate}>Create level</button>
      <button onClick={() => props.onEdit?.(7)}>Edit level</button>
      <button onClick={() => props.onPlay?.(7)}>Play level</button>
    </div>
  ),
  CampaignSelector: (props: SelectorProps) => (
    <div data-testid="campaigns">
      <button onClick={props.onCreate}>Create campaign</button>
      <button onClick={() => props.onEdit?.(9)}>Edit campaign</button>
      <button onClick={() => props.onPlay?.(9)}>Play campaign</button>
      <button onClick={() => props.onDelete?.(9)}>Delete campaign</button>
    </div>
  ),
}));
import { CreationsScreen } from "../CreationsScreen";

function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function renderPage(path = "/creations") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Location />
      <Routes>
        <Route path="/creations" element={<CreationsScreen />} />
        <Route path="*" element={<div>Destination</div>} />
      </Routes>
    </MemoryRouter>
  );
}
beforeEach(async () => {
  vi.clearAllMocks();
  state.signedIn = true;
  state.startCampaign.mockImplementation((_id: number, onStarted: () => void) =>
    onStarted()
  );
  await i18n.changeLanguage("en");
});

describe("My creations", () => {
  it("offers login to guests without mounting the private browsers", () => {
    state.signedIn = false;
    renderPage();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByTestId("levels")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(state.openModal).toHaveBeenCalledWith("auth");
  });

  it("switches between levels and campaigns, keeping the selected tab in the URL", () => {
    renderPage();
    expect(screen.getByTestId("levels")).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Campaigns" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByTestId("campaigns")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe(
      "/creations?tab=campaigns"
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Levels" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByTestId("levels")).toBeTruthy();
  });

  it.each([
    ["/creations", "Create level", "/editor"],
    ["/creations", "Edit level", "/editor?id=7"],
    ["/creations?tab=campaigns", "Create campaign", "/campaign-editor"],
    ["/creations?tab=campaigns", "Edit campaign", "/campaign-editor?id=9"],
  ])(
    "opens the matching editor from %s via %s",
    (path, action, destination) => {
      renderPage(path);
      fireEvent.click(screen.getByRole("button", { name: action }));
      expect(screen.getByTestId("location").textContent).toBe(destination);
    }
  );

  it("opens gameplay at home after selecting one of the player's levels", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Play level" }));
    expect(state.startSoloGame).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("opens gameplay after a campaign starts successfully", () => {
    renderPage("/creations?tab=campaigns");
    fireEvent.click(screen.getByRole("button", { name: "Play campaign" }));
    expect(state.startCampaign).toHaveBeenCalledWith(9, expect.any(Function));
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("keeps campaign deletion cancellable", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage("/creations?tab=campaigns");
    fireEvent.click(screen.getByRole("button", { name: "Delete campaign" }));
    expect(state.deleteCampaign).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete campaign" }));
    expect(state.deleteCampaign).toHaveBeenCalledWith(9, expect.any(Object));
    confirm.mockRestore();
  });
});
