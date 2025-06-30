room_name_input = document.getElementById("room_name_input_create");
room_rounds_select = document.getElementById("room_rounds_select");

function create_room_server() {
  //console.log("Creating room");
  //console.log(room_name_input.value);

  if (room_name_input.value == "") {
    createToast(
      "info",
      "/ressources/image/info.svg",
      "Error",
      "Enter a room name"
    );
    return;
  }
  if (is_selected_not_empty() == false) {
    /*  createToast(
      "info",
      "/ressources/image/info.svg",
      "Error",
      "Please select at least 1 level"
    ); */
    return;
  }

  socket.emit(
    "new-room",
    room_name_input.value,
    room_rounds_select.value,
    selected_map,
    playerName
  );
}

socket.on("room_created", (room_idd) => {
  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    room_idd
  );
});
