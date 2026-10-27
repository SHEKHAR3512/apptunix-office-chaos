import { describe, expect, it } from "vitest";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { REACT_DIALOGUES } from "../../src/data/dialogues/react";
import { OFFICE_DIALOGUES } from "../../src/data/dialogues/office";
import { ROSTER } from "../../src/data/characters/roster";
import { parseTime } from "../../src/game/GameClock";

const ALL = [...REACT_DIALOGUES, ...OFFICE_DIALOGUES];

describe("Dialogue data integrity", () => {
  it("every next/choice target exists", () => {
    for (const c of ALL) for (const n of Object.values(c.nodes)) {
      if (n.next) expect(c.nodes[n.next], `${c.id}.${n.id} → ${n.next}`).toBeDefined();
      for (const ch of n.choices ?? []) if (ch.next) expect(c.nodes[ch.next], `${c.id}.${n.id} choice → ${ch.next}`).toBeDefined();
    }
  });
  it("every roster character's conversation exists", () => {
    const ids = new Set(ALL.map((c) => c.id));
    for (const ch of ROSTER) expect(ids.has(ch.dialogue ?? `${ch.department}_generic`), ch.id).toBe(true);
  });
});

describe("Dialogue engine", () => {
  const mk = () => { const d = new DialogueManager(); d.register(ALL); return d; };

  it("Tushar intro: brief's lines, three replies, branching and flags", () => {
    const d = mk();
    const v = d.start("tushar_intro")!;
    expect(v.node.text).toBe("Dragon, aa gaye? Aaj ka task check kar lena.");
    expect(v.choices.map((c) => c.text)).toEqual(["Okay sir.", "Koi priority issue hai?", "Team standup kab hai?"]);
    const v2 = d.advance(1)!;
    expect(v2.node.id).toBe("priority");
    expect(d.flags.get("task.priority")).toBe("payment-crash");
    expect(d.flags.get("tushar.met")).toBe(true);
    let cur = d.active;
    let guard = 0;
    while (cur && guard++ < 10) cur = d.advance(0);
    expect(d.active).toBeNull();
    expect(d.flags.get("talked:tushar")).toBe(true);
    // second conversation picks a different entry
    expect(d.start("tushar_intro")!.node.id).toBe("repeat");
  });

  it("Mohit and Rockey branches from the brief", () => {
    const d = mk();
    expect(d.start("mohit_intro")!.choices.map((c) => c.text)).toEqual(["Haan, fix kar diya.", "Abhi check kar raha hoon."]);
    d.end();
    const events: string[] = [];
    d.onEvent = (e) => events.push(e.type);
    const r = d.start("rockey_chai")!;
    expect(r.node.text).toBe("Bro, chai break?");
    expect(r.choices.map((c) => c.text)).toEqual(["Chalo!", "Thodi der baad."]);
    d.advance(0);
    expect(events).toContain("npcActivity");
    expect(d.flags.get("rockey.chai")).toBe(true);
  });

  it("time conditions select entries", () => {
    const d = mk();
    d.now = () => parseTime("09:40");
    expect(d.start("reception")!.node.id).toBe("morning");
    d.end();
    d.now = () => parseTime("15:00");
    expect(d.start("reception")!.node.id).toBe("day");
  });

  it("emits dialogueEnded and supports conditions", () => {
    const d = mk();
    const names: string[] = [];
    d.onEvent = (e) => { if (e.type === "emit") names.push(e.name); };
    d.start("devops_generic");
    d.advance(0);
    expect(names).toContain("dialogueEnded");
    d.flags.set("x", 3);
    expect(d.check({ flag: "x", equals: 3 })).toBe(true);
    expect(d.check({ all: [{ flag: "x" }, { flag: "y", not: true }] })).toBe(true);
    expect(d.check({ any: [{ flag: "y" }, { flag: "z" }] })).toBe(false);
  });
});

describe("Roster", () => {
  it("meets the Phase 2 population targets", () => {
    const by = (d: string) => ROSTER.filter((c) => c.department === d).length;
    expect(ROSTER.filter((c) => c.department === "react").map((c) => c.name).sort()).toEqual(["Arpit", "Karan", "Mohit", "Rockey", "Tushar", "Vibhu"]);
    for (const d of ["angular", "node", "devops", "design", "qa"]) expect(by(d), d).toBeGreaterThanOrEqual(4);
    expect(by("hr")).toBeGreaterThanOrEqual(1);
    expect(by("reception")).toBe(1);
    expect(ROSTER.length + 1).toBeGreaterThanOrEqual(29); // + DRAGON
    expect(new Set(ROSTER.map((c) => c.id)).size).toBe(ROSTER.length);
    expect(ROSTER.find((c) => c.id === "rockey")!.appearance.hair.style).toBe("turban");
  });
  it("no two characters share a desk", () => {
    const desks = ROSTER.map((c) => c.desk).filter(Boolean);
    expect(new Set(desks).size).toBe(desks.length);
  });
});
