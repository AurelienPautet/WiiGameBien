const mvtspeed = 3;
const { io } = require(__dirname + "/server.js");

const {
  rectRect,
  detectCollision,
  colliderect,
  distance,
  rectanglesSeTouchent,
} = require(__dirname + "/check_collision.js");

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
      w: 60,
      h: 33,
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
    if (this.alive) {
      this.velocity = this.direction;
    }
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

    if (this.velocity.x != 0 && this.velocity.y != 0) {
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
      w: 60,
      h: 33,
    };
    this.angle = angle;
    this.alive = alive;
    this.rotation = rotation;
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

class Room {
  //room class that contains all the players, the blocks, the bullets, the mines, the collision boxes, the levelset and the levelid
  //the room class also contains the sounds that are played in the room
  constructor(name, rounds, levels, creator) {
    this.name = name;
    this.waitingrespawn = false;
    this.atleast2 = false;
    this.maxplayernb = 0;
    this.levels = levels;
    this.rounds = rounds;
    this.creator = creator;
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

module.exports = {
  Player,
  CollisonsBox,
  Bullet,
  Block,
  Frontend_Player,
  Mine,
  Room,
};
