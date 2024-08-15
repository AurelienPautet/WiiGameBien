document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const playerName = document.getElementById("user-message").value;
  if (playerName != "") {
    document.getElementById("user-message").value = "";
    if (trying == false) {
      if (connection_case === "create") {
        roomname = document.getElementById("room_imput").value;
        if (roomname === "") {
          createToast("info", "/image/info.svg", "Error", "Enter a room name ");
        } else if (roomname.length >= 15) {
          createToast("info", "/image/info.svg", "Error", "Room name too long");
          document.getElementById("room_imput").value = "";
        } else if (list_name.includes(roomname) == false) {
          levelsset = document.getElementById("levelsset-select").value;
          console.log("roomana", roomname);
          socket.emit("new-room", roomname, levelsset);
          socket.emit(
            "play",
            playerName,
            turret_colors[turret_id],
            body_colors[body_id],
            roomname
          );
          trying = true;
        } else {
          document.getElementById("room_imput").value = "";
          createToast(
            "info",
            "/image/info.svg",
            "Error",
            "Room name already exist"
          );
        }
      }
      if (connection_case === "join") {
        roomname = document.getElementById("room-select").value;
        socket.emit(
          "play",
          playerName,
          turret_colors[turret_id],
          body_colors[body_id],
          roomname
        );
        trying = true;
      }
    }
  } else {
    console.log("Please enter a name");
    createToast("info", "/image/info.svg", "Error", "Please enter a name");
  }
});

problem = false;
turret_colors = [
  "blue",
  "orange",
  "red",
  "green",
  "violet",
  "yellow",
  "blueF",
  "turquoise",
  "violetF",
];
body_colors = [
  "blue",
  "orange",
  "red",
  "green",
  "violet",
  "yellow",
  "blueF",
  "turquoise",
  "violetF",
];
turret_id = 0;
body_id = 0;
var connection_case = "join";

function show_join() {
  document.getElementById("connect_join").style.display = "block";
  document.getElementById("connect_create").style.display = "none";

  document.getElementById("connection_rest_container").style.backgroundColor =
    "var(--join_color)";

  connection_case = "join";
}

function show_create() {
  document.getElementById("connect_join").style.display = "none";
  document.getElementById("connect_create").style.display = "block";
  document.getElementById("connection_rest_container").style.backgroundColor =
    "var(--create_color)";
  connection_case = "create";
}

function hover_join() {
  if (connection_case != "join") {
    document.getElementById("join_button").style.backgroundColor =
      "var(--join_color_hoover)";
  }
}
function normal_join() {
  document.getElementById("join_button").style.backgroundColor =
    "var(--join_color)";
}

function hover_create() {
  if (connection_case != "create") {
    document.getElementById("create_button").style.backgroundColor =
      "var(--create_color_hoover)";
  }
}
function normal_create() {
  document.getElementById("create_button").style.backgroundColor =
    "var(--create_color)";
}

room_select = document.getElementById("room-select");
function add_select(value, inner, select) {
  opt = document.createElement("option");
  opt.value = value;
  opt.innerHTML = inner;
  select.appendChild(opt);
}

list_name = [];

socket.on("room_list", (lname, lplayers) => {
  list_name = lname;
  for (a in room_select.options) {
    room_select.options.remove(0);
  }

  for (let i = 0; i < lname.length; i++) {
    console.log(lname[i], lname[i] + ": (", lplayers[i], ")");
    nstr = ` ${lname[i]}: (${lplayers[i]})`;
    add_select(lname[i], nstr, room_select);
  }
});

levelsset_select = document.getElementById("levelsset-select");

socket.on("levelset", (levelsset) => {
  console.log(levelsset);
  for (a in levelsset_select.options) {
    levelsset_select.options.remove(0);
  }

  for (let i = 0; i < levelsset.length; i++) {
    add_select(levelsset[i], levelsset[i], levelsset_select);
  }
});

const widthSlider = 150;

function turret_next() {
  if (turret_id == turret_colors.length - 1) {
    document.querySelector(".slider_content").scrollLeft = 0;
    turret_id = 0;
  } else {
    document.querySelector(".slider_content").scrollLeft += widthSlider;
    turret_id++;
  }
}

function turret_previous() {
  if (turret_id == 0) {
    document.querySelector("#turret_slider_content").scrollLeft =
      widthSlider * (turret_colors.length - 1);
    turret_id = turret_colors.length - 1;
  } else {
    document.querySelector("#turret_slider_content").scrollLeft -= widthSlider;
    turret_id--;
  }
}

function body_next() {
  if (body_id == body_colors.length - 1) {
    document.querySelector("#body_slider_content").scrollLeft = 0;
    body_id = 0;
  } else {
    document.querySelector("#body_slider_content").scrollLeft += widthSlider;
    body_id++;
  }
}

function body_previous() {
  if (body_id == 0) {
    document.querySelector("#body_slider_content").scrollLeft =
      widthSlider * (body_colors.length - 1);
    body_id = body_colors.length - 1;
  } else {
    document.querySelector("#body_slider_content").scrollLeft -= widthSlider;
    body_id--;
  }
}

socket.on("winner", (name, wait) => {
  document.getElementById("winner").style.display = "block";
  document.getElementById("player_name").innerHTML = name;

  setTimeout(() => {
    document.getElementById("winner").style.display = "none";
  }, wait);
});

socket.on("draw", (wait) => {
  document.getElementById("draw").style.display = "block";
  setTimeout(() => {
    document.getElementById("draw").style.display = "none";
  }, wait);
});
