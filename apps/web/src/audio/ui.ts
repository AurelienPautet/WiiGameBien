import { playSfx } from "./play";

/**
 * Ergonomic UI sound triggers. Clicks/toggles are wired into the shared
 * primitives (Button, IconButton, Switch, Tabs, Dialog, Select, SegmentedControl,
 * RadioGroup, Slider, Chip, StarRating); hover is handled once for every control
 * by `useHoverSound`. Each is a thin alias over `playSfx` so call sites read as
 * intent ("ui.click()") rather than voice names.
 */
export const ui = {
  click: () => playSfx("uiClick"),
  hover: () => playSfx("uiHover"),
  toggle: (on: boolean) => playSfx(on ? "uiToggleOn" : "uiToggleOff"),
  open: () => playSfx("uiOpen"),
  close: () => playSfx("uiClose"),
  back: () => playSfx("uiBack"),
  tab: () => playSfx("uiTab"),
  error: () => playSfx("uiError"),
  success: () => playSfx("uiSuccess"),
} as const;
