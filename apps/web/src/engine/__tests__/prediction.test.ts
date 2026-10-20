import { describe, expect, it } from "vitest";
import {
  LocalPredictor,
  type PredictionPlayerSnapshot,
  type PredictionWorld,
} from "../prediction.js";

const STEP_MS = 1000 / 60;

function player(
  overrides: Partial<PredictionPlayerSnapshot> = {}
): PredictionPlayerSnapshot {
  return {
    name: "me",
    position: { x: 100, y: 100 },
    size: { w: 45, h: 45 },
    alive: true,
    mvtspeed: 180,
    angle: 0,
    direction: { x: 0, y: 0 },
    aim: { x: 100, y: 100 },
    last_input_seq: 0,
    ...overrides,
  };
}

function world(overrides: Partial<PredictionWorld> = {}): PredictionWorld {
  return { players: {}, holes: [], Bcollision: [], ...overrides };
}

function move(predictor: LocalPredictor, x: number, y: number, steps: number) {
  let lastSeq: number | undefined;
  for (let i = 0; i < steps; i++) {
    lastSeq = predictor.advance({ x, y }, { x: 100, y: 100 });
  }
  return lastSeq;
}

describe("LocalPredictor", () => {
  it("does nothing until it has an authoritative snapshot", () => {
    const predictor = new LocalPredictor();
    expect(predictor.renderPose()).toBeNull();
    expect(predictor.advance({ x: 1, y: 0 }, { x: 0, y: 0 })).toBeUndefined();
  });

  it("moves immediately, one input sequence per simulation step", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());

    const first = predictor.advance({ x: 1, y: 0 }, { x: 100, y: 100 });
    const second = predictor.advance({ x: 1, y: 0 }, { x: 100, y: 100 });
    expect(first).toBe(1);
    expect(second).toBe(2);

    for (let i = 0; i < 4; i++) {
      predictor.advance({ x: 1, y: 0 }, { x: 100, y: 100 });
    }
    // 6 steps at 180 px/s (3 px per step).
    expect(predictor.renderPose()?.position.x).toBeCloseTo(118, 5);
  });

  it("replays inputs the server has not acknowledged yet", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());

    move(predictor, 1, 0, 9); // predicted x = 127, seqs 1..9
    // The server only consumed seq 1..6 (x = 118) — the last three are still in
    // flight. Rewinding and replaying them must land back on 127.
    predictor.reconcile(
      player({ position: { x: 118, y: 100 }, last_input_seq: 6 }),
      "me",
      world()
    );

    expect(predictor.renderPose()?.position.x).toBeCloseTo(127, 5);
  });

  it("smooths a small reconciliation instead of snapping", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());
    move(predictor, 1, 0, 9); // drawn at x = 127

    // Server saw a different position for the acked step: replaying 7..9 from
    // 114 gives 123, a 4 px correction.
    predictor.reconcile(
      player({ position: { x: 114, y: 100 }, last_input_seq: 6 }),
      "me",
      world()
    );
    // The rendered pose stays put this frame...
    expect(predictor.renderPose()?.position.x).toBeCloseTo(127, 5);

    // ...and glides to the corrected pose over the next few frames.
    move(predictor, 0, 0, 12);
    expect(predictor.renderPose()?.position.x).toBeCloseTo(123, 0);
  });

  it("snaps on a teleport (respawn) instead of sliding across the map", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());
    move(predictor, 1, 0, 9);

    predictor.reconcile(
      player({ position: { x: 500, y: 400 }, last_input_seq: 0 }),
      "me",
      world()
    );
    expect(predictor.renderPose()?.position).toEqual({ x: 500, y: 400 });
  });

  it("drops the replay backlog when the server resets the input ack", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());
    move(predictor, 1, 0, 9); // seqs 1..9 pending
    // Acked at 9, then the player respawns: the new authority reports ack 0 and
    // the spawn position. Old inputs must not move the fresh tank.
    predictor.reconcile(
      player({ position: { x: 127, y: 100 }, last_input_seq: 9 }),
      "me",
      world()
    );
    predictor.reconcile(
      player({ position: { x: 50, y: 50 }, last_input_seq: 0 }),
      "me",
      world()
    );
    expect(predictor.renderPose()?.position).toEqual({ x: 50, y: 50 });
  });

  it("stops predicting while dead or waiting to spawn", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player({ alive: false }), "me", world());
    expect(predictor.renderPose()).toBeNull();
    expect(predictor.advance({ x: 1, y: 0 }, { x: 0, y: 0 })).toBeUndefined();

    predictor.reconcile(player({ pending_spawn: true }), "me", world());
    expect(predictor.renderPose()).toBeNull();
  });

  it("keeps the predicted tank inside the arena bounds", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player({ position: { x: 60, y: 100 } }), "me", world());
    move(predictor, -1, 0, 60); // 180 px/s for 60 steps would be 180 px
    expect(predictor.renderPose()!.position.x).toBeGreaterThanOrEqual(50);
    expect(predictor.renderPose()!.position.x).toBeLessThan(52);
  });

  it("does not collide with its own authoritative snapshot position", () => {
    const predictor = new LocalPredictor();
    // World contains a stale authoritative copy far behind the predicted tank;
    // it must be ignored, otherwise the tank gets pushed towards the ghost.
    predictor.reconcile(
      player({ position: { x: 200, y: 100 }, last_input_seq: 0 }),
      "me",
      world({ players: { me: player({ position: { x: 100, y: 100 } }) } })
    );
    move(predictor, 1, 0, 3);
    expect(predictor.renderPose()?.position.x).toBeCloseTo(209, 5);
  });

  it("uses other live tanks as collision bodies", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player({ position: { x: 100, y: 100 } }), "me", {
      players: {
        enemy: player({
          position: { x: 160, y: 100 },
          size: { w: 45, h: 45 },
        }),
      },
      holes: [],
      Bcollision: [],
    });
    // Drive straight into the enemy tank standing 60 px to the right.
    move(predictor, 1, 0, 60);
    const x = predictor.renderPose()!.position.x;
    // Two 45 px hulls with the 0.46 hull radius cannot overlap.
    expect(x).toBeLessThan(160);
    expect(x).toBeGreaterThan(100);
  });

  it("decays the visual correction even when the tank stands still", () => {
    const predictor = new LocalPredictor();
    predictor.reconcile(player(), "me", world());
    move(predictor, 1, 0, 9);
    predictor.reconcile(
      player({ position: { x: 114, y: 100 }, last_input_seq: 6 }),
      "me",
      world()
    );
    const start = predictor.renderPose()!.position.x;
    move(predictor, 0, 0, Math.round(STEP_MS * 10));
    const end = predictor.renderPose()!.position.x;
    expect(end).toBeLessThan(start);
    expect(end).toBeCloseTo(123, 0);
  });
});
