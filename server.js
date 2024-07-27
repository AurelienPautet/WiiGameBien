const express = require("express");
const app = express();

app.use(express.static("public"));
const PORT = process.env.PORT || 9000;
console.log(PORT);
const expressServer = app.listen(PORT);

const socketio = require("socket.io");
const io = socketio(expressServer, {
  cors: [
    "http://localhost:9000",
    "https://wiitank-2aacc4abc5cb.herokuapp.com/",
  ],
});

io.on("connect", (socket) => {
  console.log(socket.id, "has joined our server!");
  socket.emit("welcome", socket.id + "has joinded the server");

  socket.on("disconnect", function () {
    console.log(socket.id, "Got disconnect!");
    var i = ids.indexOf(socket.id);
    if ((i) => 0) {
      for (let e = i + 1; e < players.length; e++) {
        io.to(ids[e]).emit("id", e - 1);
      }
      players.splice(i, 1);
      ids.splice(i, 1);
      nbliving--;
    }
  });

  if (players.length == 0) {
    loadlevel("./level1.json");
  }
  if (players.length === 0) {
    //someone is about to be added to players. Start tick-tocking
    //tick-tock - issue an event to EVERY connected socket, that is playing the game, 60 times per second
    tickTockInterval = setInterval(() => {
      if (nbliving <= 1) {
        players.forEach((player) => {
          player.alive = true;
          player.spawn();
        });
        nbliving = players.length;
      }

      for (let i = 0; i < mines.length; i++) {
        mines[i].update();
        if (mines[i].timealive > 300) {
          for (let m = 0; m < blocks.length; m++) {
            if (blocks[m].type == 2) {
              if (
                distance(
                  mines[i].position,
                  { w: mines[i].radius, h: mines[i].radius },
                  blocks[m].position,
                  blocks[m].size
                ) <= 15000
              ) {
                blocklist[
                  (blocks[m].position.y / 50) * 23 + blocks[m].position.x / 50
                ] = 10;
                generateBcollision();
                blocks.splice(m, 1);
                m -= 1;
              }
            }
          }
          for (let m = 0; m < players.length; m++) {
            if (
              distance(
                mines[i].position,
                { w: mines[i].radius, h: mines[i].radius },
                players[m].position,
                players[m].size
              ) <= 15000 &&
              players[m].alive
            ) {
              players[m].alive = false;
              nbliving--;
            }
          }
          mines[i].emitter.minecount--;
          mines.splice(i, 1);
          i -= 1;
        }
      }

      for (let i = 0; i < bullets.length; i++) {
        bullets[i].update();
        if (bullets[i].bounce >= 3) {
          bullets[i].emitter.bulletcount--;
          bullets.splice(i, 1);
          i -= 1;
          continue;
        }
        for (let e = 0; e < bullets.length; e++) {
          if (
            rectRect(
              bullets[e].x,
              bullets[e].y,
              bullets[e].w,
              bullets[e].h,
              bullets[i].x,
              bullets[i].y,
              bullets[i].w,
              bullets[i].h
            ) &&
            i != e
          ) {
            bullets[i].emitter.bulletcount--;
            bullets[e].emitter.bulletcount--;
            bullets.splice(i, 1);
            bullets.splice(e, 1);
            console.log("collisun");
            if (e < i) {
              i -= 1;
            }
            i -= 1;

            break;
          }
        }
        for (let e = 0; e < players.length; e++) {
          if (players[e].BulletCollision(bullets[i]) && players[e].alive) {
            bullets[i].emitter.bulletcount--;
            bullets.splice(i, 1);
            i -= 1;
            players[e].alive = false;
            nbliving--;
            break;
          }
        }
      }
      io.emit("tick", players, blocks, Bcollision, bullets, mines); // send the event to the "game" room
    }, 16.67);
  }
  socket.on("play", (playerName) => {
    if (players.length < spawns.length) {
      spawnid = Math.floor(Math.random() * spawns.length);
      const player = new Player(spawns[spawnid], socket.id);
      nbliving += 1;
      player.spawnpos = spawns[spawnid];
      players.push(player);
      ids.push(socket.id);
      socket.emit("id", ids.length - 1);
    }
  });

  socket.on("tock", (data) => {
    if (players[data.playerid] != undefined) {
      if (data.direction != undefined) {
        players[data.playerid].direction = data.direction;
      }
      if (data.aim != undefined) {
        players[data.playerid].aim = data.aim;
      }
      players[data.playerid].update();
      if (data.click) {
        players[data.playerid].shoot();
      }
      if (data.plant) {
        players[data.playerid].plant();
      }
    }
  });
});

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

class Player {
  constructor(position, socketid) {
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
      w: 48,
      h: 48,
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
  shoot() {
    this.endofbarrel();
    if (this.bulletcount < 5 && this.alive) {
      this.bulletcount++;
      bullets.push(
        new Bullet({ x: this.endpos.x, y: this.endpos.y }, this.angle, 4, this)
      );
    }
  }
  plant() {
    if (this.minecount < 3 && this.alive) {
      this.minecount++;
      mines.push(
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

  update() {
    this.CalculateAngle();

    //change the angle of the image depending on the mvt direction
    this.velocity = this.direction;
    for (let i = 0; i < Bcollision.length; i++) {
      this.BodyCollision(Bcollision[i]);
    }
    for (let i = 0; i < players.length; i++) {
      if (this != players[i]) {
        this.BodyCollision(players[i]);
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
      w: 17,
      h: 12,
    };
    this.bounce = 0;
    this.emitter = emitter;
  }
  update() {
    for (let i = 0; i < Bcollision.length; i++) {
      this.collision_walls(Bcollision[i]);
    }
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }
  collision_walls(obj) {
    this.side = colliderect(
      this.position.y + this.velocity.y,
      this.position.x + this.velocity.x,
      this.size.w,
      this.size.h,
      obj.position.y,
      obj.position.x,
      obj.size.w,
      obj.size.h,
      4
    );
    if (this.side == "right") {
      this.bounce += 1;
      this.velocity.x = -this.velocity.x;
      this.angle = 180 - this.angle;
    }
    if (this.side == "left") {
      this.bounce += 1;
      this.velocity.x = -this.velocity.x;
      this.angle = 180 - this.angle;
    }
    if (this.side == "up") {
      this.bounce += 1;
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
    }
    if (this.side == "down") {
      this.bounce += 1;
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
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

const mvtspeed = 3;

players = [];
ids = [];
blocks = [];
Bcollision = [];
bullets = [];
mines = [];
spawns = [];
nbliving = 0;
gamestate = { players, blocks, Bcollision, bullets, mines };
let MouseX = 0;
let MouseY = 0;

function loadlevel(name) {
  var my_JSON_object = require(name);
  blocklist = my_JSON_object["layers"][0]["data"];
  blocks = [];
  spawns = [];

  for (let l = 0; l <= 16; l++) {
    for (let c = 0; c <= 23; c++) {
      if (blocklist[l * 23 + c] == 1) {
        blocks.push(new Block({ x: c * 50, y: l * 50 }, 1));
      }
      if (blocklist[l * 23 + c] == 2) {
        blocks.push(new Block({ x: c * 50, y: l * 50 }, 2));
      }
      if (blocklist[l * 23 + c] == 3) {
        spawns.push({ x: c * 50, y: l * 50 });
      }
    }
  }
  generateBcollision();
}

function generateBcollision() {
  boxed = [];
  i = 0;
  Bcollision = [];
  while (i < blocklist.length) {
    l = 1;
    col = 1;
    if (
      (blocklist[i] == 1 || blocklist[i] == 2) &&
      boxed.includes(i) == false
    ) {
      while (
        (blocklist[i + l] == 1 || blocklist[i + l] == 2) &&
        (i % 23) + l < 23 &&
        boxed.includes(i + 1) == false
      ) {
        l++;
      }
      while (
        (blocklist[i + 23 * col] == 1 || blocklist[i + 23 * col] == 2) &&
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
      Bcollision.push(
        new CollisonsBox(
          { x: (i % 23) * 50, y: Math.floor(i / 23) * 50 },
          { w: l * 50, h: col * 50 }
        )
      );
    }
    i++;
  }
  boxed = [];
  for (let i = 0; i < Bcollision.length; i++) {
    for (let e = 0; e < Bcollision.length; e++) {
      if (
        i != e &&
        Bcollision[i].position.x === Bcollision[e].position.x &&
        Bcollision[i].position.y + Bcollision[i].size.h ===
          Bcollision[e].position.y &&
        Bcollision[i].size.w === Bcollision[e].size.w
      ) {
        Bcollision.push(
          new CollisonsBox(
            {
              x: Bcollision[i].position.x,
              y: Bcollision[i].position.y,
            },
            {
              w: Bcollision[i].size.w,
              h: Bcollision[i].size.h + Bcollision[e].size.h,
            }
          )
        );
        if (i > e) {
          Bcollision.splice(i, 1);
          Bcollision.splice(e, 1);
        } else {
          Bcollision.splice(e, 1);
          Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  for (let i = 0; i < Bcollision.length; i++) {
    for (let e = 0; e < Bcollision.length; e++) {
      if (
        i != e &&
        Bcollision[i].position.y === Bcollision[e].position.y &&
        Bcollision[i].position.x + Bcollision[e].size.w ===
          Bcollision[e].position.x &&
        Bcollision[i].size.h === Bcollision[e].size.h
      ) {
        Bcollision.push(
          new CollisonsBox(
            {
              x: Bcollision[i].position.x,
              y: Bcollision[i].position.y,
            },
            {
              w: Bcollision[i].size.w + Bcollision[e].size.w,
              h: Bcollision[i].size.h,
            }
          )
        );
        if (i > e) {
          Bcollision.splice(i, 1);
          Bcollision.splice(e, 1);
        } else {
          Bcollision.splice(e, 1);
          Bcollision.splice(i, 1);
        }
        i = 0;
        e = 0;
      }
    }
  }
  console.log(Bcollision.length);
}

function rectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  // are the sides of one rectangle touching the other?

  if (
    r1x + r1w >= r2x && // r1 right edge past r2 left
    r1x <= r2x + r2w && // r1 left edge past r2 right
    r1y + r1h >= r2y && // r1 top edge past r2 bottom
    r1y <= r2y + r2h
  ) {
    // r1 bottom edge past r2 top
    return true;
  }
  return false;
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
