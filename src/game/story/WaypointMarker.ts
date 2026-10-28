import { Mesh, TransformNode, Vector3 } from "@babylonjs/core";
import type { WorldContext } from "../../world/WorldContext";

/**
 * Subtle illustrated objective marker: a small faceted gem with a soft ground ring, in the
 * brand orange, bobbing gently. Uses the toon materials so it sits in the art style.
 */
export class WaypointMarker {
  readonly root: TransformNode;
  private gem: TransformNode;
  private ring: Mesh[];
  private t = 0;
  private target: Vector3 | null = null;

  constructor(ctx: WorldContext) {
    this.root = new TransformNode("waypoint", ctx.scene);
    this.root.parent = ctx.root("dynamic");
    this.gem = new TransformNode("waypointGem", ctx.scene);
    this.gem.parent = this.root;
    const b = ctx.builder();
    b.lathe(0, 0, 0, [[0, -0.16], [0.09, 0], [0, 0.16]], 6, { mat: "light", color: "#f6a35c", hard: true });
    b.lathe(0, 0, 0, [[0, -0.12], [0.065, 0], [0, 0.12]], 6, { mat: "plastic", color: "#f08a3c", hard: true });
    const prev = ctx.currentFloor; ctx.currentFloor = "dynamic";
    ctx.commit(b, "waypointGem", this.gem, { static: false });
    const rb = ctx.builder();
    rb.lathe(0, 0, 0, [[0.26, 0], [0.3, 0.004], [0.34, 0]], 28, { mat: "light", color: "#f8c08a" });
    this.ring = ctx.commit(rb, "waypointRing", this.root, { static: false });
    ctx.currentFloor = prev;
    this.root.setEnabled(false);
  }

  set(p: Vector3 | null): void {
    this.target = p ? p.clone() : null;
    this.root.setEnabled(!!p);
  }

  update(dt: number, playerPos: Vector3): void {
    if (!this.target) return;
    this.t += dt;
    const near = Vector3.Distance(new Vector3(playerPos.x, 0, playerPos.z), new Vector3(this.target.x, 0, this.target.z)) < 1.3 && Math.abs(playerPos.y - this.target.y) < 1.5;
    this.root.setEnabled(!near);
    this.root.position.copyFrom(this.target);
    this.gem.position.y = 2.15 + Math.sin(this.t * 2.2) * 0.06;
    this.gem.rotation.y += dt * 1.4;
    const s = 1 + Math.sin(this.t * 2.2) * 0.06;
    for (const m of this.ring) { m.scaling.set(s, 1, s); m.position.y = 0.012; }
  }
}
