// Client-side prediction for the local tank in online play.
//
// The server is authoritative, but rendering our own tank at the same
// interpolation delay as everyone else (≈100 ms + one-way latency) makes the
// controls feel sluggish: every key press moves the tank a beat later. Instead,
// the client advances the local tank immediately with the same `Player.update`
// movement code the server runs, then reconciles with each snapshot:
//
//   1. Each input we send is stamped with a monotonic `seq`.
//   2. The server echoes the newest consumed `seq` on the player as
//      `last_input_seq` (it rides the normal `tick` snapshot).
//   3. On every snapshot we rewind the predicted tank to the authoritative
//      state and replay the inputs the server has not acknowledged yet.
//
// Replaying keeps the prediction exact while inputs are in flight; the residual
// difference (server collision with another tank, a dropped packet, …) is
// smoothed out over a few frames instead of snapping. Teleports (respawn, level
// reload) exceed the smoothing window and snap immediately.
//
// The math here is deliberately side-effect free apart from the predicted
// `Player`, so it can be unit tested without a browser or a socket.

import {
  Player,
  SIM_STEP_S,
  TANK_HULL_RADIUS_FACTOR,
} from "@ouigame/shared/game";
import type { Room } from "@ouigame/shared/game";

/** The subset of a tick-snapshot player the predictor reads. */
export interface PredictionPlayerSnapshot {
  name?: string;
  bodyc?: string;
  turretc?: string;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  alive?: boolean;
  pending_spawn?: boolean;
  mvtspeed?: number;
  angle?: number;
  rotation?: number;
  direction?: { x: number; y: number };
  aim?: { x: number; y: number };
  last_input_seq?: number;
}

/** The current collision world, taken from the newest snapshot. */
export interface PredictionWorld {
  players: Record<string, PredictionPlayerSnapshot>;
  holes: unknown[];
  Bcollision: unknown[];
}

export interface PredictedPose {
  position: { x: number; y: number };
  angle: number;
  rotation: number | undefined;
}

// The movement shape `Player.resolveCollisions` expects from another combatant.
interface CollisionBody {
  position: { x: number; y: number };
  size: { w: number; h: number };
  alive: boolean;
  collisionRadius(): number;
}

interface PendingInput {
  seq: number;
  direction: { x: number; y: number };
  aim: { x: number; y: number };
}

// One-way trip budget for replay. Inputs older than this are assumed lost and
// dropped instead of replaying seconds of movement.
const MAX_PENDING_INPUTS = 90; // 1.5 s at 60 Hz
// Position changes larger than this are teleports (respawn / level reload) and
// must snap rather than slide across the screen.
const TELEPORT_PX = 96;
// Time constant of the visual correction decay after a reconciliation.
const CORRECTION_TAU_MS = 80;

export class LocalPredictor {
  private player: Player | null = null;
  // Collision world rebuilt from the newest snapshot. The predicted player is
  // registered under its own socket id, so `resolveCollisions` skips it as
  // "self" instead of pushing it out of its own last authoritative position.
  private collisionWorld: Room | null = null;
  private pending: PendingInput[] = [];
  private nextSeq = 1;
  private lastAck = 0;
  private smoothX = 0;
  private smoothY = 0;
  private active = false;

  /**
   * Apply one local input step immediately and remember it for replay.
   * Returns the input sequence to stamp on the `tock` packet, or undefined when
   * prediction is not active (no snapshot yet, dead, or waiting to spawn) — in
   * which case the caller still sends the input, just without an ack id.
   */
  advance(
    direction: { x: number; y: number },
    aim: { x: number; y: number }
  ): number | undefined {
    this.decay(SIM_STEP_S * 1000);
    if (!this.player || !this.collisionWorld || !this.active) return undefined;

    const seq = this.nextSeq++;
    const input: PendingInput = {
      seq,
      direction: { x: direction.x, y: direction.y },
      aim: { x: aim.x, y: aim.y },
    };
    this.pending.push(input);
    if (this.pending.length > MAX_PENDING_INPUTS) this.pending.shift();
    this.apply(input);
    return seq;
  }

  /**
   * Fold a new authoritative snapshot into the prediction: rewind to the server
   * state, replay every input it has not acknowledged, and carry the visual
   * difference over as a short-lived smoothing offset.
   */
  reconcile(
    snapshot: PredictionPlayerSnapshot | undefined,
    socketid: string,
    world: PredictionWorld
  ): void {
    if (!snapshot?.position || !snapshot.size) {
      this.reset();
      return;
    }

    const before = this.active ? this.renderPose() : null;
    const ack = snapshot.last_input_seq ?? 0;

    // A large jump between the previous simulated pose and the authoritative
    // one is a teleport (respawn, level reload, rejoin), not a movement
    // correction: replayed inputs from the old position are meaningless.
    const teleported =
      this.player !== null &&
      Math.hypot(
        snapshot.position.x - this.player.position.x,
        snapshot.position.y - this.player.position.y
      ) > TELEPORT_PX;

    if (teleported || ack < this.lastAck) {
      // The server's state restarted (respawn, level reload, rejoin). Inputs
      // from the previous life must not be replayed onto the fresh spawn.
      this.pending = [];
    } else if (ack > 0) {
      // Inputs at or below the ack were already simulated by the server.
      this.pending = this.pending.filter((input) => input.seq > ack);
    }
    const respawned = teleported || ack < this.lastAck;
    this.lastAck = ack;

    if (!this.player || this.player.socketid !== socketid) {
      this.player = new Player(
        { x: snapshot.position.x, y: snapshot.position.y },
        socketid,
        snapshot.name ?? "",
        snapshot.turretc ?? "",
        snapshot.bodyc ?? ""
      );
      this.pending = [];
      this.smoothX = 0;
      this.smoothY = 0;
    }

    this.copyAuthoritative(snapshot);
    this.collisionWorld = this.buildCollisionWorld(world, socketid);

    // Walk forward from the server's state through everything still in flight.
    for (const input of this.pending) this.apply(input);

    this.active = this.player.alive && !this.player.pending_spawn;
    if (!this.active) {
      // Dead or waiting to spawn: movement inputs are not being simulated, so
      // don't accumulate a replay backlog for the next life.
      this.pending = [];
      this.smoothX = 0;
      this.smoothY = 0;
      return;
    }

    if (before) {
      const dx = before.position.x - this.player.position.x;
      const dy = before.position.y - this.player.position.y;
      if (respawned || Math.hypot(dx, dy) > TELEPORT_PX) {
        // Respawn/level reload: the old pose is meaningless, show the new one.
        this.smoothX = 0;
        this.smoothY = 0;
      } else {
        // Keep the pixels where they were and let them glide to the corrected
        // simulation pose, so a small reconciliation never reads as a twitch.
        this.smoothX = dx;
        this.smoothY = dy;
      }
    }
  }

  /** The pose to draw for the local tank, including the smoothing offset. */
  renderPose(): PredictedPose | null {
    if (!this.player || !this.active) return null;
    return {
      position: {
        x: this.player.position.x + this.smoothX,
        y: this.player.position.y + this.smoothY,
      },
      angle: this.player.angle,
      rotation: this.player.rotation,
    };
  }

  /** Forget the current prediction (level change, teardown, failed join). */
  reset(): void {
    this.player = null;
    this.collisionWorld = null;
    this.pending = [];
    this.lastAck = 0;
    this.smoothX = 0;
    this.smoothY = 0;
    this.active = false;
  }

  // Exponential decay of the visual correction offset.
  private decay(dtMs: number): void {
    if (this.smoothX === 0 && this.smoothY === 0) return;
    const factor = Math.exp(-Math.max(0, dtMs) / CORRECTION_TAU_MS);
    this.smoothX *= factor;
    this.smoothY *= factor;
    if (Math.abs(this.smoothX) < 0.05) this.smoothX = 0;
    if (Math.abs(this.smoothY) < 0.05) this.smoothY = 0;
  }

  // Run one input through the shared movement integrator (velocity, bounds,
  // collision) so prediction matches the server's simulation exactly.
  private apply(input: PendingInput): void {
    const player = this.player;
    if (!player || !this.collisionWorld) return;
    player.direction = { x: input.direction.x, y: input.direction.y };
    player.aim = { x: input.aim.x, y: input.aim.y };
    player.update(this.collisionWorld, SIM_STEP_S);
  }

  // Overwrite the predicted tank with the authoritative movement state. Only
  // fields `Player.update` reads (plus the drawn pose) are touched — the rest
  // (scores, colours) stays whatever the snapshot says at render time.
  private copyAuthoritative(snapshot: PredictionPlayerSnapshot): void {
    const player = this.player!;
    const position = snapshot.position!;
    const size = snapshot.size!;

    player.position.x = position.x;
    player.position.y = position.y;
    player.size.w = size.w;
    player.size.h = size.h;
    player.alive = snapshot.alive !== false;
    player.pending_spawn = snapshot.pending_spawn === true;
    if (typeof snapshot.mvtspeed === "number") {
      player.mvtspeed = snapshot.mvtspeed;
    }
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.angle = snapshot.angle ?? 0;
    if (snapshot.rotation !== undefined) player.rotation = snapshot.rotation;
    if (snapshot.direction) player.direction = { ...snapshot.direction };
    if (snapshot.aim) player.aim = { ...snapshot.aim };
  }

  // Build a Room-shaped collision view: the predicted tank itself plus every
  // other live combatant wrapped with the `collisionRadius()` hull helper (the
  // server's Player instances have it; snapshot players are plain objects).
  private buildCollisionWorld(world: PredictionWorld, socketid: string): Room {
    const players: Record<string, CollisionBody> = {};
    for (const id in world.players) {
      if (id === socketid) continue;
      const other = world.players[id];
      if (!other || !other.position || !other.size || other.alive === false) {
        continue;
      }
      players[id] = {
        position: other.position,
        size: other.size,
        alive: true,
        collisionRadius() {
          return Math.min(this.size.w, this.size.h) * TANK_HULL_RADIUS_FACTOR;
        },
      };
    }
    players[socketid] = this.player!;

    return {
      players,
      holes: world.holes,
      Bcollision: world.Bcollision,
    } as unknown as Room;
  }
}
