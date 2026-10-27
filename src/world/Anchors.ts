import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";

export type AnchorType = "chair" | "computer" | "stand" | "camera" | "seat" | "spawn" | "interact" | "lift" | "door";

export interface Anchor {
  id: string;
  type: AnchorType;
  position: Vector3;
  /** Facing (Babylon rotation.y): 0 = +Z. */
  yaw: number;
  floor: number;
  zone: string;
  owner?: string;
  node: TransformNode;
}

/**
 * Named interaction anchors (desk chair positions, computer focus points, standing spots,
 * cinematic camera positions, meeting seats). Future NPC/character systems will query these
 * instead of hard-coding coordinates. Exported as JSON via `window.__game.anchors.toJSON()`.
 */
export class AnchorRegistry {
  readonly items = new Map<string, Anchor>();
  private debugNodes: TransformNode[] = [];

  constructor(private readonly scene: Scene) {}

  add(id: string, type: AnchorType, position: Vector3, yaw: number, floor: number, zone: string, owner?: string): Anchor {
    const node = new TransformNode(`anchor:${id}`, this.scene);
    node.position.copyFrom(position);
    node.rotation.y = yaw;
    node.metadata = { anchor: id, type, owner };
    const a: Anchor = { id, type, position: position.clone(), yaw, floor, zone, owner, node };
    this.items.set(id, a);
    return a;
  }

  get(id: string): Anchor | undefined { return this.items.get(id); }

  byZone(zone: string): Anchor[] { return [...this.items.values()].filter((a) => a.zone === zone); }

  toJSON(): object[] {
    return [...this.items.values()].map((a) => ({
      id: a.id, type: a.type, floor: a.floor, zone: a.zone, owner: a.owner,
      position: [+a.position.x.toFixed(3), +a.position.y.toFixed(3), +a.position.z.toFixed(3)], yaw: +a.yaw.toFixed(4),
    }));
  }

  /** Small coloured markers for the debug view. Uses StandardMaterial on purpose: it must look "debug". */
  setDebugVisible(v: boolean): void {
    if (!v) { this.debugNodes.forEach((n) => n.dispose()); this.debugNodes = []; return; }
    if (this.debugNodes.length) return;
    const colors: Record<AnchorType, Color3> = {
      chair: new Color3(1, 0.5, 0.1), computer: new Color3(0.2, 0.8, 1), stand: new Color3(0.3, 1, 0.4), camera: new Color3(1, 0.2, 0.8),
      seat: new Color3(1, 0.85, 0.2), spawn: new Color3(1, 1, 1), interact: new Color3(0.6, 0.4, 1), lift: new Color3(0.9, 0.9, 0.9), door: new Color3(0.5, 0.5, 0.5),
    };
    const mats = new Map<AnchorType, StandardMaterial>();
    for (const a of this.items.values()) {
      let m = mats.get(a.type);
      if (!m) { m = new StandardMaterial(`anchorMat_${a.type}`, this.scene); m.emissiveColor = colors[a.type]; m.disableLighting = true; mats.set(a.type, m); }
      const s = MeshBuilder.CreateBox(`dbg:${a.id}`, { width: 0.12, height: 0.12, depth: 0.3 }, this.scene);
      s.position.copyFrom(a.position);
      s.rotation.y = a.yaw;
      s.material = m;
      s.isPickable = false;
      this.debugNodes.push(s);
    }
  }
}
