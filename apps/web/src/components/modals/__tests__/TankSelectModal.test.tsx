import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";

// closeModal must exist before vi.mock's hoisted factory runs.
const { closeModal, setTank } = vi.hoisted(() => ({
  closeModal: vi.fn(),
  setTank: vi.fn(),
}));

// Replace only useModal/useSettings; keep the real ModalProvider so
// renderWithProviders works.
vi.mock("../../../contexts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../contexts")>();
  return {
    ...actual,
    useModal: () => ({
      closeModal,
      openModal: vi.fn(),
      activeModal: null,
      modalData: null,
      isOpen: () => false,
    }),
    useSettings: () => ({
      settings: { tank: { bodyIndex: 1, turretIndex: 1 } },
      setTank,
    }),
  };
});

import { renderWithProviders } from "../../../test/renderWithProviders";
import { TankSelectModal } from "../TankSelectModal";
import { TANK_COLORS } from "../../../constants/tankColors";

describe("TankSelectModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    closeModal.mockClear();
    setTank.mockClear();
  });

  it("renders a dialog with body, turret and paint radio rows", () => {
    renderWithProviders(<TankSelectModal />);
    // Radix renders the dialog into a portal, so scope queries to the dialog.
    const dialog = screen.getByRole("dialog");
    // Three radiogroups: body + turret swatches, plus the owned-paints picker
    // (a fresh garage owns only the free "plain" hull paint).
    expect(dialog.querySelectorAll('[role="radiogroup"]')).toHaveLength(3);
    expect(dialog.querySelectorAll('[role="radio"]')).toHaveLength(
      TANK_COLORS.length * 2 + 1
    );
  });

  it("persists the chosen colours and requests close on save", () => {
    renderWithProviders(<TankSelectModal />);

    // Body swatches come first; pick index 2 (default selection is index 1).
    const swatches = screen
      .getByRole("dialog")
      .querySelectorAll('[role="radio"]');
    fireEvent.click(swatches[2]!);
    // The picked swatch reflects selection through radio semantics.
    expect(swatches[2]!.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(setTank).toHaveBeenCalledWith({ bodyIndex: 2, turretIndex: 1 });
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("closes without persisting on cancel", () => {
    renderWithProviders(<TankSelectModal />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(setTank).not.toHaveBeenCalled();
  });
});
