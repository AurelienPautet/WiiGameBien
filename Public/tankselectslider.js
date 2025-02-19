//list of all available colors for the turret
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
//list of all available colors for the body
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

// group the colors by type
let colors = { body: body_colors, turret: turret_colors };
//hold the current colors index for the body and turret
let current = { body: 0, turret: 0 };

//the width of the body and turret select div
let scrollone = 154.6666717529297;

function load_old_tank() {
  show_ui_element("tank_select");
  try {
    //load the tank colors from the local storage if they exist
    current["body"] = parseInt(localStorage.getItem("body"), 10);
    current["turret"] = parseInt(localStorage.getItem("turret"), 10);
    console.log(current["body"], current["turret"]);

    if (isNaN(current["body"]) || isNaN(current["turret"])) {
      //if the colors are not valid, choose a random tank
      console.log("nan");
      random_tank();
    } else {
      //update the visualiser with the loaded colors
      update_tank_visualiser();
      update_slider("turret");
      update_slider("body");
      slide("turret");
      slide("body");
      return_home();
    }
  } catch (err) {
    //if there is an error, choose a random tank
    random_tank();
  }
  setTimeout(() => {
    return_home();
  }, 2);
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
  show_ui_element("tank_select");
  document.getElementById(name_str + "_select").scrollLeft =
    scrollone * current[name_str];
}

function slide(name_str) {
  //get the current index of the color
  let i = document.getElementById(name_str + "_select").scrollLeft / scrollone;
  i = Math.floor(i);

  //we grow the selected color image and shrink the previous one
  shrink(name_str + "_" + colors[name_str][current[name_str]]);
  grow(name_str + "_" + colors[name_str][i]);

  //update the current color index
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
  //grow the selected color image
  var element = document.getElementById(elementid);
  element.classList.remove("w-1/4");
  element.classList.remove("h-1/2");
  element.classList.add("w-2/5");
  element.classList.add("h-2/3");
}
function shrink(elementid) {
  //shrink the selected color image
  var element = document.getElementById(elementid);
  element.classList.add("w-1/4");
  element.classList.add("h-1/2");
  element.classList.remove("w-2/5");
  element.classList.remove("h-2/3");
}

let pressed = { body: false, turret: false };
let x = 0;

//i tried to make the slider draggable but it is not working
// fucking css of shit
// i hate thissssss
// Why is it working in mobile ?????/!!! but not on the computer !!!!!!
/* 
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
 */
