tank_select = document.getElementById("tank_select");
mapset_selector = document.getElementById("mapset_selector");
landing_page = document.getElementById("landing_page");

current_page = "home";
waited = false;

function show_mapset_selector() {
  current_page = "mapset_selector";
  landing_page.classList.add("blur");
  mapset_selector.classList.remove("hidden");
  waited = false;
  if (!waited) {
    setTimeout(() => {
      waited = true;
    }, 1);
  }
}

function hide_mapset_selector() {
  current_page = "home";
  landing_page.classList.remove("blur");
  mapset_selector.classList.add("hidden");
}

function show_select() {
  current_page = "select";
  landing_page.classList.add("blur");
  tank_select.classList.remove("hidden");
  waited = false;
  if (!waited) {
    setTimeout(() => {
      waited = true;
    }, 1);
  }
}

function hide_select() {
  current_page = "home";
  landing_page.classList.remove("blur");
  tank_select.classList.add("hidden");
  document.getElementById("body_visualiser").src =
    "/image/tank_player/" + "body_" + colors["body"][current["body"]] + ".png";
  document.getElementById("turret_visualiser").src =
    "/image/tank_player/" +
    "turret_" +
    colors["turret"][current["turret"]] +
    ".png";
}

function return_home() {
  if (current_page == "select" && waited) {
    console.log("returning home");
    hide_select();
  }
  if (current_page == "mapset_selector" && waited) {
    console.log("returning home");
    hide_mapset_selector();
  }
}
