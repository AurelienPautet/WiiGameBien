tank_select = document.getElementById("tank_select");
level_selector = document.getElementById("level_selector");
landing_page = document.getElementById("landing_page");
room_configuration = document.getElementById("room_configuration");
room_selector = document.getElementById("room_selector");
end_screen_screen = document.getElementById("end_screen_screen");
spectator_screen = document.getElementById("spectator_screen");
the_canvas = document.getElementById("the_canvas");
auth = document.getElementById("auth");
profile = document.getElementById("profile");
my_level_selector = document.getElementById("my_level_selector");
rankings = document.getElementById("rankings");
level_editor = document.getElementById("level_editor");
google_username = document.getElementById("google_username");
solo_level_selector = document.getElementById("solo_level_selector");
profile_or_auth = auth;

// all the ui elements
const elements = {
  tank_select,
  level_selector,
  landing_page,
  room_configuration,
  room_selector,
  end_screen_screen,
  spectator_screen,
  auth,
  profile,
  profile_or_auth,
  my_level_selector,
  rankings,
  level_editor,
  google_username,
  solo_level_selector,
  pause_screen,
};

// the functions to run before showing the ui element
const before_check = {
  home: alwaystrue,
  tank_select: alwaystrue,
  level_selector: alwaystrue,
  landing_page: alwaystrue,
  room_configuration: get_player_name,
  room_selector: get_player_name,
  waiting_screen: blur_canvas,
  end_screen_screen: blur_canvas,
  spectator_screen: alwaystrue,
  auth: alwaystrue,
  profile: alwaystrue,
  profile_or_auth: logged_or_not,
  my_level_selector: is_logged_in,
  rankings: get_ranking_initial,
  level_editor: alwaystrue,
  google_username: is_google_response_not_null,
  solo_level_selector: alwaystrue,
  pause_screen: blur_canvas,
};

// the functions to run after hiding the ui element
const after_hide = {
  home: alwaystrue,
  tank_select: alwaystrue,
  level_selector: alwaystrue,
  landing_page: alwaystrue,
  room_configuration: alwaystrue,
  room_selector: alwaystrue,
  waiting_screen: deblur_canvas,
  end_screen_screen: deblur_canvas,
  spectator_screen: alwaystrue,
  auth: alwaystrue,
  profile_or_auth: alwaystrue,
  profile: alwaystrue,
  my_level_selector: alwaystrue,
  rankings: alwaystrue,
  level_editor: alwaystrue,
  google_username: alwaystrue,
  solo_level_selector: alwaystrue,
  pause_screen: deblur_canvas,
};

// to prevent double clicking
let waited = false;
// the current page
let current_page = "home";
//console.log("current_page", current_page);
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
  fading_canvas.classList.remove("blur");
  return true;
}
function blur_canvas() {
  the_canvas.classList.add("blur");
  fading_canvas.classList.add("blur");
  return true;
}

function alwaystrue() {
  return true;
}

function is_google_response_not_null() {
  return google_response != null;
}

function get_ranking_initial() {
  socket.emit("ranking", "KILLS");
  show_personal_rank();
  return true;
}

function is_logged_in() {
  if (logged === false) {
    createToast(
      "info",
      "/ressources/image/info.svg",
      "Error",
      "You are not logged in"
    );
  } else {
    socket.emit("search_my_levels", "", 0);
  }
  //socket.emit("search_my_levels", "", 0);
  //return true;

  return logged;
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
  //console.log("showing", elementid);
  current_page = elementid;
  //console.log(elements, elements[elementid]);
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
    //console.log(err);
  }
  current_page = "home";
  landing_page.classList.remove("blur");
  elements[elementid].classList.add("hidden");
}

function get_player_name() {
  playerName = document.getElementById("player_name_input").value;
  localStorage.setItem("playerName", playerName);

  //console.log("playerName", playerName);
  if (playerName.length > 0) {
    return true;
  } else {
    createToast(
      "info",
      "/ressources/image/info.svg",
      "Error",
      "Enter a playerName "
    );
    return false;
  }
}

function is_selected_not_empty() {
  if (selected_map.length > 0) {
    return true;
  } else {
    createToast("info", "/ressources/image/info.svg", "Error", "Select a map");
    return false;
  }
}

function update_tank_visualiser() {
  document.getElementById("body_visualiser").src =
    "/ressources/image/tank_player/" +
    "body_" +
    colors["body"][current["body"]] +
    ".png";
  document.getElementById("turret_visualiser").src =
    "/ressources/image/tank_player/" +
    "turret_" +
    colors["turret"][current["turret"]] +
    ".png";
}

function return_home() {
  //console.log("returning home", current_page, waited);

  if (current_page == "tank_select" && waited) {
    hide_ui_element("tank_select");
    update_tank_visualiser();
    localStorage.setItem("body", current["body"]);
    localStorage.setItem("turret", current["turret"]);
  }
  if (current_page == "level_selector" && waited) {
    if (is_selected_not_empty()) {
      hide_ui_element("level_selector");
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
  return_home();
}

function quit_game() {
  if (playing || playing_solo) {
    socket.emit("quit");
    playing = false;
    playing_solo = false;
    landing_page.classList.remove("hidden");
    return_home();
    the_canvas.classList.remove("blur");
    fading_canvas.classList.remove("blur");
    pause_game();
  }
}

window.show_ui_element = show_ui_element;
window.return_home = return_home;
