// Play-session repository — PURE Drizzle queries over OuiTank-play_sessions.
// One row = one logged-in stretch of time connected to the game (connect →
// disconnect, with the reconnect grace applied by the socket tracker that
// calls insertSession). No req/res, no business rules.
import { db, schema } from "@ouigame/db";
import { eq, sum } from "drizzle-orm";

const { playSessions } = schema;

// Insert one finished session. Called by the socket tracker on disconnect.
async function insertSession(values: typeof playSessions.$inferInsert) {
  await db.insert(playSessions).values(values);
}

// Total time this player has spent in the game (ms), across all sessions.
// 0 when they have none.
async function totalSessionTimeMs(playerId: number) {
  const result = await db
    .select({ total: sum(playSessions.durationMs) })
    .from(playSessions)
    .where(eq(playSessions.playerId, playerId));
  return Number(result[0]!.total) || 0;
}

// Total time every player has spent in the game (ms) — the admin overview.
async function totalSessionTimeAllMs() {
  const result = await db
    .select({ total: sum(playSessions.durationMs) })
    .from(playSessions);
  return Number(result[0]!.total) || 0;
}

export { insertSession, totalSessionTimeMs, totalSessionTimeAllMs };
