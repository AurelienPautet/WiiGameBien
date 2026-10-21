/**
 * MusicEngine — the adaptive, fully procedural soundtrack.
 *
 * The composition itself lives in `score.ts` (Tonal chord progressions + a
 * seeded melody generator); this file is the instrument/mix layer. Tone.js
 * synths replace the old bare oscillators, and a small effects chain
 * (low-pass → chorus → delay → convolution reverb) gives the soundtrack a
 * produced, warm character. The reverb impulse is generated at runtime, so
 * there are still no audio assets to download.
 *
 * The game still drives the arrangement: `GameEngine` calls
 * `setMusicIntensity(aliveEnemies)` every few frames, which crossfades the
 * percussion/harmony layers and changes the note density exactly as before.
 * The Transport schedules sixteenth steps against the shared audio clock.
 */
import type * as ToneNS from "tone";
import { audioBus } from "./AudioBus";
import {
  buildScore,
  eventsForStep,
  midiToFreq,
  type LayerName,
  type MusicMode,
  type Score,
  type StepEvent,
} from "./score";
import { getTone } from "./tone";

const MENU_SEED = 0x51ce;

interface Voices {
  melody: ToneNS.PolySynth<ToneNS.FMSynth>;
  bass: ToneNS.MonoSynth;
  arp: ToneNS.PolySynth<ToneNS.Synth>;
  kick: ToneNS.MembraneSynth;
  snareNoise: ToneNS.NoiseSynth;
  snareBody: ToneNS.MembraneSynth;
  hat: ToneNS.NoiseSynth;
  hatOpen: ToneNS.NoiseSynth;
  cymbal: ToneNS.NoiseSynth;
  timpani: ToneNS.MembraneSynth;
}

class MusicEngine {
  private mode: MusicMode = "menu";
  private intensity = 0;
  private playing = false;
  private step = 0;
  private score: Score = buildScore("menu", MENU_SEED);
  private layers: Record<LayerName, ToneNS.Gain> | null = null;
  private voices: Voices | null = null;

  /** Build the Tone graph once, sharing the bus context. */
  private ensureGraph(): boolean {
    if (this.layers && this.voices) return true;
    const T = getTone();
    const out = audioBus.musicOut;
    if (!T || !out) return false;

    const outGain = new T.Gain(0.9).connect(out);
    const bus = new T.Gain(0.85);
    const filter = new T.Filter({ type: "lowpass", frequency: 9500, Q: 0.3 });
    const chorus = new T.Chorus({
      frequency: 0.55,
      delayTime: 3.2,
      depth: 0.22,
      wet: 0.18,
    }).start();
    const delay = new T.FeedbackDelay({
      delayTime: "8n.",
      feedback: 0.16,
      wet: 0.1,
    });
    const reverb = new T.Reverb({ decay: 2.8, preDelay: 0.015, wet: 0.22 });
    bus.chain(filter, chorus, delay, reverb, outGain);

    const layer = (): ToneNS.Gain => {
      const gain = new T.Gain(0);
      gain.connect(bus);
      return gain;
    };
    const layers: Record<LayerName, ToneNS.Gain> = {
      melody: layer(),
      bass: layer(),
      arp: layer(),
      timpani: layer(),
      kick: layer(),
      snare: layer(),
      hat: layer(),
      cymbal: layer(),
    };

    // Music-box-ish lead: FM gives it harmonics without sounding 8-bit.
    const melody = new T.PolySynth(T.FMSynth, {
      harmonicity: 2.5,
      modulationIndex: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.004, decay: 0.22, sustain: 0.07, release: 0.5 },
      modulation: { type: "triangle" },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.06,
        release: 0.4,
      },
    }).connect(layers.melody);
    melody.volume.value = -6;

    const bass = new T.MonoSynth({
      oscillator: { type: "triangle" },
      filter: { type: "lowpass", Q: 2, rolloff: -24 },
      envelope: { attack: 0.008, decay: 0.28, sustain: 0.22, release: 0.4 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.22,
        sustain: 0.18,
        release: 0.4,
        baseFrequency: 110,
        octaves: 2.4,
      },
    }).connect(layers.bass);
    bass.volume.value = -6;

    const arp = new T.PolySynth(T.Synth, {
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.003, decay: 0.18, sustain: 0.04, release: 0.2 },
    }).connect(layers.arp);
    arp.volume.value = -12;

    const kick = new T.MembraneSynth({
      pitchDecay: 0.045,
      octaves: 5,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0.01, release: 0.1 },
    }).connect(layers.kick);
    kick.volume.value = -4;

    const snareNoise = new T.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    }).connect(layers.snare);
    snareNoise.volume.value = -10;

    const snareBody = new T.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.01, release: 0.06 },
    }).connect(layers.snare);
    snareBody.volume.value = -12;

    const hat = new T.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0 },
    }).connect(layers.hat);
    hat.volume.value = -16;

    const hatOpen = new T.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
    }).connect(layers.hat);
    hatOpen.volume.value = -18;

    const cymbalFilter = new T.Filter({
      type: "highpass",
      frequency: 4500,
    });
    const cymbal = new T.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.002, decay: 0.5, sustain: 0 },
    }).chain(cymbalFilter, layers.cymbal);
    cymbal.volume.value = -18;

    const timpani = new T.MembraneSynth({
      pitchDecay: 0.12,
      octaves: 3.5,
      envelope: { attack: 0.002, decay: 0.4, sustain: 0.05, release: 0.5 },
    }).connect(layers.timpani);
    timpani.volume.value = -8;

    this.layers = layers;
    this.voices = {
      melody,
      bass,
      arp,
      kick,
      snareNoise,
      snareBody,
      hat,
      hatOpen,
      cymbal,
      timpani,
    };

    const transport = T.getTransport();
    transport.bpm.value = this.score.bpm;
    transport.swing = 0.02;
    transport.swingSubdivision = "8n";
    transport.scheduleRepeat((time) => this.onStep(time), "16n");
    return true;
  }

  /** Crossfade every layer toward the level its (mode, intensity) calls for. */
  private updateLayers(): void {
    const T = getTone();
    if (!this.layers || !T) return;
    const game = this.mode === "game";
    const I = this.intensity;
    const targets: Record<LayerName, number> = {
      melody: 0.5,
      bass: 0.4,
      arp: game ? (I >= 3 ? 0.14 : 0) : 0.16,
      hat: game ? (I >= 2 ? 0.16 : 0) : 0.1,
      kick: game && I >= 1 ? 0.6 : 0,
      snare: game && I >= 2 ? 0.4 : 0,
      cymbal: game && I >= 3 ? 0.26 : 0,
      timpani: game && I >= 1 ? 0.4 : 0,
    };
    this.rampLayers(targets, 0.18);
  }

  private rampLayers(
    targets: Record<LayerName, number>,
    seconds: number
  ): void {
    const T = getTone();
    if (!this.layers || !T) return;
    const now = T.getContext().currentTime;
    for (const name of Object.keys(targets) as LayerName[]) {
      const gain = this.layers[name].gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(targets[name] ?? 0, now + seconds);
    }
  }

  private trigger(event: StepEvent, time: number): void {
    const voices = this.voices;
    if (!voices) return;
    switch (event.layer) {
      case "melody":
        voices.melody.triggerAttackRelease(
          midiToFreq(event.midi),
          event.duration,
          time,
          event.velocity
        );
        break;
      case "bass":
        voices.bass.triggerAttackRelease(
          midiToFreq(event.midi),
          event.duration,
          time,
          event.velocity
        );
        break;
      case "arp":
        voices.arp.triggerAttackRelease(
          midiToFreq(event.midi),
          event.duration,
          time,
          event.velocity
        );
        break;
      case "timpani":
        voices.timpani.triggerAttackRelease(
          midiToFreq(event.midi),
          event.duration,
          time,
          event.velocity
        );
        break;
      case "kick":
        voices.kick.triggerAttackRelease(
          55,
          event.duration,
          time,
          event.velocity
        );
        break;
      case "snare":
        voices.snareNoise.triggerAttackRelease(
          event.duration,
          time,
          event.velocity
        );
        voices.snareBody.triggerAttackRelease(
          180,
          0.06,
          time,
          event.velocity * 0.5
        );
        break;
      case "hat":
        (event.open ? voices.hatOpen : voices.hat).triggerAttackRelease(
          event.duration,
          time,
          event.velocity
        );
        break;
      case "cymbal":
        voices.cymbal.triggerAttackRelease(
          event.duration,
          time,
          event.velocity
        );
        break;
    }
  }

  /** Transport callback: schedule one sixteenth, then advance. */
  private onStep(time: number): void {
    if (!this.playing) return;
    const events = eventsForStep(this.score, this.step, this.intensity);
    for (const event of events) this.trigger(event, time);
    this.step = (this.step + 1) % this.score.totalSteps;
  }

  /** Start (or switch to) a mode. Safe to call repeatedly; crossfades layers. */
  start(mode: MusicMode): void {
    const T = getTone();
    this.mode = mode;
    if (!T) {
      // No Web Audio (jsdom) — record intent, stay silent.
      this.playing = true;
      return;
    }
    if (!this.ensureGraph()) return;

    const changed = this.score.mode !== mode || !this.playing;
    if (changed) {
      const seed =
        mode === "game" ? Math.floor(Math.random() * 0xffffffff) : MENU_SEED;
      this.score = buildScore(mode, seed);
      this.step = 0;
    }
    this.playing = true;

    const transport = T.getTransport();
    transport.bpm.value = this.score.bpm;
    transport.swing = mode === "game" ? 0.05 : 0.02;
    if (changed && transport.state === "started") {
      transport.stop();
      transport.position = 0;
    }
    if (transport.state !== "started") {
      transport.position = 0;
      transport.start("+0.06");
    }

    audioBus.resume();
    this.updateLayers();
  }

  /** Set the game intensity (0 = clear, higher = more/stronger enemies). */
  setIntensity(level: number): void {
    const clamped = level < 0 ? 0 : level > 4 ? 4 : Math.round(level);
    if (clamped === this.intensity) return;
    this.intensity = clamped;
    if (this.playing && this.mode === "game") this.updateLayers();
  }

  /** Stop the soundtrack, fading the layers out. */
  stop(): void {
    this.playing = false;
    this.step = 0;
    const T = getTone();
    if (!T || !this.layers) return;
    T.getTransport().stop();
    T.getTransport().position = 0;
    const targets = Object.fromEntries(
      (Object.keys(this.layers) as LayerName[]).map((name) => [name, 0])
    ) as Record<LayerName, number>;
    this.rampLayers(targets, 0.25);
  }
}

export const music = new MusicEngine();

/** Play the calm menu/UI loop. */
export const startMenuMusic = (): void => music.start("menu");
/** Switch to the adaptive in-game loop. */
export const startGameMusic = (): void => music.start("game");
/** Stop the soundtrack (fading out). */
export const stopMusic = (): void => music.stop();
/** Drive the in-game intensity (0 = clear … 4 = mayhem). */
export const setMusicIntensity = (level: number): void =>
  music.setIntensity(level);
