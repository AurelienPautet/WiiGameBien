const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1150;
canvas.height = 800;

debug = "rgba(255, 0, 0, 0)";
//debug = "rgba(255, 0, 0, 0)";

dead = new Image();
dead.src = "image/dead.png";

//BLUE
body_blue = new Image();
body_blue.src = "image/tank_player/body_blue.png";
turret_blue = new Image();
turret_blue.src = "image/tank_player/turret_blue.png";

//ORANGE
body_orange = new Image();
body_orange.src = "image/tank_player/body_orange.png";
turret_orange = new Image();
turret_orange.src = "image/tank_player/turret_orange.png";

//GREEN
body_green = new Image();
body_green.src = "image/tank_player/body_green.png";
turret_green = new Image();
turret_green.src = "image/tank_player/turret_green.png";
//RED
body_red = new Image();
body_red.src = "image/tank_player/body_red.png";
turret_red = new Image();
turret_red.src = "image/tank_player/turret_red.png";
//VIOLET
body_violet = new Image();
body_violet.src = "image/tank_player/body_violet.png";
turret_violet = new Image();
turret_violet.src = "image/tank_player/turret_violet.png";
//YELLOW
body_yellow = new Image();
body_yellow.src = "image/tank_player/body_yellow.png";
turret_yellow = new Image();
turret_yellow.src = "image/tank_player/turret_yellow.png";
//BLUEF
body_blueF = new Image();
body_blueF.src = "image/tank_player/body_blueF.png";
turret_blueF = new Image();
turret_blueF.src = "image/tank_player/turret_blueF.png";
//TURQUOISE
body_turquoise = new Image();
body_turquoise.src = "image/tank_player/body_turquoise.png";
turret_turquoise = new Image();
turret_turquoise.src = "image/tank_player/turret_turquoise.png";
//VIOLETF
body_violetF = new Image();
body_violetF.src = "image/tank_player/body_violetF.png";
turret_violetF = new Image();
turret_violetF.src = "image/tank_player/turret_violetF.png";

block1 = new Image();
block1.src = "image/block/block1_solid.png";

block2 = new Image();
block2.src = "image/block/block2_solid.png";

bullet1 = new Image();
bullet1.src = "image/bullet/bullet.png";

bg = new Image();
bg.src = "image/background_solid.png";

var sound_fuse = new Audio("sounds/fuse.mp3");

draw();

function draw() {
  window.requestAnimationFrame(draw);

  c.drawImage(bg, 0, 0, canvas.width, canvas.height);

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
      c.drawImage(
        block1,
        block.position.x,
        block.position.y,
        block.size.w,
        block.size.h
      );
    }
    if (block.type == 2) {
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
    drawImageRot(
      bullet1,
      bullet.position.x,
      bullet.position.y,
      bullet.size.w,
      bullet.size.h,
      bullet.angle
    );
  });

  players.forEach((player) => {
    //body hit box
    if (player.alive) {
      //drawing the body
      drawImageRot(
        eval("body_" + player.bodyc),
        player.position.x,
        player.position.y,
        player.size.w,
        player.size.h,
        player.rotation
      );

      //drawing the turet
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
  });
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
}
c.font = "50px Arial";

function drawImageRot(img, x, y, width, height, deg) {
  // Store the current context state (i.e. rotation, translation etc..)
  c.save();
  //Convert degrees to radian
  var rad = (deg * Math.PI) / 180;
  //Set the origin to the center of the image
  c.translate(x + width / 2, y + height / 2);
  //Rotate the canvas around the origin
  c.rotate(rad);
  //draw the image
  c.drawImage(img, (width / 2) * -1, (height / 2) * -1, width, height);
  // Restore canvas state as saved from above
  c.restore();
}

function drawTextRot(text, x, y, width, height, deg) {
  // Store the current context state (i.e. rotation, translation etc..)
  c.save();
  //Convert degrees to radian
  var rad = (deg * Math.PI) / 180;
  //Set the origin to the center of the image
  c.translate(x + width / 2, y + height / 2);
  //Rotate the canvas around the origin
  c.rotate(rad);
  //draw the image
  c.fillText(text, (width / 2) * -1, (height / 2) * -1);

  // Restore canvas state as saved from above
  c.restore();
}

function drawTurretRot(img, x, y, width, height, deg) {
  // Store the current context state (i.e. rotation, translation etc..)
  c.save();
  //Convert degrees to radian
  var rad = (deg * Math.PI) / 180;
  //Set the origin to the center of the image
  c.translate(x + 3 * (width / 8), y + height / 2);
  //Rotate the canvas around the origin
  c.rotate(rad);
  //draw theimage
  c.drawImage(img, -2 * (width / 3), (height / 2) * -1, width, height);
  // Restore canvas state as saved from above
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
