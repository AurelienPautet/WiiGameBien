// Pure interpolation helpers for the display loop. The simulation runs at a
// fixed rate (see @ouigame/shared/game loop constants); rendering happens at the
// display refresh rate and interpolates between the two most recent simulation
// states so motion stays perfectly smooth and decoupled from the sim rate.
//
// Everything here is side-effect free so it can be unit tested in isolation.

/** Linear interpolation between `a` and `b` by `t` in [0,1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp `v` into the inclusive range [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Interpolate between two angles (radians) along the shortest arc, so a tank or
 * bullet spinning across the ±π wrap never does a full backwards spin.
 */
export function lerpAngle(a: number, b: number, t: number): number {
  // Shortest signed delta in (-π, π].
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

/** A render pose: position plus optional facing/orientation angles. */
export interface Pose {
  x: number;
  y: number;
  angle?: number;
  rotation?: number;
}

/** Interpolate a full pose (position lerp + shortest-arc angle lerp). */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  if (a.angle !== undefined && b.angle !== undefined) {
    out.angle = lerpAngle(a.angle, b.angle, t);
  } else if (b.angle !== undefined) {
    out.angle = b.angle;
  }
  if (a.rotation !== undefined && b.rotation !== undefined) {
    out.rotation = lerp(a.rotation, b.rotation, t);
  } else if (b.rotation !== undefined) {
    out.rotation = b.rotation;
  }
  return out;
}

/** Anything with a position and (optionally) facing angles we can interpolate. */
export interface Posable {
  position: { x: number; y: number };
  angle?: number;
  rotation?: number;
}

/** Read the render pose out of a positioned entity. */
export function poseOf(e: Posable): Pose {
  const pose: Pose = { x: e.position.x, y: e.position.y };
  if (e.angle !== undefined) pose.angle = e.angle;
  if (e.rotation !== undefined) pose.rotation = e.rotation;
  return pose;
}

/**
 * Shallow-clone an entity, overriding its position/angle with an interpolated
 * pose. Every other field (size, colour, alive, type, …) is carried through
 * unchanged so the renderer sees a complete entity that simply sits at the
 * interpolated spot.
 */
export function withPose<T extends Posable>(e: T, pose: Pose): T {
  const out = { ...e, position: { x: pose.x, y: pose.y } } as T;
  if (pose.angle !== undefined) out.angle = pose.angle;
  if (pose.rotation !== undefined) out.rotation = pose.rotation;
  return out;
}

/** A simulation/server state stamped with the wall-clock time it represents. */
export interface TimedFrame<S> {
  t: number;
  state: S;
}

/**
 * Pick the two buffered frames that straddle `renderTime` and the blend factor
 * between them, for entity interpolation of an online stream. The buffer must be
 * ordered by ascending `t`.
 *
 * - Empty buffer → null.
 * - `renderTime` before the oldest frame → that frame, alpha 0 (we never
 *   extrapolate backwards).
 * - `renderTime` at/after the newest frame → the newest frame, alpha 0 (hold the
 *   latest known state rather than extrapolate into the future).
 */
export function sampleBuffer<S>(
  buffer: TimedFrame<S>[],
  renderTime: number
): { a: TimedFrame<S>; b: TimedFrame<S>; alpha: number } | null {
  if (buffer.length === 0) return null;
  const first = buffer[0]!;
  if (renderTime <= first.t) return { a: first, b: first, alpha: 0 };

  for (let i = buffer.length - 1; i >= 0; i--) {
    const a = buffer[i]!;
    if (a.t <= renderTime) {
      const b = buffer[i + 1] ?? a;
      const span = b.t - a.t;
      const alpha = span > 0 ? clamp((renderTime - a.t) / span, 0, 1) : 0;
      return { a, b, alpha };
    }
  }
  // Unreachable (renderTime > first.t guaranteed a match), but stay total.
  return { a: first, b: first, alpha: 0 };
}

/**
 * Drop frames older than `cutoff` from the front of an ascending-time buffer,
 * keeping at least the most recent frame so there is always something to show.
 */
export function pruneBuffer<S>(buffer: TimedFrame<S>[], cutoff: number): void {
  while (buffer.length > 1 && buffer[0]!.t < cutoff) {
    buffer.shift();
  }
}

/**
 * Maps the server's simulation timeline onto a smooth local playback clock.
 *
 * Online snapshots are stamped with the server tick, which advances exactly one
 * `SIM_STEP_MS` per simulation step. Those game times are therefore perfectly
 * evenly spaced, even though the packets carrying them arrive with network
 * jitter. Stamping frames with their *arrival* time instead (the pre-smoothing
 * behaviour) makes a late packet freeze the world and the following burst replay
 * two steps at once — the classic online rubber-band stutter.
 *
 * `observe()` measures the offset between the server timeline and
 * `performance.now()` for every arrival. Network delay is never negative, so the
 * smallest offset seen in the recent window is the closest estimate of the true
 * clock offset; larger samples are pure jitter. `now()` then returns a
 * *monotonic* playback position that tracks that estimate at ~1x real time and
 * absorbs small clock changes by nudging its rate (±8%) instead of jumping. A
 * large discontinuity (backgrounded tab, socket stall) snaps.
 */
export class InterpolationClock {
  /** How much arrival history feeds the offset estimate. */
  private readonly windowMs: number;
  private samples: { arrival: number; offset: number }[] = [];
  private offsetMs: number | null = null;
  private playbackMs: number | null = null;
  private lastRealMs = 0;

  // Drift corrections: converge `DRIFT_MS` of error by adjusting playback speed
  // by at most `MAX_RATE_ADJUST`; anything past `SNAP_MS` is a discontinuity.
  private static readonly DRIFT_MS = 500;
  private static readonly MAX_RATE_ADJUST = 0.08;
  private static readonly SNAP_MS = 500;

  constructor(windowMs = 3000) {
    this.windowMs = windowMs;
  }

  /**
   * Record one server frame: `serverMs` is its simulation-timeline timestamp
   * (tick × step), `arrivalMs` the `performance.now()` at which it arrived.
   */
  observe(serverMs: number, arrivalMs: number): void {
    if (!Number.isFinite(serverMs) || !Number.isFinite(arrivalMs)) return;

    this.samples.push({ arrival: arrivalMs, offset: arrivalMs - serverMs });
    const cutoff = arrivalMs - this.windowMs;
    let drop = 0;
    while (
      drop < this.samples.length - 1 &&
      this.samples[drop]!.arrival < cutoff
    ) {
      drop++;
    }
    if (drop > 0) this.samples.splice(0, drop);

    // The fastest arrival in the window wins: every sample carries at least the
    // one-way delay, so the minimum is the least-delayed observation.
    let minOffset = Infinity;
    for (const sample of this.samples) {
      if (sample.offset < minOffset) minOffset = sample.offset;
    }
    this.offsetMs = minOffset;
  }

  /**
   * Playback position on the server timeline, rendered `delayMs` behind the
   * live clock. Returns null until the first observation.
   */
  now(realMs: number, delayMs: number): number | null {
    if (this.offsetMs === null) return null;

    const target = realMs - this.offsetMs - delayMs;
    if (this.playbackMs === null) {
      this.playbackMs = target;
      this.lastRealMs = realMs;
      return this.playbackMs;
    }

    const elapsed = Math.max(0, realMs - this.lastRealMs);
    this.lastRealMs = realMs;
    const error = target - this.playbackMs;

    if (Math.abs(error) > InterpolationClock.SNAP_MS) {
      // A stall/tab-resume-style discontinuity: re-anchor rather than spend
      // seconds sliding back into sync.
      this.playbackMs = target;
    } else {
      const adjust = clamp(
        error / InterpolationClock.DRIFT_MS,
        -InterpolationClock.MAX_RATE_ADJUST,
        InterpolationClock.MAX_RATE_ADJUST
      );
      this.playbackMs += elapsed * (1 + adjust);
    }
    return this.playbackMs;
  }

  /** Forget all history (new room/level or engine teardown). */
  reset(): void {
    this.samples = [];
    this.offsetMs = null;
    this.playbackMs = null;
    this.lastRealMs = 0;
  }
}
