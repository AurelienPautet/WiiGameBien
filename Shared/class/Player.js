try {
  ({
    rectRect,
    colliderect,
  } = require("../../Shared/scripts/check_collision.js"));
  Bullet = require("../../Shared/class/Bullet.js");
  Mine = require("../../Shared/class/Mine.js");
  Stats = require("../../Shared/class/Stats.js");
} catch (e) {
  console.error("Error requiring dependencies in Player.js:", e);
}

class Player {
  constructor(position, socketid, name, turretc, bodyc) {
    this.name = name;
    this.bodyc = bodyc;
    this.turretc = turretc;
    this.position = position;
    this.socketid = socketid;
    this.mytick = 0;
    this.mvtspeed = 3;
    this.round_stats = new Stats();
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
    this.max_bulletcount = 5;
    this.max_minecount = 3;
    this.mvtspeed = 3;
    this.shoot_speed = 6;
    this.shoot_max_bounce = 3;
    this.bullet_size = {
      w: 15,
      h: 15,
    };
  }
  spawn() {
    this.position = structuredClone(this.spawnpos);
  }
  shoot(room) {
    this.endofbarrel();
    if (this.bulletcount < this.max_bulletcount && this.alive) {
      new Bullet(
        { x: this.endpos.x, y: this.endpos.y },
        this.angle,
        this.shoot_speed,
        this.bullet_size,
        this.shoot_max_bounce,
        this,
        room
      );
    }
  }
  plant(room) {
    if (this.minecount < this.max_minecount && this.alive) {
      new Mine(
        {
          x: this.position.x + this.size.w / 2,
          y: this.position.y + this.size.h / 2,
        },
        this,
        room
      );
    }
  }

  update(room, fps_corector) {
    this.CalculateAngle();
    //this.alive = true;

    this.mytick++;
    //change the angle of the image depending on the mvt direction
    if (this.alive) {
      if (this.direction.x > 0) {
        this.velocity.x = this.mvtspeed;
      } else if (this.direction.x < 0) {
        this.velocity.x = -this.mvtspeed;
      } else {
        this.velocity.x = 0;
      }
      if (this.direction.y > 0) {
        this.velocity.y = this.mvtspeed;
      } else if (this.direction.y < 0) {
        this.velocity.y = -this.mvtspeed;
      } else {
        this.velocity.y = 0;
      }
    }
    for (let i = 0; i < room.Bcollision.length; i++) {
      this.BodyCollision(room.Bcollision[i]);
    }
    for (let socket_id in room.players) {
      if (room.players[socket_id].alive && this != room.players[socket_id]) {
        this.BodyCollision(room.players[socket_id]);
      }
    }
    for (let i = 0; i < room.holes.length; i++) {
      this.BodyCollision(room.holes[i]);
    }

    if (this.velocity.x > 0) {
      this.rotation = 0;
    } else if (this.velocity.x < 0) {
      this.rotation = 0;
    } else if (this.velocity.y < 0) {
      this.rotation = 90;
    } else if (this.velocity.y > 0) {
      this.rotation = 90;
    }
    if (this.velocity.x < 0 && this.velocity.y < 0) {
      this.rotation = 45;
    } else if (this.velocity.x > 0 && this.velocity.y < 0) {
      this.rotation = -45;
    } else if (this.velocity.x > 0 && this.velocity.y > 0) {
      this.rotation = 45;
    } else if (this.velocity.x < 0 && this.velocity.y > 0) {
      this.rotation = -45;
    }

    //handle the movement

    if (this.velocity.x != 0 && this.velocity.y != 0) {
      this.velocity.x = this.velocity.x / Math.sqrt(2);
      this.velocity.y = this.velocity.y / Math.sqrt(2);
    }
    if (this.alive) {
      this.position.x += this.velocity.x * fps_corector;
      this.position.y += this.velocity.y * fps_corector;
    }
  }
  endofbarrel() {
    this.endpos.x =
      this.position.x +
      this.size.w / 2 -
      (30 + this.bullet_size.w * 1) * Math.cos(this.angle);
    this.endpos.y =
      this.position.y +
      this.size.h / 2 -
      (30 + this.bullet_size.h * 1) * Math.sin(this.angle);
  }
  CalculateAngle() {
    let adjacent = this.aim.x - (this.position.x + this.size.w / 2);
    let opposite = this.aim.y - (this.position.y + this.size.h / 2);
    let angle = Math.atan(opposite / adjacent);
    if (adjacent < 0) {
      this.angle = angle;
    } else {
      this.angle = angle + Math.PI;
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

try {
  module.exports = Player;
} catch (e) {
  console.error("Error exporting Player class:", e);
}
