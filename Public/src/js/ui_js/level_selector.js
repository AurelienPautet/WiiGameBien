let map_list = document.getElementById("map_list");
let level_max_players_drop = document.getElementById("level_max_players_drop");
let level_name_input = document.getElementById("level_name_input");
let number_maps_create = document.getElementById("number_maps_create");
let max_player_create = document.getElementById("max_player_create");

//const starstranslate = { 0: "star-empty", 1: "star-filled" };
let selected_map = [];
let selected_maxplayers = [];

function add_map(map_name, map_id, creator_name, int_players, star, img_src) {
  let newMap = document.createElement("div");
  let stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < star) {
      stars.push(1);
    } else {
      stars.push(0);
    }
  }
  newMap.innerHTML = `
                        <div id="${map_id}" class="bg-slate-500 border-slate-500 hover:bg-slate-600 text-white rounded-md p-4 flex w-full border-4" onclick="select_map('${map_id}','${int_players}')">
                            <img src="${img_src}" alt="" class="w-32 h-24" />
                            <div class="flex justify-between w-full">
                                <div class="ml-4 flex-col flex-grow-0">
                                    <h3 class="text-xl font-bold">${map_name} by ${creator_name}</h3>
                                    <div class="flex gap-4 mt-2">
                                        <span class=" bg-slate-700 px-2 py-1">${int_players} 👤</span>
                                    </div>
                                </div>
                                <div class="flex">
                                    <span class="${
                                      starstranslate[stars[0]]
                                    }">★</span>
                                    <span class="${
                                      starstranslate[stars[1]]
                                    }">★</span>
                                    <span class="${
                                      starstranslate[stars[2]]
                                    }">★</span>
                                    <span class="${
                                      starstranslate[stars[3]]
                                    }">★</span>
                                    <span class="${
                                      starstranslate[stars[4]]
                                    }">★</span>
                                </div>
                            </div>
                        </div>`;
  map_list.prepend(newMap);
}

function request_levels() {
  console.log(level_name_input.value, level_max_players_drop.value);
  socket.emit(
    "search_levels",
    level_name_input.value,
    level_max_players_drop.value,
    "online"
  );
}

socket.emit("search_levels", "", 0, "online");

socket.on("recieve_levels", (levels) => {
  console.log(levels);
  //console.log("Received levels from server:", levels);
  remove_all_maps();
  for (let i = 0; i < levels.length; i++) {
    let DataUrl;
    try {
      DataUrl = load_image_from_hex_ArrayBuffer(levels[i].level_img);
    } catch (e) {
      console.log("no images for this level");
      DataUrl = "../../ressources/image/minia/test.png";
    }

    add_map(
      levels[i].level_name,
      levels[i].level_id,
      levels[i].level_creator_name,
      levels[i].level_max_players,
      levels[i].level_rating,
      DataUrl
    );
  }
  update_room_info();
  readd_selection();
});

function load_image_from_hex_ArrayBuffer(hexArray) {
  dataUrl = HexToJpeg(hexArray);
  return dataUrl;
}

function readd_selection() {
  for (let i = 0; i < selected_map.length; i++) {
    try {
      document.getElementById(selected_map[i]).classList.add("border-teal-500");
    } catch (e) {}
  }
}

function select_map(map_id, int_players) {
  if (selected_map.includes(map_id)) {
    e = selected_map.indexOf(map_id);
    selected_map.splice(e, 1);
    selected_maxplayers.splice(e, 1);
    document.getElementById(map_id).classList.remove("border-teal-500");
  } else {
    selected_map.push(map_id);
    selected_maxplayers.push(int_players);
    document.getElementById(map_id).classList.add("border-teal-500");
  }
  update_room_info();
}

function update_room_info() {
  nb_maps = selected_map.length;
  number_maps_create.innerHTML = `${nb_maps} maps selected`;
  if (nb_maps > 0) {
    //console.log(selected_maxplayers);
    min_maxplayers = min_of_list(selected_maxplayers);
    max_player_create.innerHTML = `${min_maxplayers} players max`;
  } else {
    max_player_create.innerHTML = `Please select maps`;
  }
}

function min_of_list(list) {
  min = null;
  list.forEach((element) => {
    if (min === null) {
      min = element;
    }
    if (element < min) {
      min = element;
    }
  });
  return min;
}

function remove_all_maps() {
  map_list.innerHTML = "";
}
