import { describe, expect, it } from "vitest";
import { SIDE_DIALOGUES } from "../../src/data/dialogues/side";
import { CHAPTER1_DIALOGUES } from "../../src/data/dialogues/chapter1";
import { GameEventBus } from "../../src/game/gameplay/GameEventBus";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { MissionManager } from "../../src/game/missions/MissionManager";
import { MISSIONS, validateMissions } from "../../src/game/missions/MissionRegistry";
import { migrate } from "../../src/game/persistence/SaveSchema";
import { PuzzleEngine } from "../../src/game/minigames/PuzzleEngine";
import { PUZZLES } from "../../src/data/puzzles/chapter1";

const mk = () => { const bus = new GameEventBus(); const mm = new MissionManager(MISSIONS, bus); mm.refreshAvailability(); return { bus, mm }; };
const side = MISSIONS.filter((m) => m.category === "side");
const done = (mm: MissionManager, id: string) => { const d = mm.def(id)!; mm.progress.get(id)!.state = "COMPLETED"; for (const o of d.objectives) mm.progress.get(id)!.done[o.id] = true; };

describe("Side jobs", () => {
  it("five valid side jobs, each with a trigger, hints-or-markers and a reward", () => {
    expect(validateMissions(MISSIONS)).toEqual([]);
    expect(side.length).toBeGreaterThanOrEqual(5);
    const convs = new Set([...SIDE_DIALOGUES, ...CHAPTER1_DIALOGUES].map((c) => c.id));
    for (const m of side) {
      expect(m.trigger?.npc || m.trigger?.object, m.id).toBeTruthy();
      if (m.trigger?.conversation) expect(convs.has(m.trigger.conversation), m.id).toBe(true);
      for (const o of m.objectives) if (o.target.conversation) expect(convs.has(o.target.conversation), `${m.id}.${o.id}`).toBe(true);
      expect(m.objectives.every((o) => o.marker || o.hint || o.type === "MAKE_DIALOGUE_CHOICE"), m.id).toBe(true);
      expect(Object.keys(m.rewards.flags ?? {}).length, m.id).toBeGreaterThan(0);
    }
  });
  it("are never required for the chapter", () => {
    const { bus, mm } = mk();
    let chapter = 0; bus.on("CHAPTER_COMPLETED", () => chapter++);
    for (const id of ["m1_arrival", "m2_standup", "m3_react_bug", "m4_qa", "m5_chai"]) done(mm, id);
    mm.refreshAvailability(); mm.start("m6_ship");
    for (const o of mm.def("m6_ship")!.objectives) mm.complete("m6_ship", o.id);
    expect(chapter).toBe(1);
    expect(side.every((m) => mm.state(m.id) !== "COMPLETED")).toBe(true);
  });
  it("can be completed before the main mission and run alongside it without cross-talk", () => {
    const { bus, mm } = mk();
    mm.start("m1_arrival"); done(mm, "m1_arrival"); mm.refreshAvailability();
    expect(mm.state("s2_chai")).toBe("AVAILABLE");
    mm.start("m2_standup"); mm.start("s2_chai");
    const m2before = JSON.stringify(mm.progress.get("m2_standup"));
    for (const npc of ["arpit", "tushar", "neha"]) bus.emit("NPC_DIALOGUE_COMPLETED", { npc, conversation: `s2_${npc}` });
    bus.emit("OBJECT_INTERACTED", { object: "coffee" });
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "rockey", conversation: "s2_done" });
    expect(mm.state("s2_chai")).toBe("COMPLETED");
    expect(JSON.stringify(mm.progress.get("m2_standup"))).toBe(m2before); // main story untouched
    expect(mm.state("m2_standup")).toBe("ACTIVE");
  });
  it("events out of order don't skip steps (talking to Rockey early does nothing)", () => {
    const { bus, mm } = mk();
    done(mm, "m1_arrival"); mm.refreshAvailability(); mm.start("s2_chai");
    bus.emit("NPC_DIALOGUE_COMPLETED", { npc: "rockey", conversation: "s2_done" });
    bus.emit("OBJECT_INTERACTED", { object: "coffee" });
    expect(mm.current("s2_chai")?.id).toBe("arpit");
  });
  it("riddle: a wrong answer doesn't count, the right one does", () => {
    const { bus, mm } = mk();
    done(mm, "m1_arrival"); mm.refreshAvailability(); mm.start("s3_whiteboard");
    bus.emit("DIALOGUE_CHOICE", { conversation: "s3_riddle", node: "q", choice: "lift" });
    expect(mm.isDone("s3_whiteboard", "solve")).toBe(false);
    bus.emit("DIALOGUE_CHOICE", { conversation: "s3_riddle", node: "q", choice: "keyboard" });
    expect(mm.isDone("s3_whiteboard", "solve")).toBe(true);
  });
  it("interrupted side job resumes from a save at the same objective", () => {
    const a = mk();
    done(a.mm, "m1_arrival"); a.mm.refreshAvailability(); a.mm.start("s5_rooms");
    a.bus.emit("OBJECT_INSPECTED", { object: "cr2_booking" });
    const b = mk(); b.mm.restore(a.mm.serialize());
    expect(b.mm.state("s5_rooms")).toBe("ACTIVE");
    expect(b.mm.current("s5_rooms")?.id).toBe("ishita");
  });
  it("Phase 3 saves (no side jobs) load and side jobs unlock from existing progress", () => {
    const old = { version: 2, savedAt: 1, chapter: "ch1", player: { floor: 3, x: 1, y: 12, z: 2, yaw: 0 }, clock: 700,
      missions: Object.fromEntries(["m1_arrival", "m2_standup", "m3_react_bug", "m4_qa"].map((id) => [id, { state: "COMPLETED", done: {} }])),
      flags: {}, puzzles: { qa_reproduce: { solved: true, attempts: 0, hints: 0 } }, tickets: {}, chat: [], unlocked: [], chapterComplete: false, playTime: 1 };
    const r = migrate(old); expect(r.ok).toBe(true); if (!r.ok) return;
    const { mm } = mk(); mm.restore(r.data.missions);
    for (const id of ["s1_ticket", "s2_chai", "s3_whiteboard", "s4_qa", "s5_rooms"]) expect(mm.state(id), id).toBe("AVAILABLE");
    const pe = new PuzzleEngine(PUZZLES, { solved() {}, failed() {} } as never);
    pe.restore(r.data.puzzles as never);
    expect(pe.state("qa_side_small").solved).toBe(false);
  });
  it("QA verification pass: only the smallest phone confirms it", () => {
    const pe = new PuzzleEngine(PUZZLES, { solved() {}, failed() {} } as never);
    pe.setWidth("qa_side_small", 360); expect(pe.report("qa_side_small")).toBe(false);
    pe.setWidth("qa_side_small", 320); expect(pe.report("qa_side_small")).toBe(true);
    expect(pe.state("qa_side_small").feedback).toMatch(/holds/);
  });
});

describe("Story consequences", () => {
  const dm = () => { const d = new DialogueManager(() => 600); d.register([...CHAPTER1_DIALOGUES, ...SIDE_DIALOGUES]); return d; };
  const lines = (d: DialogueManager, conv: string, pick = 0) => {
    const out: string[] = []; let v = d.start(conv);
    for (let i = 0; v && i < 20; i++) { out.push(v.node.id); v = d.advance(v.choices.length ? pick : undefined); }
    return out;
  };
  it("Tushar acknowledges side jobs only when they were done", () => {
    expect(lines(dm(), "m6_tushar")).not.toContain("ack_rooms");
    const d = dm(); d.flags.set("side.rooms", true); d.flags.set("side.qa", true);
    expect(lines(d, "m6_tushar")).toEqual(expect.arrayContaining(["ack_rooms", "ack_qa", "go"]));
  });
  it("missing an optional job changes ambient lines, never blocks", () => {
    expect(lines(dm(), "fr_rockey")).toEqual(["missed"]);
    const d = dm(); d.flags.set("side.chai", true);
    expect(lines(d, "fr_rockey")).toEqual(["done"]);
  });
  it("asking Mohit for help changes his later line", () => {
    const d = dm(); d.flags.set("rel.mohit", 2);
    expect(lines(d, "fr_mohit")).toEqual(["friend"]);
  });
});
