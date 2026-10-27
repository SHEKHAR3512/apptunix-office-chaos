import { TransformNode, Vector3 } from "@babylonjs/core";
import type { GeometryBuilder } from "../assets/GeometryBuilder";
import { sfx } from "../core/Audio";
import { P } from "../rendering/Palette";
import type { Collider } from "./Colliders";
import type { WorldContext } from "./WorldContext";

export interface DoorSpec {
  id: string;
  /** Centre of the opening at floor level. */
  x: number; y: number; z: number;
  /** "x": opening runs along X (wall parallel to X). "z": along Z. */
  axis: "x" | "z";
  width: number;
  height?: number;
  type: "slide" | "swing";
  glass: boolean;
  locked?: boolean;
  label?: string;
  floor: number | "ext";
}

/**
 * Automatic doors that open when the player approaches. Slide doors part from the middle;
 * swing doors pivot on one jamb, away from the approaching player.
 */
export class Door {
  open = 0;
  private target = 0;
  private readonly panels: { node: TransformNode; closed: Vector3; dir: Vector3; swing?: boolean }[] = [];
  private readonly collider: Collider;
  private swingSign = 1;
  private wasOpen = false;

  constructor(ctx: WorldContext, readonly spec: DoorSpec) {
    const h = spec.height ?? 2.2;
    const t = 0.05;
    const along = spec.axis === "x" ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
    const root = ctx.root(spec.floor);
    const yaw = spec.axis === "x" ? 0 : -Math.PI / 2;
    const build = (name: string, w: number, fn: (b: GeometryBuilder) => void, pivotLocal: Vector3) => {
      const node = new TransformNode(`door:${spec.id}:${name}`, ctx.scene);
      node.parent = root;
      node.rotation.y = yaw;
      const b = ctx.builder();
      b.measure(`door:${spec.type}${spec.glass ? ":glass" : ""}`, () => b.at(-pivotLocal.x, 0, 0, 0, () => fn(b)));
      ctx.commit(b, `door:${spec.id}:${name}`, node, { static: false }).forEach((m) => ctx.addDynamicCaster(m));
      void w;
      return node;
    };
    const panel = (b: GeometryBuilder, w: number) => {
      if (spec.glass) {
        b.box(0, 0, 0, w, 0.08, t, { mat: "brushed", color: P.aluminium, r: 0.006 });
        b.box(0, h - 0.07, 0, w, 0.07, t, { mat: "brushed", color: P.aluminium, r: 0.006 });
        b.box(-w / 2 + 0.025, 0, 0, 0.05, h, t, { mat: "brushed", color: P.aluminium, r: 0.006 });
        b.box(w / 2 - 0.025, 0, 0, 0.05, h, t, { mat: "brushed", color: P.aluminium, r: 0.006 });
        b.box(0, 0.08, 0, w - 0.1, h - 0.15, 0.012, { mat: "glass", color: "#ffffff", r: 0 });
        b.box(0, 1.3, 0, w - 0.1, 0.12, 0.016, { mat: "plastic", color: "#eef1f4", r: 0 });
        // pull handle
        b.box(w / 2 - 0.12, 0.85, -0.04, 0.025, 0.5, 0.025, { mat: "brushed", color: P.aluminium, r: 0.01 });
        b.box(w / 2 - 0.12, 0.85, 0.04, 0.025, 0.5, 0.025, { mat: "brushed", color: P.aluminium, r: 0.01 });
      } else {
        b.box(0, 0, 0, w, h, t, { mat: "wood", color: "#d9c3a2", r: 0.01 });
        b.box(0, 0.25, -0.026, w - 0.16, h - 0.5, 0.004, { mat: "wood", color: "#cfb592", r: 0.002 });
        b.box(w / 2 - 0.1, 1.0, -0.04, 0.12, 0.025, 0.025, { mat: "brushed", color: P.aluminium, r: 0.01 });
        b.box(w / 2 - 0.1, 1.0, 0.04, 0.12, 0.025, 0.025, { mat: "brushed", color: P.aluminium, r: 0.01 });
        if (spec.label) b.quad(0, 1.6, -0.028, 0.3, 0.11, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel(spec.label, "") });
      }
    };
    const origin = new Vector3(spec.x, spec.y, spec.z);
    if (spec.type === "slide") {
      const pw = spec.width / 2 + 0.03;
      for (const s of [-1, 1]) {
        const node = build(s < 0 ? "L" : "R", pw, (b) => panel(b, pw), new Vector3(0, 0, 0));
        const closed = origin.add(along.scale(s * (pw / 2 - 0.015)));
        node.position.copyFrom(closed);
        this.panels.push({ node, closed, dir: along.scale(s * (pw - 0.06)) });
      }
    } else {
      const w = spec.width - 0.02;
      // pivot on the start jamb; panel geometry offset so it hangs from the pivot
      const node = build("leaf", w, (b) => b.at(w / 2, 0, 0, 0, () => panel(b, w)), new Vector3(0, 0, 0));
      const closed = origin.subtract(along.scale(spec.width / 2 - 0.01));
      node.position.copyFrom(closed);
      this.panels.push({ node, closed, dir: Vector3.Zero(), swing: true });
    }
    const hw = spec.width / 2;
    this.collider = spec.axis === "x"
      ? ctx.colliders.add(spec.x - hw, spec.y, spec.z - 0.06, spec.x + hw, spec.y + h, spec.z + 0.06, "door", spec.id)
      : ctx.colliders.add(spec.x - 0.06, spec.y, spec.z - hw, spec.x + 0.06, spec.y + h, spec.z + hw, "door", spec.id);
    ctx.anchors.add(`door.${spec.id}`, "door", origin, yaw, typeof spec.floor === "number" ? spec.floor : 0, spec.id);
  }

  update(dt: number, player: Vector3, others: Vector3[] = []): void {
    const s = this.spec;
    const dx = player.x - s.x, dz = player.z - s.z, dy = Math.abs(player.y - s.y);
    const r = s.type === "slide" ? 2.4 : 1.7;
    let near = dy < 1.5 && Math.hypot(dx, dz) < r;
    if (!near) for (const o of others) if (Math.abs(o.y - s.y) < 1.5 && Math.hypot(o.x - s.x, o.z - s.z) < r * 0.85) { near = true; break; }
    this.target = near && !s.locked ? 1 : 0;
    if (near && this.open < 0.05) {
      // swing away from the player
      const side = s.axis === "x" ? Math.sign(dz) : -Math.sign(dx);
      this.swingSign = side === 0 ? 1 : side;
    }
    const speed = s.type === "slide" ? 2.2 : 2.6;
    this.open += Math.sign(this.target - this.open) * Math.min(Math.abs(this.target - this.open), dt * speed);
    const e = this.open * this.open * (3 - 2 * this.open);
    for (const p of this.panels) {
      if (p.swing) p.node.rotation.y = (s.axis === "x" ? 0 : -Math.PI / 2) + this.swingSign * e * 1.75;
      else p.node.position.copyFrom(p.closed.add(p.dir.scale(e)));
    }
    this.collider.enabled = this.open < 0.6;
    const isOpen = this.target > 0.5;
    if (isOpen !== this.wasOpen && s.type === "slide") sfx.whoosh(0.03);
    this.wasOpen = isOpen;
  }
}
