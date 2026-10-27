import { Vector3 } from "@babylonjs/core";
import type { PlayerCharacter } from "../player/PlayerCharacter";
import type { InteractionManager } from "./InteractionManager";
import type { Seat, SeatRegistry } from "./SeatRegistry";

const PLAYER = "player";

/**
 * Every registered seat becomes a "Sit" interaction. Reservations prevent two characters
 * sharing a chair; the player's seat is released on standing (including cancellation).
 */
export function registerChairInteractions(im: InteractionManager, seats: SeatRegistry, player: PlayerCharacter, onSeated: (seat: Seat) => void, onStood: (seat: Seat) => void): void {
  for (const seat of seats.all()) {
    const pos = new Vector3(seat.x, seat.y, seat.z);
    const ownerDesk = seat.kind === "desk" && seat.id !== "react.dragon.chair";
    im.add({
      id: `sit:${seat.id}`, type: "sit", radius: seat.kind === "desk" ? 1.1 : 1.0, priority: seat.id === "react.dragon.chair" ? 1 : 0,
      label: seat.kind === "meeting" ? "Sit (meeting)" : seat.id === "react.dragon.chair" ? "Sit at your desk" : "Sit",
      position: () => pos,
      // NPC-owned desks are only usable while their owner is away (and nobody sits there)
      available: () => player.isFree && seats.isFree(seat.id) && (!ownerDesk || seats.isFree(seat.id)),
      animation: "SitDown",
      activate: () => {
        if (!seats.reserve(seat.id, PLAYER)) return;
        const exit = seat.exitX !== undefined ? new Vector3(seat.exitX, seat.y, seat.exitZ!) : undefined;
        const ok = player.sit({ id: seat.id, pos, yaw: seat.yaw, exit }, () => onSeated(seat));
        if (!ok) seats.release(seat.id, PLAYER);
      },
    });
  }
  im.add({
    id: "stand", type: "stand", radius: 99, facing: false, key: "X", label: "Stand up",
    position: () => player.pos,
    available: () => player.isSeated,
    animation: "StandUp",
    activate: () => {
      const s = player.seat ? seats.get(player.seat.id) : undefined;
      player.stand(() => { if (s) { seats.release(s.id, PLAYER); onStood(s); } });
    },
  });
}
