class Bot1 extends Player {
  constructor(position, socketid, name, turretc, bodyc) {
    super(position, socketid, name, turretc, bodyc);
    this.killing_aims = [];
    this.last_shoot = {
      mytick: 15,
      angle: 0,
    };
    this.min_interval_shoot = 15;
    this.desired_angle = 2.4;
    this.idle_desired_angle = 2.4;
    this.angle_increments = Math.PI / 120;
    this.precision = 0.2;
  }

  update(room, fps_corector) {
    super.update(room, fps_corector);
    if (this.alive) {
      launch_possible_shots(50, 15, 15, this, {
        bullets: false,
      });

      this.killing_aims.sort((a, b) => a.distance - b.distance);

      if (this.killing_aims && this.killing_aims.length > 0) {
        let i = 0;
        let difference = Math.abs(
          this.angleDifference(
            this.last_shoot.angle,
            this.killing_aims[i].angle
          )
        );

        while (
          i < this.killing_aims.length &&
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
          this.idle_desired_angle =
            this.idle_desired_angle + (Math.random() - 0.5) * 40;
        }
      }
    }
    this.killing_aims = [];
  }

  angleDifference(current, target) {
    current = current % (Math.PI * 2);
    target = target % (Math.PI * 2);
    let diff = (target - current + Math.PI) % (2 * Math.PI);
    if (diff < 0) diff += 2 * Math.PI;
    return diff - Math.PI;
  }

  aim_to_angle(angle) {
    if (this.angleDifference(this.angle, angle) < -this.angle_increments)
      this.angle = this.angle + this.angle_increments;
    else if (this.angleDifference(this.angle, angle) > this.angle_increments)
      this.angle = this.angle - this.angle_increments;
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
