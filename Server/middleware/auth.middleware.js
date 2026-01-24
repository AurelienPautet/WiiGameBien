const { db, schema } = require("../db");
const { playerSessions, players } = schema;
const { eq, and, gt } = require("drizzle-orm");

async function authMiddleware(req, res, next) {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");

  if (!sessionToken) {
    return res.status(401).json({ error: "No session token provided" });
  }

  try {
    const result = await db
      .select({
        playerId: players.id,
        username: players.username,
        email: players.email,
      })
      .from(playerSessions)
      .innerJoin(players, eq(players.id, playerSessions.playerId))
      .where(
        and(
          eq(playerSessions.sessionToken, sessionToken),
          gt(playerSessions.expirationTimestamp, new Date()),
        ),
      );

    if (result.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    req.user = result[0];
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
}

async function optionalAuth(req, res, next) {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");
  if (!sessionToken) return next();

  try {
    const result = await db
      .select({
        playerId: players.id,
        username: players.username,
        email: players.email,
      })
      .from(playerSessions)
      .innerJoin(players, eq(players.id, playerSessions.playerId))
      .where(
        and(
          eq(playerSessions.sessionToken, sessionToken),
          gt(playerSessions.expirationTimestamp, new Date()),
        ),
      );

    if (result.length > 0) {
      req.user = result[0];
    }
    next();
  } catch (err) {
    next();
  }
}

module.exports = { authMiddleware, optionalAuth };
