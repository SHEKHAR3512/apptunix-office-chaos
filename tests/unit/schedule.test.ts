import { describe, expect, it } from "vitest";
import { jitter, resolveBlock } from "../../src/game/npc/NPCSchedule";
import { GameClock, formatTime, parseTime } from "../../src/game/GameClock";
import { SCHEDULES } from "../../src/data/schedules/templates";

describe("GameClock", () => {
  it("parses and formats times", () => {
    expect(parseTime("09:30")).toBe(570);
    expect(formatTime(570)).toBe("09:30");
    expect(formatTime(24 * 60 + 5)).toBe("00:05");
  });
  it("advances by scale and wraps days", () => {
    const c = new GameClock("23:59");
    c.scale = 2;
    c.tick(1);
    expect(c.label).toBe("00:01");
    expect(c.day).toBe(2);
  });
  it("does not advance while paused and notifies on each minute", () => {
    const c = new GameClock("10:00");
    let n = 0;
    c.onMinute(() => n++);
    c.paused = true; c.tick(10);
    expect(c.label).toBe("10:00");
    c.paused = false; c.tick(3);
    expect(n).toBe(3);
  });
});

describe("NPC schedules", () => {
  it("every template is ordered in time", () => {
    for (const t of Object.values(SCHEDULES)) {
      const times = t.blocks.map((b) => parseTime(b.at));
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });
  it("resolves the active block (schedule changes behaviour over the day)", () => {
    expect(resolveBlock("react", parseTime("10:00")).activity.kind).toBe("work");
    expect(resolveBlock("react", parseTime("11:05")).activity.kind).toBe("standup");
    expect(resolveBlock("react", parseTime("13:20")).activity.kind).toBe("lunch");
    expect(resolveBlock("lead", parseTime("12:15")).activity).toEqual({ kind: "meeting", room: "cr1" });
    expect(resolveBlock("dev", parseTime("07:00")).activity.kind).toBe("leave");
    expect(resolveBlock("dev", parseTime("19:00")).activity.kind).toBe("leave");
  });
  it("jitter is deterministic, bounded and varies between NPCs", () => {
    expect(jitter(42, 3)).toBe(jitter(42, 3));
    const vals = Array.from({ length: 50 }, (_, i) => jitter(i, 2));
    expect(Math.max(...vals.map(Math.abs))).toBeLessThanOrEqual(8);
    expect(new Set(vals).size).toBeGreaterThan(5);
  });
  it("jitter never reorders blocks enough to skip a block entirely", () => {
    for (let seed = 0; seed < 100; seed++) {
      const seen = new Set<number>();
      for (let m = parseTime("09:00"); m < parseTime("19:00"); m++) { const i = resolveBlock("react", m, seed).index; if (i >= 0) seen.add(i); }
      expect(seen.size).toBe(SCHEDULES.react.blocks.length);
    }
  });
});

describe("micro-breaks", () => {
  it("about half the office takes one short, staggered break in a long work block", async () => {
    const { microBreak, resolveBlock } = await import("../../src/game/npc/NPCSchedule");
    const takers: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const blk = resolveBlock("dev", 14 * 60, seed);
      let first = -1, mins = 0;
      for (let m = blk.start; m < blk.end; m++) if (microBreak(blk, m, seed)) { mins++; if (first < 0) first = m; }
      expect([0, 6]).toContain(mins);
      if (first >= 0) takers.push(first);
    }
    expect(takers.length).toBeGreaterThan(10);
    expect(takers.length).toBeLessThan(32);
    expect(new Set(takers).size).toBeGreaterThan(takers.length * 0.6); // not in lock-step
  });
  it("is deterministic for a seed, different across days, and never touches non-work blocks", async () => {
    const { microBreak, resolveBlock } = await import("../../src/game/npc/NPCSchedule");
    const blk = resolveBlock("dev", 14 * 60, 7);
    const run = (day: number) => Array.from({ length: blk.end - blk.start }, (_, i) => !!microBreak(blk, blk.start + i, 7, day)).join();
    expect(run(0)).toBe(run(0));
    const days = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(run));
    expect(days.size).toBeGreaterThan(1);
    const lunch = resolveBlock("dev", 13 * 60 + 10, 7);
    expect(microBreak(lunch, 13 * 60 + 20, 7)).toBeNull();
  });
});
