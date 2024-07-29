document.getElementById("message-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const playerName = document.getElementById("user-message").value;
  if (playerName != "") {
    document.getElementById("user-message").value = "";
    if (trying == false) {
      socket.emit(
        "play",
        playerName,
        turret_colors[turret_id],
        body_colors[body_id]
      );
      trying = true;
    }
  } else {
    console.log("Please enter a name");
  }
});

turret_colors = ["blue", "orange", "red", "green"];
body_colors = ["blue", "orange", "red", "green"];
turret_id = 0;
body_id = 0;

function turret_next() {
  if (turret_id == turret_colors.length - 1) {
    document.querySelector(".slider_content").scrollLeft = 0;
    turret_id = 0;
  } else {
    const widthSlider = document.querySelector(".slider").offsetWidth;
    document.querySelector(".slider_content").scrollLeft += widthSlider;
    turret_id++;
  }
}

function turret_previous() {
  if (turret_id == 0) {
    const widthSlider = document.querySelector("#turret_slider").offsetWidth;
    document.querySelector("#turret_slider_content").scrollLeft =
      widthSlider * (turret_colors.length - 1);
    turret_id = turret_colors.length - 1;
  } else {
    const widthSlider = document.querySelector(".slider").offsetWidth;
    document.querySelector("#turret_slider_content").scrollLeft -= widthSlider;
    turret_id--;
  }
}

function body_next() {
  if (body == body_colors.length - 1) {
    document.querySelector("#turret_slider_content").scrollLeft = 0;
    body_id = 0;
  } else {
    const widthSlider = document.querySelector("#turret_slider").offsetWidth;
    document.querySelector("#turret_slider_content").scrollLeft += widthSlider;
    body_id++;
  }
}

function body_previous() {
  if (body_id == 0) {
    const widthSlider = document.querySelector("#body_slider").offsetWidth;
    document.querySelector("#body_slider_content").scrollLeft =
      widthSlider * (body_colors.length - 1);
    body_id = body_colors.length - 1;
  } else {
    const widthSlider = document.querySelector("#body_slider").offsetWidth;
    document.querySelector("#body_slider_content").scrollLeft -= widthSlider;
    body_id--;
  }
}
