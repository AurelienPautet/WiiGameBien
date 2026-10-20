import request from "supertest";
import { buildApp } from "../helpers/app";
import { cleanDb, createUserWithSession } from "../helpers/db";
import type { GameSettings } from "@ouigame/shared/api";

const app = buildApp();

const SETTINGS: GameSettings = {
  keybindings: {
    up: "KeyZ",
    down: "KeyS",
    left: "KeyQ",
    right: "KeyD",
    plant: "KeyE",
  },
  effects: {
    bloom: false,
    screenShake: true,
    aberration: false,
    vignette: true,
    shockwaves: true,
    particles: false,
    flashes: true,
    scenery: false,
  },
  sfxVolume: 0.4,
  musicVolume: 0.15,
  touchControls: "on",
  autoFire: false,
  tank: { bodyIndex: 3, turretIndex: 5 },
};

beforeEach(async () => {
  await cleanDb();
});

describe("GET /api/settings", () => {
  test("requires a session (401)", async () => {
    const res = await request(app).get("/api/settings");
    expect(res.status).toBe(401);
  });

  test("returns null until preferences have been saved", async () => {
    const { authHeader } = await createUserWithSession();

    const res = await request(app)
      .get("/api/settings")
      .set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ settings: null });
  });
});

describe("PUT /api/settings", () => {
  test("requires a session (401)", async () => {
    const res = await request(app)
      .put("/api/settings")
      .send({ settings: SETTINGS });
    expect(res.status).toBe(401);
  });

  test("saves preferences and returns them on the next read", async () => {
    const { authHeader } = await createUserWithSession();

    const save = await request(app)
      .put("/api/settings")
      .set("Authorization", authHeader)
      .send({ settings: SETTINGS });
    expect(save.status).toBe(200);
    expect(save.body).toEqual({ success: true });

    const read = await request(app)
      .get("/api/settings")
      .set("Authorization", authHeader);
    expect(read.status).toBe(200);
    expect(read.body).toEqual({ settings: SETTINGS });
  });

  test("updates the existing row in place", async () => {
    const { authHeader } = await createUserWithSession();

    await request(app)
      .put("/api/settings")
      .set("Authorization", authHeader)
      .send({ settings: SETTINGS });

    const changed: GameSettings = {
      ...SETTINGS,
      sfxVolume: 0,
      musicVolume: 1,
      tank: { bodyIndex: 7, turretIndex: 2 },
    };
    const second = await request(app)
      .put("/api/settings")
      .set("Authorization", authHeader)
      .send({ settings: changed });
    expect(second.status).toBe(200);

    const read = await request(app)
      .get("/api/settings")
      .set("Authorization", authHeader);
    expect(read.body.settings).toEqual(changed);
  });

  test("rejects an out-of-range volume (400)", async () => {
    const { authHeader } = await createUserWithSession();

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", authHeader)
      .send({ settings: { ...SETTINGS, sfxVolume: 2 } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  test("rejects a missing keybinding (400)", async () => {
    const { authHeader } = await createUserWithSession();
    const withoutKeybindings: Record<string, unknown> = { ...SETTINGS };
    delete withoutKeybindings.keybindings;

    const res = await request(app)
      .put("/api/settings")
      .set("Authorization", authHeader)
      .send({ settings: withoutKeybindings });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  test("keeps each player's preferences isolated", async () => {
    const first = await createUserWithSession({ username: "first" });
    const second = await createUserWithSession({ username: "second" });

    await request(app)
      .put("/api/settings")
      .set("Authorization", first.authHeader)
      .send({ settings: SETTINGS });

    const secondRead = await request(app)
      .get("/api/settings")
      .set("Authorization", second.authHeader);
    expect(secondRead.body).toEqual({ settings: null });
  });
});
