import { Vector3 } from "@babylonjs/core";
import type { GeometryBuilder } from "../assets/GeometryBuilder";
import { DeskPersona, deskSetup, rot } from "../assets/prefabs/DeskSetup";
import { officeChair, storageCabinet } from "../assets/prefabs/Furniture";
import { deskPlant, floorPlant } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { P } from "../rendering/Palette";
import type { WorldContext } from "../world/WorldContext";

export interface SectionArgs { b: GeometryBuilder; ctx: WorldContext; y: number; floor: number }

/**
 * A back-to-back bench: `south` personas sit on the −Z side facing +Z, `north` personas on the
 * +Z side facing −Z. Desks share a centre partition line at z = zc.
 */
export function bench(a: SectionArgs, zone: string, x0: number, zc: number, south: DeskPersona[], north: DeskPersona[]): void {
  const { b, ctx, y, floor } = a;
  const place = (row: DeskPersona[], side: -1 | 1) => {
    let x = x0;
    row.forEach((p, i) => {
      const w = p.width ?? (p.hero ? 1.6 : 1.2);
      const cxw = x + w / 2;
      const z = zc + side * 0.315;
      deskSetup(b, ctx, p, cxw, y, z, side < 0 ? 0 : Math.PI, floor, zone, { legLeft: i === 0 || side > 0, legRight: true });
      x += w;
    });
    return x;
  };
  const e1 = place(south, -1);
  const e2 = place(north, 1);
  // bench end caps: low planter boxes
  const end = Math.max(e1, e2);
  for (const ex of [x0 - 0.22, end + 0.22]) {
    bx(b, "wood", "#e8e2d8", ex, y, zc, 0.4, 0.72, 1.3, { r: 0.02 });
    bx(b, "wood", P.deskOak, ex, y + 0.72, zc, 0.42, 0.03, 1.32, { r: 0.008 });
    for (let k = -1; k <= 1; k++) b.at(ex, y + 0.75, zc + k * 0.4, k, () => deskPlant(b, () => 0.37 + k * 0.2, "#efe8dc"));
    ctx.colliders.box(ex, y, zc, 0.42, 0.9, 1.32);
  }
}

/** Double-sided department sign hanging from the ceiling on two steel wires. */
export function hangingSign(a: SectionArgs, x: number, z: number, yaw: number, label: string, icon: string, accent: string, h = 2.42): void {
  const { b, ctx, y } = a;
  const uv = ctx.atlas.sign(label, icon, accent);
  b.at(x, y + h, z, yaw, () => {
    b.measure("hangingSign", () => {
      bx(b, "plastic", P.brandNavy, 0, -0.2, 0, 1.44, 0.41, 0.04, { r: 0.03 });
      b.quad(0, 0, -0.021, 1.4, 0.394, { mat: "print", color: "#ffffff", uv });
      b.at(0, 0, 0.021, Math.PI, () => b.quad(0, 0, 0, 1.4, 0.394, { mat: "print", color: "#ffffff", uv }));
      for (const s of [-0.55, 0.55]) b.cyl(s, 0.2, 0, 0.003, 0.003, 3.0 - h - 0.2 + 0.02, 4, { mat: "metal", color: "#6b707c" });
    });
  });
}

/** Run of low storage cabinets (soft department boundary) along Z at x. */
export function dividerZ(a: SectionArgs, x: number, z0: number, z1: number, rnd: () => number, accent?: string): void {
  const { b, ctx, y } = a;
  const len = z1 - z0;
  b.at(x, y, (z0 + z1) / 2, Math.PI / 2, () => storageCabinet(b, len, "#ebe6dd", P.deskOak));
  ctx.colliders.add(x - 0.24, y, z0, x + 0.24, y + 0.8, z1, "furniture");
  // planter trough + accent strip on top
  for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.7) b.at(x, y + 0.8, z, rnd() * 6, () => deskPlant(b, rnd, "#efe8dc"));
  if (accent) for (const s of [-1, 1]) bx(b, "decor", accent, x + s * 0.235, y + 0.7, (z0 + z1) / 2, 0.012, 0.05, len - 0.04, { r: 0 });
}

export function dividerX(a: SectionArgs, z: number, x0: number, x1: number, rnd: () => number): void {
  const { b, ctx, y } = a;
  b.at((x0 + x1) / 2, y, z, 0, () => storageCabinet(b, x1 - x0, "#ebe6dd", P.deskOak));
  ctx.colliders.add(x0, y, z - 0.24, x1, y + 0.8, z + 0.24, "furniture");
  for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.7) b.at(x, y + 0.8, z, rnd() * 6, () => deskPlant(b, rnd, "#efe8dc"));
}

export function bigPlant(a: SectionArgs, x: number, z: number, rnd: () => number, kind: "bush" | "snake" | "tree" | "palm" = "tree", pot = "#e9e1d3"): void {
  a.b.at(x, a.y, z, rnd() * 6, () => floorPlant(a.b, rnd, { kind, pot, scale: 1.1 }));
  a.ctx.colliders.box(x, a.y, z, 0.5, 1.4, 0.5);
}

/** Ring of meeting chairs around a table; registers seat anchors. */
export function seatsAround(a: SectionArgs, zone: string, cx: number, cz: number, positions: [number, number, number][], style: "meeting" | "exec" | "visitor" | "task", color: string): void {
  const { b, ctx, y, floor } = a;
  positions.forEach(([lx, lz, yaw], i) => {
    const jitter = ((i * 37) % 7) / 7 - 0.5;
    b.at(cx + lx, y, cz + lz, yaw + jitter * 0.18, () => officeChair(b, style, color, P.chairBlack));
    ctx.anchors.add(`${zone}.seat.${i}`, "seat", new Vector3(cx + lx, y, cz + lz), yaw, floor, zone);
    ctx.colliders.box(cx + lx, y, cz + lz, 0.46, 1.0, 0.46);
  });
}

/** Chairs evenly spaced along both long sides and the ends of a rectangular table. */
export function tableSeats(w: number, d: number, perSide: number, ends: boolean, gap = 0.55): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < perSide; i++) {
    const x = -w / 2 + (w / perSide) * (i + 0.5);
    out.push([x, -d / 2 - gap, 0]);
    out.push([x, d / 2 + gap, Math.PI]);
  }
  if (ends) { out.push([-w / 2 - gap, 0, Math.PI / 2]); out.push([w / 2 + gap, 0, -Math.PI / 2]); }
  return out;
}

export function circleSeats(n: number, r: number, a0 = 0): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    const [x, z] = [Math.sin(a) * r, Math.cos(a) * r];
    out.push([x, z, a + Math.PI]);
  }
  return out;
}

export { rot };
