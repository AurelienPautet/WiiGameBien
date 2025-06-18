function launch_solo_room() {
  create_room("Solo Room", 1, [6], "GAME MASTER");
}

function loop() {
  setTimeout(loop, 1000 / 60);
  make_player_invicible();
  //make_player_invicible("bot0");

  blocks = localroom.blocks;
  mines = localroom.mines;
  Bcollision = localroom.Bcollision;
  bullets = localroom.bullets;
  players = localroom.players;
  holes = localroom.holes;
  localroom.update();
}

function make_player_invicible(socketid = mysocketid) {
  localroom.players[socketid].alive = true;
}

let localroom = null;
let bots = [];
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
  localroom.spawn_new_player(
    document.getElementById("player_name_input").value,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    mysocketid
  );
  localroom.spawn_all_bots();

  /*   bot1 = new Bot1(
    { x: 0, y: 0 },
    "bot2",
    "Bot2",
    turret_colors[3],
    body_colors[3]
  );

  localroom.spawn_new(bot1, "bot2");
  bots.push(localroom.players["bot2"]); */

  loop();
});
