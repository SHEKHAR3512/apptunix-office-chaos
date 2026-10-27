import { Color3, Vector3 } from "@babylonjs/core";
import type { GeometryBuilder, LoftRing } from "../../assets/GeometryBuilder";
import type { CharacterAppearanceConfig } from "./CharacterConfig";
import { accessories, hand, hairShell, lock, neckAndHead, rimProfile, Ring5, tri, withBands } from "./CharacterAppearance";
import { BoneName, chain, DEFAULT_PROPORTIONS, HEAD_BASE, jointPositions, Proportions, rigid } from "./Skeleton";

/**
 * DRAGON — hand-tuned hero model on the shared rig.
 * Silhouette goals: slouchy oversized hoodie with real shoulder slope and a draped hood,
 * tapered jeans with ankle cuffs, chunky sneakers, and big swept anime hair clumps.
 */

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const lerp = (a: Vector3, b: Vector3, t: number) => Vector3.Lerp(a, b, t);
const shade = (hex: string, k: number): string => {
  const c = Color3.FromHexString(hex);
  return new Color3(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k)).toHexString();
};

/** Rounder, younger face: short soft chin, full cheeks, broad cranium. dy, rx, rz, cz */
const HERO_HEAD: [number, number, number, number][] = [
  [0.012, 0.03, 0.035, 0.02],
  [0.028, 0.052, 0.058, 0.034],
  [0.046, 0.072, 0.077, 0.028],
  [0.068, 0.086, 0.09, 0.018],
  [0.094, 0.093, 0.096, 0.01],
  [0.122, 0.096, 0.099, 0.006],
  [0.152, 0.097, 0.1, 0.002],
  [0.182, 0.092, 0.097, -0.004],
  [0.206, 0.078, 0.085, -0.01],
  [0.224, 0.052, 0.06, -0.013],
  [0.233, 0.016, 0.02, -0.014],
];

export function buildDragonHero(b: GeometryBuilder, cfg: CharacterAppearanceConfig): void {
  const p: Proportions = { ...DEFAULT_PROPORTIONS, ...cfg.body, height: 1.74, head: 1.08 };
  const J = jointPositions(p);
  b.measure("character:dragonHero", () => {
    hoodie(b, cfg, J);
    for (const sx of [1, -1] as const) { leg(b, cfg, J, sx); sleeve(b, cfg, J, sx); hand(b, cfg, J, sx); }
    neckAndHead(b, { ...cfg, eyes: { ...cfg.eyes, size: 1.12 } }, p, J, HERO_HEAD, 0.75);
    heroHair(b, cfg, p);
    accessories(b, cfg, p, J);
  });
  b.skin = null;
}

// ------------------------------------------------------------------------------------- hoodie

function hoodie(b: GeometryBuilder, cfg: CharacterAppearanceConfig, J: Record<BoneName, Vector3>): void {
  const T = cfg.top.color, T2 = shade(T, 0.82), Bt = cfg.bottom.color, acc = cfg.top.secondary ?? "#f08a3c";
  // y, rx, rz, cz, colour. Loose fit: waist barely narrower than the chest, sloped shoulders
  const rings: Ring5[] = [
    [0.80, 0.105, 0.088, 0.0, Bt],
    [0.86, 0.15, 0.098, -0.006, Bt],
    [0.895, 0.168, 0.106, 0.0, T2],   // ribbed hem band
    [0.94, 0.17, 0.108, 0.004, T2],
    [0.948, 0.172, 0.11, 0.005, T],   // slight blouse over the hem
    [1.03, 0.168, 0.11, 0.012, T],
    [1.13, 0.166, 0.108, 0.014, T],
    [1.24, 0.174, 0.112, 0.014, T],
    [1.3, 0.178, 0.11, 0.01, T],
    [1.345, 0.168, 0.102, 0.004, T],  // shoulder line
    [1.385, 0.142, 0.09, 0.002, T],
    [1.42, 0.105, 0.076, 0.0, T],     // trapezius slope
    [1.462, 0.072, 0.06, 0.004, T],
  ];
  b.skin = chain(["hips", "spine", "chest", "neck"], [V(0, 0.76, 0), J.spine, J.chest, J.neck, V(0, 1.56, 0)], 0.08);
  const banded = withBands(rings, [[0.895, 0.94, T2]]);
  b.loft(banded.map(([y, rx, rz, cz, c]) => ({ c: V(0, y, cz), rx, rz, color: c })), 20, { mat: "character" });
  // rib lines on the hem band
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.85 + (i / 13) * Math.PI * 1.7;
    b.box(Math.sin(a) * 0.17, 0.898, Math.cos(a) * 0.108 + 0.002, 0.004, 0.04, 0.003, { mat: "character", color: shade(T, 0.7), r: 0 });
  }

  // draped hood: thick cowl around the back of the neck + soft hood body on the upper back
  b.skin = chain(["chest", "neck"], [V(0, 1.3, 0), J.neck, V(0, 1.56, 0)], 0.06);
  const cowl: LoftRing[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI * 0.78 + (i / 12) * Math.PI * 1.56; // front-left → back → front-right
    const back = Math.cos(a) < 0 ? 1 : 0;
    cowl.push({ c: V(Math.sin(a) * 0.095, 1.452 + back * 0.012, Math.cos(a) * -0.085 + 0.008), rx: 0.03 + 0.012 * Math.abs(Math.cos(a)), rz: 0.026 });
  }
  b.loft(cowl.map((r) => ({ ...r, c: new Vector3(r.c.x, r.c.y, -r.c.z) })), 10, { mat: "character", color: shade(T, 0.93) });
  b.loft([
    { c: V(0, 1.36, -0.1), rx: 0.1, rz: 0.03 },
    { c: V(0, 1.42, -0.118), rx: 0.118, rz: 0.04 },
    { c: V(0, 1.48, -0.112), rx: 0.11, rz: 0.042 },
    { c: V(0, 1.52, -0.095), rx: 0.08, rz: 0.034 },
    { c: V(0, 1.535, -0.08), rx: 0.03, rz: 0.012 },
  ], 14, { mat: "character", color: shade(T, 0.9), front: V(0, 0, -1) });
  // inner hood lining visible at the neck opening
  b.loft([{ c: V(0, 1.462, 0.004), rx: 0.066, rz: 0.056 }, { c: V(0, 1.475, 0.0), rx: 0.064, rz: 0.054 }], 14, { mat: "character", color: acc, caps: false });

  // drawstrings with metal aglets
  b.skin = rigid("chest");
  for (const sx of [1, -1]) {
    b.tube([V(sx * 0.034, 1.448, 0.082), V(sx * 0.038, 1.39, 0.108), V(sx * 0.032, 1.30, 0.116)], 0.0045, 6, { mat: "character", color: acc });
    b.cyl(sx * 0.032, 1.27, 0.116, 0.006, 0.006, 0.03, 8, { mat: "hair", color: "#c9ccd2" });
  }
  // kangaroo pocket with stitched edges
  b.skin = chain(["spine", "chest"], [V(0, 0.9, 0), J.chest, J.neck], 0.08);
  b.box(0, 0.975, 0.112, 0.25, 0.13, 0.016, { mat: "character", color: shade(T, 0.95), r: 0.02, seg: 2 });
  for (const sx of [1, -1]) b.box(sx * 0.118, 0.98, 0.121, 0.012, 0.1, 0.004, { mat: "character", color: T2, r: 0 });
  // small chest logo patch (orange dragon mark)
  b.skin = rigid("chest");
  b.sphere(0.07, 1.30, 0.122, 0.018, 0.018, 0.005, 8, { mat: "character", color: acc });
  b.sphere(0.077, 1.305, 0.127, 0.006, 0.006, 0.002, 6, { mat: "character", color: "#f3efe8" });
}

// ------------------------------------------------------------------------------------- sleeves

function sleeve(b: GeometryBuilder, cfg: CharacterAppearanceConfig, J: Record<BoneName, Vector3>, sx: 1 | -1): void {
  const L = sx > 0;
  const S = L ? J.upperArmL : J.upperArmR, E = L ? J.foreArmL : J.foreArmR, W = L ? J.handL : J.handR;
  const T = cfg.top.color, cuff = shade(T, 0.82), Sk = cfg.skin;
  b.skin = chain(["chest", L ? "upperArmL" : "upperArmR", L ? "foreArmL" : "foreArmR"], [L ? J.clavL : J.clavR, S, E, W], 0.11);
  // baggy sleeve starting inside the shoulder, slight bunching at the elbow, ribbed cuff
  // rounded shoulder dome: the sleeve rises over the shoulder joint from inside the torso
  const keyed: Ring5[] = [
    [-0.32, 0.03, 0.05, 0, T],
    [-0.22, 0.055, 0.064, 0, T],
    [-0.1, 0.063, 0.065, 0, T],
    [0.0, 0.064, 0.062, 0, T],
    [0.45, 0.058, 0.058, 0, T],
    [0.9, 0.054, 0.054, 0, T],
    [1.0, 0.056, 0.055, 0, T],
    [1.4, 0.052, 0.05, 0, T],
    [1.78, 0.046, 0.044, 0, T],
    [1.8, 0.04, 0.038, 0, cuff],
    [1.93, 0.037, 0.035, 0, cuff],
    [1.95, 0.03, 0.027, 0, Sk],
    [2.02, 0.027, 0.024, 0, Sk],
  ];
  // t < 0 walks up and inward along the top of the shoulder (dome), 0..1 upper arm, 1..2 forearm
  // the sleeve hangs ~5 cm below the joint so the shoulder slopes from the neck into the arm
  const S2 = S.add(V(0, -0.05, 0));
  const at = (t: number) => (t < 0 ? S2.add(V(sx * t * 0.18, -t * 0.03, 0)) : t <= 1 ? lerp(S2, E, t) : lerp(E, W, t - 1));
  const armRings = withBands(keyed, [[1.8, 1.93, cuff], [1.95, 2.02, Sk]]);
  b.loft(armRings.map(([t, rx, rz, , col]) => ({ c: at(t), rx, rz, color: col })), 12, { mat: "character" });
}

// ------------------------------------------------------------------------------------- legs & sneakers

function leg(b: GeometryBuilder, cfg: CharacterAppearanceConfig, J: Record<BoneName, Vector3>, sx: 1 | -1): void {
  const L = sx > 0;
  const hip = L ? J.thighL : J.thighR, knee = L ? J.shinL : J.shinR, ankle = L ? J.footL : J.footR, toe = L ? J.toeL : J.toeR;
  const Bt = cfg.bottom.color, cuffC = shade(Bt, 1.35), x = hip.x;
  b.skin = chain(["hips", L ? "thighL" : "thighR", L ? "shinL" : "shinR"], [V(x, 1.08, 0), hip, knee, ankle], 0.07);
  const keyed: Ring5[] = [
    [1.0, 0.092, 0.094, 0, Bt],
    [0.88, 0.09, 0.096, -0.004, Bt],
    [0.72, 0.078, 0.084, 0.004, Bt],
    [0.58, 0.066, 0.07, 0.01, Bt],
    [0.49, 0.06, 0.066, 0.008, Bt],   // knee
    [0.38, 0.056, 0.06, -0.004, Bt],
    [0.24, 0.05, 0.052, -0.004, Bt],
    [0.175, 0.052, 0.054, -0.004, Bt],
    [0.16, 0.056, 0.058, -0.004, cuffC], // rolled cuff
    [0.12, 0.056, 0.058, -0.004, cuffC],
    [0.11, 0.05, 0.052, -0.004, Bt],
  ];
  const banded = withBands(keyed.slice().reverse(), [[0.12, 0.16, cuffC]]);
  b.loft(banded.map(([y, rx, rz, cz, c]) => ({ c: V(y > 0.5 ? x : lerp(V(x, 0, 0), V(knee.x, 0, 0), 1).x, y, cz), rx, rz, color: c })), 14, { mat: "character" });
  // seam + knee crease
  b.tube([V(x + sx * 0.089, 0.86, 0), V(x + sx * 0.065, 0.5, 0.008), V(x + sx * 0.05, 0.17, 0)], 0.0025, 4, { mat: "character", color: shade(Bt, 1.3), caps: false });
  b.tube([V(x - 0.035, 0.5, 0.068), V(x, 0.505, 0.072), V(x + 0.035, 0.5, 0.068)], 0.002, 4, { mat: "character", color: shade(Bt, 0.75), caps: false });

  // chunky sneaker: thick sole with accent stripe, padded collar, toe cap, laces, heel tab
  b.skin = chain([L ? "footL" : "footR", L ? "toeL" : "toeR"], [V(ankle.x, 0.14, -0.02), toe, toe.add(V(0, 0, 0.1))], 0.04);
  const S = cfg.shoes.color, sole = cfg.shoes.sole ?? "#f08a3c", fx = ankle.x + sx * 0.002;
  b.box(fx, 0.0, 0.045, 0.108, 0.03, 0.262, { mat: "character", color: "#f6f3ee", r: 0.014, seg: 2 });
  b.box(fx, 0.012, 0.045, 0.111, 0.008, 0.264, { mat: "character", color: sole, r: 0.004 });
  b.loft([
    { c: V(fx, 0.115, -0.05), rx: 0.044, rz: 0.042 },
    { c: V(fx, 0.06, -0.075), rx: 0.046, rz: 0.036 },
    { c: V(fx, 0.06, -0.02), rx: 0.052, rz: 0.056 },
    { c: V(fx, 0.058, 0.06), rx: 0.053, rz: 0.046 },
    { c: V(fx, 0.05, 0.125), rx: 0.048, rz: 0.034 },
    { c: V(fx, 0.04, 0.162), rx: 0.034, rz: 0.022 },
  ], 14, { mat: "character", color: S, front: V(0, 1, 0) });
  b.sphere(fx, 0.042, 0.135, 0.044, 0.02, 0.036, 8, { mat: "character", color: "#e6e1d8", hemi: true }); // toe cap
  b.loft([{ c: V(fx, 0.128, -0.045), rx: 0.046, rz: 0.044 }, { c: V(fx, 0.14, -0.05), rx: 0.044, rz: 0.042 }], 12, { mat: "character", color: sole, caps: false }); // collar
  b.box(fx, 0.095, -0.088, 0.02, 0.04, 0.008, { mat: "character", color: sole, r: 0.004 }); // heel tab
  for (let i = 0; i < 4; i++) b.box(fx, 0.098 - i * 0.012, 0.012 + i * 0.024, 0.044, 0.006, 0.007, { mat: "character", color: "#2b2d33", r: 0.002 });
  b.at(fx + sx * 0.052, 0.055, 0.025, 0, () => b.extrude([[-0.05, -0.012], [0.04, 0.012], [0.05, 0.0], [-0.03, -0.022]], -0.002, 0.004, { mat: "character", color: sole }), 0, 0);
}

// ------------------------------------------------------------------------------------- hair

/** Big swept anime clumps over a seamless cap: reads clearly at gameplay distance. */
function heroHair(b: GeometryBuilder, cfg: CharacterAppearanceConfig, p: Proportions): void {
  const hs = p.head, HB = HEAD_BASE, H = cfg.hair.color, Hl = cfg.hair.highlight ?? shade(H, 1.3);
  b.skin = rigid("head");
  hairShell(b, hs, {
    color: H, lift: 0.014 * hs, scale: 1.1,
    rim: (th) => rimProfile(th, 0.19, 0.12, 0.05) - tri(th * 3.2) * 0.02 * Math.max(0, -Math.cos(th)),
  });
  // a clump: from root on the scalp, sweeping in `dir`, tapering to a point
  const clump = (root: Vector3, mid: Vector3, tip: Vector3, w: number, out: Vector3, col = H) => {
    const path = [root, Vector3.Lerp(root, mid, 0.6), mid, Vector3.Lerp(mid, tip, 0.5), tip];
    lock(b, path, w * hs, 0.022 * hs, out, col);
  };
  const C = (x: number, y: number, z: number) => V(x * hs, HB + y * hs, z * hs);
  const fwd = V(0, 0.3, 1), up = V(0, 1, 0);
  // fringe: four clumps sweeping across the forehead to DRAGON's right, the last one longest
  clump(C(0.05, 0.235, 0.06), C(0.02, 0.215, 0.115), C(-0.03, 0.165, 0.122), 0.07, fwd);
  clump(C(0.0, 0.24, 0.06), C(-0.03, 0.212, 0.115), C(-0.07, 0.158, 0.112), 0.07, fwd, Hl);
  clump(C(-0.04, 0.235, 0.05), C(-0.07, 0.2, 0.105), C(-0.098, 0.14, 0.09), 0.064, fwd);
  clump(C(0.08, 0.22, 0.04), C(0.075, 0.195, 0.1), C(0.05, 0.155, 0.118), 0.055, fwd);
  // sides over the ears
  for (const sx of [1, -1]) {
    clump(C(sx * 0.09, 0.19, 0.02), C(sx * 0.108, 0.13, 0.03), C(sx * 0.1, 0.075, 0.045), 0.055, V(sx, 0, 0.2));
    clump(C(sx * 0.085, 0.19, -0.04), C(sx * 0.11, 0.13, -0.05), C(sx * 0.098, 0.08, -0.06), 0.06, V(sx, 0, -0.2));
  }
  // crown spikes swept back and up (silhouette)
  clump(C(0.02, 0.255, 0.0), C(0.03, 0.28, -0.06), C(0.04, 0.27, -0.13), 0.08, up);
  clump(C(-0.03, 0.25, -0.01), C(-0.05, 0.27, -0.07), C(-0.07, 0.25, -0.13), 0.075, up, Hl);
  // back of the head: clumps falling to the nape
  for (const k of [-1, 0, 1]) clump(C(k * 0.05, 0.22, -0.08), C(k * 0.065, 0.14, -0.12), C(k * 0.06, 0.06, -0.105), 0.07, V(k * 0.4, 0, -1));
}
