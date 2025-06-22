let room_list = document.getElementById("room_list");

function addRoom(room_name, creator_name, int_players, int_players_max) {
  let newRoom = document.createElement("div");
  newRoom.innerHTML = `
            <div id="${room_name}" class="text-white bg-slate-500 rounded-md p-4 flex w-full  hover:bg-slate-600"onclick="join_room('${room_name}')">
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

socket.on("room_list", (lname, lcreator, lplayers, lmaxplayers) => {
  room_list.innerHTML = "";

  for (let i = 0; i < lname.length; i++) {
    addRoom(lname[i], lcreator[i], lplayers[i], lmaxplayers[i]);
  }
  add_new_room_button();
});

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

function join_room(roomname) {
  document.getElementById(roomname).classList.add("border-teal-500");
  //console.log(current["body"], current["turret"]);

  socket.emit(
    "play",
    playerName,
    turret_colors[current["turret"]],
    body_colors[current["body"]],
    roomname
  );
  trying = true;
}
