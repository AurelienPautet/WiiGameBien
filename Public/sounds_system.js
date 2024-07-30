var sound_tir = new Audio("sounds/tir.wav");
var sound_kill = new Audio("sounds/kill.wav");
var sound_plant = new Audio("sounds/plant.wav");
var sound_ricochet = new Audio("sounds/ricochet.wav");

socket.on("tick_sounds", (sounds) => {
  if (sounds.plant) {
    sound_plant.cloneNode().play();
  }
  if (sounds.ricochet) {
    sound_ricochet.cloneNode().play();
  }
  if (sounds.kill) {
    sound_kill.cloneNode().play();
  }
  if (sounds.shoot) {
    sound_tir.cloneNode().play();
  }
});
