console.log(__dirname, "db_levels_ratings.js loaded");
const path = require("path");
const client = require(path.join(__dirname, "..", "db_client.js"));

async function get_level_rating_from_player(level_id, player_id) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT stars FROM ratings WHERE level_id = $1 AND player_id = $2",
      [level_id, player_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve(false);
        } else if (res.rows.length == 0) {
          resolve(false);
        } else {
          resolve(res.rows[0].stars);
        }
      }
    );
  });
}

async function rate_lvl(rate, level_id, socket) {
  //console.log("rate_lvl", rate, level_id);
  try {
    player_id = users[socket.id].id;
    return new Promise((resolve) => {
      client.query(
        "SELECT * FROM ratings WHERE player_id = $1 AND level_id = $2",
        [player_id, level_id],
        (err, res) => {
          if (err) {
            socket.emit("rate_fail", "problem with database");
            console.error("Error executing query", err.stack);
            resolve(false);
          } else if (res.rows.length === 0) {
            client.query(
              "INSERT INTO ratings (player_id,level_id,stars) VALUES ($1,$2,$3)",
              [player_id, level_id, rate],
              (err2) => {
                if (err2) {
                  socket.emit("rate_fail", "problem with database");
                  console.error("Error executing query", err2.stack);
                  resolve(false);
                } else {
                  resolve(true);
                  socket.emit("rate_success", rate, level_id);
                }
              }
            );
          } else {
            client.query(
              "UPDATE ratings SET stars = $1 WHERE player_id = $2 AND level_id = $3",
              [rate, player_id, level_id],
              (err3) => {
                if (err3) {
                  socket.emit("rate_fail", "problem with database");
                  console.error("Error executing query", err3.stack);
                  resolve(false);
                } else {
                  resolve(true);
                  socket.emit("rate_success", rate, level_id);
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    //console.log(err);
    socket.emit("rate_fail", "not logged in");
    return false;
  }
}

module.exports = {
  get_level_rating_from_player,
  rate_lvl,
};
