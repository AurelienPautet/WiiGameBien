// Stats service — orchestration over the stats repository.
import * as statsRepo from "../repositories/stats.repo";
import * as soloRepo from "../repositories/solo.repo";
import * as playSessionsRepo from "../repositories/playSessions.repo";
import * as playSessions from "../socket/playSessions";

// Aggregate stats for the authenticated player (null if no rounds).
async function getMyStats(playerId: number) {
  return statsRepo.getUserRoundStats(playerId);
}

// Playtime breakdown for the authenticated player, in milliseconds:
// - soloMs: solo + campaign level time (every level attempt is a solo round);
// - onlineMs: online round time (rounds from before the duration column
//   existed are excluded, so this is a lower bound on very old accounts);
// - sessionMs: total time connected to the game, including menus and lobby —
//   finished sessions plus the one in progress, so the number is live.
async function getPlaytime(playerId: number) {
  const [soloMs, onlineMs, sessionMs] = await Promise.all([
    soloRepo.totalPlayTimeMs(playerId),
    statsRepo.totalPlayTimeMs(playerId),
    playSessionsRepo.totalSessionTimeMs(playerId),
  ]);
  return {
    soloMs,
    onlineMs,
    sessionMs: sessionMs + playSessions.activeSessionMs(playerId),
  };
}

export { getMyStats, getPlaytime };
