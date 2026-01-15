// TO OPTIMIZE
// write the big fucking queries instead of doing multiple smaller ones

const path = require("path");
const client = require(path.join(__dirname, "..", "db_client.js"));
const { users } = require(path.join(__dirname, "..", "shared_state.js"));
function get_levels(input_name, imput_nb_players, type, socket) {
  //console.log(input_name, imput_nb_players);
  //console.log(type);
  let query_tosend, values;
  if (imput_nb_players == 0) {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players,type,status, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND levels.type = $2 AND levels.status = 'up' GROUP BY levels.id ORDER BY rating";
    values = [input_name, type];
  } else {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players,type,status, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND max_players = $2 AND levels.type = $3 AND levels.status = 'up' GROUP BY levels.id ORDER BY rating";
    values = [input_name, imput_nb_players, type];
  }
  fetch_levels(query_tosend, values, socket, "recieve_levels");
}

function get_my_levels(input_name, imput_nb_players, socket) {
  ////console.log("get_my_levels", input_name, imput_nb_players);
  ////console.log("users", users);
  let query_tosend, values;
  if (!users[socket.id]) {
    //console.log("User not logged in, using default player_id -1");
    player_id = -1;
  } else {
    player_id = users[socket.id].id;
  }
  //const player_id = 1;
  if (imput_nb_players == 0) {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND creator_id = $2 AND levels.status = 'up' GROUP BY levels.id ORDER BY rating";
    values = [input_name, player_id];
  } else {
    query_tosend =
      "SELECT levels.id, name, content, creator_id, max_players, COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE name LIKE '%' || $1 || '%' AND max_players = $2 AND creator_id = $3 AND levels.status = 'up' GROUP BY levels.id ORDER BY rating";
    values = [input_name, imput_nb_players, player_id];
  }
  fetch_levels(query_tosend, values, socket, "recieve_my_levels");
}

function get_level_from_id(level_id, socket, response_event) {
  let query_tosend =
    "SELECT levels.id, name, content, creator_id, max_players,type ,COALESCE(AVG(stars), 0) as rating FROM levels LEFT JOIN ratings ON levels.id = ratings.level_id WHERE levels.id = $1 GROUP BY levels.id";

  return fetch_levels(query_tosend, [level_id], socket, response_event);
}

function save_level(
  level_id,
  levelData,
  hexData,
  level_name,
  max_players,
  type,
  socket
) {
  if (!users[socket.id]) {
    console.log("User not logged in, cannot save level");
    socket.emit("save_level_fail", "You must be logged in to save a level");
    return;
  }
  const player_id = users[socket.id].id;

  if (level_id != -1) {
    client.query(
      "Select * from levels where id = $1 and creator_id = $2",
      [level_id, player_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          socket.emit("save_level_fail", "problem with database");
          return;
        } else if (res.rows.length == 0) {
          socket.emit("save_level_fail", "not your level");
          return;
        }
      }
    );

    client.query(
      "UPDATE levels SET name = $1, content = $2, max_players = $3,type = $4,status = 'up' WHERE id = $5 AND creator_id = $6",
      [level_name, levelData, max_players, type, level_id, player_id],
      (err) => {
        if (err) {
          console.error("Error executing query", err.stack);
          socket.emit("save_level_fail", "problem with database");
          return;
        }
      }
    );

    client.query(
      "UPDATE levels_img SET img = $1::bytea WHERE level_id = $2",
      [Buffer.from(hexData, "hex"), level_id],
      (err) => {
        if (err) {
          console.error("Error executing query", err.stack);
          socket.emit("save_level_fail", "problem with database");
          return;
        } else {
          socket.emit("save_level_success", level_id);
        }
      }
    );
  } else {
    client.query(
      "INSERT INTO levels (name, content, creator_id, max_players,type,status) VALUES ($1, $2, $3, $4,$5,'up') RETURNING id",
      [level_name, levelData, player_id, max_players, type],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          socket.emit("save_level_fail", "problem with database");
          return;
        } else {
          newLevelId = res.rows[0].id;
          client.query(
            "INSERT INTO levels_img (level_id, img) VALUES ($1, $2)",
            [newLevelId, Buffer.from(hexData, "hex")],
            (err2) => {
              if (err2) {
                console.error("Error executing query", err2.stack);
                socket.emit("save_level_fail", "problem with database");
              } else {
                socket.emit("save_level_success", newLevelId);
              }
            }
          );
        }
      }
    );
  }
}

async function get_max_players(list_id) {
  const query = "SELECT MIN(max_players) FROM levels WHERE id = ANY ($1)";
  const res = await client.query(query, [list_id]);
  ////console.log(res.rows[0].min);
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
  //console.log("fetch_levels", query_tosend, values, socket, response_event);
  client.query(query_tosend, values, async (err, res) => {
    if (err) {
      console.error(
        "Error executing query fetch_levels from query ",
        query_tosend,
        " with the error : ",
        err.stack
      );
      return "Error";
    } else {
      let levels = [];
      for (const row of res.rows) {
        const cname = await get_creator_name(row);
        const img = await get_img_from_level_id(row.id);
        const stats = await get_statsfrom_level_id(row.id);
        //console.log("stats", stats);
        levels.push({
          level_id: row.id,
          level_name: row.name,
          level_max_players: row.max_players,
          level_rating: row.rating,
          level_creator_name: cname,
          level_json: row.content,
          level_img: img,
          level_type: row.type,
          level_status: row.status,
          level_rounds_played: stats ? stats.rounds_played : 0,
          level_kills: stats ? stats.kills : 0,
          level_deaths: stats ? stats.deaths : 0,
          level_wins: stats ? stats.wins : 0,
          level_shots: stats ? stats.shots : 0,
          level_hits: stats ? stats.hits : 0,
          level_plants: stats ? stats.plants : 0,
          level_blocks_destroyed: stats ? stats.blocks_destroyed : 0,
        });
      }
      //console.log("Levels fetched:", levels);
      socket.emit(response_event, levels);
      return levels;
    }
  });
}

function get_statsfrom_level_id(level_id) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT COUNT(id) as rounds_played, SUM(kills) as kills, SUM(deaths) as deaths, SUM(wins) as wins, SUM(shots) as shots, SUM(hits) as hits, SUM(plants) as plants, SUM(blocks_destroyed) as blocks_destroyed FROM rounds WHERE level_id = $1",
      [level_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve(null);
        } else if (res.rows.length == 0) {
          resolve(null);
        } else {
          resolve(res.rows[0]);
        }
      }
    );
  });
}

function get_img_from_level_id(level_id) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT img FROM levels_img WHERE level_id = $1",
      [level_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve(null);
        } else if (res.rows.length == 0) {
          resolve(null);
        } else {
          resolve(res.rows[0].img.toString("hex"));
        }
      }
    );
  });
}

async function get_json_from_id(level_id) {
  try {
    // Get basic level data
    const res = await client.query(
      "SELECT id, name, content, creator_id FROM levels WHERE id = $1",
      [level_id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];

    // Get creator name
    const creatorName = await get_creator_name(row);

    // Get thumbnail
    const img = await get_img_from_level_id(level_id);

    // Return both the JSON data (for game) and metadata (for UI)
    return {
      data: row.content.data,
      level_name: row.name,
      level_creator_name: creatorName,
      level_img: img,
    };
  } catch (err) {
    console.error("Error in get_json_from_id:", err.stack);
    return null;
  }
}

module.exports = {
  get_levels,
  get_my_levels,
  get_level_from_id,
  save_level,
  get_max_players,
  get_creator_name,
  fetch_levels,
  get_statsfrom_level_id,
  get_img_from_level_id,
  get_json_from_id,
};
