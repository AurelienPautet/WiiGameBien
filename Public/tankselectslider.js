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

let scrollone = 154.6666717529297;

function load_old_tank() {
  show_ui_element("tank_select");
  setTimeout(() => {
    return_home();
  }, 1);
  try {
    current["body"] = parseInt(localStorage.getItem("body"), 10);
    current["turret"] = parseInt(localStorage.getItem("turret"), 10);
    console.log(current["body"], current["turret"]);
    if (isNaN(current["body"]) || isNaN(current["turret"])) {
      console.log("nan");
      random_tank();
    } else {
      update_tank_visualiser();
      update_slider("turret");
      update_slider("body");
    }
  } catch (err) {
    random_tank();
  }
}

function random_tank() {
  //choose a random color for the body and turret
  //from the list of colors
  current["body"] = Math.floor(Math.random() * body_colors.length);
  current["turret"] = Math.floor(Math.random() * turret_colors.length);
  //update the visualiser
  update_tank_visualiser();
  update_slider("turret");
  update_slider("body");
}

function update_slider(name_str) {
  console.log(name_str);
  document.getElementById(name_str + "_select").scrollLeft =
    scrollone * current[name_str];
}

function slide(name_str) {
  //console.log(document.getElementById(name_str + "_select").scrollLeft / scrollone);
  let i = document.getElementById(name_str + "_select").scrollLeft / scrollone;

  i = Math.floor(i);
  //console.log(name_str + "_" + turret_colors[current[name_str]]);
  retressir(name_str + "_" + colors[name_str][current[name_str]]);
  grossir(name_str + "_" + colors[name_str][i]);
  if (i != undefined) {
    current[name_str] = i;
  }
}

function slide2(name_str) {
  if (MouseX > width / 2) {
    document.getElementById(name_str + "_select").scrollLeft += scrollone;
  } else {
    document.getElementById(name_str + "_select").scrollLeft -= scrollone;
  }
  slide("name_str");
}

function grossir(elementid) {
  var element = document.getElementById(elementid);
  element.classList.remove("w-1/4");
  element.classList.remove("h-1/2");
  element.classList.add("w-2/5");
  element.classList.add("h-2/3");
}
function retressir(elementid) {
  var element = document.getElementById(elementid);
  element.classList.add("w-1/4");
  element.classList.add("h-1/2");
  element.classList.remove("w-2/5");
  element.classList.remove("h-2/3");
}

let pressed = { body: false, turret: false };
let x = 0;

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
  console.log(`${x - startX}px`);
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
  console.log(`${x - startX}px`);
  body_select.scrollLeft = startScroll + x - startX;
});

function dragdown(name_str) {
  pressed[name_str] = true;
  console.log("draging");
  startScroll = container.scrollLeft;
  startX = MouseX;
  container.style.cursor = "grabbing";
}

function dragup(name_str) {
  pressed[name_str] = false;
  console.log("dragup");
}
