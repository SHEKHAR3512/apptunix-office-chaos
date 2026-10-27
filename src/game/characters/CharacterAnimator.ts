import { TransformNode, Vector3 } from "@babylonjs/core";
import type { Expression } from "./CharacterConfig";
import { BONE_INDEX, BONES, BoneName } from "./Skeleton";

/**
 * Procedural, data-light animation for the shared rig.
 *
 * Base layer: one active state cross-fading from the previous (Idle, Locomotion, SitDown,
 * Sitting, StandUp, Typing, Talking, Listening, TurnInPlace...). Locomotion blends
 * idle → walk → run by ground speed with a single phase advanced by speed / stride length,
 * so feet don't skate. Gesture layer (upper body): Wave, Drink, Phone, Interact, Talk-gestures.
 * Additive: breathing, look-at (neck/head/eyes), blinking, expressions, lip flap.
 *
 * Angle conventions (character faces +Z, left = +X): rot.x < 0 swings a limb forward,
 * rot.x > 0 leans the spine forward / bends knees back, rot.z > 0 moves a left limb outward.
 */

export type BaseState =
  | "Idle" | "Locomotion" | "TurnLeft" | "TurnRight" | "Stop" | "SitDown" | "Sitting" | "StandUp"
  | "Typing" | "Talking" | "Listening" | "SitTalking" | "SitListening";
export type Gesture = "none" | "Waving" | "DrinkingWater" | "UsingPhone" | "Interacting" | "Gesturing" | "Pointing";

const NB = BONES.length;
const STRIDE = 3; // euler xyz
type Pose = { r: Float32Array; hip: Float32Array; face: Float32Array }; // face: blink, mouthOpen, smile, browUp, browAngle
const newPose = (): Pose => ({ r: new Float32Array(NB * STRIDE), hip: new Float32Array(3), face: new Float32Array(5) });
const I = BONE_INDEX;

function set(p: Pose, b: BoneName, x: number, y = 0, z = 0): void { const o = I[b] * 3; p.r[o] += x; p.r[o + 1] += y; p.r[o + 2] += z; }
function both(p: Pose, l: BoneName, r: BoneName, x: number, y: number, z: number): void { set(p, l, x, y, z); set(p, r, x, -y, -z); }
const sm = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

export interface AnimParams {
  speed: number;          // ground speed m/s
  sideways: number;       // -1..1 strafe component (for strafing / backpedal)
  backward: boolean;
  turnRate: number;       // rad/s (for turn-in-place)
  energy: number;         // persona
  posture: number;        // persona 0 slouch .. 1 upright
  gestures: number;       // persona gesture amplitude
  lean?: number;          // + forward (accelerating), - back (braking)
  bank?: number;          // roll into turns
}

export class CharacterAnimator {
  private readonly nodes: TransformNode[];
  private readonly bind: Vector3[];
  base: BaseState = "Idle";
  private prevBase: BaseState = "Idle";
  private fade = 1;
  private fadeTime = 0.3;
  private stateT = 0;
  private prevStateT = 0;
  gesture: Gesture = "none";
  private gestureW = 0;
  private gestureT = 0;
  private phase = 0;
  private t = 0;
  private readonly seed: number;
  private blinkT = 2;
  private blink = 0;
  expression: Expression = "neutral";
  private exprW = new Float32Array(5);
  talking = false;
  private talkW = 0;
  lookTarget: Vector3 | null = null;
  private look = new Float32Array(3); // yaw, pitch, eye
  readonly params: AnimParams = { speed: 0, sideways: 0, backward: false, turnRate: 0, energy: 0.5, posture: 0.6, gestures: 0.6, lean: 0, bank: 0 };
  private leanS = 0;
  private bankS = 0;
  /** Duration of the transitional states; callers can listen for completion. */
  readonly durations: Partial<Record<BaseState, number>> = { SitDown: 1.15, StandUp: 1.0 };
  onStateDone: ((s: BaseState) => void) | null = null;
  private poses = { a: newPose(), b: newPose(), out: newPose(), g: newPose() };
  /** Skip work when far away (NPC LOD): evaluate every n-th frame. */
  lodSkip = 0;
  private skipCount = 0;
  private accDt = 0;

  constructor(nodes: Record<BoneName, TransformNode>, seed = 1) {
    this.nodes = BONES.map((b) => nodes[b]);
    this.bind = this.nodes.map((n) => n.position.clone());
    this.seed = seed;
    this.t = (seed % 97) * 0.37;
    this.blinkT = 1 + (seed % 7) * 0.4;
  }

  play(state: BaseState, fade = 0.3): void {
    if (state === this.base) return;
    this.prevBase = this.base;
    this.prevStateT = this.stateT;
    this.base = state;
    this.stateT = 0;
    this.fade = 0;
    this.fadeTime = fade;
  }

  setGesture(g: Gesture): void {
    if (g === this.gesture) return;
    this.gesture = g;
    this.gestureT = 0;
  }

  get stateTime(): number { return this.stateT; }

  update(dt: number, lookOrigin?: { pos: Vector3; yaw: number }): void {
    // LOD throttling (accumulate time so motion speed stays correct)
    this.accDt += dt;
    if (this.lodSkip > 0 && this.skipCount++ < this.lodSkip) return;
    this.skipCount = 0;
    dt = Math.min(0.1, this.accDt);
    this.accDt = 0;

    this.t += dt;
    this.stateT += dt;
    this.prevStateT += dt;
    this.fade = Math.min(1, this.fade + dt / Math.max(0.01, this.fadeTime));
    const dur = this.durations[this.base];
    if (dur !== undefined && this.stateT >= dur) {
      const done = this.base;
      this.play(done === "SitDown" ? "Sitting" : "Idle", 0.15);
      this.onStateDone?.(done);
    }
    // locomotion phase: stride length grows with speed (walk 1.45 m → run 2.5 m per cycle)
    const sp = this.params.speed;
    const stride = 1.45 + sm((sp - 2.2) / 2.2) * 1.05;
    this.phase = (this.phase + (dt * sp) / stride * (this.params.backward ? -1 : 1) + 10) % 1;

    const { a, b, out, g } = this.poses;
    this.evalBase(this.base, this.stateT, a);
    if (this.fade < 1) {
      this.evalBase(this.prevBase, this.prevStateT, b);
      const w = sm(this.fade);
      lerpPose(b, a, w, out);
    } else copyPose(a, out);

    // gesture layer (upper body), fades in and out
    const wantG = this.gesture !== "none" ? 1 : 0;
    this.gestureW += (wantG - this.gestureW) * Math.min(1, dt * 5);
    this.gestureT += dt;
    if (this.gestureW > 0.01) {
      clearPose(g);
      this.evalGesture(this.gesture, this.gestureT, g);
      blendUpper(out, g, sm(this.gestureW));
    }

    // talking lip flap + talk-gestures layered on top
    this.talkW += ((this.talking ? 1 : 0) - this.talkW) * Math.min(1, dt * 8);
    if (this.talkW > 0.01) {
      const syl = Math.abs(Math.sin(this.t * 11.0 + Math.sin(this.t * 3.1) * 2)) * (0.6 + 0.4 * Math.sin(this.t * 2.3));
      out.face[1] += syl * this.talkW;
    }

    // expressions
    const target = EXPRESSIONS[this.expression];
    for (let i = 0; i < 5; i++) this.exprW[i] += (target[i] - this.exprW[i]) * Math.min(1, dt * 6);
    for (let i = 0; i < 5; i++) out.face[i] += this.exprW[i];

    // blinking
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = 1.8 + ((this.seed * 31 + Math.floor(this.t)) % 37) / 10; }
    if (this.blink > 0) { this.blink -= dt; out.face[0] = Math.max(out.face[0], Math.sin(Math.max(0, this.blink) / 0.13 * Math.PI)); }

    // dynamic weight shift (smoothed): pitch from the hips, roll from the root, head counter-rotates
    this.leanS += ((this.params.lean ?? 0) - this.leanS) * Math.min(1, dt * 7);
    this.bankS += ((this.params.bank ?? 0) - this.bankS) * Math.min(1, dt * 6);
    if (this.base === "Locomotion" || this.base === "Idle" || this.base === "Stop") {
      set(out, "hips", this.leanS * 0.45, 0, this.bankS);
      set(out, "spine", this.leanS * 0.35, 0, -this.bankS * 0.25);
      set(out, "chest", this.leanS * 0.2, 0, 0);
      set(out, "neck", -this.leanS * 0.5, 0, -this.bankS * 0.4);
      set(out, "head", -this.leanS * 0.3, 0, -this.bankS * 0.3);
      // braking: plant a wider stance and bend the knees
      const brk = Math.max(0, -this.leanS);
      set(out, "thighL", -brk * 0.5, 0, 0); set(out, "thighR", -brk * 0.5, 0, 0);
      set(out, "shinL", brk * 0.6, 0, 0); set(out, "shinR", brk * 0.6, 0, 0);
      out.hip[1] -= brk * 0.08;
    }

    // look-at (head/neck/eyes)
    let ly = 0, lp = 0;
    if (this.lookTarget && lookOrigin) {
      const d = this.lookTarget.subtract(lookOrigin.pos.add(new Vector3(0, 1.6, 0)));
      const c = Math.cos(-lookOrigin.yaw), s = Math.sin(-lookOrigin.yaw);
      const lx = d.x * c + d.z * s, lz = -d.x * s + d.z * c;
      ly = Math.atan2(lx, lz);
      lp = -Math.atan2(d.y, Math.hypot(lx, lz));
      if (Math.abs(ly) > 1.9) { ly = 0; lp = 0; }
      ly = Math.max(-1.05, Math.min(1.05, ly));
      lp = Math.max(-0.45, Math.min(0.5, lp));
    }
    const k = Math.min(1, dt * 4);
    this.look[0] += (ly - this.look[0]) * k;
    this.look[1] += (lp - this.look[1]) * k;
    set(out, "neck", this.look[1] * 0.35, this.look[0] * 0.35, 0);
    set(out, "head", this.look[1] * 0.55, this.look[0] * 0.55, 0);
    const eyeShift = Math.max(-1, Math.min(1, (ly - this.look[0]) * 2 + this.look[0] * 0.25));

    this.apply(out, eyeShift);
  }

  private apply(p: Pose, eyeShift: number): void {
    for (let i = 0; i < NB; i++) {
      const n = this.nodes[i];
      n.rotation.set(p.r[i * 3], p.r[i * 3 + 1], p.r[i * 3 + 2]);
    }
    const hips = this.nodes[I.hips], bh = this.bind[I.hips];
    hips.position.set(bh.x + p.hip[0], bh.y + p.hip[1], bh.z + p.hip[2]);
    const [blink, mouth, smile, browUp, browAng] = p.face;
    const open = 1 - Math.min(0.92, Math.max(0, blink));
    for (const e of [I.eyeL, I.eyeR]) {
      this.nodes[e].scaling.set(1, open * (1 - Math.max(0, smile) * 0.12), 1);
      this.nodes[e].position.x = this.bind[e].x + eyeShift * 0.0035;
    }
    const jaw = this.nodes[I.jaw];
    jaw.scaling.set(1 + smile * 0.18 - Math.max(0, mouth) * 0.12, 1 + Math.max(0, mouth) * 2.6 - smile * 0.1, 1);
    for (const [bi, sgn] of [[I.browL, 1], [I.browR, -1]] as const) {
      const n = this.nodes[bi];
      n.position.y = this.bind[bi].y + browUp * 0.006;
      n.rotation.z = browAng * 0.25 * sgn;
    }
  }

  // ---------------------------------------------------------------------------------------- clips

  private evalBase(s: BaseState, t: number, p: Pose): void {
    clearPose(p);
    const P = this.params;
    switch (s) {
      case "Idle": case "Stop": this.idle(p, t); break;
      case "Locomotion": {
        const sp = P.speed;
        const wWalk = sm(sp / 0.9), wRun = sm((sp - 2.6) / 1.6);
        if (wWalk < 0.999) { const tmp = newPoseCached(this, 4); clearPose(tmp); this.idle(tmp, t); scaleAdd(p, tmp, 1 - wWalk); }
        if (wWalk > 0.001) {
          const w = newPoseCached(this, 0); clearPose(w); this.gait(w, this.phase, 0);
          const r = newPoseCached(this, 1); clearPose(r); this.gait(r, this.phase, 1);
          const tmp2 = newPoseCached(this, 2); lerpPose(w, r, wRun, tmp2);
          scaleAdd(p, tmp2, wWalk);
        }
        break;
      }
      case "TurnLeft": case "TurnRight": this.idle(p, t); this.turnStep(p, t, s === "TurnLeft" ? 1 : -1); break;
      case "SitDown": { const k = sm(t / (this.durations.SitDown ?? 1)); this.blendSit(p, t, k); break; }
      case "StandUp": { const k = 1 - sm(t / (this.durations.StandUp ?? 1)); this.blendSit(p, t, k); break; }
      case "Sitting": this.sitting(p, t); break;
      case "Typing": this.sitting(p, t); this.typing(p, t); break;
      case "SitTalking": this.sitting(p, t); this.talkGestures(p, t, 0.7); break;
      case "SitListening": this.sitting(p, t); this.listening(p, t); break;
      case "Talking": this.idle(p, t, 0.5); this.talkGestures(p, t, 1); break;
      case "Listening": this.idle(p, t, 0.6); this.listening(p, t); break;
    }
  }

  private idle(p: Pose, t: number, calm = 1): void {
    const P = this.params, sd = this.seed;
    const br = Math.sin(t * 1.55 + sd);
    const shift = Math.sin(t * 0.31 + sd * 0.7);
    const slouch = (1 - P.posture) * 0.12;
    set(p, "spine", 0.02 + slouch * 0.5 + br * 0.008, shift * 0.02, 0);
    set(p, "chest", -0.02 + slouch + br * 0.018 * calm, 0, shift * -0.01);
    set(p, "neck", 0.04 - slouch * 0.6, 0, 0);
    p.hip[0] = shift * 0.012; p.hip[1] = -0.004 + Math.abs(shift) * -0.006;
    set(p, "hips", 0, 0, shift * 0.03);
    // weight on one leg: the free knee softens
    const kl = Math.max(0, shift) * 0.12, kr = Math.max(0, -shift) * 0.12;
    set(p, "thighL", -kl * 0.5, 0, -shift * 0.03); set(p, "shinL", kl, 0, 0); set(p, "footL", -kl * 0.5, 0, shift * 0.03);
    set(p, "thighR", -kr * 0.5, 0, -shift * 0.03); set(p, "shinR", kr, 0, 0); set(p, "footR", -kr * 0.5, 0, shift * 0.03);
    // relaxed arms: in from the A-pose, slight elbow bend, soft fingers
    both(p, "clavL", "clavR", 0, 0, -0.04 - slouch * 0.3);
    both(p, "upperArmL", "upperArmR", 0.04 + br * 0.01, 0.05, -0.12 + br * 0.01);
    both(p, "foreArmL", "foreArmR", -0.18 - br * 0.02, 0.1, 0);
    both(p, "handL", "handR", 0.05, 0.1, -0.05);
    both(p, "fingersL", "fingersR", 0, 0, -0.35);
    both(p, "thumbL", "thumbR", 0, 0, -0.15);
    // occasional glance (seeded, so NPCs don't sync)
    const glance = Math.sin(t * 0.23 + sd * 1.3) * Math.sin(t * 0.11 + sd);
    set(p, "head", Math.sin(t * 0.17 + sd) * 0.04, glance * 0.35 * calm, 0);
  }

  /** gait: kind 0 = walk, 1 = run. Phase-locked to distance travelled. */
  private gait(p: Pose, ph: number, kind: number): void {
    const P = this.params;
    const w = Math.PI * 2 * ph;
    const s = Math.sin(w), c = Math.cos(w);
    const A = kind ? 0.74 : 0.45;
    const lean = kind ? 0.3 : 0.05 + (1 - P.posture) * 0.05;
    const side = P.sideways;
    for (const [leg, sgn] of [["L", 1], ["R", -1]] as const) {
      const ss = s * sgn, cc = c * sgn;
      const fwd = -A * ss;                                    // thigh swing (negative = forward)
      const swing = Math.max(0, cc);                          // leg travelling forward
      // walk: knee flex peaks just after the leg passes under the hips (foot clears the floor, heel stays low)
      const swingLate = Math.max(0, Math.cos(w * sgn - (kind ? 0 : 0.45) * 1) * sgn * sgn) * (cc > -0.3 ? 1 : 0);
      const knee = (kind ? 0.32 : 0.06) + (kind ? 1.6 * Math.pow(swing, 1.25) : 0.68 * Math.pow(swingLate * swing > 0 ? swingLate : 0, 1.6)) + (kind ? 0.25 : 0.04) * Math.max(0, -ss);
      const stance = sm(-cc * 3 + 0.5);
      const flat = -(fwd + knee);                             // keep sole parallel to the floor
      const foot = stance * flat * 0.85 + (1 - stance) * (kind ? 0.35 : 0.2) * swing;
      set(p, `thigh${leg}` as BoneName, fwd * (1 - Math.abs(side)) - (kind ? 0.12 : 0.02), 0, side * ss * 0.35 * sgn);
      set(p, `shin${leg}` as BoneName, knee, 0, 0);
      set(p, `foot${leg}` as BoneName, foot, 0, 0);
      set(p, `toe${leg}` as BoneName, Math.max(0, -foot) * 0.4, 0, 0);
    }
    // pelvis: bob (lowest at double support), twist with the leading leg, slight drop
    p.hip[1] = (kind ? -0.065 : -0.012) + (kind ? 0.055 : 0.018) * Math.cos(2 * w + (kind ? Math.PI : 0));
    p.hip[0] = s * (kind ? 0.01 : 0.016);
    set(p, "hips", lean * 0.4, s * (kind ? 0.12 : 0.09), c * 0.03);
    set(p, "spine", lean * 0.6, -s * 0.05, 0);
    set(p, "chest", lean * 0.4 - 0.01, -s * (kind ? 0.12 : 0.07), 0);
    set(p, "neck", -lean * 0.6, s * 0.03, 0);
    set(p, "head", -lean * 0.3 + (kind ? 0.03 : 0.0) * Math.cos(2 * w), 0, 0);
    // arms counter-swing
    const B = kind ? 0.95 : 0.36 * (0.7 + P.energy * 0.6);
    set(p, "upperArmL", B * s, 0.05, -0.13 - (kind ? 0.08 : 0));
    set(p, "upperArmR", -B * s, -0.05, 0.13 + (kind ? 0.08 : 0));
    // run: elbows locked near 90° and pumping (tighter on the forward swing), hands relaxed
    set(p, "foreArmL", -(kind ? 1.55 : 0.28) - Math.max(0, -s) * (kind ? 0.25 : 0.25) + Math.max(0, s) * (kind ? 0.2 : 0), kind ? 0.35 : 0.15, 0);
    set(p, "foreArmR", -(kind ? 1.55 : 0.28) - Math.max(0, s) * (kind ? 0.25 : 0.25) + Math.max(0, -s) * (kind ? 0.2 : 0), kind ? -0.35 : -0.15, 0);
    both(p, "handL", "handR", 0.08, 0.1, -0.05);
    both(p, "fingersL", "fingersR", 0, 0, kind ? -0.9 : -0.45);
    both(p, "thumbL", "thumbR", 0, 0, -0.2);
    both(p, "clavL", "clavR", 0, 0, -0.04);
  }

  private turnStep(p: Pose, t: number, dir: number): void {
    const ph = t * 3.2;
    const l = Math.max(0, Math.sin(ph * Math.PI)), r = Math.max(0, -Math.sin(ph * Math.PI));
    set(p, "thighL", -l * 0.25, dir * 0.15 * l, 0); set(p, "shinL", l * 0.5, 0, 0); set(p, "footL", -l * 0.2, 0, 0);
    set(p, "thighR", -r * 0.25, dir * 0.15 * r, 0); set(p, "shinR", r * 0.5, 0, 0); set(p, "footR", -r * 0.2, 0, 0);
    set(p, "chest", 0, dir * 0.1, 0);
    p.hip[1] -= 0.012 * (l + r);
  }

  /** Seated pose relative to a chair anchor (hips over the seat). */
  private sitting(p: Pose, t: number): void {
    const P = this.params, sd = this.seed;
    const br = Math.sin(t * 1.4 + sd);
    const fidget = Math.sin(t * 0.21 + sd * 2.1);
    p.hip[1] = -0.405;
    p.hip[2] = -0.03;
    set(p, "hips", -0.1, fidget * 0.04, 0);
    set(p, "spine", 0.06 + (1 - P.posture) * 0.08 + br * 0.006, 0, 0);
    set(p, "chest", 0.04 + br * 0.014, 0, 0);
    set(p, "neck", 0.02, 0, 0);
    for (const [leg, sgn] of [["L", 1], ["R", -1]] as const) {
      const cross = fidget * 0.06 * sgn;
      set(p, `thigh${leg}` as BoneName, -1.48 + 0.1, 0.06 * sgn + cross, 0.05 * sgn);
      set(p, `shin${leg}` as BoneName, 1.42 + 0.1 + cross * 0.5, 0, 0);
      set(p, `foot${leg}` as BoneName, -0.02, 0, 0);
    }
    // hands resting on the thighs
    both(p, "clavL", "clavR", 0, 0, -0.03);
    both(p, "upperArmL", "upperArmR", -0.38, 0.1, -0.1);
    both(p, "foreArmL", "foreArmR", -0.85, 0.25, 0);
    both(p, "handL", "handR", 0.25, 0.3, 0);
    both(p, "fingersL", "fingersR", 0, 0, -0.3);
  }

  private blendSit(p: Pose, t: number, k: number): void {
    const a = newPoseCached(this, 5); clearPose(a); this.idle(a, t, 0.4);
    const b = newPoseCached(this, 3); clearPose(b); this.sitting(b, t);
    lerpPose(a, b, k, p);
    // lean forward mid-transition, arms reach back toward the armrests
    const bump = Math.sin(Math.PI * k);
    set(p, "spine", bump * 0.35, 0, 0);
    set(p, "chest", bump * 0.15, 0, 0);
    set(p, "neck", -bump * 0.25, 0, 0);
    both(p, "upperArmL", "upperArmR", bump * 0.25, 0, bump * 0.08);
  }

  private typing(p: Pose, t: number): void {
    const sd = this.seed;
    const burst = 0.5 + 0.5 * Math.sin(t * 0.7 + sd);          // typing bursts and pauses
    const mouse = Math.sin(t * 0.13 + sd * 1.7) > 0.55;           // right hand moves to the mouse
    // replace the resting arms with keyboard posture
    overwrite(p, "upperArmL", -0.5, 0.18, -0.06);
    overwrite(p, "foreArmL", -1.0, 0.5, 0.0);
    overwrite(p, "handL", 0.12, -0.25, 1.1);
    overwrite(p, "upperArmR", mouse ? -0.42 : -0.5, mouse ? -0.02 : -0.18, mouse ? 0.12 : 0.06);
    overwrite(p, "foreArmR", mouse ? -1.05 : -1.0, mouse ? -0.2 : -0.5, 0);
    overwrite(p, "handR", 0.12, 0.25, -1.1);
    const f = Math.sin(t * 17 + sd) * 0.18 * burst, f2 = Math.sin(t * 19 + sd * 2) * 0.18 * burst;
    overwrite(p, "fingersL", f, 0, -0.25);
    overwrite(p, "fingersR", mouse ? 0 : f2, 0, mouse ? 0.25 : 0.25);
    set(p, "chest", 0.05, 0, 0);
    set(p, "head", 0.06 + Math.sin(t * 0.5 + sd) * 0.03, Math.sin(t * 0.37 + sd) * 0.12, 0);
  }

  private talkGestures(p: Pose, t: number, amt: number): void {
    const g = this.params.gestures * amt, sd = this.seed;
    const a = Math.sin(t * 2.2 + sd), bb = Math.sin(t * 1.7 + sd * 2), c = Math.sin(t * 0.9 + sd);
    set(p, "upperArmL", -0.15 * g - Math.max(0, a) * 0.25 * g, 0.1, 0.05 * g);
    set(p, "foreArmL", -0.55 * g - Math.max(0, a) * 0.6 * g, 0.35 * g, 0);
    set(p, "handL", 0, 0.4 * g * Math.max(0, a), 0);
    set(p, "upperArmR", -0.1 * g - Math.max(0, bb) * 0.2 * g, -0.1, -0.05 * g);
    set(p, "foreArmR", -0.45 * g - Math.max(0, bb) * 0.5 * g, -0.3 * g, 0);
    both(p, "fingersL", "fingersR", 0, 0, 0.25 * g);
    set(p, "head", Math.abs(Math.sin(t * 3.1 + sd)) * 0.05, c * 0.08, Math.sin(t * 1.3) * 0.04);
    set(p, "chest", 0, c * 0.05, 0);
  }

  private listening(p: Pose, t: number): void {
    const sd = this.seed;
    const nod = Math.max(0, Math.sin(t * 1.9 + sd)) ** 4;
    set(p, "head", nod * 0.12, 0, 0.08 + Math.sin(t * 0.4) * 0.03);
    set(p, "neck", nod * 0.04, 0, 0);
  }

  private evalGesture(gs: Gesture, t: number, p: Pose): void {
    switch (gs) {
      case "Waving": {
        const w = Math.sin(t * 9);
        set(p, "upperArmR", -0.35, 0.2, 2.35);
        set(p, "foreArmR", -0.35, 0, w * 0.4);
        set(p, "handR", 0, 0, w * 0.2);
        set(p, "fingersR", 0, 0, 0.1);
        set(p, "chest", 0, -0.1, 0.06);
        set(p, "head", 0, -0.12, 0.05);
        break;
      }
      case "DrinkingWater": {
        // lift, sip, lower over ~3 s, then hold
        const k = sm(Math.min(t, 0.8) / 0.8) * (1 - sm((t - 2.6) / 0.6) * 0.0);
        const sip = sm((t - 0.8) / 0.4) * (1 - sm((t - 2.2) / 0.4));
        set(p, "upperArmR", -0.55 * k, 0.25 * k, 0.3 * k);
        set(p, "foreArmR", -1.95 * k - sip * 0.2, -0.3 * k, 0);
        set(p, "handR", -0.3 * k - sip * 0.4, 0.2, 0);
        set(p, "fingersR", 0, 0, 0.9 * k);
        set(p, "head", -0.18 * sip, 0, 0);
        set(p, "neck", -0.1 * sip, 0, 0);
        break;
      }
      case "UsingPhone": {
        const scroll = Math.sin(t * 2.5) * 0.06;
        set(p, "upperArmL", -0.45, 0.25, 0.05);
        set(p, "foreArmL", -1.65, 0.6, 0);
        set(p, "handL", 0.35, -0.3, 0.6);
        set(p, "fingersL", 0, 0, 0.6);
        set(p, "upperArmR", -0.38, -0.25, 0.1);
        set(p, "foreArmR", -1.5 - scroll, -0.6, 0);
        set(p, "handR", 0.2, 0.2, -0.3);
        set(p, "head", 0.42, 0, 0);
        set(p, "neck", 0.15, 0, 0);
        break;
      }
      case "Interacting": {
        const k = sm(t / 0.4) * (1 - sm((t - 0.9) / 0.4));
        set(p, "upperArmR", -1.0 * k, -0.15 * k, 0.1);
        set(p, "foreArmR", -0.35 * k, 0, 0);
        set(p, "handR", -0.2 * k, 0, 0);
        set(p, "chest", 0.08 * k, -0.08 * k, 0);
        break;
      }
      case "Pointing": {
        set(p, "upperArmR", -1.25, -0.2, 0.1);
        set(p, "foreArmR", -0.15, 0, 0);
        set(p, "fingersR", 0, 0, -0.1);
        break;
      }
      case "Gesturing": this.talkGestures(p, t, 1); break;
      case "none": break;
    }
  }
}

// ------------------------------------------------------------------------------------------ pose utils

const UPPER: BoneName[] = ["chest", "neck", "head", "clavL", "upperArmL", "foreArmL", "handL", "fingersL", "thumbL", "clavR", "upperArmR", "foreArmR", "handR", "fingersR", "thumbR"];
const UPPER_SET = new Set(UPPER.map((b) => I[b]));

function clearPose(p: Pose): void { p.r.fill(0); p.hip.fill(0); p.face.fill(0); }
function copyPose(a: Pose, out: Pose): void { out.r.set(a.r); out.hip.set(a.hip); out.face.set(a.face); }
function lerpPose(a: Pose, b: Pose, t: number, out: Pose): void {
  for (let i = 0; i < a.r.length; i++) out.r[i] = a.r[i] + (b.r[i] - a.r[i]) * t;
  for (let i = 0; i < 3; i++) out.hip[i] = a.hip[i] + (b.hip[i] - a.hip[i]) * t;
  for (let i = 0; i < 5; i++) out.face[i] = a.face[i] + (b.face[i] - a.face[i]) * t;
}
function scaleAdd(out: Pose, a: Pose, w: number): void {
  for (let i = 0; i < a.r.length; i++) out.r[i] += a.r[i] * w;
  for (let i = 0; i < 3; i++) out.hip[i] += a.hip[i] * w;
  for (let i = 0; i < 5; i++) out.face[i] += a.face[i] * w;
}
/** Gesture layer replaces the upper body where the gesture defines values (weighted). */
function blendUpper(out: Pose, g: Pose, w: number): void {
  for (const bi of UPPER_SET) {
    const o = bi * 3;
    const has = g.r[o] !== 0 || g.r[o + 1] !== 0 || g.r[o + 2] !== 0;
    if (!has) continue;
    const isArm = bi !== I.chest && bi !== I.neck && bi !== I.head;
    for (let k = 0; k < 3; k++) out.r[o + k] = isArm ? out.r[o + k] * (1 - w) + g.r[o + k] * w : out.r[o + k] + g.r[o + k] * w;
  }
}
function overwrite(p: Pose, b: BoneName, x: number, y: number, z: number): void { const o = I[b] * 3; p.r[o] = x; p.r[o + 1] = y; p.r[o + 2] = z; }

const cache = new WeakMap<CharacterAnimator, Pose[]>();
function newPoseCached(a: CharacterAnimator, slot: number): Pose {
  let arr = cache.get(a);
  if (!arr) { arr = [newPose(), newPose(), newPose(), newPose(), newPose(), newPose()]; cache.set(a, arr); }
  return arr[slot];
}

/** face channels: blink, mouthOpen, smile, browUp, browAngle */
export const EXPRESSIONS: Record<Expression, [number, number, number, number, number]> = {
  neutral: [0, 0, 0, 0, 0],
  smile: [0, 0, 0.5, 0.2, 0],
  happy: [0.15, 0.15, 1, 0.5, -0.2],
  laugh: [0.55, 0.9, 1, 0.6, -0.3],
  surprised: [0, 0.8, -0.2, 1, 0],
  thinking: [0.1, 0, -0.2, -0.3, 0.8],
  serious: [0.05, 0, -0.4, -0.5, 0.6],
};
