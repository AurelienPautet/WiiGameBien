socket.on("winner", (id, wait, scores, ids_to_name) => {
  hide_ui_element("spectator_screen");
  show_ui_element("end_screen_screen");
  //console.log(scores);
  score_tab = document.getElementById("score_tab");
  score_tab.innerHTML = "";
  document.getElementById("blurred_level_name").innerHTML = level_playing_name;
  document.getElementById("blurred_level_creator_name").innerHTML =
    level_playing_creator_name;

  try {
    document.getElementById("blurred_level_thumbnail").src =
      load_image_from_hex_ArrayBuffer(level_img);
  } catch (e) {
    console.error("Error loading level thumbnail:", e);
  }

  //console.log(scores);
  scores = Object.fromEntries(
    Object.entries(scores).sort(([, a], [, b]) => b.wins - a.wins)
  );
  childs_list_to_add = [];
  higest_score = scores[Object.keys(scores)[0]].wins;
  higest_kills = Math.max(
    ...Object.values(scores).map((player) => player.kills)
  );
  higest_deaths = Math.max(
    ...Object.values(scores).map((player) => player.deaths)
  );

  //console.log(higest_score, "higest_score");
  for (var _id in scores) {
    player_score_info = document.createElement("div");
    if (scores[_id].wins != higest_score) {
      text_color = "text-white";
    } else {
      text_color = "text-yellow-500";
    }
    kills_color = text_color;
    deaths_color = text_color;
    if (scores[_id].kills == higest_kills) {
      kills_color = "text-green-500";
    }
    if (scores[_id].deaths == higest_deaths) {
      deaths_color = "text-red-500";
    }
    dots = ".".repeat(
      10 - scores[_id].kills.toString().length + 10 - ids_to_name[_id].length
    );
    player_score_info.innerHTML = `<div class="w-full h-1/2 text-2xl font-bold ${text_color} scores">
            ${ids_to_name[_id]} : ${scores[_id].wins} ${dots} kills : <span class="${kills_color}" >${scores[_id].kills}</span> deaths : <span class="${deaths_color}" >${scores[_id].deaths}</span>
          </div>`;

    childs_list_to_add.push(player_score_info);
  }
  //console.log(childs_list_to_add);
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
    //console.log("hide");
    hide_ui_element("end_screen_screen");
    fc.clearRect(0, 0, fading_canvas.width, fading_canvas.height);
  }, wait);
});

socket.on("draw", (wait) => {
  document.getElementById("draw").style.display = "block";
  setTimeout(() => {
    document.getElementById("draw").style.display = "none";
  }, wait);
});

function add_in_cascade(parent, child_divs_list, overall_delay) {
  beetwen_delay = 500;
  total_delay = beetwen_delay;

  for (let i = 0; i < child_divs_list.length; i++) {
    setTimeout(() => {
      //console.log("add");
      parent.appendChild(child_divs_list[i]);
    }, total_delay);

    beetwen_delay = beetwen_delay / 3;
    total_delay += beetwen_delay;
  }
}

socket.on("your_level_rating", (stars) => {
  stars = stars;
});

stars = [0, 0, 0, 0, 0];

function star_hover(i) {
  for (let j = 0; j < i + 1; j++) {
    star = document.getElementById("star_" + j);
    star.classList = "";
    star.classList.add("star-filled");
  }
  for (let j = i + 1; j < 5; j++) {
    star = document.getElementById("star_" + j);
    star.classList = "";
    star.classList.add("star-empty");
  }
}

function show_stored_stars() {
  for (let j = 0; j < 5; j++) {
    star = document.getElementById("star_" + j);
    star.classList = "";
    if (stars[j] == 1) {
      star.classList.add("star-filled");
    } else {
      star.classList.add("star-empty");
    }
  }
}

function star_clicked(i) {
  if (logged == false) {
    createToast(
      "error",
      "/image/error.svg",
      "Error",
      "You need to be logged in to rate a level"
    );
    return;
  }
  for (let j = 0; j < 5; j++) {
    if (j <= i) {
      stars[j] = 1;
    } else {
      stars[j] = 0;
    }
  }
  show_stored_stars();
  socket.emit("rate_lvl", i + 1, level_id);
}

socket.on("rate_fail", (reason) => {
  //console.log("rate fail", reason);
  createToast(
    "error",
    "/image/error.svg",
    "Error",
    "You can't rate this level because " + reason
  );
});

socket.on("rate_success", (rate, level_id) => {
  //console.log("rate success", rate, level_id);
  createToast(
    "info",
    "/image/info.svg",
    "Success",
    "You rated the level with " + rate + " stars"
  );
});
