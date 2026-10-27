import { Vector3 } from "@babylonjs/core";
import type { AnchorRegistry } from "../../world/Anchors";
import { floorY } from "../../world/OfficeLayout";
import type { Seat, SeatRegistry } from "../interactions/SeatRegistry";

/** A place an NPC can go: a seat (sits) or a standing spot (faces `yaw`). */
export interface Target { kind: "seat" | "spot"; pos: Vector3; yaw: number; seatId?: string; approach: Vector3; label: string }

const fwd = (yaw: number) => new Vector3(Math.sin(yaw), 0, Math.cos(yaw));

/** Standing spots used by schedules (stand-up circles, break points, lobby). */
export const SPOTS: Record<string, { x: number; z: number; r?: number }> = {
  "react.standup": { x: 27.0, z: 3.4, r: 1.25 },
  "angular.standup": { x: 37.2, z: 6.1, r: 1.0 },
  "node.standup": { x: 46.0, z: 6.1, r: 1.0 },
  "devops.standup": { x: 19.8, z: 19.8, r: 1.0 },
  "design.standup": { x: 29.6, z: 21.6, r: 0.9 },
  "qa.standup": { x: 42.6, z: 22.0, r: 0.9 },
  "hr.standup": { x: 6.0, z: 19.2, r: 0.8 },
  water: { x: 1.25, z: 33.0, r: 0.35 },
  coffee: { x: 1.3, z: 28.4, r: 0.45 },
  bar: { x: 5.0, z: 32.5, r: 1.8 },
  lounge: { x: 44.6, z: 28.6, r: 1.3 },
  lobby: { x: 5.5, z: 6.6, r: 0.6 },
  corridorWindow: { x: 33.0, z: 1.0, r: 1.0 },
};

export function spotTarget(name: string, slot: number, label = name): Target {
  const s = SPOTS[name] ?? SPOTS.lobby;
  const y = floorY(3);
  const r = s.r ?? 0.8;
  const a = slot * 2.399 + 0.6;
  const pos = new Vector3(s.x + Math.sin(a) * r, y, s.z + Math.cos(a) * r);
  // face the centre of the spot (circles) — single points face away from the wall/object
  const yaw = r > 0.5 ? Math.atan2(s.x - pos.x, s.z - pos.z) : name === "water" || name === "coffee" ? -Math.PI / 2 : 0;
  return { kind: "spot", pos, yaw, approach: pos.clone(), label };
}

export function seatTarget(seat: Seat, label = seat.id): Target {
  const pos = new Vector3(seat.x, seat.y, seat.z);
  const approach = seat.exitX !== undefined ? new Vector3(seat.exitX, seat.y, seat.exitZ!) : pos.subtract(fwd(seat.yaw).scale(0.6));
  return { kind: "seat", pos, yaw: seat.yaw, seatId: seat.id, approach, label };
}

/** Register every Phase 1 sitting anchor as a seat. */
export function registerSeats(anchors: AnchorRegistry, seats: SeatRegistry): void {
  for (const a of anchors.items.values()) {
    if (a.type === "chair") {
      const deskId = a.id.replace(/\.chair$/, "");
      const stand = anchors.get(`${deskId}.stand`);
      seats.add({ id: a.id, x: a.position.x, y: a.position.y, z: a.position.z, yaw: a.yaw, zone: a.zone, kind: "desk", exitX: stand?.position.x, exitZ: stand?.position.z });
    } else if (a.type === "seat") {
      const kind = a.zone.startsWith("cr") ? "meeting" : a.zone.startsWith("break") ? "break" : "sofa";
      seats.add({ id: a.id, x: a.position.x, y: a.position.y, z: a.position.z, yaw: a.yaw, zone: a.zone.split(".")[0] === "break" ? a.zone : a.zone, kind });
    }
  }
}
