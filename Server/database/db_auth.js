const bcrypt = require("bcryptjs");
const path = require("path");
const client = require(path.join(__dirname, "..", "db_client.js"));
const User = require(path.join(__dirname, "..", "User_class.js"));

const { makeid } = require(__dirname + "/../../Shared/scripts/commons.js");
const { signupbis, verifyToken } = require(path.join(
  __dirname,
  "..",
  "auth_server.js"
));

async function log_attemps(email, ip_adress, status) {
  let res = await client.query("SELECT id from players where email = $1", [
    email,
  ]);
  if (res.rows.length == 0) {
    //console.log("User not found big problem");
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
      "INSERT INTO players (username,email,password_hash,type) VALUES ($1,$2,$3,'db');",
      [username, email, hashedPassword],
      (err, res) => {
        if (err) {
          resolve(false);
          console.error("Error executing query", err.stack);
        } else {
          resolve(true);
          socket.emit("signup_success", username, email);
          users[socket.id] = new User(email);
          log_attemps(email, socket.handshake.address, "sign_up_success");
          new_user_session(socket, email);
        }
      }
    );
  });
}

async function is_username_available(username) {
  try {
    const res = await client.query(
      "SELECT * FROM players WHERE username = $1",
      [username]
    );
    return res.rows.length === 0;
  } catch (err) {
    console.error("Error executing query", err.stack);
    return false;
  }
}

async function google_login(idToken, username, socket) {
  const userInfo = await verifyToken(idToken);
  const email = userInfo.email;
  const userId = userInfo.userId;

  client.query(
    "SELECT * FROM players WHERE google_id = $1",
    [userId],
    async (err, res) => {
      if (err) {
        console.error("Error executing query", err.stack);
        return;
      }
      if (res.rows.length > 0) {
        const user = res.rows[0];
        users[socket.id] = new User(user.email);
        socket.emit("login_success", user.username, user.email);
        log_attemps(
          user.email,
          socket.handshake.address,
          "login_success_google"
        );
        new_user_session(socket, user.email);
      } else {
        if (username == "") {
          socket.emit("login_fail", "show_username_input");
          return;
        }
        const available = await is_username_available(username);
        if (available === false) {
          socket.emit("signup_fail", "username");
          return;
        } else {
          client.query(
            "INSERT INTO players (username, email, google_id, type) VALUES ($1, $2, $3, 'google')",
            [username, email, userId],
            (err2) => {
              if (err2) {
                console.error("Error executing query", err2.stack);
                return;
              }
              users[socket.id] = new User(email);
              socket.emit("signup_success", username, email);
              log_attemps(
                email,
                socket.handshake.address,
                "signup_success_google"
              );
              new_user_session(socket, email);
            }
          );
        }
      }
    }
  );
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
          //console.log(isMatch, "isMatch");
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
            socket.emit("login_success", user.username, email);
            log_attemps(email, socket.handshake.address, "login_success");
            new_user_session(socket, email);
          }
        }
      }
    );
  });
}

function new_user_session(socket, email) {
  let session_id = makeid(120);
  client.query(
    "SELECT id FROM players WHERE email = $1",
    [email],
    (err, res) => {
      if (err) {
        console.log("Error executing query", err.stack);
        return;
      }
      if (res.rows.length == 0) {
        console.log("User not found for session creation");
        return;
      }
      const player_id = res.rows[0].id;
      client.query(
        "INSERT INTO player_sessions (player_id, session_token) VALUES ($1, $2)",
        [player_id, session_id],
        (err2) => {
          if (err2) {
            console.log("Error executing query", err2.stack);
            return;
          }
          socket.emit("session_created", session_id);
        }
      );
    }
  );
}

function verify_session(socket, session_id) {
  client.query(
    "SELECT * FROM player_sessions join players on players.id = player_sessions.player_id where session_token = $1 AND expiration_timestamp > NOW()",
    [session_id],
    (err, res) => {
      if (err) {
        console.log("Error executing query", err.stack);
      } else if (res.rows.length == 0) {
        console.log("Session not found or expired");
        socket.emit("session_not_valid");
        logout(socket);
      } else {
        const user = res.rows[0];
        users[socket.id] = new User(user.email);
        socket.emit("login_success", user.username, user.email);
        log_attemps(user.email, socket.handshake.address, "auto_login_success");
      }
    }
  );
}

async function logout(socket) {
  if (!users[socket.id]) {
    console.log("No user found for logout");
    return;
  }
  email = users[socket.id].email;
  delete users[socket.id];
  log_attemps(email, socket.handshake.address, "logout_success");
}

module.exports = {
  signup,
  login,
  google_login,
  logout,
  verify_session,
};
