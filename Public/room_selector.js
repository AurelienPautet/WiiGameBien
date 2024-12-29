let room_list = document.getElementById("room_list");

function addRoom(room_name, creator_name, int_players, int_players_max) {
  // Add the new room html reprensentation to the room list
  let newRoom = document.createElement("div");
  newRoom.innerHTML = `
            <div id="${room_name}" class="bg-gray-200 p-4 flex w-full border-2 hover:bg-gray-300 "onclick="join_room('${room_name}')">
              <div class="flex justify-between w-full">
                <div class="ml-4 flex-col flex-grow-0">
                  <h3 class="text-xl font-bold">${room_name} by ${creator_name}</h3>
                  <div class="flex gap-4 mt-2">
                    <span class="bg-white px-2 py-1">${int_players}/${int_players_max} 👤</span>
                  </div>
                </div>
              </div>
            </div>`;
  room_list.prepend(newRoom);
}

socket.on("room_list", (lname, lcreator, lplayers, lmaxplayers) => {
  // Clear the room list
  room_list.innerHTML = "";

  // Add all the rooms back to the room list
  for (let i = 0; i < lname.length; i++) {
    addRoom(lname[i], lcreator[i], lplayers[i], lmaxplayers[i]);
  }
});

function join_room(roomname) {
  // Join the room
  document.getElementById(roomname).classList.add("border-blue-400");
  console.log(current["body"], current["turret"]);

  // Send the player to the game
  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    roomname
  );
  trying = true;
}
