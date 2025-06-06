//
//const socket = io("https://wiitank.pautet.net");
//const socket = io("https://wiitank-2aacc4abc5cb.herokuapp.com/");
const socket = io("http://localhost:7000/");

socket.on("welcome", (data) => {});

socket.on("serverid", (data) => {
  serverid = data;
  console.log(serverid);
});

socket.on("socketid", (socketid) => {
  mysocketid = socketid;
});

socket.on("id", (pid, socketid) => {
  mysocketid = socketid;
  playerid = pid;
  showgame();
  playing = true;
  trying = false;
});

socket.on("id-fail", () => {
  createToast("info", "/image/info.svg", "Error", "Room full");
  console.log("room full");
});

socket.on("wrongserver", () => {
  console.log("wrong server");
  window.location.reload();
});

setInterval(async () => {
  if (playing && room_name != 0) {
    socket.emit("tock", {
      mysocketid,
      playerid,
      direction,
      plant,
      click,
      aim,
      room_name,
      mytick,
    });
  }
  mytick++;
  click = false;
  plant = false;
}, 16.67);

mytick = 0;
serverid = "";
mysocketid = "";
room_name = 0;
trying = false;
playing = false;
playerid = 0;
players = [];
blocks = [];
Bcollision = [];
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
socket.on("tick", (p, bu, m, r, t) => {
  bullets = bu;
  mines = m;
  room_name = r;
  mytick = t;
  if (p[mysocketid]) {
    alive = p[mysocketid].alive;
    if (!alive) {
      if (current_page == "home") {
        show_ui_element("spectator_screen");
      }
    }
  }
  for (socketid in p) {
    if (!players[socketid]) {
      players[socketid] = p[socketid];
    } else {
      players[socketid].position = p[socketid].position;
      players[socketid].angle = p[socketid].angle;
      players[socketid].alive = p[socketid].alive;
      players[socketid].rotation = p[socketid].rotation;
      players[socketid].direction = p[socketid].direction;
      players[socketid].mytick = p[socketid].mytick;
    }
  }
  for (socketid in players) {
    if (!p[socketid]) {
      delete players[socketid];
    }
  }
});

socket.on("level_change", (b, Bc, lvlid) => {
  blocks = b;
  Bcollision = Bc;
  level_id = lvlid;
  console.log("level_change", level_id);
});

onmousemove = function (e) {
  var rect = canvas.getBoundingClientRect();
  MouseX = e.clientX - rect.left;
  MouseY = e.clientY - rect.top;
  aim = { x: MouseX / scale, y: MouseY / scale };
};

window.addEventListener("click", (event) => {
  click = true;
});

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
      debug_visual = true;
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
      return_home();
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
      debug_visual = false;
      break;
  }
});
