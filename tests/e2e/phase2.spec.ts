import { test } from "@playwright/test";
import { boot, expect, g, hold, shot } from "./helpers";

test.describe("Phase 2 — characters, NPC AI, interactions", () => {
  test("1-4 · DRAGON spawns, moves with WASD, collides, camera follows, run is faster", async ({ page }, info) => {
    const errors = await boot(page, "&start=office");
    expect(await g(page, `return g.character.config.name`)).toBe("DRAGON");
    expect(await g(page, `return g.character.meshes.length > 0 && g.character.root.isEnabled()`)).toBe(true);
    expect(await g(page, `return g.character.skeleton.bones.length`)).toBe(31);
    // open run down the main corridor
    await g(page, `g.teleportToFloor(3, new V(12, 12, 15.25), Math.PI / 2); g.cam.yaw = Math.PI / 2;`);
    await page.waitForTimeout(300);
    const x0 = await g<number>(page, `return g.player.pos.x`);
    await hold(page, ["KeyW"], 1200);
    const x1 = await g<number>(page, `return g.player.pos.x`);
    expect(x1 - x0).toBeGreaterThan(1.2);
    const camDist = await g<number>(page, `return V.Distance(g.camera.position, g.player.pos)`);
    expect(camDist).toBeLessThan(6);
    // run
    await page.keyboard.down("ShiftLeft"); await page.keyboard.down("KeyW");
    await page.waitForTimeout(900);
    const runSpeed = await g<number>(page, `return g.player.move.speed`);
    await page.keyboard.up("KeyW"); await page.keyboard.up("ShiftLeft");
    expect(runSpeed).toBeGreaterThan(3.5);
    expect(await g(page, `return g.character.animator.base`)).toBe("Locomotion");
    // collision: walk into the reception logo wall (x = 18)
    await g(page, `g.teleportToFloor(3, new V(16.5, 12, 6), Math.PI / 2); g.cam.yaw = Math.PI / 2;`);
    await hold(page, ["KeyW"], 2500);
    expect(await g<number>(page, `return g.player.pos.x`)).toBeLessThan(17.95);
    await g(page, `g.teleportToFloor(3, new V(12.6, 12, 5.0), Math.PI / 2); g.cam.yaw = Math.PI / 2;`);
    await page.waitForTimeout(800);
    await shot(page, "dragon-reception", info.project.name);
    expect(errors).toEqual([]);
  });

  test("5-7 · React NPCs at their desks, every department staffed", async ({ page }, info) => {
    await boot(page, "&start=react&time=10:00");
    const placed = await g<{ id: string; d: number; state: string }[]>(page, `
      return ["tushar","mohit","arpit","vibhu","rockey","karan"].map(id => {
        const n = g.life.npcs.get(id); const a = g.ctx.anchors.get(n.char.config.desk);
        return { id, d: V.Distance(n.pos, a.position), state: n.state };
      });`);
    for (const p of placed) {
      expect(p.d, p.id).toBeLessThan(0.05);
      expect(["TYPING", "WORKING", "SITTING"], p.id).toContain(p.state);
    }
    const depts = await g<Record<string, number>>(page, `const c = {}; for (const n of g.life.npcs.npcs) c[n.char.config.department] = (c[n.char.config.department] || 0) + 1; return c;`);
    for (const d of ["angular", "node", "devops", "design", "qa"]) expect(depts[d], d).toBeGreaterThanOrEqual(4);
    expect(depts.react).toBe(6);
    expect(depts.hr).toBeGreaterThanOrEqual(1);
    expect(depts.reception).toBe(1);
    await g(page, `g.cam.setView(new V(27.5, 14.0, 12.6), new V(22.5, 12.6, 6.5));`);
    await page.waitForTimeout(800);
    await shot(page, "react-team-at-work", info.project.name);
    await g(page, `g.cam.setView(new V(38.0, 14.2, 13.2), new V(34, 12.5, 6));`);
    await page.waitForTimeout(800);
    await shot(page, "employees-at-work", info.project.name);
  });

  test("8 · NPCs navigate around furniture without passing through walls", async ({ page }) => {
    await boot(page, "&start=react&time=10:00");
    // send Karan from his desk to the pantry coffee machine (crosses the floor, two door-less corridors)
    await g(page, `g.life.npcs.get("karan").force({ kind: "break", spot: "coffee" });`);
    const samples: { x: number; z: number; inWall: boolean }[] = [];
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);
      samples.push(await g(page, `
        const n = g.life.npcs.get("karan"); const p = n.pos;
        const inWall = g.ctx.colliders.list.some(c => (c.tag === "wall" || c.tag === "glass") && c.enabled && p.x > c.minX + 0.05 && p.x < c.maxX - 0.05 && p.z > c.minZ + 0.05 && p.z < c.maxZ - 0.05 && p.y + 1 > c.minY && p.y < c.maxY);
        return { x: p.x, z: p.z, inWall, state: n.state };`));
      if (await g(page, `return g.life.npcs.get("karan").state === "ON_BREAK"`)) break;
    }
    expect(samples.filter((s) => s.inWall)).toEqual([]);
    expect(await g(page, `return g.life.npcs.get("karan").state`)).toBe("ON_BREAK");
    const end = samples[samples.length - 1];
    expect(Math.hypot(end.x - 1.3, end.z - 28.4)).toBeLessThan(1.2);
  });

  test("9-10 · DRAGON sits at his desk aligned to the chair and uses the computer", async ({ page }, info) => {
    await boot(page, "&start=react");
    await g(page, `const s = g.life.seats.get("react.dragon.chair"); g.teleportToFloor(3, new V(s.exitX, 12, s.exitZ), 0); g.player.move.yaw = Math.atan2(s.x - s.exitX, s.z - s.exitZ);`);
    await page.waitForTimeout(400);
    expect(await g(page, `return g.life.interactions.prompt`)).toContain("Sit at your desk");
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(1800);
    const seated = await g<{ mode: string; d: number; dy: number; occ: string }>(page, `const s = g.life.seats.get("react.dragon.chair"); return { mode: g.player.mode, d: Math.hypot(g.player.pos.x - s.x, g.player.pos.z - s.z), dy: Math.abs(g.player.yaw - s.yaw), occ: g.life.seats.occupantOf(s.id) };`);
    expect(seated.mode).toBe("seated");
    expect(seated.d).toBeLessThan(0.01);
    expect(seated.dy).toBeLessThan(0.01);
    expect(seated.occ).toBe("player");
    await page.keyboard.press("KeyE");
    await expect.poll(() => g(page, `return window.__hud.computer`)).toBe("desktop");
    await page.waitForTimeout(500);
    await shot(page, "dragon-computer", info.project.name);
    await page.keyboard.press("Escape");
    await expect.poll(() => g(page, `return window.__hud.computer`)).toBeNull();
    await page.keyboard.press("KeyX");
    await expect.poll(() => g(page, `return g.player.mode`)).toBe("free");
    expect(await g(page, `return g.life.seats.isFree("react.dragon.chair")`)).toBe(true);
  });

  test("11-12 · Conversation with Tushar opens, faces each other, closes", async ({ page }, info) => {
    await boot(page, "&start=react&time=09:50");
    await g(page, `const t = g.life.npcs.get("tushar"); g.teleportToFloor(3, new V(t.pos.x + 0.9, 12, t.pos.z - 0.9), 0); g.player.move.yaw = Math.atan2(-0.9, 0.9);`);
    await page.waitForTimeout(500);
    expect(await g(page, `return g.life.interactions.prompt`)).toContain("Talk to Tushar");
    await page.keyboard.press("KeyE");
    await expect.poll(() => g(page, `return window.__hud.dialogue && window.__hud.dialogue.speaker`)).toBe("Tushar");
    await page.waitForTimeout(1500);
    const facing = await g<{ npc: number; player: number }>(page, `
      const t = g.life.npcs.get("tushar"), p = g.player.pos;
      const ang = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return { npc: ang(t.yaw, Math.atan2(p.x - t.pos.x, p.z - t.pos.z)), player: ang(g.player.yaw, Math.atan2(t.pos.x - p.x, t.pos.z - p.z)) };`);
    expect(facing.npc).toBeLessThan(0.25);
    expect(facing.player).toBeLessThan(0.35);
    expect(await g(page, `return g.player.move.locked`)).toBe(true);
    await shot(page, "conversation-tushar", info.project.name);
    await page.keyboard.press("Digit3");
    for (let i = 0; i < 8 && (await g(page, `return !!window.__hud.dialogue`)); i++) {
      const ch = await g<number>(page, `return window.__hud.dialogue.choices.length`);
      await page.keyboard.press(ch ? "Digit1" : "KeyE");
      await page.waitForTimeout(500);
    }
    expect(await g(page, `return window.__hud.dialogue`)).toBeNull();
    expect(await g(page, `return g.player.mode`)).toBe("free");
    expect(await g(page, `return g.life.dialogue.flags.get("talked:tushar")`)).toBe(true);
  });

  test("13-14 · Schedules change behaviour and CR1 seating works", async ({ page }, info) => {
    await boot(page, "&start=react&time=10:58");
    expect(await g(page, `return g.life.npcs.get("rockey").activity.kind`)).toBe("work");
    // jump into the 11:00–11:15 stand-up window (jitter ≤ 5 min) and let Rockey walk over in real time
    await g(page, `g.life.clock.scale = 0.2; g.life.clock.set("11:07");`);
    await expect.poll(() => g(page, `return g.life.npcs.get("rockey").activity.kind`), { timeout: 10_000 }).toBe("standup");
    await expect.poll(() => g(page, `return g.life.npcs.get("rockey").state`), { timeout: 45_000 }).toBe("IN_MEETING");
    // CR1 all-hands
    await g(page, `g.life.clock.scale = 1; g.life.clock.set("12:12"); g.life.npcs.catchUp();`);
    await page.waitForTimeout(1500);
    const inCr1 = await g<number>(page, `return g.life.npcs.npcs.filter(n => n.seatId && n.seatId.startsWith("cr1")).length`);
    expect(inCr1).toBeGreaterThanOrEqual(4);
    await g(page, `const free = g.life.seats.inZone("cr1", "meeting").find(s => g.life.seats.isFree(s.id)); window.__seat = free.id; g.teleportToFloor(3, new V(free.x - Math.sin(free.yaw) * 0.6, 12, free.z - Math.cos(free.yaw) * 0.6), free.yaw);`);
    await page.waitForTimeout(500);
    expect(await g(page, `return g.life.interactions.prompt`)).toContain("Sit");
    await page.keyboard.press("KeyE");
    await expect.poll(() => g(page, `return g.player.mode`)).toBe("seated");
    expect(await g(page, `return g.life.seats.occupantOf(window.__seat)`)).toBe("player");
    await g(page, `g.cam.setView(new V(21.2, 14.2, 25.8), new V(14, 12.4, 30.5));`);
    await page.waitForTimeout(900);
    await shot(page, "cr1-meeting", info.project.name);
    await g(page, `g.cam.setFly(false);`); // back to the gameplay camera (interactions are off in free-fly)
    await page.waitForTimeout(300); // interactions re-enable on the next frame after leaving free-fly
    await page.keyboard.press("KeyX");
    await expect.poll(() => g(page, `return g.player.mode`)).toBe("free");
  });

  test("15-16 · renderer works and frame rate is reasonable", async ({ page }, info) => {
    const errors = await boot(page, "&start=react");
    const backend = await g<string>(page, `return g.backend`);
    expect(backend).toBe(info.project.name);
    await page.waitForTimeout(3000);
    const fps = await g<number>(page, `return g.engine.getFps()`);
    expect(fps).toBeGreaterThan(30);
    expect(await g(page, `return g.life.npcs.npcs.length`)).toBeGreaterThanOrEqual(28);
    expect(errors).toEqual([]);
  });
});
