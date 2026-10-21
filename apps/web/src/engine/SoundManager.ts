/**
 * SoundManager — plays the in-game sound effects.
 *
 * Sounds are synthesised on the fly (Web Audio oscillators + filtered noise via
 * `../audio`), so there are no audio files to download or decode. Everything
 * routes through the shared `audioBus`; the SFX volume (and mute) is owned
 * globally by the bus / settings, not per-manager.
 */
import { audioBus, playFuseWarning, playSfx } from "../audio";

export interface SoundEvents {
  shoot?: boolean;
  kill?: boolean;
  explose?: boolean;
  plant?: boolean;
  ricochet?: boolean;
  bounce_explode?: boolean;
}

/** Minimal shape the fuse scheduler needs from a live mine. */
export interface FuseMine {
  id?: number;
  timealive: number;
}

export class SoundManager {
  // Mine id → the `timealive` tick at which its next warning beep is due.
  private fuseBeeps = new Map<number, number>();

  // Play sounds based on game events.
  playSounds(soundEvents?: SoundEvents | null) {
    if (!soundEvents) return;
    if (soundEvents.shoot) playSfx("shoot");
    if (soundEvents.kill) playSfx("kill");
    if (soundEvents.explose) playSfx("explose");
    if (soundEvents.plant) playSfx("plant");
    if (soundEvents.ricochet) playSfx("ricochet");
    if (soundEvents.bounce_explode) playSfx("bulletBurst");
  }

  // Play one mine warning beep; `urgency` (0..1) rises as the blast nears.
  playFuse(urgency: number) {
    playFuseWarning(urgency);
  }

  /**
   * Drive the accelerated warning for every live mine. Beeps start with the
   * visual flash (roughly the last 27% of the fuse) and the gap between them
   * shrinks from ~22 to ~8 ticks, so the final seconds speed up and rise in
   * pitch instead of ticking at a flat rate. Safe to call every simulation tick.
   */
  playFuses(mines: readonly FuseMine[], fuseTicks: number) {
    const warnRemaining = Math.max(1, Math.round(fuseTicks * 0.27));
    const seen = new Set<number>();
    for (const mine of mines) {
      if (mine.id === undefined) continue;
      const remaining = fuseTicks - mine.timealive;
      if (remaining <= 0 || remaining > warnRemaining) continue;
      seen.add(mine.id);
      const next = this.fuseBeeps.get(mine.id) ?? 0;
      if (mine.timealive < next) continue;
      const urgency = Math.min(1, Math.max(0, 1 - remaining / warnRemaining));
      this.playFuse(urgency);
      this.fuseBeeps.set(
        mine.id,
        mine.timealive + Math.round(22 - 14 * urgency)
      );
    }
    // Forget mines that blew up or left the room.
    for (const id of this.fuseBeeps.keys()) {
      if (!seen.has(id)) this.fuseBeeps.delete(id);
    }
  }

  // Resume the AudioContext (required by browsers after a user interaction).
  resume() {
    audioBus.resume();
  }

  // Procedural voices schedule short-lived nodes that stop themselves, so there
  // is nothing to unload — kept for API parity with the old Howler manager.
  clear() {
    this.fuseBeeps.clear();
  }
}
