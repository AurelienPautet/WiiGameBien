# Spawn flag on the spawn point

Branch: `fix/spawn-flag-position`, based on `origin/master` (`c6ed534`).

The round-start flag used to be planted at `cx - r * 2.1`. With the game's
50 px cell and `HULL_RADIUS_FACTOR = 0.46` that is `r = 23`, so the pole stood
≈ 48 px — almost a full cell — to the left of the tank's spawn point, while the
cloth ended right on the spawn. The marker read as belonging to the neighbouring
cell.

The pole is now planted at `cx`, the hull centre the renderer uses as the tank's
spawn position (`Renderer._drawSpawnTank`). The foot keeps its small downward
ground offset (`cy + r * 0.55`), where it is hidden by the hull once the tank
lands.

- `before.png` / `after.png`: the full spawn animation, frames at progress
  0.10 → 0.93.
- `before-after.png`: both strips stacked, with the same spawn crosshair and
  hull ghost in every frame.
- `before-after-closeup.png`: the progress-0.20 frame at 2× — the closest look
  at the offset.
- `before-after.html`: opens the comparison in a browser.

The strips are real `drawSpawnTank` output, rendered through Vite from
`apps/web/src/engine/spawnAnim.ts`; the magenta cross and dashed hull circle mark
the exact spawn point. The only code difference between the two strips is the
pole x (`cx - r * 2.1` vs `cx`).

`spawnFlagBase()` is a pure helper so the alignment is covered by
`apps/web/src/engine/__tests__/spawnFlagPosition.test.ts`: the pole x must equal
the spawn x, and the ground offset must scale with the hull radius.

Validation: 360 web tests pass; web typecheck, ESLint, Prettier and the
production build pass.
