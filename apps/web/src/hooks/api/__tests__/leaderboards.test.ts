import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import type { RankingType, SoloGlobalType } from "@ouigame/shared/api";

vi.mock("../../../api", () => ({
  rankingsApi: { getRankings: vi.fn(), getMyRank: vi.fn() },
  soloApi: { getGlobalLeaderboard: vi.fn() },
}));

import { useRankings } from "../useRankings";
import { useGlobalSoloLeaderboard } from "../useSolo";
import { rankingsApi, soloApi } from "../../../api";
import { createQueryWrapper } from "../../../test/queryWrapper";

const getRankings = rankingsApi.getRankings as unknown as ReturnType<
  typeof vi.fn
>;
const getGlobalLeaderboard =
  soloApi.getGlobalLeaderboard as unknown as ReturnType<typeof vi.fn>;

const rows = [{ rank: 1, username: "Alice", total_data: 42 }];

// A query that stays pending: the next stat never resolves during the test.
const pending = () => new Promise<never>(() => {});

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("leaderboard queries", () => {
  it("keeps the previous online stat visible while the next stat loads", async () => {
    getRankings.mockResolvedValueOnce(rows).mockReturnValueOnce(pending());
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ type }: { type: RankingType }) => useRankings(type),
      { wrapper, initialProps: { type: "KILLS" as RankingType } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ type: "WINS" });

    expect(result.current.data).toEqual(rows);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("keeps the previous solo stat visible while the next stat loads", async () => {
    getGlobalLeaderboard
      .mockResolvedValueOnce(rows)
      .mockReturnValueOnce(pending());
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ type }: { type: SoloGlobalType }) =>
        useGlobalSoloLeaderboard(type, 50),
      {
        wrapper,
        initialProps: { type: "LEVELS_COMPLETED" as SoloGlobalType },
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ type: "KILLS" });

    expect(result.current.data).toEqual(rows);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
