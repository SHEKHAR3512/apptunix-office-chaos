import {
  Camera, Color4, Constants, Effect, FxaaPostProcess, Mesh, PostProcess, RenderTargetTexture, Scene, Texture, Vector3,
} from "@babylonjs/core";
import type { MaterialKey, MaterialRegistry } from "../assets/MaterialRegistry";
import { registerToonShaders } from "./ToonShaders";

export interface OutlineSettings {
  thickness: number;        // in pixels at 1080p
  depthThreshold: number;
  normalThreshold: number;
  strength: number;
  color: [number, number, number];
  fadeStart: number;
  fadeEnd: number;
  farStrength: number;
  colorMix: number;
}

export interface GradeSettings {
  exposure: number;
  contrast: number;
  saturation: number;
  vignette: number;
  lift: [number, number, number];
  gain: [number, number, number];
}

/**
 * Screen-space illustrated outlines.
 *
 * A normal+depth G-buffer is rendered with per-family override materials, then a single
 * post-process detects silhouettes (depth) and creases (normals), modulates them by the
 * per-material outline weight, and composites coloured lines with the colour grade.
 *
 * Chosen over inverted-hull meshes because it (1) costs one extra geometry pass instead of
 * doubling every draw call, (2) gives consistent pixel-width lines regardless of mesh scale,
 * so small props don't get blobby outlines, and (3) never produces hull artefacts on glass,
 * since transparent surfaces are simply excluded from the buffer.
 */
export class OutlineSystem {
  readonly normalDepth: RenderTargetTexture;
  readonly post: PostProcess;
  readonly fxaa: FxaaPostProcess | null;
  settings: OutlineSettings = {
    thickness: 1.5,
    depthThreshold: 0.035,
    normalThreshold: 0.32,
    strength: 0.92,
    color: [0.17, 0.14, 0.2],
    fadeStart: 14,
    fadeEnd: 48,
    farStrength: 0.45,
    colorMix: 0.45,
  };
  grade: GradeSettings = {
    exposure: 1.04,
    contrast: 1.06,
    saturation: 1.08,
    vignette: 0.42,
    lift: [0.025, 0.018, 0.035],
    gain: [1.0, 0.99, 0.97],
  };
  debugMode = 0;
  time = 0;

  constructor(private readonly scene: Scene, camera: Camera, private readonly materials: MaterialRegistry, opts: { msaa: number; fxaa: boolean }) {
    registerToonShaders();
    const engine = scene.getEngine();
    this.normalDepth = new RenderTargetTexture("normalDepth", { width: engine.getRenderWidth(), height: engine.getRenderHeight() }, scene, {
      generateMipMaps: false,
      type: Constants.TEXTURETYPE_HALF_FLOAT,
      samplingMode: Texture.NEAREST_SAMPLINGMODE,
      generateDepthBuffer: true,
    });
    this.normalDepth.clearColor = new Color4(0, 0, 0, 1000);
    // must be explicit: otherwise it inherits the previous RTT's camera (the shadow light)
    this.normalDepth.activeCamera = camera;
    this.normalDepth.renderList = [];
    this.normalDepth.renderParticles = false;
    this.normalDepth.renderSprites = false;
    scene.customRenderTargets.push(this.normalDepth);

    this.post = new PostProcess(
      "toonOutline", "toonOutline",
      ["uTexel", "uOutline", "uOutlineColor", "uOutlineFade", "uGrade", "uLift", "uGain", "uDebugMode", "uTime"],
      ["uNormalDepth"], 1.0, camera, Texture.BILINEAR_SAMPLINGMODE, engine, false,
    );
    this.post.samples = opts.msaa;
    this.post.onApply = (e: Effect) => {
      const s = this.settings, g = this.grade;
      const h = engine.getRenderHeight();
      const px = Math.max(1, Math.round((s.thickness * h) / 1080));
      e.setTexture("uNormalDepth", this.normalDepth);
      e.setFloat2("uTexel", 1 / engine.getRenderWidth(), 1 / h);
      e.setFloat4("uOutline", px, s.depthThreshold, s.normalThreshold, s.strength);
      e.setFloat3("uOutlineColor", ...s.color);
      e.setFloat4("uOutlineFade", s.fadeStart, s.fadeEnd, s.farStrength, s.colorMix);
      e.setFloat4("uGrade", g.exposure, g.contrast, g.saturation, g.vignette);
      e.setFloat3("uLift", ...g.lift);
      e.setFloat3("uGain", ...g.gain);
      e.setFloat("uDebugMode", this.debugMode);
      e.setFloat("uTime", this.time % 100);
    };
    this.fxaa = opts.fxaa ? new FxaaPostProcess("fxaa", 1.0, camera) : null;

    engine.onResizeObservable.add(() => {
      this.normalDepth.resize({ width: engine.getRenderWidth(), height: engine.getRenderHeight() });
    });
  }

  addMesh(mesh: Mesh, key: MaterialKey): void {
    const f = this.materials.get(key).family;
    if (f.kind === "glass" || f.outline <= 0) return;
    this.normalDepth.renderList!.push(mesh);
    this.normalDepth.setMaterialForRendering(mesh, this.materials.normalDepthFor(key));
  }

  /** Switch a mesh to the skinned outline material (call after assigning its skeleton). */
  setSkinned(mesh: Mesh, key: MaterialKey): void {
    const f = this.materials.get(key).family;
    if (f.kind === "glass" || f.outline <= 0) return;
    this.normalDepth.setMaterialForRendering(mesh, this.materials.normalDepthFor(key, true));
  }

  removeMesh(mesh: Mesh): void {
    const l = this.normalDepth.renderList!;
    const i = l.indexOf(mesh);
    if (i >= 0) l.splice(i, 1);
  }

  update(camera: Camera, dt: number): void {
    this.time += dt;
    const p: Vector3 = camera.globalPosition;
    for (const m of this.materials.allNormalDepth()) m.setVector3("uCameraPos", p);
  }

  resync(): void {
    const engine = this.scene.getEngine();
    this.normalDepth.resize({ width: engine.getRenderWidth(), height: engine.getRenderHeight() });
  }
}
