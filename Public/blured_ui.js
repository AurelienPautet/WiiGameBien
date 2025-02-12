socket.on("winner", (id, wait, scores, ids_to_name) => {
  show_ui_element("end_screen_screen");
  console.log(scores);
  score_tab = document.getElementById("score_tab");
  score_tab.innerHTML = "";
  scores = Object.fromEntries(
    Object.entries(scores).sort(([, a], [, b]) => b - a)
  );

  higest_score = scores[Object.keys(scores)[0]];
  for (var id in scores) {
    player_score_info = document.createElement("div");
    if (scores[id] != higest_score) {
      player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold text-white scores">
            ${ids_to_name[id]} : ${scores[id]} 
          </div>`;
    } else {
      player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold text-yellow-500 scores">
            ${ids_to_name[id]} : ${scores[id]} 
          </div>`;
    }
    score_tab.appendChild(player_score_info);
  }

  document
    .getElementById("end_screen_screen")
    .classList.remove("border-red-500");
  document.getElementById("end_screen_text").classList.remove("text-red-500");
  document
    .getElementById("end_screen_screen")
    .classList.remove("border-green-500");
  document.getElementById("end_screen_text").classList.remove("text-green-500");
  if (id == mysocketid) {
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
