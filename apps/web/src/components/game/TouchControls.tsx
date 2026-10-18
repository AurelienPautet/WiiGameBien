import { useCallback, useEffect } from "react";
import { Bomb, Pause } from "lucide-react";
import { FireButton } from "./FireButton";
import { VirtualJoystick, type JoystickVector } from "./VirtualJoystick";

// Deadzones (as a fraction of full stick travel). The move stick maps to 8-way
// signs like the keyboard; the aim stick needs a slightly larger neutral so the
// turret angle doesn't jitter near centre.
const MOVE_DEADZONE = 0.3;
const AIM_DEADZONE = 0.25;

interface TouchControlsProps {
  /** Hold the aim stick to fire continuously (off = the stick only aims). */
  autoFire: boolean;
  /** Open/close the pause menu (shares the engine's pause path). */
  onPause: () => void;
  /** Accent colour (player's turret colour) for the sticks/buttons. */
  color: string;
}

/**
 * On-screen twin-stick controls for touch play. It writes intent straight into
 * the global `window.gameInput` the engine already reads — the move stick
 * drives `direction`, the aim stick drives `aimVector` (+ held `firing` when
 * auto-fire is on), the fire button drives `autoAimFire` / `aimVector` /
 * `click`, and the buttons set `plant` / pause. The simulation is untouched;
 * the engine resolves `aimVector` (and the fire button's auto-aim tap) into the
 * absolute `aim` it expects.
 *
 * Both sticks are Brawl-Stars-shaped. The fire button: tap to shoot the nearest
 * enemy, drag to aim and release to shoot that way (see FireButton). The move
 * stick: always drawn at a fixed resting spot, so it can be grabbed from there,
 * while a press anywhere else in its zone still floats the base under the
 * finger (see VirtualJoystick's `alwaysVisible`).
 */
export const TouchControls = ({
  autoFire,
  onPause,
  color,
}: TouchControlsProps) => {
  // Left stick → 8-way movement sign (matches keyboard semantics).
  const onMove = useCallback((vec: JoystickVector | null) => {
    const input = window.gameInput;
    if (!input) return;
    if (!vec) {
      input.direction = { x: 0, y: 0 };
      return;
    }
    input.direction = {
      x: Math.abs(vec.x) > MOVE_DEADZONE ? Math.sign(vec.x) : 0,
      y: Math.abs(vec.y) > MOVE_DEADZONE ? Math.sign(vec.y) : 0,
    };
  }, []);

  // Right stick → aim direction (+ auto-fire while actively aimed).
  const onAim = useCallback(
    (vec: JoystickVector | null) => {
      const input = window.gameInput;
      if (!input) return;
      // Released, or inside the neutral zone: stop firing but keep the last
      // facing so the turret holds its aim.
      if (!vec) {
        input.firing = false;
        return;
      }
      const dist = Math.hypot(vec.x, vec.y);
      if (dist < AIM_DEADZONE) {
        input.firing = false;
        return;
      }
      input.aimVector = { x: vec.x / dist, y: vec.y / dist };
      input.firing = autoFire;
    },
    [autoFire]
  );

  // Reset any held state when the controls unmount (overlay up / quit) so the
  // tank doesn't keep moving/firing on the stale global.
  useEffect(() => {
    return () => {
      const input = window.gameInput;
      if (!input) return;
      input.direction = { x: 0, y: 0 };
      input.firing = false;
      input.aimVector = null;
    };
  }, []);

  const plant = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (window.gameInput) window.gameInput.plant = true;
  }, []);

  // Fire button. The tap just *requests* an auto-aimed shot: the target is
  // picked where the true enemy positions live (the local room in solo, the
  // server when online). The drag reports the direction live so the turret and
  // reticle follow the finger, and the release fires one shot that way.
  const fireAtNearest = useCallback(() => {
    if (window.gameInput) window.gameInput.autoAimFire = true;
  }, []);

  const aimFromDrag = useCallback((dir: JoystickVector) => {
    if (window.gameInput) window.gameInput.aimVector = dir;
  }, []);

  const fireAlongAim = useCallback(() => {
    if (window.gameInput) window.gameInput.click = true;
  }, []);

  const btn =
    "pointer-events-auto absolute flex items-center justify-center rounded-full border-4 border-ink text-white shadow-btn active:translate-y-1 active:shadow-none select-none";

  return (
    <div className="absolute inset-0 z-30" style={{ touchAction: "none" }}>
      {/* Move — always visible at rest: press its ring to grab it from there,
          press anywhere else in the zone to float the base under the finger */}
      <VirtualJoystick
        side="left"
        onChange={onMove}
        tint={color}
        ariaLabel="Move"
        alwaysVisible
      />
      <VirtualJoystick
        side="right"
        onChange={onAim}
        tint={color}
        ariaLabel="Aim and fire"
      />

      {/* Pause */}
      <button
        type="button"
        onClick={onPause}
        className={`${btn} top-4 right-4 h-12 w-12 bg-ink/80`}
        aria-label="Pause"
      >
        <Pause className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Plant mine */}
      <button
        type="button"
        onPointerDown={plant}
        className={`${btn} bottom-44 right-8 h-16 w-16 bg-yellow text-ink`}
        aria-label="Plant mine"
      >
        <Bomb className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {/* Fire — tap for the nearest enemy, drag to aim and release to shoot */}
      <FireButton
        tint={color}
        onTapFire={fireAtNearest}
        onAim={aimFromDrag}
        onAimedFire={fireAlongAim}
      />
    </div>
  );
};
