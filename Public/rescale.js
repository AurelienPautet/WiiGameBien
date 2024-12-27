// Get the user's window width and height
rescale();
function rescale() {
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  widthporcent = windowWidth / canvas.width;
  heightporcent = windowHeight / canvas.height;
  console.log(`Window Width: ${windowWidth}, Window Height: ${windowHeight}`);
  scale = Math.min(widthporcent, heightporcent);
  console.log("Rescaling...");
  console.log(scale);
  document.body.style.transform = `scale(${scale})`;
}

window.onresize = rescale;

function resize() {
  alert("resize event detected!");
}
