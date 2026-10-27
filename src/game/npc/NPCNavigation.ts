import { ICrowd, Mesh, RecastJSPlugin, Scene, TransformNode, Vector3, VertexData } from "@babylonjs/core";
import Recast from "recast-detour";
import type { ColliderWorld } from "../../world/Colliders";

export interface AgentHandle { index: number; node: TransformNode }

/**
 * Recast nav mesh + Detour crowd for one storey. Source geometry is generated from Phase 1
 * data (floor footprint + collider boxes as obstacles), so architecture is never modified to
 * solve navigation. Agents are steered by the crowd (local avoidance), and positions are read
 * back into the character controllers.
 */
export class NPCNavigation {
  plugin!: RecastJSPlugin;
  crowd!: ICrowd;
  ready = false;
  private agents: AgentHandle[] = [];
  private y = 0;

  constructor(private readonly scene: Scene) {}

  async build(colliders: ColliderWorld, y: number, bounds: { x0: number; z0: number; x1: number; z1: number }, maxAgents = 48): Promise<void> {
    this.y = y;
    // the emscripten factory writes to `this.Recast`; ES modules have no `this`, so bind one
    const recast = await (Recast as unknown as { call: (t: object) => Promise<unknown> }).call({});
    this.plugin = new RecastJSPlugin(recast);
    const mesh = this.sourceMesh(colliders, y, bounds);
    this.plugin.createNavMesh([mesh], {
      cs: 0.1, ch: 0.08, walkableSlopeAngle: 30, walkableHeight: 20, walkableClimb: 2, walkableRadius: 3,
      maxEdgeLen: 12, maxSimplificationError: 1.1, minRegionArea: 12, mergeRegionArea: 30,
      maxVertsPerPoly: 6, detailSampleDist: 6, detailSampleMaxError: 1,
    });
    mesh.dispose();
    this.plugin.setDefaultQueryExtent(new Vector3(1.5, 1.2, 1.5));
    this.crowd = this.plugin.createCrowd(maxAgents, 0.4, this.scene);
    this.ready = true;
  }

  /** Floor slab + an extruded box per obstacle collider, merged into one triangle soup. */
  private sourceMesh(colliders: ColliderWorld, y: number, b: { x0: number; z0: number; x1: number; z1: number }): Mesh {
    const pos: number[] = [], idx: number[] = [];
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      const base = pos.length / 3;
      const v = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      for (const p of v) pos.push(p[0], p[1], p[2]);
      const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
      for (const t of f) idx.push(base + t[0], base + t[1], base + t[2]);
    };
    box(b.x0, y - 0.1, b.z0, b.x1, y, b.z1);
    for (const c of colliders.list) {
      if (c.tag === "slab" || c.tag === "door" || c.tag === "lift") continue;
      if (c.maxY < y + 0.1 || c.minY > y + 1.9) continue;
      if (c.maxX < b.x0 || c.minX > b.x1 || c.maxZ < b.z0 || c.minZ > b.z1) continue;
      box(c.minX, y, c.minZ, c.maxX, Math.max(c.maxY, y + 1.0), c.maxZ);
    }
    const m = new Mesh("navSource", this.scene);
    const vd = new VertexData();
    vd.positions = pos; vd.indices = idx;
    vd.applyToMesh(m);
    m.isVisible = false;
    return m;
  }

  closest(p: Vector3): Vector3 { return this.plugin.getClosestPoint(p); }

  addAgent(p: Vector3, speed: number): AgentHandle {
    const node = new TransformNode("navAgent", this.scene);
    const index = this.crowd.addAgent(this.closest(p), {
      radius: 0.3, height: 1.7, maxAcceleration: 6, maxSpeed: speed, collisionQueryRange: 1.4,
      pathOptimizationRange: 6, separationWeight: 1.6, reachRadius: 0.25,
    }, node);
    const h = { index, node };
    this.agents.push(h);
    return h;
  }

  goTo(a: AgentHandle, target: Vector3): Vector3 {
    const t = this.closest(target);
    this.crowd.agentGoto(a.index, t);
    return t;
  }

  teleport(a: AgentHandle, p: Vector3): void { this.crowd.agentTeleport(a.index, this.closest(p)); }
  position(a: AgentHandle): Vector3 { return this.crowd.getAgentPosition(a.index); }
  velocity(a: AgentHandle): Vector3 { return this.crowd.getAgentVelocity(a.index); }
  setSpeed(a: AgentHandle, speed: number): void {
    const params = { maxSpeed: speed } as Record<string, number>;
    (this.crowd as unknown as { updateAgentParameters?: (i: number, p: Record<string, number>) => void }).updateAgentParameters?.(a.index, params);
  }

  /** A player "obstacle" agent so NPCs steer around DRAGON. */
  update(dt: number): void { if (this.ready) this.crowd.update(dt); }
  get floorY(): number { return this.y; }

  /** Path length check used by tests and stuck recovery. */
  path(from: Vector3, to: Vector3): Vector3[] { return this.plugin.computePath(this.closest(from), this.closest(to)); }

  /** Debug visualisation of the nav mesh (toggle from the debug overlay). */
  debugMesh(): Mesh {
    const m = this.plugin.createDebugNavMesh(this.scene);
    m.position.y += 0.02;
    return m;
  }
}
