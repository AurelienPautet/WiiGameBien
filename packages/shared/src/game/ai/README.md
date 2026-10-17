# Bot AI v2

The bot brain that powers solo/campaign enemies. It shares **nothing** with the
legacy AI (`../Bot.ts`, `../possible_moves.ts`, `../possible_shots_balls.ts` —
untouched, still selectable); it drives the same `Player` chassis through the
same Bullet/Mine/Room simulation.

## Selecting a system

`Room.bot_system: "legacy" | "v2"` (constructor default `"legacy"` — hosts opt
in before `spawn_all_bots()`). The web client sets it from
`apps/web/src/lib/botSystem.ts`: URL `?bots=v2|legacy` (either side of the
hash) > localStorage `bot_system` > default (`v2`). `?bots=legacy` is the
permanent escape hatch. `Room.bot_seed` (+ per-socketid FNV hash) seeds every
brain's RNG — pin it for reproducible games (see the determinism test).

## Architecture (one tick)

```
AIBot.update(room, dt, ctx?, dbg?)             every fixed 60 Hz tick
 ├─ brainTick()                                brain.ts — decisions BEFORE the
 │   ├─ refreshPerTick(room)                   chassis moves (bullets update
 │   │    room_state.ts: WeakMap<Room, state>  first, so dodges see this tick)
 │   │    grid rebuild on geometry change, BFS flow fields (flow.ts),
 │   │    human velocity EMAs
 │   ├─ senseThreats()                         perception.ts: bullet CPA
 │   │    (+post-ricochet continuations), fuse-weighted mine danger
 │   ├─ think() every thinkPeriod (staggered)  FSM → intent → steering solve →
 │   │    targeting refresh → mine policy
 │   ├─ micro-aim + turret slew                targeting.ts: re-lead each tick
 │   ├─ fire control                           quality/cooldown/reaction gates,
 │   │                                         1 revalidation cast at commit
 │   └─ debug overlay (Shift in-game)          debug.ts
 └─ super.update(room, dt)                     Player chassis integration
```

- **grid.ts** — Amanatides & Woo DDA over the 23×16 tile grid with r-offset
  reflection planes (exactly the Minkowski geometry `Bullet.ts` sweeps).
  Corner grazes are _flagged and rejected_, never modelled. The golden test
  (`__tests__/ai/grid.test.ts`) pins the DDA polyline to a real stepped Bullet
  within 1.5 px — if physics and model ever diverge, that test fails.
- **targeting.ts** — intercept quadratic (true leading), analytic 1-bounce
  mirror unfolding (lead _through_ the bounce), golden-angle rotating fan for
  2-bounce discovery, cached solutions revalidated at fire commit, ordered
  friendly/self/mine path vetoes (friendly fire is real in this engine).
- **steering.ts** — 8-way context steering (matches the chassis' sign-only
  movement) with danger maps, wall probes, separation and hysteresis.
- **brain.ts** — FSM: IDLE / WANDER / HUNT (flow descent) / ENGAGE (range
  band + strafe) / EVADE / POST_MINE. Mine policy: chokepoint plants,
  flee-drops when pursued, type-2 wall **breaching**, with hard self/teammate
  safety gates (sims pin zero own-mine deaths).

## Archetypes (archetypes.ts — tuning lives HERE, not in code)

The roster is exactly the nine Wii Play "Tanks!" enemy types (bot1…bot9 ↔
cells 11…19), plus `match`: the host-added FFA combatant on an exactly-human
chassis (no level cell, spawned via `Room.spawn_lobby_bot`).

| kind         | cell | role                                                           |
| ------------ | ---- | -------------------------------------------------------------- |
| bot1 brown   | 11   | Brown — stationary turret, ordinary shells (bounce once)       |
| bot2 grey    | 12   | Grey — basic mobile soldier, ordinary shells                   |
| bot3 teal    | 13   | Teal — no-rebound rockets aimed directly, dodges direct fire   |
| bot4 green   | 14   | Green — stationary sniper, rockets rebound twice, picky        |
| bot5 yellow  | 15   | Yellow — mine-obsessed; occasional shells                      |
| bot6 purple  | 16   | Purple — fast, rapid-fire shells + light mines                 |
| bot7 magenta | 17   | Red/Magenta — rapid-fire rusher that never dodges              |
| bot8 white   | 18   | White — rapid fire, mildly seeking, near-blind evasion         |
| bot9 black   | 19   | Black — fastest; rapid no-rebound rockets + mines, evades well |

Under `legacy`, cells 15–19 spawn bot2-config stand-ins but keep the authored
names/colours and still advance the bot id counter (campaign `skipIds` parity
across systems).

## Constraints to respect when changing anything here

- **Wire safety**: all AI state lives behind `#private` fields on `AIBot`; the
  only enumerable field beyond `Player` is `kind`
  (`__tests__/ai/aibot-serialization.test.ts` pins it). Never `structuredClone`
  players — #private state and the prototype would be silently dropped.
- **Determinism**: brains draw ONLY from their seeded `Rng` — `Math.random` is
  forbidden in `ai/` (the determinism test catches violations).
- **No legacy imports**: `ai/` must never import `Bot.ts` /
  `possible_moves.ts` / `possible_shots_balls.ts` (type-only `Room`/`BotKind`
  imports are fine).
- **Zero steady-state allocation**: scratch buffers are module-level; the sim
  is single-threaded and never reentrant.
- **Tuning loop**: change numbers in `archetypes.ts`, then run
  `pnpm exec vitest run packages/shared/src/game/__tests__/ai/` — the
  capability gates in `aibot-behavior.test.ts` (TTK, dodge survival, maze
  navigation, mine safety) are the regression net.
