const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1150;
canvas.height = 800;

debug = "rgba(255, 0, 0, 0)";
//debug = "rgba(255, 0, 0, 0)";

body = new Image();
body.src = "image/tank_player/body.png";

turret = new Image();
turret.src = "image/tank_player/turret.png";

block1 = new Image();
block1.src = "image/block1.png";

block2 = new Image();
block2.src = "image/block2.png";

bullet1 = new Image();
bullet1.src = "image/bullet/bullet.png";

bg = new Image();
bg.src = "image/background_wood.png";

draw();

function draw() {
  window.requestAnimationFrame(draw);

  c.drawImage(bg, 0, 0, canvas.width, canvas.height);

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
    c.fillStyle = debug;
    c.fillRect(
      player.position.x,
      player.position.y,
      player.size.w,
      player.size.h
    );

    //drawing the body
    drawImageRot(
      body,
      player.position.x,
      player.position.y,
      player.size.w,
      player.size.h,
      player.rotation
    );

    //drawing the turet
    drawTurretRot(
      turret,
      player.position.x,
      player.position.y,
      player.turretsize.w,
      player.turretsize.h,
      player.angle
    );
  });
}

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
