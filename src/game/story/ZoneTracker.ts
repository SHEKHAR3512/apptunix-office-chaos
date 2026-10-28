import type { Vector3 } from "@babylonjs/core";
import type { ZoneKey } from "../gameplay/GameEventBus";
import { ZONES } from "../../world/OfficeLayout";

const MAP: Partial<Record<string, ZoneKey>> = {
  reception: "office", react: "react", angular: "angular", node: "node", hr: "hr", devops: "devops", design: "design", qa: "qa",
  cr1: "cr1", cr2: "cr2", cr3: "cr3", break: "break", server: "server", lounge: "lounge", corridorA: "corridor", corridorC: "corridor",
};

/** Pure: which story zones contain a position. */
export function zonesAt(p: { x: number; y: number; z: number }, floor: number, inLift: boolean, desk?: { x: number; z: number }): Set<ZoneKey> {
  const out = new Set<ZoneKey>();
  if (inLift) { out.add("lift"); return out; }
  if (floor === 0) {
    if (p.z < -0.2) out.add("street");
    else if (p.x > 3.2 && p.x < 18 && p.z < 14) out.add("lobby_g");
    return out;
  }
  if (floor !== 3) return out;
  if (p.x > 3.2 && p.x < 10 && p.z > 0 && p.z < 14) out.add("floor3_lobby");
  for (const z of ZONES) {
    const k = MAP[z.id];
    if (k && p.x >= z.rect.x0 && p.x <= z.rect.x1 && p.z >= z.rect.z0 && p.z <= z.rect.z1) out.add(k);
  }
  if (desk && Math.hypot(p.x - desk.x, p.z - desk.z) < 2.0) out.add("dragon_desk");
  return out;
}

/** Emits PLAYER_ENTERED_ZONE on entry; `refresh()` re-announces current zones (state re-check). */
export class ZoneTracker {
  current = new Set<ZoneKey>();
  constructor(private readonly emit: (z: ZoneKey, floor: number) => void) {}

  update(p: Vector3, floor: number, inLift: boolean, desk?: { x: number; z: number }): void {
    const now = zonesAt(p, floor, inLift, desk);
    for (const z of now) if (!this.current.has(z)) this.emit(z, floor);
    this.current = now;
  }

  refresh(floor: number): void { for (const z of this.current) this.emit(z, floor); }
}
