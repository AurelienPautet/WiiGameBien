/**
 * GLSL ES 1.00 sources for the post-processing chain (PostProcessor.ts).
 *
 * Kept as plain template strings (no .glsl loader / vite plugin) so the build
 * stays untouched. The full chain per frame is:
 *
 *   composite layers ─▶ scene
 *   shockwave warp    ─▶ warped        (full res, radial UV displacement)
 *   bright pass       ─▶ bright (¼ res)
 *   blur H, blur V    ─▶ bloom  (¼ res, separable gaussian)
 *   final composite   ─▶ screen        (warped + bloom + vignette)
 */

// Fragment-shader precision preamble. We want highp: mediump's ~2^-10 relative
// resolution quantises the tiny UV offsets the chromatic-aberration and
// shockwave passes apply (a fraction of a texel), which on real mediump mobile
// GPUs turns a subtle ~1px edge fringe into a thick coloured band — the bright
// pink/red "border" that appears around the arena's top/bottom boundary walls
// on phones. Desktop GPUs already evaluate mediump at high precision, so this is
// a no-op there. The #ifdef falls back to mediump on the rare GPU without highp
// fragment support, keeping those devices working (just with the old fringe).
const FRAG_PRECISION = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif`;

// One attribute (clip-space position); UV is derived in the vertex shader so a
// single fullscreen-quad buffer feeds every program.
export const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Straight blit — used to composite the entity layer over the field.
export const COPY_FRAG = `
${FRAG_PRECISION}
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
`;

/**
 * Procedural animated field — the game's background: the same flowing organic
 * fbm shape, but **posterized into flat cel-shaded grey tones with thin contour
 * outlines** so it matches the flat, ink-outlined cartoon look of the tanks and
 * walls (rather than a smooth realistic gradient). No hue — it never competes
 * with the team colours. Tune SCALE, LEVELS (number of flat tones), and CONTRAST.
 */
export const FIELD_FRAG = `
${FRAG_PRECISION}
varying vec2 vUv;
uniform vec2 uRes;     // board pixels (1150 x 800)
uniform float uTime;   // seconds
uniform vec3 uField;   // base colour
uniform float uWhiten; // 0 = raw field grey, 1 = whitewashed floor

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);   // scale + rotate per octave (less blocky)
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 3.5;   // SCALE
  float t = uTime * 0.03;

  // Domain warp → flowing organic shape.
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.8));
  float n = fbm(p + 1.6 * q + t * 0.25);            // ~0..1

  // Posterize into a few FLAT grey tones (cel-shaded), no hue. Base is the board
  // colour pushed toward white for a lighter floor (WHITEN); the editor lowers
  // it so the arena reads as a solid grey board instead of a blank white page.
  float LEVELS = 4.0;
  float step = floor(clamp(n, 0.0, 0.999) * LEVELS) / (LEVELS - 1.0); // 0,.33,.67,1
  vec3 base = mix(uField, vec3(1.0), uWhiten);
  vec3 col = base + (step - 0.5) * 0.03;            // CONTRAST

  // Thin darker contour line at each tone boundary — a cartoon "ink" outline
  // tracing the organic patches, like the tanks/walls.
  float b = fract(n * LEVELS);
  col -= (1.0 - smoothstep(0.0, 0.05, min(b, 1.0 - b))) * 0.007;

  // Soft edge vignette for arena depth.
  col -= smoothstep(0.25, 0.80, length((vUv - 0.5) * vec2(aspect, 1.0))) * 0.05;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * Holes — plain, round ink pits.
 *
 * A pre-baked signed-distance field (see PostProcessor._ensureHoleField) gives
 * every hole tile one inscribed circle. Neighbouring circles are deliberately
 * never unioned, so a run of hole tiles reads as a row of separate discs rather
 * than one capsule. The quads also cover exactly one tile, keeping the effect
 * off the surrounding blocks.
 *
 * The interior is a flat near-black fill with a thin ink rim: no spiral, bevel,
 * highlight, glow or texture. The circle itself is the whole design.
 */
export const HOLE_VERT = `
attribute vec2 aPos;
attribute vec2 aBoard;
varying vec2 vBoard;
void main() {
  vBoard = aBoard;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const HOLE_FRAG = `
${FRAG_PRECISION}
varying vec2 vBoard;       // board-space UV (0..1)
uniform sampler2D uField;  // R = signed distance to the rim (board px)
uniform vec3 uInk;         // thin edge, a shade lighter than the core
uniform vec3 uCore;        // flat near-black pit

void main() {
  vec4 field = texture2D(uField, vBoard);
  // Signed distance in board px: negative inside the pit, 0 on the rim.
  float d = field.r * 80.0 - 64.0;
  float inside = 1.0 - smoothstep(-0.9, 0.9, d);
  if (inside <= 0.004) discard;

  // Flat interior. The only detail is a crisp ink edge, fully inside the
  // silhouette so it cannot bleed into a neighbouring tile.
  vec3 col = uCore;
  float rim = smoothstep(-3.0, -1.6, d) * (1.0 - smoothstep(-0.9, 0.0, d));
  col = mix(col, uInk, rim);

  gl_FragColor = vec4(col, inside);
}
`;

/**
 * Walls — fills + ink outline, baked on the CPU into one mask texture.
 *
 * The previous per-tile analytic SDF could not see past its own tile: at a T
 * junction the edge stroke, inner fillet and suppression region came from
 * different quads and met at slightly wrong distances, leaving light notches
 * in the ink and stray rounded corners. The merged region is now rasterised
 * once per block-set change (see engine/wallTexture.ts) with proper rounded
 * convex corners, concave fillets and one continuous outline, then sampled
 * here. This keeps the animated type-specific fill detail on the GPU.
 *
 * Texture channels (additive bake):
 *   R = ink coverage, G = stone fill × 0.5, B = sand fill × 0.5, A = coverage.
 */
export const WALL_FRAG = `
${FRAG_PRECISION}
uniform sampler2D uWall;
uniform vec2 uRes;       // board pixels (1150 x 800)
uniform float uTime;     // seconds
uniform vec3 uStone;     // indestructible steel
uniform vec3 uSand;      // destructible hazard block
uniform vec3 uInk;       // outline

void main() {
  vec4 mask = texture2D(uWall, gl_FragCoord.xy / uRes);
  float a = mask.a;
  if (a <= 0.004) discard;

  float stone = clamp(mask.g * 2.0, 0.0, 1.0);
  float sand = clamp(mask.b * 2.0, 0.0, 1.0);

  // Board px (gl_FragCoord is bottom-left; the bake is drawn top-down).
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);

  vec3 col;
  if (sand > stone) {
    // DESTRUCTIBLE: scrolling diagonal hazard stripes (~35px, moving).
    float stripe = sin((px.x + px.y) * 0.18 - uTime * 2.2);
    col = mix(uSand * 0.80, uSand, smoothstep(-0.2, 0.5, stripe));
    col += 0.06 * smoothstep(0.82, 1.0, stripe);  // bright crest on each stripe
  } else {
    // STRONG: solid steel — fine brushed grain + a slow broad glint.
    col = uStone;
    col += 0.02 * sin(px.y * 0.6);
    col += 0.035 * smoothstep(0.55, 1.0, sin((px.x - px.y) * 0.02 - uTime * 0.25));
  }

  col = mix(col, uInk, mask.r);
  gl_FragColor = vec4(col, a);
}
`;

export const MAX_SHOCKWAVES = 8;

/**
 * Radial UV displacement: each active explosion pushes pixels outward in a thin
 * expanding gaussian ring whose amplitude decays as it grows — a refraction
 * shockwave. Distance is measured in aspect-corrected space so rings stay round
 * on the 1150×800 (non-square) board.
 */
export function shockwaveFrag(max: number): string {
  return `
${FRAG_PRECISION}
#define MAX ${max}
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uAspect;        // width / height
uniform int uCount;
uniform vec2 uCenter[MAX];    // explosion centres, UV space (v already flipped)
uniform float uAge[MAX];      // 0..1 normalised progress
uniform float uAmp[MAX];      // peak displacement, UV units
void main() {
  vec2 uv = vUv;
  vec2 disp = vec2(0.0);
  for (int i = 0; i < MAX; i++) {
    if (i >= uCount) break;
    vec2 toC = uv - uCenter[i];
    float ud = length(toC);
    vec2 ac = vec2(toC.x * uAspect, toC.y);  // aspect-correct for a round ring
    float dist = length(ac);
    float prog = uAge[i];
    float radius = prog * 0.9;                // ring sweeps out to ~0.9
    float ring = dist - radius;
    float band = 0.06;
    float w = exp(-(ring * ring) / (band * band));
    float amp = uAmp[i] * (1.0 - prog);       // fades as it expands
    vec2 dir = ud > 1e-4 ? toC / ud : vec2(0.0);
    disp += dir * w * amp;
  }
  gl_FragColor = texture2D(uTex, uv + disp);
}
`;
}

/**
 * Bright pass for bloom. The arcade board is a LIGHT grey field (~0.8
 * luminance), so a plain luminance threshold would bloom the whole background.
 * Instead this isolates two things the field is not: near-white pixels (spark
 * flashes) and bright *saturated* pixels (neon tank hulls, warm bullets /
 * debris). The low-saturation grey field and stone/sand blocks score ~0.
 */
export const BRIGHT_FRAG = `
${FRAG_PRECISION}
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  vec3 col = texture2D(uTex, vUv).rgb;
  float mx = max(col.r, max(col.g, col.b));
  float mn = min(col.r, min(col.g, col.b));
  float sat = (mx - mn) / max(mx, 1e-4);
  float white = smoothstep(0.95, 1.0, mx);                       // spark flashes
  float neon = smoothstep(0.45, 0.9, mx) * smoothstep(0.35, 0.75, sat);
  float score = clamp(white + neon, 0.0, 1.0);
  gl_FragColor = vec4(col * score, 1.0);
}
`;

// Separable 9-tap gaussian using linear-sampled tap pairs (5 fetches).
export const BLUR_FRAG = `
${FRAG_PRECISION}
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;   // 1 / target size
uniform vec2 uDir;     // (1,0) horizontal or (0,1) vertical
void main() {
  vec2 o = uTexel * uDir;
  vec4 sum = texture2D(uTex, vUv) * 0.227027;
  sum += texture2D(uTex, vUv + o * 1.384615) * 0.316216;
  sum += texture2D(uTex, vUv - o * 1.384615) * 0.316216;
  sum += texture2D(uTex, vUv + o * 3.230769) * 0.070270;
  sum += texture2D(uTex, vUv - o * 3.230769) * 0.070270;
  gl_FragColor = sum;
}
`;

// Final tone pass. Combines, in screen space:
//   - screen shake   (uShake: a whole-frame UV offset)
//   - chromatic aberration (uAberration: R/B split growing toward the edges)
//   - additive bloom + dark vignette
//   - death flash    (uDamage: a red vignette pulse, clear in the centre)
export const FINAL_FRAG = `
${FRAG_PRECISION}
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uVignette;
uniform vec2 uShake;        // whole-frame UV offset
uniform float uAberration;  // RGB-split strength
uniform float uDamage;      // 0..1 red death-flash
uniform float uKill;        // 0..1 warm kill-confirmed pop
void main() {
  vec2 uv = vUv + uShake;
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);

  // Chromatic aberration: push red out / blue in, scaled by distance² so the
  // centre stays sharp and the fringe lives at the edges.
  float amt = uAberration * r2;
  vec3 scene;
  scene.r = texture2D(uScene, uv + d * amt).r;
  scene.g = texture2D(uScene, uv).g;
  scene.b = texture2D(uScene, uv - d * amt).b;

  vec3 bloom = texture2D(uBloom, uv).rgb;
  vec3 col = scene + bloom * uBloomStrength;

  float vig = 1.0 - uVignette * r2 * 1.8;
  col *= clamp(vig, 0.0, 1.0);

  // Red edges flash on death; centre stays readable.
  float edge = smoothstep(0.05, 0.5, r2);
  col = mix(col, vec3(0.85, 0.06, 0.06), clamp(uDamage * edge, 0.0, 1.0));

  // Kill-confirmed: a brief warm additive pop across the whole frame.
  col += vec3(1.0, 0.88, 0.55) * uKill * 0.45;

  gl_FragColor = vec4(col, 1.0);
}
`;
