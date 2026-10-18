import { useRef, useState, useCallback } from "react";

// Max thumb travel from the base centre, in CSS px. The emitted vector is the
// thumb offset divided by this, so it is clamped to magnitude ≤ 1.
const MAX_RADIUS = 56;

// Thumb diameter, in CSS px.
const THUMB_SIZE = 56;

// Where the resting ring sits when `alwaysVisible`, as an inset (CSS px) from
// the zone's own corner — bottom-left for the left stick, bottom-right for the
// right — mirroring the fire button's `bottom-20 right-8` rhythm on the other
// side of the screen.
const REST_INSET_X = 32;
const REST_INSET_Y = 80;

// A press landing within this distance of the resting ring *grabs* it: the base
// stays put (like the fire button's centre-origin drag). Further away the base
// materialises under the finger — the original floating behaviour, kept so the
// player never has to find a fixed stick.
const GRAB_RADIUS = MAX_RADIUS + 16;

// The two parts of the stick: the ring is its base, the thumb is the knob.
const RING_CLASS =
  "absolute rounded-full border-[3px] border-ink/70 bg-white/15";
const THUMB_CLASS = "absolute rounded-full border-[3px] border-ink";

export interface JoystickVector {
  x: number;
  y: number;
}

interface VirtualJoystickProps {
  /** Called with the normalized thumb offset (|v| ≤ 1) on move, null on release. */
  onChange: (vec: JoystickVector | null) => void;
  /** Which screen edge this stick lives against (drives its zone + resting spot). */
  side: "left" | "right";
  /** Accent colour for the thumb (e.g. the player's turret colour). */
  tint?: string;
  ariaLabel?: string;
  /**
   * Keep the stick drawn at a fixed resting spot while it is idle, and grab it
   * from there (the move stick — the player can see where it lives). Off, the
   * stick is invisible until pressed and the base always materialises under the
   * finger (the aim stick, whose zone also holds the fire/mine buttons).
   */
  alwaysVisible?: boolean;
}

/**
 * A floating/dynamic virtual joystick. Without `alwaysVisible` the base
 * materialises wherever the thumb first lands inside its zone, so the player
 * never has to find a fixed stick. With it (the move stick) the ring+thumb are
 * drawn at a fixed resting spot and a press on the ring grabs it there — a
 * press elsewhere in the zone still floats the base under the finger.
 *
 * Built on Pointer Events with per-`pointerId` capture, so multiple sticks +
 * buttons work as independent simultaneous touches. The zone sets
 * `touch-action: none` and the handlers `preventDefault()` so dragging never
 * scrolls/zooms the page or triggers the long-press context menu.
 *
 * It reports a *relative* normalized vector (scale-invariant) rather than an
 * absolute point, so it works unchanged on the CSS-scaled game stage.
 */
export const VirtualJoystick = ({
  onChange,
  side,
  tint = "#ffffff",
  ariaLabel,
  alwaysVisible = false,
}: VirtualJoystickProps) => {
  // The claimed pointer + where it first touched down (relative to the zone box).
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef<JoystickVector>({ x: 0, y: 0 });
  // null while idle; the base origin + current thumb offset while engaged.
  const [base, setBase] = useState<JoystickVector | null>(null);
  const [offset, setOffset] = useState<JoystickVector>({ x: 0, y: 0 });

  // The resting ring's centre, in zone-local px. Fixed to the zone's own
  // corner, so it does not depend on where the thumb first lands.
  const restingCentre = useCallback(
    (rect: Pick<DOMRect, "width" | "height">): JoystickVector => ({
      x:
        side === "left"
          ? REST_INSET_X + MAX_RADIUS
          : rect.width - REST_INSET_X - MAX_RADIUS,
      y: rect.height - REST_INSET_Y - MAX_RADIUS,
    }),
    [side]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== null) return; // already tracking a finger
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // A press on the visible ring grabs the stick (its base stays put);
      // anywhere else in the zone floats the base under the finger.
      const rest = restingCentre(rect);
      const origin =
        alwaysVisible && Math.hypot(x - rest.x, y - rest.y) <= GRAB_RADIUS
          ? rest
          : { x, y };
      originRef.current = origin;
      setBase(origin);
      setOffset({ x: 0, y: 0 });
    },
    [alwaysVisible, restingCentre]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      let dx = e.clientX - rect.left - originRef.current.x;
      let dy = e.clientY - rect.top - originRef.current.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }
      setOffset({ x: dx, y: dy });
      onChange({ x: dx / MAX_RADIUS, y: dy / MAX_RADIUS });
    },
    [onChange]
  );

  const release = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      pointerIdRef.current = null;
      setBase(null);
      setOffset({ x: 0, y: 0 });
      onChange(null);
    },
    [onChange]
  );

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      className={`pointer-events-auto absolute bottom-0 h-[68%] w-[46%] ${
        side === "left" ? "left-0" : "right-0"
      }`}
      style={{ touchAction: "none" }}
    >
      {/* Resting stick — where it lives while idle, so a thumb can find it
          without hunting. Hidden while a drag is in flight (the engaged base
          below is the one the player is looking at). */}
      {alwaysVisible && !base && (
        <>
          <div
            aria-hidden="true"
            className={`${RING_CLASS} opacity-70`}
            style={{
              width: MAX_RADIUS * 2,
              height: MAX_RADIUS * 2,
              ...(side === "left"
                ? { left: REST_INSET_X }
                : { right: REST_INSET_X }),
              bottom: REST_INSET_Y,
            }}
          />
          <div
            aria-hidden="true"
            className={`${THUMB_CLASS} opacity-70`}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              ...(side === "left"
                ? { left: REST_INSET_X + MAX_RADIUS - THUMB_SIZE / 2 }
                : { right: REST_INSET_X + MAX_RADIUS - THUMB_SIZE / 2 }),
              bottom: REST_INSET_Y + MAX_RADIUS - THUMB_SIZE / 2,
              backgroundColor: tint,
            }}
          />
        </>
      )}

      {base && (
        <>
          {/* Base ring (where the thumb landed, or the grabbed resting spot) */}
          <div
            aria-hidden="true"
            className={RING_CLASS}
            style={{
              width: MAX_RADIUS * 2,
              height: MAX_RADIUS * 2,
              left: base.x,
              top: base.y,
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* Thumb */}
          <div
            aria-hidden="true"
            className={THUMB_CLASS}
            style={{
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              left: base.x + offset.x,
              top: base.y + offset.y,
              transform: "translate(-50%, -50%)",
              backgroundColor: tint,
            }}
          />
        </>
      )}
    </div>
  );
};
