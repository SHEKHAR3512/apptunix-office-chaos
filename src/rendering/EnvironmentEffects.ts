import {
  Color4, DynamicTexture, Mesh, ParticleSystem, Scene, ShaderMaterial, Vector3,
} from "@babylonjs/core";
import { AssetStats, BuildContext, GeometryBuilder } from "../assets/GeometryBuilder";
import { registerToonShaders } from "./ToonShaders";
import type { LightingManager } from "./LightingManager";
import type { WorldContext } from "../world/WorldContext";

/** Posterised gradient sky with banded clouds; rendered behind everything. */
export function createSky(scene: Scene, lighting: LightingManager): { mesh: Mesh; material: ShaderMaterial } {
  registerToonShaders();
  const material = new ShaderMaterial("sky", scene, { vertex: "toonSky", fragment: "toonSky" }, {
    attributes: ["position", "normal", "color", "uv"],
    uniforms: ["world", "viewProjection", "uCameraPos", "uZenith", "uHorizon", "uSunDir", "uTime"],
  });
  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.setVector3("uZenith", new Vector3(0.47, 0.64, 0.86));
  material.setVector3("uHorizon", new Vector3(0.98, 0.86, 0.76));
  let mesh: Mesh | null = null;
  const ctx: BuildContext = {
    scene, stats: new AssetStats(),
    registerMesh: (m) => { m.material = material; mesh = m; },
  };
  const b = new GeometryBuilder();
  b.sphere(0, 0, 0, 500, 500, 500, 16, { mat: "wall", color: "#ffffff" });
  b.build(ctx, "skyDome");
  const sky = mesh!;
  sky.infiniteDistance = true;
  sky.renderingGroupId = 0;
  sky.isPickable = false;
  scene.onBeforeRenderObservable.add(() => {
    const cam = scene.activeCamera;
    if (!cam) return;
    material.setVector3("uCameraPos", cam.globalPosition);
    material.setVector3("uSunDir", lighting.current.keyDir);
    material.setFloat("uTime", lighting.time);
  });
  return { mesh: sky, material };
}

/** Soft dust motes drifting in the office air. Particles are tiny, warm and very sparse. */
export function createDust(scene: Scene, emitterBox: { min: Vector3; max: Vector3 }): ParticleSystem {
  const tex = new DynamicTexture("dustTex", { width: 32, height: 32 }, scene, false);
  const g = tex.getContext() as unknown as CanvasRenderingContext2D;
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,248,230,1)");
  grd.addColorStop(1, "rgba(255,248,230,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  tex.update();
  tex.hasAlpha = true;
  const ps = new ParticleSystem("dust", 600, scene);
  ps.particleTexture = tex;
  ps.minEmitBox = emitterBox.min;
  ps.maxEmitBox = emitterBox.max;
  ps.emitter = Vector3.Zero();
  ps.color1 = new Color4(1, 0.97, 0.9, 0.35);
  ps.color2 = new Color4(1, 0.94, 0.85, 0.2);
  ps.colorDead = new Color4(1, 1, 1, 0);
  ps.minSize = 0.01; ps.maxSize = 0.025;
  ps.minLifeTime = 6; ps.maxLifeTime = 12;
  ps.emitRate = 45;
  ps.gravity = new Vector3(0, -0.005, 0);
  ps.direction1 = new Vector3(-0.03, 0.02, -0.03);
  ps.direction2 = new Vector3(0.03, 0.05, 0.03);
  ps.minEmitPower = 0.2; ps.maxEmitPower = 0.5;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.preWarmCycles = 200;
  return ps;
}

/** Wall clocks that tell the real local time. */
export function animatedClock(ctx: WorldContext, x: number, y: number, z: number, yaw: number): void {
  const parts: { name: string; len: number; w: number; color: string; fn: (d: Date) => number }[] = [
    { name: "h", len: 0.075, w: 0.012, color: "#1f2a44", fn: (d) => ((d.getHours() % 12) + d.getMinutes() / 60) / 12 },
    { name: "m", len: 0.11, w: 0.008, color: "#1f2a44", fn: (d) => (d.getMinutes() + d.getSeconds() / 60) / 60 },
    { name: "s", len: 0.12, w: 0.004, color: "#f08a3c", fn: (d) => (d.getSeconds() + d.getMilliseconds() / 1000) / 60 },
  ];
  for (const p of parts) {
    const b = ctx.builder();
    b.box(0, -0.015, 0, p.w, p.len + 0.03, 0.004, { mat: "plastic", color: p.color, r: 0 });
    const ms = ctx.commit(b, `clock:${p.name}`, undefined, { static: false });
    for (const m of ms) {
      m.position.set(x, y, z);
      m.rotation.y = yaw;
      ctx.onUpdate(() => { m.rotation.z = -p.fn(new Date()) * Math.PI * 2; });
    }
  }
}
