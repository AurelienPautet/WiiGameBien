// Tracks how long logged-in players stay connected: one play session per
// player runs from their first authenticated socket to their last socket's
// disconnect. A short reconnect grace merges the disconnect → reconnect pair
// produced by a page refresh (or a brief network blip) into a single session
// instead of two fragments. The finished session is persisted by the repo.
//
// Login/logout without a reconnect (the "authenticate" / "deauthenticate"
// socket events) open and close sessions the same way. Multiple tabs share one
// session — the clock starts with the first socket and ends with the last.
import * as playSessionsRepo from "../repositories/playSessions.repo";

// How long a player may stay fully disconnected before the session ends. Long
// enough to absorb a refresh/reconnect, short enough that a real departure is
// recorded promptly.
const RECONNECT_GRACE_MS = 15_000;

interface PlaySession {
  startedAt: number;
  // Every socket currently authenticated as this player.
  sockets: Set<string>;
  // Pending end-of-session timer; null when none is scheduled (cleared on a
  // reconnect inside the grace window).
  endTimer: NodeJS.Timeout | null;
}

const sessions = new Map<number, PlaySession>();

// A socket authenticated as `playerId`: open their session, or cancel a
// pending end when this is a reconnect within the grace window.
function sessionOpened(socketId: string, playerId: number): void {
  let session = sessions.get(playerId);
  if (session === undefined) {
    session = { startedAt: Date.now(), sockets: new Set(), endTimer: null };
    sessions.set(playerId, session);
  } else if (session.endTimer !== null) {
    clearTimeout(session.endTimer);
    session.endTimer = null;
  }
  session.sockets.add(socketId);
}

// A socket for `playerId` went away (disconnect or logout). Once no socket is
// left, wait out the grace window; if nobody reconnects, persist the session.
function sessionClosed(socketId: string, playerId: number): void {
  const session = sessions.get(playerId);
  if (session === undefined) return;
  session.sockets.delete(socketId);
  if (session.sockets.size > 0 || session.endTimer !== null) return;

  session.endTimer = setTimeout(() => {
    // Re-check: a reconnect inside the window clears the timer, but a stale
    // fire (possible if the timer was cleared race-y) must not record twice.
    if (session.sockets.size > 0 || sessions.get(playerId) !== session) return;
    sessions.delete(playerId);
    const endedAt = Date.now();
    void playSessionsRepo
      .insertSession({
        playerId,
        startedAt: new Date(session.startedAt),
        endedAt: new Date(endedAt),
        durationMs: endedAt - session.startedAt,
      })
      .catch((err) => console.error("insertSession failed:", err));
  }, RECONNECT_GRACE_MS);
}

// Milliseconds the player has been in their current (not yet persisted)
// session, so "time in game" reads truthfully while someone is still playing:
// only finished sessions have rows, and a row appears when the session ends.
function activeSessionMs(playerId: number): number {
  const session = sessions.get(playerId);
  return session === undefined ? 0 : Date.now() - session.startedAt;
}

// Same as activeSessionMs, summed across every player currently connected (the
// admin overview's global counter).
function totalActiveSessionMs(): number {
  const now = Date.now();
  let total = 0;
  for (const session of sessions.values()) total += now - session.startedAt;
  return total;
}

// Persist every open session right now (graceful shutdown): the process is
// about to exit, so the socket disconnect handlers will never get to run their
// grace timers. Sessions in the grace window are written too — their player is
// already gone, so recording up to now is the same outcome, just earlier.
async function flushAll(): Promise<void> {
  const endedAt = Date.now();
  const inserts: Promise<unknown>[] = [];
  for (const [playerId, session] of sessions) {
    if (session.endTimer !== null) clearTimeout(session.endTimer);
    inserts.push(
      playSessionsRepo.insertSession({
        playerId,
        startedAt: new Date(session.startedAt),
        endedAt: new Date(endedAt),
        durationMs: endedAt - session.startedAt,
      })
    );
  }
  sessions.clear();
  await Promise.allSettled(inserts);
}

// Test hook: drop every tracked session and its pending timer.
function __resetForTests(): void {
  for (const session of sessions.values()) {
    if (session.endTimer !== null) clearTimeout(session.endTimer);
  }
  sessions.clear();
}

export {
  sessionOpened,
  sessionClosed,
  activeSessionMs,
  totalActiveSessionMs,
  flushAll,
  RECONNECT_GRACE_MS,
  __resetForTests,
};
