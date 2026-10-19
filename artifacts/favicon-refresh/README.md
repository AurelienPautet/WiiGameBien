# Favicon refresh

Branch: `feat/refresh-favicon`, based on freshly fetched `origin/master`
(`f2c9be4`). This repository's default branch is `master`; `origin/main` does not exist.

Open `before-after.html` for the old and new icons enlarged, at 16/32/48 px,
and in light and dark browser tab mockups. The comparison is self-contained.

- `before.png`: the previous 72 px favicon, exported without changing its artwork.
- `after.png`: a 256 px transparent browser rasterization of the new SVG.
- `../../apps/web/public/favicon.svg`: editable source matching `tankShape.ts`
  and the sidebar's blue hull, red barrel, charcoal outlines, and tapered muzzle.
- `../../apps/web/public/icon.ico`: generated from the SVG rasterization, with
  16, 32, 48, and 64 px frames.

The asset uses the game's existing geometric art directly; no image model was
needed. The HTML icon links use Vite's base URL to preserve relative hosting.

Validation: production web build, Prettier, `git diff --check`, browser HTTP 200
responses with correct SVG/ICO content types, ICO frame dimensions, and visual
inspection of the comparison at 728 px and 360 px widths.
