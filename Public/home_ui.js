tank_select = document.getElementById("tank_select");
mapset_selector = document.getElementById("mapset_selector");
landing_page = document.getElementById("landing_page");
room_configuration = document.getElementById("room_configuration");
room_selector = document.getElementById("room_selector");
end_screen_screen = document.getElementById("end_screen_screen");
spectator_screen = document.getElementById("spectator_screen");
the_canvas = document.getElementById("the_canvas");
auth = document.getElementById("auth");
profile = document.getElementById("profile");
level_editor = document.getElementById("level_editor");
rankings = document.getElementById("rankings");
profile_or_auth = auth;

// all the ui elements
const elements = {
  tank_select,
  mapset_selector,
  landing_page,
  room_configuration,
  room_selector,
  end_screen_screen,
  spectator_screen,
  auth,
  profile,
  profile_or_auth,
  level_editor,
  rankings,
};

// the functions to run before showing the ui element
const before_check = {
  home: alwaystrue,
  tank_select: alwaystrue,
  mapset_selector: alwaystrue,
  landing_page: alwaystrue,
  room_configuration: get_player_name,
  room_selector: get_player_name,
  waiting_screen: blur_canvas,
  end_screen_screen: blur_canvas,
  spectator_screen: alwaystrue,
  auth: alwaystrue,
  profile: alwaystrue,
  profile_or_auth: logged_or_not,
  level_editor: is_logged_in,
  rankings: get_ranking_initial,
};

// the functions to run after hiding the ui element
const after_hide = {
  home: alwaystrue,
  tank_select: alwaystrue,
  mapset_selector: alwaystrue,
  landing_page: alwaystrue,
  room_configuration: alwaystrue,
  room_selector: alwaystrue,
  waiting_screen: deblur_canvas,
  end_screen_screen: deblur_canvas,
  spectator_screen: alwaystrue,
  auth: alwaystrue,
  profile_or_auth: alwaystrue,
  profile: alwaystrue,
  level_editor: alwaystrue,
  rankings: alwaystrue,
};

// all the ui elements in the html

// to prevent double clicking
let waited = false;
// the current page
let current_page = "home";
console.log("current_page", current_page);
// get the player name from the local storage if it exists
var playerName = "";
try {
  playerName = localStorage.getItem("playerName");
  document.getElementById("player_name_input").value = playerName;
  console.log(playerName);
  if (playerName == null) {
    playerName = "";
  }
} catch (err) {
  playerName = "";
}

function deblur_canvas() {
  the_canvas.classList.remove("blur");
  return true;
}
function blur_canvas() {
  the_canvas.classList.add("blur");
  return true;
}

function alwaystrue() {
  return true;
}

function get_ranking_initial() {
  socket.emit("ranking", "KILLS");
  return true;
}

function is_logged_in() {
  if (logged === false) {
    createToast("info", "/image/info.svg", "Error", "You are not logged in");
  }
  return true;
  //return logged;
}

function logged_or_not() {
  if (logged) {
    elements["profile_or_auth"] = profile;
    profile_or_auth = profile;
    get_player_stats();
  } else {
    elements["profile_or_auth"] = auth;
    profile_or_auth = auth;
  }
  return true;
}

function show_ui_element(elementid) {
  return_home();
  res = before_check[elementid]();
  if (!res) {
    return;
  }
  console.log("showing", elementid);
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
  try {
    after_hide[elementid]();
  } catch (err) {
    console.log(err);
  }
  current_page = "home";
  landing_page.classList.remove("blur");
  elements[elementid].classList.add("hidden");
}

function get_player_name() {
  playerName = document.getElementById("player_name_input").value;
  localStorage.setItem("playerName", playerName);

  console.log("playerName", playerName);
  if (playerName.length > 0) {
    return true;
  } else {
    createToast("info", "/image/info.svg", "Error", "Enter a playerName ");
    return false;
  }
}

function is_selected_not_empty() {
  if (selected_map.length > 0) {
    return true;
  } else {
    createToast("info", "/image/info.svg", "Error", "Select a map");
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
  console.log("returning home", current_page, waited);

  if (current_page == "tank_select" && waited) {
    hide_ui_element("tank_select");
    update_tank_visualiser();
    localStorage.setItem("body", current["body"]);
    localStorage.setItem("turret", current["turret"]);
  }
  if (current_page == "mapset_selector" && waited) {
    if (is_selected_not_empty()) {
      hide_ui_element("mapset_selector");
      show_ui_element("room_configuration");
    }
  }
  if (current_page == "room_configuration" && waited) {
    hide_ui_element("room_configuration");
  }
  if (current_page == "room_selector" && waited) {
    hide_ui_element("room_selector");
  } else if (waited && current_page != "home") {
    hide_ui_element(current_page);
  }
}

function showgame() {
  return_home();
  landing_page.classList.add("hidden");
}
