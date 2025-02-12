socket.on("winner", (id, wait, scores, ids_to_name) => {
  show_ui_element("end_screen_screen");
  console.log(scores);
  score_tab = document.getElementById("score_tab");
  score_tab.innerHTML = "";
  scores = Object.fromEntries(
    Object.entries(scores).sort(([, a], [, b]) => b - a)
  );
  childs_list_to_add = [];
  higest_score = scores[Object.keys(scores)[0]];
  for (var _id in scores) {
    player_score_info = document.createElement("div");
    if (scores[_id] != higest_score) {
      player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold text-white scores">
            ${ids_to_name[_id]} : ${scores[_id]} 
          </div>`;
    } else {
      player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold text-yellow-500 scores">
            ${ids_to_name[_id]} : ${scores[_id]} 
          </div>`;
    }
    childs_list_to_add.push(player_score_info);
  }
  console.log(childs_list_to_add);
  add_in_cascade(score_tab, childs_list_to_add, 0.2 * wait);
  document
    .getElementById("end_screen_screen")
    .classList.remove("border-red-500");
  document.getElementById("end_screen_text").classList.remove("text-red-500");
  document
    .getElementById("end_screen_screen")
    .classList.remove("border-green-500");
  document.getElementById("end_screen_text").classList.remove("text-green-500");

  if (id == -1) {
    document
      .getElementById("end_screen_screen")
      .classList.add("border-yellow-500");
    document.getElementById("end_screen_text").classList.add("text-yellow-500");
    document.getElementById("end_screen_text").innerHTML = "Draw";
  } else if (id == mysocketid) {
    document
      .getElementById("end_screen_screen")
      .classList.add("border-green-500");
    document.getElementById("end_screen_text").classList.add("text-green-500");
    document.getElementById("end_screen_text").innerHTML = "You Won!";
  } else {
    document
      .getElementById("end_screen_screen")
      .classList.add("border-red-500");
    document.getElementById("end_screen_text").classList.add("text-red-500");
    document.getElementById("end_screen_text").innerHTML =
      ids_to_name[id] + " Won :(";
  }

  setTimeout(() => {
    console.log("hide");
    hide_ui_element("end_screen_screen");
  }, wait);
});

socket.on("draw", (wait) => {
  document.getElementById("draw").style.display = "block";
  setTimeout(() => {
    document.getElementById("draw").style.display = "none";
  }, wait);
});

function add_in_cascade(parent, child_divs_list, overall_delay) {
  beetwen_delay = overall_delay / child_divs_list.length;
  for (let i = 0; i < child_divs_list.length; i++) {
    let blank = child_divs_list[i].cloneNode(true);
    blank.style.opacity = 0;
    blank.id = `child_div_${i}`;
    parent.appendChild(blank);
    setTimeout(() => {
      document.getElementById(`child_div_${i}`).remove();
      console.log("add");
      parent.appendChild(child_divs_list[i]);
    }, beetwen_delay * i);
  }
}
