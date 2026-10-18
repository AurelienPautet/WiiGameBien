import { describe, it, expect } from "vitest";
import { usesSpawnDrop } from "../Renderer.js";

// Regression for: "everyone parachutes in at round start". The drop is the
// local player's intro, solo and matches alike: only your own tank parachutes
// while bots and opponents render standing on their spawn spot until GO.
describe("usesSpawnDrop", () => {
  it("drops only the local tank, solo included", () => {
    expect(usesSpawnDrop("solo_player_x", "solo_player_x")).toBe(true);
    expect(usesSpawnDrop("bot1", "solo_player_x")).toBe(false);
    expect(usesSpawnDrop("me", "me")).toBe(true);
    expect(usesSpawnDrop("them", "me")).toBe(false);
  });

  it("falls back to dropping every tank when no local socket id is known", () => {
    // Should not happen once a round starts (solo and online both know our id
    // by then); dropping the field beats dropping nobody if it ever does.
    expect(usesSpawnDrop("solo_player_x", null)).toBe(true);
    expect(usesSpawnDrop("bot1", null)).toBe(true);
    expect(usesSpawnDrop("bot1", undefined)).toBe(true);
  });
});
