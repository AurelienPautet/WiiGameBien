room_name_input = document.getElementById("room_name_input_create");
room_rounds_select = document.getElementById("room_rounds_select");

function create_room() {
  //send the room name to the server to create the room
  //console.log("Creating room");
  //console.log(room_name_input.value);

  if (room_name_input.value == "") {
    //create a toast to inform the user that the room name is empty
    createToast(
      "info",
      "/ressources/image/info.svg",
      "Error",
      "Enter a room name"
    );
    return;
  }
  if (is_selected_not_empty() == false) {
    return;
  }

  //send the room name and other data to the server
  socket.emit(
    "new-room",
    room_name_input.value,
    room_rounds_select.value,
    selected_map,
    playerName
  );
}

socket.on("room_created", () => {
  // when the room is created, redirect the user to the game
  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    room_name_input.value
  );
});
