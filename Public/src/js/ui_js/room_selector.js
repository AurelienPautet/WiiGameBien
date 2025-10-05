let room_list = document.getElementById("room_list");
let room_selector_name_input = document.getElementById(
  "room_selector_name_input"
);
let drop_nb_players_room_selector = document.getElementById(
  "drop_nb_players_room_selector"
);

list_of_rooms = [];

function addRoom(
  room_id,
  room_name,
  creator_name,
  int_players,
  int_players_max
) {
  if (room_name.includes(room_selector_name_input.value) === false) {
    console.log(
      `Room ${room_name} does not match the filter ${room_selector_name_input.value}`
    );
    return;
  }

  if (
    drop_nb_players_room_selector.value >= 0 &&
    int_players_max !== parseInt(drop_nb_players_room_selector.value)
  ) {
    console.log(
      `Room ${room_name} does not match the player count filter ${drop_nb_players_room_selector.value}`
    );
    return;
  }

  let newRoom = document.createElement("div");
  newRoom.innerHTML = `
            <div id="Room_${room_id}" class="text-white bg-slate-500 rounded-md p-4 flex w-full  hover:bg-slate-600"onclick="join_room('${room_id}')">
              <div class="flex justify-between w-full">
                <div class="ml-4 flex-col flex-grow-0">
                  <h3 class="text-xl font-bold">${room_name} by ${creator_name}</h3>
                  <div class="flex gap-4 mt-2">
                    <span class="bg-slate-700 px-2 py-1">${int_players}/${int_players_max} 👤</span>
                  </div>
                </div>
              </div>
            </div>`;
  room_list.prepend(newRoom);
}

socket.on("room_list", (lids, lname, lcreator, lplayers, lmaxplayers) => {
  list_of_rooms = [];
  console.log(lids, lname, lcreator, lplayers, lmaxplayers);
  for (let i = 0; i < lname.length; i++) {
    list_of_rooms.push({
      id: lids[i],
      name: lname[i],
      creator: lcreator[i],
      players: lplayers[i],
      maxplayers: lmaxplayers[i],
    });
  }
  filter_rooms();
});

function filter_rooms() {
  room_list.innerHTML = "";
  list_of_rooms.forEach((room) => {
    addRoom(room.id, room.name, room.creator, room.players, room.maxplayers);
  });
  add_new_room_button();
}

function add_new_room_button() {
  //console.log("Adding new room button");
  button = document.createElement("div");
  button.className =
    "text-white bg-slate-500 hover:bg-slate-600 rounded-md p-4 flex w-full cursor-pointer";
  button.onclick = button.onclick = function () {
    show_ui_element("level_selector");
  };
  button.innerHTML = `
    <div class="flex items-center justify-center w-32 h-20 bg-green-800 rounded">
      <span class="text-4xl">+</span>
    </div>
    <div class="ml-4 flex flex-col justify-center">
      <h3 class="text-xl font-bold">Create a New Room</h3>
      <p class="mt-2 ">Public or Private Room</p>
    </div>
  `;
  room_list.prepend(button);
}

function join_room(room_id) {
  document.getElementById(`Room_${room_id}`).classList.add("border-teal-500");
  //console.log(current["body"], current["turret"]);

  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    room_id
  );
  trying = true;
}
