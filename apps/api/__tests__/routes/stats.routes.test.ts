import request from "supertest";
import { buildApp } from "../helpers/app";
import {
  cleanDb,
  createUserWithSession,
  createLevel,
  createRound,
  createSoloRound,
  createPlaySession,
} from "../helpers/db";

const app = buildApp();

beforeEach(async () => {
  await cleanDb();
});

describe("GET /api/stats/me", () => {
  test("aggregates the authenticated player's round stats", async () => {
    const { player, authHeader } = await createUserWithSession();
    const level = await createLevel(player.id);
    await createRound(player.id, level.id, { kills: 3, wins: 1, deaths: 2 });
    await createRound(player.id, level.id, { kills: 4, wins: 0, deaths: 1 });

    const res = await request(app)
      .get("/api/stats/me")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    // pg returns SUM/COUNT as strings; coerce before comparing.
    expect(Number(res.body.kills)).toBe(7);
    expect(Number(res.body.wins)).toBe(1);
    expect(Number(res.body.deaths)).toBe(3);
    expect(Number(res.body.rounds_played)).toBe(2);
  });

  test("requires authentication (401)", async () => {
    const res = await request(app).get("/api/stats/me");
    expect(res.status).toBe(401);
  });

  test("returns null aggregates for a player with no rounds", async () => {
    const { authHeader } = await createUserWithSession();
    const res = await request(app)
      .get("/api/stats/me")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(Number(res.body.rounds_played)).toBe(0);
    expect(res.body.kills).toBeNull();
  });
});

describe("GET /api/stats/playtime", () => {
  test("sums solo, online and session time for the authenticated player", async () => {
    const { player, authHeader } = await createUserWithSession();
    const level = await createLevel(player.id);
    await createSoloRound(player.id, level.id, { timeMs: 12_000 });
    await createSoloRound(player.id, level.id, { timeMs: 8_000 });
    await createRound(player.id, level.id, { durationMs: 45_000 });
    await createRound(player.id, level.id); // legacy: no duration → not counted
    await createPlaySession(player.id, { durationMs: 300_000 });

    const res = await request(app)
      .get("/api/stats/playtime")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      soloMs: 20_000,
      onlineMs: 45_000,
      sessionMs: 300_000,
    });
  });

  test("returns zeroes for a player with no recorded playtime", async () => {
    const { authHeader } = await createUserWithSession();
    const res = await request(app)
      .get("/api/stats/playtime")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ soloMs: 0, onlineMs: 0, sessionMs: 0 });
  });

  test("does not leak another player's playtime", async () => {
    const { player, authHeader } = await createUserWithSession();
    const level = await createLevel(player.id);
    const other = await createUserWithSession();
    await createSoloRound(other.player.id, level.id, { timeMs: 99_000 });
    await createPlaySession(other.player.id, { durationMs: 99_000 });

    const res = await request(app)
      .get("/api/stats/playtime")
      .set("Authorization", authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ soloMs: 0, onlineMs: 0, sessionMs: 0 });
  });

  test("requires authentication (401)", async () => {
    const res = await request(app).get("/api/stats/playtime");
    expect(res.status).toBe(401);
  });
});
