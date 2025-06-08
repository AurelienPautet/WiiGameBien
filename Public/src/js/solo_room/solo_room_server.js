function launch_solo_room() {
  create_room("Solo Room", 1, [2, 3, 4], "GAME MASTER");
}

function loop() {
  setTimeout(loop, 1000 / 60);
  console.log("Looping solo room");
  console.log(localroom.players[mysocketid]);
  localroom.players[mysocketid].mytick = solo_tick.mytick;
  localroom.players[mysocketid].direction = solo_tick.direction;
  console.log("aim", solo_tick.aim);
  localroom.players[mysocketid].aim = solo_tick.aim;
  if (solo_tick.plant) {
    localroom.players[mysocketid].plant(localroom);
  }
  if (solo_tick.click) {
    localroom.players[mysocketid].shoot(localroom);
  }
  blocks = localroom.blocks;
  mines = localroom.mines;
  Bcollision = localroom.Bcollision;
  bullets = localroom.bullets;
  players = localroom.players;
  localroom.update();
}

let localroom = null;

async function create_room(name, rounds, list_id, creator) {
  room = new Room(name, rounds, list_id, creator, new FakeIO());
  socket.emit("get_json_from_id", room.levels[room.levelid]);
  room.maxplayernb = 100;
  localroom = room;
}

socket.on("recieve_json_from_id", (level_json) => {
  loadlevel(level_json, room);
  showgame();
  playing_solo = true;
  room.spawn_new_player(
    document.getElementById("player_name_input").value,
    turret_colors[current.turret],
    body_colors[current.body],
    mysocketid
  );
  loop();
});
