import { Vector3 } from "@babylonjs/core";

export type ColliderTag = "wall" | "glass" | "furniture" | "door" | "slab" | "lift";

export interface Collider {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  tag: ColliderTag;
  enabled: boolean;
  /** Blocks the third-person camera (walls, slabs) — low furniture does not. */
  blocksCamera: boolean;
  name?: string;
}

/**
 * Axis-aligned collision world. The office architecture is orthogonal, so AABBs give exact,
 * cheap, and predictable collision for the dev controller. A uniform grid accelerates queries.
 * Colliders double as navigation blockers for the future Recast nav-mesh bake.
 */
export class ColliderWorld {
  readonly list: Collider[] = [];
  private grid = new Map<string, Collider[]>();
  private readonly cell = 4;

  add(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, tag: ColliderTag = "wall", name?: string): Collider {
    const c: Collider = {
      minX: Math.min(minX, maxX), minY: Math.min(minY, maxY), minZ: Math.min(minZ, maxZ),
      maxX: Math.max(minX, maxX), maxY: Math.max(minY, maxY), maxZ: Math.max(minZ, maxZ),
      tag, enabled: true, blocksCamera: tag === "wall" || tag === "slab" || tag === "lift" || tag === "door", name,
    };
    this.list.push(c);
    this.insert(c);
    return c;
  }

  /** Box helper: centre x/z, bottom y. */
  box(cx: number, y: number, cz: number, w: number, h: number, d: number, tag: ColliderTag = "furniture", name?: string): Collider {
    return this.add(cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, tag, name);
  }

  private insert(c: Collider): void {
    for (let gx = Math.floor(c.minX / this.cell); gx <= Math.floor(c.maxX / this.cell); gx++)
      for (let gz = Math.floor(c.minZ / this.cell); gz <= Math.floor(c.maxZ / this.cell); gz++) {
        const k = `${gx},${gz}`;
        let a = this.grid.get(k);
        if (!a) { a = []; this.grid.set(k, a); }
        a.push(c);
      }
  }

  /** Move a collider (used by the lift cabin). Re-inserts into the grid. */
  move(c: Collider, dx: number, dy: number, dz: number): void {
    c.minX += dx; c.maxX += dx; c.minY += dy; c.maxY += dy; c.minZ += dz; c.maxZ += dz;
    if (dx !== 0 || dz !== 0) this.rebuild();
  }

  rebuild(): void {
    this.grid.clear();
    for (const c of this.list) this.insert(c);
  }

  private near(x0: number, z0: number, x1: number, z1: number): Set<Collider> {
    const out = new Set<Collider>();
    for (let gx = Math.floor(Math.min(x0, x1) / this.cell); gx <= Math.floor(Math.max(x0, x1) / this.cell); gx++)
      for (let gz = Math.floor(Math.min(z0, z1) / this.cell); gz <= Math.floor(Math.max(z0, z1) / this.cell); gz++) {
        const a = this.grid.get(`${gx},${gz}`);
        if (a) for (const c of a) out.add(c);
      }
    return out;
  }

  /** Push a vertical capsule (approximated as a circle in XZ) out of all colliders. */
  resolveCircle(pos: Vector3, radius: number, height: number): void {
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const c of this.near(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius)) {
        if (!c.enabled) continue;
        if (pos.y + height <= c.minY || pos.y + 0.25 >= c.maxY) continue; // allow stepping over ≤25cm
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (radius - d);
          pos.z += (dz / d) * (radius - d);
        } else {
          // centre inside the box: exit via the nearest face
          const exits = [pos.x - c.minX, c.maxX - pos.x, pos.z - c.minZ, c.maxZ - pos.z];
          const m = Math.min(...exits);
          if (m === exits[0]) pos.x = c.minX - radius;
          else if (m === exits[1]) pos.x = c.maxX + radius;
          else if (m === exits[2]) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
        moved = true;
      }
      if (!moved) break;
    }
  }

  /** Ray vs camera-blocking colliders. Returns hit distance or Infinity. */
  raycast(o: Vector3, dir: Vector3, maxDist: number, filter: (c: Collider) => boolean = (c) => c.blocksCamera): number {
    let best = maxDist;
    const end = o.add(dir.scale(maxDist));
    for (const c of this.near(o.x, o.z, end.x, end.z)) {
      if (!c.enabled || !filter(c)) continue;
      let t0 = 0, t1 = best;
      const axes: [number, number, number, number][] = [
        [o.x, dir.x, c.minX, c.maxX], [o.y, dir.y, c.minY, c.maxY], [o.z, dir.z, c.minZ, c.maxZ],
      ];
      let hit = true;
      for (const [p, d, mn, mx] of axes) {
        if (Math.abs(d) < 1e-9) { if (p < mn || p > mx) { hit = false; break; } continue; }
        let a = (mn - p) / d, b = (mx - p) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { hit = false; break; }
      }
      if (hit && t0 < best && t0 > 0) best = t0;
    }
    return best;
  }
}
