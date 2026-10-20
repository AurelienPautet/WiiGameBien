import { apiClient } from "../client";
import type {
  PlayerSettingsResponse,
  SavePlayerSettingsRequest,
  SuccessResponse,
} from "@ouigame/shared/api";

// Account-backed preferences. Only call these with a session token: the API
// rejects anonymous requests with 401 (callers gate on useAuth's user).
export const settingsApi = {
  get: () => apiClient.get<PlayerSettingsResponse>("/settings"),

  update: ({ settings }: SavePlayerSettingsRequest) =>
    apiClient.put<SuccessResponse>("/settings", { settings }),
};
