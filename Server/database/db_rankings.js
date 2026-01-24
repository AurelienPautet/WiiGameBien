const path = require("path");
const { db, schema } = require(path.join(__dirname, "..", "db"));
const { players, rounds } = schema;
const { eq, sql, sum, count, desc } = require("drizzle-orm");
const { users } = require(path.join(__dirname, "..", "shared_state.js"));

async function get_ranking(ranking_type, socket) {
  let selectExpr;
  let orderExpr;

  switch (ranking_type) {
    case "KILLS":
      selectExpr = sum(rounds.kills);
      break;
    case "ROUNDS_PLAYED":
      selectExpr = count(rounds.id);
      break;
    case "WINS":
      selectExpr = sum(rounds.wins);
      break;
    default:
      socket.emit("ranking_error", "Invalid ranking type");
      return;
  }

  try {
    const res = await db
      .select({
        username: players.username,
        total_data: selectExpr,
        rank: sql`RANK() OVER (ORDER BY ${selectExpr} DESC)`,
      })
      .from(players)
      .innerJoin(rounds, eq(players.id, rounds.playerId))
      .groupBy(players.username)
      .orderBy(sql`rank ASC`);

    socket.emit("ranking", res, ranking_type);
  } catch (err) {
    console.error("Error executing query get_ranking:", err);
    socket.emit("ranking_error", "problem with database");
  }
}

async function get_user_rank(player_socket_id, ranking_type, socket) {
  try {
    const player_id = users[player_socket_id].id;

    let selectExpr;
    switch (ranking_type) {
      case "KILLS":
        selectExpr = sum(rounds.kills);
        break;
      case "ROUNDS_PLAYED":
        selectExpr = count(rounds.id);
        break;
      case "WINS":
        selectExpr = sum(rounds.wins);
        break;
      default:
        socket.emit("personal_ranking", null);
        return;
    }

    // Get user's username first
    const userRes = await db
      .select({ username: players.username })
      .from(players)
      .where(eq(players.id, player_id));

    if (userRes.length === 0) {
      socket.emit("personal_ranking", null);
      return;
    }

    const username = userRes[0].username;

    // Get ranking with user's position
    const res = await db
      .select({
        username: players.username,
        total_data: selectExpr,
        rank: sql`RANK() OVER (ORDER BY ${selectExpr} DESC)`,
      })
      .from(players)
      .innerJoin(rounds, eq(players.id, rounds.playerId))
      .groupBy(players.username);

    const userRank = res.find((r) => r.username === username);

    if (userRank) {
      socket.emit("personal_ranking", {
        username: userRank.username,
        total_data: userRank.total_data,
        rank: userRank.rank,
      });
    } else {
      socket.emit("personal_ranking", null);
    }
  } catch (err) {
    console.error("Error in get_user_rank:", err);
    socket.emit("personal_ranking", null);
  }
}

module.exports = {
  get_ranking,
  get_user_rank,
};
