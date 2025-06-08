// Get the user's window width and height
rescale();
function rescale() {
  //console.log("rescaling the window to fit the canvas");
  // Get the user's window width and height
  windowWidth = window.innerWidth;
  windowHeight = window.innerHeight;
  // calculate the scale factor been the window and the canvas
  widthporcent = windowWidth / canvas.width;
  heightporcent = windowHeight / canvas.height;

  //get the minimum scale factor and apply a 5% reduction
  scale = Math.min(widthporcent, heightporcent) * 0.95;

  //apply the scale factor to the canvas
  document.body.style.transform = `scale(${scale})`;
}

window.onresize = rescale;
