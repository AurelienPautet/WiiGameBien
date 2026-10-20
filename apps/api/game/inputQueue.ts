// Per-socket input queue for the authoritative loop.
//
// The browser samples input at a fixed 60 Hz and stamps each packet with a
// monotonically increasing `seq`. Packets do not arrive at exactly 60 Hz —
// TCP delivers them in bursts and lulls — so applying every packet the moment
// it lands makes the tank jerk forward and stall by a few frames. Instead the
// socket handler enqueues each packet and the tick loop consumes at most ONE
// input per player per simulation step. The simulation therefore always moves
// in whole steps, and the snapshot's `last_input_seq` names the exact input the
// authoritative state corresponds to. That 1:1 mapping is what makes the
// client's prediction replay valid.
//
// Older clients send no `seq` and keep the historical immediate-apply path in
// the socket handler.
//
// The queue lives outside the Player object on purpose: the whole Player is
// serialized into every tick snapshot, and a backlog of inputs must never ride
// the wire.

import { nearestEnemyCentre } from "@ouigame/shared/game";
import type { Player, Room } from "@ouigame/shared/game";

// Backlog cap. At 60 Hz this is ~100 ms of queued input: enough to absorb a
// burst without adding noticeable latency, small enough that a client which
// transiently outruns the server cannot pin a permanent delay onto controls.
// The oldest packets go first — a newer packet already carries the latest
// direction/aim state.
const MAX_QUEUED_INPUTS = 6;

export interface QueuedInput {
  /** Client input sequence, echoed back as `player.last_input_seq`. */
  seq: number;
  mytick?: number;
  direction?: { x: number; y: number };
  aim?: { x: number; y: number };
  plant?: boolean;
  click?: boolean;
  autoAim?: boolean;
}

const queues = new Map<string, QueuedInput[]>();

/** Queue one validated input for the next simulation tick. */
export function enqueueInput(socketid: string, input: QueuedInput): void {
  const queue = queues.get(socketid);
  if (!queue) {
    queues.set(socketid, [input]);
    return;
  }
  if (queue.length >= MAX_QUEUED_INPUTS) queue.shift();
  queue.push(input);
}

/** Number of queued inputs (tests + diagnostics). */
export function queuedInputCount(socketid: string): number {
  return queues.get(socketid)?.length ?? 0;
}

/** Drop everything pending for a player (quit, disconnect, countdown freeze). */
export function clearInputQueue(socketid: string): void {
  queues.delete(socketid);
}

/**
 * Consume the oldest queued input for `socketid` and apply it to the player.
 * Returns true when an input was applied.
 */
export function applyQueuedInput(room: Room, socketid: string): boolean {
  const queue = queues.get(socketid);
  const input = queue?.shift();
  if (!queue || !input) return false;
  if (queue.length === 0) queues.delete(socketid);

  const player = room.players[socketid];
  if (!player || player.position === undefined) return false;

  applyPlayerInput(room, player, socketid, input);
  return true;
}

// Apply one input packet to the player. Split out so the legacy (no-`seq`)
// socket path and the tick-loop queue path share exactly the same semantics.
export function applyPlayerInput(
  room: Room,
  player: Player,
  socketid: string,
  input: {
    mytick?: number;
    direction?: { x: number; y: number };
    aim?: { x: number; y: number };
    plant?: boolean;
    click?: boolean;
    autoAim?: boolean;
    seq?: number;
  }
): void {
  if (input.mytick !== undefined && Number.isFinite(input.mytick)) {
    player.mytick = input.mytick;
  }
  // Only ever advance the ack: a late or reordered packet must not rewind the
  // point the client replays from.
  if (
    input.seq !== undefined &&
    Number.isFinite(input.seq) &&
    input.seq > player.last_input_seq
  ) {
    player.last_input_seq = input.seq;
  }
  if (input.direction !== undefined) player.direction = input.direction;
  if (input.aim !== undefined) player.aim = input.aim;
  // Tap-to-fire (touch fire button): aim at the nearest enemy ourselves rather
  // than trusting the sent `aim` — the server holds the true positions, and
  // the coop ally rule lives in the shared helper.
  if (input.autoAim === true) {
    const target = nearestEnemyCentre(room, socketid);
    if (target) player.aim = target;
  }
  if (input.click === true || input.autoAim === true) {
    // `aim` may have just been re-pointed by this same packet (auto-aim, or a
    // click whose aim arrived with it); refresh the barrel angle so the bullet
    // leaves along it instead of last tick's aim.
    player.CalculateAngle();
    player.shoot(room);
  }
  if (input.plant === true) player.plant(room);
}
