let turret_colors = [
  "blue",
  "orange",
  "red",
  "green",
  "violet",
  "yellow",
  "blueF",
  "turquoise",
  "violetF",
];
let body_colors = [
  "blue",
  "orange",
  "red",
  "green",
  "violet",
  "yellow",
  "blueF",
  "turquoise",
  "violetF",
];

let colors = { body: body_colors, turret: turret_colors };
let current = { body: 0, turret: 0 };

function manage_arrow() {
  if (current.body === 0) {
    document.getElementById("body_arrow_left").style.visibility = "hidden";
  } else {
    document.getElementById("body_arrow_left").style.visibility = "visible";
  }
  if (current.body === body_colors.length - 1) {
    document.getElementById("body_arrow_right").style.visibility = "hidden";
  } else {
    document.getElementById("body_arrow_right").style.visibility = "visible";
  }
  if (current.turret === 0) {
    document.getElementById("turret_arrow_left").style.visibility = "hidden";
  } else {
    document.getElementById("turret_arrow_left").style.visibility = "visible";
  }
  if (current.turret === turret_colors.length - 1) {
    document.getElementById("turret_arrow_right").style.visibility = "hidden";
  } else {
    document.getElementById("turret_arrow_right").style.visibility = "visible";
  }
}

let scrollone = 154.6666717529297;

function load_old_tank() {
  show_ui_element("tank_select");
  try {
    current["body"] = parseInt(localStorage.getItem("body"), 10);
    current["turret"] = parseInt(localStorage.getItem("turret"), 10);
    console.log("Loaded tank:", current["body"], current["turret"]);

    if (isNaN(current["body"]) || isNaN(current["turret"])) {
      //console.log("pkkkkkkkkkkkkkkkkkkkkkkkkkk");
      random_tank();
    } else {
      update_tank_visualiser();
      update_slider("turret");
      update_slider("body");
      slide("turret");
      slide("body");
      return_home();
    }
  } catch (err) {
    random_tank();
  }
  setTimeout(() => {
    return_home();
  }, 2);
}

load_old_tank();

function random_tank() {
  current["body"] = Math.floor(Math.random() * body_colors.length);
  current["turret"] = Math.floor(Math.random() * turret_colors.length);
  update_tank_visualiser();
  update_slider("turret");
  update_slider("body");
}

function update_slider(name_str) {
  show_ui_element("tank_select");
  document.getElementById(name_str + "_select").scrollLeft =
    scrollone * current[name_str];
}

function slide(name_str) {
  manage_arrow();
  let i = document.getElementById(name_str + "_select").scrollLeft / scrollone;
  i = Math.floor(i);

  shrink(name_str + "_" + colors[name_str][current[name_str]]);
  grow(name_str + "_" + colors[name_str][i]);

  if (i != undefined) {
    current[name_str] = i;
  }
}

function slide2(name_str) {
  if (MouseX > (width * scale) / 2) {
    document.getElementById(name_str + "_select").scrollLeft += scrollone;
  } else {
    document.getElementById(name_str + "_select").scrollLeft -= scrollone;
  }
  slide(name_str);
}

function grow(elementid) {
  var element = document.getElementById(elementid);
  element.classList.remove("w-1/4");
  element.classList.remove("h-1/2");
  element.classList.add("w-2/5");
  element.classList.add("h-2/3");
}
function shrink(elementid) {
  var element = document.getElementById(elementid);
  element.classList.add("w-1/4");
  element.classList.add("h-1/2");
  element.classList.remove("w-2/5");
  element.classList.remove("h-2/3");
}

let pressed = { body: false, turret: false };
let x = 0;

/*

C'est de la grosse merde !!!!!!!!!!!


let turret_select = document.getElementById("turret_select");
turret_select.addEventListener("mousedown", () => {
  dragdown("turret");
  turret_select.classList.remove("snap-x");
});

turret_select.addEventListener("mouseup", () => {
  dragup("turret");
  turret_select.classList.add("snap-x");
});

turret_select.addEventListener("mousemove", (e) => {
  if (!pressed) return;
  e.preventDefault();

  x = MouseX;
  //console.log(`${x - startX}px`);
  turret_select.scrollLeft = startScroll + x - startX;
});

let body_select = document.getElementById("body_select");
body_select.addEventListener("mousedown", () => {
  dragdown("body");
  body_select.classList.remove("snap-x");
});
body_select.addEventListener("mouseup", () => {
  dragup("body");
  body_select.classList.add("snap-x");
});

body_select.addEventListener("mousemove", (e) => {
  if (!pressed) return;
  e.preventDefault();

  x = MouseX;
  //console.log(`${x - startX}px`);
  body_select.scrollLeft = startScroll + x - startX;
});

function dragdown(name_str) {
  pressed[name_str] = true;
  //console.log("draging");
  startScroll = container.scrollLeft;
  startX = MouseX;
  container.style.cursor = "grabbing";
}

function dragup(name_str) {
  pressed[name_str] = false;
  //console.log("dragup");
}
 */
