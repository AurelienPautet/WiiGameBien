// curently not used beacause very vey bad mdrrrrr
// Shallah j'aurais pas la flemme un jour

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
