var sound_tir = new Audio("sounds/tir.wav");
var sound_kill = new Audio("sounds/kill.wav");
var sound_plant = new Audio("sounds/plant.wav");
var sound_ricochet = new Audio("sounds/ricochet.wav");

socket.on("tick_sounds", (sounds) => {
  if (sounds.plant) {
    //sound_plant.cloneNode().play();
    playaudio("sounds/plant.wav");
  }
  if (sounds.ricochet) {
    //sound_ricochet.cloneNode().play();
    playaudio("sounds/ricochet.wav");
  }
  if (sounds.kill) {
    //sound_kill.cloneNode().play();
    playaudio("sounds/kill.wav");
  }
  if (sounds.shoot) {
    //sound_tir.cloneNode().play();
    playaudio("sounds/tir.wav");
  }
});

function playaudio(source) {
  var audioElement;
  audioElement = document.createElement("audio");
  audioElement.innerHTML = '<source src="' + source + '" type="audio/mpeg" />';
  audioElement.play();
  setTimeout(() => {
    audioElement.remove();
  }, 200);
}
