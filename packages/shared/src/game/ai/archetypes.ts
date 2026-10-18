import type { Size } from "../types.js";

// The v2 bot personality table. Every behavioural difference between bot kinds
// is DATA in this file — the brain (PR2) reads these numbers and contains no
// per-kind branches, so a new kind is a new row (+ a level spawn cell), not new
// code. The roster is exactly the nine enemy tanks of Wii Play "Tanks!"
// (bot1…bot9 ↔ level cells 11…19), plus "match": the host-added FFA combatant
// that drives an exactly-human chassis and has no level cell.

export type AIBotKind =
  | "bot1"
  | "bot2"
  | "bot3"
  | "bot4"
  | "bot5"
  | "bot6"
  | "bot7"
  | "bot8"
  | "bot9"
  | "match";

// Player-chassis overrides applied in the AIBot constructor. These mirror the
// legacy BOT_CONFIGS chassis values kind-for-kind so a v2 bot *shoots the same
// bullets* as its legacy counterpart — only the brain differs.
export interface ArchetypeChassis {
  canMove: boolean;
  mvtspeed: number; // px/s
  shoot_speed: number; // bullet px/s
  shoot_max_bounce: number; // bullet dies ON this wall contact ⇒ usable banks = this − 1
  bullet_type: number;
  bullet_size: Size;
  max_bulletcount: number;
  max_minecount: number;
}

// Brain tuning. Units: ticks are 60 Hz fixed steps, angles rad, distances px.
export interface ArchetypeAI {
  thinkPeriod: number; // ticks between full decision passes (staggered per bot)
  turretSlewRadS: number; // turret rotation speed, rad/s
  cooldownTicks: number; // min ticks between shots
  reactionTicks: number; // min ticks a firing solution must be held before firing
  aimTolRad: number; // max |turret − solution| angle to release a shot
  leadFactor: number; // 0 = aim at current pos, 1 = full intercept lead
  aimSigmaRad: number; // gaussian aim error, sampled once per shot
  maxPlanBounces: number; // wall bounces the planner may use (≤ shoot_max_bounce − 1)
  fanRays: number; // exact bounce rays per think for multi-bounce discovery
  unfoldBudget: number; // max analytic 1-bounce mirror candidates validated per think
  minQuality: number; // base shot-quality gate
  // How much each bullet already in flight raises the bar. Interacts with
  // max_bulletcount: keep minQuality + (max-1)*qualityPerBullet under the
  // ~1.15 quality ceiling or the last shots become unreachable.
  qualityPerBullet: number;
  bandMinPx: number; // preferred engagement range band (movers; 0/0 = unused)
  bandMaxPx: number;
  dodgeSkill: number; // 0..1 scales bullet-threat urgency (0 = never dodges)
  threatHorizonS: number; // how far ahead (s) bullet CPA threats are projected
  bounceAwareDodge: boolean; // also dodge the post-ricochet continuation of bullets
  minesEnabled: boolean; // stationary kinds must keep this false (5 s fuse, 90 px blast)
  mineCooldownTicks: number;
  chokeP: number; // probability of planting at a chokepoint on the target's path
  fleeDropP: number; // probability of dropping a mine while fleeing a pursuer
  breachEnabled: boolean; // may mine type-2 walls open when no path to the target exists
  idleScanRadS: number; // turret sweep speed with no target/solution
}

export interface Archetype {
  chassis: ArchetypeChassis;
  ai: ArchetypeAI;
}

// Tuning reference: the nine Wii Play "Tanks!" enemy types. Roles:
//   bot1 (brown)   Brown — stationary turret, ordinary shells (bounce once)
//   bot2 (grey)    Grey — basic mobile soldier, ordinary shells
//   bot3 (teal)    Teal — no-rebound rockets aimed directly; dodges direct fire only
//   bot4 (green)   Green — stationary sniper: rockets rebound twice, picky about shots
//   bot5 (yellow)  Yellow — mine-obsessed; mobile, throws shells only occasionally
//   bot6 (purple)  Warrior — fast, rapid-fire ordinary shells + light mines
//   bot7 (magenta) Rover — rapid-fire rusher that never dodges
//   bot8 (white)   White — rapid fire, mildly seeking, near-blind evasion
//   bot9 (black)   Elite — fastest; rapid no-rebound rockets + mines, evades well
//   match (dimgray) FFA match bot — host-added combatant on an exactly-human
//                 chassis (no level cell; spawned via Room.spawn_lobby_bot)
export const ARCHETYPES: Record<AIBotKind, Archetype> = {
  bot1: {
    // Wii Brown — a stationary turret with ordinary shells (bounce once), the
    // most forgiving enemy of the roster.
    chassis: {
      canMove: false,
      mvtspeed: 180,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 3,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 10,
      turretSlewRadS: 1.6,
      cooldownTicks: 130,
      reactionTicks: 18,
      aimTolRad: 0.08,
      leadFactor: 0.35,
      aimSigmaRad: 0.05,
      maxPlanBounces: 1,
      fanRays: 6,
      unfoldBudget: 6,
      // Sentries take low-priority long shots (300 px/s across a big map
      // lives on the distance-floor side of the quality formula).
      minQuality: 0.15,
      qualityPerBullet: 0.25,
      bandMinPx: 0,
      bandMaxPx: 0,
      dodgeSkill: 0,
      threatHorizonS: 0,
      bounceAwareDodge: false,
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.6,
    },
  },
  bot2: {
    // Wii Grey — the basic mobile soldier: roams at mid range with ordinary
    // shells (bounce once) and dodges a little.
    chassis: {
      canMove: true,
      mvtspeed: 180,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 3,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 2.4,
      cooldownTicks: 70,
      reactionTicks: 12,
      aimTolRad: 0.1,
      leadFactor: 0.5,
      aimSigmaRad: 0.06,
      maxPlanBounces: 1,
      fanRays: 0,
      unfoldBudget: 4,
      minQuality: 0.2,
      qualityPerBullet: 0.25,
      bandMinPx: 170,
      bandMaxPx: 320,
      dodgeSkill: 0.45,
      threatHorizonS: 0.7,
      bounceAwareDodge: false,
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.8,
    },
  },
  bot3: {
    // Wii Teal — fires 600 px/s rockets that never rebound, aimed directly;
    // dodges shells fired straight at it and ignores ricochets.
    chassis: {
      canMove: true,
      mvtspeed: 180,
      shoot_speed: 600,
      shoot_max_bounce: 1,
      bullet_type: 2,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 3,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 3.2,
      cooldownTicks: 80,
      reactionTicks: 8,
      aimTolRad: 0.05,
      leadFactor: 0.85,
      aimSigmaRad: 0.03,
      maxPlanBounces: 0,
      fanRays: 0,
      unfoldBudget: 0,
      minQuality: 0.4,
      qualityPerBullet: 0.25,
      bandMinPx: 250,
      bandMaxPx: 450,
      dodgeSkill: 0.7,
      threatHorizonS: 0.9,
      bounceAwareDodge: false, // only sensitive to shells fired directly at it
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.8,
    },
  },
  bot4: {
    // Wii Green — a stationary sniper: rockets rebound twice, and it is picky,
    // holding fire until a clean (usually banked) solution appears.
    chassis: {
      canMove: false,
      mvtspeed: 180,
      shoot_speed: 600,
      shoot_max_bounce: 3,
      bullet_type: 2,
      bullet_size: { w: 20, h: 20 },
      max_bulletcount: 3,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 4.5,
      cooldownTicks: 100,
      reactionTicks: 5,
      aimTolRad: 0.03,
      leadFactor: 1.0,
      aimSigmaRad: 0.012,
      maxPlanBounces: 2,
      fanRays: 10,
      unfoldBudget: 10,
      minQuality: 0.55, // minQuality + (max-1)*qualityPerBullet stays under the ceiling
      qualityPerBullet: 0.25,
      bandMinPx: 0,
      bandMaxPx: 0,
      dodgeSkill: 0,
      threatHorizonS: 0,
      bounceAwareDodge: false,
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.6,
    },
  },
  bot5: {
    // Wii Yellow — lives for mines, keeps a respectful middle distance, and
    // throws the occasional slow ordinary shell at the player.
    chassis: {
      canMove: true,
      mvtspeed: 200,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 3,
      max_minecount: 4,
    },
    ai: {
      thinkPeriod: 8,
      turretSlewRadS: 2.0,
      cooldownTicks: 150, // shells are an afterthought for this one
      reactionTicks: 20,
      aimTolRad: 0.12,
      leadFactor: 0.3,
      aimSigmaRad: 0.08,
      maxPlanBounces: 0,
      fanRays: 0,
      unfoldBudget: 2,
      minQuality: 0.4,
      qualityPerBullet: 0.25,
      // Keeps a respectful middle distance while it seeds the arena.
      bandMinPx: 250,
      bandMaxPx: 450,
      dodgeSkill: 0.15, // Wii yellow mostly ignores bullets...
      threatHorizonS: 0.5,
      bounceAwareDodge: false,
      minesEnabled: true, // ...but lives for mines
      mineCooldownTicks: 240,
      chokeP: 0.6,
      fleeDropP: 0.5,
      breachEnabled: true,
      idleScanRadS: 0.8,
    },
  },
  bot6: {
    // Wii Purple — fast and aggressive: rapid-fire ordinary shells plus light
    // minelaying, corners the player at knife range.
    chassis: {
      canMove: true,
      mvtspeed: 210,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 5, // player-grade magazine — sustained crossfire
      max_minecount: 2,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 3.0,
      cooldownTicks: 40,
      reactionTicks: 7,
      aimTolRad: 0.06,
      leadFactor: 0.85,
      aimSigmaRad: 0.03,
      maxPlanBounces: 1,
      fanRays: 4,
      unfoldBudget: 6,
      minQuality: 0.2,
      qualityPerBullet: 0.15,
      bandMinPx: 120, // corners the player at knife range
      bandMaxPx: 260,
      dodgeSkill: 0.7,
      threatHorizonS: 0.8,
      bounceAwareDodge: true,
      minesEnabled: true,
      mineCooldownTicks: 500,
      chokeP: 0.15,
      fleeDropP: 0.25,
      breachEnabled: false,
      idleScanRadS: 0.9,
    },
  },
  bot7: {
    // Wii Red/Magenta — a rapid-fire rover: charges straight at the player,
    // sprays ordinary shells, and never even tries to dodge.
    chassis: {
      canMove: true,
      mvtspeed: 195,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 5,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 3.4,
      cooldownTicks: 38,
      reactionTicks: 6,
      aimTolRad: 0.06,
      leadFactor: 0.65,
      aimSigmaRad: 0.045,
      maxPlanBounces: 1,
      fanRays: 4,
      unfoldBudget: 6,
      minQuality: 0.15,
      qualityPerBullet: 0.15,
      bandMinPx: 80, // presses into the player's face
      bandMaxPx: 300,
      dodgeSkill: 0, // fearless — Wii red never evades
      threatHorizonS: 0,
      bounceAwareDodge: false,
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.9,
    },
  },
  bot8: {
    // Wii White — the stealth-fighter: rapid-fire seeker with sloppy aim and
    // effectively blind evasion (it barely notices incoming shells).
    chassis: {
      canMove: true,
      mvtspeed: 180,
      shoot_speed: 300,
      shoot_max_bounce: 2,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 5,
      max_minecount: 0,
    },
    ai: {
      thinkPeriod: 7,
      turretSlewRadS: 2.8,
      cooldownTicks: 48,
      reactionTicks: 9,
      aimTolRad: 0.08,
      leadFactor: 0.5,
      aimSigmaRad: 0.075,
      maxPlanBounces: 1,
      fanRays: 2,
      unfoldBudget: 4,
      minQuality: 0.22,
      qualityPerBullet: 0.15,
      bandMinPx: 150,
      bandMaxPx: 330,
      dodgeSkill: 0.08, // "basically blind": almost never reacts to threats
      threatHorizonS: 0.4,
      bounceAwareDodge: false,
      minesEnabled: false,
      mineCooldownTicks: 0,
      chokeP: 0,
      fleeDropP: 0,
      breachEnabled: false,
      idleScanRadS: 0.9,
    },
  },
  bot9: {
    // Wii Black — the elite: the fastest tank on the field, firing pairs of
    // no-rebound rockets, laying the occasional mine, and dodging like a pro.
    chassis: {
      canMove: true,
      mvtspeed: 240, // fastest of the nine
      shoot_speed: 600,
      shoot_max_bounce: 1,
      bullet_type: 2,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 2, // fires its rockets in quick pairs
      max_minecount: 2,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 3.2,
      cooldownTicks: 45,
      reactionTicks: 6,
      aimTolRad: 0.05,
      leadFactor: 0.9,
      aimSigmaRad: 0.025,
      maxPlanBounces: 0,
      fanRays: 0,
      unfoldBudget: 0,
      minQuality: 0.3,
      qualityPerBullet: 0.2,
      bandMinPx: 150,
      bandMaxPx: 400,
      dodgeSkill: 0.95,
      threatHorizonS: 1.0,
      bounceAwareDodge: true,
      minesEnabled: true,
      mineCooldownTicks: 450,
      chokeP: 0.2,
      fleeDropP: 0.3,
      breachEnabled: false,
      idleScanRadS: 0.9,
    },
  },
  match: {
    // The chassis IS the contract: every value equals the Player constructor
    // default (a lobby bot drives exactly the tank a human gets) — pinned by
    // room-lobby-bots.test.ts. The brain is a bot6 tuned for fair play at a
    // human's 180 px/s: same reactions, slightly wider engagement band, and
    // two usable banks (player bullets die on their 3rd wall contact).
    chassis: {
      canMove: true,
      mvtspeed: 180,
      shoot_speed: 300,
      shoot_max_bounce: 3,
      bullet_type: 1,
      bullet_size: { w: 15, h: 15 },
      max_bulletcount: 5,
      max_minecount: 3,
    },
    ai: {
      thinkPeriod: 6,
      turretSlewRadS: 3.0,
      cooldownTicks: 45,
      reactionTicks: 8,
      aimTolRad: 0.06,
      leadFactor: 0.85,
      aimSigmaRad: 0.03,
      maxPlanBounces: 2,
      fanRays: 4,
      unfoldBudget: 6,
      minQuality: 0.2,
      qualityPerBullet: 0.15,
      bandMinPx: 150,
      bandMaxPx: 350,
      dodgeSkill: 0.7,
      threatHorizonS: 0.8,
      bounceAwareDodge: true,
      minesEnabled: true,
      mineCooldownTicks: 500,
      chokeP: 0.15,
      fleeDropP: 0.25,
      breachEnabled: false,
      idleScanRadS: 0.9,
    },
  },
};
