const socket = io("http://localhost:9000");
console.log(io);

socket.on("welcome", (data) => {
  console.log(data);
});

socket.on("id", (data) => {
  playerid = data;
});

setInterval(async () => {
  socket.emit("tock", { playerid, direction, plant, click, aim });
  click = false;
  plant = false;
}, 16.67);

playerid = 0;
players = [];
blocks = [];
Bcollision = [];
bullets = [];
mines = [];

var sound_tir = new Audio("sounds/tir.wav");
var sound_kill = new Audio("sounds/kill.wav");
var sound_plant = new Audio("sounds/plant.wav");
var sound_ricochet = new Audio("sounds/ricochet.wav");
var sound_fuse = new Audio("sounds/fuse.wav");

const mvtspeed = 5;

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

socket.on("tick", (p, b, B, bu, m) => {
  players = p;
  blocks = b;
  Bcollision = B;
  bullets = bu;
  mines = m;
});

onmousemove = function (e) {
  var rect = canvas.getBoundingClientRect();
  MouseX = e.clientX - rect.left;
  MouseY = e.clientY - rect.top;
  aim = { x: MouseX, y: MouseY };
};

window.addEventListener("click", (event) => {
  click = true;
  sound_tir.play();
});

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "d":
      direction.x = mvtspeed;
      break;
    case "q":
      direction.x = -mvtspeed;
      break;
    case "z":
      direction.y = -mvtspeed;
      break;
    case "s":
      direction.y = mvtspeed;
      break;
    case " ":
      sound_plant.play();
      plant = true;
      break;
  }
});
window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "d":
      if (direction.x > 0) {
        direction.x = 0;
      }
      break;
    case "q":
      if (direction.x < 0) {
        direction.x = 0;
      }
      break;
    case "z":
      if (direction.y < 0) {
        direction.y = 0;
      }
      break;
    case "s":
      if (direction.y > 0) {
        direction.y = 0;
      }
      break;
  }
});
