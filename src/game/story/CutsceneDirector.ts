import { Vector3 } from "@babylonjs/core";
import type { Game } from "../../core/Game";
import type { Character } from "../characters/CharacterFactory";
import { floorY } from "../../world/OfficeLayout";

export type ShotKind = "TWO_SHOT" | "CLOSE_UP_SPEAKER" | "CLOSE_UP_PLAYER" | "OVER_SHOULDER" | "MEETING_WIDE" | "MEETING_SPEAKER" | "COMPUTER_CLOSEUP";

export const ROOMS: Record<string, { x0: number; z0: number; x1: number; z1: number; table: { x: number; z: number }; wide: [Vector3, Vector3] }> = {
  cr1: { x0: 10.2, z0: 25.2, x1: 21.8, z1: 33.8, table: { x: 16.2, z: 29.6 }, wide: [new Vector3(21.2, 2.25, 25.7), new Vector3(14.6, 0.7, 30.6)] },
  cr2: { x0: 22.2, z0: 25.2, x1: 29.8, z1: 33.8, table: { x: 25.7, z: 30 }, wide: [new Vector3(22.7, 2.1, 25.7), new Vector3(27, 0.8, 30.5)] },
  cr3: { x0: 30.2, z0: 25.2, x1: 35.8, z1: 33.8, table: { x: 33, z: 28.6 }, wide: [new Vector3(30.7, 2.1, 25.7), new Vector3(34, 0.8, 29.5)] },
};

/**
 * Reusable cinematic shots on top of the existing scripted camera (which blends smoothly in
 * and out). Every shot checks line of sight against the collision world so the camera never
 * clips into walls, tables or partitions; rooms clamp shots inside their bounds.
 */
export class CutsceneDirector {
  private orbit: { c: Vector3; r: number; h: number; a: number; speed: number } | null = null;
  constructor(private readonly g: Game) {}

  private clear(from: Vector3, to: Vector3): boolean {
    const d = to.subtract(from);
    const len = d.length();
    return this.g.ctx.colliders.raycast(from, d.normalize(), len, (c) => c.blocksCamera || (c.tag === "furniture" && c.maxY > Math.min(from.y, to.y) + 0.1)) >= len - 0.05;
  }

  private set(pos: Vector3, target: Vector3): void { this.orbit = null; this.g.cam.setScripted(pos, target); }

  release(): void { this.orbit = null; this.g.cam.setScripted(null); }

  meetingWide(room: string): void {
    const r = ROOMS[room]; if (!r) return;
    const y = floorY(3);
    this.set(r.wide[0].add(new Vector3(0, y, 0)), r.wide[1].add(new Vector3(0, y, 0)));
  }

  /** Across-the-table shot of a seated speaker, clamped inside the room. */
  meetingSpeaker(room: string, ch: Character): void {
    const r = ROOMS[room]; if (!r) { this.closeUp(ch); return; }
    const head = ch.headPosition.subtract(new Vector3(0, 0.06, 0));
    const toTable = new Vector3(r.table.x - head.x, 0, r.table.z - head.z).normalize();
    const side = new Vector3(toTable.z, 0, -toTable.x);
    for (const [dist, off] of [[1.7, 0.45], [1.4, -0.45], [1.1, 0.2]] as const) {
      const p = head.add(toTable.scale(dist)).add(side.scale(off)).add(new Vector3(0, 0.12, 0));
      p.x = Math.max(r.x0 + 0.3, Math.min(r.x1 - 0.3, p.x));
      p.z = Math.max(r.z0 + 0.3, Math.min(r.z1 - 0.3, p.z));
      if (this.clear(p, head)) { this.set(p, head); return; }
    }
    this.meetingWide(room);
  }

  closeUp(ch: Character, from?: Vector3): void {
    const head = ch.headPosition.subtract(new Vector3(0, 0.05, 0));
    const fwd = new Vector3(Math.sin(ch.yaw), 0, Math.cos(ch.yaw));
    const toward = from ? from.subtract(head).normalize() : fwd;
    for (const a of [0.35, -0.35, 0.7, -0.7]) {
      const dir = new Vector3(toward.x * Math.cos(a) - toward.z * Math.sin(a), 0, toward.x * Math.sin(a) + toward.z * Math.cos(a));
      const p = head.add(dir.scale(1.25)).add(new Vector3(0, 0.08, 0));
      if (this.clear(p, head)) { this.set(p, head); return; }
    }
  }

  closeUpPlayer(): void { this.closeUp(this.g.player.char); }

  overShoulder(listener: Character, speaker: Character): void {
    const a = listener.headPosition, b = speaker.headPosition;
    const d = b.subtract(a); d.y = 0; d.normalize();
    const side = new Vector3(d.z, 0, -d.x);
    for (const s of [1, -1]) {
      const p = a.add(d.scale(-0.7)).add(side.scale(s * 0.45)).add(new Vector3(0, 0.1, 0));
      if (this.clear(p, b)) { this.set(p, Vector3.Lerp(b, a, 0.15)); return; }
    }
    this.closeUp(speaker, a);
  }

  /** Slow orbit around a point (chapter finale). */
  startOrbit(center: Vector3, radius: number, height: number, startAngle: number, speed = 0.12): void {
    this.orbit = { c: center.clone(), r: radius, h: height, a: startAngle, speed };
  }

  update(dt: number): void {
    const o = this.orbit;
    if (!o) return;
    o.a += o.speed * dt;
    let r = o.r;
    // shrink the radius if a wall is in the way
    const want = o.c.add(new Vector3(Math.sin(o.a) * r, o.h, Math.cos(o.a) * r));
    const dir = want.subtract(o.c); const len = dir.length();
    const hit = this.g.ctx.colliders.raycast(o.c, dir.normalize(), len);
    if (hit < len) r = Math.max(1.2, hit - 0.4) * (r / len);
    const pos = o.c.add(new Vector3(Math.sin(o.a) * r, o.h, Math.cos(o.a) * r));
    this.g.cam.setScripted(pos, o.c.add(new Vector3(0, 0.9, 0)));
  }
}
