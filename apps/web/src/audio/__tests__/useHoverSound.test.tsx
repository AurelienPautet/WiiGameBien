import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ui } from "../ui";
import { useHoverSound } from "../useHoverSound";

vi.mock("../ui", () => ({ ui: { hover: vi.fn() } }));

function Harness() {
  useHoverSound();
  return (
    <div>
      <button type="button">
        <span>Play</span>
      </button>
      <button type="button" disabled>
        Disabled
      </button>
      <a href="/rankings">Rankings</a>
      <div data-hover-sound="">
        <span>Card</span>
      </div>
      <p>Plain text</p>
    </div>
  );
}

// jsdom has no PointerEvent; a bubbling MouseEvent exercises the same
// delegation path (the hook only special-cases pointerType === "touch").
const pointerOver = (target: Element) =>
  target.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));

describe("useHoverSound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ticks once when entering a control, not for its children", () => {
    render(<Harness />);
    const label = screen.getByText("Play");

    pointerOver(label);
    pointerOver(label);
    pointerOver(label.closest("button")!);

    expect(ui.hover).toHaveBeenCalledTimes(1);
  });

  it("ticks again for each new control", () => {
    render(<Harness />);
    pointerOver(screen.getByText("Play"));
    pointerOver(screen.getByRole("link", { name: "Rankings" }));
    pointerOver(screen.getByText("Card"));

    expect(ui.hover).toHaveBeenCalledTimes(3);
  });

  it("ignores disabled controls and non-interactive text", () => {
    render(<Harness />);
    pointerOver(screen.getByRole("button", { name: "Disabled" }));
    pointerOver(screen.getByText("Plain text"));

    expect(ui.hover).not.toHaveBeenCalled();
  });
});
