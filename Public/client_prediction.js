class Frontend_Player {
  constructor(
    position,
    socketid,
    name,
    turretc,
    bodyc,
    angle,
    alive,
    rotation
  ) {
    this.name = name;
    this.bodyc = bodyc;
    this.turretc = turretc;
    this.position = position;
    this.socketid = socketid;
    this.size = {
      w: 48,
      h: 48,
    };
    this.turretsize = {
      w: 60,
      h: 33,
    };
    this.angle = angle;
    this.alive = alive;
    this.rotation = rotation;
    this.direction = direction;
  }
}

player_reonciliation = false;

function reconciliation_loop() {
  if (!player_reonciliation) {
    return;
  }
  for (socketid in players) {
    player = players[socketid];
    if (player.socketid == mysocketid) {
      player.position.x += direction.x;
      player.position.y += direction.y;
      let adjacent = aim.x - (player.position.x + player.size.w / 2);
      let opposite = aim.y - (player.position.y + player.size.h / 2);
      let angle = Math.atan(opposite / adjacent);
      if (adjacent < 0) {
        player.angle = (angle * 180) / Math.PI;
      } else {
        player.angle = (angle * 180) / Math.PI + 180;
      }
    } else {
      player.position.x += player.direction.x * (mytick - player.mytick);
      player.position.y += player.direction.y * (mytick - player.mytick);
      player.mytick = mytick;
    }
  }
  setTimeout(reconciliation_loop, 16.67);
}

reconciliation_loop();
