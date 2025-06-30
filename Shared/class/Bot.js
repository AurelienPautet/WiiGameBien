class Bot extends Player {
  constructor(position, socketid, name, turretc, bodyc) {
    super(position, socketid, name, turretc, bodyc);

    this.killing_aims = [];
    this.last_shoot = {
      mytick: 15,
      angle: 0,
    };

    this.turretc = turretc;
    this.bodyc = bodyc;

    this.last_random_move = 0;
    this.desired_angle = 2.4;
    this.idle_desired_angle = 2.4;

    this.should_go_to = {
      right: false,
      left: false,
      up: false,
      down: false,
    };
    this.wall_go_to = {
      right: false,
      left: false,
      up: false,
      down: false,
    };
    this.idle_should_go_to = {
      right: false,
      left: false,
      up: false,
      down: false,
    };
    this.mine_go_to = false;

    this.possible_shot_step = 10;
    this.min_interval_shoot = 140;
    this.max_rotation_speed = Math.PI / 180;
    this.max_bulletcount = 3;
    this.shoot_speed = 5;
    this.precision = 0.7; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.can = {
      move: true,
      shoot: true,
      plant: true,
      spam: true,
    };

    this.move_proba = {
      right: 0,
      left: 0,
      up: 0,
      down: 0,
    };
    this.mvtspeed = 3;

    this.player_is = {
      right: false,
      left: false,
      up: false,
      down: false,
    };

    this.wall_coef = 0.2;
    this.player_coef = 0.1;
    this.old_dir_coef = 0.5;
    this.opposit_dir_coef = 0.1;

    this.mytick = Math.floor(Math.random() * this.min_interval_shoot);

    /*     this.min_interval_shoot = 5;
    this.max_rotation_speed = Math.PI / 120;
    this.max_bulletcount = 200;
    this.shoot_speed = 4;
    this.precision = 0.1; //default 0.2
    this.number_of_rays = 50;
    this.bullet_size = {
      w: 7,
      h: 7,
    };
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.shoot_max_bounce = 2;
    this.can = {
      move: true,
      shoot: true,
      plant: true,
      spam: false,
    }; */
    // Bot parameters
    /*    
    TURRRET HIGH SHOOTS
this.min_interval_shoot = 8;
    this.max_rotation_speed = Math.PI / 200;
    this.max_bulletcount = 30;
    this.shoot_speed = 4;
    this.precision = 0.8; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.shoot_max_bounce = 1;
    this.can = {
      move: false,
      shoot: true,
      plant: true,
      spam: false,
    }; */

    //PRECISE SNIPER
    /*     this.min_interval_shoot = 40;
    this.max_rotation_speed = Math.PI / 120;
    this.max_bulletcount = 1;
    this.shoot_speed = 7;
    this.precision = 0.5; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.can = {
      move: false,
      shoot: true,
      plant: true,
      spam: false,
    }; */
  }

  update(room, fps_corector) {
    super.update(room, fps_corector);
    if (this.alive) {
      if (this.can.move) {
        this.move(room);
      }
      if (this.can.shoot) {
        this.aim_and_shoot();
      }
    }
  }

  get_closest_human_player(room) {
    let closest = null;
    let minDistance = Infinity;

    for (let socketid of room.human_players) {
      let player = room.players[socketid];
      if (player && player.alive) {
        let distance = this.get_distance(player.position, this.position);
        if (distance < minDistance) {
          minDistance = distance;
          closest = player;
        }
      }
    }
    return closest;
  }

  get_distance(pos1, pos2) {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  random_should_go_to(room) {
    this.move_proba = {
      right: 0,
      left: 0,
      up: 0,
      down: 0,
    };

    let closest = this.get_closest_human_player(room);
    this.player_is = {
      right: false,
      left: false,
      up: false,
      down: false,
    };

    if (closest && closest.alive) {
      this.player_is = {
        right: closest.position.x > this.position.x,
        left: closest.position.x < this.position.x,
        up: closest.position.y < this.position.y,
        down: closest.position.y > this.position.y,
      };
    }

    if (Math.random() < (this.mine_go_to ? 0 : 0)) {
      this.idle_should_go_to = {
        right: false,
        left: false,
        up: false,
        down: false,
      };
    } else {
      this.move_proba = {
        right:
          this.wall_go_to.right * this.wall_coef +
          this.player_is.right * this.player_coef +
          this.idle_should_go_to.right * this.old_dir_coef -
          this.opposit_dir_coef * this.should_go_to.left,
        left:
          this.wall_go_to.left * this.wall_coef +
          this.player_is.left * this.player_coef +
          this.idle_should_go_to.left * this.old_dir_coef -
          this.opposit_dir_coef * this.should_go_to.right,
        up:
          this.wall_go_to.up * this.wall_coef +
          this.player_is.up * this.player_coef +
          this.idle_should_go_to.up * this.old_dir_coef -
          this.opposit_dir_coef * this.should_go_to.down,
        down:
          this.wall_go_to.down * this.wall_coef +
          this.player_is.down * this.player_coef +
          this.idle_should_go_to.down * this.old_dir_coef -
          this.opposit_dir_coef * this.should_go_to.up,
      };
      this.idle_should_go_to = {
        right: Math.random() < this.move_proba.right,
        left: Math.random() < this.move_proba.left,
        up: Math.random() < this.move_proba.up,
        down: Math.random() < this.move_proba.down,
      };
    }
    this.wall_go_to = {
      right: false,
      left: false,
      up: false,
      down: false,
    };
    this.mine_go_to = false;
  }

  is_all_false_should_go_to() {
    return (
      !this.should_go_to.right &&
      !this.should_go_to.left &&
      !this.should_go_to.up &&
      !this.should_go_to.down
    );
  }

  move() {
    if (this.mytick % 5 === 0) {
      this.should_go_to = {
        right: false,
        left: false,
        up: false,
        down: false,
      };
      launch_possible_moves({ w: 50, h: 50 }, this);
      this.direction.x = 0;
      this.direction.y = 0;

      if (this.is_all_false_should_go_to()) {
        if (this.mytick - this.last_random_move > 20) {
          this.random_should_go_to(room);
          this.last_random_move = this.mytick;
        }
        this.should_go_to = structuredClone(this.idle_should_go_to);
      }
    }

    if (this.should_go_to.right) {
      this.direction.x = this.mvtspeed;
    }
    if (this.should_go_to.left) {
      this.direction.x = -this.mvtspeed;
    }
    if (this.should_go_to.up) {
      this.direction.y = -this.mvtspeed;
    }
    if (this.should_go_to.down) {
      this.direction.y = this.mvtspeed;
    }
  }

  aim_and_shoot() {
    if (this.mytick % 5 === 0) {
      this.killing_aims = [];

      launch_possible_shots(
        this.number_of_rays,
        this.steps_of_rays,
        this.bullet_size.w / 2,
        this,
        {
          bullets: false,
          debug: false,
        }
      );
      this.killing_aims.sort(
        (a, b) => a.distance - b.distance + 0.1 * (a.angle - b.angle)
      );
    }

    if (this.killing_aims && this.killing_aims.length > 0) {
      let i = 0;

      if (!this.can.spam) {
        let difference = Math.abs(
          this.angleDifference(
            this.last_shoot.angle,
            this.killing_aims[i].angle
          )
        );

        while (
          i < this.killing_aims.length - 1 &&
          difference < Math.PI + 0.05 &&
          difference > Math.PI - 0.05
        ) {
          i++;
          difference = Math.abs(
            this.angleDifference(
              this.last_shoot.angle,
              this.killing_aims[i].angle
            )
          );
        }
      }
      if (i < this.killing_aims.length) {
        /*           console.log(
          "Bot1 is aiming at",
          this.killing_aims[i].angle,
          "with distance",
          this.killing_aims[i].distance
        ); */
        const closestTarget = this.killing_aims[i];

        this.desired_angle = closestTarget.angle;
        this.aim_to_angle(this.desired_angle);

        if (this.mytick - this.last_shoot.mytick > this.min_interval_shoot) {
          let difference = Math.abs(
            this.angleDifference(this.angle, this.desired_angle)
          );

          if (
            difference < Math.PI + this.precision &&
            difference > Math.PI - this.precision
          ) {
            this.shoot();
          }
        }
      }
    } else {
      this.aim_to_angle(this.idle_desired_angle);
      if (this.angleDifference(this.angle, this.idle_desired_angle) < 0.1) {
        this.idle_desired_angle = (Math.random() - 0.5) * Math.PI * 2;
      }
    }
  }

  angleDifference(current, target) {
    current = current % (Math.PI * 2);
    target = target % (Math.PI * 2);
    let diff = (target - current + Math.PI) % (2 * Math.PI);
    if (diff < 0) diff += 2 * Math.PI;
    return diff - Math.PI;
  }

  aim_to_angle(angle) {
    if (this.angleDifference(this.angle, angle) < -this.max_rotation_speed)
      this.angle = this.angle + this.max_rotation_speed;
    else if (this.angleDifference(this.angle, angle) > this.max_rotation_speed)
      this.angle = this.angle - this.max_rotation_speed;
    else this.angle = angle % (Math.PI * 2);
  }

  CalculateAngle() {
    return this.angle;
  }

  shoot() {
    super.shoot(localroom);
    this.last_shoot.mytick = this.mytick;
    this.last_shoot.angle = this.angle;
  }
}
