class possible_shot_points {
  constructor(
    initial_position,
    initial_angle,
    step_size,
    radius,
    initial_player
  ) {
    this.initial_player = initial_player;
    this.initial_position = initial_position;
    this.position = {
      x: initial_position.x + 35 * Math.cos(initial_angle),
      y: initial_position.y + 35 * Math.sin(initial_angle),
    };
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

    for (let i = 0; i < mines.length; i++) {
      const mine = mines[i];
      if (
        rectRect2(
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
        this.draw("yellow");

        return;
      }
    }

    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];
      if (
        rectRect2(
          this.position.x,
          this.position.y,
          this.radius * 2,
          this.radius * 2,
          bullet.position.x,
          bullet.position.y,
          bullet.size.w,
          bullet.size.h
        )
      ) {
        this.bounce = 4;
        this.draw("blue");

        return;
      }
    }

    for (socketid in players) {
      player = players[socketid];
      if (player.socketid == this.initial_player.socketid) {
        if (
          rectRect2(
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
          this.draw("orange");

          return;
        }
      }
      if (
        player.alive &&
        rectRect2(
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
        this.draw("green");

        return;
      }
    }

    Bcollision.forEach((block) => {
      const res = detectCollisions2(
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
      this.draw("red");
    });
    this.calls++;
  }
  draw(color) {
    c.beginPath();
    c.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
    c.fillStyle = color;
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

function rectRect2(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
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

function detectCollisions2(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
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

if (typeof module === "object" && module.exports) {
  // Node.js environment
  console.log("Loading level_loader.js in Node.js environment");
  module.exports = {
    launch_possible_shots,
  };
} else {
  // Browser environment
  console.log("Loading level_loader.js in browser environment");
  if (!window.launch_possible_shots) {
    window.launch_possible_shots = launch_possible_shots;
  }
}
