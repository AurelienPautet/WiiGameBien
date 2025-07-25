//
//const socket = io("https://wiitank.pautet.net");
const socket = io("https://wiitank-2aacc4abc5cb.herokuapp.com/");
//const socket = io("http://localhost:7000/");

socket.on("welcome", (data) => {});

socket.on("serverid", (data) => {
  serverid = data;
  //console.log(serverid);
});

socket.on("socketid", (socketid) => {
  mysocketid = socketid;
});

socket.on("id", (room_idd, pid, socketid) => {
  room_id = room_idd;
  mysocketid = socketid;
  playerid = pid;
  showgame();
  playing = true;
  trying = false;
});

socket.on("id-fail", () => {
  createToast("info", "/ressources/image/info.svg", "Error", "Room full");
  //console.log("room full");
});

socket.on("wrongserver", () => {
  //console.log("wrong server");
  window.location.reload();
});

setInterval(async () => {
  if (playing && room_id != -1) {
    socket.emit("tock", {
      serverid,
      mysocketid,
      playerid,
      direction,
      plant,
      click,
      aim,
      room_id,
      mytick,
    });
  } else if (playing_solo) {
    solo_tick = {
      mysocketid,
      playerid,
      direction,
      plant,
      click,
      aim,
      room_id,
      mytick,
    };
    localroom.players[mysocketid].mytick = solo_tick.mytick;
    localroom.players[mysocketid].direction = solo_tick.direction;
    localroom.players[mysocketid].aim = solo_tick.aim;
    if (solo_tick.plant) {
      localroom.players[mysocketid].plant(localroom);
    }
    if (solo_tick.click) {
      localroom.players[mysocketid].shoot(localroom);
    }
  }
  mytick++;
  click = false;
  plant = false;
}, 16.67);

mytick = 0;
serverid = "";
mysocketid = "";
room_name = 0;
room_id = -1;
current_page = "home";
trying = false;
playing = false;
playing_solo = false;
pause = false;
solo_tick = {};
playerid = 0;
players = [];
blocks = [];
Bcollision = [];
holes = [];
level_id = 0;
bullets = [];
mines = [];
debug_visual = false;

const width = 1150;
const height = 800;
const mvtspeed = 3;

direction = {
  x: 0,
  y: 0,
};
aim = {
  x: 0,
  y: 0,
};
plant = false;
click = false;
alive = true;
logged = false;
socket.on("tick", (data) => {
  //console.log("tick", data.tick);
  //console.log("tick", data.players);
  bullets = data.bullets;
  mines = data.mines;
  room_name = data.name;
  mytick = data.tick;
  players = data.players;
  holes = data.holes;
  if (data.players[mysocketid]) {
    alive = data.players[mysocketid].alive;
    if (!alive) {
      if (current_page == "home") {
        show_ui_element("spectator_screen");
      }
    }
  }
});

socket.on("level_change", (data) => {
  console.log("level_change", data);
  console.log("level_change", data.blocks);
  blocks = data.blocks;
  Bcollision = data.Bcollision;
  level_id = data.level_id;
  //console.log("level_change", level_id);
});

socket.on("level_change_info", (levels) => {
  level_playing_creator_name = levels[0].level_creator_name;
  level_playing_name = levels[0].level_name;
  level_img = load_image_from_hex_ArrayBuffer(levels[0].level_img);
  update_blured_ui_data();
  stars = [0, 0, 0, 0, 0];
  show_stored_stars();
});

onmousemove = function (e) {
  var rect = canvas.getBoundingClientRect();
  MouseX = e.clientX - rect.left;
  MouseY = e.clientY - rect.top;
  aim = { x: MouseX / scale, y: MouseY / scale };
};

window.addEventListener("click", (event) => {
  if ((!playing && !playing_solo) || pause) {
    return;
  }
  click = true;
});

function pause_game() {
  if (playing || playing_solo) {
    if (pause) {
      pause = false;
      old_time = performance.now();
      hide_ui_element("pause_screen");
    } else {
      pause = true;
      update_pause_blured_ui();
      show_ui_element("pause_screen");
    }
  } else {
    return_home();
  }
}

window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyD":
    case "ArrowRight":
      direction.x = mvtspeed;
      break;
    case "KeyQ":
    case "KeyA":
    case "ArrowLeft":
      direction.x = -mvtspeed;
      break;
    case "KeyZ":
    case "KeyW":
    case "ArrowUp":
      direction.y = -mvtspeed;
      break;
    case "ArrowDown":
    case "KeyS":
      direction.y = mvtspeed;
      break;
    case "Space":
      plant = true;
      break;
    case "ControlLeft":
      debug_visual = !debug_visual;
      break;
    case "KeyT":
      if (theme < maxtheme) {
        theme++;
      } else {
        theme = 1;
      }
      loadtheme(theme);
      break;
    case "Escape":
      pause_game();
      break;
  }
});
window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyD":
    case "ArrowRight":
      if (direction.x > 0) {
        direction.x = 0;
      }
      break;
    case "KeyQ":
    case "KeyA":
    case "ArrowLeft":
      if (direction.x < 0) {
        direction.x = 0;
      }
      break;
    case "KeyZ":
    case "ArrowUp":
    case "KeyW":
      if (direction.y < 0) {
        direction.y = 0;
      }
      break;
    case "KeyS":
    case "ArrowDown":
      if (direction.y > 0) {
        direction.y = 0;
      }
      break;
    case "ControlLeft":
      //debug_visual = false;
      break;
  }
});
