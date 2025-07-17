function update_current_level_thumbnail() {
  thumbnails = document.getElementsByClassName("blurred_level_thumbnail");
  for (let i = 0; i < thumbnails.length; i++) {
    thumbnails[i].src = level_img;
  }
}

function update_current_level_creator_name() {
  creator_names = document.getElementsByClassName("blurred_level_creator_name");
  for (let i = 0; i < creator_names.length; i++) {
    creator_names[i].innerHTML = level_playing_creator_name;
  }
}

function update_current_level_name() {
  level_names = document.getElementsByClassName("blurred_level_name");
  for (let i = 0; i < level_names.length; i++) {
    level_names[i].innerHTML = level_playing_name;
  }
}

stars = [0, 0, 0, 0, 0];

socket.on("your_level_rating", (stars) => {
  stars = stars;
  show_stored_stars();
});

function star_hover(i) {
  for (let j = 0; j < i + 1; j++) {
    Array.from(document.getElementsByClassName("star_" + j)).forEach(
      (element) => {
        element.classList.remove("star-filled", "star-empty"); // Reset classes
        element.classList.add("star-filled");
      }
    );
  }
  for (let j = i + 1; j < stars.length; j++) {
    Array.from(document.getElementsByClassName("star_" + j)).forEach(
      (element) => {
        element.classList.remove("star-filled", "star-empty"); // Reset classes
        element.classList.add("star-empty");
      }
    );
  }
}

function show_stored_stars() {
  for (let j = 0; j < 5; j++) {
    Array.from(document.getElementsByClassName("star_" + j)).forEach(
      (element) => {
        element.classList.remove("star-filled", "star-empty"); // Reset classes
        stars[j] == 1
          ? element.classList.add("star-filled")
          : element.classList.add("star-empty");
      }
    );
  }
}

function star_clicked(i) {
  if (logged == false) {
    createToast(
      "error",
      "/ressources/image/error.svg",
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
    "/ressources/image/error.svg",
    "Error",
    "You can't rate this level because " + reason
  );
});

socket.on("rate_success", (rate, level_id) => {
  //console.log("rate success", rate, level_id);
  createToast(
    "info",
    "/ressources/image/info.svg",
    "Success",
    "You rated the level with " + rate + " stars"
  );
});

function update_blured_ui_data() {
  update_current_level_thumbnail();
  update_current_level_creator_name();
  update_current_level_name();
  show_stored_stars();
}
