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
  document.getElementById("connect").style.display = "none";
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
    console.log(io);
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

  aim = { x: MouseX, y: MouseY };
};

window.addEventListener("click", (event) => {
  click = true;
});

window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyD":
      direction.x = mvtspeed;
      break;
    case "KeyQ":
    case "KeyA":
      direction.x = -mvtspeed;
      break;
    case "KeyZ":
    case "KeyW":
      direction.y = -mvtspeed;
      break;
    case "KeyS":
      direction.y = mvtspeed;
      break;
    case "Space":
      plant = true;
      break;
  }
});
window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyD":
      if (direction.x > 0) {
        direction.x = 0;
      }
      break;
    case "KeyQ":
    case "KeyA":
      if (direction.x < 0) {
        direction.x = 0;
      }
      break;
    case "KeyZ":
    case "KeyW":
      if (direction.y < 0) {
        direction.y = 0;
      }
      break;
    case "KeyS":
      if (direction.y > 0) {
        direction.y = 0;
      }
      break;
  }
});
