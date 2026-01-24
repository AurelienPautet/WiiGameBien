const bcrypt = require("bcryptjs");
const path = require("path");
const { db, schema } = require(path.join(__dirname, "..", "db"));
const { players, playerSessions, logings } = schema;
const { eq, and, gt } = require("drizzle-orm");
const User = require(path.join(__dirname, "..", "User_class.js"));

const { makeid } = require(__dirname + "/../../shared/scripts/commons.js");
const { signupbis, verifyToken } = require(
  path.join(__dirname, "..", "auth_server.js"),
);
const { users } = require(path.join(__dirname, "..", "shared_state.js"));

async function log_attemps(email, ip_adress, status) {
  const res = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.email, email));

  if (res.length === 0) {
    return;
  }

  const player_id = res[0].id;
  await db.insert(logings).values({
    playerId: player_id,
    ipAddress: ip_adress,
    status: status,
  });
}

async function signup(username, email, password, socket) {
  let willreturn = false;

  // Check if username exists
  let res = await db
    .select()
    .from(players)
    .where(eq(players.username, username));

  if (res.length > 0) {
    socket.emit("signup_fail", "username");
    willreturn = true;
  }

  // Check if email exists
  res = await db.select().from(players).where(eq(players.email, email));

  if (res.length > 0) {
    socket.emit("signup_fail", "email");
    willreturn = true;
  }

  if (willreturn) {
    return false;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    await db.insert(players).values({
      username: username,
      email: email,
      passwordHash: hashedPassword,
      type: "db",
    });

    socket.emit("signup_success", username, email);
    users[socket.id] = new User(email);
    log_attemps(email, socket.handshake.address, "sign_up_success");
    new_user_session(socket, email);
    return true;
  } catch (err) {
    console.error("Error executing query", err);
    return false;
  }
}

async function is_username_available(username) {
  try {
    const res = await db
      .select()
      .from(players)
      .where(eq(players.username, username));
    return res.length === 0;
  } catch (err) {
    console.error("Error executing query", err);
    return false;
  }
}

async function google_login(idToken, username, socket) {
  const userInfo = await verifyToken(idToken);
  const email = userInfo.email;
  const userId = userInfo.userId;

  try {
    const res = await db
      .select()
      .from(players)
      .where(eq(players.googleId, userId));

    if (res.length > 0) {
      const user = res[0];
      users[socket.id] = new User(user.email);
      socket.emit("login_success", user.username, user.email);
      log_attemps(user.email, socket.handshake.address, "login_success_google");
      new_user_session(socket, user.email);
    } else {
      if (username === "") {
        socket.emit("login_fail", "show_username_input");
        return;
      }

      const available = await is_username_available(username);
      if (available === false) {
        socket.emit("signup_fail", "username");
        return;
      }

      await db.insert(players).values({
        username: username,
        email: email,
        googleId: userId,
        type: "google",
      });

      users[socket.id] = new User(email);
      socket.emit("signup_success", username, email);
      log_attemps(email, socket.handshake.address, "signup_success_google");
      new_user_session(socket, email);
    }
  } catch (err) {
    console.error("Error executing query", err);
  }
}

async function login(email, password, socket) {
  try {
    const res = await db.select().from(players).where(eq(players.email, email));

    if (res.length === 0) {
      socket.emit("login_fail", "email");
      return false;
    }

    const user = res[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      socket.emit("login_fail", "password");
      log_attemps(
        email,
        socket.handshake.address,
        "login_failed_wrong_password",
      );
      return false;
    }

    users[socket.id] = new User(email);
    socket.emit("login_success", user.username, email);
    log_attemps(email, socket.handshake.address, "login_success");
    new_user_session(socket, email);
    return true;
  } catch (err) {
    console.error("Error executing query", err);
    return false;
  }
}

async function new_user_session(socket, email) {
  const session_id = makeid(120);

  try {
    const res = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.email, email));

    if (res.length === 0) {
      console.log("User not found for session creation");
      return;
    }

    const player_id = res[0].id;

    await db.insert(playerSessions).values({
      playerId: player_id,
      sessionToken: session_id,
    });

    socket.emit("session_created", session_id);
  } catch (err) {
    console.log("Error executing query", err);
  }
}

async function verify_session(socket, session_id) {
  console.log(
    "verify_session called for socket:",
    socket.id,
    "session_id:",
    session_id?.substring(0, 10) + "...",
  );

  try {
    const res = await db
      .select({
        username: players.username,
        email: players.email,
      })
      .from(playerSessions)
      .innerJoin(players, eq(players.id, playerSessions.playerId))
      .where(
        and(
          eq(playerSessions.sessionToken, session_id),
          gt(playerSessions.expirationTimestamp, new Date()),
        ),
      );

    if (res.length === 0) {
      console.log("Session not found or expired for socket:", socket.id);
      socket.emit("session_not_valid");
      logout(socket);
    } else {
      const user = res[0];
      console.log(
        "Session valid, registering user:",
        user.email,
        "for socket:",
        socket.id,
      );
      users[socket.id] = new User(user.email);
      socket.emit("login_success", user.username, user.email);
      log_attemps(user.email, socket.handshake.address, "auto_login_success");
    }
  } catch (err) {
    console.log("Error executing query", err);
  }
}

async function logout(socket) {
  if (!users[socket.id]) {
    console.log("No user found for logout");
    return;
  }
  const email = users[socket.id].email;
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
