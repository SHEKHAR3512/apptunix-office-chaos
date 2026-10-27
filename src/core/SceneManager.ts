import { Vector3 } from "@babylonjs/core";
import { EXTERIOR, INTERIOR } from "../rendering/LightingManager";
import { BUILDING, floorY } from "../world/OfficeLayout";
import type { WorldContext } from "../world/WorldContext";

export type FloorBuilder = (level: number) => void;

/**
 * Owns which storey is "live": enables its root, lazily builds it on first visit,
 * re-buckets shadow casters and refits the shadow frustum.
 */
export class SceneManager {
  activeFloor = -1;
  private built = new Set<number>();
  private builders = new Map<number, FloorBuilder>();
  outside = true;

  constructor(private readonly ctx: WorldContext) {}

  register(level: number, fn: FloorBuilder): void { this.builders.set(level, fn); }

  ensureBuilt(level: number): void {
    if (this.built.has(level)) return;
    const fn = this.builders.get(level);
    if (!fn) return;
    const prev = this.ctx.currentFloor;
    this.ctx.currentFloor = level;
    fn(level);
    this.ctx.currentFloor = prev;
    this.built.add(level);
    this.ctx.atlas.atlas.commit();
    this.ctx.root(level).setEnabled(level === this.activeFloor);
  }

  isBuilt(level: number): boolean { return this.built.has(level); }

  setActiveFloor(level: number): void {
    this.ensureBuilt(level);
    if (level === this.activeFloor) return;
    this.activeFloor = level;
    for (let L = 0; L < BUILDING.floors.length; L++) this.ctx.root(L).setEnabled(L === level);
    this.ctx.setShadowFloor(level);
    this.updateShadowFit();
  }

  /** Called each frame with the player position to switch street/interior lighting. */
  updateOutside(p: Vector3): void {
    const out = p.z < -0.2 && p.y < 1;
    if (out !== this.outside) {
      this.outside = out;
      this.ctx.lighting.usePreset(out ? EXTERIOR : INTERIOR);
      this.updateShadowFit();
    }
    this.ctx.lighting.inside = p.z > 0.5 ? 1 : 0;
  }

  private updateShadowFit(): void {
    const y = floorY(Math.max(0, this.activeFloor));
    if (this.activeFloor === 0 && this.outside) {
      this.ctx.lighting.fitShadowTo(new Vector3(-10, 0, -16), new Vector3(BUILDING.width + 6, 6, 16));
    } else if (this.activeFloor === 0) {
      this.ctx.lighting.fitShadowTo(new Vector3(-1, 0, -10), new Vector3(20, 3.2, 15));
    } else {
      this.ctx.lighting.fitShadowTo(new Vector3(-0.5, y, -0.5), new Vector3(BUILDING.width + 0.5, y + 3.0, BUILDING.depth + 0.5));
    }
  }
}
