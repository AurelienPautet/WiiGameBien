//
//const socket = io("https://wiitank-2aacc4abc5cb.herokuapp.com/");
const socket = io("http://localhost:7000/");

console.log(io);

socket.on("welcome", (data) => {
  console.log(data);
});

socket.on("id", (data) => {
  playerid = data;
  document.getElementById("connect").style.display = "none";
  playing = true;
  trying = false;
});

socket.on("id-fail", () => {
  console.log("room full");
});

setInterval(async () => {
  if (playing) {
    socket.emit("tock", { playerid, direction, plant, click, aim });
  }
  click = false;
  plant = false;
}, 16.67);

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

socket.on("tick", (p, bu, m) => {
  players = p;
  bullets = bu;
  mines = m;
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
