const socket = io("http://localhost:9000");
console.log(io);

socket.on("welcome", (data) => {
  console.log(data);
});

socket.on("id", (data) => {
  playerid = data;
  console.log(playerid);
});

setInterval(async () => {
  socket.emit("tock", { playerid, direction, plant, click, aim });
  console.log(playerid);
  click = false;
  plant = false;
}, 16.67);

playerid = 0;
players = [];
blocks = [];
Bcollision = [];
bullets = [];
mines = [];

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
