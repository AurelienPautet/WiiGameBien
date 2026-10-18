import { useCallback, useRef, useState } from "react";
import { Crosshair } from "lucide-react";
import type { JoystickVector } from "./VirtualJoystick";

// A press whose travel stays under this many CSS px is a *tap* (fire at the
// nearest enemy); past it the gesture becomes an aimed shot that fires along
// the drag direction on release.
const DRAG_THRESHOLD = 14;

// Finger travel at which the direction is locked in and the indicator stops
// moving outward. Only the visual is capped — the reported direction is exact.
const MAX_RADIUS = 56;

// Button box (square, in CSS px). Kept in JSX state-free constants so the
// indicator geometry below always matches the rendered size.
const SIZE = 80;
const CENTER = SIZE / 2;

interface FireButtonProps {
  /** Accent colour (the player's turret colour) for the aim indicator. */
  tint: string;
  /** Quick tap: fire at the nearest enemy (the engine resolves the target). */
  onTapFire: () => void;
  /** Live aim while dragging: normalized direction (|v| = 1). */
  onAim: (dir: JoystickVector) => void;
  /** Released after dragging: fire along the last aimed direction. */
  onAimedFire: () => void;
}

/**
 * Brawl-Stars-style fire button. Tap it and the shot goes at the nearest
 * enemy; press, drag and release and the shot goes wherever you aimed. While
 * dragging, the button reports the direction live (so the turret and on-screen
 * reticle follow the finger) and a small indicator inside the button tracks the
 * drag; the shot itself is sent on release.
 *
 * Built on Pointer Events with per-`pointerId` capture (like VirtualJoystick),
 * so it can be used simultaneously with both sticks. A gesture is one press:
 * `pointercancel` (an OS-level interruption) drops it without firing.
 */
export const FireButton = ({
  tint,
  onTapFire,
  onAim,
  onAimedFire,
}: FireButtonProps) => {
  // The claimed pointer, the button centre it was pressed on, and the last
  // direction the finger aimed (null until the gesture travels past the tap
  // threshold — that flag is what decides tap vs aimed shot on release).
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef<JoystickVector>({ x: 0, y: 0 });
  const lastDirRef = useRef<JoystickVector | null>(null);
  // Finger offset (clamped to MAX_RADIUS) for the in-button indicator, or null
  // while no gesture is in flight.
  const [offset, setOffset] = useState<JoystickVector | null>(null);
  // True once the gesture has travelled past the tap threshold; drives the
  // "release to fire" highlight.
  const [armed, setArmed] = useState(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerIdRef.current !== null) return; // already tracking a finger
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
      // The drag origin is the button's centre (not where the finger landed),
      // so the aim is predictable however the button is grabbed.
      const rect = e.currentTarget.getBoundingClientRect();
      originRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      lastDirRef.current = null;
      setOffset({ x: 0, y: 0 });
      setArmed(false);
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      e.preventDefault();
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        setOffset({ x: (dx / dist) * MAX_RADIUS, y: (dy / dist) * MAX_RADIUS });
      } else {
        setOffset({ x: dx, y: dy });
      }
      if (dist >= DRAG_THRESHOLD) {
        const dir = { x: dx / dist, y: dy / dist };
        lastDirRef.current = dir;
        setArmed(true);
        onAim(dir);
      }
    },
    [onAim]
  );

  const release = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      if (e.pointerId !== pointerIdRef.current) return;
      pointerIdRef.current = null;
      setOffset(null);
      setArmed(false);
      const dir = lastDirRef.current;
      lastDirRef.current = null;
      if (cancelled) return;
      if (dir) {
        // Aimed shot: make sure the very last direction is the one fired.
        onAim(dir);
        onAimedFire();
      } else {
        // Bare tap: fire at the nearest enemy.
        onTapFire();
      }
    },
    [onAim, onAimedFire, onTapFire]
  );

  return (
    <div
      className="pointer-events-none absolute bottom-20 right-8"
      style={{ width: SIZE, height: SIZE }}
    >
      <button
        type="button"
        aria-label="Fire"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
        // Desktop play treats *any* left mousedown on the page as a shot (the
        // InputHandler's global listener), which would add a second shot aimed
        // at the pointer on top of this button's own one. Swallow it, so a mouse
        // click here is a tap and a mouse drag is an aimed shot like a touch.
        onMouseDown={(e) => e.stopPropagation()}
        className={`pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full border-4 border-ink text-white shadow-btn select-none ${
          armed
            ? "bg-red brightness-110"
            : "bg-red active:translate-y-1 active:shadow-none"
        }`}
        style={{ touchAction: "none" }}
      >
        <Crosshair className="h-9 w-9" strokeWidth={2.5} />
        {/* Aim indicator: sits at the finger's offset from the button centre
            and takes the accent colour once the gesture is an aimed shot. */}
        {offset && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border-[3px] border-ink"
            style={{
              width: 22,
              height: 22,
              left: CENTER + offset.x,
              top: CENTER + offset.y,
              transform: "translate(-50%, -50%)",
              backgroundColor: armed ? tint : "#ffffff",
            }}
          />
        )}
      </button>
    </div>
  );
};
