import { Room } from "../Room.js";
import { Player } from "../Player.js";
import { Bullet } from "../Bullet.js";
import { Mine } from "../Mine.js";
import { loadlevel } from "../level_loader.js";
import { makeGrid, makeRecordingIo } from "./fixtures/levels.js";

// Characterization tests for the per-tick simulation: bullet cleanup/collision
// resolution, mine explosions (block destruction + chain detonation + player
// kills), and the countdown input gate. Geometry/values are frozen from the
// live math. Bullets are constructed with speed 0 so they stay put for the
// collision checks under test.

const mkRoom = (io = null) => {
  const room = new Room("arena", 1, [10], "creator", io);
  room.dt = 1 / 60; // one fixed step
  return room;
};

const addPlayer = (room, id, pos, alive = true) => {
  const p = new Player(pos, id, id, "orange", "blue");
  p.alive = alive;
  room.players[id] = p;
  return p;
};

describe("Room.update_bullets", () => {
  it("removes and explodes a bullet that has reached max_bounce", () => {
    const { io, emitted } = makeRecordingIo();
    const room = mkRoom(io);
    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    const bullet = new Bullet(
      { x: 100, y: 100 },
      0,
      0,
      { w: 15, h: 15 },
      3,
      1,
      emitter,
      room
    );
    bullet.bounce = 3; // at the limit
    emitted.length = 0;

    room.update_bullets();

    expect(room.bullets).toHaveLength(0);
    expect(emitter.bulletcount).toBe(0); // ctor ++ then cleanup --
    expect(emitted.some((e) => e.event === "bullet_explosion")).toBe(true);
    // The final bounce is a burst, not a ricochet: the sim flags the distinct
    // burst sound for clients instead of the bounce zing.
    expect(room.sounds.bounce_explode).toBe(true);
  });

  it("arms a mine when a bullet overlaps it and removes the bullet", () => {
    const room = mkRoom();
    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    const mine = new Mine({ x: 200, y: 200 }, emitter, room);
    const bullet = new Bullet(
      { x: 197.5, y: 197.5 },
      0,
      0,
      { w: 15, h: 15 },
      3,
      1,
      emitter,
      room
    );
    bullet.velocity = { x: 0, y: 0 };

    room.update_bullets();

    expect(room.bullets).toHaveLength(0);
    expect(room.mines).toHaveLength(1);
    expect(mine.timealive).toBe(room.timetoeplode); // armed
    expect(emitter.round_stats.stats.hits).toBe(1);
  });

  it("kills an alive player a bullet hits", () => {
    const room = mkRoom();
    room.nbliving = 1;
    const victim = addPlayer(room, "v", { x: 200, y: 200 }, true);
    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    new Bullet(
      { x: 222.5, y: 222.5 },
      0,
      0,
      { w: 15, h: 15 },
      3,
      1,
      emitter,
      room
    );

    room.update_bullets();

    expect(victim.alive).toBe(false);
    expect(emitter.round_stats.stats.kills).toBe(1);
    expect(emitter.round_stats.stats.hits).toBe(1);
    expect(room.bullets).toHaveLength(0);
  });
});

describe("Room.update_mines", () => {
  it("explodes, destroying an adjacent destructible block and killing a nearby player", async () => {
    const { io, emitted } = makeRecordingIo();
    const room = mkRoom(io);
    room.nbliving = 1;
    await loadlevel(makeGrid([[5, 10, 2]]), room); // destructible block at (500,250)
    expect(room.blocks).toHaveLength(1);

    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    const victim = addPlayer(room, "v", { x: 500, y: 250 }, true);
    const mine = new Mine({ x: 500, y: 250 }, emitter, room);
    mine.timealive = room.timetoeplode; // one update tips it over

    room.update_mines();

    expect(room.blocks).toHaveLength(0); // block destroyed
    expect(emitter.round_stats.stats.blocks_destroyed).toBe(1);
    expect(victim.alive).toBe(false);
    expect(emitter.round_stats.stats.kills).toBe(1);
    expect(room.mines).toHaveLength(0);
    expect(room.sounds.explose).toBe(true);
    expect(emitted.some((e) => e.event === "mine_explosion")).toBe(true);
  });

  it("chain-detonates a second mine within the blast radius", () => {
    const room = mkRoom();
    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    const first = new Mine({ x: 400, y: 400 }, emitter, room);
    new Mine({ x: 410, y: 410 }, emitter, room); // within radius of the first
    first.timealive = room.timetoeplode;

    room.update_mines();

    // The first explosion arms the second, which then explodes in the same pass.
    expect(room.mines).toHaveLength(0);
  });
});

describe("Room.update — countdown input gate", () => {
  it("skips player movement while the countdown is active", () => {
    const room = mkRoom();
    room.nbliving = 1;
    const p = addPlayer(room, "p", { x: 200, y: 200 }, true);
    p.direction = { x: 1, y: 0 };

    room.countdownActive = true;
    room.update(1, null, false);
    expect(p.position).toEqual({ x: 200, y: 200 }); // did not move

    room.countdownActive = false;
    room.update(1, null, false);
    expect(p.position.x).toBeGreaterThan(200); // moves once the countdown ends
  });
});

describe("Room.update — tick_sounds broadcast", () => {
  it("broadcasts the flags raised during the step, wiping flags set before it", () => {
    const { io, emitted } = makeRecordingIo();
    const room = mkRoom(io);
    room.status = "lobby"; // keep the win/level-load path out of this unit
    const emitter = new Player({ x: 0, y: 0 }, "e", "Emitter", "o", "b");
    const mine = new Mine({ x: 60, y: 60 }, emitter, room); // ctor sets plant
    mine.timealive = room.timetoeplode; // due to blow on this step
    emitted.length = 0;

    room.update(1 / 60);

    const sounds = emitted.filter((e) => e.event === "tick_sounds");
    expect(sounds).toHaveLength(1);
    // The step's own event (the mine blowing up) rides the broadcast — this is
    // how solo's LocalIO and online clients hear simulation sounds.
    expect(sounds[0]!.data.explose).toBe(true);
    // Flags raised OUTSIDE the step are wiped by update()'s reset before the
    // broadcast: that is why the solo plant sound and the online queued inputs
    // are played/rebroadcast around it instead of relying on this payload.
    expect(sounds[0]!.data.plant).toBe(false);
  });
});
