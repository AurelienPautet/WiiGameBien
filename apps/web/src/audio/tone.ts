/**
 * One shared Tone.js binding for the whole audio stack.
 *
 * `AudioBus` owns the single native AudioContext (and the SFX/music sub-buses).
 * Tone is pointed at that same context instead of creating its own, so the
 * procedural SFX, the adaptive soundtrack and the settings sliders all share
 * one clock, one destination and one volume graph.
 */
import * as Tone from "tone";
import { audioBus } from "./AudioBus";

let bound = false;
let sfxDestination: Tone.Gain | null = null;

/**
 * Bind Tone to the bus context and return the module. Returns null in
 * non-browser environments (jsdom tests, SSR) where there is no AudioContext.
 */
export function getTone(): typeof Tone | null {
  const ctx = audioBus.ctx;
  if (!ctx) return null;
  if (!bound) {
    // Passing the raw context avoids Tone creating a second AudioContext.
    Tone.setContext(ctx);
    bound = true;
  }
  return Tone;
}

/** Tone-side destination for one-shot SFX, wired into the bus's SFX gain. */
export function getSfxDestination(): Tone.Gain | null {
  const T = getTone();
  const out = audioBus.out;
  if (!T || !out) return null;
  if (!sfxDestination) sfxDestination = new T.Gain(1).connect(out);
  return sfxDestination;
}
