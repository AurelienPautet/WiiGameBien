let my_map_list = document.getElementById("my_map_list");
let my_level_max_players_drop = document.getElementById(
  "my_level_max_players_drop"
);
let my_level_name_input = document.getElementById("my_level_name_input");
const starstranslate = { 0: "star-empty", 1: "star-filled" };

function add_my_map(
  map_name,
  map_id,
  creator_name,
  int_players,
  star,
  img_src
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
                        <div id="${map_id}" class=" text-white bg-slate-500 hover:bg-slate-600 rounded-md p-4 flex w-full   "onclick="select_map('${map_id}')">
                            <img src="${img_src}" alt="" class="w-32 h-24" />
                            <div class="flex justify-between w-full">
                                <div class="ml-4 flex-col flex-grow-0">
                                    <h3 class="text-xl font-bold">${map_name} by ${creator_name}</h3>
                                    <div class="flex gap-4 mt-2">
                                        <span class="bg-slate-700 px-2 py-1">${int_players} 👤</span>
                                    </div>
                                </div>
                                <div class="flex flex-col items-center justify-center">

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
                                                  <div class="flex">
                    <img
                      src="./icons/edit.svg"
                      class="w-6 h-6 m-3 hover:w-8 hover:h-8 hover:m-1"
                      onclick="edit_map('${map_id}')"
                    />
                    <img
                      src="./icons/bin.png"
                      class="w-6 h-6 m-3 hover:w-8 hover:h-8 hover:m-1"
                      onclick="delete_map('${map_id}')"
                    />
                  </div>
                </div>
                            </div>
                        </div>`;
  my_map_list.prepend(newMap);
}

function request_my_levels() {
  //console.log(
  //  "Requesting levels with name:",
  //  my_level_name_input.value,
  //  "and max players:",
  //  my_level_max_players_drop.value
  //);
  socket.emit(
    "search_my_levels",
    my_level_name_input.value,
    my_level_max_players_drop.value
  );
}

socket.on("recieve_my_levels", (levels) => {
  //console.log("Received levels from server:", levels);
  remove_all_my_maps();
  for (let i = 0; i < levels.length; i++) {
    add_my_map(
      levels[i].level_name,
      levels[i].level_id,
      levels[i].level_creator_name,
      levels[i].level_max_players,
      levels[i].level_rating,
      "./image/minia/test.png"
    );
  }
});

function remove_all_my_maps() {
  my_map_list.innerHTML = "";
}
