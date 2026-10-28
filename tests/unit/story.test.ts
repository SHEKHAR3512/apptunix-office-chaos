import { describe, expect, it } from "vitest";
import { meetingReadiness } from "../../src/game/story/MeetingDirector";
import { zonesAt } from "../../src/game/story/ZoneTracker";

describe("meeting readiness", () => {
  it("waits for late participants until the timeout", () => {
    const ps = [{ id: "tushar", seatedInRoom: true }, { id: "rockey", seatedInRoom: false }];
    expect(meetingReadiness(ps, 5, 22)).toEqual({ ready: false, late: ["rockey"] });
    expect(meetingReadiness(ps, 22, 22)).toEqual({ ready: true, late: ["rockey"] });
  });
  it("is ready as soon as everyone is seated", () => {
    expect(meetingReadiness([{ id: "a", seatedInRoom: true }], 0, 22).ready).toBe(true);
  });
});

describe("story zones", () => {
  it("maps ground-floor lobby and street", () => {
    expect(zonesAt({ x: 8, y: 0, z: 2 }, 0, false).has("lobby_g")).toBe(true);
    expect(zonesAt({ x: 8, y: 0, z: -3 }, 0, false).has("street")).toBe(true);
  });
  it("maps 3rd-floor rooms, the lift and the player's desk", () => {
    expect(zonesAt({ x: 15, y: 12, z: 27 }, 3, false).has("cr1")).toBe(true);
    expect(zonesAt({ x: 6, y: 12, z: 28 }, 3, false).has("break")).toBe(true);
    expect([...zonesAt({ x: 15, y: 12, z: 27 }, 3, true)]).toEqual(["lift"]);
    expect(zonesAt({ x: 24, y: 12, z: 7 }, 3, false, { x: 24.5, z: 7.5 }).has("dragon_desk")).toBe(true);
    expect(zonesAt({ x: 15, y: 4, z: 27 }, 1, false).size).toBe(0);
  });
});
