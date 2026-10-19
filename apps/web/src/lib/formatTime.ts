/**
 * Shared M:SS time formatting for the game overlays. Two entry points because
 * the engine hands the solo end screen elapsed *seconds*, while the campaign
 * run/interstitial track *milliseconds*.
 */

/** Format whole seconds as `M:SS`. */
export function formatTimeSec(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Format milliseconds as `M:SS`. */
export function formatTimeMs(ms: number): string {
  if (!ms) return "0:00";
  return formatTimeSec(Math.floor(ms / 1000));
}

/**
 * Format a long duration (playtime totals) as `Xh Ym` / `Ym`, or `Ns` under a
 * minute. Whole seconds only matter for short multiplayer stints, which would
 * otherwise round down to a misleading `0m`; above that, minute precision is
 * plenty. 0 (or missing) reads `0m`.
 */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  if (totalSeconds < 1) return "0m";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
