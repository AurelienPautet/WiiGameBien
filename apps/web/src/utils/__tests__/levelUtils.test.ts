import { describe, it, expect } from "vitest";
import {
  extractBotCounts,
  getBotColor,
  hexToDataUrl,
  hasBotSpawns,
} from "../levelUtils";

describe("extractBotCounts", () => {
  it("returns an empty object for nullish or non-array input", () => {
    expect(extractBotCounts(null)).toEqual({});
    expect(extractBotCounts(undefined)).toEqual({});
    expect(extractBotCounts("nope" as unknown as number[])).toEqual({});
  });

  it("ignores cells <= 10 and maps bot cells (value-10) to counts", () => {
    expect(extractBotCounts([0, 1, 10])).toEqual({});
    expect(extractBotCounts([11, 11, 12, 5, 14])).toEqual({ 1: 2, 2: 1, 4: 1 });
  });
});

describe("getBotColor", () => {
  it("maps known bot types to colours", () => {
    expect(getBotColor(1)).toBe("brown");
    expect(getBotColor(2)).toBe("grey");
    expect(getBotColor(3)).toBe("teal");
    expect(getBotColor(4)).toBe("green");
    expect(getBotColor(5)).toBe("yellow");
    expect(getBotColor(6)).toBe("purple");
    expect(getBotColor(7)).toBe("magenta");
    expect(getBotColor(8)).toBe("white");
    expect(getBotColor(9)).toBe("black");
  });
  it("falls back to grey for unknown types", () => {
    expect(getBotColor(0)).toBe("grey");
    expect(getBotColor(99)).toBe("grey");
  });
});

describe("hexToDataUrl", () => {
  it("returns the fallback path for an empty string", () => {
    expect(hexToDataUrl("")).toBe("ressources/image/minia/test.png");
  });
  it("decodes hex into a base64 jpeg data URL", () => {
    // 0x61 0x62 -> "ab" -> btoa("ab") === "YWI="
    expect(hexToDataUrl("6162")).toBe("data:image/jpeg;base64,YWI=");
  });
});

describe("hasBotSpawns", () => {
  it("is true when any bot cell (11-19) is present", () => {
    expect(hasBotSpawns([0, 0, 11, 0])).toBe(true);
    expect(hasBotSpawns([0, 16])).toBe(true);
    expect(hasBotSpawns([0, 19])).toBe(true);
  });

  it("is false for walls, spawns, holes and empty grids", () => {
    expect(hasBotSpawns([0, 1, 2, 3, 4, 10])).toBe(false);
    expect(hasBotSpawns([])).toBe(false);
  });

  it("is false for nullish input", () => {
    expect(hasBotSpawns(null)).toBe(false);
    expect(hasBotSpawns(undefined)).toBe(false);
  });
});
