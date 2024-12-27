socket.on("winner", (name, wait) => {
  console.log("winner", name, wait);
  show_ui_element("end_screen_screen");

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
