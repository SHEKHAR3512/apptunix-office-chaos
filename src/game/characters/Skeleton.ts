import { Vector3 } from "@babylonjs/core";
import type { SkinFn } from "../../assets/GeometryBuilder";

/**
 * Shared humanoid rig. Every character in the game uses this exact hierarchy so poses,
 * clips and props are interchangeable. Bind pose: relaxed A-pose, facing +Z, feet at y = 0.
 */
export const BONES = [
  "root", "hips", "spine", "chest", "neck", "head", "jaw", "eyeL", "eyeR", "browL", "browR",
  "clavL", "upperArmL", "foreArmL", "handL", "fingersL", "thumbL",
  "clavR", "upperArmR", "foreArmR", "handR", "fingersR", "thumbR",
  "thighL", "shinL", "footL", "toeL", "thighR", "shinR", "footR", "toeR",
] as const;
export type BoneName = (typeof BONES)[number];
export const BONE_INDEX: Record<BoneName, number> = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

export const PARENT: Record<BoneName, BoneName | null> = {
  root: null, hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck", jaw: "head",
  eyeL: "head", eyeR: "head", browL: "head", browR: "head",
  clavL: "chest", upperArmL: "clavL", foreArmL: "upperArmL", handL: "foreArmL", fingersL: "handL", thumbL: "handL",
  clavR: "chest", upperArmR: "clavR", foreArmR: "upperArmR", handR: "foreArmR", fingersR: "handR", thumbR: "handR",
  thighL: "hips", shinL: "thighL", footL: "shinL", toeL: "footL",
  thighR: "hips", shinR: "thighR", footR: "shinR", toeR: "footR",
};

export interface Proportions {
  height: number;     // metres, top of head
  shoulder: number;   // half shoulder width at the joint
  hip: number;        // half distance between hip joints
  girth: number;      // 1 = average build
  belly: number;      // 0..1 extra belly volume
  chest: number;      // 0..1 chest volume (female shape uses this)
  head: number;       // head scale (stylised: slightly large)
  female: boolean;
}

/** Head geometry anchors (character space, unscaled). */
export const HEAD_BASE = 1.5;
export const EYE_DY = 0.118;

export const DEFAULT_PROPORTIONS: Proportions = { height: 1.74, shoulder: 0.185, hip: 0.095, girth: 1, belly: 0, chest: 0, head: 1.07, female: false };

/** Absolute bind positions in character space for a given body. */
export function jointPositions(p: Proportions): Record<BoneName, Vector3> {
  const s = p.height / 1.74;
  const V = (x: number, y: number, z: number) => new Vector3(x, y * s, z * s);
  const sh = p.shoulder * s, hp = p.hip * s;
  const elbow = V(sh + 0.058, 1.146, -0.012), wrist = V(sh + 0.105, 0.9, 0.0);
  const j: Partial<Record<BoneName, Vector3>> = {
    root: V(0, 0, 0), hips: V(0, 0.96, 0), spine: V(0, 1.1, 0), chest: V(0, 1.28, 0), neck: V(0, 1.465, 0),
    head: V(0, 1.51, 0.005), jaw: V(0, HEAD_BASE + 0.045 * p.head, 0.09 * p.head),
    eyeL: V(0.041 * p.head, HEAD_BASE + EYE_DY * p.head, 0.094 * p.head), eyeR: V(-0.041 * p.head, HEAD_BASE + EYE_DY * p.head, 0.094 * p.head),
    browL: V(0.043 * p.head, HEAD_BASE + (EYE_DY + 0.04) * p.head, 0.099 * p.head), browR: V(-0.043 * p.head, HEAD_BASE + (EYE_DY + 0.04) * p.head, 0.099 * p.head),
    clavL: V(0.03, 1.43, 0), upperArmL: new Vector3(sh, 1.42 * s, 0), foreArmL: elbow, handL: wrist,
    fingersL: wrist.add(V(0.008, -0.088, 0.004)), thumbL: wrist.add(V(-0.004, -0.028, 0.026)),
    thighL: new Vector3(hp, 0.905 * s, 0), shinL: new Vector3(hp + 0.004, 0.49 * s, 0.004), footL: new Vector3(hp + 0.006, 0.075 * s, -0.01), toeL: new Vector3(hp + 0.008, 0.025 * s, 0.12 * s),
  };
  const mirror = (v: Vector3) => new Vector3(-v.x, v.y, v.z);
  j.clavR = mirror(j.clavL!); j.upperArmR = mirror(j.upperArmL!); j.foreArmR = mirror(j.foreArmL!); j.handR = mirror(j.handL!);
  j.fingersR = mirror(j.fingersL!); j.thumbR = mirror(j.thumbL!);
  j.thighR = mirror(j.thighL!); j.shinR = mirror(j.shinL!); j.footR = mirror(j.footL!); j.toeR = mirror(j.toeL!);
  return j as Record<BoneName, Vector3>;
}

// ---------------------------------------------------------------------------------------------
// Skin weight helpers
// ---------------------------------------------------------------------------------------------

export const rigid = (bone: BoneName): SkinFn => {
  const i = BONE_INDEX[bone];
  return () => [i, 1, i, 0];
};

/**
 * Smooth weights along a bone chain. joints[k]→joints[k+1] belongs to bones[k]; vertices within
 * `blend` metres of an interior joint are shared between the adjacent bones (smoothstep).
 */
export function chain(bones: BoneName[], joints: Vector3[], blend = 0.06): SkinFn {
  const ids = bones.map((b) => BONE_INDEX[b]);
  const segs = bones.map((_, k) => ({ a: joints[k], b: joints[k + 1], d: joints[k + 1].subtract(joints[k]) }));
  return (x, y, z) => {
    let best = 0, bestD = Infinity, bestU = 0;
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k];
      const L2 = s.d.lengthSquared();
      let u = ((x - s.a.x) * s.d.x + (y - s.a.y) * s.d.y + (z - s.a.z) * s.d.z) / L2;
      const uc = Math.max(0, Math.min(1, u));
      const px = s.a.x + s.d.x * uc - x, py = s.a.y + s.d.y * uc - y, pz = s.a.z + s.d.z * uc - z;
      const dd = px * px + py * py + pz * pz;
      if (dd < bestD) { bestD = dd; best = k; bestU = u; }
    }
    const L = segs[best].d.length();
    const fromStart = bestU * L, fromEnd = (1 - bestU) * L;
    const sm = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
    if (best > 0 && fromStart < blend) {
      const wPrev = Math.max(0, Math.min(0.5, 0.5 - sm(fromStart / blend) * 0.5));
      return [ids[best], 1 - wPrev, ids[best - 1], wPrev];
    }
    if (best < segs.length - 1 && fromEnd < blend) {
      const wNext = Math.max(0, Math.min(0.5, 0.5 - sm(fromEnd / blend) * 0.5));
      return [ids[best], 1 - wNext, ids[best + 1], wNext];
    }
    return [ids[best], 1, ids[best], 0];
  };
}
