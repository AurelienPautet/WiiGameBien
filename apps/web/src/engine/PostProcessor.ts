/**
 * PostProcessor — a WebGL post-processing layer on top of the 2D renderer.
 *
 * The game still renders exactly as before to two stacked 2D canvases (the
 * field on the back canvas, entities + particles on the front). Instead of
 * showing those directly, this uploads them as textures each frame, composites
 * them, and runs a small full-screen shader chain — radial **shockwaves** and
 * **bloom** today, with room for more passes — presenting the result on its own
 * WebGL canvas. The 2D drawing code is untouched; this is purely a screen-space
 * finishing stage.
 *
 * If WebGL is unavailable the constructor throws and the caller (GameEngine)
 * falls back to showing the plain 2D canvases.
 */
import { hexToRgb, palette, type Rgb } from "../theme/palette";
import type { EffectSettings } from "../lib/settings";
import {
  createSourceTexture,
  createTarget,
  Program,
  type GL,
  type RenderTarget,
} from "./postfx/gl";
import {
  BLUR_FRAG,
  BRIGHT_FRAG,
  COPY_FRAG,
  FIELD_FRAG,
  FINAL_FRAG,
  HOLE_FRAG,
  HOLE_VERT,
  MAX_SHOCKWAVES,
  shockwaveFrag,
  VERT_SRC,
  WALL_FRAG,
  WALL_VERT,
} from "./postfx/shaders";
import { BLOCK_RADIUS } from "./shapes";

interface Vec2 {
  x: number;
  y: number;
}

/** A block (wall): board-space rect + type (1 = stone, else sand). */
export interface EnvBlock {
  position: { x: number; y: number };
  size: { w: number; h: number };
  type: number;
}

/** A hole (pit): board-space rect. */
export interface EnvHole {
  position: { x: number; y: number };
  size: { w: number; h: number };
}

interface Shockwave {
  cu: number; // centre u, 0..1
  cv: number; // centre v, 0..1 (flipped into texture space)
  birth: number; // performance.now() ms
  life: number; // ms
  amp: number; // peak displacement, UV units
}

// Bloom runs at a fraction of full resolution — cheap, and the blur hides the
// downscale entirely.
const BLOOM_SCALE = 0.25;

// Board base colour, used by the procedural field shader.
const FIELD = hexToRgb(palette.field);

// Wall fills (stone = type 1, sand = otherwise) and the ink outline colour —
// matching the 2D renderer's block colours exactly.
const WALL_STONE = hexToRgb("#7d848e");
const WALL_SAND = hexToRgb("#cbb287");
const INK = hexToRgb(palette.ink);

// Hole vortex palette: a hot cyan event horizon, a teal halo, blue/violet
// spiral arms and a near-black throat. All pulled from the shared arcade
// palette (except the tuned rim/core shades) so the pit reads as part of it.
const HOLE_RIM = hexToRgb("#9ff6ff");
const HOLE_HALO = hexToRgb(palette.teal);
const HOLE_SWIRL_A = hexToRgb(palette.blue);
const HOLE_SWIRL_B = hexToRgb(palette.purple);
const HOLE_CORE = hexToRgb("#0b0a18");

// Outline thickness (board px), matching the 2D block stroke (lineWidth 4).
const OUTLINE_PX = 4;

// Margin (board px) each wall quad is expanded by, so the shader has room for
// the concave fillet (pokes up to a radius into the open diagonal) and the ink
// straddling the silhouette. One radius plus the outline clears both.
const WALL_MARGIN = BLOCK_RADIUS + OUTLINE_PX;

// Hole field: a baked signed-distance field over the whole board. Every hole
// tile contributes an inscribed circle; adjacent tiles add a stadium capsule
// between their centres (and a filled 2x2 block adds a diagonal capsule). The
// union is smooth-min'd, so an isolated hole is a perfect disc, a run becomes a
// capsule, and a block melts into one rounded pit. The field is stored in an
// RGBA8 texture:
//   R — signed distance to the rim in board px, encoded over [-64, +16]
//   G,B — nearest pit centre, as board UV
// The 2px cell keeps the field cheap while linear filtering + the shader's SDF
// alpha still resolve a smooth, sub-pixel rim.
const HOLE_CELL = 2;
const HOLE_SDF_MIN_PX = -64;
const HOLE_SDF_SPAN_PX = 80;
// Smooth-union radius (board px) where primitives overlap — just enough to
// soften the joins, since the capsules already cover the space between tiles.
const HOLE_MERGE_PX = 10;
// Quad expansion so the rim halo has room to fade out over the floor.
const HOLE_MARGIN = 26;

// Screen shake: peak whole-frame offset (UV units) at trauma = 1, and how long
// trauma takes to bleed off. Offset scales with trauma² so small knocks barely
// register and only big hits really kick.
const SHAKE_MAX = 0.018;
const SHAKE_DECAY_MS = 500;
// Death flash: how long the red vignette pulse takes to fade.
const FLASH_DECAY_MS = 550;
// Kill pop: a quick warm flash — short so rapid kills blink rather than wash.
const KILL_DECAY_MS = 220;

export class PostProcessor {
  private readonly gl: GL;
  private readonly canvas: HTMLCanvasElement;
  private readonly W: number;
  private readonly H: number;
  private readonly qW: number;
  private readonly qH: number;
  // Hole SDF-field grid dimensions (board / HOLE_CELL).
  private readonly hfW: number;
  private readonly hfH: number;

  // GL objects (rebuilt on context restore).
  private quad: WebGLBuffer | null = null;
  private field!: Program;
  private holeP!: Program;
  private wallP!: Program;
  private copy!: Program;
  private shock!: Program;
  private bright!: Program;
  private blur!: Program;
  private final!: Program;
  // Environment geometry buffers, rebuilt each frame from the current blocks
  // and holes (block geometry changes as walls are destroyed).
  private holeBuf: WebGLBuffer | null = null;
  private wallFillBuf: WebGLBuffer | null = null;
  // Hole SDF-field texture + the signature of the holes it was built from
  // (rebuilt only when the hole set changes — holes are static within a level).
  private holeFieldTex: WebGLTexture | null = null;
  private holeSig = "";
  private frontTex!: WebGLTexture;
  private scene!: RenderTarget;
  private warped!: RenderTarget;
  private brightT!: RenderTarget;
  private blurA!: RenderTarget;
  private blurB!: RenderTarget;

  private shockwaves: Shockwave[] = [];
  private lost = false;

  // Screen-shake "trauma" (0..1) and death-flash amount (0..1), both decaying
  // each frame. `lastFrame` timestamps the previous render for the decay dt.
  private trauma = 0;
  private flashAmt = 0;
  private killAmt = 0;
  private lastFrame = 0;

  // Tunable effect strengths.
  bloomStrength = 1.15;
  vignette = 0.08;
  aberration = 0.012;
  // How far the animated floor is pushed toward white. The game keeps the
  // light, airy field; the level editor dials it down so the board is a solid
  // surface and the editable grid is readable.
  fieldWhiten = 0.7;

  // Per-effect on/off, driven by user settings (setEffects). Only the passes
  // this stage owns are tracked here; particles/sound are gated elsewhere.
  // Bloom/vignette/aberration are zeroed in the final shader when off;
  // shockwaves and the shake/flash triggers are gated at their entry points.
  private fx = {
    bloom: true,
    screenShake: true,
    aberration: true,
    vignette: true,
    shockwaves: true,
    flashes: true,
    scenery: true,
  };

  /** Tune how white the animated floor is (0 = raw field grey, 1 = white). */
  setFieldWhiten(whiten: number): void {
    this.fieldWhiten = whiten;
  }

  /** Apply the user's effect toggles (the subset this stage owns). */
  setEffects(e: EffectSettings): void {
    this.fx = {
      bloom: e.bloom,
      screenShake: e.screenShake,
      aberration: e.aberration,
      vignette: e.vignette,
      shockwaves: e.shockwaves,
      flashes: e.flashes,
      scenery: e.scenery,
    };
  }

  private readonly onLost = (e: Event) => {
    e.preventDefault(); // keep the context recoverable
    this.lost = true;
  };
  private readonly onRestored = () => {
    this._build();
    this.lost = false;
  };

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.W = width;
    this.H = height;
    this.qW = Math.max(1, Math.floor(width * BLOOM_SCALE));
    this.qH = Math.max(1, Math.floor(height * BLOOM_SCALE));
    this.hfW = Math.max(1, Math.round(width / HOLE_CELL));
    this.hfH = Math.max(1, Math.round(height / HOLE_CELL));
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;

    canvas.addEventListener("webglcontextlost", this.onLost, false);
    canvas.addEventListener("webglcontextrestored", this.onRestored, false);

    this._build();
  }

  /** Build (or rebuild, after context loss) all GL resources. */
  private _build(): void {
    const gl = this.gl;

    const quad = gl.createBuffer();
    if (!quad) throw new Error("createBuffer failed");
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    // Two triangles covering clip space.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    this.quad = quad;

    this.field = new Program(gl, VERT_SRC, FIELD_FRAG);
    this.copy = new Program(gl, VERT_SRC, COPY_FRAG);
    this.shock = new Program(gl, VERT_SRC, shockwaveFrag(MAX_SHOCKWAVES));
    this.bright = new Program(gl, VERT_SRC, BRIGHT_FRAG);
    this.blur = new Program(gl, VERT_SRC, BLUR_FRAG);
    this.final = new Program(gl, VERT_SRC, FINAL_FRAG);
    // Environment geometry programs (their own attribute layouts).
    this.holeP = new Program(gl, HOLE_VERT, HOLE_FRAG, ["aPos", "aBoard"]);
    this.wallP = new Program(gl, WALL_VERT, WALL_FRAG, [
      "aPos",
      "aType",
      "aRect",
      "aExp",
      "aDiag",
    ]);

    this.holeBuf = gl.createBuffer();
    this.wallFillBuf = gl.createBuffer();
    // Hole SDF texture: linear-filtered so the per-cell distances smooth into a
    // continuous pit. Data is uploaded lazily by _ensureHoleField; reset the
    // signature so a fresh (or context-restored) texture re-uploads.
    this.holeFieldTex = createSourceTexture(gl);
    this.holeSig = "";

    this.frontTex = createSourceTexture(gl);
    this.scene = createTarget(gl, this.W, this.H);
    this.warped = createTarget(gl, this.W, this.H);
    this.brightT = createTarget(gl, this.qW, this.qH);
    this.blurA = createTarget(gl, this.qW, this.qH);
    this.blurB = createTarget(gl, this.qW, this.qH);

    // Seed the visible canvas with the board colour so there's no black flash
    // before the first rendered frame (the 2D path seeds the field the same way).
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(FIELD.red / 255, FIELD.green / 255, FIELD.blue / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Queue a shockwave centred at a board-space (1150×800) position. */
  shockwave(pos: Vec2, amp = 0.05, life = 650): void {
    if (this.lost || !this.fx.shockwaves) return;
    this.shockwaves.push({
      cu: pos.x / this.W,
      cv: 1 - pos.y / this.H, // textures are uploaded Y-flipped (see _upload)
      birth: performance.now(),
      life,
      amp,
    });
    // Keep only the most recent few — the shader caps at MAX_SHOCKWAVES.
    if (this.shockwaves.length > MAX_SHOCKWAVES) this.shockwaves.shift();
  }

  /** Add screen-shake trauma (0..1). Stacks (capped) and decays automatically. */
  shake(trauma: number): void {
    if (this.lost || !this.fx.screenShake) return;
    this.trauma = Math.min(1, this.trauma + trauma);
  }

  /** Trigger the red death-flash (0..1). */
  flash(amount = 1): void {
    if (this.lost || !this.fx.flashes) return;
    this.flashAmt = Math.min(1, this.flashAmt + amount);
  }

  /** Trigger the warm "kill confirmed" pop (0..1). */
  killFlash(amount = 1): void {
    if (this.lost || !this.fx.flashes) return;
    this.killAmt = Math.min(1, this.killAmt + amount);
  }

  /**
   * Draw the procedural environment (animated field, holes, walls), composite
   * the entity layer over it, and run the effect chain, presenting to the WebGL
   * canvas. `front` is the 2D entity + particle canvas (transparent
   * background); the field/holes/walls are generated here in GL from `blocks`
   * and `holes` (the 2D renderer skips them while post is active). The 2D back
   * canvas / 2D environment are only used by the non-WebGL fallback.
   */
  render(front: HTMLCanvasElement, blocks: EnvBlock[], holes: EnvHole[]): void {
    if (this.lost) return;
    const gl = this.gl;
    const now = performance.now();
    // Freeze environment animation (but still draw it) when scenery is off.
    const animT = this.fx.scenery ? now / 1000 : 0;

    // Decay shake/flash by real elapsed time (clamped so a tab returning from
    // the background doesn't jump them straight to zero).
    const dt = this.lastFrame ? Math.min(now - this.lastFrame, 100) : 16;
    this.lastFrame = now;
    this.trauma = Math.max(0, this.trauma - dt / SHAKE_DECAY_MS);
    this.flashAmt = Math.max(0, this.flashAmt - dt / FLASH_DECAY_MS);
    this.killAmt = Math.max(0, this.killAmt - dt / KILL_DECAY_MS);

    this.shockwaves = this.shockwaves.filter((s) => now - s.birth < s.life);

    this._upload(this.frontTex, front);

    // 1a. Procedural animated field → scene (opaque base).
    this._bind(this.scene);
    gl.disable(gl.BLEND);
    this.field.use();
    gl.uniform2f(this.field.loc("uRes"), this.W, this.H);
    gl.uniform1f(this.field.loc("uTime"), animT);
    gl.uniform3f(
      this.field.loc("uField"),
      FIELD.red / 255,
      FIELD.green / 255,
      FIELD.blue / 255
    );
    gl.uniform1f(this.field.loc("uWhiten"), this.fieldWhiten);
    this._drawFullscreen();

    // 1a2. Environment geometry (holes, then wall fills + ink outlines), drawn
    // opaque over the field — same z-order as the 2D renderer (holes < walls <
    // entities). Rebuilt from current geometry each frame.
    const env = this._buildEnv(blocks, holes);
    if (env.holeVerts > 0) {
      this._ensureHoleField(holes); // (re)build the SDF field if holes changed
      this.holeP.use();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.holeFieldTex);
      gl.uniform1i(this.holeP.loc("uField"), 0);
      gl.uniform2f(this.holeP.loc("uRes"), this.W, this.H);
      gl.uniform1f(this.holeP.loc("uTime"), animT);
      const setColor = (name: string, c: Rgb) =>
        gl.uniform3f(
          this.holeP.loc(name),
          c.red / 255,
          c.green / 255,
          c.blue / 255
        );
      setColor("uRim", HOLE_RIM);
      setColor("uHalo", HOLE_HALO);
      setColor("uSwirlA", HOLE_SWIRL_A);
      setColor("uSwirlB", HOLE_SWIRL_B);
      setColor("uCore", HOLE_CORE);
      // Straight-alpha "over" the field so the rounded, animated rim shows the
      // floor through the corners.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this._drawHoles(env.holeVerts);
      gl.disable(gl.BLEND);
    }
    if (env.wallVerts > 0) {
      this.wallP.use();
      gl.uniform1f(this.wallP.loc("uTime"), animT);
      gl.uniform2f(this.wallP.loc("uRes"), this.W, this.H);
      gl.uniform1f(this.wallP.loc("uRadius"), BLOCK_RADIUS);
      gl.uniform1f(this.wallP.loc("uOutline"), OUTLINE_PX);
      gl.uniform3f(
        this.wallP.loc("uStone"),
        WALL_STONE.red / 255,
        WALL_STONE.green / 255,
        WALL_STONE.blue / 255
      );
      gl.uniform3f(
        this.wallP.loc("uSand"),
        WALL_SAND.red / 255,
        WALL_SAND.green / 255,
        WALL_SAND.blue / 255
      );
      gl.uniform3f(
        this.wallP.loc("uInk"),
        INK.red / 255,
        INK.green / 255,
        INK.blue / 255
      );
      // Straight-alpha "over" the field so the rounded corners and the outer
      // half of the ink show the floor through.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this._drawWallFills(env.wallVerts);
      gl.disable(gl.BLEND);
    }

    // 1b. Composite the entity layer over the field. The 2D canvas is straight
    // alpha, premultiplied on upload, so composite "over" with ONE/1-src.
    this.copy.use();
    gl.uniform1i(this.copy.loc("uTex"), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this._drawTex(this.frontTex);
    gl.disable(gl.BLEND);

    // 2. Shockwave displacement: scene → warped.
    this._bind(this.warped);
    this.shock.use();
    gl.uniform1i(this.shock.loc("uTex"), 0);
    gl.uniform1f(this.shock.loc("uAspect"), this.W / this.H);
    this._uploadShockwaveUniforms(now);
    this._drawTex(this.scene.tex);

    // 3. Bright pass (downsampled): warped → brightT.
    this._bind(this.brightT);
    this.bright.use();
    gl.uniform1i(this.bright.loc("uTex"), 0);
    this._drawTex(this.warped.tex);

    // 4. Separable blur: brightT → blurB (H) → blurA (V).
    this.blur.use();
    gl.uniform1i(this.blur.loc("uTex"), 0);
    gl.uniform2f(this.blur.loc("uTexel"), 1 / this.qW, 1 / this.qH);
    this._bind(this.blurB);
    gl.uniform2f(this.blur.loc("uDir"), 1, 0);
    this._drawTex(this.brightT.tex);
    this._bind(this.blurA);
    gl.uniform2f(this.blur.loc("uDir"), 0, 1);
    this._drawTex(this.blurB.tex);

    // 5. Final composite → screen.
    this._bind(null);
    this.final.use();
    gl.uniform1i(this.final.loc("uScene"), 0);
    gl.uniform1i(this.final.loc("uBloom"), 1);
    // Zero the strength of any disabled pass (cheaper than rebuilding shaders).
    gl.uniform1f(
      this.final.loc("uBloomStrength"),
      this.fx.bloom ? this.bloomStrength : 0
    );
    gl.uniform1f(
      this.final.loc("uVignette"),
      this.fx.vignette ? this.vignette : 0
    );
    gl.uniform1f(
      this.final.loc("uAberration"),
      this.fx.aberration ? this.aberration : 0
    );
    gl.uniform1f(this.final.loc("uDamage"), this.flashAmt);
    gl.uniform1f(this.final.loc("uKill"), this.killAmt);
    // Per-frame jitter offset, magnitude trauma² so only real hits kick.
    const s = this.trauma * this.trauma;
    const ox = (Math.random() * 2 - 1) * SHAKE_MAX * s;
    const oy = (Math.random() * 2 - 1) * SHAKE_MAX * s;
    gl.uniform2f(this.final.loc("uShake"), ox, oy);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.blurA.tex);
    this._drawTex(this.warped.tex); // binds unit 0 + draws
  }

  /**
   * Free all GL resources. The WebGL *context* is deliberately NOT lost: the
   * GL canvas element persists across games (replay / campaign-advance recreate
   * the engine on the same canvas), and a canvas only ever yields one context —
   * losing it here would hand the next PostProcessor a dead context. Deleting
   * the buffers/textures/programs frees the GPU memory; the bare context is
   * cheap to keep and is reused by `_build()` next game.
   */
  dispose(): void {
    const gl = this.gl;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    for (const t of [
      this.scene,
      this.warped,
      this.brightT,
      this.blurA,
      this.blurB,
    ]) {
      if (t) {
        gl.deleteFramebuffer(t.fbo);
        gl.deleteTexture(t.tex);
      }
    }
    gl.deleteTexture(this.frontTex);
    if (this.quad) gl.deleteBuffer(this.quad);
    if (this.holeBuf) gl.deleteBuffer(this.holeBuf);
    if (this.wallFillBuf) gl.deleteBuffer(this.wallFillBuf);
    if (this.holeFieldTex) gl.deleteTexture(this.holeFieldTex);
    this.field?.dispose();
    this.holeP?.dispose();
    this.wallP?.dispose();
    this.copy?.dispose();
    this.shock?.dispose();
    this.bright?.dispose();
    this.blur?.dispose();
    this.final?.dispose();
  }

  // --- internals ---

  private _upload(tex: WebGLTexture, src: TexImageSource): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Y-flip so canvas-top maps to screen-top; premultiply so straight-alpha
    // canvas pixels composite correctly with ONE/ONE_MINUS_SRC_ALPHA.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  private _uploadShockwaveUniforms(now: number): void {
    const gl = this.gl;
    const n = Math.min(this.shockwaves.length, MAX_SHOCKWAVES);
    gl.uniform1i(this.shock.loc("uCount"), n);
    if (n === 0) return;
    const centers = new Float32Array(MAX_SHOCKWAVES * 2);
    const ages = new Float32Array(MAX_SHOCKWAVES);
    const amps = new Float32Array(MAX_SHOCKWAVES);
    for (let i = 0; i < n; i++) {
      const s = this.shockwaves[i]!;
      centers[i * 2] = s.cu;
      centers[i * 2 + 1] = s.cv;
      ages[i] = Math.min(1, (now - s.birth) / s.life);
      amps[i] = s.amp;
    }
    gl.uniform2fv(this.shock.loc("uCenter"), centers);
    gl.uniform1fv(this.shock.loc("uAge"), ages);
    gl.uniform1fv(this.shock.loc("uAmp"), amps);
  }

  private _bind(target: RenderTarget | null): void {
    const gl = this.gl;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.W, this.H);
    }
  }

  /** Draw the fullscreen quad with the current program (no texture binding). */
  private _drawFullscreen(): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // The geometry passes enable attributes 1/2; make sure they're off for the
    // single-attribute fullscreen passes so stale pointers aren't read.
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** Bind `tex` to unit 0 and draw the fullscreen quad with the current program. */
  private _drawTex(tex: WebGLTexture): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this._drawFullscreen();
  }

  /**
   * Rebuild the environment vertex buffers from the current blocks/holes and
   * upload them. Returns the vertex counts. Cheap enough to run every frame
   * (a few hundred floats), and always correct as walls get destroyed.
   *
   * Layouts: holes = [clipX, clipY, boardU, boardV]; wall fills = [clipX, clipY,
   * type, rectX, rectY, rectW, rectH, openT, openR, openB, openL, diagTR, diagBR,
   * diagBL, diagTL] (15 floats — the rect + open-edge + diagonal masks drive the
   * per-block rounded SDF, fillets and ink in the wall shader; board px come from
   * gl_FragCoord, so no UV is stored).
   */
  private _buildEnv(
    blocks: EnvBlock[],
    holes: EnvHole[]
  ): { holeVerts: number; wallVerts: number } {
    const gl = this.gl;
    const W = this.W;
    const H = this.H;
    const cx = (x: number) => (x / W) * 2 - 1;
    const cy = (y: number) => 1 - (y / H) * 2; // board-top → clip-top

    // Holes: a quad per pit, expanded so the rim halo has room to fade over the
    // floor. Each vertex carries its board-space UV, so all tiles sample one
    // continuous SDF field (no per-tile seams).
    const hole: number[] = [];
    const M_HOLE = HOLE_MARGIN;
    for (const h of holes) {
      const { x, y } = h.position;
      const x0 = x - M_HOLE;
      const y0 = y - M_HOLE;
      const x1 = x + h.size.w + M_HOLE;
      const y1 = y + h.size.h + M_HOLE;
      const ax = cx(x0);
      const bx = cx(x1);
      const ay = cy(y0);
      const by = cy(y1);
      const u0 = x0 / W;
      const u1 = x1 / W;
      const v0 = y0 / H;
      const v1 = y1 / H;
      // prettier-ignore
      hole.push(
        ax, ay, u0, v0,  bx, ay, u1, v0,  ax, by, u0, v1,
        ax, by, u0, v1,  bx, ay, u1, v0,  bx, by, u1, v1
      );
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.holeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hole), gl.DYNAMIC_DRAW);

    // Walls: one quad per block, expanded by WALL_MARGIN so the shader has room
    // for the rounded corners + ink. Each vertex carries the block's rect, the
    // open-edge mask (no same-type neighbour on that side) and the same-type
    // diagonal-neighbour mask; the shader derives the convex rounding, concave
    // fillets and the connected ink from those (see WALL_FRAG). Board px come
    // from gl_FragCoord in the shader, so no per-vertex UV is needed.
    const fill: number[] = [];
    const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
    const occ = new Map<string, number>();
    for (const b of blocks) occ.set(key(b.position.x, b.position.y), b.type);
    const has = (x: number, y: number, t: number) =>
      occ.get(key(x, y)) === t ? 1 : 0;
    const M = WALL_MARGIN;
    for (const b of blocks) {
      const { x, y } = b.position;
      const { w, h } = b.size;
      const t = b.type;
      const ax = cx(x - M);
      const bx = cx(x + w + M);
      const ay = cy(y - M);
      const by = cy(y + h + M);
      // Open edges (top, right, bottom, left): no same-type neighbour abuts.
      const eT = 1 - has(x, y - h, t);
      const eR = 1 - has(x + w, y, t);
      const eB = 1 - has(x, y + h, t);
      const eL = 1 - has(x - w, y, t);
      // Same-type diagonal neighbours (TR, BR, BL, TL).
      const dTR = has(x + w, y - h, t);
      const dBR = has(x + w, y + h, t);
      const dBL = has(x - w, y + h, t);
      const dTL = has(x - w, y - h, t);
      // prettier-ignore
      const vert = (cxv: number, cyv: number) =>
        fill.push(cxv, cyv, t, x, y, w, h, eT, eR, eB, eL, dTR, dBR, dBL, dTL);
      vert(ax, ay);
      vert(bx, ay);
      vert(ax, by);
      vert(ax, by);
      vert(bx, ay);
      vert(bx, by);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallFillBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fill), gl.DYNAMIC_DRAW);

    return {
      holeVerts: hole.length / 4,
      wallVerts: fill.length / 15,
    };
  }

  /**
   * (Re)build the hole SDF field when the hole set changes.
   *
   * Each hole tile is an inscribed circle, and every pair of touching tiles
   * adds a stadium capsule between their centres. A filled 2x2 block also gets
   * a diagonal capsule, which fills the little diamond the four edge capsules
   * leave in its middle. The primitives are smooth-min'd into one distance
   * field, so:
   *   - a lone tile is a perfect disc,
   *   - a straight run is a capsule,
   *   - a block is one rounded pit.
   * Each connected pit is then labelled and its centre-most cell chosen as
   * the pit's pole. That pole is baked alongside the distance, so the shader
   * spins one continuous vortex per pit instead of one per tile (which would
   * leave seams along tile boundaries). Encoded in RGBA8:
   *   R = signed distance (0..1 over [-64px, +16px])
   *   G,B = pit pole (board UV)
   */
  private _ensureHoleField(holes: EnvHole[]): void {
    const sig = holes
      .map((h) => `${h.position.x},${h.position.y},${h.size.w},${h.size.h}`)
      .join(";");
    if (sig === this.holeSig) return;
    this.holeSig = sig;

    const GW = this.hfW;
    const GH = this.hfH;
    const data = new Uint8Array(GW * GH * 4);
    const K = HOLE_MERGE_PX;

    interface Primitive {
      ax: number;
      ay: number;
      bx: number;
      by: number;
      r: number;
      vx: number;
      vy: number;
      len2: number;
      // Pixel bounds grown by K — the only cells that can affect the union.
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    }
    const prims: Primitive[] = [];
    const addPrim = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      r: number
    ) => {
      prims.push({
        ax,
        ay,
        bx,
        by,
        r,
        vx: bx - ax,
        vy: by - ay,
        len2: (bx - ax) * (bx - ax) + (by - ay) * (by - ay),
        minX: Math.min(ax, bx) - r - K,
        maxX: Math.max(ax, bx) + r + K,
        minY: Math.min(ay, by) - r - K,
        maxY: Math.max(ay, by) + r + K,
      });
    };

    // Flatten the tiles once.
    const circles = holes.map((h) => ({
      cx: h.position.x + h.size.w * 0.5,
      cy: h.position.y + h.size.h * 0.5,
      r: Math.min(h.size.w, h.size.h) * 0.5,
    }));
    const gridKey = (x: number, y: number) =>
      `${Math.round(x)},${Math.round(y)}`;
    const byGrid = new Map<string, number>();
    holes.forEach((h, i) => byGrid.set(gridKey(h.position.x, h.position.y), i));

    // A circle is a zero-length capsule, so one SDF covers both primitive kinds.
    for (const c of circles) addPrim(c.cx, c.cy, c.cx, c.cy, c.r);
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i]!;
      const c = circles[i]!;
      const right = byGrid.get(gridKey(h.position.x + h.size.w, h.position.y));
      const down = byGrid.get(gridKey(h.position.x, h.position.y + h.size.h));
      const diag =
        right !== undefined && down !== undefined
          ? byGrid.get(
              gridKey(h.position.x + h.size.w, h.position.y + h.size.h)
            )
          : undefined;
      if (right !== undefined) {
        const rc = circles[right]!;
        addPrim(c.cx, c.cy, rc.cx, rc.cy, c.r);
      }
      if (down !== undefined) {
        const dc = circles[down]!;
        addPrim(c.cx, c.cy, dc.cx, dc.cy, c.r);
      }
      // Fill the middle of a solid 2x2 block (one diagonal is enough).
      if (diag !== undefined) {
        const dc = circles[diag]!;
        addPrim(c.cx, c.cy, dc.cx, dc.cy, c.r);
      }
    }

    // Pass 1 — the distance field itself. Accumulate one primitive at a time
    // over its (small) bounds instead of testing every primitive per cell: a
    // board is ~230k cells, and most of it is far from any pit.
    const N = GW * GH;
    const sdf = new Float32Array(N).fill(HOLE_SDF_SPAN_PX);
    for (const s of prims) {
      const gx0 = Math.max(0, Math.ceil(s.minX / HOLE_CELL - 0.5));
      const gx1 = Math.min(GW - 1, Math.floor(s.maxX / HOLE_CELL - 0.5));
      const gy0 = Math.max(0, Math.ceil(s.minY / HOLE_CELL - 0.5));
      const gy1 = Math.min(GH - 1, Math.floor(s.maxY / HOLE_CELL - 0.5));
      for (let gy = gy0; gy <= gy1; gy++) {
        const py = (gy + 0.5) * HOLE_CELL;
        for (let gx = gx0; gx <= gx1; gx++) {
          const px = (gx + 0.5) * HOLE_CELL;
          // Distance to the capsule's core segment, then its radius.
          const t =
            s.len2 > 0
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    ((px - s.ax) * s.vx + (py - s.ay) * s.vy) / s.len2
                  )
                )
              : 0;
          const dx = px - (s.ax + s.vx * t);
          const dy = py - (s.ay + s.vy * t);
          const cd = Math.sqrt(dx * dx + dy * dy) - s.r;
          const i = gy * GW + gx;
          const cur = sdf[i]!;
          // The sentinel is far above any real distance, so it doubles as
          // "first primitive" — which seeds the union — with no extra flag.
          if (cur === HOLE_SDF_SPAN_PX) {
            sdf[i] = cd;
          } else {
            // Polynomial smooth-min (the GLSL-style smin).
            const w = Math.max(0, Math.min(1, 0.5 + (0.5 * (cur - cd)) / K));
            sdf[i] = cur + (cd - cur) * w - K * w * (1 - w);
          }
        }
      }
    }

    // Pass 2 — label connected pits and choose one vortex centre per pit: the
    // inside cell nearest the pit's centroid. A per-tile centre would leave
    // pattern seams along shared tile edges; one pole per pit keeps the whole
    // swirl continuous.
    const labels = new Int32Array(N).fill(-1);
    const compCount: number[] = [];
    const compSumX: number[] = [];
    const compSumY: number[] = [];
    const stack: number[] = [];
    for (let i = 0; i < N; i++) {
      if (sdf[i]! >= 0 || labels[i] !== -1) continue;
      const comp = compCount.length;
      let count = 0;
      let sumX = 0;
      let sumY = 0;
      labels[i] = comp;
      stack.push(i);
      while (stack.length > 0) {
        const ci = stack.pop()!;
        const cx = ci % GW;
        const cy = (ci / GW) | 0;
        count++;
        sumX += cx;
        sumY += cy;
        if (cx > 0 && labels[ci - 1] === -1 && sdf[ci - 1]! < 0) {
          labels[ci - 1] = comp;
          stack.push(ci - 1);
        }
        if (cx < GW - 1 && labels[ci + 1] === -1 && sdf[ci + 1]! < 0) {
          labels[ci + 1] = comp;
          stack.push(ci + 1);
        }
        if (cy > 0 && labels[ci - GW] === -1 && sdf[ci - GW]! < 0) {
          labels[ci - GW] = comp;
          stack.push(ci - GW);
        }
        if (cy < GH - 1 && labels[ci + GW] === -1 && sdf[ci + GW]! < 0) {
          labels[ci + GW] = comp;
          stack.push(ci + GW);
        }
      }
      compCount.push(count);
      compSumX.push(sumX);
      compSumY.push(sumY);
    }
    const poles = compCount.map((count, comp) => ({
      cx: compSumX[comp]! / count,
      cy: compSumY[comp]! / count,
      x: 0,
      y: 0,
      best: Infinity,
    }));
    // One pass over the grid — not one per pit — to find each pit's pole.
    for (let i = 0; i < N; i++) {
      const comp = labels[i]!;
      if (comp < 0) continue;
      const p = poles[comp]!;
      const gx = i % GW;
      const gy = (i / GW) | 0;
      const dx = gx - p.cx;
      const dy = gy - p.cy;
      const dd = dx * dx + dy * dy;
      if (dd < p.best) {
        p.best = dd;
        p.x = (gx + 0.5) * HOLE_CELL;
        p.y = (gy + 0.5) * HOLE_CELL;
      }
    }

    // Pass 3 — flood the pole outward so every outside cell holds its nearest
    // pit's centre. The shader needs that for rim wobble across the shoreline;
    // a multi-source BFS keeps it O(N) even on levels with many separate pits.
    const queue = new Int32Array(N);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < N; i++) if (labels[i]! >= 0) queue[tail++] = i;
    while (head < tail) {
      const ci = queue[head++]!;
      const comp = labels[ci]!;
      const gx = ci % GW;
      const gy = (ci / GW) | 0;
      if (gx > 0 && labels[ci - 1] === -1) {
        labels[ci - 1] = comp;
        queue[tail++] = ci - 1;
      }
      if (gx < GW - 1 && labels[ci + 1] === -1) {
        labels[ci + 1] = comp;
        queue[tail++] = ci + 1;
      }
      if (gy > 0 && labels[ci - GW] === -1) {
        labels[ci - GW] = comp;
        queue[tail++] = ci - GW;
      }
      if (gy < GH - 1 && labels[ci + GW] === -1) {
        labels[ci + GW] = comp;
        queue[tail++] = ci + GW;
      }
    }

    // Pass 4 — encode.
    for (let i = 0; i < N; i++) {
      const comp = labels[i]!;
      const p = comp >= 0 ? poles[comp]! : null;
      const px = p ? p.x : 0;
      const py = p ? p.y : 0;
      const o = i * 4;
      const sd = (sdf[i]! - HOLE_SDF_MIN_PX) / HOLE_SDF_SPAN_PX;
      data[o] = Math.round(Math.max(0, Math.min(1, sd)) * 255);
      data[o + 1] = Math.round(Math.max(0, Math.min(1, px / this.W)) * 255);
      data[o + 2] = Math.round(Math.max(0, Math.min(1, py / this.H)) * 255);
      data[o + 3] = 255;
    }

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.holeFieldTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // data is already board-oriented
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      GW,
      GH,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); // restore default
  }

  private _drawHoles(verts: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.holeBuf);
    const stride = 4 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.disableVertexAttribArray(2);
    gl.drawArrays(gl.TRIANGLES, 0, verts);
  }

  private _drawWallFills(verts: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.wallFillBuf);
    const stride = 15 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0); // aPos
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, stride, 8); // aType
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 12); // aRect
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 28); // aExp
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 44); // aDiag
    gl.drawArrays(gl.TRIANGLES, 0, verts);
    // Leave attributes 3/4 disabled for the single/dual-attribute passes.
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
  }
}

/**
 * Construct a PostProcessor, returning null (and warning) on any failure —
 * shared by the game (GameEngine) and the level editor so both fall back to
 * plain 2D rendering identically when WebGL is unavailable.
 */
export function tryCreatePostProcessor(
  glCanvas: HTMLCanvasElement,
  width: number,
  height: number
): PostProcessor | null {
  try {
    return new PostProcessor(glCanvas, width, height);
  } catch (err) {
    console.warn("Post-processing unavailable, using 2D canvas:", err);
    return null;
  }
}
