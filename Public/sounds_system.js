// Needs a re-do with Howler.js because sounds not working on safari
// https://howlerjs.com/

var sound_tir = new Audio("sounds/tir.mp3");
var sound_kill = new Audio("sounds/kill.mp3");
var sound_explose = new Audio("sounds/eplose.mp3");
var sound_fuse = new Audio("sounds/fuse.mp3");
var sound_plant = new Audio("sounds/plant.mp3");
var sound_ricochet = new Audio("sounds/ricochet.mp3");

//list of already created sound elements
tirs = [];
plants = [];
kills = [];
ricochets = [];
fuses = [];
exploses = [];

function playsound(typelist, baseaudio) {
  for (let e = 0; e < typelist.length; e++) {
    if (typelist[e].playing == false) {
      playpause(typelist, e);
      return;
    }
  }
  audio = baseaudio.cloneNode();
  audio.load();
  audio.preservesPitch = false;
  typelist.push({ sound: audio, playing: true });
  playpause(typelist, typelist.length - 1);
}

function playpause(typelist, e) {
  typelist[e].sound.playbackRate = Number(getRandomArbitrary(0.8, 1.2)); // not working fuckkkkk
  typelist[e].sound.play();
  typelist[e].playing = true;
  setTimeout(() => {
    typelist[e].sound.pause();
    typelist[e].sound.currentTime = 0;
    typelist[e].playing = false;
  }, 2000);
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
  if (sounds.explose) {
    console.log("boom");
    playsound(exploses, sound_explose);

    //sound_tir.cloneNode().play();
    //playaudio("sounds/tir.wav");
  }
});
