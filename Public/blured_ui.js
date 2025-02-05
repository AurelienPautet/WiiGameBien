socket.on("winner", (id, wait, scores, ids_to_name) => {
  show_ui_element("end_screen_screen");
  console.log(scores);
  score_tab = document.getElementById("score_tab");
  score_tab.innerHTML = "";
  for (var id in scores) {
    player_score_info = document.createElement("div");
    player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold text-white">
            ${ids_to_name[id]} : ${scores[id]} 
          </div>`;
    score_tab.prepend(player_score_info);
  }

  if (id == mysocketid) {
    document.getElementById("end_screen_text").innerHTML = "You Won!";
  } else {
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
