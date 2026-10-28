import { describe, expect, it } from "vitest";
import { migrate, SAVE_VERSION } from "../../src/game/persistence/SaveSchema";

const v2 = () => ({
  version: 2, savedAt: 1, chapter: "ch1", player: { floor: 3, x: 1, y: 12, z: 2, yaw: 0.5 }, clock: 700,
  missions: { m1_arrival: { state: "COMPLETED", done: { enter: true } } }, flags: { "rel.tushar": 2 }, puzzles: {}, tickets: { "APX-301": "todo" },
  chat: [], unlocked: ["map"], chapterComplete: false, playTime: 10,
});

describe("Save schema", () => {
  it("accepts current saves (object or JSON string)", () => {
    expect(migrate(v2())).toMatchObject({ ok: true });
    expect(migrate(JSON.stringify(v2()))).toMatchObject({ ok: true });
  });
  it("migrates v1 saves to the current version", () => {
    const r = migrate({ version: 1, savedAt: 5, missions: { m1_arrival: "COMPLETED", m2_standup: "ACTIVE" }, flags: { a: true }, playerPos: [3, 12, 4], floor: 3, clock: 660 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migratedFrom).toBe(1);
    expect(r.data.version).toBe(SAVE_VERSION);
    expect(r.data.player).toMatchObject({ floor: 3, x: 3, y: 12, z: 4 });
    expect(r.data.missions.m2_standup).toEqual({ state: "ACTIVE", done: {} });
  });
  it("rejects corrupt, empty, future and unparseable data without throwing", () => {
    expect(migrate("{not json")).toMatchObject({ ok: false });
    expect(migrate(null)).toMatchObject({ ok: false });
    expect(migrate({ version: 99 })).toMatchObject({ ok: false });
    expect(migrate({ ...v2(), player: { floor: 3, x: "nope" } })).toMatchObject({ ok: false });
    expect(migrate({ ...v2(), missions: { m1_arrival: { state: "DANCING", done: {} } } })).toMatchObject({ ok: false });
    expect(migrate({ ...v2(), version: undefined })).toMatchObject({ ok: false });
  });
});
