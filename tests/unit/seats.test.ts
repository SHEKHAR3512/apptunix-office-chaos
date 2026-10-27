import { describe, expect, it } from "vitest";
import { SeatRegistry } from "../../src/game/interactions/SeatRegistry";
import { scoreInteractable } from "../../src/game/interactions/Interactable";

const seat = (id: string, zone = "cr1") => ({ id, x: 0, y: 0, z: 0, yaw: 0, zone, kind: "meeting" as const });

describe("Seat reservations", () => {
  it("prevents two characters occupying the same chair", () => {
    const r = new SeatRegistry();
    r.add(seat("a")); r.add(seat("b"));
    expect(r.reserve("a", "tushar")).toBe(true);
    expect(r.reserve("a", "player")).toBe(false);
    expect(r.occupantOf("a")).toBe("tushar");
    expect(r.firstFree(["a", "b"])).toBe("b");
  });
  it("a character holds at most one seat; release only by the holder", () => {
    const r = new SeatRegistry();
    r.add(seat("a")); r.add(seat("b"));
    r.reserve("a", "mohit");
    r.reserve("b", "mohit");
    expect(r.isFree("a")).toBe(true);
    r.release("b", "someone-else");
    expect(r.isFree("b")).toBe(false);
    r.release("b", "mohit");
    expect(r.isFree("b")).toBe(true);
  });
});

describe("Interaction selection", () => {
  it("rejects targets out of range or behind the player", () => {
    expect(scoreInteractable(0, 0, 0, 0, 0, 3, 0, 2, true)).toBeNull();
    expect(scoreInteractable(0, 0, 0, 0, 0, -1, 0, 2, true)).toBeNull();
    expect(scoreInteractable(0, 0, 0, 0, 0, -1, 0, 2, false)).not.toBeNull();
    expect(scoreInteractable(0, 0, 0, 0, 0, 1, 3, 2, true)).toBeNull(); // other storey
  });
  it("prefers closer, more centred and higher-priority targets", () => {
    const near = scoreInteractable(0, 0, 0, 0, 0, 0.8, 0, 2, true)!;
    const far = scoreInteractable(0, 0, 0, 0, 0, 1.6, 0, 2, true)!;
    const side = scoreInteractable(0, 0, 0, 0, 1.0, 0.6, 0, 2, true)!;
    expect(near).toBeLessThan(far);
    expect(near).toBeLessThan(side);
    expect(scoreInteractable(0, 0, 0, 0, 0, 1.6, 0, 2, true, 2)!).toBeLessThan(near);
  });
});
