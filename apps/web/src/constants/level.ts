// Level grid geometry. A level's layout is a flat array of GRID_COLS×GRID_ROWS
// cell codes; cells are CELL_SIZE board pixels, so the grid exactly fills the
// 1150×800 game/editor canvas (see constants/canvas.ts). Shared by the level
// editor (editing/preview) and the thumbnail renderer (saved previews), so both
// agree on where each cell sits.
export const GRID_COLS = 23;
export const GRID_ROWS = 16;
export const CELL_SIZE = 50;
export const TOTAL_CELLS = GRID_COLS * GRID_ROWS; // 368
