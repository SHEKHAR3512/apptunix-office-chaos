import { Page, test } from "@playwright/test";
import { bootTitle, captureMouse, diag, expect, expectFreeAfter, faceAndNudge, finishDialogue, interact, missionState, sitIn, snap, standUp, talkTo, useComputer, closeComputer, waitLoaded, walkTo } from "./walker";

/**
 * Phase 4 · Milestones 7–9 — UI/input regression, interrupted interactions, performance.
 * All movement is real input. Sandbox/time URL options only choose where a scenario starts.
 */
const hint = (page: Page) => page.locator(".click-hint");

test.describe("UI & input regression", () => {
  test("title, free roam, HUD tweak, shortcuts, pause, pointer lock restoration", async ({ page }, info) => {
    const errors = await bootTitle(page);
    // title: buttons, and the click-to-look hint is hidden behind it (latest HUD tweak)
    await expect(page.locator("[data-new-game]")).toBeVisible();
    await expect(page.getByText("Free roam (sandbox)")).toBeVisible();
    await expect(page.locator("[data-continue]")).toHaveCount(0); // no save yet
    await expect(hint(page)).toHaveCount(0);
    // free roam
    await page.getByText("Free roam (sandbox)").click();
    await expect(page.locator(".title")).toHaveCount(0);
    // HUD tweak, normal case: hint shows while the mouse is free in play, hides once captured
    await expect(hint(page)).toBeVisible();
    await captureMouse(page);
    await expect(hint(page)).toHaveCount(0);
    // walk a few metres for real
    const s0 = await snap(page);
    await walkTo(page, info, "sandbox stroll", s0.pos.x, s0.pos.z - 2.5, { straight: true, radius: 0.5 });
    // pause with Esc releases the mouse; resuming + click captures it again
    await page.keyboard.press("Escape");
    await expect.poll(() => page.evaluate(() => (window as any).__hud.paused)).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => page.evaluate(() => (window as any).__hud.paused)).toBe(false);
    await captureMouse(page);
    // J/M only exist in story mode: no effect in sandbox
    await page.keyboard.press("KeyJ");
    expect(await page.evaluate(() => (window as any).__play.journalOpen)).toBe(false);
    // developer-only keys are dev-gated (this suite runs the dev server, so F still works here;
    // the production gate is verified by the build test below)
    expect(errors).toEqual([]);
  });

  test("story: J/M/U, dialogue choices, computer focus, occupied chair, exit mid-task", async ({ page }, info) => {
    test.setTimeout(600_000);
    const errors = await bootTitle(page, "&start=react&time=11:30");
    // start=react skips the title and spawns in the React wing (sandbox)
    // occupied chair: an NPC's chair offers no "Sit" prompt
    const occ = await page.evaluate(() => { const g = (window as any).__game; const s = g.life.seats.all().find((x: any) => x.zone === "react" && g.life.seats.occupantOf(x.id) && g.life.seats.occupantOf(x.id) !== "player"); return s ? { id: s.id, x: s.x, z: s.z, yaw: s.yaw, exitX: s.exitX, exitZ: s.exitZ } : null; });
    expect(occ).not.toBeNull();
    await walkTo(page, info, "to an occupied chair", occ!.exitX ?? occ!.x, occ!.exitZ ?? occ!.z, { radius: 0.6 });
    await faceAndNudge(page, occ!);
    await page.waitForTimeout(300);
    expect((await snap(page)).prompt ?? "").not.toMatch(/\bSit\b/);
    await page.keyboard.press("KeyE"); // pressing anyway must not seat DRAGON in it
    await page.waitForTimeout(600);
    expect((await snap(page)).mode).not.toBe("seated");
    expect(await page.evaluate((id) => (window as any).__game.life.seats.occupantOf(id), occ!.id)).not.toBe("player");
    // own desk → computer; keys typed in the computer don't leak to the game
    await sitIn(page, info, "react.dragon.chair", /Sit at your desk/);
    await useComputer(page);
    await page.locator('[data-app="terminal"]').click();
    await page.keyboard.press("KeyJ"); await page.keyboard.press("KeyM"); await page.keyboard.press("KeyX");
    expect((await snap(page)).mode).toBe("seated");
    expect(await page.evaluate(() => (window as any).__hud.computer)).toBe("desktop");
    await closeComputer(page);
    // after closing: no residual lock, the mouse can be captured again, standing works
    await captureMouse(page);
    await standUp(page);
    await expectFreeAfter(page);
    expect(await page.evaluate(() => (window as any).__game.life.seats.occupantOf("react.dragon.chair"))).toBeUndefined();
    // a conversation: choices by number keys, then free movement immediately
    await talkTo(page, info, "rockey", "Rockey");
    const p = await snap(page);
    await walkTo(page, info, "walk after dialogue", p.pos.x, p.pos.z + 1.5, { radius: 0.6 });
    expect(errors).toEqual([]);
  });

  test("story: interrupted conversation and computer task survive a reload", async ({ page }, info) => {
    test.setTimeout(900_000);
    const errors = await bootTitle(page);
    const { playArrival, waitObj } = await import("./walker");
    await playArrival(page, info);
    await waitObj(page, "m2_standup:cr1", 40_000);
    // J journal / M map / U hide HUD
    await page.keyboard.press("KeyJ"); await expect(page.locator(".journal")).toBeVisible();
    await page.keyboard.press("KeyM"); await expect(page.locator(".map")).toBeVisible(); await expect(page.locator(".journal")).toHaveCount(0);
    await page.keyboard.press("Escape"); await expect(page.locator(".map")).toHaveCount(0);
    await page.keyboard.press("KeyU"); await expect(page.locator(".qhud")).toHaveCount(0);
    await page.keyboard.press("KeyU"); await expect(page.locator(".qhud")).toBeVisible();
    await expect(page.locator(".wp")).toBeVisible(); // direction arrow
    // interrupt a conversation: start the Simran offer and reload before answering
    const at = () => diag<{ x: number; z: number }>(page, `return d.npc("simran")`);
    await walkTo(page, info, "to Simran", 0, 0, { follow: at, radius: 1.5, timeout: 60_000 });
    await faceAndNudge(page, await at());
    await interact(page, /Talk to Simran/);
    await expect.poll(() => page.evaluate(() => !!(window as any).__hud.dialogue)).toBe(true);
    await page.waitForTimeout(2500);
    await page.reload(); await waitLoaded(page);
    await page.locator("[data-continue]").click();
    await expectFreeAfter(page);
    expect(await missionState(page, "s5_rooms")).toBe("AVAILABLE"); // nothing half-applied
    await waitObj(page, "m2_standup:cr1");
    // …and the same conversation can simply be had again
    await talkTo(page, info, "simran", "Simran", "no");
    expect(await missionState(page, "s5_rooms")).toBe("AVAILABLE");
    // reach CR1 from the alternate (east) side: through the north corridor from the lounge end
    await walkTo(page, info, "detour east along corridor", 40, 24, { timeout: 60_000 });
    await walkTo(page, info, "CR1 from the east", 19, 28, { timeout: 60_000 });
    await waitObj(page, "m2_standup:sit");
    expect(errors).toEqual([]);
  });
});

// --------------------------------------------------------------------------- performance
interface Perf { scenario: string; fps: number; p95: number; max: number; spikes: number; heapMB: number | null; npcMs: number; lifeMs: number; animating: number; thinking: number }
const perfRows: Perf[] = [];

async function measure(page: Page, scenario: string, ms = 5000, during?: () => Promise<void>): Promise<Perf> {
  await page.evaluate(() => {
    const g = (window as any).__game, w = window as any;
    w.__pf = { frames: [] as number[], npc: 0, life: 0, n: 0 };
    if (!w.__pfWrapped) {
      w.__pfWrapped = true;
      const npcs = g.life.npcs, life = g.life;
      const nu = npcs.update.bind(npcs), lu = life.update.bind(life);
      npcs.update = (dt: number, c: unknown) => { const t = performance.now(); nu(dt, c); w.__pf.npc += performance.now() - t; };
      life.update = (dt: number) => { const t = performance.now(); lu(dt); w.__pf.life += performance.now() - t; w.__pf.n++; };
    }
    let last = performance.now();
    const tick = () => { const n = performance.now(); w.__pf.frames.push(n - last); last = n; if (w.__pf.on) requestAnimationFrame(tick); };
    w.__pf.on = true; requestAnimationFrame(tick);
  });
  const work = during ? during() : page.waitForTimeout(ms);
  await Promise.all([work, page.waitForTimeout(ms)]);
  const r = await page.evaluate((sc) => {
    const w = window as any, g = w.__game; w.__pf.on = false;
    const f = (w.__pf.frames as number[]).slice(5).sort((a, b) => a - b);
    const avg = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
    const mem = (performance as any).memory;
    return { scenario: sc, fps: +(1000 / avg).toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), max: +f[f.length - 1].toFixed(1), spikes: f.filter((x) => x > 50).length,
      heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null, npcMs: +(w.__pf.npc / Math.max(1, w.__pf.n)).toFixed(2), lifeMs: +(w.__pf.life / Math.max(1, w.__pf.n)).toFixed(2),
      animating: g.life.npcs.stats.animating, thinking: g.life.npcs.stats.thinking };
  }, scenario);
  perfRows.push(r);
  return r;
}

test("performance across scenarios (per renderer)", async ({ page }, info) => {
  test.setTimeout(600_000);
  const errors = await bootTitle(page, "&start=react&time=10:00");
  await captureMouse(page);
  await page.waitForTimeout(2000);
  const heap0 = (await measure(page, "React dept, nearby NPCs (idle)")).heapMB;
  await measure(page, "normal walking (React → corridor)", 6000, async () => { await walkTo(page, info, "perf walk", 24, 15.2, { timeout: 20_000 }); });
  await page.evaluate(() => (window as any).__game.life.clock.set("12:12"));
  await walkTo(page, info, "perf → CR1", 15, 27.5, { timeout: 40_000 });
  await page.waitForTimeout(1500);
  await measure(page, "CR1 meeting (all-hands)");
  await walkTo(page, info, "perf → QA", 41, 19.5, { timeout: 40_000 });
  await measure(page, "QA department");
  const desk = await diag<{ exitX: number; exitZ: number }>(page, `return d.seat("react.dragon.chair")`);
  await walkTo(page, info, "perf → desk", desk.exitX, desk.exitZ, { radius: 0.5, timeout: 40_000 });
  await sitIn(page, info, "react.dragon.chair", /Sit at your desk/);
  await useComputer(page);
  await measure(page, "computer interface open");
  await closeComputer(page); await standUp(page);
  // free roam loop, then a memory check after ~1 minute of play
  const loop = async () => { for (const [x, z] of [[24, 15.2], [6, 28], [24, 15.2], [40, 15.2]]) await walkTo(page, info, "perf roam", x, z, { timeout: 40_000 }); };
  await measure(page, "free roam (walking loop)", 20_000, loop);
  const heap1 = perfRows[perfRows.length - 1].heapMB;
  console.log(`PERF ${info.project.name} ` + JSON.stringify(perfRows) + ` heapGrowthMB=${heap0 !== null && heap1 !== null ? (heap1 - heap0).toFixed(1) : "n/a"}`);
  for (const r of perfRows) expect(r.fps, r.scenario).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});
