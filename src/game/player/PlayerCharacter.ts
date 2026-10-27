import { Vector3 } from "@babylonjs/core";
import type { Input } from "../../core/Input";
import type { ColliderWorld } from "../../world/Colliders";
import type { Character } from "../characters/CharacterFactory";
import { PlayerAnimationController } from "./PlayerAnimationController";
import { PlayerMovement } from "./PlayerMovement";

export interface SeatTarget { id: string; pos: Vector3; yaw: number; exit?: Vector3 }

type Mode = "free" | "sitting-down" | "seated" | "standing-up" | "locked";

const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const angDiff = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** DRAGON: the playable character (movement + animation + seated interactions). */
export class PlayerCharacter {
  readonly move: PlayerMovement;
  private readonly animCtl: PlayerAnimationController;
  mode: Mode = "free";
  seat: SeatTarget | null = null;
  private tr = { t: 0, from: new Vector3(), fromYaw: 0, to: new Vector3(), toYaw: 0, dur: 1 };
  private onDone: (() => void) | null = null;
  private faceTarget: Vector3 | null = null;

  constructor(readonly char: Character, input: Input, colliders: ColliderWorld) {
    this.move = new PlayerMovement(input, colliders);
    this.animCtl = new PlayerAnimationController(char.animator, this.move);
    char.animator.play("Locomotion", 0);
  }

  get pos(): Vector3 { return this.move.pos; }
  get yaw(): number { return this.move.yaw; }
  get isFree(): boolean { return this.mode === "free"; }
  get isSeated(): boolean { return this.mode === "seated"; }

  teleport(p: Vector3, yaw: number): void {
    this.move.teleport(p, yaw);
    this.mode = "free";
    this.seat = null;
    this.move.locked = false;
    this.char.animator.play("Locomotion", 0);
    this.sync();
  }

  /** Lock locomotion (dialogue, computer, menus). Optionally turn to face a point. */
  lock(face?: Vector3): void {
    if (this.mode === "free") this.mode = "locked";
    this.move.locked = true;
    this.move.stop();
    this.faceTarget = face ?? null;
  }

  unlock(): void {
    if (this.mode === "locked") this.mode = "free";
    if (this.mode === "free") this.move.locked = false;
    this.faceTarget = null;
  }

  /** Align to a seat, play SitDown, end Seated. Locomotion is disabled while seated. */
  sit(seat: SeatTarget, onSeated?: () => void): boolean {
    if (this.mode !== "free") return false;
    this.mode = "sitting-down";
    this.seat = seat;
    this.move.locked = true;
    this.move.stop();
    this.tr = { t: 0, from: this.move.pos.clone(), fromYaw: this.move.yaw, to: seat.pos.clone(), toYaw: seat.yaw, dur: this.char.animator.durations.SitDown ?? 1.1 };
    this.char.animator.play("SitDown", 0.2);
    this.onDone = onSeated ?? null;
    return true;
  }

  /** Play StandUp and step back to the exit point. Safe to call mid-transition (cancels). */
  stand(onStood?: () => void): boolean {
    if (this.mode !== "seated" && this.mode !== "sitting-down") return false;
    const seat = this.seat!;
    const exit = seat.exit ?? seat.pos.add(new Vector3(-Math.sin(seat.yaw) * 0.5, 0, -Math.cos(seat.yaw) * 0.5));
    this.mode = "standing-up";
    this.tr = { t: 0, from: this.move.pos.clone(), fromYaw: this.move.yaw, to: exit, toYaw: seat.yaw, dur: this.char.animator.durations.StandUp ?? 1.0 };
    this.char.animator.play("StandUp", 0.2);
    this.onDone = onStood ?? null;
    return true;
  }

  update(dt: number, camYaw: number, strafe: boolean): void {
    const a = this.char.animator;
    switch (this.mode) {
      case "free":
      case "locked": {
        this.move.update(dt, camYaw, strafe && this.mode === "free");
        if (this.faceTarget) {
          const d = this.faceTarget.subtract(this.move.pos);
          const target = Math.atan2(d.x, d.z);
          this.move.yaw += angDiff(this.move.yaw, target) * Math.min(1, dt * 6);
        }
        this.animCtl.update(dt);
        break;
      }
      case "sitting-down": case "standing-up": {
        const tr = this.tr;
        tr.t += dt;
        // step in during the first ~60% of the clip, then settle (prevents sliding while seated)
        const k = ease(tr.t / (tr.dur * (this.mode === "sitting-down" ? 0.6 : 0.75)));
        Vector3.LerpToRef(tr.from, tr.to, k, this.move.pos);
        this.move.yaw = tr.fromYaw + angDiff(tr.fromYaw, tr.toYaw) * ease(tr.t / (tr.dur * 0.5));
        if (tr.t >= tr.dur) {
          if (this.mode === "sitting-down") { this.mode = "seated"; if (a.base === "SitDown") a.play("Sitting", 0.1); }
          else { this.mode = "free"; this.seat = null; this.move.locked = false; a.play("Locomotion", 0.25); }
          const cb = this.onDone; this.onDone = null; cb?.();
        }
        break;
      }
      case "seated":
        if (this.seat) { this.move.pos.copyFrom(this.seat.pos); this.move.yaw = this.seat.yaw; }
        break;
    }
    this.sync();
    this.char.update(dt);
  }

  private sync(): void {
    this.char.place(this.move.pos, this.move.yaw);
  }
}
