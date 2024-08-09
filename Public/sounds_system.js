var sound_tir = new Audio("sounds/tir.wav");
var sound_kill = new Audio("sounds/kill.wav");
var sound_plant = new Audio("sounds/plant.wav");
var sound_ricochet = new Audio("sounds/ricochet.wav");

tirs = [];
plants = [];
kills = [];
ricochets = [];
fuses = [];

function playsound(typelist, baseaudio) {
  for (let e = 0; e < typelist.length; e++) {
    if (typelist[e].playing == false) {
      playpause(typelist, e);
      return;
    }
  }
  audio = baseaudio.cloneNode();
  audio.load();
  typelist.push({ sound: audio, playing: true });
  playpause(typelist, typelist.length - 1);
}

function playpause(typelist, e) {
  typelist[e].sound.play();
  typelist[e].playing = true;
  setTimeout(() => {
    typelist[e].sound.pause();
    typelist[e].sound.currentTime = 0;
    typelist[e].playing = false;
  }, typelist[e].duration);
}

socket.on("tick_sounds", (sounds) => {
  if (sounds.plant) {
    playsound(plants, sound_plant);

    //sound_plant.cloneNode().play();
    //playaudio("sounds/plant.wav");
  }
  if (sounds.ricochet) {
    playsound(ricochets, sound_ricochet);
    //playaudio("sounds/ricochet.wav");
  }
  if (sounds.kill) {
    playsound(kills, sound_kill);
    //playaudio("sounds/kill.wav");
  }
  if (sounds.shoot) {
    playsound(tirs, sound_tir);

    //sound_tir.cloneNode().play();
    //playaudio("sounds/tir.wav");
  }
});
