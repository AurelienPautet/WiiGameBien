import { describe, it, expect } from "vitest";
import { partitionPlayersByLife, localTankLast } from "../Renderer.js";

// Regression for: "a dead tank's corpse — and the cannon barrel that broke off
// it — can show above an alive player". Players arrive in a map with arbitrary
// iteration order; the draw loop splits them into wrecks and live tanks so every
// wreck (and the debris layered between the two groups) renders beneath the
// living tanks, instead of a later map entry painting over a live player.
describe("partitionPlayersByLife", () => {
  const ids = (entries: [string, unknown][]) => entries.map(([id]) => id);

  it("separates wrecks from living tanks", () => {
    const players = {
      a: { alive: true },
      b: { alive: false },
      c: { alive: true },
      d: { alive: false },
    };

    const { wrecks, liveTanks } = partitionPlayersByLife(players);

    expect(ids(wrecks)).toEqual(["b", "d"]);
    expect(ids(liveTanks)).toEqual(["a", "c"]);
  });

  it("preserves insertion order within each group", () => {
    const players = {
      d1: { alive: false },
      a1: { alive: true },
      d2: { alive: false },
      a2: { alive: true },
    };

    const { wrecks, liveTanks } = partitionPlayersByLife(players);

    expect(ids(wrecks)).toEqual(["d1", "d2"]);
    expect(ids(liveTanks)).toEqual(["a1", "a2"]);
  });

  it("handles all-alive, all-dead, and empty sets", () => {
    const alive = partitionPlayersByLife({
      x: { alive: true },
      y: { alive: true },
    });
    expect(ids(alive.wrecks)).toEqual([]);
    expect(ids(alive.liveTanks)).toEqual(["x", "y"]);

    const dead = partitionPlayersByLife({
      x: { alive: false },
      y: { alive: false },
    });
    expect(ids(dead.wrecks)).toEqual(["x", "y"]);
    expect(ids(dead.liveTanks)).toEqual([]);

    const empty = partitionPlayersByLife({});
    expect(empty.wrecks).toEqual([]);
    expect(empty.liveTanks).toEqual([]);
  });

  it("groups a non-boolean alive value with the wrecks (matches _drawPlayer)", () => {
    // draw() reaches partitionPlayersByLife via an `as unknown as` cast, so
    // `alive` can in principle arrive non-boolean. _drawPlayer renders anything
    // falsy as a wreck, so the partition must group it with the wrecks too — a
    // strict `=== false` check would wrongly treat undefined as a live tank.
    const players = {
      x: { alive: true },
      u: { alive: undefined },
      y: { alive: true },
    } as unknown as Record<string, { alive: boolean }>;

    const { wrecks, liveTanks } = partitionPlayersByLife(players);

    expect(ids(wrecks)).toEqual(["u"]);
    expect(ids(liveTanks)).toEqual(["x", "y"]);
  });
});

// Regression for: "sometimes the player is rendered behind enemy tanks during
// the parachute dropout". The players map iterates in arrival order, so an
// opponent keyed after the local player painted over your tank wherever hulls
// overlapped. draw() now runs the live-tank list through localTankLast so the
// last thing painted among the living is your own tank.
describe("localTankLast", () => {
  const ids = (entries: [string, unknown][]) => entries.map(([id]) => id);

  it("moves the local player's tank to the end of the draw list", () => {
    const liveTanks: [string, unknown][] = [
      ["me", {}],
      ["opp1", {}],
      ["opp2", {}],
    ];

    const ordered = localTankLast(liveTanks, "me");

    expect(ids(ordered)).toEqual(["opp1", "opp2", "me"]);
    expect(ids(liveTanks)).toEqual(["me", "opp1", "opp2"]); // input untouched
  });

  it("leaves the list alone when already last", () => {
    const liveTanks: [string, unknown][] = [
      ["opp1", {}],
      ["me", {}],
    ];

    expect(ids(localTankLast(liveTanks, "me"))).toEqual(["opp1", "me"]);
  });

  it("leaves the list alone with no local id (spectating / unknown)", () => {
    const liveTanks: [string, unknown][] = [
      ["a", {}],
      ["b", {}],
    ];

    expect(ids(localTankLast(liveTanks, null))).toEqual(["a", "b"]);
    expect(ids(localTankLast(liveTanks, undefined))).toEqual(["a", "b"]);
  });

  it("leaves the list alone when the local player is not a live tank (dead)", () => {
    // A dead local player has been partitioned into the wrecks already, so it
    // does not appear in the liveTank list — a corpse must stay beneath the
    // living, not be promoted on top.
    const liveTanks: [string, unknown][] = [
      ["a", {}],
      ["b", {}],
    ];

    expect(ids(localTankLast(liveTanks, "me"))).toEqual(["a", "b"]);
  });

  it("composes with the life partition: wrecks first, me last of the living", () => {
    const players: Record<string, { alive: boolean }> = {
      me: { alive: true },
      deadOpp: { alive: false },
      opp: { alive: true },
    };

    const { wrecks, liveTanks } = partitionPlayersByLife(players);
    const order = localTankLast(liveTanks, "me");

    expect(ids(wrecks)).toEqual(["deadOpp"]);
    expect(ids(order)).toEqual(["opp", "me"]);
  });
});
