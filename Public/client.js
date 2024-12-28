//
const socket = io("https://wiitank-2aacc4abc5cb.herokuapp.com/");
//const socket = io("http://localhost:7000/");

socket.on("welcome", (data) => {});

socket.on("serverid", (data) => {
  serverid = data;
  console.log(serverid);
});

socket.on("id", (data) => {
  playerid = data;
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
      serverid,
      playerid,
      direction,
      plant,
      click,
      aim,
      room_name,
    });
  }
  click = false;
  plant = false;
}, 16.67);

serverid = "";
room_name = 0;
trying = false;
playing = false;
playerid = 0;
players = [];
blocks = [];
Bcollision = [];
bullets = [];
mines = [];
debug_visual = false;
width = 1150;
height = 800;

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

socket.on("tick", (p, bu, m, r) => {
  players = p;
  bullets = bu;
  mines = m;
  room_name = r;
});

socket.on("level_change", (b, Bc) => {
  blocks = b;
  Bcollision = Bc;
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
