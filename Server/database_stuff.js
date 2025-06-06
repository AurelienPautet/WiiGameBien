const bcrypt = require("bcryptjs");
// Removed duplicate import of User
const client = require(__dirname + "/db_client.js");
const User = require(__dirname + "/User_class.js");

function get_levels(input_name, imput_nb_players, socket) {
  let query_tosend, values;
  if (imput_nb_players == 0) {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' GROUP BY levels.id ORDER BY rating";
    values = [input_name];
  } else {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND max_players = $2 GROUP BY levels.id ORDER BY rating";
    values = [input_name, imput_nb_players];
  }
  fetch_levels(query_tosend, values, socket, "recieve_levels");
}

function get_my_levels(input_name, imput_nb_players, socket) {
  //console.log("get_my_levels", input_name, imput_nb_players);
  //console.log("users", users);
  let query_tosend, values;
  //const player_id = users[socket.id].id;
  const player_id = 1;
  if (imput_nb_players == 0) {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND creator_id = $2 GROUP BY levels.id ORDER BY rating";
    values = [input_name, player_id];
  } else {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND max_players = $2 AND creator_id = $3 GROUP BY levels.id ORDER BY rating";
    values = [input_name, imput_nb_players, player_id];
  }
  fetch_levels(query_tosend, values, socket, "recieve_my_levels");
}

async function get_max_players(list_id) {
  query = "SELECT MIN(max_players) FROM levels WHERE id = ANY ($1)";
  res = await client.query(query, [list_id]);
  //console.log(res.rows[0].min);
  return res.rows[0].min;
}

function get_creator_name(level_row) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT username FROM players WHERE id = $1",
      [level_row.creator_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve("Unknown");
        } else {
          resolve(res.rows[0].username);
        }
      }
    );
  });
}

function fetch_levels(query_tosend, values, socket, response_event) {
  client.query(query_tosend, values, async (err, res) => {
    if (err) {
      console.error("Error executing query fetch_levels", err.stack);
      return "Error";
    } else {
      levels = [];
      for (const row of res.rows) {
        const cname = await get_creator_name(row);
        levels.push({
          level_id: row.id,
          level_name: row.name,
          level_max_players: row.max_players,
          level_rating: row.rating,
          level_creator_name: cname,
          level_json: row.content,
        });
      }
      //console.log("Levels fetched:", levels);
      socket.emit(response_event, levels);
      return levels;
    }
  });
}

function get_json_from_id(level_id) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT content FROM levels WHERE id = $1",
      [level_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve("Error");
        } else {
          resolve(res.rows[0].content.data);
        }
      }
    );
  });
}

async function log_attemps(email, ip_adress, status) {
  let res = await client.query("SELECT id from players where email = $1", [
    email,
  ]);
  if (res.rows.length == 0) {
    console.log("User not found big problem");
    return;
  }
  player_id = res.rows[0].id;
  client.query(
    "INSERT INTO logings (player_id,ip_address,status) VALUES ($1,$2,$3)",
    [player_id, ip_adress, status]
  );
}

async function signup(username, email, password, socket) {
  willreturn = false;
  let res = await client.query("SELECT * from players where username = $1", [
    username,
  ]);
  if (res.rows.length > 0) {
    socket.emit("signup_fail", "username");
    willreturn = true;
  }
  res = await client.query("SELECT * from players where email = $1", [email]);
  if (res.rows.length > 0) {
    socket.emit("signup_fail", "email");
    willreturn = true;
  }

  if (willreturn) {
    return false;
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return new Promise((resolve, reject) => {
    client.query(
      "INSERT INTO players (username,email,password_hash) VALUES ($1,$2,$3);",
      [username, email, hashedPassword],
      (err, res) => {
        if (err) {
          resolve(false);
          console.error("Error executing query", err.stack);
        } else {
          resolve(true);
          socket.emit("signup_success", email);
          users[socket.id] = new User(email);
          log_attemps(email, socket.handshake.address, "sign_up_success");
        }
      }
    );
  });
}

async function login(email, password, socket) {
  return new Promise((resolve) => {
    client.query(
      "SELECT * FROM players WHERE email = $1",
      [email],
      async (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve(false);
        } else if (res.rows.length == 0) {
          socket.emit("login_fail", "email");
          resolve(false);
        } else {
          const user = res.rows[0];
          const isMatch = await bcrypt.compare(password, user.password_hash);
          console.log(isMatch, "isMatch");
          if (!isMatch) {
            resolve(false);
            socket.emit("login_fail", "password");
            log_attemps(
              email,
              socket.handshake.address,
              "login_failed_wrong_password"
            );
          } else {
            resolve(true);
            users[socket.id] = new User(email);
            socket.emit("login_success", user.username);
            log_attemps(email, socket.handshake.address, "login_success");
          }
        }
      }
    );
  });
}

async function logout(socket) {
  email = users[socket.id].email;
  delete users[socket.id];
  log_attemps(email, socket.handshake.address, "logout_success");
}

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
  console.log("rate_lvl", rate, level_id);
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
    console.log(err);
    socket.emit("rate_fail", "not logged in");
    return false;
  }
}

async function add_round(player_socket_id, level_id, stats_to_add) {
  console.log("adding rounds", player_socket_id, level_id, stats_to_add);
  try {
    player_id = users[player_socket_id].id;
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
          console.log("Round added successfully");
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
      console.log("User stats:", res.rows[0]);
      socket.emit("player_stats", res.rows[0]);
    } else {
      socket.emit("player_stats", null);
    }
  } catch (err) {
    console.error("Error getting user stats:", err);
    socket.emit("player_stats", null);
  }
}

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
  get_levels,
  get_my_levels,
  get_max_players,
  get_json_from_id,
  signup,
  login,
  logout,
  rate_lvl,
  get_level_rating_from_player,
  add_round,
  get_user_stats,
  get_ranking,
  get_user_rank,
};
