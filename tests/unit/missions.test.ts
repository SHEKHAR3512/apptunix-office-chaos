import { describe, expect, it } from "vitest";
import { GameEventBus } from "../../src/game/gameplay/GameEventBus";
import { MissionManager } from "../../src/game/missions/MissionManager";
import { MISSIONS, validateMissions } from "../../src/game/missions/MissionRegistry";
import { canTransition } from "../../src/game/missions/MissionStateMachine";
import { satisfies } from "../../src/game/missions/ObjectiveEvaluator";
import type { MissionDef } from "../../src/game/missions/MissionTypes";

const mk = () => { const bus = new GameEventBus(); const mm = new MissionManager(MISSIONS, bus); mm.refreshAvailability(); return { bus, mm }; };

describe("Mission registry", () => {
  it("chapter 1 data is valid and has six story missions", () => {
    expect(validateMissions(MISSIONS)).toEqual([]);
    expect(MISSIONS.filter((m) => m.chapter === "ch1" && m.category === "story").map((m) => m.id)).toEqual(["m1_arrival", "m2_standup", "m3_react_bug", "m4_qa", "m5_chai", "m6_ship"]);
  });
  it("detects broken definitions", () => {
    const bad: MissionDef = { ...MISSIONS[0], id: "x", prerequisites: ["nope"], objectives: [{ id: "a", type: "WAIT_FOR_EVENT", text: "", target: {} }] };
    expect(validateMissions([bad]).length).toBeGreaterThan(0);
  });
});

describe("Mission state machine", () => {
  it("allows only valid transitions", () => {
    expect(canTransition("LOCKED", "AVAILABLE")).toBe(true);
    expect(canTransition("LOCKED", "ACTIVE")).toBe(false);
    expect(canTransition("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransition("ACTIVE", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "COMPLETED")).toBe(false);
  });
  it("rejects invalid transitions without changing state", () => {
    const { mm } = mk();
    expect(mm.state("m2_standup")).toBe("LOCKED");
    expect(mm.start("m2_standup")).toBe(false);
    expect(mm.state("m2_standup")).toBe("LOCKED");
    expect(mm.errors.length).toBeGreaterThan(0);
  });
});

describe("Objectives", () => {
  it("prerequisites gate missions", () => {
    const { mm } = mk();
    expect(mm.state("m1_arrival")).toBe("AVAILABLE");
    expect(mm.state("m2_standup")).toBe("LOCKED");
  });

  it("advance only on the matching validated event, in order", () => {
    const { bus, mm } = mk();
    mm.start("m1_arrival");
    // wrong zone / later objective events are ignored
    bus.emit("PLAYER_ENTERED_ZONE", { zone: "react", floor: 3 });
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "neha", conversation: "m1_neha" });
    expect(mm.current("m1_arrival")!.id).toBe("enter");
    bus.emit("PLAYER_ENTERED_ZONE", { zone: "lobby_g", floor: 0 });
    expect(mm.current("m1_arrival")!.id).toBe("call");
    bus.emit("LIFT_CALLED", { floor: 2 });            // wrong floor
    expect(mm.current("m1_arrival")!.id).toBe("call");
    bus.emit("PLAYER_ENTERED_ZONE", { zone: "lift", floor: 0 }); // alternative accepted
    expect(mm.current("m1_arrival")!.id).toBe("floor3");
  });

  it("talking to the wrong NPC or conversation does not count", () => {
    const { bus, mm } = mk();
    mm.start("m1_arrival");
    for (const id of ["enter", "call", "floor3", "office"]) mm.complete("m1_arrival", id);
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "tushar", conversation: "m1_neha" });
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "neha", conversation: "reception" });
    expect(mm.current("m1_arrival")!.id).toBe("neha");
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "neha", conversation: "m1_neha" });
    expect(mm.current("m1_arrival")!.id).toBe("react");
  });

  it("duplicate events are idempotent (rewards once, completion once)", () => {
    const { bus, mm } = mk();
    let rewards = 0;
    mm.onRewards = () => rewards++;
    mm.start("m1_arrival");
    const steps: [string, Record<string, unknown>][] = [
      ["PLAYER_ENTERED_ZONE", { zone: "lobby_g", floor: 0 }], ["LIFT_CALLED", { floor: 0 }], ["LIFT_FLOOR_SELECTED", { floor: 3 }],
      ["PLAYER_ENTERED_ZONE", { zone: "office", floor: 3 }], ["NPC_DIALOGUE_COMPLETED", { npc: "neha", conversation: "m1_neha" }],
      ["PLAYER_ENTERED_ZONE", { zone: "react", floor: 3 }], ["PLAYER_ENTERED_ZONE", { zone: "dragon_desk", floor: 3 }],
    ];
    for (const [t, p] of steps) { bus.emit(t as never, p as never); bus.emit(t as never, p as never); }
    expect(mm.state("m1_arrival")).toBe("COMPLETED");
    expect(rewards).toBe(1);
    expect(bus.count("MISSION_COMPLETED")).toBe(1);
    expect(mm.state("m2_standup")).toBe("AVAILABLE");
  });

  it("dialogue-choice objectives accept only listed choices", () => {
    const o = MISSIONS.find((m) => m.id === "m2_standup")!.objectives.find((x) => x.id === "status")!;
    const ev = (choice: string) => ({ type: "DIALOGUE_CHOICE" as const, seq: 1, payload: { conversation: "m2_standup", node: "status", choice } });
    expect(satisfies(o, ev("clarify"))).toBe(true);
    expect(satisfies(o, ev("solo"))).toBe(false);
  });

  it("optional objectives can complete in any order and never block", () => {
    const { bus, mm } = mk();
    for (const id of ["m1_arrival", "m2_standup", "m3_react_bug", "m4_qa"]) { (mm as unknown as { progress: Map<string, { state: string }> }).progress.get(id)!.state = "COMPLETED"; }
    mm.refreshAvailability();
    mm.start("m5_chai");
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "ramesh", conversation: "m5_side_chai" });
    expect(mm.isDone("m5_chai", "side_chai")).toBe(true);
    expect(mm.current("m5_chai")!.id).toBe("rockey");
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "rockey", conversation: "m5_rockey" });
    bus.emit("PLAYER_ENTERED_ZONE", { zone: "break", floor: 3 });
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "vibhu", conversation: "m5_vibhu" });
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "karan", conversation: "m5_karan" });
    bus.emit("STORY_EVENT", { id: "clue_env" });
    expect(mm.state("m5_chai")).toBe("COMPLETED");
  });

  it("failure is recoverable and paused missions ignore events", () => {
    const { bus, mm } = mk();
    mm.start("m1_arrival");
    mm.pause("m1_arrival");
    bus.emit("PLAYER_ENTERED_ZONE", { zone: "lobby_g", floor: 0 });
    expect(mm.isDone("m1_arrival", "enter")).toBe(false);
    mm.resume("m1_arrival");
    mm.fail("m1_arrival", "test");
    expect(mm.state("m1_arrival")).toBe("AVAILABLE");
    expect(mm.start("m1_arrival")).toBe(true);
  });

  it("full chapter completes and emits CHAPTER_COMPLETED once", () => {
    const { bus, mm } = mk();
    for (const d of MISSIONS) {
      mm.start(d.id);
      for (const o of d.objectives) if (!o.optional) mm.complete(d.id, o.id);
      expect(mm.state(d.id), d.id).toBe("COMPLETED");
    }
    expect(bus.count("CHAPTER_COMPLETED")).toBe(1);
  });

  it("progress round-trips through serialize/restore", () => {
    const { mm, bus } = mk();
    mm.start("m1_arrival");
    mm.complete("m1_arrival", "enter");
    const saved = JSON.parse(JSON.stringify(mm.serialize()));
    const mm2 = new MissionManager(MISSIONS, bus);
    mm2.restore(saved);
    expect(mm2.state("m1_arrival")).toBe("ACTIVE");
    expect(mm2.current("m1_arrival")!.id).toBe("call");
  });
});

describe("Event bus", () => {
  it("dispatches nested emits breadth-first in order", () => {
    const bus = new GameEventBus();
    const order: string[] = [];
    bus.on("STORY_EVENT", (p) => { order.push(p.id); if (p.id === "a") bus.emit("STORY_EVENT", { id: "b" }); order.push(`after-${p.id}`); });
    bus.emit("STORY_EVENT", { id: "a" });
    expect(order).toEqual(["a", "after-a", "b", "after-b"]);
  });
});
