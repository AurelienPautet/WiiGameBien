const { Client } = require("pg");

require("dotenv").config();

DB_PASSWORD = process.env.DB_PASSWORD;
DB_HOST = process.env.DB_HOST;
DB_USER = process.env.DB_USER;
DB_NAME = process.env.DB_NAME;
DB_PORT = process.env.DB_PORT;

let client;
console.log(process.env.DATABASE_URL, "DATABASE_URL");
if (process.env.DATABASE_URL == undefined) {
  console.log("Using local db");
  client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
} else {
  console.log("Using heroku db");
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

client
  .connect()
  .then(() => console.log("Connected to PostgreSQL database"))
  .catch((err) => console.error("Connection error", err.stack));

module.exports = client;

var query_tosend = "";

function get_levels(input_name, imput_nb_players, socket) {
  if (imput_nb_players == 0) {
    query_tosend =
      "SELECT * FROM levels WHERE level_name Like '%" +
      input_name +
      "%'" +
      " ORDER BY level_rating ";
  } else {
    query_tosend =
      "SELECT * FROM levels WHERE level_name Like '%" +
      input_name +
      "%' AND level_max_players = " +
      imput_nb_players +
      " ORDER BY level_rating ";
  }
  fetch_levels(query_tosend, socket);
}

async function get_max_players(list_id) {
  //get the minimum number of players for the levels in the list
  query =
    "SELECT MIN(level_max_players) FROM levels WHERE level_id = " + list_id[0];
  for (let i = 1; i < list_id.length; i++) {
    query += " OR level_id = " + list_id[i];
  }
  //console.log(query);
  res = await client.query(query);
  //console.log(res.rows[0].min);
  return res.rows[0].min;
}

function get_creator_name(level_row) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT player_name FROM players WHERE player_id = " +
        level_row.creator_id,
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve("Unknown");
        } else {
          resolve(res.rows[0].player_name);
        }
      }
    );
  });
}

function fetch_levels(query_tosend, socket) {
  client.query(query_tosend, async (err, res) => {
    if (err) {
      console.error("Error executing query", err.stack);
      return "Error";
    } else {
      levels = [];
      for (const row of res.rows) {
        const cname = await get_creator_name(row);
        levels.push({
          level_id: row.level_id,
          level_name: row.level_name,
          level_max_players: row.level_max_players,
          level_rating: row.level_rating,
          level_creator_name: cname,
          level_json: row.level_json,
        });
      }
      socket.emit("recieve_levels", levels);
      return levels;
    }
  });
}

function get_json_from_id(level_id) {
  return new Promise((resolve, reject) => {
    client.query(
      "SELECT level_json FROM levels WHERE level_id = " + level_id,
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve("Error");
        } else {
          resolve(res.rows[0].level_json.level_layout);
        }
      }
    );
  });
}

module.exports = {
  get_levels,
  get_max_players,
  get_json_from_id,
};
