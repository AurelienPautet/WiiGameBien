const express = require("express");
const app = express();

const fs = require("fs");

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

const path = require("path");

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

  //someone is about to be added to players. Start tick-tocking
  //tick-tock - issue an event to EVERY connected socket, that is playing the game, 60 times per second

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
    if (room.waitingrepawn == false && room.nbliving <= 1) {
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
        room.waitingrepawn = true;
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
          room.waitingrepawn = false;

          if (room.levelid < room.levels.length - 1) {
            room.levelid++;
          } else {
            room.levelid = 0;
          }
        }, waitingtime);
      }
    }

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
}, 16.67);

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

const mvtspeed = 3;
const waitingtime = 3000;
const timetoeplode = 300;

class Room {
  constructor(name, levels, leveldir) {
    this.name = name;
    this.waitingrepawn = false;
    this.atleast2 = false;
    this.maxplayernb = 0;
    this.levels = levels;
    this.leveldir = leveldir;

    this.sounds = {
      plant: false,
      kill: false,
      shoot: false,
      ricochet: false,
      explose: false,
    };
    this.levelid = 0;
    this.players = [];
    this.frontend_players = [];
    this.ids = [];
    this.blocks = [];
    this.Bcollision = [];
    this.bullets = [];
    this.mines = [];
    this.spawns = [];
    this.nbliving = 0;
  }
}
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
/* waitingrepawn = false;
atleast2 = false;
maxplayernb = 0;
levels = ["level4.json", "level2.json", "level3.json", "level4.json"];
sounds = { plant: false, kill: false, shoot: false, ricochet: false };
levelid = 0;
players = [];
frontend_players = [];
ids = [];
blocks = [];
Bcollision = [];
bullets = [];
room.mines = [];
spawns = [];
nbliving = 0; */

class Block {
  constructor(position, type) {
    this.position = position;
    this.size = {
      w: 50,
      h: 50,
    };
    this.type = type;
  }
}

class Frontend_Player {
  constructor(
    position,
    socketid,
    name,
    turretc,
    bodyc,
    angle,
    alive,
    rotation
  ) {
    this.name = name;
    this.bodyc = bodyc;
    this.turretc = turretc;
    this.position = position;
    this.socketid = socketid;
    this.size = {
      w: 48,
      h: 48,
    };
    this.turretsize = {
      w: 70,
      h: 40,
    };
    this.angle = angle;
    this.alive = alive;
    this.rotation = rotation;
  }
}

class Player {
  constructor(position, socketid, name, turretc, bodyc) {
    this.name = name;
    this.bodyc = bodyc;
    this.turretc = turretc;
    this.position = position;
    this.socketid = socketid;
    this.spawnpos = {
      x: 0,
      y: 0,
    };
    this.velocity = {
      x: 0,
      y: 0,
    };
    this.size = {
      w: 45,
      h: 45,
    };
    this.turretsize = {
      w: 70,
      h: 40,
    };
    this.angle = 0;
    this.endpos = {
      x: 0,
      y: 0,
    };
    this.direction = {
      x: 0,
      y: 0,
    };
    this.bulletcount = 0;
    this.minecount = 0;
    this.aim = {
      x: 0,
      y: 0,
    };
    this.alive = true;
  }
  spawn() {
    this.position = structuredClone(this.spawnpos);
  }
  shoot(room) {
    this.endofbarrel();
    if (this.bulletcount < 5 && this.alive) {
      room.sounds.shoot = true;

      this.bulletcount++;
      room.bullets.push(
        new Bullet({ x: this.endpos.x, y: this.endpos.y }, this.angle, 6, this)
      );
      io.to(room.name).emit(
        "shoot_explosion",
        {
          x: this.endpos.x,
          y: this.endpos.y,
        },
        this.angle
      );
    }
  }
  plant(room) {
    if (this.minecount < 3 && this.alive) {
      room.sounds.plant = true;

      this.minecount++;
      room.mines.push(
        new Mine(
          {
            x: this.position.x + this.size.w / 2,
            y: this.position.y + this.size.h / 2,
          },
          this
        )
      );
    }
  }

  update(room) {
    this.CalculateAngle();

    //change the angle of the image depending on the mvt direction
    this.velocity = this.direction;
    for (let i = 0; i < room.Bcollision.length; i++) {
      this.BodyCollision(room.Bcollision[i]);
    }
    for (let i = 0; i < room.players.length; i++) {
      if (room.players[i].alive && this != room.players[i]) {
        this.BodyCollision(room.players[i]);
      }
    }
    if (this.velocity.x == mvtspeed) {
      this.rotation = 0;
    } else if (this.velocity.x == -mvtspeed) {
      this.rotation = 0;
    } else if (this.velocity.y == -mvtspeed) {
      this.rotation = 90;
    } else if (this.velocity.y == mvtspeed) {
      this.rotation = 90;
    }
    if (this.velocity.x == -mvtspeed && this.velocity.y == -mvtspeed) {
      this.rotation = 45;
    } else if (this.velocity.x == mvtspeed && this.velocity.y == -mvtspeed) {
      this.rotation = -45;
    } else if (this.velocity.x == mvtspeed && this.velocity.y == mvtspeed) {
      this.rotation = 45;
    } else if (this.velocity.x == -mvtspeed && this.velocity.y == mvtspeed) {
      this.rotation = -45;
    }

    //handle the movement

    if (this.velocity.x != 0 && this.velocity.x != 0) {
      this.velocity.x = this.velocity.x / Math.sqrt(2);
      this.velocity.y = this.velocity.y / Math.sqrt(2);
    }
    if (this.alive) {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
    }
  }
  endofbarrel() {
    this.endpos.x = this.position.x + 2.5 * (this.size.w / 6);
    this.endpos.y = this.position.y + 2.5 * (this.size.h / 6);
    this.hyp = 45;
    this.endpos.x -= Math.cos(this.angle * (Math.PI / 180)) * this.hyp;
    this.endpos.y -= Math.sin(this.angle * (Math.PI / 180)) * this.hyp;
  }
  CalculateAngle() {
    let adjacent = this.aim.x - (this.position.x + this.size.w / 2);
    let opposite = this.aim.y - (this.position.y + this.size.h / 2);
    let angle = Math.atan(opposite / adjacent);
    if (adjacent < 0) {
      this.angle = (angle * 180) / Math.PI;
    } else {
      this.angle = (angle * 180) / Math.PI + 180;
    }
  }
  BulletCollision(obj) {
    return (this.side = rectRect(
      this.position.y,
      this.position.x,
      this.size.w,
      this.size.h,
      obj.position.y,
      obj.position.x,
      obj.size.w,
      obj.size.h
    ));
  }
  BodyCollision(obj) {
    this.side = colliderect(
      this.position.y,
      this.position.x,
      this.size.w,
      this.size.h,
      obj.position.y,
      obj.position.x,
      obj.size.w,
      obj.size.h,
      3
    );
    if (this.side == "right") {
      if (this.velocity.x > 0) this.velocity.x = 0;
    }
    if (this.side == "left") {
      if (this.velocity.x < 0) this.velocity.x = 0;
    }
    if (this.side == "up") {
      if (this.velocity.y < 0) this.velocity.y = 0;
    }
    if (this.side == "down") {
      if (this.velocity.y > 0) this.velocity.y = 0;
    }
  }
}

class CollisonsBox {
  constructor(position, size) {
    this.position = position;
    this.size = size;
  }
  draw() {
    c.strokeStyle = debug;
    c.rect(this.position.x, this.position.y, this.size.w, this.size.h);
    c.strokeStyle = "black";
    c.strokeRect(this.position.x, this.position.y, this.size.w, this.size.h);
  }
}

class Bullet {
  constructor(position, angle, speed, emitter) {
    this.position = position;
    this.velocity = {
      x: -Math.cos((angle * 3.14) / 180) * speed,
      y: -Math.sin((angle * 3.14) / 180) * speed,
    };
    this.angle = angle;
    this.size = {
      w: 15,
      h: 10,
    };
    this.bounce = 0;
    this.emitter = emitter;
  }
  update(room) {
    for (let i = 0; i < room.Bcollision.length; i++) {
      this.collision_walls(room.Bcollision[i], room);
    }
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }
  collision_walls(obj, room) {
    /*this.side = colliderect(
      this.position.y + 2 * this.velocity.y,
      this.position.x + 2 * this.velocity.x,
      this.size.w,
      this.size.h,
      obj.position.y,
      obj.position.x,
      obj.size.w,
      obj.size.h,
      0
    );*/
    this.side = detectCollision(this, obj, this.velocity);
    if (this.side != "") {
      room.sounds.ricochet = true;
      this.bounce += 1;
    }
    if (this.side == "right") {
      this.velocity.x = -this.velocity.x;
      this.angle = 180 - this.angle;
      if (this.bounce < 3) {
        io.to(room.name).emit(
          "ricochet_explosion",
          {
            x: this.position.x + this.size.w,
            y: this.position.y,
          },
          this.angle
        );
      }
    } else if (this.side == "left") {
      this.velocity.x = -this.velocity.x;
      this.angle = 180 - this.angle;
      if (this.bounce < 3) {
        io.to(room.name).emit(
          "ricochet_explosion",
          {
            x: this.position.x,
            y: this.position.y,
          },
          this.angle
        );
      }
    } else if (this.side == "up") {
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
      if (this.bounce < 3) {
        io.to(room.name).emit(
          "ricochet_explosion",
          {
            x: this.position.x,
            y: this.position.y,
          },
          this.angle
        );
      }
    } else if (this.side == "down") {
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
      if (this.bounce < 3) {
        io.to(room.name).emit(
          "ricochet_explosion",
          {
            x: this.position.x,
            y: this.position.y + this.size.h,
          },
          this.angle
        );
      }
    }
  }
}

class Mine {
  constructor(position, emitter) {
    this.position = position;
    this.radius = 15;
    this.timealive = 0;
    this.color = "yellow";
    this.emitter = emitter;
  }

  update() {
    this.timealive++;
  }
}

function loadlevel(name, room) {
  var my_JSON_object = require(name);
  blocklist_json = my_JSON_object["layers"][0]["data"];
  room.blocklist = [...blocklist_json];
  room.blocks = [];
  room.spawns = [];

  for (let l = 0; l <= 16; l++) {
    for (let c = 0; c <= 23; c++) {
      if (room.blocklist[l * 23 + c] == 1) {
        room.blocks.push(new Block({ x: c * 50, y: l * 50 }, 1));
      }
      if (room.blocklist[l * 23 + c] == 2) {
        room.blocks.push(new Block({ x: c * 50, y: l * 50 }, 2));
      }
      if (room.blocklist[l * 23 + c] == 3) {
        room.spawns.push({ x: c * 50, y: l * 50 });
      }
    }
  }
  room.maxplayernb = room.spawns.length;
  generateBcollision(room);
}

function generateBcollision(room) {
  boxed = [];
  i = 0;
  room.Bcollision = [];
  while (i < room.blocklist.length) {
    l = 1;
    col = 1;
    if (
      (room.blocklist[i] == 1 || room.blocklist[i] == 2) &&
      boxed.includes(i) == false
    ) {
      while (
        (room.blocklist[i + l] == 1 || room.blocklist[i + l] == 2) &&
        (i % 23) + l < 23 &&
        boxed.includes(i + l) == false
      ) {
        l++;
      }
      while (
        (room.blocklist[i + 23 * col] == 1 ||
          room.blocklist[i + 23 * col] == 2) &&
        Math.floor(i / 23) + col < 16 &&
        boxed.includes(i + 23 * col) == false
      ) {
        col++;
      }
      if (col > l) {
        l = 1;
        for (let b = 0; b < col; b++) {
          boxed.push(i + b * 23);
        }
      } else {
        col = 1;
        for (let b = 0; b < l; b++) {
          boxed.push(i + b);
        }
      }
      room.Bcollision.push(
        new CollisonsBox(
          { x: (i % 23) * 50, y: Math.floor(i / 23) * 50 },
          { w: l * 50, h: col * 50 }
        )
      );
    }
    i++;
  }
  boxed = [];
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.x === room.Bcollision[e].position.x &&
        room.Bcollision[i].position.y + room.Bcollision[i].size.h ===
          room.Bcollision[e].position.y &&
        room.Bcollision[i].size.w === room.Bcollision[e].size.w
      ) {
        room.Bcollision.push(
          new CollisonsBox(
            {
              x: room.Bcollision[i].position.x,
              y: room.Bcollision[i].position.y,
            },
            {
              w: room.Bcollision[i].size.w,
              h: room.Bcollision[i].size.h + room.Bcollision[e].size.h,
            }
          )
        );
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.y === room.Bcollision[e].position.y &&
        room.Bcollision[i].position.x + room.Bcollision[i].size.w ===
          room.Bcollision[e].position.x &&
        room.Bcollision[i].size.h === room.Bcollision[e].size.h
      ) {
        room.Bcollision.push(
          new CollisonsBox(
            {
              x: room.Bcollision[i].position.x,
              y: room.Bcollision[i].position.y,
            },
            {
              w: room.Bcollision[i].size.w + room.Bcollision[e].size.w,
              h: room.Bcollision[i].size.h,
            }
          )
        );
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  for (let i = 0; i < room.Bcollision.length; i++) {
    for (let e = 0; e < room.Bcollision.length; e++) {
      if (
        i != e &&
        room.Bcollision[i].position.x === room.Bcollision[e].position.x &&
        room.Bcollision[i].position.y === room.Bcollision[e].position.y &&
        room.Bcollision[i].size.w === room.Bcollision[e].size.w &&
        room.Bcollision[i].size.h === room.Bcollision[e].size.h
      ) {
        if (i > e) {
          room.Bcollision.splice(i, 1);
          room.Bcollision.splice(e, 1);
        } else {
          room.Bcollision.splice(e, 1);
          room.Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
}

function rectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  // are the sides of one rectangle touching the other?

  if (
    r1x + r1w >= r2x && // r1 right edge past r2 left
    r1x <= r2x + r2w && // r1 left edge past r2 right
    r1y + r1h >= r2y && // r1 top edge past r2 bottom
    r1y <= r2y + r2h
  ) {
    return true;
  }
  return false;
}

function detectCollision(rect1, rect2, velocity1) {
  // Vérifier s'il position.y a une collision
  if (
    rect1.position.x + velocity1.x + velocity1.x <
      rect2.position.x + rect2.size.w &&
    rect1.position.x + velocity1.x + rect1.size.w > rect2.position.x &&
    rect1.position.y + velocity1.y < rect2.position.y + rect2.size.h &&
    rect1.position.y + velocity1.y + rect1.size.h > rect2.position.y
  ) {
    // Calculer les distances entre les bords des rectangles
    let overlapLeft = rect2.position.x + rect2.size.w - rect1.position.x;
    let overlapRight =
      rect1.position.x + velocity1.x + rect1.size.w - rect2.position.x;
    let overlapTop =
      rect2.position.y + rect2.size.h - rect1.position.y + velocity1.y;
    let overlapBottom =
      rect1.position.y + velocity1.y + rect1.size.h - rect2.position.y;

    // Déterminer le côté de collision en trouvant la plus petite distance de chevauchement
    let minOverlap = Math.min(
      overlapLeft,
      overlapRight,
      overlapTop,
      overlapBottom
    );

    if (minOverlap === overlapLeft) {
      return "left";
    } else if (minOverlap === overlapRight) {
      return "right";
    } else if (minOverlap === overlapTop) {
      return "up";
    } else {
      return "down";
    }
  }

  // S'il n't a pas de collision, retourner null
  return "";
}

function colliderect(
  rect1t,
  rect1l,
  rect1w,
  rect1h,
  rect2t,
  rect2l,
  rect2w,
  rect2h,
  offset
) {
  /* collide up */
  if (
    (rect1t - offset < rect2t + rect2h &&
      rect1t - offset > rect2t &&
      rect1l < rect2l + rect2w &&
      rect1l > rect2l) ||
    (rect1t - offset < rect2t + rect2h &&
      rect1t - offset > rect2t &&
      rect1l + rect1w / 2 < rect2l + rect2w &&
      rect1l + rect1w / 2 > rect2l) ||
    (rect1t - offset < rect2t + rect2h &&
      rect1t - offset > rect2t &&
      rect1l + rect1w < rect2l + rect2w &&
      rect1l + rect1w > rect2l)
  ) {
    return "up";
  }
  /* collide down */
  if (
    (rect1t + offset + rect1h < rect2t + rect2h &&
      rect1t + offset + rect1h > rect2t &&
      rect1l < rect2l + rect2w &&
      rect1l > rect2l) ||
    (rect1t + offset + rect1h < rect2t + rect2h &&
      rect1t + offset + rect1h > rect2t &&
      rect1l + rect1w / 2 < rect2l + rect2w &&
      rect1l + rect1w / 2 > rect2l) ||
    (rect1t + offset + rect1h < rect2t + rect2h &&
      rect1t + offset + rect1h > rect2t &&
      rect1l + rect1w < rect2l + rect2w &&
      rect1l + rect1w > rect2l)
  ) {
    return "down";
  }
  /* collide left */
  if (
    (rect1t < rect2t + rect2h &&
      rect1t > rect2t &&
      rect1l - offset < rect2l + rect2w &&
      rect1l - offset > rect2l) ||
    (rect1t + rect1h / 2 < rect2t + rect2h &&
      rect1t + rect1h / 2 > rect2t &&
      rect1l - offset < rect2l + rect2w &&
      rect1l - offset > rect2l) ||
    (rect1t + rect1h < rect2t + rect2h &&
      rect1t + rect1h > rect2t &&
      rect1l - offset < rect2l + rect2w &&
      rect1l - offset > rect2l)
  ) {
    return "left";
  }

  /* collide right */
  if (
    (rect1t < rect2t + rect2h &&
      rect1t > rect2t &&
      rect1l + offset + rect1w < rect2l + rect2w &&
      rect1l + offset + rect1w > rect2l) ||
    (rect1t + rect1h / 2 < rect2t + rect2h &&
      rect1t + rect1h / 2 > rect2t &&
      rect1l + offset + rect1w < rect2l + rect2w &&
      rect1l + offset + rect1w > rect2l) ||
    (rect1t + rect1h < rect2t + rect2h &&
      rect1t + rect1h > rect2t &&
      rect1l + offset + rect1w < rect2l + rect2w &&
      rect1l + offset + rect1w > rect2l)
  ) {
    return "right";
  }
  return "";
}

function distance(position1, size1, position2, size2) {
  return (
    (position1.x + size1.w / 2 - position2.x - size2.w / 2) ** 2 +
    (position1.y + size1.h / 2 - position2.y - size2.h / 2) ** 2
  );
}

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

function rectanglesSeTouchent(
  x1,
  y1,
  width1,
  height1,
  x2,
  y2,
  width2,
  height2
) {
  // Vérifier les conditions d'intersection directe
  const horizontale = x1 < x2 + width2 && x1 + width1 > x2;
  const verticale = y1 < y2 + height2 && y1 + height1 > y2;

  return horizontale && verticale;
}

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
