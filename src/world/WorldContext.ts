import { Mesh, Scene, TransformNode } from "@babylonjs/core";
import { AssetStats, BuildContext, GeometryBuilder } from "../assets/GeometryBuilder";
import type { MaterialKey, MaterialRegistry } from "../assets/MaterialRegistry";
import type { AtlasContent } from "../assets/AtlasContent";
import type { LightingManager } from "../rendering/LightingManager";
import type { OutlineSystem } from "../rendering/OutlineSystem";
import { AnchorRegistry } from "./Anchors";
import { ColliderWorld } from "./Colliders";

export type FloorKey = number | "ext" | "shell" | "dynamic";

/**
 * Everything a section builder needs. Owns the mapping from built meshes to render systems,
 * and keeps shadow casters bucketed per floor so only the active storey renders into the map.
 */
export class WorldContext implements BuildContext {
  readonly colliders = new ColliderWorld();
  readonly anchors: AnchorRegistry;
  readonly stats = new AssetStats();
  readonly updatables: ((dt: number, t: number) => void)[] = [];
  readonly floorRoots = new Map<FloorKey, TransformNode>();
  private readonly casters = new Map<FloorKey, Mesh[]>();
  currentFloor: FloorKey = "ext";
  detailDistance = 26;
  meshCount = 0;

  constructor(
    readonly scene: Scene,
    readonly materials: MaterialRegistry,
    readonly atlas: AtlasContent,
    readonly lighting: LightingManager,
    readonly outlines: OutlineSystem,
  ) {
    this.anchors = new AnchorRegistry(scene);
  }

  root(key: FloorKey): TransformNode {
    let r = this.floorRoots.get(key);
    if (!r) { r = new TransformNode(`root:${key}`, this.scene); this.floorRoots.set(key, r); }
    return r;
  }

  builder(): GeometryBuilder { return new GeometryBuilder(); }

  /** Build a builder's batches into the current floor's root. */
  commit(b: GeometryBuilder, name: string, parent?: TransformNode, opts: { static?: boolean } = {}): Mesh[] {
    return b.build(this, name, parent ?? this.root(this.currentFloor), { static: opts.static, lodDistance: this.detailDistance });
  }

  registerMesh(mesh: Mesh, key: MaterialKey, opts: { static: boolean; detail: boolean }): void {
    const h = this.materials.get(key);
    mesh.material = h.material;
    mesh.alwaysSelectAsActiveMesh = false;
    if (h.family.kind === "glass") mesh.alphaIndex = 10;
    const bucket: FloorKey = opts.static ? this.currentFloor : "dynamic";
    if (h.family.castsShadow && !opts.detail) {
      let a = this.casters.get(bucket);
      if (!a) { a = []; this.casters.set(bucket, a); }
      a.push(mesh);
    }
    this.outlines.addMesh(mesh, key);
    if (opts.static) {
      mesh.freezeWorldMatrix();
      mesh.doNotSyncBoundingInfo = true;
    }
    mesh.metadata = { floor: bucket, key };
    this.meshCount++;
  }

  /** Point the shadow map at the casters relevant for the floor the player is on. */
  setShadowFloor(floor: FloorKey): void {
    const list: Mesh[] = [];
    for (const k of [floor, "dynamic" as FloorKey, ...(floor === 0 ? ["ext" as FloorKey] : [])]) {
      for (const m of this.casters.get(k) ?? []) list.push(m);
    }
    const rl = this.lighting.shadowMap.renderList!;
    rl.length = 0;
    for (const m of list) this.lighting.addCaster(m);
    this.lighting.shadowMap.resetRefreshCounter();
  }

  /** Re-bucket casters after spawning dynamic objects (characters). */
  refreshShadows(floor: FloorKey): void { this.setShadowFloor(floor); }

  addDynamicCaster(mesh: Mesh): void {
    let a = this.casters.get("dynamic");
    if (!a) { a = []; this.casters.set("dynamic", a); }
    a.push(mesh);
    this.lighting.addCaster(mesh);
  }

  onUpdate(fn: (dt: number, t: number) => void): void { this.updatables.push(fn); }
}
