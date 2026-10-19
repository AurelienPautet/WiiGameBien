import { apiClient } from "../client";
import type { MyStats, PlaytimeStats } from "@ouigame/shared/api";

export const statsApi = {
  getMyStats: () => apiClient.get<MyStats>("/stats/me"),

  // Solo/online/session playtime breakdown for the profile header and cards.
  getPlaytime: () => apiClient.get<PlaytimeStats>("/stats/playtime"),
};
