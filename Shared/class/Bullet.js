const { detectCollision } = require("../../Shared/scripts/check_collision.js");

class Bullet {
  constructor(position, angle, speed, emitter, room) {
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
    this.emitter.bulletcount++;
    this.emitter.round_stats.stats.shots++;
    room.sounds.shoot = true;
    room.bullets.push(this);
    room.emit_to_room("shoot_explosion", {
      position: {
        x: this.emitter.endpos.x,
        y: this.emitter.endpos.y,
      },
      angle: this.emitter.angle,
    });
  }
  update(room, fps_corector) {
    for (let i = 0; i < room.Bcollision.length; i++) {
      this.collision_walls(room.Bcollision[i], room);
    }
    this.position.x += this.velocity.x * fps_corector;
    this.position.y += this.velocity.y * fps_corector;
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
        room.emit_to_room("ricochet_explosion", {
          position: {
            x: this.position.x + this.size.w,
            y: this.position.y,
          },
          angle: this.angle,
        });
      }
    } else if (this.side == "left") {
      this.velocity.x = -this.velocity.x;
      this.angle = 180 - this.angle;
      if (this.bounce < 3) {
        room.emit_to_room("ricochet_explosion", {
          position: {
            x: this.position.x,
            y: this.position.y,
          },
          angle: this.angle,
        });
      }
    } else if (this.side == "up") {
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
      if (this.bounce < 3) {
        room.emit_to_room("ricochet_explosion", {
          position: {
            x: this.position.x,
            y: this.position.y,
          },
          angle: this.angle,
        });
      }
    } else if (this.side == "down") {
      this.velocity.y = -this.velocity.y;
      this.angle = -this.angle;
      if (this.bounce < 3) {
        room.emit_to_room("ricochet_explosion", {
          position: {
            x: this.position.x,
            y: this.position.y + this.size.h,
          },
          angle: this.angle,
        });
      }
    }
  }
}

try {
  module.exports = Bullet;
} catch (error) {
  console.error("Error exporting Bullet class:", error);
}
