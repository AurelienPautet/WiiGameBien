class possible_shot_points {
  constructor(
    initial_position,
    initial_angle,
    step_size,
    radius,
    initial_player
  ) {
    this.initial_player = structuredClone(initial_player);
    this.initial_position = structuredClone(initial_position);
    this.position = structuredClone(initial_position);
    this.position.x = initial_position.x + 35 * Math.cos(initial_angle);
    this.position.y = initial_position.y + 35 * Math.sin(initial_angle);
    this.angle = initial_angle;
    this.bounce = 0;
    this.step_size = step_size;
    this.radius = radius;
    this.calls = 0;
  }

  update_repeat(N) {
    for (let i = 0; i < N; i++) {
      if (this.bounce > 3) {
        return;
      }
      if (i % 100 == 0) {
      }
      this.update_position();
    }
  }

  update_position() {
    if (this.bounce > 3) {
      return;
    }
    this.position = {
      x: this.position.x + this.step_size * Math.cos(this.angle),
      y: this.position.y + this.step_size * Math.sin(this.angle),
    };

    mines.forEach((mine) => {
      if (
        rectRect(
          this.position.x,
          this.position.y,
          this.radius * 2,
          this.radius * 2,
          mine.position.x - mine.radius,
          mine.position.y - mine.radius,
          mine.radius * 2,
          mine.radius * 2
        )
      ) {
        this.bounce = 4;
        this.draw();

        return;
      }
    });

    bullets.forEach((bullet) => {
      if (
        rectRect(
          this.position.x,
          this.position.y,
          this.radius * 2,
          this.radius * 2,
          bullet.position.x - bullet.radius,
          bullet.position.y - bullet.radius,
          bullet.radius * 2,
          bullet.radius * 2
        )
      ) {
        this.bounce = 4;
        this.draw();

        return;
      }
    });

    for (socketid in players) {
      player = players[socketid];
      if (player.socketid == this.initial_player.socketid) {
        continue;
      }
      if (
        player.alive &&
        rectRect(
          this.position.x,
          this.position.y,
          this.radius * 2,
          this.radius * 2,
          player.position.x,
          player.position.y,
          player.size.w,
          player.size.h
        )
      ) {
        this.bounce = 4;
        this.draw();

        return;
      }
    }

    Bcollision.forEach((block) => {
      const res = detectCollisions(
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h,
        this.position.x,
        this.position.y,
        this.radius * 2,
        this.radius * 2
      );
      if (res === "left") {
        this.angle = Math.PI - this.angle;
        this.bounce++;
      } else if (res === "right") {
        this.angle = Math.PI - this.angle;
        this.bounce++;
      } else if (res === "top") {
        this.angle = -this.angle;
        this.bounce++;
      } else if (res === "bottom") {
        this.angle = -this.angle;
        this.bounce++;
      }
      if (res === "") {
        return;
      }
      this.draw();
    });
    this.calls++;
  }
  draw() {
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    c.fillStyle = this.bounce > 3 ? "blue" : "red";
    c.fill();
    c.closePath();
  }
}

function launch_possible_shots(N, step_size, radius) {
  for (socketid in players) {
    player = players[socketid];
    for (let i = 0; i < N; i++) {
      const angle = (i * Math.PI * 2) / N;

      const shot = new possible_shot_points(
        {
          x: player.position.x + player.size.w / 2,
          y: player.position.y + player.size.h / 2,
        },
        angle,
        step_size,
        radius,
        player
      );
      shot.update_repeat(10000);
    }
  }
}

launch_possible_shots(10, 1, 5);

function rectRect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  if (
    r1x + r1w >= r2x &&
    r1x <= r2x + r2w &&
    r1y + r1h >= r2y &&
    r1y <= r2y + r2h
  ) {
    return true;
  }
  return false;
}

function detectCollisions(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  if (
    r1x + r1w >= r2x &&
    r1x <= r2x + r2w &&
    r1y + r1h >= r2y &&
    r1y <= r2y + r2h
  ) {
    const overlapLeft = r1x + r1w - r2x;
    const overlapRight = r2x + r2w - r1x;
    const overlapTop = r1y + r1h - r2y;
    const overlapBottom = r2y + r2h - r1y;

    const minOverlap = Math.min(
      overlapLeft,
      overlapRight,
      overlapTop,
      overlapBottom
    );

    if (minOverlap === overlapLeft) return "left";
    if (minOverlap === overlapRight) return "right";
    if (minOverlap === overlapTop) return "top";
    if (minOverlap === overlapBottom) return "bottom";
  }
  return "";
}
