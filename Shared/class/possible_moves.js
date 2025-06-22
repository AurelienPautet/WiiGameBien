class possible_moves {
  constructor(position, size, bot, direction) {
    this.position = { x: position.x, y: position.y };
    this.size = size;
    this.bot = bot;
    this.direction = direction;
    this.should_go = false;

    this.bullet = direction.includes("bullet");
    this.wall = direction.includes("wall");
    this.mine = direction.includes("mine");
  }

  update_state() {
    if (this.bullet) {
      for (let i = 0; i < bullets.length; i++) {
        if (this.should_go) {
          continue; // If already set to go, skip further checks
        }
        const bullet = bullets[i];
        if (bullet.emitter === this.bot && bullet.mytick < 15) {
          continue; // Skip if the bullet is emitted by the same bot
        }
        if (
          rectRect2(
            this.position.x,
            this.position.y,
            this.size.w,
            this.size.h,
            bullet.position.x,
            bullet.position.y,
            bullet.size.w,
            bullet.size.h
          )
        ) {
          this.should_go = true;
        }
      }
      if (this.should_go) {
        if (this.direction.includes("right")) {
          this.bot.should_go_to.right = this.should_go;
        }
        if (this.direction.includes("up")) {
          this.bot.should_go_to.up = this.should_go;
        }
        if (this.direction.includes("down")) {
          this.bot.should_go_to.down = this.should_go;
        }
        if (this.direction.includes("left")) {
          this.bot.should_go_to.left = this.should_go;
        }
      }
    }
    if (this.wall) {
      for (let i = 0; i < Bcollision.length; i++) {
        const block = Bcollision[i];
        if (
          rectRect2(
            this.position.x,
            this.position.y,
            this.size.w,
            this.size.h,
            block.position.x,
            block.position.y,
            block.size.w,
            block.size.h
          )
        ) {
          this.should_go = true;
        }
      }
      if (this.should_go) {
        if (this.direction.includes("right")) {
          this.bot.wall_go_to.right = this.should_go;
        }
        if (this.direction.includes("up")) {
          this.bot.wall_go_to.up = this.should_go;
        }
        if (this.direction.includes("down")) {
          this.bot.wall_go_to.down = this.should_go;
        }
        if (this.direction.includes("left")) {
          this.bot.wall_go_to.left = this.should_go;
        }
      }
    }

    if (this.mine) {
      for (let i = 0; i < mines.length; i++) {
        const mine = mines[i];
        if (
          rectRect2(
            this.position.x,
            this.position.y,
            this.size.w,
            this.size.h,
            mine.position.x - mine.radius,
            mine.position.y - mine.radius,
            mine.radius * 2,
            mine.radius * 2
          )
        ) {
          this.should_go = true;
        }
      }
      if (this.should_go) {
        this.bot.mine_go_to = this.should_go;
      }
    }
    this.draw();
  }

  draw() {
    let color = "black";
    c.globalAlpha = 0.5;
    if (this.bullet) {
      color = "green";
    } else if (this.wall) {
      color = "blue";
    }
    if (this.should_go) {
      color = "red";
    }
    if (debug_visual) {
      c.fillStyle = color;
      c.fillRect(this.position.x, this.position.y, this.size.w, this.size.h);
    }
    c.globalAlpha = 1;
  }
}

console.log("possible_moves.js loaded");

function launch_possible_moves(size, bot) {
  new possible_moves(
    {
      x: bot.position.x + bot.size.w / 2 - 160,
      y: bot.position.y + bot.size.h / 2 - 160,
    },
    { w: 320, h: 320 },
    bot,
    "mine"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + bot.size.w,
      y: bot.position.y + 4,
    },
    { w: size.w * 1.3, h: size.h - 4 * 2 },
    bot,
    "wall left"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x - size.w * 1.3,
      y: bot.position.y + 4,
    },
    { w: size.w * 1.3, h: size.h - 4 * 2 },
    bot,
    "wall right"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + 4,
      y: bot.position.y - size.h * 1.3,
    },
    { w: size.w - 4 * 2, h: size.h * 1.3 },
    bot,
    "wall down"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + 4,
      y: bot.position.y + bot.size.h,
    },
    { w: size.w - 4 * 2, h: size.h * 1.3 },
    bot,
    "wall up"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + bot.size.w,
      y: bot.position.y,
    },
    size,
    bot,
    "bullet left"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x - size.w,
      y: bot.position.y,
    },
    size,
    bot,
    "bullet right"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x,
      y: bot.position.y - size.h,
    },
    size,
    bot,
    "bullet down"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x,
      y: bot.position.y + bot.size.h,
    },
    size,
    bot,
    "bullet up"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x - bot.size.w / 2 - bot.size.w / 2,
      y: bot.position.y - bot.size.h / 2 - bot.size.h / 2,
    },
    size,
    bot,
    "bullet down right"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + bot.size.w * 1.5 - bot.size.w / 2,
      y: bot.position.y - bot.size.h / 2 - bot.size.h / 2,
    },
    size,
    bot,
    "bullet down left"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x + bot.size.w * 1.5 - bot.size.w / 2,
      y: bot.position.y + bot.size.h * 1.5 - bot.size.h / 2,
    },
    size,
    bot,
    "bullet up left"
  ).update_state();
  new possible_moves(
    {
      x: bot.position.x - bot.size.w / 2 - bot.size.w / 2,
      y: bot.position.y + bot.size.h * 1.5 - bot.size.h / 2,
    },
    size,
    bot,
    "bullet up right"
  ).update_state();
}

if (typeof module === "object" && module.exports) {
  console.log("Loading level_loader.js in Node.js environment");
  module.exports = {
    launch_possible_moves,
  };
} else {
  console.log("Loading level_loader.js in browser environment");
  if (!window.launch_possible_moves) {
    window.launch_possible_moves = launch_possible_moves;
  }
}
