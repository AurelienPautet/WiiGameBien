// Ordered list of selectable tank colors. The index into this array is what
// gets persisted to localStorage ("body" / "turret"), so the ORDER must stay
// stable — append new colors at the end, never reorder.
export const TANK_COLORS: string[] = [
  "blue",
  "orange",
  "red",
  "green",
  "violet",
  "yellow",
  "blueF",
  "turquoise",
  "violetF",
];

export const DEFAULT_TANK_COLOR: string = "orange";

// Index of the default colour in TANK_COLORS (orange today). Derived instead of
// hard-coded so reordering the palette can never silently desync the defaults.
export const DEFAULT_TANK_INDEX: number = Math.max(
  0,
  TANK_COLORS.indexOf(DEFAULT_TANK_COLOR)
);

// Resolve a persisted index to a color name, falling back to the default.
export function colorFromIndex(index: number | string | null): string {
  const i = Number(index);
  // The `i >= 0 && i < TANK_COLORS.length` guard proves the index is in range.
  return Number.isInteger(i) && i >= 0 && i < TANK_COLORS.length
    ? TANK_COLORS[i]!
    : DEFAULT_TANK_COLOR;
}
