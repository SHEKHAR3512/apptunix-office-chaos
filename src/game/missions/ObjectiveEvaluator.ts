import type { AnyGameEvent, GameEventType } from "../gameplay/GameEventBus";
import type { EventMatch, ObjectiveDef } from "./MissionTypes";

/** Which event (and payload subset) each objective type listens for. */
export function matchersFor(o: ObjectiveDef): EventMatch[] {
  const t = o.target;
  const alt = t.anyOf ?? [];
  const m = (event: GameEventType, match: Record<string, unknown>): EventMatch => ({ event, match: strip(match) as never });
  switch (o.type) {
    case "REACH_LOCATION": return [m("PLAYER_ENTERED_ZONE", { zone: t.zone }), ...alt];
    case "TALK_TO_NPC": case "RETURN_TO_NPC": return [m("NPC_DIALOGUE_COMPLETED", { npc: t.npc, conversation: t.conversation }), ...alt];
    case "INTERACT_WITH_OBJECT": return [m("OBJECT_INTERACTED", { object: t.object }), ...alt];
    case "INSPECT_OBJECT": return [m("OBJECT_INSPECTED", { object: t.object }), ...alt];
    case "SIT_AT_DESK": return [m("PLAYER_SAT", { seat: t.seat, zone: t.seatZone }), ...alt];
    case "USE_COMPUTER": return [t.app ? m("APP_OPENED", { app: t.app }) : m("COMPUTER_STARTED", {}), ...alt];
    case "COMPLETE_MINIGAME": return [m("PUZZLE_SOLVED", { puzzle: t.puzzle }), ...alt];
    case "ATTEND_MEETING": return [m("MEETING_JOINED", { room: t.room }), ...alt];
    case "MAKE_DIALOGUE_CHOICE": return [m("DIALOGUE_CHOICE", { conversation: t.conversation }), ...alt];
    case "WAIT_FOR_EVENT": return alt;
  }
}

const strip = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Does a published event satisfy this objective? Pure — unit-tested. */
export function satisfies(o: ObjectiveDef, e: AnyGameEvent): boolean {
  for (const mt of matchersFor(o)) {
    if (mt.event !== e.type) continue;
    const p = e.payload as Record<string, unknown>;
    const ok = Object.entries(mt.match ?? {}).every(([k, v]) => p[k] === v);
    if (!ok) continue;
    if (o.type === "MAKE_DIALOGUE_CHOICE" && o.target.choices && !o.target.choices.includes(String(p.choice))) continue;
    return true;
  }
  return false;
}
