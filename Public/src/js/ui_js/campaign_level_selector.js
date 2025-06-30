let campaign_level_list = document.getElementById("campaign_level_list");

function add_map_campaign(
  level_name,
  level_id,
  creator_name,
  int_players,
  star,
  img_src,
  locked
) {
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
            <div
              id="${level_id}"
              class="relative bg-slate-500 border-slate-500 hover:bg-slate-600 text-white rounded-md p-4 flex w-full border-4"
              onclick="${
                locked
                  ? `    createToast(
      'error'²,
      "/ressources/image/error.svg",
      "Error",
      "This level is locked"
    );`
                  : `create_room('${level_name}', 10, [${level_id}], '${creator_name}')`
              }"
            >
              <div
                id="level_lock_${level_id}"
                class=" ${
                  locked ? "" : "hidden"
                } z-20 absolute inset-0 w-full h-full bg-black/20 rounded-md flex flex-col items-center justify-center"
              >
                <span
                  class="text-white text-2xl font-bold flex justify-center items-center"
                >
                  <img
                    src="ressources/icons/lock.svg"
                    class="h-7 w-7 pb-1 mr-1"
                  />
                  Level ${level_id} Locked
                </span>
                <p class="text-white">Complete all previous levels to unlock</p>
              </div>
              <div id="level_content_${level_id}" class="flex w-full ${
    locked ? "blur-sm" : ""
  }">
                <img src="${img_src}" alt="" class="w-32 h-24" />
                <div class="flex justify-between w-full">
                  <div class="ml-4 flex-col flex-grow-0">
                    <div class="w-full text-left flex justify-center items-center">
                    <h3 class="text-2xl font-bold text-slate-200">
                      level ${level_id} : 
                    </h3>
                    <h3 class="text-2xl font-bold mr-auto ml-2">
                    ${level_name}
                    </h3>
                    </div>
                    <div id="level_ennemy_details_level_${level_id}" class="flex gap-4 mt-2">
                      <span class="bg-slate-700 px-2 py-1">1 * 🟦</span>
                      <span class="bg-slate-700 px-2 py-1">3 * 🟩</span>
                      <span class="bg-slate-700 px-2 py-1">5 * 🟥</span>
                    </div>
                  </div>
                  <div class="flex">
                    <span class="${starstranslate[stars[0]]}">★</span>
                    <span class="${starstranslate[stars[1]]}">★</span>
                    <span class="${starstranslate[stars[2]]}">★</span>
                    <span class="${starstranslate[stars[3]]}">★</span>
                    <span class="${starstranslate[stars[4]]}">★</span>
                  </div>
                </div>
              </div>
            </div>`;
  campaign_level_list.append(newMap);
}

function add_map_ennemy_detail(level_id, level_json) {
  divtoadd = document.getElementById(`level_ennemy_details_level_${level_id}`);
  divtoadd.innerHTML = "";
  extraxted_enemies = {};
  //console.log("level_json", level_json);
  for (let i = 0; i < level_json.length; i++) {
    cell_num = level_json[i];
    if (cell_num > 10) {
      extraxted_enemies[cell_num - 10] =
        (extraxted_enemies[cell_num - 10] || 0) + 1;
    }
  }
  console.log("extraxted_enemies", extraxted_enemies);
  for (const [key, value] of Object.entries(extraxted_enemies)) {
    let new_detail = document.createElement("div");

    new_detail.innerHTML = `                    
                  <div class="bg-slate-700 px-2 py-1 flex items-center">
                      ${value} *
                      <div class="ml-4 relative w-8 h-6">
                        <img
                          src="ressources/image/tank_player/body_${
                            Room.bot_colors["bot" + key][0]
                          }.png"
                          class="w-6 h-6 absolute"
                        />
                        <img
                          src="ressources/image/tank_player/turret_${
                            Room.bot_colors["bot" + key][1]
                          }.png"
                          class="w-8 h-5 absolute -left-3"
                        />
                      </div>
                    </div>`;
    console.log("new detail", new_detail);
    divtoadd.appendChild(new_detail);
  }
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

socket.emit("search_levels", "", 0, "solo");

socket.on("recieve_levels", (levels) => {
  //console.log("Received levels from server:", levels);
  remove_all_maps_campaign();
  for (let i = 0; i < levels.length; i++) {
    let DataUrl;
    try {
      DataUrl = load_image_from_hex_ArrayBuffer(levels[i].level_img);
    } catch (e) {
      console.log("no images for this level");
      DataUrl = "../../ressources/image/minia/test.png";
    }

    add_map_campaign(
      levels[i].level_name,
      levels[i].level_id,
      levels[i].level_creator_name,
      levels[i].level_max_players,
      levels[i].level_rating,
      DataUrl,
      false
    );
    add_map_ennemy_detail(levels[i].level_id, levels[i].level_json.data);
  }
});

function remove_all_maps_campaign() {
  campaign_level_list.innerHTML = "";
}
