const audioCtx = new AudioContext();
var sound_tir = new Audio("sounds/tir.wav");
var sound_kill = new Audio("sounds/kill.wav");
var sound_plant = new Audio("sounds/plant.wav");
var sound_ricochet = new Audio("sounds/ricochet.wav");
const source_tir = audioCtx.createMediaElementSource(sound_tir);
source_tir.connect(audioCtx.destination);
const source_plant = audioCtx.createMediaElementSource(sound_plant);
source_plant.connect(audioCtx.destination);
const source_ricochet = audioCtx.createMediaElementSource(sound_ricochet);
source_plant.connect(audioCtx.destination);
const source_kill = audioCtx.createMediaElementSource(sound_kill);
source_plant.connect(audioCtx.destination);

window.addEventListener("click", (event) => {
  audioCtx.resume();
});

socket.on("tick_sounds", (sounds) => {
  if (sounds.plant) {
    sound_plant.cloneNode().play();

    //sound_plant.cloneNode().play();
    //playaudio("sounds/plant.wav");
  }
  if (sounds.ricochet) {
    sound_ricochet.cloneNode().play();
    //playaudio("sounds/ricochet.wav");
  }
  if (sounds.kill) {
    sound_kill.cloneNode().play();
    //playaudio("sounds/kill.wav");
  }
  if (sounds.shoot) {
    sound_tir.cloneNode().play();

    //sound_tir.cloneNode().play();
    //playaudio("sounds/tir.wav");
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
