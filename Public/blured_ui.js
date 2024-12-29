socket.on("winner", (name, wait) => {
  console.log("winner", name, wait);
  show_ui_element("end_screen_screen");
  if (name == playerName) {
    document.getElementById("end_screen_text").innerHTML = "You Win!";
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
