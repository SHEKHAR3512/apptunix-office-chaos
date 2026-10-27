import { TargetCamera, Vector3 } from "@babylonjs/core";
import type { Input } from "../../core/Input";
import type { ColliderWorld } from "../../world/Colliders";

/**
 * Third-person orbit camera with wall avoidance, plus a free-fly inspection mode.
 * One Babylon camera is shared by both modes so the post-process chain stays attached.
 */
export class CameraController {
  yaw = 0;
  pitch = 0.32;
  distance = 3.4;
  private curDist = 3.4;
  private readonly target = new Vector3();
  sensitivity = 1;
  invertY = false;
  mode: "third" | "fly" = "third";
  private flyVel = new Vector3();
  /** Eye height of the follow target (lowered while seated). */
  focusHeight = 1.45;
  private curFocusH = 1.45;
  /** Small over-the-shoulder offset (metres, to the right of the character). */
  shoulder = 0.18;
  /** Scripted framing (dialogue / computer / cutscene). The orbit resumes smoothly afterwards. */
  private scripted: { pos: Vector3; target: Vector3 } | null = null;
  private scriptBlend = 0;

  constructor(readonly camera: TargetCamera, private readonly input: Input, private readonly colliders: ColliderWorld) {}

  get forwardYaw(): number { return this.yaw; }

  snapTo(focus: Vector3, yaw: number): void {
    this.yaw = yaw;
    this.target.copyFrom(focus);
    this.curDist = this.distance;
    this.updateThird(0, focus, true);
  }

  setFly(on: boolean): void {
    this.mode = on ? "fly" : "third";
    if (on) {
      const r = this.camera.rotation;
      this.yaw = r.y; this.pitch = r.x;
    } else {
      this.pitch = Math.min(Math.max(this.pitch, -0.35), 1.1);
    }
  }

  /** Place the fly camera at an explicit viewpoint (screenshots, debug bookmarks). */
  setView(pos: Vector3, lookAt: Vector3): void {
    this.mode = "fly";
    this.camera.position.copyFrom(pos);
    const d = lookAt.subtract(pos);
    this.yaw = Math.atan2(d.x, d.z);
    this.pitch = Math.atan2(-d.y, Math.hypot(d.x, d.z));
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  setScripted(pos: Vector3 | null, target?: Vector3): void {
    if (pos && target) this.scripted = { pos: pos.clone(), target: target.clone() };
    else if (this.scripted) {
      // hand control back: orbit continues from where the scripted camera is looking
      const d = this.scripted.target.subtract(this.scripted.pos);
      this.yaw = Math.atan2(d.x, d.z);
      this.pitch = Math.min(1.1, Math.max(-0.3, Math.atan2(-d.y, Math.hypot(d.x, d.z)) + 0.25));
      this.scripted = null;
    }
  }

  get isScripted(): boolean { return this.scripted !== null; }

  update(dt: number, focus: Vector3): void {
    const i = this.input;
    if (this.mode !== "fly" && (this.scripted || this.scriptBlend > 0)) {
      this.scriptBlend = Math.max(0, Math.min(1, this.scriptBlend + (this.scripted ? dt : -dt) * 1.6));
      if (!this.scripted) this.updateThird(dt, focus, false);
      const third = { pos: this.camera.position.clone(), target: this.camera.position.add(this.camera.getDirection(Vector3.Forward())) };
      const sp = this.scripted ?? { pos: third.pos, target: third.target };
      const k = this.scriptBlend * this.scriptBlend * (3 - 2 * this.scriptBlend);
      const pos = Vector3.Lerp(third.pos, sp.pos, k);
      const tgt = Vector3.Lerp(third.target, sp.target, k);
      this.camera.position.copyFrom(pos);
      const d = tgt.subtract(pos);
      this.camera.rotation.set(Math.atan2(-d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0);
      if (this.scripted) return;
    }
    const sens = 0.0024 * this.sensitivity;
    this.yaw += i.mouseDX * sens;
    this.pitch += i.mouseDY * sens * (this.invertY ? -1 : 1);
    if (this.mode === "fly") this.updateFly(dt);
    else {
      this.distance = Math.min(7, Math.max(1.4, this.distance + i.wheel * 0.35));
      this.updateThird(dt, focus, false);
    }
  }

  private updateThird(dt: number, focus: Vector3, instant: boolean): void {
    this.pitch = Math.min(1.15, Math.max(-0.35, this.pitch));
    const k = instant ? 1 : 1 - Math.exp(-dt * 14);
    this.target.x += (focus.x - this.target.x) * k;
    this.target.z += (focus.z - this.target.z) * k;
    this.target.y += (focus.y - this.target.y) * (instant ? 1 : 1 - Math.exp(-dt * 8));
    this.curFocusH += (this.focusHeight - this.curFocusH) * (instant ? 1 : 1 - Math.exp(-dt * 4));
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const head = this.target.add(new Vector3(0, this.curFocusH, 0)).add(right.scale(this.shoulder * Math.min(1, this.curDist / 3)));
    const cp = Math.cos(this.pitch);
    const dir = new Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    // wall avoidance: cast from the head towards the desired position
    const hit = this.colliders.raycast(head, dir, this.distance + 0.3);
    const allowed = Math.max(0.35, Math.min(this.distance, hit - 0.25));
    // pull in instantly, ease back out
    if (allowed < this.curDist || instant) this.curDist = allowed;
    else this.curDist += (allowed - this.curDist) * (1 - Math.exp(-dt * 3));
    const pos = head.add(dir.scale(this.curDist));
    this.camera.position.copyFrom(pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private updateFly(dt: number): void {
    const i = this.input;
    this.pitch = Math.min(1.5, Math.max(-1.5, this.pitch));
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    const f = this.camera.getDirection(Vector3.Forward());
    const r = this.camera.getDirection(Vector3.Right());
    const wish = new Vector3();
    if (i.down("KeyW")) wish.addInPlace(f);
    if (i.down("KeyS")) wish.subtractInPlace(f);
    if (i.down("KeyD")) wish.addInPlace(r);
    if (i.down("KeyA")) wish.subtractInPlace(r);
    if (i.down("KeyE") || i.down("Space")) wish.y += 1;
    if (i.down("KeyQ") || i.down("ControlLeft")) wish.y -= 1;
    const speed = i.down("ShiftLeft") ? 14 : 4.5;
    if (wish.lengthSquared() > 0) wish.normalize().scaleInPlace(speed);
    this.flyVel = Vector3.Lerp(this.flyVel, wish, 1 - Math.exp(-dt * 8));
    this.camera.position.addInPlace(this.flyVel.scale(dt));
  }
}
