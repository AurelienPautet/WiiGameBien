// The hull PAINT catalog — the cosmetic skins sold in the tank shop.
//
// The `id` is the stable key everywhere: localStorage (`garage` blob), the
// `play` socket event's optional 5th arg, the tick snapshot's `paintc` and the
// lobby_state member list. Never rename an id without a storage migration.
//
// `plain` is free, owned by everyone and is the fallback for any unknown id
// (old clients, tampered storage, a paint retired from the catalog).
// Prices are in OuiCoins; order here is the shop/picker display order.
export interface TankPaintDef {
  id: string;
  /** Shop price in OuiCoins. `plain` is 0 and cannot be bought. */
  price: number;
}

export const DEFAULT_PAINT = "plain";

export const TANK_PAINTS: readonly TankPaintDef[] = [
  { id: "plain", price: 0 },
  { id: "stripes", price: 200 },
  { id: "checker", price: 250 },
  { id: "hazard", price: 300 },
  { id: "camo", price: 350 },
  { id: "bolt", price: 450 },
  { id: "stars", price: 600 },
  { id: "flames", price: 750 },
] as const;

/** Every sellable paint (the shop grid; excludes the free default). */
export const SHOP_PAINTS: readonly TankPaintDef[] = TANK_PAINTS.filter(
  (p) => p.price > 0
);

const PAINT_IDS: readonly string[] = TANK_PAINTS.map((p) => p.id);
const KNOWN = new Set(PAINT_IDS);

/** True for a paint id that exists in the catalog. */
export function isPaintId(id: string): boolean {
  return KNOWN.has(id);
}

/** Resolve any persisted/wire value to a catalog paint id. */
export function normalizePaint(id: unknown): string {
  return typeof id === "string" && KNOWN.has(id) ? id : DEFAULT_PAINT;
}

/** The catalog entry for an id (never null — unknown ids resolve to `plain`). */
export function paintDef(id: unknown): TankPaintDef {
  const paint = normalizePaint(id);
  return TANK_PAINTS.find((p) => p.id === paint) ?? TANK_PAINTS[0]!;
}

/** i18n key for a paint's display name (see i18n/locales/*.json). */
export function paintNameKey(id: string): string {
  return `shop.paints.${normalizePaint(id)}.name`;
}

/** i18n key for a paint's flavor/description text. */
export function paintDescKey(id: string): string {
  return `shop.paints.${normalizePaint(id)}.desc`;
}
