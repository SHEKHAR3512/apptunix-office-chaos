import { describe, expect, it } from "vitest";
import { StateMachine } from "../../src/game/npc/NPCStateMachine";

describe("NPC state machine", () => {
  it("runs enter/exit hooks and records history", () => {
    const log: string[] = [];
    const ctx = { ticks: 0 };
    const fsm = new StateMachine(ctx, {
      IDLE: { enter: () => log.push("enter IDLE"), exit: () => log.push("exit IDLE") },
      WALKING: { enter: () => log.push("enter WALKING"), update: (c) => { c.ticks++; return c.ticks > 2 ? "SITTING" : undefined; } },
      SITTING: { enter: () => log.push("enter SITTING") },
    }, "IDLE");
    fsm.go("WALKING");
    fsm.update(0.1); fsm.update(0.1); fsm.update(0.1);
    expect(fsm.state).toBe("SITTING");
    expect(log).toEqual(["exit IDLE", "enter WALKING", "enter SITTING"]);
    expect(fsm.history.map((h) => h.to)).toEqual(["WALKING", "SITTING"]);
  });
  it("ignores transitions to the current state and resets state time", () => {
    const fsm = new StateMachine({}, {}, "WORKING");
    fsm.update(1);
    expect(fsm.time).toBe(1);
    fsm.go("WORKING");
    expect(fsm.history.length).toBe(0);
    fsm.go("TYPING");
    expect(fsm.time).toBe(0);
  });
});
