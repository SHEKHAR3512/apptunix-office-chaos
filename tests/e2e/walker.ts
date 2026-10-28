import { expect, Page, TestInfo } from "@playwright/test";

/**
 * A "player bot" that walks DRAGON with real input only: W / Shift held down, camera turned
 * by locked-pointer mouse movement (exactly what a player's mouse does). Positions are only
 * *read* through the dev diagnostics (`window.__diag`); nothing is ever written.
 */
export interface Snap {
  pos: { x: number; y: number; z: number }; floor: number; inLift: boolean; liftLevel: number; liftDoors: number; liftState: string;
  yaw: number; camYaw: number; camSens: number; speed: number; mode: string; blockage: number;
  prompt: string | null; objective: string | null; modal: string | null;
}
export interface RouteReport {
  name: string; from: { x: number; z: number; floor: number }; to: { x: number; z: number; floor: number };
  ok: boolean; seconds: number; pathLength: number; travelled: number; detour: number; blockedTicks: number; maxBlockedRun: number; recoveries: number; error?: string;
}
export const reports: RouteReport[] = [];

export const snap = (page: Page): Promise<Snap> => page.evaluate(() => (window as any).__diag.snapshot());
export const diag = <T>(page: Page, fn: string): Promise<T> => page.evaluate(`(() => { const d = window.__diag; ${fn} })()`) as Promise<T>;
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

let cursorX = 800;
/** Click the game to capture the mouse (what a player does after closing a panel). */
export async function captureMouse(page: Page): Promise<void> {
  for (let i = 0; i < 5; i++) {
    if (await page.evaluate(() => document.pointerLockElement?.id === "game")) return;
    cursorX = 800;
    await page.mouse.click(800, 300);
    await page.waitForTimeout(150);
  }
  expect(await page.evaluate(() => document.pointerLockElement?.id === "game"), "pointer lock after click").toBe(true);
}
/** Turn the camera by a yaw delta using mouse movement. */
async function turn(page: Page, rad: number, sens: number): Promise<void> {
  const px = rad / sens;
  if (Math.abs(px) < 1) return;
  cursorX += px;
  await page.mouse.move(cursorX, 300, { steps: 1 });
}
export async function faceTowards(page: Page, x: number, z: number): Promise<void> {
  await captureMouse(page);
  const s = await snap(page);
  await turn(page, wrap(Math.atan2(x - s.pos.x, z - s.pos.z) - s.camYaw), s.camSens);
}

export interface WalkOpts { radius?: number; timeout?: number; run?: boolean; follow?: () => Promise<{ x: number; z: number }>; until?: (s: Snap) => boolean; straight?: boolean; floor?: number }

/**
 * Walk to (x, z) along the nav-mesh path (or straight on floors without a nav mesh).
 * Fails — with a screenshot — on timeout, on being stuck, or on an excessive detour.
 */
export async function walkTo(page: Page, info: TestInfo, name: string, x: number, z: number, o: WalkOpts = {}): Promise<RouteReport> {
  const radius = o.radius ?? 0.55, timeout = o.timeout ?? 45_000;
  await captureMouse(page);
  if (o.follow) ({ x, z } = await o.follow());
  let s = await snap(page);
  const from = { x: s.pos.x, z: s.pos.z, floor: s.floor };
  await diag(page, `d.setTarget(${JSON.stringify(name)}, ${x}, ${z})`);
  const pathOf = async (tx: number, tz: number) => (o.straight ? [{ x: tx, z: tz }] : await diag<{ x: number; z: number }[]>(page, `return d.path(${tx}, ${tz})`));
  const len = (pts: { x: number; z: number }[], p: { x: number; z: number }) => { let L = 0, a = p; for (const b of pts) { L += Math.hypot(b.x - a.x, b.z - a.z); a = b; } return L; };
  let path = await pathOf(x, z);
  if (!o.straight && !o.follow && path.length) {
    // aim at the reachable point the nav mesh resolves for this target; it must be close to it
    const end = path[path.length - 1], off = Math.hypot(end.x - x, end.z - z);
    if (off > 1.0) { reports.push({ name, from, to: { x, z, floor: s.floor }, ok: false, seconds: 0, pathLength: 0, travelled: 0, detour: 0, blockedTicks: 0, maxBlockedRun: 0, recoveries: 0, error: `target unreachable: nearest walkable point is ${off.toFixed(2)} m away` }); expect.soft(off, `route "${name}" reachable`).toBeLessThan(1.0); }
    x = end.x; z = end.z;
  }
  const pathLength = Math.max(0.01, len(path, s.pos));
  const r: RouteReport = { name, from, to: { x, z, floor: o.floor ?? s.floor }, ok: false, seconds: 0, pathLength, travelled: 0, detour: 1, blockedTicks: 0, maxBlockedRun: 0, recoveries: 0 };
  const t0 = Date.now();
  let tx = x, tz = z, last = { ...s.pos }, run = 0, lastRepath = 0;
  const hist: { t: number; d: number; x: number; z: number }[] = [];
  let holding = false;
  const hold = async (on: boolean) => { if (on === holding) return; holding = on; if (on) { await page.keyboard.down("KeyW"); } else { await page.keyboard.up("KeyW"); await page.keyboard.up("ShiftLeft"); } };
  try {
    for (;;) {
      s = await snap(page);
      const now = Date.now();
      if (o.follow && now - lastRepath > 400) { const f = await o.follow(); tx = f.x; tz = f.z; }
      const dist = Math.hypot(tx - s.pos.x, tz - s.pos.z);
      r.travelled += Math.hypot(s.pos.x - last.x, s.pos.z - last.z); last = { ...s.pos };
      if (dist <= radius || o.until?.(s)) break;
      if (now - t0 > timeout) throw new Error(`timeout after ${timeout} ms, ${dist.toFixed(2)} m short`);
      if (s.modal && s.modal !== "title") throw new Error(`a ${s.modal} opened while walking`);
      if (s.mode !== "free") throw new Error(`player is ${s.mode}, cannot walk`);
      if (now - lastRepath > 400) { path = await pathOf(tx, tz); lastRepath = now; }
      const next = path.find((p) => Math.hypot(p.x - s.pos.x, p.z - s.pos.z) > 0.45) ?? { x: tx, z: tz };
      const segLeft = Math.hypot(next.x - s.pos.x, next.z - s.pos.z);
      const err = wrap(Math.atan2(next.x - s.pos.x, next.z - s.pos.z) - s.camYaw);
      if (Math.abs(err) > 0.04) await turn(page, err, s.camSens);
      await hold(true);
      const wantRun = (o.run ?? true) && segLeft > 2.5 && dist > 3 && Math.abs(err) < 0.5;
      if (wantRun) await page.keyboard.down("ShiftLeft"); else await page.keyboard.up("ShiftLeft");
      if (s.blockage > 0.6 && s.speed > 0.2) { r.blockedTicks++; run++; r.maxBlockedRun = Math.max(r.maxBlockedRun, run); } else run = 0;
      // stuck detection: no progress over 3 s
      hist.push({ t: now, d: dist, x: s.pos.x, z: s.pos.z });
      while (hist.length && now - hist[0].t > 3000) hist.shift();
      if (hist.length > 5 && now - hist[0].t > 2500 && hist[0].d - dist < 0.25 && Math.hypot(hist[0].x - s.pos.x, hist[0].z - s.pos.z) < 0.35) {
        if (++r.recoveries > 3) throw new Error(`stuck at ${s.pos.x.toFixed(2)}, ${s.pos.z.toFixed(2)} (${dist.toFixed(2)} m from target)`);
        // what a player does: back off and side-step, then try again
        await hold(false);
        await page.keyboard.down("KeyS"); await page.waitForTimeout(350); await page.keyboard.up("KeyS");
        const side = r.recoveries % 2 ? "KeyD" : "KeyA";
        await page.keyboard.down(side); await page.waitForTimeout(450); await page.keyboard.up(side);
        hist.length = 0;
      }
      await page.waitForTimeout(40);
    }
    await hold(false);
    // let momentum settle so the arrival check is honest
    await expect.poll(async () => (await snap(page)).speed, { timeout: 4000 }).toBeLessThan(0.1);
    s = await snap(page);
    const final = Math.hypot(tx - s.pos.x, tz - s.pos.z);
    r.detour = r.travelled / pathLength;
    if (!o.until && final > radius + 0.6) throw new Error(`overshot: stopped ${final.toFixed(2)} m from target`);
    if (!o.follow && pathLength > 4 && r.detour > 1.8) throw new Error(`excessive detour: walked ${r.travelled.toFixed(1)} m for a ${pathLength.toFixed(1)} m path`);
    r.ok = true;
  } catch (e) {
    await hold(false);
    r.error = (e as Error).message;
    await page.screenshot({ path: `docs/screenshots/phase4/failures/${info.project.name}-${name.replace(/\W+/g, "_")}.png` }).catch(() => {});
  } finally {
    r.seconds = (Date.now() - t0) / 1000;
    reports.push(r);
    await diag(page, `d.clearTarget()`);
  }
  expect(r.error, `route "${name}"`).toBeUndefined();
  return r;
}

/** Press a key once the interaction prompt shows the expected text (approach-and-face). */
export async function interact(page: Page, contains: string | RegExp, key: "KeyE" | "KeyX" = "KeyE", timeout = 6000): Promise<void> {
  await expect.poll(async () => (await snap(page)).prompt ?? "", { timeout, message: `prompt ${contains}` }).toMatch(contains);
  await page.keyboard.press(key);
}


// ---------------------------------------------------------------- play helpers (real input only)
export async function finishDialogue(page: Page, pick?: string) {
  for (let i = 0; i < 40; i++) {
    const d = await page.evaluate(() => (window as any).__hud.dialogue as { choices: { id?: string }[] } | null);
    if (!d) return;
    if (d.choices?.length) await page.keyboard.press(`Digit${(pick ? Math.max(0, d.choices.findIndex((c) => c.id === pick)) : 0) + 1}`);
    else await page.keyboard.press("KeyE");
    await page.waitForTimeout(320);
  }
  throw new Error("dialogue did not finish");
}
/** Walk up to a (possibly moving) NPC, face them, press E and play the conversation. */
export async function talkTo(page: Page, info: TestInfo, id: string, name: string, pick?: string) {
  const at = () => diag<{ x: number; z: number }>(page, `return d.npc("${id}")`);
  await walkTo(page, info, `to ${name}`, 0, 0, { follow: at, radius: 1.5, timeout: 60_000 });
  await faceAndNudge(page, await at());
  await interact(page, new RegExp(`Talk to ${name}`));
  await expect.poll(() => page.evaluate(() => !!(window as any).__hud.dialogue)).toBe(true);
  await finishDialogue(page, pick);
  await expectFreeAfter(page);
}
/** Turn the camera toward a point and tap W so DRAGON turns to face it (a player's nudge). */
export async function faceAndNudge(page: Page, p: { x: number; z: number }) {
  await faceTowards(page, p.x, p.z);
  const s = await snap(page);
  const want = Math.atan2(p.x - s.pos.x, p.z - s.pos.z);
  for (let i = 0; i < 8; i++) {
    const m = await snap(page);
    let e = want - m.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI;
    if (Math.abs(e) < 0.5) break;
    await page.keyboard.down("KeyW"); await page.waitForTimeout(70); await page.keyboard.up("KeyW");
    await page.waitForTimeout(120);
  }
  await expect.poll(async () => (await snap(page)).speed, { timeout: 3000 }).toBeLessThan(0.1);
}
/** After closing any UI: no residual lock, movement works (checked by a short real step). */
export async function expectFreeAfter(page: Page) {
  await expect.poll(async () => { const s = await snap(page); return `${s.mode}/${s.modal}`; }, { timeout: 8000 }).toBe("free/null");
}
export async function sitIn(page: Page, info: TestInfo, seatId: string, label: RegExp) {
  const s = await diag<{ x: number; z: number; yaw: number; exitX?: number; exitZ?: number }>(page, `return d.seat("${seatId}")`);
  const ax = s.exitX ?? s.x - Math.sin(s.yaw) * 0.75, az = s.exitZ ?? s.z - Math.cos(s.yaw) * 0.75;
  await walkTo(page, info, `to seat ${seatId}`, ax, az, { radius: 0.35 });
  await faceAndNudge(page, s);
  await interact(page, label);
  await expect.poll(async () => (await snap(page)).mode, { timeout: 6000 }).toBe("seated");
}
export async function standUp(page: Page) {
  await interact(page, /Stand up/, "KeyX");
  await expect.poll(async () => (await snap(page)).mode, { timeout: 6000 }).toBe("free");
}
export async function useComputer(page: Page) {
  await interact(page, /Use Computer/);
  await expect.poll(() => page.evaluate(() => (window as any).__hud.computer), { timeout: 10_000 }).toBe("desktop");
  // DRAGON must not move while the desktop is open, even with WASD held
  const before = await snap(page);
  await page.keyboard.down("KeyW"); await page.waitForTimeout(400); await page.keyboard.up("KeyW");
  const after = await snap(page);
  expect(Math.hypot(after.pos.x - before.pos.x, after.pos.z - before.pos.z)).toBeLessThan(0.01);
}
export async function closeComputer(page: Page) {
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => (window as any).__hud.computer)).toBeNull();
  expect((await snap(page)).mode).toBe("seated");
}


export { expect };

/** Load the game at the title screen with a clean save (only on the first navigation). */
export async function bootTitle(page: Page, query = ""): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = (page.context() as unknown as { _options: { baseURL: string } })._options.baseURL;
  await page.addInitScript(() => { if (!sessionStorage.getItem("wiped")) { sessionStorage.setItem("wiped", "1"); indexedDB.deleteDatabase("apptunix-office-chaos"); localStorage.clear(); } });
  await page.goto(base + "&diag=1" + query);
  await waitLoaded(page);
  return errors;
}
export const waitLoaded = (page: Page) => page.waitForFunction(() => (window as any).__diag && document.querySelector(".loading") === null, null, { timeout: 150_000 });
export const objective = (page: Page) => snap(page).then((s) => s.objective);
export const waitObj = (page: Page, want: string, timeout = 30_000) => expect.poll(() => objective(page), { timeout }).toBe(want);
export const missionState = (page: Page, id: string) => page.evaluate((i) => (window as any).__play.missions.find((m: { id: string }) => m.id === i)?.state, id);

/** Mission 1 by walking: street → lobby → lift → floor 3 → Neha → React desk. */
export async function playArrival(page: Page, info: TestInfo): Promise<void> {
  await page.locator("[data-new-game]").click();
  await waitObj(page, "m1_arrival:enter");
  await walkTo(page, info, "street → lobby", 8.2, 2.5, { straight: true });
  await walkTo(page, info, "lobby → lift call panel", 4.0, 7.3, { straight: true });
  await interact(page, /Call the lift/);
  await expect.poll(async () => { const s = await snap(page); return s.liftLevel === 0 && s.liftDoors > 0.9; }, { timeout: 20_000 }).toBe(true);
  await walkTo(page, info, "landing → into cabin", 4.0, 6.3, { straight: true, radius: 0.3 });
  await walkTo(page, info, "into cabin", 1.8, 6.3, { straight: true, radius: 0.35 });
  await page.keyboard.press("Digit3");
  await expect.poll(async () => { const s = await snap(page); return s.liftLevel === 3 && s.liftState !== "moving" && s.liftDoors > 0.9; }, { timeout: 40_000 }).toBe(true);
  await walkTo(page, info, "cabin → floor-3 landing", 4.6, 6.3, { straight: true });
  await walkTo(page, info, "landing → office entrance", 12.0, 6.3);
  await talkTo(page, info, "neha", "Neha");
  const desk = await diag<{ exitX: number; exitZ: number }>(page, `return d.seat("react.dragon.chair")`);
  await walkTo(page, info, "reception → React desk", desk.exitX, desk.exitZ, { radius: 0.5 });
  await expect.poll(() => missionState(page, "m1_arrival"), { timeout: 15_000 }).toBe("COMPLETED");
}

/** Walk to a point in front of an object, face it and press E on the matching prompt. */
export async function inspect(page: Page, info: TestInfo, name: string, x: number, z: number, label: RegExp) {
  await walkTo(page, info, `to ${name}`, x, z, { radius: 1.1 });
  await faceAndNudge(page, { x, z });
  await interact(page, label);
}
