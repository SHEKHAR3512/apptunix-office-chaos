import {
  Camera, Color4, Constants, FreeCamera, Matrix, Mesh, RenderTargetTexture, Scene, ShaderMaterial, Texture, Vector3, Vector4,
} from "@babylonjs/core";
import type { MaterialRegistry } from "../assets/MaterialRegistry";
import { createShadowDepthMaterial } from "./ToonMaterial";

export interface LightingPreset {
  keyDir: Vector3;          // towards the light
  keyColor: [number, number, number];
  sky: [number, number, number];
  ground: [number, number, number];
  shadowTint: [number, number, number];
  shadowStrength: number;
  fog: [number, number, number, number];
}

/** Warm, welcoming office light. Ceiling panels are the "key"; floor bounce fills from below. */
export const INTERIOR: LightingPreset = {
  keyDir: new Vector3(0.55, 1, 0.34).normalize(),
  keyColor: [1.0, 0.96, 0.9],
  sky: [0.95, 0.94, 0.93],
  ground: [0.84, 0.78, 0.74],
  shadowTint: [0.9, 0.82, 0.88],
  shadowStrength: 0.85,
  fog: [0.93, 0.88, 0.82, 0.006],
};

/** Late-afternoon Mohali sun for the street and facade. */
export const EXTERIOR: LightingPreset = {
  keyDir: new Vector3(-0.45, 0.8, -0.5).normalize(),
  keyColor: [1.0, 0.9, 0.76],
  sky: [0.86, 0.9, 0.98],
  ground: [0.8, 0.72, 0.62],
  shadowTint: [0.78, 0.8, 0.95],
  shadowStrength: 0.9,
  fog: [0.88, 0.86, 0.88, 0.0035],
};

export class LightingManager {
  readonly shadowMap: RenderTargetTexture;
  readonly lightCam: FreeCamera;
  private readonly depthMat: ShaderMaterial;
  /** Separate instance for skinned meshes: one ShaderMaterial can't hold bone and no-bone variants at once. */
  private readonly skinnedDepthMat: ShaderMaterial;
  private preset: LightingPreset = INTERIOR;
  private target: LightingPreset = INTERIOR;
  private blend = 1;
  private readonly cur = { ...INTERIOR, keyDir: INTERIOR.keyDir.clone() };
  private origin = Vector3.Zero();
  private forward = new Vector3(0, -1, 0);
  private range = 100;
  private lightVP = Matrix.Identity();
  private fitMin = new Vector3(-10, 0, -10);
  private fitMax = new Vector3(10, 4, 10);
  shadowsEnabled = true;
  debugMode = 0;
  time = 0;
  inside = 0;

  constructor(scene: Scene, private readonly materials: MaterialRegistry, shadowSize: number) {
    this.lightCam = new FreeCamera("lightCam", new Vector3(0, 50, 0), scene, false);
    this.lightCam.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.lightCam.minZ = 0.5;
    this.lightCam.maxZ = 200;
    this.depthMat = createShadowDepthMaterial(scene);
    this.skinnedDepthMat = createShadowDepthMaterial(scene);

    this.shadowMap = new RenderTargetTexture("toonShadowMap", shadowSize, scene, {
      generateMipMaps: false,
      type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
      samplingMode: Texture.NEAREST_SAMPLINGMODE,
      generateDepthBuffer: true,
    });
    this.shadowMap.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.shadowMap.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.shadowMap.activeCamera = this.lightCam;
    this.shadowMap.clearColor = new Color4(1, 1, 1, 1);
    this.shadowMap.renderList = [];
    this.shadowMap.renderParticles = false;
    this.shadowMap.renderSprites = false;
    scene.customRenderTargets.push(this.shadowMap);

    for (const h of materials.all()) h.material.setTexture("uShadowMap", this.shadowMap);
  }

  addCaster(mesh: Mesh): void {
    this.shadowMap.renderList!.push(mesh);
    this.shadowMap.setMaterialForRendering(mesh, mesh.skeleton ? this.skinnedDepthMat : this.depthMat);
  }

  removeCaster(mesh: Mesh): void {
    const l = this.shadowMap.renderList!;
    const i = l.indexOf(mesh);
    if (i >= 0) l.splice(i, 1);
  }

  setShadowSize(size: number): void {
    this.shadowMap.resize(size);
    this.refitShadow();
  }

  setRefreshRate(n: number): void { this.shadowMap.refreshRate = n; }

  /** Smoothly blend to another lighting preset (e.g. leaving the building). */
  usePreset(p: LightingPreset, instant = false): void {
    if (p === this.target) return;
    this.preset = { ...this.cur, keyDir: this.cur.keyDir.clone() };
    this.target = p;
    this.blend = instant ? 1 : 0;
    if (instant) this.copyPreset(p);
    this.refitShadow();
  }

  /** Fit the orthographic shadow frustum around the active play area. */
  fitShadowTo(min: Vector3, max: Vector3): void {
    this.fitMin = min.clone();
    this.fitMax = max.clone();
    this.refitShadow();
  }

  private refitShadow(): void {
    const dir = this.target.keyDir.clone().normalize();
    const center = this.fitMin.add(this.fitMax).scale(0.5);
    const radius = this.fitMax.subtract(this.fitMin).length() * 0.5;
    this.lightCam.position = center.add(dir.scale(radius + 20));
    this.lightCam.setTarget(center);
    const view = this.lightCam.getViewMatrix(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const c = new Vector3(i & 1 ? this.fitMax.x : this.fitMin.x, i & 2 ? this.fitMax.y : this.fitMin.y, i & 4 ? this.fitMax.z : this.fitMin.z);
      const v = Vector3.TransformCoordinates(c, view);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z1 = Math.max(z1, v.z);
    }
    this.lightCam.orthoLeft = x0; this.lightCam.orthoRight = x1;
    this.lightCam.orthoBottom = y0; this.lightCam.orthoTop = y1;
    this.lightCam.maxZ = z1 + 5;
    this.lightCam.minZ = 0.5;
    this.origin = this.lightCam.position.clone();
    this.forward = center.subtract(this.origin).normalize();
    this.range = this.lightCam.maxZ;
    this.lightVP = this.lightCam.getViewMatrix(true).multiply(this.lightCam.getProjectionMatrix(true));
    for (const m of [this.depthMat, this.skinnedDepthMat]) {
      m.setVector3("uLightOrigin", this.origin);
      m.setVector3("uLightForward", this.forward);
      m.setFloat("uLightRange", this.range);
    }
    // the static environment only needs the shadow map re-rendered when the frustum moves
    this.shadowMap.resetRefreshCounter();
  }

  private copyPreset(p: LightingPreset): void {
    this.cur.keyDir = p.keyDir.clone();
    this.cur.keyColor = [...p.keyColor];
    this.cur.sky = [...p.sky];
    this.cur.ground = [...p.ground];
    this.cur.shadowTint = [...p.shadowTint];
    this.cur.shadowStrength = p.shadowStrength;
    this.cur.fog = [...p.fog];
  }

  update(camera: Camera, dt: number): void {
    this.time += dt;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * 1.5);
      const t = this.blend, a = this.preset, b = this.target;
      const mix3 = (x: number[], y: number[]) => x.map((v, i) => v + (y[i] - v) * t) as [number, number, number];
      this.cur.keyDir = Vector3.Lerp(a.keyDir, b.keyDir, t).normalize();
      this.cur.keyColor = mix3(a.keyColor, b.keyColor);
      this.cur.sky = mix3(a.sky, b.sky);
      this.cur.ground = mix3(a.ground, b.ground);
      this.cur.shadowTint = mix3(a.shadowTint, b.shadowTint);
      this.cur.shadowStrength = a.shadowStrength + (b.shadowStrength - a.shadowStrength) * t;
      this.cur.fog = a.fog.map((v, i) => v + (b.fog[i] - v) * t) as [number, number, number, number];
    }
    // shadows always use the target direction so the shadow map stays valid during a blend
    const sd = this.target.keyDir;
    const c = this.cur;
    const texel = 1 / this.shadowMap.getSize().width;
    const shadowParams = new Vector4(texel, 0.035 / this.range, this.shadowsEnabled ? 1 : 0, c.shadowStrength);
    for (const h of this.materials.all()) {
      const m = h.material;
      m.setVector3("uKeyDir", sd);
      m.setVector3("uKeyColor", new Vector3(...c.keyColor));
      m.setVector3("uSkyColor", new Vector3(...c.sky));
      m.setVector3("uGroundColor", new Vector3(...c.ground));
      m.setVector3("uShadowTint", new Vector3(...c.shadowTint));
      m.setVector3("uCameraPos", camera.globalPosition);
      m.setVector4("uFog", new Vector4(...c.fog));
      m.setVector4("uShadowParams", shadowParams);
      m.setMatrix("uLightVP", this.lightVP);
      m.setVector3("uLightOrigin", this.origin);
      m.setVector3("uLightForward", this.forward);
      m.setFloat("uLightRange", this.range);
      m.setFloat("uDebugMode", this.debugMode);
      m.setFloat("uTime", this.time);
      m.setFloat("uFloorHeight", 4.0);
      m.setFloat("uInside", this.inside);
    }
  }

  get current(): LightingPreset { return this.cur; }
}
