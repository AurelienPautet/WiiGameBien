const path = require("path");
const client = require(path.join(__dirname, "..", "db_client.js"));
const { users } = require(path.join(__dirname, "..", "shared_state.js"));
async function get_ranking(ranking_type, socket) {
  let selectExpr;
  switch (ranking_type) {
    case "KILLS":
      selectExpr = "SUM(kills)";
      break;
    case "ROUNDS_PLAYED":
      selectExpr = "COUNT(rounds.id)";
      break;
    case "WINS":
      selectExpr = "SUM(wins)";
      break;
    default:
      socket.emit("ranking_error", "Invalid ranking type");
      return;
  }

  const query = `
    SELECT username, ${selectExpr} as total_data,
      RANK() OVER (ORDER BY ${selectExpr} DESC) as rank
    FROM players
    JOIN rounds ON players.id = rounds.player_id
    GROUP BY username
    ORDER BY rank ASC
  `;

  client.query(query, (err, res) => {
    if (err) {
      console.error("Error executing query", err.stack);
      socket.emit("ranking_error", "problem with database");
    } else {
      socket.emit("ranking", res.rows, ranking_type);
    }
  });
}

async function get_user_rank(player_socket_id, ranking_type, socket) {
  try {
    const player_id = users[player_socket_id].id;

    let selectExpr;
    switch (ranking_type) {
      case "KILLS":
        selectExpr = "SUM(kills)";
        break;
      case "ROUNDS_PLAYED":
        selectExpr = "COUNT(rounds.id)";
        break;
      case "WINS":
        selectExpr = "SUM(wins)";
        break;
      default:
        socket.emit("personal_ranking", null);
        return;
    }

    const query = `
      SELECT username, total_data, rank FROM (
        SELECT username, ${selectExpr} as total_data,
          RANK() OVER (ORDER BY ${selectExpr} DESC) as rank
        FROM players
        JOIN rounds ON players.id = rounds.player_id
        GROUP BY username
      ) ranked
      WHERE username = (SELECT username FROM players WHERE id = $1)
    `;

    const res = await client.query(query, [player_id]);

    if (res.rows.length > 0) {
      const user = res.rows[0];
      socket.emit("personal_ranking", {
        username: user.username,
        total_data: user.total_data,
        rank: user.rank,
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
