import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TouchControls } from "../TouchControls";
import "../../../engine/InputHandler"; // module side effect: window.gameInput

// TouchControls is the thin React layer that translates on-screen gestures into
// the global `window.gameInput` the engine reads. These tests pin that wiring,
// notably the Brawl-Stars-shaped fire button (tap → auto-aim request, drag →
// live aim vector, release → fire) and the always-visible move stick.

const resetInput = () => {
  const input = window.gameInput!;
  input.direction = { x: 0, y: 0 };
  input.aim = { x: 0, y: 0 };
  input.aimVector = null;
  input.click = false;
  input.firing = false;
  input.autoAimFire = false;
  input.plant = false;
  input.escapePressed = false;
};

const mount = (autoFire = false) => {
  resetInput();
  const onPause = vi.fn();
  const view = render(
    <TouchControls autoFire={autoFire} onPause={onPause} color="#ff0000" />
  );
  const fire = view.container.querySelector(
    'button[aria-label="Fire"]'
  ) as HTMLButtonElement;
  return { onPause, fire, ...view };
};

describe("TouchControls", () => {
  it("requests an auto-aimed shot when the fire button is tapped", () => {
    const { fire } = mount();

    fireEvent.pointerDown(fire, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(fire, { pointerId: 1, clientX: 0, clientY: 0 });

    expect(window.gameInput!.autoAimFire).toBe(true);
    expect(window.gameInput!.click).toBe(false);
  });

  it("aims live while dragging the fire button and fires on release", () => {
    const { fire } = mount();

    fireEvent.pointerDown(fire, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(fire, { pointerId: 1, clientX: 50, clientY: 0 });

    // Live turret/reticle tracking: a unit vector to the right.
    expect(window.gameInput!.aimVector).toEqual({ x: 1, y: 0 });
    expect(window.gameInput!.autoAimFire).toBe(false);

    fireEvent.pointerUp(fire, { pointerId: 1, clientX: 50, clientY: 0 });

    // One shot, along the aimed vector — `click` is the engine's fire flag.
    expect(window.gameInput!.click).toBe(true);
    expect(window.gameInput!.aimVector).toEqual({ x: 1, y: 0 });
  });

  it("keeps the fire button available with auto-fire on (stick still autofires)", () => {
    const { fire } = mount(true);

    // The tap path works in both modes; the aim stick is what `autoFire` gates.
    fireEvent.pointerDown(fire, { pointerId: 5, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(fire, { pointerId: 5, clientX: 0, clientY: 0 });
    expect(window.gameInput!.autoAimFire).toBe(true);
  });

  it("maps the move stick to an 8-way direction sign", () => {
    const { container } = mount();
    const moveZone = container.querySelector(
      '[aria-label="Move"]'
    ) as HTMLElement;

    // jsdom rects are all-zero, so the raw client coords are the stick offset.
    fireEvent.pointerDown(moveZone, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(moveZone, {
      pointerId: 1,
      clientX: 60,
      clientY: 100,
    });
    expect(window.gameInput!.direction).toEqual({ x: -1, y: 0 });

    fireEvent.pointerMove(moveZone, {
      pointerId: 1,
      clientX: 140,
      clientY: 100,
    });
    expect(window.gameInput!.direction).toEqual({ x: 1, y: 0 });

    fireEvent.pointerUp(moveZone, { pointerId: 1, clientX: 140, clientY: 100 });
    expect(window.gameInput!.direction).toEqual({ x: 0, y: 0 });
  });

  it("keeps the move stick on screen while idle, and only the move stick", () => {
    const { container } = mount();
    const move = container.querySelector('[aria-label="Move"]') as HTMLElement;
    const aim = container.querySelector(
      '[aria-label="Aim and fire"]'
    ) as HTMLElement;

    // One resting drawing (ring + thumb) on the move zone…
    expect(move.querySelectorAll("div")).toHaveLength(2);
    // …and none on the aim zone, whose area the buttons share.
    expect(aim.querySelectorAll("div")).toHaveLength(0);
  });

  it("clears held state on unmount so the tank doesn't keep firing", () => {
    const { fire, unmount } = mount();

    fireEvent.pointerDown(fire, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(fire, { pointerId: 1, clientX: 40, clientY: 0 });
    unmount();

    const input = window.gameInput!;
    expect(input.aimVector).toBeNull();
    expect(input.firing).toBe(false);
    expect(input.direction).toEqual({ x: 0, y: 0 });
  });
});
