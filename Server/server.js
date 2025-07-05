const express = require("express");
const app = express();

const path = require("path");

app.use(express.static(path.join(__dirname, "../Public")));
app.use(express.static(path.join(__dirname, "../Shared")));

//console.log(path.join(__dirname, "../Public"));
const PORT = process.env.PORT || 7000;
//console.log("PORT : ", PORT);
const expressServer = app.listen(PORT);

const socketio = require("socket.io");
const io = socketio(expressServer, {
  cors: {
    origin: [
      "http://localhost:7000",
      "https://wiitank-2aacc4abc5cb.herokuapp.com",
      "https://wiitank.pautet.net",
    ],
    methods: ["GET", "POST"],
  },
});

const { loadlevel } = require(__dirname + "/../Shared/scripts/level_loader.js");
const { makeid } = require(__dirname + "/../Shared/scripts/commons.js");

const Room = require(__dirname + "/../Shared/class/Room.js");

const { get_level_rating_from_player, rate_lvl } = require(__dirname +
  "/database/db_levels_ratings.js");
const {
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
} = require(__dirname + "/database/db_level.js");
const { get_user_stats, add_round } = require(__dirname +
  "/database/db_stats.js");
const { get_ranking, get_user_rank } = require(__dirname +
  "/database/db_rankings.js");
const {
  signup,
  login,
  google_login,
  logout,
  verify_session,
} = require(__dirname + "/database/db_auth.js");

io.on("connect", (socket) => {
  room_list(socket);
  socket.join("lobby" + serverid);

  console.log(socket.id, "has joined our server!");
  console.log("with ip adress", socket.request.connection.remoteAddress);
  socket.emit("welcome", socket.id + "has joinded the server");
  socket.emit("serverid", serverid);
  socket.emit("socketid", socket.id);

  socket.on("disconnect", function () {
    console.log(socket.id, "Got disconnect!");
    if (users[socket.id]) {
      logout(socket);
    }
    try {
      for (const r of Object.values(rooms)) {
        r.delete_player(socket.id);
      }
    } catch (error) {
      console.error("Error handling player disconnection:", error);
    }
    room_list(0);
  });

  socket.on("get_json_from_id", (level_id) => {
    //console.log("get_json_from_id", level_id);
    get_json_from_id(level_id)
      .then((json) => {
        socket.emit("recieve_json_from_id", json);
      })
      .catch((error) => {
        console.error("Error getting JSON from ID:", error);
        socket.emit("error_getting_json", "Failed to retrieve level data.");
      });
  });

  socket.on("local_session_id", (session_id) => {
    verify_session(socket, session_id);
  });

  socket.on("signup", (username, email, password) => {
    //console.log("signup", username, email, password);
    signup(username, email, password, socket);
  });
  socket.on("login", (email, password) => {
    //console.log("login", email, password);
    login(email, password, socket);
  });

  socket.on("google_login", (id_token, username) => {
    //console.log("google_login", id_token, username);
    google_login(id_token, username, socket);
  });

  socket.on("logout", () => {
    logout(socket);
  });

  socket.on("rate_lvl", (rate, level_id) => {
    rate_lvl(rate, level_id, socket);
  });

  socket.on("search_levels", (input_name, input_nb_players, type) => {
    levels = get_levels(input_name, input_nb_players, type, socket);
  });

  socket.on("search_my_levels", (input_name, input_nb_players) => {
    levels = get_my_levels(input_name, input_nb_players, socket);
  });

  socket.on("new-room", async (name, rounds, list_id, creator) => {
    room_id = await create_room(name, 10, list_id, creator, io);
    //console.log("Room caca:", room_id);
    socket.emit("room_created", room_id);
  });

  socket.on("get_player_stats", () => {
    if (users[socket.id]) {
      get_user_stats(socket.id, socket);
    } else {
      socket.emit("no_user");
    }
  });

  socket.on("ranking", (ranking_type) => {
    ////console.log("ranking", ranking_type);
    get_ranking(ranking_type, socket);
  });

  socket.on("personal_ranking", (mysocketid, ranking_type) => {
    if (users[mysocketid]) {
      get_user_rank(mysocketid, ranking_type, socket);
    }
  });

  socket.on("load_level_editor", (level_id) => {
    //console.log("load_level_editor", level_id);
    get_level_from_id(level_id, socket, "recieve_level_from_id");
  });

  socket.on(
    "save_level",
    (level_id, levelData, hexData, level_name, max_players, type) => {
      //console.log(

      save_level(
        level_id,
        levelData,
        hexData,
        level_name,
        max_players,
        type,
        socket
      );
    }
  );

  socket.on("play", (playerName, turretc, bodyc, room_id) => {
    room = rooms[room_id];
    //console.log("play", playerName, turretc, bodyc, room_id, room, rooms);
    if (room == undefined) {
      socket.emit("id-fail");
      return;
    }
    if (
      room.ids.includes(socket.id) == false &&
      Object.keys(room.players).length < room.maxplayernb
    ) {
      //console.log("ouiii mon gars");
      room.spawn_new_player(playerName, turretc, bodyc, socket.id);
      socket.emit("id", room.id, room.ids.length - 1, socket.id);
      socket.leave("lobby" + serverid);
      socket.join(room.id);
      io.to(room.id).emit("player-connection", playerName);
      levels = get_level_from_id(
        room.levels[room.levelid],
        socket,
        "level_change_info"
      );
      //console.log("blocks on plys", room.blocks);
      socket.emit("level_change", {
        blocks: room.blocks,
        Bcollision: room.Bcollision,
        level_id: room.levels[room.levelid],
      });
      room_list(0);
    } else {
      socket.emit("id-fail");
    }
  });

  socket.on("tock", (data) => {
    room = rooms[data.room_id];
    //console.log("tock", data);
    if ((data.serverid = serverid)) {
      if (
        room != undefined &&
        room.players != undefined &&
        room.players[data.mysocketid] != undefined &&
        room.players[data.mysocketid].position != undefined
      ) {
        room.players[data.mysocketid].mytick = data.mytick;
        if (data.direction != undefined) {
          room.players[data.mysocketid].direction = data.direction;
        }
        if (data.aim != undefined) {
          room.players[data.mysocketid].aim = data.aim;
        }
        // players[data.playerid].update();
        if (data.click) {
          room.players[data.mysocketid].shoot(room);
        }
        if (data.plant) {
          room.players[data.mysocketid].plant(room);
        }
      }
    } else {
      socket.emit("wrongserver");
    }
  });
});

tickTockInterval = setTimeout(function toocking() {
  func = setTimeout(toocking, 16.67);
  TimeElapsed = getTimeElapsed();
  fps_corector = TimeElapsed / 16.67;

  for (const room of Object.values(rooms)) {
    if (room.update(fps_corector)) {
      for (socketid in room.players) {
        player = room.players[socketid];
        if (users[socketid]) {
          ////console.log("caca");
          add_round(
            socketid,
            room.levels[room.levelid],
            player.round_stats.stats
          );
        } else {
          add_round(null, room.levels[room.levelid], player.round_stats.stats);
        }
        player.round_stats.reset();
      }

      respawnwait = setTimeout(async () => {
        level_json = await get_json_from_id(room.levels[room.levelid]);
        await loadlevel(level_json, room);

        levels = get_level_from_id(
          room.levels[room.levelid],
          room.io.to(room.id),
          "level_change_info"
        );

        room.respawn_the_room();

        for (socketid in room.players) {
          if (users[socketid]) {
            stars = await get_level_rating_from_player(
              room.levels[room.levelid].id,
              users[socketid].id
            );
            io.to(socketid).emit("your_level_rating", stars ? stars : 0);
          }
        }
      }, waitingtime);
    }
  }
}, 16.67); //16.67 means that this code runs at 60 fps

function room_list(socket) {
  room_ids = [];
  room_names = [];
  room_players = [];
  room_players_max = [];
  room_creator_name = [];
  for (const room of Object.values(rooms)) {
    room_ids.push(room.id);
    room_names.push(room.name);
    room_players.push(Object.keys(room.players).length);
    room_players_max.push(room.maxplayernb);
    room_creator_name.push(room.creator);
  }
  ////console.log("room_list");
  if (socket != 0) {
    socket.emit(
      "room_list",
      room_ids,
      room_names,
      room_creator_name,
      room_players,
      room_players_max
    );
  } else {
    io.to("lobby" + serverid).emit(
      "room_list",
      room_ids,
      room_names,
      room_creator_name,
      room_players,
      room_players_max
    );
  }
}

//important constants for the game
const waitingtime = 5000;

fps_corector = 1;
users = {};
//Function to get time elapsed in milliseconds between two moments
oldTime = performance.now();

function getTimeElapsed() {
  const now = performance.now();
  const res = now - oldTime;
  oldTime = now;
  return res;
}

async function create_room(name, rounds, list_id, creator, io) {
  room = new Room(name, rounds, list_id, creator, io);
  room.maxplayernb = await get_max_players(list_id);
  level_json = await get_json_from_id(room.levels[room.levelid]);
  console.log("level_json", level_json);
  rooms[room.id] = room;
  if (room) {
    loadlevel(level_json, room);
  }
  room_list(0);
  console.log("Room created:", room.id, room.name);
  return room.id;
  ////console.log(rooms);
}
rooms = {};

create_room("2 players", 10, [2], "GAME MASTER", io);
/*
setTimeout(() => {
  create_room("6 players", 10, [1], "GAME MASTER", io);
}, 10000); */

serverid = makeid(15);
//console.log(serverid);
