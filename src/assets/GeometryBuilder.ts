import { Color3, Matrix, Mesh, Node, Scene, Vector3, VertexData } from "@babylonjs/core";
import type { MaterialKey } from "./MaterialRegistry";

/**
 * Code-driven modelling kit.
 *
 * Prefabs are authored as functions that append transformed primitives into per-material
 * vertex batches. A whole room becomes one mesh per material family (static mesh merging),
 * with colour variation carried in vertex colours. Primitives are bevelled / smoothed by
 * default because crisp 90° boxes are what make environments look like "programmer art".
 */

export type RGB = Color3 | string;
export interface UVRect { u0: number; v0: number; u1: number; v1: number }

export interface BuildContext {
  scene: Scene;
  registerMesh(mesh: Mesh, key: MaterialKey, opts: { static: boolean; detail: boolean }): void;
  stats: AssetStats;
}

interface Batch { p: number[]; n: number[]; c: number[]; uv: number[]; i: number[]; bi: number[]; bw: number[] }

/** Skin weight function: character-space position → [bone0, weight0, bone1, weight1]. */
export type SkinFn = (x: number, y: number, z: number) => [number, number, number, number];

export interface LoftRing { c: Vector3; rx: number; rz: number; color?: RGB }

export interface BoxOpts { r?: number; seg?: number; mat?: MaterialKey; color?: RGB; ao?: number; uv?: UVRect; aoBottom?: number }

const toColor = (c: RGB): Color3 => (typeof c === "string" ? Color3.FromHexString(c) : c);
const tmpV = new Vector3();
const tmpN = new Vector3();

export class AssetStats {
  readonly prefabs = new Map<string, { tris: number; count: number; materials: Set<string> }>();
  record(name: string, tris: number, mats: Iterable<string>) {
    const e = this.prefabs.get(name) ?? { tris, count: 0, materials: new Set<string>() };
    e.tris = Math.max(e.tris, tris);
    e.count++;
    for (const m of mats) e.materials.add(m);
    this.prefabs.set(name, e);
  }
}

export class GeometryBuilder {
  private readonly batches = new Map<string, Batch>();
  private readonly stack: Matrix[] = [Matrix.Identity()];
  mat: MaterialKey = "plastic";
  col: Color3 = new Color3(1, 1, 1);
  ao = 1;
  detail = false;
  /** When set, every emitted vertex receives bone indices/weights (skinned characters). */
  skin: SkinFn | null = null;
  private triCount = 0;
  private measuring: { name: string; start: number; mats: Set<string> }[] = [];

  get tris(): number { return this.triCount; }
  private get m(): Matrix { return this.stack[this.stack.length - 1]; }

  // ---------------------------------------------------------------- state & transforms
  material(key: MaterialKey, color?: RGB): this {
    this.mat = key;
    if (color) this.col = toColor(color);
    return this;
  }
  color(c: RGB): this { this.col = toColor(c); return this; }

  /** Run fn in a local frame: rotate (Y, then X, then Z) and translate relative to the current frame. */
  at(x: number, y: number, z: number, ry: number, fn: () => void, rx = 0, rz = 0, s = 1): void {
    const local = Matrix.Scaling(s, s, s)
      .multiply(Matrix.RotationZ(rz))
      .multiply(Matrix.RotationX(rx))
      .multiply(Matrix.RotationY(ry))
      .multiply(Matrix.Translation(x, y, z));
    this.stack.push(local.multiply(this.m));
    const prevMat = this.mat, prevCol = this.col, prevDetail = this.detail, prevAo = this.ao;
    try { fn(); } finally {
      this.stack.pop();
      this.mat = prevMat; this.col = prevCol; this.detail = prevDetail; this.ao = prevAo;
    }
  }

  /** Mark geometry as fine detail (hidden beyond the LOD distance). */
  details(fn: () => void): void {
    const prev = this.detail;
    this.detail = true;
    try { fn(); } finally { this.detail = prev; }
  }

  /** Record triangle cost of a prefab for the asset manifest. */
  measure<T>(name: string, fn: () => T): T {
    const rec = { name, start: this.triCount, mats: new Set<string>() };
    this.measuring.push(rec);
    try { return fn(); } finally {
      this.measuring.pop();
      this.pendingStats.push({ name, tris: this.triCount - rec.start, mats: rec.mats });
    }
  }
  private pendingStats: { name: string; tris: number; mats: Set<string> }[] = [];

  // ---------------------------------------------------------------- low level emit
  private batch(key: MaterialKey): Batch {
    const k = `${key}|${this.detail ? 1 : 0}`;
    let b = this.batches.get(k);
    if (!b) { b = { p: [], n: [], c: [], uv: [], i: [], bi: [], bw: [] }; this.batches.set(k, b); }
    for (const r of this.measuring) r.mats.add(key);
    return b;
  }

  /**
   * Emit local-space geometry. Triangles are re-oriented so their winding agrees with the
   * supplied vertex normals, which makes every primitive immune to winding mistakes.
   */
  emit(pos: number[], nrm: number[], idx: number[], opts: { mat?: MaterialKey; color?: RGB; ao?: number; uv?: number[]; colors?: number[] } = {}): void {
    const key = opts.mat ?? this.mat;
    const b = this.batch(key);
    const base = b.p.length / 3;
    const m = this.m;
    const nm = m.clone().invert().transpose();
    const col = opts.color ? toColor(opts.color) : this.col;
    const ao = opts.ao ?? this.ao;
    const vcount = pos.length / 3;
    for (let v = 0; v < vcount; v++) {
      Vector3.TransformCoordinatesFromFloatsToRef(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], m, tmpV);
      Vector3.TransformNormalFromFloatsToRef(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2], nm, tmpN);
      tmpN.normalize();
      b.p.push(tmpV.x, tmpV.y, tmpV.z);
      b.n.push(tmpN.x, tmpN.y, tmpN.z);
      if (opts.colors) b.c.push(opts.colors[v * 4], opts.colors[v * 4 + 1], opts.colors[v * 4 + 2], opts.colors[v * 4 + 3]);
      else b.c.push(col.r, col.g, col.b, ao);
      if (opts.uv) b.uv.push(opts.uv[v * 2], opts.uv[v * 2 + 1]);
      else b.uv.push(0, 0);
      if (this.skin) {
        const [i0, w0, i1, w1] = this.skin(tmpV.x, tmpV.y, tmpV.z);
        b.bi.push(i0, i1, 0, 0);
        b.bw.push(w0, w1, 0, 0);
      }
    }
    for (let t = 0; t < idx.length; t += 3) {
      const ia = idx[t], ib = idx[t + 1], ic = idx[t + 2];
      const A = base + ia, B = base + ib, C = base + ic;
      const p = b.p, n = b.n;
      const e1x = p[B * 3] - p[A * 3], e1y = p[B * 3 + 1] - p[A * 3 + 1], e1z = p[B * 3 + 2] - p[A * 3 + 2];
      const e2x = p[C * 3] - p[A * 3], e2y = p[C * 3 + 1] - p[A * 3 + 1], e2z = p[C * 3 + 2] - p[A * 3 + 2];
      const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
      const nx = n[A * 3] + n[B * 3] + n[C * 3], ny = n[A * 3 + 1] + n[B * 3 + 1] + n[C * 3 + 1], nz = n[A * 3 + 2] + n[B * 3 + 2] + n[C * 3 + 2];
      // Babylon front faces satisfy cross(b-a, c-a) · n < 0
      if (cx * nx + cy * ny + cz * nz > 0) b.i.push(A, C, B);
      else b.i.push(A, B, C);
    }
    this.triCount += idx.length / 3;
  }

  // ---------------------------------------------------------------- primitives

  /** Box with x/z centred and y at the bottom. r = bevel radius (rounded with seg segments). */
  box(x: number, y: number, z: number, w: number, h: number, d: number, o: BoxOpts = {}): void {
    // bevels on objects under ~5cm are sub-pixel at gameplay distance: skip them (12 vs 108 tris)
    const tiny = Math.max(w, h, d) < 0.05;
    const r = tiny ? 0 : Math.min(o.r ?? Math.min(0.012, w * 0.25, h * 0.25, d * 0.25), w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const seg = o.seg ?? 1;
    const g = r > 1e-4 ? roundedBoxGeo(w, h, d, r, seg) : flatBoxGeo(w, h, d);
    let colors: number[] | undefined;
    if (o.aoBottom !== undefined) {
      const col = o.color ? toColor(o.color) : this.col;
      colors = [];
      for (let v = 0; v < g.p.length / 3; v++) {
        const t = (g.p[v * 3 + 1] + h / 2) / h;
        colors.push(col.r, col.g, col.b, o.aoBottom + (1 - o.aoBottom) * Math.min(1, t * 1.6));
      }
    }
    let uv: number[] | undefined;
    if (o.uv) uv = boxUV(g.p, w, h, o.uv);
    const pos = g.p.map((v, i) => (i % 3 === 0 ? v + x : i % 3 === 1 ? v + y + h / 2 : v + z));
    this.emit(pos, g.n, g.i, { mat: o.mat, color: o.color, ao: o.ao, colors, uv });
  }

  /** Vertical cylinder / cone frustum with bottom at y. */
  cyl(x: number, y: number, z: number, rBottom: number, rTop: number, h: number, sides = 16, o: { mat?: MaterialKey; color?: RGB; caps?: boolean; bevel?: number; ao?: number } = {}): void {
    const bev = o.bevel ?? Math.min(0.006, h * 0.2, rTop * 0.3, rBottom * 0.3);
    const prof: [number, number][] = [];
    if (o.caps !== false) prof.push([0, 0]);
    if (bev > 1e-4) {
      prof.push([rBottom - bev, 0], [rBottom, bev], [rTop, h - bev], [rTop - bev, h]);
    } else {
      prof.push([rBottom, 0], [rTop, h]);
    }
    if (o.caps !== false) prof.push([0, h]);
    this.lathe(x, y, z, prof, sides, { mat: o.mat, color: o.color, ao: o.ao, hard: true });
  }

  /**
   * Surface of revolution around Y. profile = [radius, height][]. With hard=true, corners in
   * the profile keep split normals (good for machined objects); otherwise normals are smooth.
   */
  lathe(x: number, y: number, z: number, profile: [number, number][], sides = 20, o: { mat?: MaterialKey; color?: RGB; ao?: number; hard?: boolean; arc?: number } = {}): void {
    const arc = o.arc ?? Math.PI * 2;
    const full = Math.abs(arc - Math.PI * 2) < 1e-6;
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    // build segments between successive profile points; each segment gets its own ring pair when hard
    const segs: { a: [number, number]; b: [number, number]; na: [number, number]; nb: [number, number] }[] = [];
    const segNormal = (a: [number, number], b: [number, number]): [number, number] => {
      const dr = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dr, dy) || 1;
      return [dy / l, -dr / l];
    };
    for (let i = 0; i < profile.length - 1; i++) {
      const a = profile[i], b = profile[i + 1];
      const n = segNormal(a, b);
      let na = n, nb = n;
      if (!o.hard) {
        const prev = i > 0 ? segNormal(profile[i - 1], a) : n;
        const next = i < profile.length - 2 ? segNormal(b, profile[i + 2]) : n;
        na = norm2([n[0] + prev[0], n[1] + prev[1]]);
        nb = norm2([n[0] + next[0], n[1] + next[1]]);
      }
      segs.push({ a, b, na, nb });
    }
    // orientation: our segNormal assumes profile goes outward-up; make it point away from axis on average
    let sum = 0;
    for (const s of segs) sum += s.na[0] * (s.a[0] + s.b[0]);
    const flip = sum < 0 ? -1 : 1;
    const ring = full ? sides : sides + 1;
    for (const s of segs) {
      const start = pos.length / 3;
      for (const [pt, nn] of [[s.a, s.na], [s.b, s.nb]] as const) {
        for (let k = 0; k < ring; k++) {
          const ang = (k / sides) * arc;
          const c = Math.cos(ang), sn = Math.sin(ang);
          pos.push(x + pt[0] * c, y + pt[1], z + pt[0] * sn);
          nrm.push(nn[0] * c * flip, nn[1] * flip, nn[0] * sn * flip);
        }
      }
      for (let k = 0; k < sides; k++) {
        const k2 = full ? (k + 1) % sides : k + 1;
        const a0 = start + k, a1 = start + k2, b0 = start + ring + k, b1 = start + ring + k2;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    this.emit(pos, nrm, idx, { mat: o.mat, color: o.color, ao: o.ao });
  }

  /** Ellipsoid centred at x,y,z. */
  sphere(x: number, y: number, z: number, rx: number, ry: number, rz: number, seg = 12, o: { mat?: MaterialKey; color?: RGB; ao?: number; hemi?: boolean } = {}): void {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    const rings = seg, sides = seg * 2;
    const maxT = o.hemi ? Math.PI / 2 : Math.PI;
    for (let i = 0; i <= rings; i++) {
      const t = (i / rings) * maxT;
      for (let j = 0; j <= sides; j++) {
        const p = (j / sides) * Math.PI * 2;
        const nx = Math.sin(t) * Math.cos(p), ny = Math.cos(t), nz = Math.sin(t) * Math.sin(p);
        pos.push(x + nx * rx, y + ny * ry, z + nz * rz);
        const n = new Vector3(nx / rx, ny / ry, nz / rz).normalize();
        nrm.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      if (i > 0) idx.push(a, b, a + 1);
      if (i < rings - 1 || o.hemi) idx.push(a + 1, b, b + 1);
    }
    this.emit(pos, nrm, idx, { mat: o.mat, color: o.color, ao: o.ao });
  }

  /** Tube along a polyline (cables, handles, chair frames). */
  tube(points: Vector3[], radius: number, sides = 8, o: { mat?: MaterialKey; color?: RGB; ao?: number; caps?: boolean } = {}): void {
    if (points.length < 2) return;
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    let prevN: Vector3 | null = null;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const tan = (i === 0 ? points[1].subtract(points[0]) : i === points.length - 1 ? p.subtract(points[i - 1]) : points[i + 1].subtract(points[i - 1])).normalize();
      let n: Vector3;
      if (!prevN) {
        const up = Math.abs(tan.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
        n = Vector3.Cross(tan, up).normalize();
      } else {
        // parallel transport
        n = prevN.subtract(tan.scale(Vector3.Dot(prevN, tan))).normalize();
      }
      prevN = n;
      const bn = Vector3.Cross(tan, n).normalize();
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const dir = n.scale(Math.cos(a)).add(bn.scale(Math.sin(a)));
        pos.push(p.x + dir.x * radius, p.y + dir.y * radius, p.z + dir.z * radius);
        nrm.push(dir.x, dir.y, dir.z);
      }
    }
    for (let i = 0; i < points.length - 1; i++) for (let k = 0; k < sides; k++) {
      const a = i * (sides + 1) + k, b = a + sides + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    this.emit(pos, nrm, idx, { mat: o.mat, color: o.color, ao: o.ao });
    if (o.caps !== false) {
      this.sphere(points[0].x, points[0].y, points[0].z, radius, radius, radius, 4, o);
      const l = points[points.length - 1];
      this.sphere(l.x, l.y, l.z, radius, radius, radius, 4, o);
    }
  }

  /**
   * Loft: smooth tube through elliptical rings (organic shapes — torsos, limbs, heads, hair locks).
   * rx spans the ring's side axis, rz its front axis (front ≈ `front` projected off the path).
   * Ends are closed with a pole vertex; shrink the last rings for rounded caps.
   */
  loft(rings: LoftRing[], sides = 12, o: { mat?: MaterialKey; color?: RGB; front?: Vector3; caps?: boolean; ao?: number } = {}): void {
    const n = rings.length;
    if (n < 2) return;
    const frontRef = o.front ?? new Vector3(0, 0, 1);
    const pos: number[] = [], cols: number[] = [], idx: number[] = [], radial: Vector3[] = [];
    const base = o.color ? toColor(o.color) : this.col;
    const ao = o.ao ?? this.ao;
    let prevFront: Vector3 | null = null;
    for (let i = 0; i < n; i++) {
      const a = rings[Math.max(0, i - 1)].c, b2 = rings[Math.min(n - 1, i + 1)].c;
      const t = b2.subtract(a).normalize();
      let f = frontRef.subtract(t.scale(Vector3.Dot(frontRef, t)));
      if (f.lengthSquared() < 1e-6) f = prevFront ?? new Vector3(1, 0, 0);
      f.normalize();
      prevFront = f;
      const side = Vector3.Cross(t, f).normalize();
      const r = rings[i];
      const col = r.color ? toColor(r.color) : base;
      for (let k = 0; k < sides; k++) {
        const th = (k / sides) * Math.PI * 2;
        const ct = Math.cos(th), st = Math.sin(th);
        pos.push(r.c.x + side.x * ct * r.rx + f.x * st * r.rz, r.c.y + side.y * ct * r.rx + f.y * st * r.rz, r.c.z + side.z * ct * r.rx + f.z * st * r.rz);
        radial.push(side.scale(ct / Math.max(r.rx, 1e-4)).add(f.scale(st / Math.max(r.rz, 1e-4))));
        cols.push(col.r, col.g, col.b, ao);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides;
      const a0 = i * sides + k, a1 = i * sides + k2, b0 = (i + 1) * sides + k, b1 = (i + 1) * sides + k2;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
    const caps = o.caps !== false;
    if (caps) {
      for (const [ri, dir] of [[0, -1], [n - 1, 1]] as const) {
        const r = rings[ri];
        const other = rings[ri === 0 ? 1 : n - 2].c;
        const t = r.c.subtract(other).normalize();
        const ci = pos.length / 3;
        pos.push(r.c.x, r.c.y, r.c.z);
        radial.push(t);
        const col = r.color ? toColor(r.color) : base;
        cols.push(col.r, col.g, col.b, ao);
        for (let k = 0; k < sides; k++) idx.push(ci, ri * sides + k, ri * sides + ((k + 1) % sides));
        void dir;
      }
    }
    // smooth normals from faces, oriented outward using the analytic radial direction
    const nrm = new Array(pos.length).fill(0);
    for (let t = 0; t < idx.length; t += 3) {
      const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3;
      const e1x = pos[ib] - pos[ia], e1y = pos[ib + 1] - pos[ia + 1], e1z = pos[ib + 2] - pos[ia + 2];
      const e2x = pos[ic] - pos[ia], e2y = pos[ic + 1] - pos[ia + 1], e2z = pos[ic + 2] - pos[ia + 2];
      const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
      for (const v of [ia, ib, ic]) { nrm[v] += cx; nrm[v + 1] += cy; nrm[v + 2] += cz; }
    }
    for (let v = 0; v < pos.length / 3; v++) {
      let x = nrm[v * 3], y = nrm[v * 3 + 1], z = nrm[v * 3 + 2];
      const rd = radial[v];
      if (x * rd.x + y * rd.y + z * rd.z < 0) { x = -x; y = -y; z = -z; }
      const l = Math.hypot(x, y, z) || 1;
      nrm[v * 3] = x / l; nrm[v * 3 + 1] = y / l; nrm[v * 3 + 2] = z / l;
    }
    this.emit(pos, nrm, idx, { mat: o.mat, colors: cols });
  }

  /** Flat quad in the local XY plane, centred at x,y,z and facing -Z (towards a viewer standing at -Z). */
  quad(x: number, y: number, z: number, w: number, h: number, o: { mat?: MaterialKey; color?: RGB; uv?: UVRect; ao?: number; facing?: "-z" | "+z" | "+y" | "-y" | "+x" | "-x" } = {}): void {
    const hw = w / 2, hh = h / 2;
    const uv = o.uv ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
    const facing = o.facing ?? "-z";
    let pos: number[], n: [number, number, number];
    let uvs = [uv.u0, uv.v0, uv.u1, uv.v0, uv.u1, uv.v1, uv.u0, uv.v1];
    switch (facing) {
      case "-z": pos = [-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0]; n = [0, 0, -1]; break;
      case "+z": pos = [hw, -hh, 0, -hw, -hh, 0, -hw, hh, 0, hw, hh, 0]; n = [0, 0, 1]; break;
      case "+x": pos = [0, -hh, -hw, 0, -hh, hw, 0, hh, hw, 0, hh, -hw]; n = [1, 0, 0]; break;
      case "-x": pos = [0, -hh, hw, 0, -hh, -hw, 0, hh, -hw, 0, hh, hw]; n = [-1, 0, 0]; break;
      case "+y": pos = [-hw, 0, hh, hw, 0, hh, hw, 0, -hh, -hw, 0, -hh]; n = [0, 1, 0]; break;
      default: pos = [-hw, 0, -hh, hw, 0, -hh, hw, 0, hh, -hw, 0, hh]; n = [0, -1, 0]; uvs = [uv.u0, uv.v0, uv.u1, uv.v0, uv.u1, uv.v1, uv.u0, uv.v1];
    }
    for (let i = 0; i < 12; i += 3) { pos[i] += x; pos[i + 1] += y; pos[i + 2] += z; }
    this.emit(pos, [...n, ...n, ...n, ...n], [0, 1, 2, 0, 2, 3], { mat: o.mat, color: o.color, uv: uvs, ao: o.ao });
  }

  /**
   * Extrude a convex-or-star-shaped 2D outline (XY plane) along Z from z0 to z0+depth.
   * Outline is triangulated as a fan from its centroid, sides keep flat normals.
   */
  extrude(points: [number, number][], z0: number, depth: number, o: { mat?: MaterialKey; color?: RGB; ao?: number } = {}): void {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    let cx = 0, cy = 0;
    for (const p of points) { cx += p[0]; cy += p[1]; }
    cx /= points.length; cy /= points.length;
    const n = points.length;
    for (const zz of [z0, z0 + depth]) {
      const base = pos.length / 3;
      const nz = zz === z0 ? -1 : 1;
      pos.push(cx, cy, zz); nrm.push(0, 0, nz);
      for (const p of points) { pos.push(p[0], p[1], zz); nrm.push(0, 0, nz); }
      for (let i = 0; i < n; i++) idx.push(base, base + 1 + i, base + 1 + ((i + 1) % n));
    }
    for (let i = 0; i < n; i++) {
      const a = points[i], b = points[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const l = Math.hypot(ex, ey) || 1;
      let nx = ey / l, ny = -ex / l;
      const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      const base = pos.length / 3;
      pos.push(a[0], a[1], z0, b[0], b[1], z0, b[0], b[1], z0 + depth, a[0], a[1], z0 + depth);
      for (let k = 0; k < 4; k++) nrm.push(nx, ny, 0);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    this.emit(pos, nrm, idx, o);
  }

  // ---------------------------------------------------------------- output

  isEmpty(): boolean { return this.batches.size === 0; }

  /** Create one mesh per material batch. Returns the meshes (parented to `parent`). */
  build(ctx: BuildContext, name: string, parent: Node | null = null, opts: { static?: boolean; lodDistance?: number } = {}): Mesh[] {
    const out: Mesh[] = [];
    for (const [k, b] of this.batches) {
      if (b.i.length === 0) continue;
      const [key, det] = k.split("|") as [MaterialKey, string];
      const detail = det === "1";
      const mesh = new Mesh(`${name}:${key}${detail ? ":detail" : ""}`, ctx.scene);
      const vd = new VertexData();
      vd.positions = b.p; vd.normals = b.n; vd.colors = b.c; vd.uvs = b.uv; vd.indices = b.i;
      if (b.bi.length === b.p.length / 3 * 4) { vd.matricesIndices = b.bi; vd.matricesWeights = b.bw; }
      vd.applyToMesh(mesh, false);
      mesh.parent = parent;
      mesh.isPickable = false;
      const isStatic = opts.static !== false;
      if (detail && opts.lodDistance !== 0) mesh.addLODLevel(opts.lodDistance ?? 22, null);
      ctx.registerMesh(mesh, key, { static: isStatic, detail });
      out.push(mesh);
    }
    for (const s of this.pendingStats) ctx.stats.record(s.name, s.tris, s.mats);
    this.pendingStats = [];
    this.batches.clear();
    return out;
  }
}

// ------------------------------------------------------------------ geometry helpers

function norm2(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

function flatBoxGeo(w: number, h: number, d: number) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const p: number[] = [], n: number[] = [], i: number[] = [];
  const faces: [number[], number[]][] = [
    [[1, 0, 0], [hx, -hy, -hz, hx, -hy, hz, hx, hy, hz, hx, hy, -hz]],
    [[-1, 0, 0], [-hx, -hy, hz, -hx, -hy, -hz, -hx, hy, -hz, -hx, hy, hz]],
    [[0, 1, 0], [-hx, hy, -hz, hx, hy, -hz, hx, hy, hz, -hx, hy, hz]],
    [[0, -1, 0], [-hx, -hy, hz, hx, -hy, hz, hx, -hy, -hz, -hx, -hy, -hz]],
    [[0, 0, 1], [hx, -hy, hz, -hx, -hy, hz, -hx, hy, hz, hx, hy, hz]],
    [[0, 0, -1], [-hx, -hy, -hz, hx, -hy, -hz, hx, hy, -hz, -hx, hy, -hz]],
  ];
  for (const [nn, pp] of faces) {
    const b = p.length / 3;
    p.push(...pp);
    for (let k = 0; k < 4; k++) n.push(...nn);
    i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { p, n, i };
}

const boxCache = new Map<string, { p: number[]; n: number[]; i: number[] }>();
function roundedBoxGeo(w: number, h: number, d: number, r: number, seg: number) {
  const key = `${w.toFixed(4)}_${h.toFixed(4)}_${d.toFixed(4)}_${r.toFixed(4)}_${seg}`;
  const cached = boxCache.get(key);
  if (cached) return cached;
  const he = [w / 2, h / 2, d / 2];
  const coords = (e: number) => {
    const c: number[] = [-e];
    for (let s = 1; s <= seg; s++) c.push(-e + (r * s) / seg);
    for (let s = seg; s >= 1; s--) c.push(e - (r * s) / seg);
    c.push(e);
    return c;
  };
  const cs = he.map(coords);
  const p: number[] = [], n: number[] = [], idx: number[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3;
    for (const sgn of [-1, 1]) {
      const base = p.length / 3;
      const cu = cs[u], cv = cs[v];
      for (let a = 0; a < cu.length; a++) for (let b = 0; b < cv.length; b++) {
        const q = [0, 0, 0];
        q[axis] = sgn * he[axis]; q[u] = cu[a]; q[v] = cv[b];
        const inner = q.map((val, k) => Math.max(-(he[k] - r), Math.min(he[k] - r, val)));
        const dir = q.map((val, k) => val - inner[k]);
        const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
        const nn = dir.map((x) => x / l);
        p.push(inner[0] + nn[0] * r, inner[1] + nn[1] * r, inner[2] + nn[2] * r);
        n.push(nn[0], nn[1], nn[2]);
      }
      const nb = cv.length;
      for (let a = 0; a < cu.length - 1; a++) for (let b = 0; b < nb - 1; b++) {
        const i0 = base + a * nb + b, i1 = i0 + 1, i2 = i0 + nb, i3 = i2 + 1;
        idx.push(i0, i2, i1, i1, i2, i3);
      }
    }
  }
  const g = { p, n, i: idx };
  boxCache.set(key, g);
  return g;
}

/** Planar UV for the front (-Z) face of a box; other faces get the rect centre. */
function boxUV(p: number[], w: number, h: number, r: UVRect): number[] {
  const uv: number[] = [];
  for (let v = 0; v < p.length / 3; v++) {
    const x = p[v * 3], y = p[v * 3 + 1];
    const tu = x / w + 0.5, tv = y / h + 0.5;
    uv.push(r.u0 + (r.u1 - r.u0) * tu, r.v0 + (r.v1 - r.v0) * tv);
  }
  return uv;
}
