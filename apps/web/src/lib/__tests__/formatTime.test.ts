import { describe, it, expect } from "vitest";
import { formatDurationMs } from "../formatTime";

describe("formatDurationMs", () => {
  it("reads 0 and missing values as 0m", () => {
    expect(formatDurationMs(0)).toBe("0m");
    expect(formatDurationMs(NaN)).toBe("0m");
  });

  it("uses seconds under a minute, so short stints do not read 0m", () => {
    expect(formatDurationMs(1_000)).toBe("1s");
    expect(formatDurationMs(59_999)).toBe("59s");
    expect(formatDurationMs(60_000)).toBe("1m");
    expect(formatDurationMs(59 * 60_000 + 59_000)).toBe("59m");
  });

  it("splits hours and minutes above an hour", () => {
    expect(formatDurationMs(60 * 60_000)).toBe("1h 0m");
    expect(formatDurationMs(3 * 60 * 60_000 + 24 * 60_000)).toBe("3h 24m");
  });

  it("drops seconds instead of rounding up", () => {
    expect(formatDurationMs(119_000)).toBe("1m"); // 1m59s
    expect(formatDurationMs(3_600_000 - 1)).toBe("59m");
  });
});
