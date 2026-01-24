const express = require("express");
const router = express.Router();
const path = require("path");
const { db, schema } = require(path.join(__dirname, "..", "db"));
const { levels, levelsImg, ratings, rounds, players, soloRounds } = schema;
const {
  eq,
  like,
  and,
  sql,
  count,
  sum,
  min,
  desc,
  asc,
} = require("drizzle-orm");
const { authMiddleware } = require("../middleware/auth.middleware");

async function getCreatorName(creatorId) {
  const res = await db
    .select({ username: players.username })
    .from(players)
    .where(eq(players.id, creatorId));
  return res.length > 0 ? res[0].username : "Unknown";
}

async function getImgFromLevelId(levelId) {
  const res = await db
    .select({ img: levelsImg.img })
    .from(levelsImg)
    .where(eq(levelsImg.levelId, levelId));
  if (res.length === 0) return null;
  return res[0].img.toString("hex");
}

async function getStatsFromLevelId(levelId) {
  const res = await db
    .select({
      rounds_played: count(rounds.id),
      kills: sum(rounds.kills),
      deaths: sum(rounds.deaths),
      wins: sum(rounds.wins),
      shots: sum(rounds.shots),
      hits: sum(rounds.hits),
      plants: sum(rounds.plants),
      blocks_destroyed: sum(rounds.blocksDestroyed),
    })
    .from(rounds)
    .where(eq(rounds.levelId, levelId));
  return res.length > 0 ? res[0] : null;
}

async function getSoloStatsFromLevelId(levelId) {
  const res = await db
    .select({
      timesPlayed: count(soloRounds.id),
      totalWins: sum(sql`CASE WHEN ${soloRounds.success} THEN 1 ELSE 0 END`),
      bestTimeMs: sql`MIN(CASE WHEN ${soloRounds.success} THEN ${soloRounds.timeMs} END)`,
    })
    .from(soloRounds)
    .where(eq(soloRounds.levelId, levelId));

  if (res.length === 0) return null;

  const stats = res[0];
  const timesPlayed = Number(stats.timesPlayed) || 0;
  const totalWins = Number(stats.totalWins) || 0;

  return {
    times_played: timesPlayed,
    success_rate:
      timesPlayed > 0 ? Math.round((totalWins / timesPlayed) * 100) : 0,
    best_time_ms: stats.bestTimeMs ? Number(stats.bestTimeMs) : null,
  };
}

async function formatLevels(rows) {
  const results = [];
  for (const row of rows) {
    const cname = await getCreatorName(row.creatorId);
    const img = await getImgFromLevelId(row.id);
    const stats = await getStatsFromLevelId(row.id);

    // Fetch solo stats for solo levels
    let soloStats = null;
    if (row.type === "solo") {
      soloStats = await getSoloStatsFromLevelId(row.id);
    }

    results.push({
      level_id: row.id,
      level_name: row.name,
      level_max_players: row.maxPlayers,
      level_rating: row.rating,
      level_creator_name: cname,
      level_json: row.content,
      level_img: img,
      level_type: row.type,
      level_status: row.status,
      level_rounds_played: stats?.rounds_played || 0,
      level_kills: stats?.kills || 0,
      level_deaths: stats?.deaths || 0,
      level_wins: stats?.wins || 0,
      level_shots: stats?.shots || 0,
      level_hits: stats?.hits || 0,
      level_plants: stats?.plants || 0,
      level_blocks_destroyed: stats?.blocks_destroyed || 0,
      // Solo-specific stats
      solo_times_played: soloStats?.times_played || 0,
      solo_success_rate: soloStats?.success_rate || 0,
      solo_best_time_ms: soloStats?.best_time_ms || null,
    });
  }
  return results;
}

// GET /api/levels?name=&players=&type=solo|online
router.get("/", async (req, res) => {
  const { name = "", players: playerCount = 0, type = "online" } = req.query;
  const maxPlayers = parseInt(playerCount);

  try {
    const rows = await db
      .select({
        id: levels.id,
        name: levels.name,
        content: levels.content,
        creatorId: levels.creatorId,
        maxPlayers: levels.maxPlayers,
        type: levels.type,
        status: levels.status,
        rating: sql`COALESCE(AVG(${ratings.stars}), 0)`.as("rating"),
      })
      .from(levels)
      .leftJoin(ratings, eq(levels.id, ratings.levelId))
      .where(
        and(
          like(levels.name, sql`'%' || ${name} || '%'`),
          eq(levels.type, type),
          eq(levels.status, "up"),
          maxPlayers !== 0 ? eq(levels.maxPlayers, maxPlayers) : undefined,
        ),
      )
      .groupBy(levels.id)
      .orderBy(desc(sql`rating`));

    const formatted = await formatLevels(rows);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching levels:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

// GET /api/levels/my?name=&players=
router.get("/my", authMiddleware, async (req, res) => {
  const { name = "", players: playerCount = 0 } = req.query;
  const maxPlayers = parseInt(playerCount);
  const playerId = req.user.playerId;

  try {
    const rows = await db
      .select({
        id: levels.id,
        name: levels.name,
        content: levels.content,
        creatorId: levels.creatorId,
        maxPlayers: levels.maxPlayers,
        rating: sql`COALESCE(AVG(${ratings.stars}), 0)`.as("rating"),
      })
      .from(levels)
      .leftJoin(ratings, eq(levels.id, ratings.levelId))
      .where(
        and(
          like(levels.name, sql`'%' || ${name} || '%'`),
          eq(levels.creatorId, playerId),
          eq(levels.status, "up"),
          maxPlayers !== 0 ? eq(levels.maxPlayers, maxPlayers) : undefined,
        ),
      )
      .groupBy(levels.id)
      .orderBy(sql`rating`);

    const formatted = await formatLevels(rows);
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching my levels:", err);
    res.status(500).json({ error: "Failed to fetch your levels" });
  }
});

// GET /api/levels/:id
router.get("/:id", async (req, res) => {
  const levelId = parseInt(req.params.id);

  try {
    const rows = await db
      .select({
        id: levels.id,
        name: levels.name,
        content: levels.content,
        creatorId: levels.creatorId,
        maxPlayers: levels.maxPlayers,
        type: levels.type,
        rating: sql`COALESCE(AVG(${ratings.stars}), 0)`.as("rating"),
      })
      .from(levels)
      .leftJoin(ratings, eq(levels.id, ratings.levelId))
      .where(eq(levels.id, levelId))
      .groupBy(levels.id);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Level not found" });
    }

    const formatted = await formatLevels(rows);
    res.json(formatted[0]);
  } catch (err) {
    console.error("Error fetching level:", err);
    res.status(500).json({ error: "Failed to fetch level" });
  }
});

// GET /api/levels/:id/json
router.get("/:id/json", async (req, res) => {
  const levelId = parseInt(req.params.id);

  try {
    const result = await db
      .select({
        id: levels.id,
        name: levels.name,
        content: levels.content,
        creatorId: levels.creatorId,
      })
      .from(levels)
      .where(eq(levels.id, levelId));

    if (result.length === 0) {
      return res.status(404).json({ error: "Level not found" });
    }

    const row = result[0];
    const creatorName = await getCreatorName(row.creatorId);
    const img = await getImgFromLevelId(levelId);

    res.json({
      data: row.content.data,
      level_name: row.name,
      level_creator_name: creatorName,
      level_img: img,
    });
  } catch (err) {
    console.error("Error fetching level JSON:", err);
    res.status(500).json({ error: "Failed to fetch level data" });
  }
});

// POST /api/levels
router.post("/", authMiddleware, async (req, res) => {
  const { levelData, hexData, levelName, maxPlayers, type } = req.body;
  const playerId = req.user.playerId;

  try {
    const result = await db
      .insert(levels)
      .values({
        name: levelName,
        content: levelData,
        creatorId: playerId,
        maxPlayers: maxPlayers,
        type: type,
        status: "up",
      })
      .returning({ id: levels.id });

    const newLevelId = result[0].id;

    await db.insert(levelsImg).values({
      levelId: newLevelId,
      img: Buffer.from(hexData, "hex"),
    });

    res.json({ levelId: newLevelId });
  } catch (err) {
    console.error("Error creating level:", err);
    res.status(500).json({ error: "Failed to create level" });
  }
});

// PUT /api/levels/:id
router.put("/:id", authMiddleware, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const { levelData, hexData, levelName, maxPlayers, type } = req.body;
  const playerId = req.user.playerId;

  try {
    const existing = await db
      .select()
      .from(levels)
      .where(and(eq(levels.id, levelId), eq(levels.creatorId, playerId)));
    if (existing.length === 0) {
      return res.status(403).json({ error: "Not your level" });
    }

    await db
      .update(levels)
      .set({
        name: levelName,
        content: levelData,
        maxPlayers: maxPlayers,
        type: type,
        status: "up",
      })
      .where(and(eq(levels.id, levelId), eq(levels.creatorId, playerId)));

    await db
      .update(levelsImg)
      .set({
        img: Buffer.from(hexData, "hex"),
      })
      .where(eq(levelsImg.levelId, levelId));

    res.json({ levelId });
  } catch (err) {
    console.error("Error updating level:", err);
    res.status(500).json({ error: "Failed to update level" });
  }
});

// DELETE /api/levels/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const playerId = req.user.playerId;

  try {
    // Check ownership
    const existing = await db
      .select()
      .from(levels)
      .where(and(eq(levels.id, levelId), eq(levels.creatorId, playerId)));
    if (existing.length === 0) {
      return res.status(403).json({ error: "Not your level" });
    }

    await db.delete(levelsImg).where(eq(levelsImg.levelId, levelId));

    await db.delete(ratings).where(eq(ratings.levelId, levelId));

    await db.delete(levels).where(eq(levels.id, levelId));

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting level:", err);
    res.status(500).json({ error: "Failed to delete level" });
  }
});

// POST /api/levels/:id/rate
router.post("/:id/rate", authMiddleware, async (req, res) => {
  const levelId = parseInt(req.params.id);
  const { stars } = req.body;
  const playerId = req.user.playerId;

  try {
    const existing = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.playerId, playerId), eq(ratings.levelId, levelId)));

    if (existing.length === 0) {
      await db.insert(ratings).values({ playerId, levelId, stars });
    } else {
      await db
        .update(ratings)
        .set({ stars })
        .where(
          and(eq(ratings.playerId, playerId), eq(ratings.levelId, levelId)),
        );
    }

    res.json({ success: true, stars, levelId });
  } catch (err) {
    console.error("Error rating level:", err);
    res.status(500).json({ error: "Failed to rate level" });
  }
});

module.exports = router;
