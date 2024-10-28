let map_list = document.getElementById("map_list");

const starstranslate = { 0: "star-empty", 1: "star-filled" };

let selected_map = [];

function addRoom(map_name, creator_name, int_players, int_maps, star, img_src) {
  let newMap = document.createElement("div");
  let stars = [];
  for (let i = 0; i < 5; i++) {
    if (i <= star) {
      stars.push(1);
    } else {
      stars.push(0);
    }
  }
  newMap.innerHTML = `
            <div id="${map_name}" class="bg-gray-200 p-4 flex w-full border-2 hover:bg-gray-300 "onclick="select_map('${map_name}')">
              <img src="${img_src}" alt="" class="w-32 h-24" />
              <div class="flex justify-between w-full">
                <div class="ml-4 flex-col flex-grow-0">
                  <h3 class="text-xl font-bold">${map_name} by ${creator_name}</h3>
                  <div class="flex gap-4 mt-2">
                    <span class="bg-white px-2 py-1">${int_players} 👤</span>
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
            </div>`;
  map_list.prepend(newMap);
}

function select_map(map_name) {
  if (selected_map.includes(map_name)) {
    selected_map.splice(selected_map.indexOf(map_name), 1);
    document.getElementById(map_name).classList.remove("border-blue-400");
  } else {
    selected_map.push(map_name);
    document.getElementById(map_name).classList.add("border-blue-400");
  }
  console.log(map_name, "selected");
}
