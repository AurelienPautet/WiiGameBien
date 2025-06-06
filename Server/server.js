const express = require("express");
const app = express();

const fs = require("fs");
const path = require("path");

app.use(express.static(path.join(__dirname, "../Public")));
console.log(path.join(__dirname, "../Public"));
const PORT = process.env.PORT || 7000;
console.log("PORT : ", PORT);
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
module.exports = { io };

const {
  Player,
  CollisonsBox,
  Bullet,
  Block,
  Frontend_Player,
  Mine,
  Room,
  User,
} = require(__dirname + "/class.js");
const { loadlevel, generateBcollision } = require(__dirname +
  "/level_loader.js");
const {
  rectRect,
  detectCollision,
  colliderect,
  distance,
  rectanglesSeTouchent,
} = require(__dirname + "/check_collision.js");

const {
  get_levels,
  get_my_levels,
  get_max_players,
  get_json_from_id,
  signup,
  login,
  logout,
  get_user_info,
  rate_lvl,
  get_level_rating_from_player,
  add_round,
  get_user_stats,
  get_ranking,
  get_user_rank,
} = require(__dirname + "/database_stuff.js");

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
    let roomsf = 0;
    let i = -1;
    room_list(0);
    if (users[socket.id]) {
      logout(socket);
    }
    rooms.forEach((r) => {
      e = r.ids.indexOf(socket.id);
      if (e > -1) {
        i = e;
        roomsf = r;
      }
    });

    try {
      if (roomsf && roomsf.players && roomsf.players[socket.id]) {
        io.to(roomsf.name).emit(
          "player-disconnection",
          roomsf.players[socket.id].name
        );
        delete roomsf.players[socket.id];
        roomsf.ids = roomsf.ids.filter((id) => id !== socket.id);
        roomsf.nbliving--;
      }
    } catch (error) {
      console.error("Error handling player disconnection:", error);
    }
  });

  socket.on("signup", (username, email, password) => {
    console.log("signup", username, email, password);
    signup(username, email, password, socket);
  });
  socket.on("login", (email, password) => {
    console.log("login", email, password);
    login(email, password, socket);
  });

  socket.on("logout", () => {
    logout(socket);
  });

  socket.on("rate_lvl", (rate, level_id) => {
    rate_lvl(rate, level_id, socket);
  });

  socket.on("search_levels", (input_name, input_nb_players) => {
    levels = get_levels(input_name, input_nb_players, socket);
  });

  socket.on("search_my_levels", (input_name, input_nb_players) => {
    levels = get_my_levels(input_name, input_nb_players, socket);
  });

  socket.on("new-room", async (name, rounds, list_id, creator) => {
    create_room(name, rounds, list_id, creator);
    socket.emit("room_created");
  });

  socket.on("get_player_stats", () => {
    if (users[socket.id]) {
      get_user_stats(socket.id, socket);
    } else {
      socket.emit("no_user");
    }
  });

  socket.on("ranking", (ranking_type) => {
    //console.log("ranking", ranking_type);
    get_ranking(ranking_type, socket);
  });

  socket.on("personal_ranking", (mysocketid, ranking_type) => {
    if (users[mysocketid]) {
      get_user_rank(mysocketid, ranking_type, socket);
    }
  });

  socket.on("play", (playerName, turretc, bodyc, room_name) => {
    room = rooms.find((item) => item.name === room_name);

    if (
      room.ids.includes(socket.id) == false &&
      Object.keys(room.players).length < room.maxplayernb
    ) {
      spawnid = Math.floor(Math.random() * room.spawns.length);
      const player = new Player(
        room.spawns[spawnid],
        socket.id,
        playerName,
        turretc,
        bodyc
      );
      room.spawn_player(player);
      socket.emit("id", room.ids.length - 1, socket.id);
      socket.leave("lobby" + serverid);
      socket.join(room.name);
      io.to(room.name).emit("player-connection", playerName);
      socket.emit(
        "level_change",
        room.blocks,
        room.Bcollision,
        room.levels[room.levelid]
      );
      room_list(0);
    } else {
      socket.emit("id-fail");
    }
  });

  socket.on("tock", (data) => {
    room = rooms.find((item) => item.name === data.room_name);
    if ((data.serverid = serverid)) {
      if (
        room != undefined &&
        room.players != undefined &&
        room.players[data.mysocketid] != undefined
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

  rooms.forEach((room) => {
    check_for_winns_and_load_next_level(room);
    update_mines(room);
    update_bullets(room);
    room.update();
    room.frontend_players = {};
    for (socketid in room.players) {
      room.players[socketid].update(room, fps_corector);
      player = room.players[socketid];
      room.frontend_players[socketid] = new Frontend_Player(
        player.position,
        player.socketid,
        player.name,
        player.turretc,
        player.bodyc,
        player.angle,
        player.alive,
        player.rotation,
        player.direction,
        player.mytick
      );
    }
    io.to(room.name).emit(
      "tick",
      room.frontend_players,
      room.bullets,
      room.mines,
      room.name,
      room.tick
    ); // send the event to the "game" room
    io.to(room.name).emit("tick_sounds", room.sounds);
    room.sounds = {
      plant: false,
      kill: false,
      shoot: false,
      ricochet: false,
      explose: false,
    };
  });
}, 16.67); //16.67 means that this code runs at 60 fps

function room_list(socket) {
  room_names = [];
  room_players = [];
  room_players_max = [];
  room_creator_name = [];
  rooms.forEach((room) => {
    room_names.push(room.name);
    room_players.push(Object.keys(room.players).length);
    room_players_max.push(room.maxplayernb);
    room_creator_name.push(room.creator);
  });
  //console.log("room_list");
  if (socket != 0) {
    socket.emit(
      "room_list",
      room_names,
      room_creator_name,
      room_players,
      room_players_max
    );
  } else {
    io.to("lobby" + serverid).emit(
      "room_list",
      room_names,
      room_creator_name,
      room_players,
      room_players_max
    );
  }
}

//important constants for the game
const waitingtime = 5000;
const timetoeplode = 300;
const mines_explsion_radius = 90;
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

function get_all_player_stats(room) {
  stats = {};
  for (socketid in room.players) {
    player = room.players[socketid];
    stats[socketid] = player.round_stats.stats;
  }
  return stats;
}

function check_for_winns_and_load_next_level(room) {
  if (room.waitingrespawn == false && room.nbliving <= 1) {
    if (Object.keys(room.players).length >= 2) {
      if (room.nbliving == 1) {
        for (socketid in room.players) {
          player = room.players[socketid];
          if (player.alive) {
            player.round_stats.stats.wins++;
            io.to(room.name).emit(
              "winner",
              socketid,
              waitingtime,
              get_all_player_stats(room),
              room.ids_to_names
            );
          }
        }
      } else {
        io.to(room.name).emit(
          "winner",
          -1,
          waitingtime,
          room.scores,
          room.ids_to_names
        );
      }
      for (socketid in room.players) {
        if (users[socketid]) {
          //console.log("caca");
          add_round(
            socketid,
            room.levels[room.levelid],
            room.players[socketid].round_stats.stats
          );
        }
        player = room.players[socketid];
        player.round_stats.reset();
      }
      room.waitingrespawn = true;
      respawnwait = setTimeout(async () => {
        room.bullets = [];
        room.mines = [];
        await loadlevel(room.levels[room.levelid], room);
        io.to(room.name).emit(
          "level_change",
          room.blocks,
          room.Bcollision,
          room.levels[room.levelid]
        );
        for (socketid in room.players) {
          player = room.players[socketid];
          player.alive = true;
          player.minecount = 0;
          player.bulletcount = 0;
          spawnid = Math.floor(Math.random() * room.spawns.length);
          player.spawnpos = room.spawns[spawnid];
          room.spawns.splice(spawnid, 1);
          player.spawn();
          if (users[socketid]) {
            stars = await get_level_rating_from_player(
              room.levels[room.levelid].id,
              users[socketid].id
            );
            io.to(socketid).emit("your_level_rating", stars ? stars : 0);
          }
        }
        room.nbliving = Object.keys(room.players).length;
        room.waitingrespawn = false;

        if (room.levelid < room.levels.length - 1) {
          room.levelid++;
        } else {
          room.levelid = 0;
        }
      }, waitingtime);
    }
  }
}

function update_bullets(room) {
  bulleting: for (let i = 0; i < room.bullets.length; i++) {
    room.bullets[i].update(room, fps_corector);
    if (room.bullets[i].bounce >= 3) {
      io.to(room.name).emit("bullet_explosion", {
        x: room.bullets[i].position.x,
        y: room.bullets[i].position.y,
      });
      room.bullets[i].emitter.bulletcount--;
      room.bullets.splice(i, 1);
      i -= 1;
      continue bulleting;
    }
    for (let e = 0; e < room.mines.length; e++) {
      if (
        rectanglesSeTouchent(
          room.mines[e].position.x - room.mines[e].radius,
          room.mines[e].position.y - room.mines[e].radius,
          room.mines[e].radius * 2,
          room.mines[e].radius * 2,
          room.bullets[i].position.x,
          room.bullets[i].position.y,
          room.bullets[i].size.w,
          room.bullets[i].size.h
        )
      ) {
        room.mines[e].timealive = timetoeplode;
        room.bullets[i].emitter.bulletcount--;
        room.bullets[i].emitter.round_stats.stats.hits++;
        room.bullets.splice(i, 1);
        i -= 1;
        continue bulleting;
      }
    }
    for (let e = 0; e < room.bullets.length; e++) {
      if (
        rectRect(
          room.bullets[i].position.x,
          room.bullets[i].position.y,
          room.bullets[i].size.w,
          room.bullets[i].size.h,
          room.bullets[e].position.x,
          room.bullets[e].position.y,
          room.bullets[e].size.w,
          room.bullets[e].size.h
        ) &&
        i != e
      ) {
        room.bullets[i].emitter.bulletcount--;
        room.bullets[i].emitter.round_stats.stats.hits++;
        room.bullets[e].emitter.bulletcount--;
        room.bullets[e].emitter.round_stats.stats.hits++;
        io.to(room.name).emit("bullet_explosion", {
          x: room.bullets[i].position.x,
          y: room.bullets[i].position.y,
        });
        if (e < i) {
          room.bullets.splice(i, 1);
          room.bullets.splice(e, 1);
          i -= 2;
        } else {
          room.bullets.splice(e, 1);
          room.bullets.splice(i, 1);
          i -= 1;
        }

        continue bulleting;
      }
    }
    for (socketid in room.players) {
      if (
        room.players[socketid].BulletCollision(room.bullets[i]) &&
        room.players[socketid].alive
      ) {
        room.bullets[i].emitter.bulletcount--;
        room.bullets[i].emitter.round_stats.stats.hits++;

        kill(room.bullets[i].emitter, room.players[socketid], room, "bullet");
        room.bullets.splice(i, 1);
        i -= 1;

        continue bulleting;
      }
    }
  }
}

function update_mines(room) {
  //update the mines
  mining: for (let i = 0; i < room.mines.length; i++) {
    room.mines[i].update();
    if (room.mines[i].timealive > timetoeplode) {
      for (let m = 0; m < room.blocks.length; m++) {
        if (room.blocks[m].type == 2) {
          if (
            distance(
              room.mines[i].position,
              { w: room.mines[i].radius * 2, h: room.mines[i].radius * 2 },
              room.blocks[m].position,
              room.blocks[m].size
            ) <=
            mines_explsion_radius ** 2
          ) {
            room.mines[i].emitter.round_stats.stats.blocks_destroyed++;
            room.blocklist[
              (room.blocks[m].position.y / 50) * 23 +
                room.blocks[m].position.x / 50
            ] = 10;
            generateBcollision(room);
            room.blocks.splice(m, 1);
            io.to(room.name).emit(
              "level_change",
              room.blocks,
              room.Bcollision,
              room.levels[room.levelid]
            );

            m -= 1;
          }
        }
      }
      for (let e = 0; e < room.mines.length; e++) {
        if (
          distance(
            room.mines[i].position,
            { w: room.mines[i].radius * 2, h: room.mines[i].radius * 2 },
            room.mines[e].position,
            { w: room.mines[e].radius * 2, h: room.mines[e].radius * 2 }
          ) <=
          mines_explsion_radius ** 2
        ) {
          room.mines[e].timealive = timetoeplode;
        }
      }
      for (socketid in room.players) {
        if (
          distance(
            room.mines[i].position,
            { w: room.mines[i].radius * 2, h: room.mines[i].radius * 2 },
            room.players[socketid].position,
            room.players[socketid].size
          ) <=
            mines_explsion_radius ** 2 &&
          room.players[socketid].alive
        ) {
          kill(room.mines[i].emitter, room.players[socketid], room, "mine");
        }
      }

      io.to(room.name).emit("mine_explosion", {
        x: room.mines[i].position.x + room.mines[i].radius / 2,
        y: room.mines[i].position.y + room.mines[i].radius / 2,
      });
      room.sounds.explose = true;
      room.mines[i].emitter.minecount--;
      room.mines.splice(i, 1);
      i -= 1;
      continue mining;
    }
  }
}

function kill(killer, killed, room, type) {
  killed.alive = false;
  killer.round_stats.stats.kills++;
  killed.round_stats.stats.deaths++;
  room.nbliving--;
  room.sounds.kill = true;
  io.to(room.name).emit("player-kill", [killer.name, killed.name], type);
  io.to(room.name).emit("player_explosion", {
    x: killed.position.x + killed.size.w / 2,
    y: killed.position.y + killed.size.h / 2,
  });
}

async function create_room(name, rounds, list_id, creator) {
  room = new Room(name, rounds, list_id, creator);
  room.maxplayernb = await get_max_players(list_id);
  rooms.push(room);
  if (room) {
    loadlevel(room.levels[0], room);
  }
  room_list(0);
  //console.log(rooms);
}
//Create the default room and load the first level
rooms = [];

create_room("6 players", 10, [2, 3, 4], "GAME MASTER");

setTimeout(() => {
  create_room("2 players", 10, [1], "GAME MASTERs");
}, 10000);

//make an id for the server
function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

serverid = makeid(15);
console.log(serverid);
