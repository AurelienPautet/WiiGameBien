const canvas = document.getElementById("the_canvas");
const fading_canvas = document.getElementById("the_fading_canvas");
const c = canvas.getContext("2d");
const fc = fading_canvas.getContext("2d");

canvas.width = 1150;
canvas.height = 800;
fading_canvas.width = 1150;
fading_canvas.height = 800;

debug = "rgba(255, 0, 0, 0)";

body_blue = new Image();
body_blue.src = "ressources/image/tank_player/body_blue.png";
turret_blue = new Image();
turret_blue.src = "ressources/image/tank_player/turret_blue.png";
body_orange = new Image();
body_orange.src = "ressources/image/tank_player/body_orange.png";
turret_orange = new Image();
turret_orange.src = "ressources/image/tank_player/turret_orange.png";
body_green = new Image();
body_green.src = "ressources/image/tank_player/body_green.png";
turret_green = new Image();
turret_green.src = "ressources/image/tank_player/turret_green.png";
body_red = new Image();
body_red.src = "ressources/image/tank_player/body_red.png";
turret_red = new Image();
turret_red.src = "ressources/image/tank_player/turret_red.png";
body_violet = new Image();
body_violet.src = "ressources/image/tank_player/body_violet.png";
turret_violet = new Image();
turret_violet.src = "ressources/image/tank_player/turret_violet.png";
body_yellow = new Image();
body_yellow.src = "ressources/image/tank_player/body_yellow.png";
turret_yellow = new Image();
turret_yellow.src = "ressources/image/tank_player/turret_yellow.png";
body_blueF = new Image();
body_blueF.src = "ressources/image/tank_player/body_blueF.png";
turret_blueF = new Image();
turret_blueF.src = "ressources/image/tank_player/turret_blueF.png";
body_turquoise = new Image();
body_turquoise.src = "ressources/image/tank_player/body_turquoise.png";
turret_turquoise = new Image();
turret_turquoise.src = "ressources/image/tank_player/turret_turquoise.png";
body_violetF = new Image();
body_violetF.src = "ressources/image/tank_player/body_violetF.png";
turret_violetF = new Image();
turret_violetF.src = "ressources/image/tank_player/turret_violetF.png";

let theme = 6;
let maxtheme = 6;

block1 = new Image();
block2 = new Image();
bullet1 = new Image();
bg = new Image();
dead = new Image();

editor_block1 = document.getElementById("editor_block1");
editor_block2 = document.getElementById("editor_block2");
editor_block3 = document.getElementById("editor_block3");
editor_block4 = document.getElementById("editor_block4");

dead.src = "ressources/image/dead.png";

loadtheme(theme);
function loadtheme() {
  editor_block1.src = `ressources/image/block/Cube${theme}-1.png`;
  editor_block2.src = `ressources/image/block/Cube${theme}-2.png`;
  block1.src = `ressources/image/block/Cube${theme}-1.png`;
  block2.src = `ressources/image/block/Cube${theme}-2.png`;
  bullet1.src = `ressources/image/bullet/bullet-${theme}.png`;
  bg.src = `ressources/image/bg${theme}.png`;
}

draw();
fc.globalAlpha = 0.05;
c.globalAlpha = 1;

function draw() {
  window.requestAnimationFrame(draw);
  fc.drawImage(bg, 0, 0, fading_canvas.width, fading_canvas.height);
  c.clearRect(0, 0, canvas.width, canvas.height);

  mines.forEach((mine) => {
    if (mine.timealive > 220) {
      if (mine.timealive % 10 < 5) {
        mine.color = "yellow";
      } else {
        mine.color = "red";
      }
      if (mine.timealive % 10 == 5) {
        playsound(fuses, sound_fuse);
      }
      if (mine.timealive > 260) {
        if (mine.timealive % 6 < 3) {
          mine.color = "yellow";
        } else {
          mine.color = "red";
        }
        if (mine.timealive % 6 == 3) {
          playsound(fuses, sound_fuse);
        }
        if (mine.timealive == 300) {
          playsound(fuses, sound_fuse);
        }
      }
    }
    c.beginPath();
    c.arc(mine.position.x, mine.position.y, mine.radius, 0, Math.PI * 2);
    c.fillStyle = mine.color;
    c.fill();
    c.closePath();
  });

  blocks.forEach((block) => {
    if (block.type == 1) {
      /*       fc.drawImage(
        block1,
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h
      ); */
      c.drawImage(
        block1,
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h
      );
    }
    if (block.type == 2) {
      /*       fc.drawImage(
        block2,
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h
      ); */
      c.drawImage(
        block2,
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h
      );
    }
  });
  if (debug_visual) {
    c.beginPath();

    c.strokeStyle = "red";

    c.fillStyle = "rgba(255, 0, 0, 0.01)";

    Bcollision.forEach((Bcol) => {
      c.rect(Bcol.position.x, Bcol.position.y, Bcol.size.w, Bcol.size.h);
      c.fill();
      c.stroke();
    });
  }

  bullets.forEach((bullet) => {
    if (debug_visual) {
      c.beginPath();
      c.fillStyle = "rgba(255,0,0,0.4)";
      c.strokeStyle = "red";
      c.rect(
        bullet.position.x,
        bullet.position.y,
        bullet.size.w,
        bullet.size.h
      );
      fc.fill();
      fc.stroke();
    }
    drawImageRot(
      fc,
      bullet1,
      bullet.position.x,
      bullet.position.y,
      bullet.size.w,
      bullet.size.h,
      bullet.angle
    );
    drawImageRot(
      c,
      bullet1,
      bullet.position.x,
      bullet.position.y,
      bullet.size.w,
      bullet.size.h,
      bullet.angle
    );
  });

  for (socketid in players) {
    player = players[socketid];
    if (player.alive) {
      drawImageRot(
        c,
        eval("body_" + player.bodyc),
        player.position.x,
        player.position.y,
        player.size.w,
        player.size.h,
        player.rotation
      );

      /*       drawImageRot(
        fc,
        eval("body_" + playqqer.bodyc),
        player.position.x,
        player.position.y,
        player.size.w,
        player.size.h,
        player.rotation
      );
 */
      drawTurretRot(
        eval("turret_" + player.turretc),
        player.position.x,
        player.position.y,
        player.turretsize.w,
        player.turretsize.h,
        player.angle
      );
    } else {
      drawImageRot(
        fc,
        dead,
        player.position.x,
        player.position.y,
        player.size.w,
        player.size.h,
        player.rotation
      );
    }
    if (debug_visual) {
      c.beginPath();

      c.fillStyle = "rgba(255,0,0,0.4)";
      c.strokeStyle = "red";

      c.rect(
        player.position.x,
        player.position.y,
        player.size.w,
        player.size.h
      );
      c.fill();
      c.stroke();
    }
  }

  for (let e = 0; e < particles.length; e++) {
    if (particles[e].timealive < particles[e].timelife) {
      particles[e].update();
    } else {
      particles.splice(e, 1);
      e -= 1;
    }
  }

  for (let e = 0; e < chockwaves.length; e++) {
    if (chockwaves[e].timealive < chockwaves[e].timelife) {
      chockwaves[e].update();
    } else {
      chockwaves.splice(e, 1);
      e -= 1;
    }
  }

  if (debug_visual) {
    launch_possible_shots(50, 10, 10);
  }
}

function drawImageRot(c, img, x, y, width, height, deg) {
  c.save();
  var rad = (deg * Math.PI) / 180;
  c.translate(x + width / 2, y + height / 2);
  c.rotate(rad);
  c.drawImage(img, (width / 2) * -1, (height / 2) * -1, width, height);
  c.restore();
}

function drawTextRot(text, x, y, width, height, deg) {
  c.save();
  var rad = (deg * Math.PI) / 180;
  c.translate(x + width / 2, y + height / 2);
  c.rotate(rad);
  c.fillText(text, (width / 2) * -1, (height / 2) * -1);
  c.restore();
}

function drawTurretRot(img, x, y, width, height, deg) {
  c.save();
  var rad = (deg * Math.PI) / 180;
  c.translate(x + 0.4 * width, y + height * 0.6);
  c.rotate(rad);
  c.drawImage(img, -0.75 * width, (height / 2) * -1, width, height);
  c.restore();
}

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
