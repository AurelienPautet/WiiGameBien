const express = require("express");
const app = express();

const fs = require("fs");
const path = require("path");

app.use(express.static("Public"));
const PORT = process.env.PORT || 7000;
console.log(PORT);
const expressServer = app.listen(PORT);

const socketio = require("socket.io");
const io = socketio(expressServer, {
  cors: [
    "http://localhost:7000",
    "https://wiitank-2aacc4abc5cb.herokuapp.com/",
    "https://wiitank.pautet.net/",
  ],
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

io.on("connect", (socket) => {
  room_list(socket);
  socket.join("lobby" + serverid);

  console.log(socket.id, "has joined our server!");
  socket.emit("welcome", socket.id + "has joinded the server");
  socket.emit("serverid", serverid);
  socket.emit("levelset", levelssetnames);

  socket.on("disconnect", function () {
    console.log(socket.id, "Got disconnect!");
    let roomsf = 0;
    let i = -1;
    room_list(0);

    rooms.forEach((r) => {
      e = r.ids.indexOf(socket.id);
      if (e > -1) {
        i = e;
        roomsf = r;
      }
    });
    if (roomsf === 0) {
      console.log("fuck");
    } else {
    }
    if (i != undefined && i > -1 && roomsf != undefined) {
      for (let e = i + 1; e < roomsf.players.length; e++) {
        io.to(roomsf.ids[e]).emit("id", e - 1);
      }
      io.to(roomsf.name).emit("player-disconnection", roomsf.players[i].name);

      roomsf.players.splice(i, 1);
      roomsf.ids.splice(i, 1);

      roomsf.nbliving--;
    }
  });

  socket.on("new-room", (name, set) => {
    res = levelsset.find((item) => item.levelset === set);

    room = new Room(name, res.levelslist, res.levelset);
    rooms.push(room);
    level = path.join(__dirname, "./", "levels", room.leveldir, room.levels[0]);
    loadlevel(level, room);
    room_list(0);
  });

  socket.on("play", (playerName, turretc, bodyc, room_name) => {
    room = rooms.find((item) => item.name === room_name);

    if (
      room.ids.includes(socket.id) == false &&
      room.players.length < room.maxplayernb
    ) {
      spawnid = Math.floor(Math.random() * room.spawns.length);
      const player = new Player(
        room.spawns[spawnid],
        socket.id,
        playerName,
        turretc,
        bodyc
      );
      room.nbliving += 1;
      player.spawnpos = room.spawns[spawnid];
      room.spawns.splice(spawnid, 1);
      room.players.push(player);
      room.ids.push(socket.id);
      socket.emit("id", room.ids.length - 1);
      socket.leave("lobby" + serverid);
      socket.join(room.name);
      io.to(room.name).emit("player-connection", playerName);
      socket.emit("level_change", room.blocks, room.Bcollision);
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
        room.players[data.playerid] != undefined
      ) {
        if (data.direction != undefined) {
          room.players[data.playerid].direction = data.direction;
        }
        if (data.aim != undefined) {
          room.players[data.playerid].aim = data.aim;
        }
        // players[data.playerid].update();
        if (data.click) {
          room.players[data.playerid].shoot(room);
        }
        if (data.plant) {
          room.players[data.playerid].plant(room);
        }
      }
    } else {
      socket.emit("wrongserver");
    }
  });
});

tickTockInterval = setTimeout(function toocking() {
  func = setTimeout(toocking, 16.67);
  rooms.forEach((room) => {
    if (room.players.length >= 2) {
      room.atleast2 = true;
    }
    if (room.players.length <= 1) {
      room.atleast2 = false;
    }
    if (room.waitingrespawn == false && room.nbliving <= 1) {
      if (room.atleast2) {
        if (room.nbliving == 1) {
          room.players.forEach((player) => {
            if (player.alive) {
              io.to(room.name).emit("winner", player.name, waitingtime);
            }
          });
        } else {
          io.to(room.name).emit("draw", waitingtime);
        }
        room.waitingrespawn = true;
        respawnwait = setTimeout(() => {
          room.bullets = [];
          room.mines = [];
          level = path.join(
            __dirname,
            "./",
            "levels",
            room.leveldir,
            room.levels[room.levelid]
          );
          loadlevel(level, room);
          io.to(room.name).emit("level_change", room.blocks, room.Bcollision);
          room.players.forEach((player) => {
            player.alive = true;
            player.minecount = 0;
            player.bulletcount = 0;
            spawnid = Math.floor(Math.random() * room.spawns.length);
            player.spawnpos = room.spawns[spawnid];
            room.spawns.splice(spawnid, 1);
            player.spawn();
          });
          room.nbliving = room.players.length;
          room.waitingrespawn = false;

          if (room.levelid < room.levels.length - 1) {
            room.levelid++;
          } else {
            room.levelid = 0;
          }
        }, waitingtime);
      }
    }

    //update the mines
    mining: for (let i = 0; i < room.mines.length; i++) {
      room.mines[i].update();
      if (room.mines[i].timealive > timetoeplode) {
        for (let m = 0; m < room.blocks.length; m++) {
          if (room.blocks[m].type == 2) {
            if (
              distance(
                room.mines[i].position,
                { w: room.mines[i].radius, h: room.mines[i].radius },
                room.blocks[m].position,
                room.blocks[m].size
              ) <=
              90 ** 2
            ) {
              room.blocklist[
                (room.blocks[m].position.y / 50) * 23 +
                  room.blocks[m].position.x / 50
              ] = 10;
              generateBcollision(room);
              room.blocks.splice(m, 1);
              io.to(room.name).emit(
                "level_change",
                room.blocks,
                room.Bcollision
              );

              m -= 1;
            }
          }
        }
        for (let e = 0; e < room.mines.length; e++) {
          if (
            distance(
              room.mines[i].position,
              { w: room.mines[i].radius, h: room.mines[i].radius },
              room.mines[e].position,
              { w: room.mines[e].radius, h: room.mines[e].radius }
            ) <=
            90 ** 2
          ) {
            room.mines[e].timealive = timetoeplode;
          }
        }
        for (let m = 0; m < room.players.length; m++) {
          if (
            distance(
              room.mines[i].position,
              { w: room.mines[i].radius, h: room.mines[i].radius },
              room.players[m].position,
              room.players[m].size
            ) <=
              90 ** 2 &&
            room.players[m].alive
          ) {
            kill(room.mines[i].emitter, room.players[m], room, "mine");
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

    bulleting: for (let i = 0; i < room.bullets.length; i++) {
      room.bullets[i].update(room);
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
            room.mines[e].position.x,
            room.mines[e].position.y,
            room.mines[e].radius,
            room.mines[e].radius,
            room.bullets[i].position.x,
            room.bullets[i].position.y,
            room.bullets[i].size.w,
            room.bullets[i].size.h
          )
        ) {
          room.mines[e].timealive = timetoeplode;
          room.bullets[i].emitter.bulletcount--;
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
          room.bullets[e].emitter.bulletcount--;
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
      for (let e = 0; e < room.players.length; e++) {
        if (
          room.players[e].BulletCollision(room.bullets[i]) &&
          room.players[e].alive
        ) {
          room.bullets[i].emitter.bulletcount--;
          kill(room.bullets[i].emitter, room.players[e], room, "bullet");
          room.bullets.splice(i, 1);
          i -= 1;

          continue bulleting;
        }
      }
    }
    room.frontend_players = [];
    room.players.forEach((player) => {
      player.update(room);

      room.frontend_players.push(
        new Frontend_Player(
          player.position,
          player.socketid,
          player.name,
          player.turretc,
          player.bodyc,
          player.angle,
          player.alive,
          player.rotation
        )
      );
    });
    io.to(room.name).emit(
      "tick",
      room.frontend_players,
      room.bullets,
      room.mines,
      room.name
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
  rooms.forEach((room) => {
    room_names.push(room.name);
    room_players.push(room.players.length + "/" + room.maxplayernb);
  });
  console.log("room_list");
  if (socket != 0) {
    socket.emit("room_list", room_names, room_players);
  } else {
    io.to("lobby" + serverid).emit("room_list", room_names, room_players);
  }
}

//important constants for the game
const waitingtime = 3000;
const timetoeplode = 300;

//Read the levels folder and create all the different levelsets
levelsset = [];
levelssetnames = [];
fs.readdir(path.join(__dirname, "./", "levels"), (err, files) => {
  if (err) console.log(err);
  else {
    files.forEach((file) => {
      levelssetnames.push(file);
      fs.readdir(
        path.join(__dirname, "./", "levels", file),
        (levelerr, levelfiles) => {
          if (levelerr) console.log(levelerr);
          else {
            levelsset.push({
              levelset: file,
              levelslist: levelfiles,
            });
          }
        }
      );
    });
  }
});

function kill(killer, killed, room, type) {
  killed.alive = false;
  room.nbliving--;
  room.sounds.kill = true;
  io.to(room.name).emit("player-kill", [killer.name, killed.name], type);
  io.to(room.name).emit("player_explosion", {
    x: killed.position.x + killed.size.w / 2,
    y: killed.position.y + killed.size.h / 2,
  });
}

//Create the default room and load the first level
base_room = new Room(
  "Default",
  ["level1.json", "level2.json", "level3.json", "level4.json", "level5.json"],
  "Cartes 2 Joueurs bis"
);
rooms = [base_room];
level = path.join(
  __dirname,
  "./",
  "levels",
  base_room.leveldir,
  base_room.levels[0]
);
loadlevel(level, base_room);

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
