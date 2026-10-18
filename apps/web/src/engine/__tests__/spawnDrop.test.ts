import { describe, it, expect } from "vitest";
import { usesSpawnDrop } from "../Renderer.js";

// Regression for: "everyone parachutes in at the start of a match". Solo keeps
// the whole-field drop (player + bots); matches pass the local socket id so
// only your own tank drops and opponents render standing on their spawn spot.
describe("usesSpawnDrop", () => {
  it("drops every tank when no local socket id is supplied (solo)", () => {
    expect(usesSpawnDrop("solo_player_x", null)).toBe(true);
    expect(usesSpawnDrop("bot1", null)).toBe(true);
    expect(usesSpawnDrop("bot1", undefined)).toBe(true);
  });

  it("drops only the local tank in matches", () => {
    expect(usesSpawnDrop("me", "me")).toBe(true);
    expect(usesSpawnDrop("them", "me")).toBe(false);
    expect(usesSpawnDrop("bot1", "me")).toBe(false);
  });
});
