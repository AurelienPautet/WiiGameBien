const path = require("path");
const client = require(path.join(__dirname, "..", "db_client.js"));
async function add_round(player_socket_id, level_id, stats_to_add) {
  //console.log("adding rounds", player_socket_id, level_id, stats_to_add);
  try {
    if (player_socket_id == null) {
      player_id = null;
    } else {
      player_id = users[player_socket_id].id;
    }
    client.query(
      "INSERT INTO rounds (player_id, level_id, kills, deaths, wins, shots, hits, plants, blocks_destroyed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        player_id,
        level_id,
        stats_to_add.kills,
        stats_to_add.deaths,
        stats_to_add.wins,
        stats_to_add.shots,
        stats_to_add.hits,
        stats_to_add.plants,
        stats_to_add.blocks_destroyed,
      ],
      (err) => {
        if (err) {
          console.error("Error executing query", err.stack);
        } else {
          //console.log("Round added successfully");
        }
      }
    );
  } catch (err) {
    console.error("Error adding round:", err);
  }
}

async function get_user_stats(player_socket_id, socket) {
  try {
    player_id = users[player_socket_id].id;
    const res = await client.query(
      "SELECT SUM(kills) as kills, SUM(deaths) as deaths, SUM(wins) as wins, SUM(shots) as shots, SUM(hits) as hits, SUM(plants) as plants, SUM(blocks_destroyed) as blocks_destroyed, COUNT(id) as rounds_played FROM rounds WHERE player_id = $1",
      [player_id]
    );
    if (res.rows.length > 0) {
      ////console.log("User stats:", res.rows[0]);
      socket.emit("player_stats", res.rows[0]);
    } else {
      socket.emit("player_stats", null);
    }
  } catch (err) {
    console.error("Error getting user stats:", err);
    socket.emit("player_stats", null);
  }
}

module.exports = {
  add_round,
  get_user_stats,
};
