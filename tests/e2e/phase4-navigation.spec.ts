import { Page, test, TestInfo } from "@playwright/test";
import { closeComputer, diag, expect, expectFreeAfter, finishDialogue, interact, reports, sitIn, snap, standUp, talkTo, useComputer, walkTo } from "./walker";

/**
 * Phase 4 · Milestone 1 — Chapter 1 played by walking. From the title screen to the chapter
 * card using only keyboard + mouse input: no teleports, no coordinate writes, no direct
 * mission calls. Positions are read via the dev diagnostics to steer and to verify arrival.
 */
const objective = (page: Page) => snap(page).then((s) => s.objective);
const waitObj = (page: Page, want: string, timeout = 30_000) => expect.poll(() => objective(page), { timeout }).toBe(want);
const shot = (page: Page, info: TestInfo, name: string) => info.project.name === "webgl2" ? page.screenshot({ path: `docs/screenshots/phase4/${name}.png` }) : Promise.resolve(Buffer.alloc(0));

test("Chapter 1 by walking — every route through normal movement", async ({ page }, info) => {
  test.setTimeout(1_500_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = (page.context() as unknown as { _options: { baseURL: string } })._options.baseURL;
  await page.addInitScript(() => { if (!sessionStorage.getItem("wiped")) { sessionStorage.setItem("wiped", "1"); indexedDB.deleteDatabase("apptunix-office-chaos"); localStorage.clear(); } });
  await page.goto(base + "&diag=1");
  await page.waitForFunction(() => (window as any).__diag && document.querySelector(".loading") === null, null, { timeout: 150_000 });
  await expect(page.locator("[data-new-game]")).toBeVisible();
  // HUD tweak: the click-to-look hint never shows on the title screen
  await expect(page.locator(".click-hint")).toHaveCount(0);
  await page.locator("[data-new-game]").click();
  await waitObj(page, "m1_arrival:enter");

  // ---- Route 1 · building entrance → lift
  await walkTo(page, info, "street → lobby", 8.2, 2.5, { straight: true });
  await waitObj(page, "m1_arrival:call");
  await walkTo(page, info, "lobby → lift call panel", 4.0, 7.3, { straight: true });
  await interact(page, /Call the lift/);
  await waitObj(page, "m1_arrival:floor3");
  await expect.poll(async () => { const s = await snap(page); return s.liftLevel === 0 && s.liftDoors > 0.9; }, { timeout: 20_000 }).toBe(true);
  await walkTo(page, info, "landing → into cabin", 4.0, 6.3, { straight: true, radius: 0.3 });
  await walkTo(page, info, "into cabin", 1.8, 6.3, { straight: true, radius: 0.35 });
  expect((await snap(page)).inLift).toBe(true);

  // ---- Route 2 · lift → 3rd-floor office
  await page.keyboard.press("Digit3");
  await expect.poll(async () => { const s = await snap(page); return s.liftLevel === 3 && s.liftState !== "moving" && s.liftDoors > 0.9; }, { timeout: 40_000 }).toBe(true);
  await walkTo(page, info, "cabin → floor-3 landing", 4.6, 6.3, { straight: true });
  expect((await snap(page)).floor).toBe(3);
  await walkTo(page, info, "landing → office entrance", 12.0, 6.3);
  await waitObj(page, "m1_arrival:neha");
  await shot(page, info, "walk-01-office-entrance");

  // ---- Route 3 · office entrance → React department (via Neha)
  await talkTo(page, info, "neha", "Neha");
  await waitObj(page, "m1_arrival:react");
  const desk = await diag<{ x: number; z: number; exitX: number; exitZ: number }>(page, `return d.seat("react.dragon.chair")`);
  await walkTo(page, info, "reception → React desk", desk.exitX, desk.exitZ, { radius: 0.5 });
  await waitObj(page, "m2_standup:request").catch(async () => waitObj(page, "m2_standup:cr1"));

  // ---- Route 4 · React → CR1
  await waitObj(page, "m2_standup:cr1");
  await walkTo(page, info, "React → CR1", 15, 27.5);
  await waitObj(page, "m2_standup:sit");
  const seat = await diag<string>(page, `return d.freeSeats("cr1", "meeting")[0]`);
  await sitIn(page, info, seat, /Sit/);
  await expect.poll(() => page.evaluate(() => !!(window as any).__hud.dialogue), { timeout: 45_000 }).toBe(true);
  await shot(page, info, "walk-02-cr1-standup");
  await finishDialogue(page, "investigate");
  await waitObj(page, "m3_react_bug:react");

  // ---- CR1 → React workstation (re-enters a previously visited room)
  await standUp(page);
  await walkTo(page, info, "CR1 → React", desk.exitX, desk.exitZ, { radius: 0.5 });
  await waitObj(page, "m3_react_bug:sit");
  await sitIn(page, info, "react.dragon.chair", /Sit at your desk/);
  await useComputer(page);
  await page.locator('[data-app="tasks"]').click();
  await page.locator('[data-ticket="APX-301"]').click();
  await page.locator('[data-app="editor"]').click();
  await page.locator('[data-file="src/components/AddToCart.tsx"]').click();
  // interrupted interaction: leave the computer mid-task, then come back
  await closeComputer(page);
  await useComputer(page);
  await page.locator('[data-app="editor"]').click();
  await page.locator('[data-file="src/components/AddToCart.tsx"]').click();
  await page.locator('[data-line="7"]').click();
  await waitObj(page, "m3_react_bug:fix");
  await page.locator('[data-file="src/components/AddToCart.tsx"]').click();
  await page.locator('[data-option="functional"] input').check();
  await page.locator("[data-apply]").click();
  await page.locator("[data-run-tests]").click();
  await waitObj(page, "m3_react_bug:qa");
  await page.locator('[data-app="tasks"]').click();
  await page.locator('[data-ticket="APX-301"]').click();
  await page.locator("[data-ready]").click();
  await waitObj(page, "m4_qa:notice").catch(() => {});
  await waitObj(page, "m4_qa:qa");
  await closeComputer(page);
  await standUp(page);

  // ---- Route 5 · React → QA
  await walkTo(page, info, "React → QA", 41, 19.5, { timeout: 60_000 });
  await waitObj(page, "m4_qa:talk");
  await talkTo(page, info, "shruti", "Shruti");
  await waitObj(page, "m4_qa:observe");
  await walkTo(page, info, "to QA device", 45.6, 18.7, { radius: 0.35 });
  await faceAndNudge(page, { x: 45.6, z: 19.75 });
  await interact(page, /test device/);
  await expect(page.locator("[data-qa-device]")).toBeVisible();
  await page.locator("[data-width]").fill("360");
  await page.locator("[data-report]").click();
  await waitObj(page, "m4_qa:desk");
  await expect(page.locator("[data-qa-device]")).toBeHidden({ timeout: 8000 });
  await expectFreeAfter(page);

  // ---- Route 6 · QA → React workstation
  await walkTo(page, info, "QA → React workstation", desk.exitX, desk.exitZ, { radius: 0.5, timeout: 60_000 });
  await sitIn(page, info, "react.dragon.chair", /Sit at your desk/);
  await useComputer(page);
  await page.locator('[data-app="editor"]').click();
  await page.locator('[data-file="src/components/ProductRow.module.css"]').click();
  await page.locator('[data-option="wrap"] input').check();
  await page.locator("[data-apply]").click();
  await page.locator("[data-run-tests]").click();
  await waitObj(page, "m4_qa:inform");
  await closeComputer(page);
  await standUp(page);
  await talkTo(page, info, "shruti", "Shruti");

  // ---- M5 chai break
  await waitObj(page, "m5_chai:rockey");
  await talkTo(page, info, "rockey", "Rockey");
  await walkTo(page, info, "to break area", 6, 28, { timeout: 60_000 });
  await waitObj(page, "m5_chai:vibhu");
  await talkTo(page, info, "vibhu", "Vibhu");
  await shot(page, info, "walk-03-chai-break");
  await talkTo(page, info, "karan", "Karan");
  await waitObj(page, "m6_ship:mohit", 40_000);

  // ---- Route 7 · React → DevOps
  await talkTo(page, info, "mohit", "Mohit");
  await walkTo(page, info, "React → DevOps", 14, 19.5, { timeout: 60_000 });
  await waitObj(page, "m6_ship:inspect");
  await walkTo(page, info, "to deploy dashboard", 11.0, 18.7, { radius: 0.35 });
  await faceAndNudge(page, { x: 11.0, z: 19.75 });
  await interact(page, /dashboard/);
  await expect(page.locator("[data-console]")).toBeVisible();
  const term = page.locator("[data-terminal-input]");
  // typing in the terminal must not move DRAGON or trigger shortcuts (J/M/E/X/W)
  const p0 = await snap(page);
  for (const c of ["help", "jmexw", "logs", "env check", "env pull --from vault", "deploy"]) { await term.fill(""); await term.type(c, { delay: 10 }); await term.press("Enter"); await page.waitForTimeout(200); }
  const p1 = await snap(page);
  expect(Math.hypot(p1.pos.x - p0.pos.x, p1.pos.z - p0.pos.z)).toBeLessThan(0.01);
  expect(await page.evaluate(() => (window as any).__play?.journalOpen ?? false)).toBe(false);
  await waitObj(page, "m6_ship:report");
  await page.keyboard.press("Escape");
  await expectFreeAfter(page);

  // ---- Route 8 · back to Tushar after deployment
  await talkTo(page, info, "tushar", "Tushar");
  for (let i = 0; i < 80 && !(await page.locator("[data-chapter-card]").isVisible()); i++) { await finishDialogue(page).catch(() => {}); await page.waitForTimeout(500); }
  await expect(page.locator("[data-chapter-card]")).toBeVisible();
  await expect(page.locator(".click-hint")).toHaveCount(0); // HUD tweak: hidden under the card
  await shot(page, info, "walk-04-chapter-complete");

  // resume after the card: reload while the card is up → Continue lands in free roam
  await page.waitForTimeout(2500);
  await page.reload();
  await page.waitForFunction(() => (window as any).__diag && document.querySelector(".loading") === null, null, { timeout: 150_000 });
  await page.locator("[data-continue]").click();
  await expectFreeAfter(page);
  await walkTo(page, info, "free roam after reload", (await snap(page)).pos.x + 1.5, (await snap(page)).pos.z, { radius: 0.6 });

  console.log("ROUTES " + JSON.stringify(reports.map((r) => ({ name: r.name, ok: r.ok, s: +r.seconds.toFixed(1), path: +r.pathLength.toFixed(1), walked: +r.travelled.toFixed(1), detour: +r.detour.toFixed(2), blocked: r.blockedTicks, rec: r.recoveries, err: r.error }))));
  expect(errors).toEqual([]);
});
