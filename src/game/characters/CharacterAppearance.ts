import { Color3, Vector3 } from "@babylonjs/core";
import type { GeometryBuilder, LoftRing } from "../../assets/GeometryBuilder";
import type { CharacterAppearanceConfig } from "./CharacterConfig";
import { buildDragonHero } from "./DragonModel";
import { BONE_INDEX, BoneName, chain, DEFAULT_PROPORTIONS, EYE_DY, HEAD_BASE, jointPositions, Proportions, rigid } from "./Skeleton";

/**
 * Builds a complete stylised character (bind A-pose, facing +Z, feet at y = 0) into a builder
 * with smooth skin weights for the shared rig. Three material families per character:
 * `character` (skin + clothes), `hair` (anime spec band), `eye` (unlit whites/irises).
 */

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const lerp = (a: Vector3, b: Vector3, t: number) => Vector3.Lerp(a, b, t);
const shade = (hex: string, k: number): string => {
  const c = Color3.FromHexString(hex);
  return new Color3(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k)).toHexString();
};
const mix = (a: string, b: string, t: number): string => Color3.Lerp(Color3.FromHexString(a), Color3.FromHexString(b), t).toHexString();

export type Ring5 = [number, number, number, number, string];
/**
 * Insert hard colour bands into a ring list sorted by key (y or arm parameter): each band edge
 * becomes two coincident rings with different colours, so the loft shows a crisp seam instead
 * of a vertex-colour gradient.
 */
export function withBands(rings: Ring5[], bands: [number, number, string][], eps = 0.0008): Ring5[] {
  const at = (k: number): Ring5 => {
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i], b = rings[i + 1];
      if (k >= a[0] && k <= b[0]) {
        const t = (k - a[0]) / (b[0] - a[0] || 1);
        return [k, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t, a[4]];
      }
    }
    return [...rings[rings.length - 1]] as Ring5;
  };
  const out = [...rings];
  for (const [k0, k1, col] of bands) {
    const base0 = at(k0 - eps), base1 = at(k1 + eps);
    out.push(base0, [k0 + eps, ...at(k0).slice(1, 4), col] as Ring5, [k1 - eps, ...at(k1).slice(1, 4), col] as Ring5, base1);
  }
  out.sort((a, b) => a[0] - b[0]);
  // ring colours between band edges must be the band colour
  for (const r of out) for (const [k0, k1, col] of bands) if (r[0] > k0 && r[0] < k1) r[4] = col;
  return out;
}

export function buildCharacter(b: GeometryBuilder, cfg: CharacterAppearanceConfig): void {
  if (cfg.model === "dragonHero") { buildDragonHero(b, cfg); return; }
  const p: Proportions = { ...DEFAULT_PROPORTIONS, ...cfg.body, height: 1.74 };
  const J = jointPositions(p);
  const g = p.girth;
  b.measure("character", () => {
    torso(b, cfg, p, J);
    for (const sx of [1, -1] as const) {
      leg(b, cfg, p, J, sx);
      arm(b, cfg, p, J, sx);
      hand(b, cfg, J, sx);
    }
    neckAndHead(b, cfg, p, J);
    hair(b, cfg, p);
    accessories(b, cfg, p, J);
  });
  b.skin = null;
  void g;
}

// ------------------------------------------------------------------------------------------ torso

function torso(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions, J: Record<BoneName, Vector3>): void {
  const g = p.girth, f = p.female;
  const T = cfg.top.color, Bt = cfg.bottom.color;
  const longTop = cfg.top.type === "kurti";
  const hipW = (f ? 0.165 : 0.152) * g, waistW = (f ? 0.122 : 0.142) * g, chestW = (f ? 0.152 : 0.172) * g;
  const sh = p.shoulder / 0.185;
  const belt = cfg.bottom.type === "jeans" || cfg.bottom.type === "chinos" || cfg.bottom.type === "trousers" ? (cfg.bottom.type === "jeans" ? "#5b4030" : "#3a3330") : Bt;
  const bel = p.belly;
  const rings: [number, number, number, number, string][] = [
    // y, rx, rz, cz, colour
    [0.83, 0.1 * g, 0.085 * g, 0.0, Bt],
    [0.9, hipW, 0.1 * g, -0.008, Bt],
    [0.965, hipW * 0.97, 0.098 * g, -0.002, longTop ? T : Bt],
    [0.99, hipW * 0.95, 0.098 * g + bel * 0.01, 0.002, longTop ? T : belt],
    [1.015, hipW * 0.93, 0.099 * g + bel * 0.02, 0.004, T],
    [1.1, waistW + bel * 0.02, 0.096 * g + bel * 0.035, 0.01 + bel * 0.012, T],
    [1.2, waistW * 1.07 + bel * 0.012, 0.1 * g + bel * 0.025, 0.014, T],
    [1.29, chestW * sh, 0.106 * g + p.chest * 0.02, 0.016, T],
    [1.36, chestW * sh * 1.02, 0.1 * g, 0.008, T],
    [1.405, chestW * sh * 0.96, 0.086 * g, 0.0, T],
    [1.44, 0.12 * g, 0.07 * g, 0.0, T],
    [1.468, 0.06, 0.055, 0.003, T],
  ];
  b.skin = chain(["hips", "spine", "chest", "neck"], [V(0, 0.78, 0), J.spine, J.chest, J.neck, V(0, 1.56, 0)], 0.07);
  const stripeBands: [number, number, string][] = cfg.top.pattern === "stripes"
    ? Array.from({ length: 6 }, (_, i) => [1.07 + i * 0.058, 1.07 + i * 0.058 + 0.02, cfg.top.secondary ?? "#2b2d33"] as [number, number, string])
    : [];
  const banded = withBands(rings as Ring5[], stripeBands);
  b.loft(banded.map(([y, rx, rz, cz, c]) => ({ c: V(0, y, cz), rx, rz, color: c })), 16, { mat: "character" });

  // shoulder caps (deltoids) follow the arms
  for (const sx of [1, -1]) {
    const S = sx > 0 ? J.upperArmL : J.upperArmR;
    b.skin = chain(["chest", sx > 0 ? "upperArmL" : "upperArmR"], [sx > 0 ? J.clavL : J.clavR, S, sx > 0 ? J.foreArmL : J.foreArmR], 0.07);
    b.sphere(S.x - sx * 0.03, S.y - 0.03, S.z, 0.05 * g, 0.044 * g, 0.054 * g, 10, { mat: "character", color: T });
  }
  b.skin = rigid("chest");
  if (f && p.chest > 0) for (const sx of [1, -1]) b.sphere(sx * 0.055, 1.29, 0.06, 0.06, 0.055 * (0.8 + p.chest * 0.4), 0.05 * (0.6 + p.chest * 0.5), 10, { mat: "character", color: T });

  // garment details
  const top = cfg.top.type;
  const sec = cfg.top.secondary ?? "#f2efe8";
  const frontZ = (y: number) => {
    // approximate torso front surface at height y (for decals/buttons)
    const r = rings.reduce((acc, rr) => (Math.abs(rr[0] - y) < Math.abs(acc[0] - y) ? rr : acc));
    return r[2] + r[3] + 0.002;
  };
  b.skin = chain(["spine", "chest", "neck"], [J.spine, J.chest, J.neck, V(0, 1.56, 0)], 0.06);
  if (top === "tshirt" || top === "sweater" || top === "hoodie" || top === "kurti") {
    // crew neck rib
    b.loft([{ c: V(0, 1.44, 0.004), rx: 0.075, rz: 0.06 }, { c: V(0, 1.462, 0.006), rx: 0.068, rz: 0.056 }, { c: V(0, 1.47, 0.006), rx: 0.06, rz: 0.05 }], 14, { mat: "character", color: shade(T, 0.85), caps: false });
  }
  if (top === "shirt" || top === "polo" || top === "uniform" || top === "overshirt" || top === "sweater" || top === "blazer") {
    // collar: two folded wedges meeting at the throat
    const cc = top === "sweater" || top === "blazer" ? sec : top === "overshirt" ? T : T;
    for (const sx of [1, -1]) {
      b.at(sx * 0.035, 1.452, 0.055, sx * -0.55, () => b.extrude([[0, 0.035], [0.05, 0.0], [0.045, -0.02], [-0.005, -0.012]], -0.006, 0.012, { mat: "character", color: shade(cc, 1.04) }), 0.35);
    }
    b.loft([{ c: V(0, 1.448, 0), rx: 0.064, rz: 0.058 }, { c: V(0, 1.488, 0.002), rx: 0.058, rz: 0.052 }], 14, { mat: "character", color: shade(cc, 0.97), caps: false });
    if (top === "shirt" || top === "polo" || top === "uniform") {
      const n = top === "polo" ? 2 : 5;
      for (let i = 0; i < n; i++) { const y = 1.4 - i * 0.075; b.sphere(0, y, frontZ(y) + 0.001, 0.006, 0.006, 0.003, 5, { mat: "character", color: shade(T, 0.75) }); }
      b.box(0, 1.03, frontZ(1.2) - 0.004, 0.022, 0.4, 0.006, { mat: "character", color: shade(T, 0.93), r: 0.002 });
      if (top !== "polo") for (const sx of [1, -1]) b.box(sx * 0.07, 1.27, frontZ(1.3) - 0.004, 0.06, 0.055, 0.006, { mat: "character", color: shade(T, 0.92), r: 0.003 }); // pocket
    }
  }
  if (top === "hoodie") {
    // hood bunched behind the neck + drawstrings + kangaroo pocket
    b.loft([{ c: V(0, 1.41, -0.055), rx: 0.085, rz: 0.04 }, { c: V(0, 1.46, -0.068), rx: 0.095, rz: 0.045 }, { c: V(0, 1.5, -0.064), rx: 0.075, rz: 0.035 }, { c: V(0, 1.52, -0.055), rx: 0.04, rz: 0.015 }], 14, { mat: "character", color: shade(T, 0.94) });
    for (const sx of [1, -1]) b.tube([V(sx * 0.03, 1.44, 0.075), V(sx * 0.033, 1.36, 0.1), V(sx * 0.03, 1.29, 0.11)], 0.004, 5, { mat: "character", color: sec });
    b.box(0, 1.06, frontZ(1.1) - 0.006, 0.19, 0.12, 0.014, { mat: "character", color: shade(T, 0.92), r: 0.012 });
  }
  if (top === "blazer") {
    // open blazer: shirt V on the chest, lapels, two buttons
    const zf = frontZ(1.33);
    b.extrude([[-0.06, 1.46], [0.06, 1.46], [0.0, 1.18]].map(([x, y]) => [x, y]), zf - 0.004, 0.006, { mat: "character", color: sec });
    for (const sx of [1, -1]) {
      b.extrude([[sx * 0.06, 1.46], [sx * 0.095, 1.37], [sx * 0.012, 1.19], [sx * 0.004, 1.2]], zf - 0.002, 0.009, { mat: "character", color: shade(T, 0.82) });
    }
    for (const y of [1.14, 1.06]) b.sphere(0.012, y, frontZ(y) + 0.004, 0.008, 0.008, 0.004, 6, { mat: "character", color: "#2b2b30" });
    b.box(0.085, 1.3, zf - 0.004, 0.045, 0.006, 0.006, { mat: "character", color: sec, r: 0.001 }); // pocket square
  }
  if (top === "overshirt") {
    const zf = frontZ(1.25);
    b.box(0, 1.01, zf - 0.006, 0.09, 0.44, 0.008, { mat: "character", color: sec, r: 0.004 });
  }
  if (top === "uniform") for (const sx of [1, -1]) b.box(sx * 0.15, 1.42, 0, 0.07, 0.012, 0.05, { mat: "character", color: shade(T, 0.7), r: 0.004 });
  if (top === "kurti") {
    b.skin = rigid("hips");
    b.loft([{ c: V(0, 0.98, 0), rx: hipW * 0.98, rz: 0.1 * g }, { c: V(0, 0.82, -0.004), rx: hipW * 1.12, rz: 0.13 * g }, { c: V(0, 0.68, -0.006), rx: hipW * 1.22, rz: 0.15 * g, color: sec }, { c: V(0, 0.67, -0.006), rx: hipW * 1.2, rz: 0.148 * g, color: sec }], 18, { mat: "character", color: T, caps: false });
  }
  // belt buckle
  if (!longTop && (cfg.bottom.type === "jeans" || cfg.bottom.type === "chinos" || cfg.bottom.type === "trousers")) {
    b.skin = rigid("hips");
    b.box(0, 0.98, frontZ(0.99) - 0.001, 0.04, 0.026, 0.008, { mat: "character", color: "#b9b2a0", r: 0.003 });
  }
}

// ------------------------------------------------------------------------------------------ legs & shoes

function leg(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions, J: Record<BoneName, Vector3>, sx: 1 | -1): void {
  const L = sx > 0;
  const hip = L ? J.thighL : J.thighR, knee = L ? J.shinL : J.shinR, ankle = L ? J.footL : J.footR, toe = L ? J.toeL : J.toeR;
  const g = p.girth * (p.female ? 0.95 : 1);
  const Bt = cfg.bottom.color;
  const x = hip.x;
  b.skin = chain(["hips", L ? "thighL" : "thighR", L ? "shinL" : "shinR"], [V(x, 1.08, 0), hip, knee, ankle], 0.065);
  const hem = cfg.bottom.type === "joggers" ? 0.036 : cfg.bottom.type === "jeans" ? 0.05 : 0.047;
  const rings: LoftRing[] = [
    { c: V(x * 0.7, 1.0, 0), rx: 0.09 * g, rz: 0.092 * g },
    { c: V(x, 0.88, -0.004), rx: 0.088 * g, rz: 0.094 * g },
    { c: V(x, 0.72, 0.004), rx: 0.077 * g, rz: 0.082 * g },
    { c: V(x, 0.58, 0.01), rx: 0.064 * g, rz: 0.068 * g },
    { c: knee.add(V(0, 0.0, 0.004)), rx: 0.057 * g, rz: 0.062 * g },
    { c: V(knee.x, 0.38, -0.006), rx: 0.056 * g, rz: 0.062 * g },
    { c: V(knee.x, 0.24, -0.004), rx: 0.048 * g, rz: 0.05 * g },
    { c: V(ankle.x, 0.13, -0.004), rx: hem * g, rz: (hem + 0.004) * g },
    { c: V(ankle.x, 0.1, -0.004), rx: (hem - 0.004) * g, rz: hem * g },
  ];
  if (cfg.bottom.type === "skirt") rings.forEach((r, i) => { if (i > 3) r.color = shade(cfg.skin, 0.98); });
  b.loft(rings, 14, { mat: "character", color: Bt });
  if (cfg.bottom.type === "jeans") {
    // outer seam stitch for denim read
    b.tube([V(x + sx * 0.088 * g, 0.88, 0), V(x + sx * 0.06 * g, 0.5, 0.01), V(x + sx * 0.048 * g, 0.14, 0)], 0.0025, 4, { mat: "character", color: shade(Bt, 1.25), caps: false });
  }
  // shoe
  b.skin = chain([L ? "footL" : "footR", L ? "toeL" : "toeR"], [V(ankle.x, 0.14, -0.02), toe, toe.add(V(0, 0, 0.1))], 0.04);
  const S = cfg.shoes.color, sole = cfg.shoes.sole ?? (cfg.shoes.type === "sneakers" ? "#f2efe8" : "#2a2522");
  const fx = ankle.x;
  const formal = cfg.shoes.type === "formal" || cfg.shoes.type === "loafers";
  b.loft([
    { c: V(fx, 0.1, -0.045), rx: 0.042, rz: 0.045 },
    { c: V(fx, 0.065, -0.07), rx: 0.044, rz: 0.04 },
    { c: V(fx, 0.06, -0.02), rx: 0.05, rz: 0.055 },
    { c: V(fx + sx * 0.003, 0.055, 0.05), rx: 0.052, rz: 0.045 },
    { c: V(fx + sx * 0.005, 0.045, 0.115), rx: formal ? 0.042 : 0.048, rz: formal ? 0.03 : 0.035 },
    { c: V(fx + sx * 0.005, 0.034, 0.155), rx: formal ? 0.028 : 0.036, rz: 0.024 },
  ], 12, { mat: "character", color: S, front: V(0, 1, 0) });
  b.box(fx + sx * 0.003, 0.0, 0.038, 0.098, 0.022, 0.228, { mat: "character", color: sole, r: 0.01 });
  if (cfg.shoes.type === "sneakers") {
    for (let i = 0; i < 3; i++) b.box(fx + sx * 0.003, 0.085 - i * 0.008, 0.035 + i * 0.022, 0.05, 0.006, 0.008, { mat: "character", color: sole, r: 0 }); // laces
    b.sphere(fx + sx * 0.05, 0.05, 0.0, 0.004, 0.018, 0.035, 6, { mat: "character", color: shade(S, 0.75) }); // side swoosh
  }
}

// ------------------------------------------------------------------------------------------ arms & hands

function arm(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions, J: Record<BoneName, Vector3>, sx: 1 | -1): void {
  const L = sx > 0;
  const S = L ? J.upperArmL : J.upperArmR, E = L ? J.foreArmL : J.foreArmR, W = L ? J.handL : J.handR;
  const g = p.girth * (p.female ? 0.86 : 1);
  const T = cfg.top.color, Sk = cfg.skin;
  const sleeves = cfg.top.sleeves ?? (cfg.top.type === "tshirt" || cfg.top.type === "polo" ? "short" : "long");
  b.skin = chain(["chest", L ? "upperArmL" : "upperArmR", L ? "foreArmL" : "foreArmR"], [L ? J.clavL : J.clavR, S, E, W], 0.06);
  const ringsDef: [Vector3, number, number, number][] = [
    // centre, rx, rz, position along arm (0 shoulder → 1 shoulder-elbow, 2 wrist)
    [S.add(V(-sx * 0.035, -0.03, 0)), 0.048, 0.05, -0.1],
    [S.add(V(sx * 0.002, -0.035, 0)), 0.05, 0.052, 0],
    [lerp(S, E, 0.45), 0.046, 0.048, 0.45],
    [lerp(S, E, 0.85), 0.041, 0.042, 0.85],
    [E, 0.042, 0.043, 1],
    [lerp(E, W, 0.35), 0.042, 0.04, 1.35],
    [lerp(E, W, 0.75), 0.034, 0.031, 1.75],
    [W.add(V(0, 0.004, 0)), 0.028, 0.025, 2],
  ];
  const sleeveEnd = sleeves === "short" ? 0.5 : sleeves === "rolled" ? 1.3 : 2.1;
  // parametrise rings by t, cut a hard seam at the sleeve end (no skin/fabric gradient)
  const keyed: Ring5[] = ringsDef.map(([c, rx, rz, t]) => [t, rx, rz, 0, t <= sleeveEnd ? T : Sk]);
  const centres = ringsDef.map(([c, , , t]) => ({ t, c }));
  const centreAt = (t: number) => {
    for (let i = 0; i < centres.length - 1; i++) if (t >= centres[i].t && t <= centres[i + 1].t) return lerp(centres[i].c, centres[i + 1].c, (t - centres[i].t) / (centres[i + 1].t - centres[i].t));
    return centres[centres.length - 1].c;
  };
  const armRings = sleeveEnd < 2 ? withBands(keyed, [[sleeveEnd, 2.0, Sk]]) : keyed;
  b.loft(armRings.map(([t, rx, rz, , col]) => ({ c: centreAt(t), rx: rx * g, rz: rz * g, color: col })), 12, { mat: "character" });
  if (sleeves === "short") {
    // sleeve shell gives the fabric thickness and a crisp hem
    b.loft([{ c: S.add(V(-sx * 0.015, -0.03, 0)), rx: 0.056 * g, rz: 0.058 * g }, { c: lerp(S, E, 0.3), rx: 0.054 * g, rz: 0.056 * g }, { c: lerp(S, E, 0.52), rx: 0.053 * g, rz: 0.055 * g }], 12, { mat: "character", color: T, caps: false });
  } else if (sleeves === "rolled") {
    b.loft([{ c: lerp(E, W, 0.22), rx: 0.05 * g, rz: 0.048 * g }, { c: lerp(E, W, 0.32), rx: 0.05 * g, rz: 0.048 * g }], 12, { mat: "character", color: shade(T, 0.9), caps: false });
  } else {
    const cuff = cfg.top.type === "blazer" ? (cfg.top.secondary ?? "#f2efe8") : shade(T, 0.88);
    b.loft([{ c: lerp(E, W, 0.84), rx: 0.035 * g, rz: 0.032 * g }, { c: lerp(E, W, 0.97), rx: 0.033 * g, rz: 0.03 * g }], 12, { mat: "character", color: cuff, caps: false });
  }
}

export function hand(b: GeometryBuilder, cfg: CharacterAppearanceConfig, J: Record<BoneName, Vector3>, sx: 1 | -1): void {
  const L = sx > 0;
  const E = L ? J.foreArmL : J.foreArmR, W = L ? J.handL : J.handR, K = L ? J.fingersL : J.fingersR, Th = L ? J.thumbL : J.thumbR;
  const d = W.subtract(E).normalize();
  const phi = Math.atan2(d.x, -d.y);
  const Sk = cfg.skin, knuckle = shade(Sk, 0.96);
  const handB: BoneName = L ? "handL" : "handR";
  // palm
  b.skin = rigid(handB);
  b.at(W.x, W.y, W.z, 0, () => {
    b.box(0, -0.088, 0.003, 0.03, 0.09, 0.074, { mat: "character", color: Sk, r: 0.013, seg: 2 });
  }, 0, phi);
  // fingers (index towards the front) — curled slightly toward the palm
  b.skin = chain([handB, L ? "fingersL" : "fingersR"], [W, K, K.add(d.scale(0.09))], 0.02);
  const zs = [0.026, 0.009, -0.009, -0.025], lens = [0.066, 0.074, 0.068, 0.054], rads = [0.0092, 0.0098, 0.0092, 0.0082];
  b.at(W.x, W.y, W.z, 0, () => {
    zs.forEach((z, i) => {
      const l = lens[i], r = rads[i];
      b.loft([
        { c: V(-sx * 0.001, -0.078, z), rx: r, rz: r * 1.05 },
        { c: V(-sx * 0.003, -0.086 - l * 0.4, z * 1.02), rx: r * 0.95, rz: r },
        { c: V(-sx * 0.009, -0.086 - l * 0.78, z * 1.03), rx: r * 0.85, rz: r * 0.88 },
        { c: V(-sx * 0.015, -0.086 - l, z * 1.03), rx: r * 0.55, rz: r * 0.55, color: knuckle },
      ], 8, { mat: "character", color: Sk, front: V(0, 0, 1) });
    });
  }, 0, phi);
  // thumb
  b.skin = chain([handB, L ? "thumbL" : "thumbR"], [W, Th, Th.add(V(0, -0.05, 0.03))], 0.015);
  b.at(W.x, W.y, W.z, 0, () => {
    b.loft([
      { c: V(-sx * 0.004, -0.022, 0.028), rx: 0.013, rz: 0.012 },
      { c: V(-sx * 0.01, -0.045, 0.044), rx: 0.011, rz: 0.0105 },
      { c: V(-sx * 0.016, -0.066, 0.05), rx: 0.0095, rz: 0.009 },
      { c: V(-sx * 0.02, -0.08, 0.051), rx: 0.005, rz: 0.005 },
    ], 8, { mat: "character", color: Sk });
  }, 0, phi);
}

// ------------------------------------------------------------------------------------------ head & face

const HEAD_RINGS: [number, number, number, number][] = [
  // dy, rx, rz, cz  (stylised: soft jaw, full cheeks, round cranium)
  [0.0, 0.04, 0.045, -0.005],
  [0.026, 0.046, 0.053, 0.028],
  [0.046, 0.066, 0.073, 0.024],
  [0.07, 0.082, 0.087, 0.015],
  [0.092, 0.089, 0.094, 0.01],
  [0.118, 0.093, 0.098, 0.006],
  [0.148, 0.095, 0.1, 0.002],
  [0.178, 0.09, 0.096, -0.004],
  [0.204, 0.076, 0.084, -0.01],
  [0.222, 0.05, 0.058, -0.013],
  [0.231, 0.015, 0.018, -0.014],
];

export function neckAndHead(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions, J: Record<BoneName, Vector3>, rings = HEAD_RINGS, noseK = 1): void {
  const Sk = cfg.skin, hs = p.head;
  const HB = HEAD_BASE;
  b.skin = chain(["neck", "head"], [V(0, 1.41, 0), J.head, V(0, 1.62, 0)], 0.04);
  b.loft([{ c: V(0, 1.4, -0.004), rx: 0.05, rz: 0.05 }, { c: V(0, 1.46, 0.0), rx: 0.046, rz: 0.047 }, { c: V(0, 1.52, 0.006), rx: 0.042, rz: 0.045 }], 12, { mat: "character", color: shade(Sk, 0.95), caps: false });

  b.skin = rigid("head");
  b.loft(rings.map(([dy, rx, rz, cz]) => ({ c: V(0, HB + dy * hs, 0.005 + cz * hs), rx: rx * hs, rz: rz * hs })), 18, { mat: "character", color: Sk });
  const eyeY = HB + EYE_DY * hs;
  // nose and ears
  b.sphere(0, HB + 0.088 * hs, 0.104 * hs - (1 - noseK) * 0.004, 0.009 * hs * noseK, 0.012 * hs * noseK, 0.009 * hs * noseK, 8, { mat: "character", color: shade(Sk, 0.97) });
  for (const sx of [1, -1]) {
    b.sphere(sx * 0.092 * hs, HB + 0.1 * hs, -0.004, 0.014 * hs, 0.029 * hs, 0.021 * hs, 8, { mat: "character", color: Sk });
    b.sphere(sx * 0.099 * hs, HB + 0.1 * hs, -0.002, 0.005 * hs, 0.018 * hs, 0.012 * hs, 6, { mat: "character", color: shade(Sk, 0.85) });
  }
  // eyes (on eye bones: blink = scale Y, gaze = translate)
  const es = cfg.eyes.size ?? 1;
  for (const sx of [1, -1]) {
    const ex = sx * 0.041 * hs;
    b.skin = rigid(sx > 0 ? "eyeL" : "eyeR");
    const shapeY = cfg.eyes.shape === "sleepy" ? 0.8 : cfg.eyes.shape === "almond" ? 0.9 : 1;
    b.sphere(ex, eyeY, 0.088 * hs, 0.021 * es * hs, 0.025 * es * shapeY * hs, 0.012 * hs, 10, { mat: "eye", color: "#f7f3ec" });
    b.sphere(ex + sx * 0.001, eyeY - 0.001, 0.0975 * hs, 0.0135 * es * hs, 0.018 * es * shapeY * hs, 0.005 * hs, 10, { mat: "eye", color: cfg.eyes.iris });
    b.sphere(ex + sx * 0.001, eyeY - 0.001, 0.1005 * hs, 0.0068 * es * hs, 0.0095 * es * shapeY * hs, 0.003 * hs, 8, { mat: "eye", color: "#16121a" });
    b.sphere(ex + sx * 0.001 + 0.0055 * hs, eyeY + 0.0075 * hs, 0.1025 * hs, 0.0035 * hs, 0.0035 * hs, 0.002 * hs, 6, { mat: "eye", color: "#ffffff" });
    // upper lash line
    const lash: Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.08 + (0.84 * i) / 8);
      lash.push(V(ex + Math.cos(a) * 0.023 * es * hs * sx, eyeY + Math.sin(a) * 0.026 * es * shapeY * hs, 0.097 * hs + Math.sin(a) * 0.003));
    }
    b.tube(lash.map((v, i) => (i === 0 || i === 8 ? v.add(V(0, -0.002, 0)) : v)), 0.0034 * hs, 5, { mat: "character", color: "#231c22" });
    // brows
    b.skin = rigid(sx > 0 ? "browL" : "browR");
    const bt = (cfg.brows?.thickness ?? 1) * 0.0045 * hs;
    const bc = cfg.brows?.color ?? shade(cfg.hair.color, 0.9);
    const ang = cfg.brows?.angle ?? 0;
    const by = HB + (EYE_DY + 0.04) * hs;
    b.tube([V(sx * 0.016 * hs, by - 0.001 - ang * 0.004, 0.104 * hs), V(sx * 0.04 * hs, by + 0.005, 0.105 * hs), V(sx * 0.064 * hs, by - 0.001 + ang * 0.004, 0.094 * hs)], bt, 6, { mat: "character", color: bc });
  }
  // mouth (jaw bone: open = scale Y)
  b.skin = rigid("jaw");
  const my = HB + 0.054 * hs;
  b.sphere(0, my - 0.002, 0.098 * hs, 0.016 * hs, 0.006 * hs, 0.006 * hs, 8, { mat: "character", color: "#4a2228" });
  const smile: Vector3[] = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8 - 0.5; smile.push(V(t * 0.04 * hs, my + t * t * 0.016 * hs, (0.103 - t * t * 0.04) * hs)); }
  b.tube(smile, 0.0024 * hs, 5, { mat: "character", color: mix("#6a2e30", Sk, 0.25) });
}

// ------------------------------------------------------------------------------------------ hair

interface ShellOpts {
  /** rim height above HEAD_BASE (metres, unscaled) as a function of angle θ (0 = front, ±π = back) */
  rim: (th: number) => number;
  scale?: number;       // shell size relative to the skull
  lift?: number;        // extra crown volume
  color: string;
  tipOut?: number;      // how far spike tips flare away from the face
}

/**
 * Seamless hair mass following the skull, with a rim whose height varies around the head
 * (spiky bangs at the front, over the ears at the sides, nape at the back). A folded inner
 * lip gives the edge visible thickness under outlines.
 */
export function hairShell(b: GeometryBuilder, hs: number, o: ShellOpts): void {
  const HB = HEAD_BASE;
  const C = V(0, HB + 0.118 * hs, 0.008);
  const k = o.scale ?? 1.09;
  // deeper front/back than wide so the shell never grazes the forehead
  const a = 0.096 * hs * k, bY = 0.118 * hs * k + (o.lift ?? 0), c = 0.104 * hs * k * 1.04;
  const nT = 64, nV = 9;
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [], cols: number[] = [];
  const col = Color3.FromHexString(o.color);
  const point = (th: number, phi: number, inset: number) => {
    const sx = Math.sin(phi) * Math.sin(th), sy = Math.cos(phi), sz = Math.sin(phi) * Math.cos(th);
    const p = V(C.x + sx * (a - inset), C.y + sy * (bY - inset), C.z + sz * (c - inset));
    const n = V(sx / a, sy / bY, sz / c).normalize();
    return { p, n };
  };
  const ring: { th: number; phiR: number }[] = [];
  for (let i = 0; i < nT; i++) {
    const th = -Math.PI + (i / nT) * Math.PI * 2;
    const yr = HB + o.rim(th) * hs;
    const phiR = Math.acos(Math.max(-0.98, Math.min(0.98, (yr - C.y) / bY)));
    ring.push({ th, phiR });
  }
  const rows = nV + 2;
  for (let i = 0; i < nT; i++) {
    const { th, phiR } = ring[i];
    for (let v = 0; v <= nV; v++) {
      const phi = (v / nV) * phiR;
      const { p, n } = point(th, phi, 0);
      if (v === nV && o.tipOut) p.addInPlace(n.scale(o.tipOut * Math.max(0, Math.cos(th))));
      pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z);
      const shadeK = 1 - 0.06 * (v / nV);
      cols.push(col.r * shadeK, col.g * shadeK, col.b * shadeK, 1);
    }
    // folded lip (inner edge)
    const { p, n } = point(th, phiR * 0.985, 0.012 * hs);
    pos.push(p.x, p.y - 0.004, p.z); nrm.push(-n.x, -n.y, -n.z);
    cols.push(col.r * 0.7, col.g * 0.7, col.b * 0.7, 1);
  }
  for (let i = 0; i < nT; i++) {
    const i2 = (i + 1) % nT;
    for (let v = 0; v < rows - 1; v++) {
      const a0 = i * rows + v, a1 = i2 * rows + v, b0 = a0 + 1, b1 = a1 + 1;
      idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
  b.emit(pos, nrm, idx, { mat: "hair", colors: cols });
}

/** Triangle wave in [0,1] — sharp spike tips. */
export const tri = (x: number) => 1 - Math.abs(((x % 1) + 1) % 1 * 2 - 1);
/** Smoothly blend rim heights between front (θ=0), side (|θ|=π/2) and back (|θ|=π). */
export function rimProfile(th: number, front: number, side: number, back: number): number {
  const at = Math.abs(th);
  if (at < Math.PI / 2) { const t = at / (Math.PI / 2); return front + (side - front) * (t * t * (3 - 2 * t)); }
  const t = (at - Math.PI / 2) / (Math.PI / 2);
  return side + (back - side) * (t * t * (3 - 2 * t));
}


/** A tapered, flattened lock of hair along a path; `out` is the surface normal it lies against. */
export function lock(b: GeometryBuilder, path: Vector3[], width: number, thick: number, out: Vector3, color: string): void {
  const n = path.length;
  b.loft(path.map((c, i) => {
    const t = i / (n - 1);
    const w = width * (1 - t * t * 0.92) * (i === 0 ? 0.8 : 1);
    return { c, rx: Math.max(0.002, w / 2), rz: Math.max(0.0015, thick * (1 - t * 0.7)) };
  }), 8, { mat: "hair", color, front: out });
}

function hair(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions): void {
  const hs = p.head, HB = HEAD_BASE;
  const H = cfg.hair.color, Hl = cfg.hair.highlight ?? shade(H, 1.25);
  const C = V(0, HB + 0.12 * hs, 0.005);
  b.skin = rigid("head");
  // crown cap (front rim = hairline) + back shell so the skull is always covered behind the ears
  const cap = (tilt: number, k = 1, col = H) => {
    b.at(C.x, C.y + 0.004, C.z, 0, () => b.sphere(0, 0, 0, 0.104 * k * hs, 0.118 * k * hs, 0.11 * k * hs, 14, { mat: "hair", color: col, hemi: true }), tilt);
    b.at(C.x, C.y - 0.006, C.z - 0.004, 0, () => b.sphere(0, 0, 0, 0.102 * k * hs, 0.118 * k * hs, 0.108 * k * hs, 14, { mat: "hair", color: col, hemi: true }), -Math.PI / 2);
  };
  const nape = (k = 1) => b.sphere(0, HB + 0.07 * hs, -0.05 * hs, 0.08 * k * hs, 0.06 * k * hs, 0.06 * k * hs, 10, { mat: "hair", color: H });
  const up = V(0, 1, 0), fwd = V(0, 0, 1);
  const style = cfg.hair.style;
  switch (style) {
    case "messyFringe": {
      // chunky swept bangs: spikes across the forehead, longer toward one side
      hairShell(b, hs, {
        color: H, lift: 0.012 * hs, tipOut: 0.006,
        rim: (th) => {
          const base = rimProfile(th, 0.168, 0.115, 0.045);
          const front = Math.max(0, Math.cos(th));
          const spikes = tri(th * 2.6 + 0.35) * 0.04 * front * (0.8 + 0.4 * Math.sin(th * 1.7 + 0.5));
          const sweep = th * 0.012 * front;
          const side = Math.abs(Math.sin(th)) > 0.85 ? tri(th * 3.0) * 0.025 : 0;
          return base - spikes - sweep - side;
        },
      });
      void Hl;
      break;
    }
    case "sidePart": {
      // neat professional cut: high clean hairline, side part, soft volume swept across
      hairShell(b, hs, {
        color: H, scale: 1.075, lift: 0.006 * hs,
        rim: (th) => rimProfile(th, 0.19 - Math.max(0, Math.sin(th * 1.0)) * 0.012, 0.12, 0.035) - (Math.abs(Math.sin(th)) > 0.9 ? 0.03 : 0),
      });
      b.at(-0.015 * hs, HB + 0.222 * hs, 0.035 * hs, 0, () => b.sphere(0, 0, 0, 0.094 * hs, 0.04 * hs, 0.085 * hs, 14, { mat: "hair", color: H }), -0.22, 0.16);
      lock(b, [V(0.04 * hs, HB + 0.25 * hs, 0.05 * hs), V(-0.02 * hs, HB + 0.252 * hs, 0.085 * hs), V(-0.075 * hs, HB + 0.22 * hs, 0.08 * hs)], 0.06 * hs, 0.018 * hs, up, Hl);
      break;
    }
    case "quiff": {
      cap(-0.5); nape();
      b.at(0, HB + 0.22 * hs, 0.055 * hs, 0, () => b.sphere(0, 0, 0, 0.07 * hs, 0.05 * hs, 0.055 * hs, 12, { mat: "hair", color: H }), -0.5);
      lock(b, [V(-0.02 * hs, HB + 0.24 * hs, 0.06 * hs), V(0.0, HB + 0.27 * hs, 0.085 * hs), V(0.02 * hs, HB + 0.255 * hs, 0.11 * hs)], 0.06 * hs, 0.02 * hs, up, Hl);
      break;
    }
    case "curly": {
      cap(-0.45, 1.04); nape(1.05);
      for (let i = 0; i < 34; i++) {
        const a = i * 2.39996, t = (i + 0.5) / 34;
        const el = Math.asin(t) ;
        const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
        if (dir.z > 0.55 && dir.y < 0.45) continue; // keep the face clear
        const pp = C.add(V(dir.x * 0.1 * hs, dir.y * 0.115 * hs + 0.01, dir.z * 0.106 * hs - 0.005));
        if (pp.y < HB + 0.12 * hs && dir.z > -0.2) continue;
        b.sphere(pp.x, pp.y, pp.z, 0.031 * hs, 0.029 * hs, 0.031 * hs, 7, { mat: "hair", color: i % 4 === 0 ? Hl : H });
      }
      break;
    }
    case "buzz": cap(-0.55, 1.0); b.sphere(0, HB + 0.09 * hs, -0.05 * hs, 0.083 * hs, 0.07 * hs, 0.058 * hs, 10, { mat: "hair", color: H }); break;
    case "slick": {
      cap(-0.55); nape();
      b.at(0, HB + 0.21 * hs, -0.01, 0, () => b.sphere(0, 0, 0, 0.094 * hs, 0.036 * hs, 0.108 * hs, 12, { mat: "hair", color: H }), 0.18);
      for (let i = 0; i < 4; i++) lock(b, [V((-0.04 + i * 0.027) * hs, HB + 0.23 * hs, 0.07 * hs), V((-0.04 + i * 0.027) * hs, HB + 0.245 * hs, 0.0), V((-0.04 + i * 0.027) * hs * 1.1, HB + 0.21 * hs, -0.09 * hs)], 0.03 * hs, 0.01 * hs, up, Hl);
      break;
    }
    case "wavy": {
      cap(-0.4, 1.03); nape(1.08);
      for (let i = 0; i < 6; i++) {
        const sx = i % 2 ? 1 : -1, k = Math.floor(i / 2);
        lock(b, [V(sx * 0.07 * hs, HB + 0.2 * hs, (0.02 - k * 0.04) * hs), V(sx * 0.1 * hs, HB + 0.14 * hs, (0.0 - k * 0.045) * hs), V(sx * 0.095 * hs, HB + 0.07 * hs, (0.01 - k * 0.04) * hs)], 0.045 * hs, 0.015 * hs, V(sx, 0, 0), k === 1 ? Hl : H);
      }
      for (let i = 0; i < 4; i++) lock(b, [V((-0.05 + i * 0.033) * hs, HB + 0.22 * hs, 0.05 * hs), V((-0.04 + i * 0.033) * hs, HB + 0.2 * hs, 0.1 * hs), V((-0.025 + i * 0.033) * hs, HB + 0.165 * hs, 0.11 * hs)], 0.038 * hs, 0.013 * hs, fwd, H);
      break;
    }
    case "longStraight": case "bob": case "ponytail": case "bun": {
      cap(-0.38, 1.02);
      if (style === "longStraight" || style === "bob") {
        // back/side shell, open at the face
        const len = style === "bob" ? 0.0 : -0.14;
        b.loft([
          { c: V(0, HB + 0.2 * hs, -0.03 * hs), rx: 0.098 * hs, rz: 0.09 * hs },
          { c: V(0, HB + 0.12 * hs, -0.04 * hs), rx: 0.112 * hs, rz: 0.08 * hs },
          { c: V(0, HB + 0.04 * hs, -0.05 * hs), rx: 0.11 * hs, rz: 0.065 * hs },
          { c: V(0, HB + (len + 0.01) * hs, -0.07 * hs), rx: 0.105 * hs, rz: 0.045 * hs },
          { c: V(0, HB + len * hs - 0.01, -0.075 * hs), rx: 0.09 * hs, rz: 0.03 * hs },
        ], 14, { mat: "hair", color: H });
        for (const sx of [1, -1]) lock(b, [V(sx * 0.085 * hs, HB + 0.2 * hs, 0.04 * hs), V(sx * 0.1 * hs, HB + 0.12 * hs, 0.045 * hs), V(sx * 0.1 * hs, HB + (style === "bob" ? 0.03 : -0.06) * hs, 0.03 * hs)], 0.05 * hs, 0.016 * hs, V(sx, 0, 0.3), H);
      } else nape(1.02);
      for (let i = 0; i < 5; i++) {
        const x0 = (-0.06 + i * 0.027) * hs;
        lock(b, [V(x0, HB + 0.215 * hs, 0.045 * hs), V(x0 + 0.012, HB + 0.2 * hs, 0.095 * hs), V(x0 + 0.02, HB + 0.165 * hs, 0.112 * hs)], 0.036 * hs, 0.012 * hs, fwd, i === 2 ? Hl : H);
      }
      if (style === "ponytail") {
        b.sphere(0, HB + 0.15 * hs, -0.1 * hs, 0.032 * hs, 0.03 * hs, 0.03 * hs, 8, { mat: "hair", color: H });
        b.cyl(0, HB + 0.135 * hs, -0.108 * hs, 0.02, 0.02, 0.02, 10, { mat: "character", color: cfg.accessoryColor ?? "#d9675e" });
        lock(b, [V(0, HB + 0.15 * hs, -0.12 * hs), V(0, HB + 0.07 * hs, -0.15 * hs), V(0, HB - 0.03 * hs, -0.14 * hs), V(0, HB - 0.11 * hs, -0.12 * hs)], 0.06 * hs, 0.03 * hs, V(0, 0, -1), H);
      }
      if (style === "bun") b.sphere(0, HB + 0.235 * hs, -0.065 * hs, 0.05 * hs, 0.045 * hs, 0.05 * hs, 10, { mat: "hair", color: H });
      break;
    }
    case "turban": {
      // Dastar: tied in layered folds rising to a peak at the front, with a contrasting under-band
      const tc = cfg.turban?.color ?? "#2f4a8a";
      const t2 = shade(tc, 0.86), t3 = shade(tc, 1.12);
      b.at(C.x, C.y + 0.012, C.z - 0.004, 0, () => b.sphere(0, 0, 0, 0.11 * hs, 0.132 * hs, 0.118 * hs, 16, { mat: "character", color: tc, hemi: true }), -0.42);
      b.at(0, HB + 0.235 * hs, 0.045 * hs, 0, () => b.sphere(0, 0, 0, 0.086 * hs, 0.062 * hs, 0.072 * hs, 12, { mat: "character", color: tc }), -0.35);
      // diagonal wraps meeting in a V at the forehead
      for (let k = 0; k < 4; k++) for (const sx of [1, -1]) {
        const y0 = HB + (0.135 + k * 0.026) * hs;
        b.tube([
          V(sx * 0.112 * hs, y0 - 0.01, -0.05 * hs),
          V(sx * 0.108 * hs, y0 + 0.012, 0.03 * hs),
          V(sx * 0.07 * hs, y0 + 0.038, 0.098 * hs - k * 0.004),
          V(0, y0 + 0.064 + k * 0.004, 0.118 * hs - k * 0.012),
        ], 0.0105 * hs, 7, { mat: "character", color: k % 2 ? t2 : t3 });
      }
      // back folds
      for (let k = 0; k < 3; k++) b.tube([V(-0.108 * hs, HB + (0.13 + k * 0.035) * hs, -0.04 * hs), V(0, HB + (0.115 + k * 0.04) * hs, -0.122 * hs), V(0.108 * hs, HB + (0.13 + k * 0.035) * hs, -0.04 * hs)], 0.011 * hs, 7, { mat: "character", color: k % 2 ? t2 : tc });
      // fifty (contrasting under-turban band) along the forehead
      const band: Vector3[] = [];
      for (let i = 0; i <= 10; i++) { const a = -0.9 + (1.8 * i) / 10; band.push(V(Math.sin(a) * 0.097 * hs, HB + (0.158 + Math.abs(a) * 0.012) * hs, Math.cos(a) * 0.1 * hs + 0.008)); }
      b.tube(band, 0.006 * hs, 6, { mat: "character", color: cfg.accessoryColor ?? "#e0b35a" });
      break;
    }
    case "bald": break;
  }

  // facial hair
  const acc = cfg.accessories ?? [];
  const Hb = cfg.hair.color;
  if (acc.includes("fullBeard") || acc.includes("beard") || acc.includes("stubble")) {
    const full = acc.includes("fullBeard");
    const stub = acc.includes("stubble");
    const col = stub ? mix(cfg.skin, Hb, 0.45) : Hb;
    const k = stub ? 0.985 : 1;
    b.at(0, HB + 0.045 * hs, 0.014, 0, () => b.sphere(0, 0, 0, 0.088 * k * hs, (full ? 0.08 : 0.06) * hs, 0.098 * k * hs, 14, { mat: "hair", color: col, hemi: true }), Math.PI);
    if (!stub) {
      for (const sx of [1, -1]) lock(b, [V(sx * 0.085 * hs, HB + 0.04 * hs, 0.03 * hs), V(sx * 0.09 * hs, HB + 0.1 * hs, 0.02 * hs), V(sx * 0.092 * hs, HB + 0.155 * hs, 0.0)], 0.032 * hs, 0.012 * hs, V(sx, 0, 0), col);
      if (full) b.sphere(0, HB - 0.01 * hs, 0.07 * hs, 0.042 * hs, 0.05 * hs, 0.038 * hs, 10, { mat: "hair", color: col });
    }
  }
  if (acc.includes("moustache") || acc.includes("fullBeard") || acc.includes("beard")) {
    for (const sx of [1, -1]) lock(b, [V(sx * 0.003, HB + 0.066 * hs, 0.113 * hs), V(sx * 0.02 * hs, HB + 0.06 * hs, 0.11 * hs), V(sx * 0.036 * hs, HB + 0.05 * hs, 0.1 * hs)], 0.016 * hs, 0.007 * hs, fwd, Hb);
  }
  void BONE_INDEX;
}

// ------------------------------------------------------------------------------------------ accessories

export function accessories(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions, J: Record<BoneName, Vector3>): void {
  const acc = cfg.accessories ?? [];
  const hs = p.head, HB = HEAD_BASE, eyeY = HB + EYE_DY * hs;
  if (acc.includes("glasses") || acc.includes("roundGlasses")) {
    b.skin = rigid("head");
    const round = acc.includes("roundGlasses");
    const fc = cfg.accessoryColor ?? "#2b2530";
    for (const sx of [1, -1]) {
      const ring: Vector3[] = [];
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rx = round ? 0.024 : 0.028, ry = round ? 0.024 : 0.02;
        ring.push(V(sx * 0.042 * hs + Math.cos(a) * rx * hs, eyeY + Math.sin(a) * ry * hs, 0.118 * hs));
      }
      b.tube(ring, 0.0028 * hs, 5, { mat: "character", color: fc, caps: false });
      b.tube([V(sx * 0.07 * hs, eyeY + 0.006, 0.114 * hs), V(sx * 0.095 * hs, eyeY + 0.008, 0.06 * hs), V(sx * 0.097 * hs, eyeY + 0.0, -0.01)], 0.0024 * hs, 4, { mat: "character", color: fc });
    }
    b.tube([V(-0.014 * hs, eyeY + 0.006, 0.12 * hs), V(0, eyeY + 0.01, 0.123 * hs), V(0.014 * hs, eyeY + 0.006, 0.12 * hs)], 0.0026 * hs, 4, { mat: "character", color: fc });
  }
  if (acc.includes("earrings")) {
    b.skin = rigid("head");
    for (const sx of [1, -1]) b.sphere(sx * 0.094 * hs, HB + 0.072 * hs, 0.004, 0.006, 0.006, 0.006, 6, { mat: "hair", color: "#e2b04a" });
  }
  if (acc.includes("bindi")) { b.skin = rigid("head"); b.sphere(0, eyeY + 0.03 * hs, 0.112 * hs, 0.004, 0.004, 0.002, 6, { mat: "character", color: "#c0392b" }); }
  for (const [name, wristSide] of [["watch", 1], ["kara", -1]] as const) {
    if (!acc.includes(name)) continue;
    const L = wristSide > 0;
    const E = L ? J.foreArmL : J.foreArmR, W = L ? J.handL : J.handR;
    b.skin = rigid(L ? "foreArmL" : "foreArmR");
    const c = lerp(E, W, 0.9);
    b.loft([{ c: c.add(V(0, 0.008, 0)), rx: 0.033, rz: 0.03 }, { c: c.add(V(0, -0.006, 0)), rx: 0.033, rz: 0.03 }], 12, { mat: "hair", color: name === "kara" ? "#c9ccd2" : "#2b2d33", caps: false });
    if (name === "watch") b.box(c.x + (L ? 0.026 : -0.026), c.y - 0.008, c.z, 0.008, 0.016, 0.022, { mat: "eye", color: "#cfe6f2", r: 0.002 });
  }
  if (acc.includes("lanyard")) {
    b.skin = rigid("chest");
    const card = V(0.0, 1.235, 0.118);
    b.tube([V(-0.05, 1.46, 0.02), V(-0.04, 1.4, 0.085), V(-0.008, 1.29, 0.112), card.add(V(0, 0.04, 0))], 0.004, 4, { mat: "character", color: "#2f5fae", caps: false });
    b.tube([V(0.05, 1.46, 0.02), V(0.04, 1.4, 0.085), V(0.008, 1.29, 0.112), card.add(V(0, 0.04, 0))], 0.004, 4, { mat: "character", color: "#2f5fae", caps: false });
    b.box(card.x, card.y - 0.045, card.z, 0.055, 0.08, 0.004, { mat: "character", color: "#ffffff", r: 0.004 });
    b.box(card.x, card.y + 0.012, card.z + 0.0025, 0.055, 0.016, 0.002, { mat: "character", color: "#f08a3c", r: 0 });
  }
  if (acc.includes("headphonesNeck")) {
    b.skin = rigid("neck");
    const arc: Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); arc.push(V(Math.cos(a) * 0.085, 1.44 - Math.sin(a) * 0.03, -0.03 + Math.sin(a) * -0.04)); }
    b.tube(arc, 0.008, 6, { mat: "hair", color: "#2b2d33" });
    for (const sx of [1, -1]) b.at(sx * 0.088, 1.43, 0.02, 0, () => b.cyl(0, -0.015, 0, 0.032, 0.032, 0.03, 12, { mat: "hair", color: cfg.accessoryColor ?? "#4fb3c8" }), 0.4, sx * Math.PI / 2);
  }
  if (acc.includes("cap")) {
    b.skin = rigid("head");
    b.at(0, HB + 0.13 * hs, 0.005, 0, () => b.sphere(0, 0, 0, 0.104 * hs, 0.118 * hs, 0.11 * hs, 14, { mat: "character", color: cfg.accessoryColor ?? "#1f2a44", hemi: true }), -0.3);
    b.at(0, HB + 0.175 * hs, 0.1 * hs, 0, () => b.sphere(0, 0, 0.04, 0.075 * hs, 0.008, 0.07 * hs, 10, { mat: "character", color: cfg.accessoryColor ?? "#1f2a44" }), 0.15);
  }
  if (acc.includes("scarf")) {
    b.skin = rigid("chest");
    b.loft([{ c: V(0, 1.42, 0.0), rx: 0.11, rz: 0.09 }, { c: V(0, 1.47, 0.005), rx: 0.085, rz: 0.075 }], 14, { mat: "character", color: cfg.accessoryColor ?? "#d9675e", caps: false });
    lock(b, [V(0.04, 1.42, 0.09), V(0.05, 1.3, 0.12), V(0.05, 1.16, 0.12)], 0.06, 0.012, V(0, 0, 1), cfg.accessoryColor ?? "#d9675e");
  }
}
