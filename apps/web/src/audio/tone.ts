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
    // Tone's barrel creates a default context on import (the Transport and
    // Destination singletons call getContext()). Replace it with the bus
    // context and close the discarded one so the page only owns a single
    // AudioContext. Guard against HMR/repeated binding: if the current global
    // context already wraps the bus context, disposing it would close the live
    // context.
    const previous = Tone.getContext();
    const previousRaw = (previous as unknown as { rawContext?: AudioContext })
      .rawContext;
    // Construct the replacement with the timeout clock so it never spawns a
    // blob: worker itself. Deployments that block blob workers via CSP would
    // otherwise leave the Transport frozen even after the AudioContext
    // resumes; the timeout clock is immune and is plenty accurate for
    // sixteenth-note music.
    const next = new Tone.Context({
      context: ctx,
      clockSource: "timeout",
    });
    Tone.setContext(next);
    if (previousRaw && previousRaw !== ctx) previous.dispose();
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
