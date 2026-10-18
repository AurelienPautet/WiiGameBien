import { Room } from "../Room.js";
import { Player } from "../Player.js";
import { nearestEnemyCentre } from "../auto_aim.js";

// Tap-to-fire auto-aim target selection: the nearest living enemy, with coop
// teammates (humans) protected. Shared by the browser's solo room and the
// server's online tock handler, so both hosts pick the same target.

function mkRoom(mode: Room["mode"] = "ffa"): Room {
  const room = new Room("arena", 1, [10], "creator", null);
  room.mode = mode;
  return room;
}

// Add a combatant at a top-left position (the sim treats the tank as a circle
// about its box centre, so expectations below are centre-to-centre).
function addPlayer(
  room: Room,
  id: string,
  x: number,
  y: number,
  { isBot = false, alive = true, pending = false } = {}
): Player {
  const p = new Player({ x, y }, id, id, "orange", "orange");
  p.is_bot = isBot;
  p.alive = alive;
  p.pending_spawn = pending;
  room.players[id] = p;
  return p;
}

describe("nearestEnemyCentre", () => {
  it("returns null when there is no enemy to aim at", () => {
    const room = mkRoom();
    addPlayer(room, "me", 0, 0);
    expect(nearestEnemyCentre(room, "me")).toBeNull();
  });

  it("returns null when the shooter is not in the room", () => {
    const room = mkRoom();
    addPlayer(room, "bot", 100, 100, { isBot: true });
    expect(nearestEnemyCentre(room, "me")).toBeNull();
  });

  it("picks the nearest living enemy, not the first in the map", () => {
    const room = mkRoom();
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "far", 700, 0, { isBot: true });
    addPlayer(room, "near", 200, 0, { isBot: true });
    addPlayer(room, "middle", 400, 0, { isBot: true });

    // Box centres offset by half the tank's size (TANK_SIZE / 2).
    const near = room.players.near!;
    expect(nearestEnemyCentre(room, "me")).toEqual({
      x: near.position.x + near.size.w / 2,
      y: near.position.y + near.size.h / 2,
    });
  });

  it("skips dead enemies", () => {
    const room = mkRoom();
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "corpse", 100, 0, { isBot: true, alive: false });
    addPlayer(room, "alive", 500, 0, { isBot: true });

    const target = nearestEnemyCentre(room, "me");
    const alive = room.players.alive!;
    expect(target).toEqual({
      x: alive.position.x + alive.size.w / 2,
      y: alive.position.y + alive.size.h / 2,
    });
  });

  it("is null when every enemy is dead (nothing to auto-aim at)", () => {
    const room = mkRoom();
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "corpse", 100, 0, { isBot: true, alive: false });
    expect(nearestEnemyCentre(room, "me")).toBeNull();
  });

  it("targets the nearest enemy in ffa, bots and humans alike", () => {
    const room = mkRoom("ffa");
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "human", 120, 0);
    addPlayer(room, "bot", 600, 0, { isBot: true });

    const human = room.players.human!;
    expect(nearestEnemyCentre(room, "me")).toEqual({
      x: human.position.x + human.size.w / 2,
      y: human.position.y + human.size.h / 2,
    });
  });

  it("ignores coop teammates and locks onto the bot", () => {
    const room = mkRoom("coop");
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "teammate", 80, 0); // nearer, but an ally
    addPlayer(room, "bot", 700, 0, { isBot: true });

    const bot = room.players.bot!;
    expect(nearestEnemyCentre(room, "me")).toEqual({
      x: bot.position.x + bot.size.w / 2,
      y: bot.position.y + bot.size.h / 2,
    });
  });

  it("is null for a coop room holding only humans", () => {
    const room = mkRoom("coop");
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "teammate", 80, 0);
    expect(nearestEnemyCentre(room, "me")).toBeNull();
  });

  it("skips enemies still waiting to spawn", () => {
    const room = mkRoom("ffa");
    addPlayer(room, "me", 0, 0);
    addPlayer(room, "joining", 100, 0, { pending: true });
    expect(nearestEnemyCentre(room, "me")).toBeNull();
  });
});

describe("auto-aimed shot trajectory", () => {
  it("leaves along the line from the shooter to the targeted enemy", () => {
    const room = mkRoom();
    const me = addPlayer(room, "me", 100, 200);
    const bot = addPlayer(room, "bot", 500, 450, { isBot: true });

    // What the hosts do with the returned target: aim, refresh the barrel
    // angle (it otherwise lags a simulation step), then shoot.
    const target = nearestEnemyCentre(room, "me")!;
    me.aim = target;
    me.CalculateAngle();
    me.shoot(room);

    const bullet = room.bullets[0]!;
    // Player.angle is the barrel angle; the bullet's velocity is (-cos, -sin)
    // of it, i.e. it travels along the line from the shooter's centre to the
    // aim point. Both centres sit half a tank box in from `position`.
    const dx = bot.position.x - me.position.x;
    const dy = bot.position.y - me.position.y;
    const len = Math.hypot(dx, dy);
    const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y);
    expect(bullet.velocity.x / speed).toBeCloseTo(dx / len, 6);
    expect(bullet.velocity.y / speed).toBeCloseTo(dy / len, 6);
  });
});
