import { Vector3 } from "@babylonjs/core";
import type { Input } from "../../core/Input";
import type { ColliderWorld } from "../../world/Colliders";

/**
 * Third-person locomotion: camera-relative WASD, Shift run, smooth acceleration/deceleration,
 * AABB collision (sub-stepped), character-vs-NPC body pushing. In-place locomotion: animation
 * is driven by the resulting velocity so movement and gait always agree.
 *
 * Facing: the character turns toward the movement direction. Holding S alone backpedals
 * (keeps facing the camera direction); holding the right mouse button strafes.
 */
export class PlayerMovement {
  readonly pos = new Vector3();
  readonly vel = new Vector3();
  yaw = 0;
  yawRate = 0;
  locked = false;
  readonly radius = 0.28;
  readonly height = 1.75;
  walkSpeed = 1.85;
  runSpeed = 4.4;
  backSpeed = 1.3;
  backward = false;
  sideways = 0;
  /** Smoothed forward acceleration (m/s², + speeding up) and turn-induced lateral acceleration. */
  accelFwd = 0;
  accelLat = 0;
  /** True while braking hard to reverse direction at speed (pivot). */
  pivoting = false;
  /** Fraction of the intended step lost to collision last frame (0 = free, 1 = fully blocked). */
  blockage = 0;
  // tuning (m/s²) — accelerate briskly, brake slightly harder, runs carry momentum
  accelWalk = 7;
  accelRun = 9.5;
  brake = 12;
  /** Walkable surface height at a position (floor or lift cabin). */
  groundAt: (p: Vector3) => number = () => 0;
  /** Other bodies the player must not walk through (NPCs). */
  bodies: () => { x: number; z: number; r: number; y: number }[] = () => [];

  constructor(private readonly input: Input, private readonly colliders: ColliderWorld) {}

  teleport(p: Vector3, yaw: number): void {
    this.pos.copyFrom(p);
    this.vel.setAll(0);
    this.yaw = yaw;
  }

  update(dt: number, camYaw: number, strafe: boolean): void {
    const i = this.input;
    let fx = 0, fz = 0;
    if (!this.locked) {
      if (i.down("KeyW") || i.down("ArrowUp")) fz += 1;
      if (i.down("KeyS") || i.down("ArrowDown")) fz -= 1;
      if (i.down("KeyA") || i.down("ArrowLeft")) fx -= 1;
      if (i.down("KeyD") || i.down("ArrowRight")) fx += 1;
    }
    const len = Math.hypot(fx, fz);
    const run = !this.locked && (i.down("ShiftLeft") || i.down("ShiftRight"));
    this.backward = len > 0 && fz < 0 && fx === 0 && !run;
    const speed = this.backward ? this.backSpeed : run ? this.runSpeed : this.walkSpeed;
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    let wx = 0, wz = 0;
    if (len > 0) {
      fx /= len; fz /= len;
      wx = (fz * s + fx * c) * speed;
      wz = (fz * c - fx * s) * speed;
    }
    // --- acceleration-limited locomotion physics -------------------------------------------
    const spPrev = Math.hypot(this.vel.x, this.vel.z);
    const want = Math.hypot(wx, wz);
    let heading = spPrev > 0.05 ? Math.atan2(this.vel.x, this.vel.z) : Math.atan2(wx, wz);
    let sp = spPrev;
    this.pivoting = false;
    if (want > 0.01) {
      const target = Math.atan2(wx, wz);
      const d = angWrap(target - heading);
      if (sp > 2.4 && Math.abs(d) > 2.2) {
        // reversing at a run: brake to a near stop first (skid), then turn
        this.pivoting = true;
        sp = Math.max(0, sp - this.brake * 1.15 * dt);
        if (sp < 0.8) heading = target;
      } else {
        // heading rotates at a finite rate that drops with speed (momentum carries through turns)
        const turnRate = 14 - 8.5 * Math.min(1, sp / this.runSpeed);
        heading += Math.sign(d) * Math.min(Math.abs(d), turnRate * dt);
        // sharp turns bleed some speed
        const bleed = Math.max(0, Math.abs(d) - 0.6) * 0.9 * sp * dt;
        const a = want > sp ? (want > this.walkSpeed + 0.2 ? this.accelRun : this.accelWalk) : this.brake;
        sp += Math.sign(want - sp) * Math.min(Math.abs(want - sp), a * dt) - bleed;
      }
    } else {
      sp = Math.max(0, sp - this.brake * dt);
    }
    sp = Math.max(0, sp);
    this.vel.x = Math.sin(heading) * sp;
    this.vel.z = Math.cos(heading) * sp;
    const kA = 1 - Math.exp(-dt * 10);
    this.accelFwd += ((dt > 0 ? (sp - spPrev) / dt : 0) - this.accelFwd) * kA;

    const want0 = Math.hypot(this.vel.x, this.vel.z) * dt, px = this.pos.x, pz = this.pos.z;
    const steps = Math.max(1, Math.ceil(want0 / 0.08));
    for (let n = 0; n < steps; n++) {
      this.pos.x += (this.vel.x * dt) / steps;
      this.pos.z += (this.vel.z * dt) / steps;
      this.colliders.resolveCircle(this.pos, this.radius, this.height);
      this.pushBodies();
    }
    const moved = Math.hypot(this.pos.x - px, this.pos.z - pz);
    this.blockage = want0 > 1e-4 ? Math.max(0, Math.min(1, 1 - moved / want0)) : 0;
    const gy = this.groundAt(this.pos);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 20);
    if (Math.abs(gy - this.pos.y) < 0.002 || Math.abs(gy - this.pos.y) > 1.5) this.pos.y = gy;

    // facing
    let target = this.yaw;
    if (this.backward || strafe) target = camYaw;
    else if (sp > 0.15) target = Math.atan2(this.vel.x, this.vel.z);
    let d = target - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const turn = d * Math.min(1, dt * (sp > 2.5 ? 8 : 10));
    this.yaw += turn;
    this.yawRate = dt > 0 ? turn / dt : 0;
    this.accelLat += (sp * this.yawRate - this.accelLat) * kA;
    // sideways component relative to facing (strafe gait)
    const fwdX = Math.sin(this.yaw), fwdZ = Math.cos(this.yaw);
    this.sideways = sp > 0.1 && strafe ? (this.vel.x * fwdZ - this.vel.z * fwdX) / sp : 0;
  }

  private pushBodies(): void {
    for (const b of this.bodies()) {
      if (Math.abs(b.y - this.pos.y) > 1) continue;
      const dx = this.pos.x - b.x, dz = this.pos.z - b.z;
      const min = this.radius + b.r, d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      this.pos.x += (dx / d) * (min - d);
      this.pos.z += (dz / d) * (min - d);
    }
  }

  get speed(): number { return Math.hypot(this.vel.x, this.vel.z); }
  stop(): void { this.vel.setAll(0); }
}

function angWrap(a: number): number { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
