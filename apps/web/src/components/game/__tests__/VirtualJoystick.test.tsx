import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { VirtualJoystick } from "../VirtualJoystick";

// The move stick (`alwaysVisible`) is drawn at a fixed resting spot while idle
// and can be grabbed from there — the base stays put however the finger lands
// on the ring. A press anywhere else in the zone still floats the base under
// the finger, and the aim stick keeps that floating-only behaviour.

// jsdom lays everything out at (0, 0), so pin a realistic zone: the left stick
// on an 852×393 landscape phone (46% × 68% of the window, bottom-left corner).
const ZONE = { left: 0, top: 126, width: 392, height: 267 };
// Ring centre the component computes for that zone: a 32/80 px inset from the
// zone's own corner plus the max thumb travel.
const REST = { x: 32 + 56, y: 267 - 80 - 56 }; // (88, 131) zone-local

const clientX = (localX: number) => ZONE.left + localX;
const clientY = (localY: number) => ZONE.top + localY;

const setup = (alwaysVisible = true, side: "left" | "right" = "left") => {
  const onChange = vi.fn();
  const { container } = render(
    <VirtualJoystick
      side={side}
      onChange={onChange}
      tint="#ff0000"
      ariaLabel="Move"
      alwaysVisible={alwaysVisible}
    />
  );
  const zone = container.querySelector('[aria-label="Move"]') as HTMLElement;
  vi.spyOn(zone, "getBoundingClientRect").mockReturnValue({
    ...ZONE,
    right: ZONE.left + ZONE.width,
    bottom: ZONE.top + ZONE.height,
    x: ZONE.left,
    y: ZONE.top,
    toJSON: () => ({}),
  } as DOMRect);

  // The zone holds at most two decorations: the ring (112 px across) and the
  // thumb (56 px). Resting ones are pinned to the bottom edge, engaged ones to
  // the live origin (top + translate).
  const parts = () => Array.from(zone.querySelectorAll("div"));
  const restingParts = () => parts().filter((el) => el.style.bottom !== "");
  const ring = () => parts().find((el) => el.style.width === "112px")!;

  return { onChange, zone, parts, restingParts, ring };
};

describe("VirtualJoystick", () => {
  it("draws the stick at its resting spot while idle when always visible", () => {
    const { restingParts, ring } = setup();

    expect(restingParts()).toHaveLength(2);
    expect(ring().style.left).toBe("32px");
    expect(ring().style.bottom).toBe("80px");
    expect(ring().style.top).toBe("");

    const thumb = restingParts().find((el) => el.style.width === "56px")!;
    expect(thumb.style.bottom).toBe("108px");
    expect(thumb.style.backgroundColor).toBe("rgb(255, 0, 0)");
  });

  it("stays invisible while idle when not always visible (the aim stick)", () => {
    const { parts } = setup(false);

    expect(parts()).toHaveLength(0);
  });

  it("grabs the resting ring: the base stays put however the finger lands", () => {
    const { onChange, zone, ring } = setup();

    // 40 px right of the ring centre — on the stick, not on its centre.
    fireEvent.pointerDown(zone, {
      pointerId: 1,
      clientX: clientX(REST.x + 40),
      clientY: clientY(REST.y),
    });

    expect(ring().style.left).toBe("88px");
    expect(ring().style.top).toBe("131px");

    // 56 px right of the *ring* centre: the vector is measured from the ring,
    // not from the finger (which would give 16 px, i.e. 0.29).
    fireEvent.pointerMove(zone, {
      pointerId: 1,
      clientX: clientX(REST.x + 56),
      clientY: clientY(REST.y),
    });
    expect(onChange).toHaveBeenLastCalledWith({ x: 1, y: 0 });
  });

  it("floats the base under the finger when the press misses the ring", () => {
    const { onChange, zone, ring, restingParts } = setup();

    fireEvent.pointerDown(zone, {
      pointerId: 1,
      clientX: clientX(300),
      clientY: clientY(40),
    });

    expect(ring().style.left).toBe("300px");
    expect(ring().style.top).toBe("40px");
    // The engaged base replaces the resting drawing while the drag is live.
    expect(restingParts()).toHaveLength(0);

    fireEvent.pointerMove(zone, {
      pointerId: 1,
      clientX: clientX(356),
      clientY: clientY(40),
    });
    expect(onChange).toHaveBeenLastCalledWith({ x: 1, y: 0 });
  });

  it("puts the stick back at rest on release", () => {
    const { onChange, zone, restingParts, ring } = setup();

    fireEvent.pointerDown(zone, {
      pointerId: 1,
      clientX: clientX(REST.x),
      clientY: clientY(REST.y),
    });
    fireEvent.pointerMove(zone, {
      pointerId: 1,
      clientX: clientX(REST.x - 28),
      clientY: clientY(REST.y),
    });
    expect(onChange).toHaveBeenLastCalledWith({ x: -0.5, y: 0 });

    fireEvent.pointerUp(zone, {
      pointerId: 1,
      clientX: clientX(REST.x - 28),
      clientY: clientY(REST.y),
    });

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(restingParts()).toHaveLength(2);
    expect(ring().style.bottom).toBe("80px");
  });

  it("mirrors the resting spot against the right edge for a right stick", () => {
    const { zone, ring, restingParts } = setup(true, "right");

    expect(ring().style.right).toBe("32px");
    expect(ring().style.left).toBe("");
    const thumb = restingParts().find((el) => el.style.width === "56px")!;
    expect(thumb.style.right).toBe("60px");
    expect(thumb.style.left).toBe("");

    // Grab it: the ring centre is now a 32 px inset from the *right* edge.
    fireEvent.pointerDown(zone, {
      pointerId: 1,
      clientX: clientX(ZONE.width - REST.x),
      clientY: clientY(REST.y),
    });
    expect(ring().style.left).toBe(`${ZONE.width - REST.x}px`);
  });
});
