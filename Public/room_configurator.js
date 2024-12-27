room_name = document.getElementById("room_name_input_create");
room_rounds_select = document.getElementById("room_rounds_select");

function create_room() {
  console.log("Creating room");
  console.log(room_name.value);
  if (room_name.value == "") {
    createToast("info", "/image/info.svg", "Error", "Enter a room name");
    return;
  }
  if (is_selected_not_empty() == false) {
    return;
  }
  socket.emit(
    "new-room",
    room_name.value,
    room_rounds_select.value,
    selected_map,
    playerName
  );
}

socket.on("room_created", () => {
  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    room_name.value
  );
});
