import type { BoxOpts, GeometryBuilder, RGB } from "../GeometryBuilder";
import type { MaterialKey } from "../MaterialRegistry";

/** Rounded-rectangle outline in the XZ plane (as XY for extrusion), radius r, n segments per corner. */
export function roundedRectOutline(w: number, d: number, r: number, n = 6): [number, number][] {
  const pts: [number, number][] = [];
  const hw = w / 2 - r, hd = d / 2 - r;
  const corners: [number, number, number][] = [[hw, hd, 0], [-hw, hd, Math.PI / 2], [-hw, -hd, Math.PI], [hw, -hd, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Stadium / racetrack outline (fully rounded short ends). */
export function stadiumOutline(w: number, d: number, n = 10): [number, number][] {
  const r = d / 2, hw = w / 2 - r;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; pts.push([hw + Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; pts.push([-hw + Math.cos(a) * r, Math.sin(a) * r]); }
  return pts;
}

export function circleOutline(r: number, n = 24): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return pts;
}

/** Horizontal slab from a 2D outline (x, z) with bottom at y and thickness t. */
export function slab(b: GeometryBuilder, outline: [number, number][], x: number, y: number, z: number, t: number, o: { mat?: MaterialKey; color?: RGB } = {}): void {
  // local (px, py, pz) -> world (px, pz, -py) via RotationX(-PI/2)
  b.at(x, 0, z, 0, () => b.extrude(outline.map(([px, pz]) => [px, -pz]), y, t, o), -Math.PI / 2);
}

/** Box helper with explicit material + colour (keeps prefab code short). */
export function bx(b: GeometryBuilder, mat: MaterialKey, color: RGB, x: number, y: number, z: number, w: number, h: number, d: number, extra: Omit<BoxOpts, "mat" | "color"> = {}): void {
  b.box(x, y, z, w, h, d, { mat, color, ...extra });
}

export function pick<T>(arr: readonly T[], r: () => number): T { return arr[Math.floor(r() * arr.length) % arr.length]; }
