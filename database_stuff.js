const { Client } = require("pg");
const bcrypt = require("bcryptjs");

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
      "SELECT levels.id,name,json,creator_id,max_players, AVG(stars) as rating FROM levels join ratings on levels.id = ratings.level_id  WHERE name Like '%' || $1 || '%' GROUP BY levels.id ORDER BY AVG(stars)";
    values = [input_name];
  } else {
    query_tosend =
      "SELECT levels.id,name,json,creator_id,max_players, AVG(stars) as rating FROM levels join ratings on levels.id = ratings.level_id  WHERE name Like '%' || $1 || '%' AND max_players = $2 GROUP BY levels.id ORDER BY AVG(stars)";
    values = [input_name, imput_nb_players];
  }
  fetch_levels(query_tosend, values, socket);
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

function fetch_levels(query_tosend, values, socket) {
  client.query(query_tosend, values, async (err, res) => {
    if (err) {
      console.error("Error executing query", err.stack);
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
          level_json: row.json,
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
      "SELECT json FROM levels WHERE id = $1",
      [level_id],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
          resolve("Error");
        } else {
          resolve(res.rows[0].json.data);
        }
      }
    );
  });
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
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return new Promise((resolve, reject) => {
    client.query(
      "INSERT INTO players (username,email,password_hash) VALUES ($1,$2,$3);",
      [username, email, hashedPassword],
      (err, res) => {
        if (err) {
          console.error("Error executing query", err.stack);
        } else {
          socket.emit("signup_success", username);
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
          resolve("Error");
        } else if (res.rows.length == 0) {
          socket.emit("login_fail", "email");
          resolve("User not found");
        } else {
          const user = res.rows[0];
          const isMatch = await bcrypt.compare(password, user.password_hash);
          console.log(isMatch, "isMatch");
          if (!isMatch) {
            socket.emit("login_fail", "password");
          } else {
            socket.emit("login_success", user.username);
          }
        }
      }
    );
  });
}

module.exports = {
  get_levels,
  get_max_players,
  get_json_from_id,
  signup,
  login,
};
