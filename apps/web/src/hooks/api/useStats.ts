import { useQuery } from "@tanstack/react-query";
import { statsApi } from "../../api";
import { storage } from "../../lib/storage";

export const usePlayerStats = () => {
  return useQuery({
    queryKey: ["stats", "me"],
    queryFn: statsApi.getMyStats,
    enabled: storage.hasSession(),
  });
};

// Playtime breakdown (solo / online / session ms) for the profile modal.
export const usePlaytime = () => {
  return useQuery({
    queryKey: ["stats", "playtime"],
    queryFn: statsApi.getPlaytime,
    enabled: storage.hasSession(),
    staleTime: 30 * 1000, // 30 seconds
  });
};
