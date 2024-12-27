// Get the element with id "map_list"
let map_list = document.getElementById("map_list");

let level_max_players_drop = document.getElementById("level_max_players_drop");
let level_name_input = document.getElementById("level_name_input");

// Object to translate star ratings to CSS classes
const starstranslate = { 0: "star-empty", 1: "star-filled" };

// Array to keep track of selected maps
let selected_map = [];

/**
 * Function to add a new map room to the map list
 * @param {string} map_name - The name of the map
 * @param {string} creator_name - The name of the map creator
 * @param {number} int_players - The number of players
 * @param {number} star - The star rating of the map
 * @param {string} img_src - The image source URL for the map
 */
function add_map(map_name, map_id, creator_name, int_players, star, img_src) {
  // Create a new div element for the map
  let newMap = document.createElement("div");
  let stars = [];

  // Generate star ratings
  for (let i = 0; i < 5; i++) {
    if (i < star) {
      stars.push(1);
    } else {
      stars.push(0);
    }
  }

  // Set the inner HTML of the new map element
  newMap.innerHTML = `
                        <div id="${map_id}" class="bg-gray-200 p-4 flex w-full border-2 hover:bg-gray-300 "onclick="select_map('${map_id}')">
                            <img src="${img_src}" alt="" class="w-32 h-24" />
                            <div class="flex justify-between w-full">
                                <div class="ml-4 flex-col flex-grow-0">
                                    <h3 class="text-xl font-bold">${map_name} by ${creator_name}</h3>
                                    <div class="flex gap-4 mt-2">
                                        <span class="bg-white px-2 py-1">${int_players} 👤</span>
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

  // Prepend the new map element to the map list
  map_list.prepend(newMap);
}
//addRoom('room_name', 'creator_name', 5, 7)
function request_levels() {
  console.log("Requesting levels", level_max_players_drop.value);
  socket.emit(
    "search_levels",
    level_name_input.value,
    level_max_players_drop.value
  );
}

socket.emit("search_levels", "", 0);

socket.on("recieve_levels", (levels) => {
  console.log(levels);
  remove_all_maps();
  for (let i = 0; i < levels.length; i++) {
    add_map(
      levels[i].level_name,
      levels[i].level_id,
      levels[i].level_creator_name,
      levels[i].level_max_players,
      levels[i].level_rating,
      "./image/minia/test.png"
    );
  }
  readd_selection();
});

function readd_selection() {
  for (let i = 0; i < selected_map.length; i++) {
    try {
      document.getElementById(selected_map[i]).classList.add("border-blue-400");
    } catch (e) {}
  }
}

// Function to add a new map room to the map list
function select_map(map_id) {
  // Check if the map is already selected
  if (selected_map.includes(map_id)) {
    // If selected, remove from selected_map array and remove border class
    selected_map.splice(selected_map.indexOf(map_id), 1);
    document.getElementById(map_id).classList.remove("border-blue-400");
  } else {
    // If not selected, add to selected_map array and add border class
    selected_map.push(map_id);
    document.getElementById(map_id).classList.add("border-blue-400");
  }
}

function remove_all_maps() {
  map_list.innerHTML = "";
}
