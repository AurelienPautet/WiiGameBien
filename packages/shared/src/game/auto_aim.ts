import type { Room } from "./Room.js";
import type { Player } from "./Player.js";
import type { Vec2 } from "./types.js";

/**
 * Tap-to-fire auto-aim target selection (the Brawl-Stars-style fire button:
 * a quick tap fires at the nearest enemy, a drag fires where you aimed).
 *
 * The choice is deliberately host-side on both paths so it always runs against
 * authoritative positions: the browser resolves it for its local solo room,
 * the API server resolves it for online rooms when a "tock" carries the
 * autoAim flag. Same rule, same result.
 */

// Centre of a combatant's box — the same point the sim's collision and
// CalculateAngle treat as the tank's origin.
function centreOf(player: Player): Vec2 | null {
  const position = player.position;
  const size = player.size;
  if (!position || !size) return null;
  return { x: position.x + size.w / 2, y: position.y + size.h / 2 };
}

/** A human the shooter must not target: coop teammates. */
function isAlly(room: Room, player: Player): boolean {
  // Coop pits every human against the level's bots; in ffa (and solo, which is
  // ffa-shaped) every other combatant is fair game.
  return room.mode === "coop" && !player.is_bot;
}

/**
 * Centre point of the nearest living enemy of `meId`, or null when there is
 * nothing to aim at (no enemies spawned, all dead, or the shooter itself is
 * not on the field yet). Dead and pending-spawn combatants are skipped, and so
 * are allies (coop teammates).
 */
export function nearestEnemyCentre(room: Room, meId: string): Vec2 | null {
  const me = room.players[meId];
  if (!me) return null;
  const from = centreOf(me);
  if (!from) return null;

  let best: Vec2 | null = null;
  let bestDistSq = Infinity;
  for (const id in room.players) {
    if (id === meId) continue;
    const other = room.players[id];
    if (!other || !other.alive || other.pending_spawn) continue;
    if (isAlly(room, other)) continue;
    const target = centreOf(other);
    if (!target) continue;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = target;
    }
  }
  return best;
}
