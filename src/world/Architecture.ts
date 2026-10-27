import type { GeometryBuilder, RGB } from "../assets/GeometryBuilder";
import type { MaterialKey } from "../assets/MaterialRegistry";
import { P } from "../rendering/Palette";
import { BUILDING, Rect } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

export interface Opening { from: number; to: number; bottom?: number; top?: number }

const H = BUILDING.ceilingHeight;

/**
 * Axis-aligned interior wall from (x0,z0) to (x1,z1) at floor elevation y.
 * Openings are measured along the wall from its start coordinate (absolute x or z).
 */
export function wall(
  b: GeometryBuilder, ctx: WorldContext, y: number,
  x0: number, z0: number, x1: number, z1: number,
  o: { t?: number; h?: number; color?: RGB; colorB?: RGB; openings?: Opening[]; skirting?: boolean; collide?: boolean; mat?: MaterialKey } = {},
): void {
  const t = o.t ?? 0.14;
  const h = o.h ?? H;
  const alongX = Math.abs(z1 - z0) < 1e-6;
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const fixed = alongX ? z0 : x0;
  const openings = [...(o.openings ?? [])].sort((p, q) => p.from - q.from);
  const color = o.color ?? P.wallCream;
  const mat = o.mat ?? "wall";

  const seg = (s0: number, s1: number, yb: number, yt: number) => {
    if (s1 - s0 < 1e-3 || yt - yb < 1e-3) return;
    const c = (s0 + s1) / 2, len = s1 - s0;
    if (o.colorB && alongX) {
      // two-tone wall: each face gets its own skin
      b.box(c, y + yb, fixed - t / 4, len, yt - yb, t / 2, { mat, color, r: 0.004 });
      b.box(c, y + yb, fixed + t / 4, len, yt - yb, t / 2, { mat, color: o.colorB, r: 0.004 });
    } else if (o.colorB) {
      b.box(fixed - t / 4, y + yb, c, t / 2, yt - yb, len, { mat, color, r: 0.004 });
      b.box(fixed + t / 4, y + yb, c, t / 2, yt - yb, len, { mat, color: o.colorB, r: 0.004 });
    } else if (alongX) b.box(c, y + yb, fixed, len, yt - yb, t, { mat, color, r: 0.006 });
    else b.box(fixed, y + yb, c, t, yt - yb, len, { mat, color, r: 0.006 });
    if (o.collide !== false && yb < 1.8) {
      if (alongX) ctx.colliders.add(s0, y + yb, fixed - t / 2, s1, y + yt, fixed + t / 2, "wall");
      else ctx.colliders.add(fixed - t / 2, y + yb, s0, fixed + t / 2, y + yt, s1, "wall");
    }
    if (o.skirting !== false && yb < 0.01) {
      const sk = 0.09, st = 0.018;
      for (const side of [-1, 1]) {
        if (alongX) b.box(c, y, fixed + side * (t / 2 + st / 2), len, sk, st, { mat: "wood", color: P.skirting, r: 0.004 });
        else b.box(fixed + side * (t / 2 + st / 2), y, c, st, sk, len, { mat: "wood", color: P.skirting, r: 0.004 });
      }
    }
  };

  let cursor = a0;
  for (const op of openings) {
    seg(cursor, op.from, 0, h);
    const bottom = op.bottom ?? 0;
    const top = op.top ?? 2.2;
    seg(op.from, op.to, 0, bottom);
    seg(op.from, op.to, top, h);
    // door/window reveal trim
    if (bottom < 0.01) {
      const tc = P.trim;
      if (alongX) {
        b.box(op.from + 0.025, y, fixed, 0.05, top, t + 0.04, { mat: "wood", color: tc, r: 0.008 });
        b.box(op.to - 0.025, y, fixed, 0.05, top, t + 0.04, { mat: "wood", color: tc, r: 0.008 });
        b.box((op.from + op.to) / 2, y + top - 0.05, fixed, op.to - op.from, 0.05, t + 0.04, { mat: "wood", color: tc, r: 0.008 });
      } else {
        b.box(fixed, y, op.from + 0.025, t + 0.04, top, 0.05, { mat: "wood", color: tc, r: 0.008 });
        b.box(fixed, y, op.to - 0.025, t + 0.04, top, 0.05, { mat: "wood", color: tc, r: 0.008 });
        b.box(fixed, y + top - 0.05, (op.from + op.to) / 2, t + 0.04, 0.05, op.to - op.from, { mat: "wood", color: tc, r: 0.008 });
      }
    }
    cursor = op.to;
  }
  seg(cursor, a1, 0, h);
}

/**
 * Aluminium-framed glass partition (meeting rooms, HR cabin). Openings become door gaps.
 * A frosted manifestation band keeps glass readable and adds the classic office detail.
 */
export function glassWall(
  b: GeometryBuilder, ctx: WorldContext, y: number,
  x0: number, z0: number, x1: number, z1: number,
  o: { openings?: Opening[]; frost?: boolean; mullion?: number; h?: number } = {},
): void {
  const h = o.h ?? H;
  const alongX = Math.abs(z1 - z0) < 1e-6;
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const fixed = alongX ? z0 : x0;
  const frame = P.darkMetal;
  const ft = 0.06;
  const box = (s: number, yb: number, len: number, hh: number, depth: number, mat: MaterialKey, color: string, r = 0.006) => {
    if (alongX) b.box(s, y + yb, fixed, len, hh, depth, { mat, color, r });
    else b.box(fixed, y + yb, s, depth, hh, len, { mat, color, r });
  };
  const frostUV = ctx.atlas.frostBand();
  const runs: [number, number][] = [];
  let c = a0;
  for (const op of [...(o.openings ?? [])].sort((p, q) => p.from - q.from)) { runs.push([c, op.from]); c = op.to; }
  runs.push([c, a1]);

  for (const [s0, s1] of runs) {
    if (s1 - s0 < 0.05) continue;
    const len = s1 - s0, mid = (s0 + s1) / 2;
    box(mid, 0, len, 0.08, ft, "metal", frame);                 // floor channel
    box(mid, h - 0.07, len, 0.07, ft, "metal", frame);          // head channel
    box(s0 + 0.02, 0, 0.04, h, ft, "metal", frame);
    box(s1 - 0.02, 0, 0.04, h, ft, "metal", frame);
    const n = Math.max(1, Math.round(len / (o.mullion ?? 1.5)));
    for (let k = 1; k < n; k++) box(s0 + (len * k) / n, 0, 0.035, h, ft * 0.8, "metal", frame);
    // glass pane
    if (alongX) b.box(mid, y + 0.08, fixed, len - 0.04, h - 0.15, 0.012, { mat: "glass", color: "#ffffff", r: 0 });
    else b.box(fixed, y + 0.08, mid, 0.012, h - 0.15, len - 0.04, { mat: "glass", color: "#ffffff", r: 0 });
    if (o.frost !== false) {
      for (const side of [-1, 1]) {
        if (alongX) b.at(mid, y + 1.35, fixed + side * 0.009, side > 0 ? Math.PI : 0, () => b.quad(0, 0, 0, len - 0.06, 0.16, { mat: "print", color: "#f4f6f8", uv: frostUV }));
        else b.at(fixed + side * 0.009, y + 1.35, mid, side > 0 ? -Math.PI / 2 : Math.PI / 2, () => b.quad(0, 0, 0, len - 0.06, 0.16, { mat: "print", color: "#f4f6f8", uv: frostUV }));
      }
    }
    if (alongX) ctx.colliders.add(s0, y, fixed - 0.06, s1, y + h, fixed + 0.06, "glass");
    else ctx.colliders.add(fixed - 0.06, y, s0, fixed + 0.06, y + h, s1, "glass");
  }
  // door heads over openings
  for (const op of o.openings ?? []) {
    const len = op.to - op.from, mid = (op.from + op.to) / 2;
    box(mid, 2.2, len, h - 2.2, ft, "metal", frame);
    box(mid, 2.25, len - 0.04, h - 2.32, 0.012, "glass", "#ffffff", 0);
  }
}

/** Floor finish as a thin slab whose top sits exactly at y. */
export function floorPlate(b: GeometryBuilder, y: number, r: Rect, mat: MaterialKey, color: RGB, inset = 0): void {
  b.box((r.x0 + r.x1) / 2, y - 0.05, (r.z0 + r.z1) / 2, r.x1 - r.x0 - inset * 2, 0.05, r.z1 - r.z0 - inset * 2, { mat, color, r: 0 });
}

/** Suspended ceiling with recessed 600×600 LED panels on a grid. */
export function ceiling(b: GeometryBuilder, ctx: WorldContext, y: number, r: Rect, o: { lights?: boolean; spacingX?: number; spacingZ?: number; color?: RGB; height?: number } = {}): void {
  const h = o.height ?? H;
  // extends 6cm into the surrounding walls so its edge faces never lie in a wall plane
  b.box((r.x0 + r.x1) / 2, y + h, (r.z0 + r.z1) / 2, r.x1 - r.x0 + 0.12, 0.04, r.z1 - r.z0 + 0.12, { mat: "ceiling", color: o.color ?? P.ceiling, r: 0 });
  if (o.lights !== false) {
    const sx = o.spacingX ?? 2.4, sz = o.spacingZ ?? 2.4;
    const nx = Math.max(1, Math.floor((r.x1 - r.x0) / sx)), nz = Math.max(1, Math.floor((r.z1 - r.z0) / sz));
    const ox = r.x0 + ((r.x1 - r.x0) - (nx - 1) * sx) / 2, oz = r.z0 + ((r.z1 - r.z0) - (nz - 1) * sz) / 2;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = ox + i * sx, z = oz + k * sz;
      b.box(x, y + h - 0.025, z, 0.64, 0.025, 0.64, { mat: "ceiling", color: "#e9e6e0", r: 0.004 });
      b.box(x, y + h - 0.03, z, 0.58, 0.01, 0.58, { mat: "light", color: "#fff6e4", r: 0 });
    }
  }
  ctx.colliders.add(r.x0, y + h - 0.02, r.z0, r.x1, y + 4, r.z1, "slab");
}

/** Rectangular structural column with a slight rounded profile. */
export function column(b: GeometryBuilder, ctx: WorldContext, y: number, x: number, z: number, size = 0.5, color: RGB = P.column): void {
  b.box(x, y, z, size, H, size, { mat: "wall", color, r: 0.04, seg: 2 });
  b.box(x, y, z, size + 0.03, 0.1, size + 0.03, { mat: "wood", color: P.skirting, r: 0.01 });
  ctx.colliders.box(x, y, z, size, H, size, "wall");
}

/** Window unit set into an exterior wall opening: frame, mullions, glass, optional blinds. */
export function windowUnit(b: GeometryBuilder, y: number, alongX: boolean, s0: number, s1: number, fixed: number, sill: number, head: number, o: { blinds?: number; inwardSign?: number; glass?: MaterialKey } = {}): void {
  const len = s1 - s0, mid = (s0 + s1) / 2, hh = head - sill;
  const inward = o.inwardSign ?? 1;
  const f = (s: number, yb: number, l: number, h: number, d: number, off = 0, mat: MaterialKey = "metal", color: string = P.darkMetal) => {
    if (alongX) b.box(s, y + yb, fixed + off, l, h, d, { mat, color, r: 0.006 });
    else b.box(fixed + off, y + yb, s, d, h, l, { mat, color, r: 0.006 });
  };
  f(mid, sill + 0.001, len, 0.05, 0.12);
  f(mid, head - 0.051, len, 0.05, 0.12);
  // window board (sill) on the inside — proud of the wall so faces never coincide
  f(mid, sill - 0.025, len + 0.04, 0.045, 0.27, inward * 0.13, "wood", "#e6dccb");
  const n = Math.max(1, Math.round(len / 1.4));
  for (let k = 0; k <= n; k++) f(s0 + (len * k) / n, sill + 0.05, 0.05, hh - 0.1, 0.1);
  const gm = o.glass ?? "glassExterior";
  if (alongX) b.box(mid, y + sill, fixed, len, hh, 0.012, { mat: gm, color: "#ffffff", r: 0 });
  else b.box(fixed, y + sill, mid, 0.012, hh, len, { mat: gm, color: "#ffffff", r: 0 });
  // roller blinds, partially lowered at varying heights for a lived-in look
  if (o.blinds !== undefined && o.blinds > 0) {
    const drop = hh * o.blinds;
    f(mid, head - 0.1, len - 0.1, 0.1, 0.1, inward * 0.1, "plastic", "#efebe4");
    f(mid, head - 0.1 - drop, len - 0.14, drop, 0.012, inward * 0.11, "fabric", "#e7e0d4");
    f(mid, head - 0.12 - drop, len - 0.12, 0.025, 0.03, inward * 0.11, "metal", "#cfcac2");
  }
}
