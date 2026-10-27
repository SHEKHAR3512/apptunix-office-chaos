import { DynamicTexture, Mesh, MeshBuilder, TransformNode, Vector3 } from "@babylonjs/core";
import { createToonMaterial } from "../../rendering/ToonMaterial";
import type { WorldContext } from "../../world/WorldContext";
import { drawLogo, rr, text } from "../../assets/TextureAtlas";

export type ComputerState = "off" | "booting" | "desktop";

/**
 * DRAGON's workstation computer: a live screen overlay on his main monitor (power-on,
 * boot, desktop) and the session state the React desktop UI binds to.
 */
export class ComputerScreen {
  state: ComputerState = "off";
  private t = 0;
  readonly mesh: Mesh;
  private readonly tex: DynamicTexture;
  readonly viewPos: Vector3;
  readonly viewTarget: Vector3;
  onStateChange: (s: ComputerState) => void = () => {};

  constructor(ctx: WorldContext, deskAnchor: { position: Vector3; yaw: number }, floorRoot: TransformNode) {
    const scene = ctx.scene;
    this.tex = new DynamicTexture("dragonScreen", { width: 512, height: 296 }, scene, true);
    const h = createToonMaterial(scene, "toon_dragonScreen", { kind: "emissive", texture: this.tex, emissive: 1, contact: 0.1, castsShadow: false });
    // reproduce the monitor transform from DeskSetup (left monitor of the hero desk)
    const desk = new TransformNode("dragonDesk", scene);
    desk.parent = floorRoot;
    desk.position.copyFrom(deskAnchor.position);
    desk.rotation.y = deskAnchor.yaw;
    const mon = new TransformNode("dragonMonitor", scene);
    mon.parent = desk; mon.position.set(-0.31, 0.75, 0.1); mon.rotation.y = 0.18;
    const panel = new TransformNode("dragonPanel", scene);
    const size = 0.58, hgt = size * 0.58;
    panel.parent = mon; panel.position.set(0, 0.12 + hgt / 2, 0.02); panel.rotation.x = -0.06;
    this.mesh = MeshBuilder.CreatePlane("dragonScreenQuad", { width: size - 0.016, height: hgt - 0.016 }, scene);
    this.mesh.parent = panel;
    this.mesh.position.z = -0.0135;
    // CreatePlane lacks colour/uv attributes required by the toon shader → add them
    const n = this.mesh.getTotalVertices();
    this.mesh.setVerticesData("color", new Array(n * 4).fill(1), false, 4);
    this.mesh.material = h.material;
    ctx.materials.handles.set("dragonScreen" as never, h);
    ctx.outlines.addMesh(this.mesh, "display");
    this.mesh.computeWorldMatrix(true);
    const centre = this.mesh.getAbsolutePosition();
    const normal = new Vector3(-Math.sin(deskAnchor.yaw + 0.18), 0, -Math.cos(deskAnchor.yaw + 0.18));
    this.viewPos = centre.add(normal.scale(0.62)).add(new Vector3(0, 0.06, 0));
    this.viewTarget = centre;
    this.paint();
  }

  powerOn(): void {
    if (this.state !== "off") { this.state = "desktop"; this.onStateChange(this.state); return; }
    this.state = "booting"; this.t = 0; this.onStateChange(this.state);
  }

  update(dt: number): void {
    if (this.state === "booting") {
      this.t += dt;
      if (this.t > 2.2) { this.state = "desktop"; this.onStateChange(this.state); }
      this.paint();
    }
  }

  private paint(): void {
    const g = this.tex.getContext() as unknown as CanvasRenderingContext2D;
    const W = 512, H = 296;
    if (this.state === "off") {
      g.fillStyle = "#0d0e12"; g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, 0, W, H * 0.4);
    } else if (this.state === "booting") {
      const k = Math.min(1, this.t / 2);
      g.fillStyle = "#151a28"; g.fillRect(0, 0, W, H);
      g.globalAlpha = Math.min(1, this.t * 2);
      drawLogo(g, W / 2 - 120, H / 2 - 50, 60, false);
      rr(g, W / 2 - 90, H / 2 + 40, 180, 8, 4, "#2a3148");
      rr(g, W / 2 - 90, H / 2 + 40, 180 * k, 8, 4, "#f08a3c");
      g.globalAlpha = 1;
    } else {
      // desktop: wallpaper + docked windows (mirrors the HTML desktop)
      const grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, "#2f5fae"); grd.addColorStop(1, "#1f2a44");
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      rr(g, 20, 20, 300, 200, 8, "#1e2230");
      for (let i = 0; i < 12; i++) rr(g, 40 + (i % 3) * 14, 46 + i * 13, 60 + ((i * 37) % 140), 6, 3, ["#c792ea", "#82aaff", "#c3e88d", "#ffcb6b"][i % 4]);
      rr(g, 335, 20, 158, 120, 8, "#f7f5f2");
      for (let i = 0; i < 4; i++) { rr(g, 345, 32 + i * 26, 18, 18, 5, ["#f08a3c", "#4fb3c8", "#79b06a", "#d98aa2"][i]); rr(g, 370, 36 + i * 26, 100, 6, 3, "#3a3542"); }
      rr(g, 335, 150, 158, 70, 8, "#f4f5f7");
      text(g, "JIRA · 3 tasks", 345, 166, 12, "#2f5fae", { weight: 700 });
      g.fillStyle = "rgba(15,17,24,0.85)"; g.fillRect(0, H - 26, W, 26);
      for (let i = 0; i < 6; i++) rr(g, 170 + i * 30, H - 21, 18, 16, 4, ["#4fb3c8", "#f08a3c", "#79b06a", "#a08ac2", "#e3a548", "#d9675e"][i]);
      text(g, "10:24", W - 44, H - 13, 12, "#e8ecf6", { weight: 600 });
    }
    this.tex.update(true);
  }
}
