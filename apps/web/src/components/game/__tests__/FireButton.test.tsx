import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { FireButton } from "../FireButton";

// The Brawl-Stars-style fire button: a bare tap fires at the nearest enemy
// (requested via onTapFire), while a drag reports the aim live and fires along
// the released direction (onAim + onAimedFire).

// jsdom lays everything out at (0, 0), so pin a realistic rect: an 80px button
// whose centre (the drag origin) sits at (740, 540).
const BUTTON_CX = 740;
const BUTTON_CY = 540;

const makeHandlers = () => ({
  onTapFire: vi.fn(),
  onAim: vi.fn(),
  onAimedFire: vi.fn(),
});

const setup = () => {
  const handlers = makeHandlers();
  const { container } = render(<FireButton tint="#ff0000" {...handlers} />);
  const button = container.querySelector("button")!;
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
    left: BUTTON_CX - 40,
    top: BUTTON_CY - 40,
    width: 80,
    height: 80,
    right: BUTTON_CX + 40,
    bottom: BUTTON_CY + 40,
    x: BUTTON_CX - 40,
    y: BUTTON_CY - 40,
    toJSON: () => ({}),
  } as DOMRect);
  return { ...handlers, button };
};

describe("FireButton", () => {
  it("fires at the nearest enemy on a bare tap", () => {
    const { button, onTapFire, onAim, onAimedFire } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });

    expect(onTapFire).toHaveBeenCalledTimes(1);
    expect(onAim).not.toHaveBeenCalled();
    expect(onAimedFire).not.toHaveBeenCalled();
  });

  it("treats a jittery press inside the drag threshold as a tap", () => {
    const { button, onTapFire, onAim, onAimedFire } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    // 5px of travel — under the 14px threshold.
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 3,
      clientY: BUTTON_CY + 4,
    });
    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 3,
      clientY: BUTTON_CY + 4,
    });

    expect(onTapFire).toHaveBeenCalledTimes(1);
    expect(onAim).not.toHaveBeenCalled();
    expect(onAimedFire).not.toHaveBeenCalled();
  });

  it("reports the live aim while dragging and fires that way on release", () => {
    const { button, onTapFire, onAim, onAimedFire } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY - 30,
    });

    expect(onAim).toHaveBeenCalledTimes(1);
    const dir = onAim.mock.calls[0]![0] as { x: number; y: number };
    expect(dir.x).toBeCloseTo(0);
    expect(dir.y).toBeCloseTo(-1);
    expect(onAimedFire).not.toHaveBeenCalled(); // not yet — release fires

    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY - 30,
    });

    expect(onAimedFire).toHaveBeenCalledTimes(1);
    expect(onTapFire).not.toHaveBeenCalled();
  });

  it("normalizes diagonal drags to a unit direction", () => {
    const { button, onAim } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 30,
      clientY: BUTTON_CY + 40,
    });

    const dir = onAim.mock.calls[0]![0] as { x: number; y: number };
    expect(dir.x).toBeCloseTo(0.6);
    expect(dir.y).toBeCloseTo(0.8);
    expect(Math.hypot(dir.x, dir.y)).toBeCloseTo(1);
  });

  it("fires the last aimed direction when the finger returns to the centre", () => {
    const { button, onAim, onAimedFire, onTapFire } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 40,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 2,
      clientY: BUTTON_CY,
    }); // back in
    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX + 2,
      clientY: BUTTON_CY,
    });

    const lastDir = onAim.mock.calls.at(-1)![0] as { x: number; y: number };
    expect(lastDir.x).toBeCloseTo(1);
    expect(lastDir.y).toBeCloseTo(0);
    expect(onAimedFire).toHaveBeenCalledTimes(1);
    expect(onTapFire).not.toHaveBeenCalled();
  });

  it("drops the gesture without firing when the OS cancels it", () => {
    const { button, onTapFire, onAimedFire } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY - 40,
    });
    fireEvent.pointerCancel(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY - 40,
    });

    expect(onTapFire).not.toHaveBeenCalled();
    expect(onAimedFire).not.toHaveBeenCalled();
  });

  it("ignores a second concurrent pointer", () => {
    const { button, onTapFire, onAim } = setup();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerDown(button, {
      pointerId: 2,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerMove(button, {
      pointerId: 2,
      clientX: BUTTON_CX + 60,
      clientY: BUTTON_CY,
    });
    fireEvent.pointerUp(button, {
      pointerId: 2,
      clientX: BUTTON_CX + 60,
      clientY: BUTTON_CY,
    });

    // The second press is ignored; the first is still tracked and un-released.
    expect(onAim).not.toHaveBeenCalled();
    expect(onTapFire).not.toHaveBeenCalled();

    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    expect(onTapFire).toHaveBeenCalledTimes(1);
  });

  it("keeps the desktop click-to-shoot listener out of its own gesture", () => {
    const { button } = setup();
    // Desktop play fires on any left mousedown on the page (InputHandler's
    // global listener). A mouse press on the button must not reach it, or the
    // tap would also shoot along the pointer aim.
    const onGlobalMouseDown = vi.fn();
    window.addEventListener("mousedown", onGlobalMouseDown);
    try {
      fireEvent.mouseDown(button, { button: 0 });
    } finally {
      window.removeEventListener("mousedown", onGlobalMouseDown);
    }

    expect(onGlobalMouseDown).not.toHaveBeenCalled();
  });

  it("shows the aim indicator only while a gesture is in flight", () => {
    const { button } = setup();

    expect(button.querySelector("span")).toBeNull();

    fireEvent.pointerDown(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    expect(button.querySelector("span")).not.toBeNull();

    fireEvent.pointerUp(button, {
      pointerId: 1,
      clientX: BUTTON_CX,
      clientY: BUTTON_CY,
    });
    expect(button.querySelector("span")).toBeNull();
  });
});
