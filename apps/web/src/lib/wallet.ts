// The OuiCoins wallet + tank-paint garage: the single source of truth for the
// player's currency and cosmetic ownership.
//
// LOCAL-FIRST BY DESIGN. The cosmetics themselves are client-side (body/turret
// colours already live in localStorage and travel to the server with `play`),
// and solo/campaign play works without an account, so the wallet lives beside
// them in a versioned localStorage blob. The earn rules are pure functions
// (unit-tested) fed by the round outcomes the client already receives: the
// online `winner` payload, solo level results and campaign runs. Nothing here is
// authoritative for competition — the server-side stats/achievements remain the
// leaderboard source of truth.
import { DEFAULT_PAINT, TANK_PAINTS, isPaintId } from "../constants/tankPaints";
import { storage } from "./storage";

/** Small welcome balance; the cheapest paint still takes a real session. */
export const STARTING_COINS = 50;

export const COINS_PER_KILL = 1;
export const ONLINE_WIN_BONUS = 10;
export const SOLO_WIN_BONUS = 10;
export const CAMPAIGN_CLEAR_BONUS = 5;
export const CAMPAIGN_COMPLETE_BONUS = 25;
export const ACHIEVEMENT_COIN_BONUS = 5;

export interface GarageState {
  /** Spendable OuiCoins. */
  coins: number;
  /** Paint ids the player owns (always includes `plain`), catalog order. */
  owned: string[];
  /** Paint id currently applied to the hull. */
  equipped: string;
}

export type BuyResult = "bought" | "owned" | "poor" | "unknown";

/** Non-negative integer from arbitrary input (NaN/negatives/floats → 0). */
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

// --- Pure earn rules ----------------------------------------------------------

/** OuiCoins for one online round: kills + a win bonus (coop team win counts). */
export function coinsForOnlineRound({
  kills,
  wins,
}: {
  kills: number;
  wins: number;
}): number {
  return (
    count(kills) * COINS_PER_KILL + (count(wins) > 0 ? ONLINE_WIN_BONUS : 0)
  );
}

/** OuiCoins for one solo level: kills + a clear bonus. Losses still pay kills. */
export function coinsForSoloRound({
  success,
  kills,
}: {
  success: boolean;
  kills: number;
}): number {
  return count(kills) * COINS_PER_KILL + (success ? SOLO_WIN_BONUS : 0);
}

/** OuiCoins for a campaign run: per level cleared + the completion bonus. */
export function coinsForCampaignRun({
  completed,
  levelsCleared,
}: {
  completed: boolean;
  levelsCleared: number;
}): number {
  return (
    count(levelsCleared) * CAMPAIGN_CLEAR_BONUS +
    (completed ? CAMPAIGN_COMPLETE_BONUS : 0)
  );
}

/** OuiCoins granted for unlocking achievements (one bonus per key). */
export function coinsForAchievements(unlockedCount: number): number {
  return count(unlockedCount) * ACHIEVEMENT_COIN_BONUS;
}

// --- Persisted state ----------------------------------------------------------

/** A brand-new garage: welcome coins, the free plain hull equipped. */
export function emptyGarage(): GarageState {
  return {
    coins: STARTING_COINS,
    owned: [DEFAULT_PAINT],
    equipped: DEFAULT_PAINT,
  };
}

/**
 * Validate/normalize a persisted (or tampered) garage blob. Unknown paint ids
 * are dropped, `plain` is always owned, a stale equipped id resets to plain and
 * a negative/non-finite balance clamps to 0. Any other shape → a fresh garage.
 * Keeping the owned list in catalog order makes the UI deterministic.
 */
export function parseGarage(raw: unknown): GarageState {
  if (raw == null || typeof raw !== "object") return emptyGarage();
  const obj = raw as Record<string, unknown>;

  const ownedSet = new Set<string>([DEFAULT_PAINT]);
  if (Array.isArray(obj.owned)) {
    for (const id of obj.owned) {
      if (typeof id === "string" && isPaintId(id)) ownedSet.add(id);
    }
  }
  const owned = TANK_PAINTS.filter((p) => ownedSet.has(p.id)).map((p) => p.id);
  const equipped =
    typeof obj.equipped === "string" && ownedSet.has(obj.equipped)
      ? obj.equipped
      : DEFAULT_PAINT;

  return {
    coins:
      typeof obj.coins === "number" && Number.isFinite(obj.coins)
        ? Math.max(0, Math.floor(obj.coins))
        : STARTING_COINS,
    owned,
    equipped,
  };
}

// Cached snapshot for useSyncExternalStore: the object identity only changes on
// a mutation, so React can bail out of unchanged renders.
let snapshot: GarageState | null = null;
const listeners = new Set<() => void>();

function read(): GarageState {
  if (snapshot === null) {
    snapshot = parseGarage(storage.getGarage<unknown>());
  }
  return snapshot;
}

function commit(next: GarageState): void {
  snapshot = next;
  storage.setGarage(next);
  for (const listener of listeners) listener();
}

/** Current garage snapshot (stable identity until it changes). */
export function getGarage(): GarageState {
  return read();
}

/** Subscribe to garage mutations (the useWallet hook's store binding). */
export function subscribeGarage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Add coins (clamped to a whole, non-negative amount). Returns the balance. */
export function earnCoins(amount: number): number {
  const gained = count(amount);
  const current = read();
  if (gained === 0) return current.coins;
  const next = current.coins + gained;
  commit({ ...current, coins: next });
  return next;
}

/** True when the player owns the paint (the free plain hull is always owned). */
export function ownsPaint(id: string): boolean {
  return read().owned.includes(id);
}

/**
 * Buy a paint with OuiCoins. Unknown ids and already-owned paints are rejected
 * without charging. A purchase auto-equips the new paint (the shop's "buy" is
 * the whole flow). Returns the outcome tag so the UI can toast precisely.
 */
export function buyPaint(id: string): BuyResult {
  if (!isPaintId(id)) return "unknown";
  const current = read();
  if (current.owned.includes(id)) return "owned";
  const def = TANK_PAINTS.find((p) => p.id === id);
  if (!def) return "unknown";
  if (def.price > current.coins) return "poor";
  commit({
    coins: current.coins - def.price,
    owned: TANK_PAINTS.filter(
      (p) => current.owned.includes(p.id) || p.id === id
    ).map((p) => p.id),
    equipped: id,
  });
  return "bought";
}

/** Apply an owned paint to the hull. Returns false for unknown/unowned ids. */
export function equipPaint(id: string): boolean {
  const current = read();
  if (!current.owned.includes(id) || current.equipped === id) {
    return current.owned.includes(id);
  }
  commit({ ...current, equipped: id });
  return true;
}
