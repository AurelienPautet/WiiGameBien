const { Client } = require("pg");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

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
