const elements = {
  tank_select,
  mapset_selector,
  landing_page,
  room_configuration,
  romm_selector,
};

const before_check = {
  home: alwaystrue,
  tank_select: alwaystrue,
  mapset_selector: alwaystrue,
  landing_page: alwaystrue,
  room_configuration: get_player_name,
  romm_selector: get_player_name,
};

tank_select = document.getElementById("tank_select");
mapset_selector = document.getElementById("mapset_selector");
landing_page = document.getElementById("landing_page");
room_configuration = document.getElementById("room_configuration");
romm_selector = document.getElementById("romm_selector");

current_page = "home";
waited = false;

var name = "";
try {
  name = localStorage.getItem("name");
  document.getElementById("player_name").value = name;
  console.log(name);
  if (name == null) {
    name = "";
  }
} catch (err) {
  name = "";
}

function alwaystrue() {
  return true;
}

function show_ui_element(elementid) {
  return_home();
  res = before_check[elementid]();
  if (!res) {
    return;
  }
  current_page = elementid;
  console.log(elements, elements[elementid]);
  landing_page.classList.add("blur");
  elements[elementid].classList.remove("hidden");
  waited = false;
  if (!waited) {
    setTimeout(() => {
      waited = true;
    }, 1);
  }
}

function hide_ui_element(elementid) {
  current_page = "home";
  landing_page.classList.remove("blur");
  elements[elementid].classList.add("hidden");
}

function get_player_name() {
  name = document.getElementById("player_name").value;
  localStorage.setItem("name", name);

  console.log("name", name);
  if (name.length > 0) {
    return true;
  } else {
    createToast("info", "/image/info.svg", "Error", "Enter a name ");
    return false;
  }
}

function update_tank_visualiser() {
  document.getElementById("body_visualiser").src =
    "/image/tank_player/" + "body_" + colors["body"][current["body"]] + ".png";
  document.getElementById("turret_visualiser").src =
    "/image/tank_player/" +
    "turret_" +
    colors["turret"][current["turret"]] +
    ".png";
}

function return_home() {
  console.log("returning home");

  if (current_page == "tank_select" && waited) {
    hide_ui_element("tank_select");
    update_tank_visualiser();
    localStorage.setItem("body", current["body"]);
    localStorage.setItem("turret", current["turret"]);
  }
  if (current_page == "mapset_selector" && waited) {
    hide_ui_element("mapset_selector");
    show_ui_element("room_configuration");
  }
  if (current_page == "room_configuration" && waited) {
    hide_ui_element("room_configuration");
  }
  if (current_page == "romm_selector" && waited) {
    hide_ui_element("romm_selector");
  }
}
