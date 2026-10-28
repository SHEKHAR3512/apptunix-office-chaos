import { Page, test } from "@playwright/test";
import { expect, g } from "./helpers";

const cur = (page: Page) => g<string | null>(page, `const m = g.story.missions; const a = [...m.progress.entries()].find(([,p]) => p.state === "ACTIVE"); if (!a) return null; const o = window.__play.mission?.objectives.find(o => o.current); return a[0] + ":" + (o ? o.id : "-");`);
const waitObj = (page: Page, want: string) => expect.poll(() => cur(page), { timeout: 30_000 }).toBe(want);
const shot = async (page: Page, name: string, project: string) => { await page.waitForTimeout(400); await page.screenshot({ path: `docs/screenshots/phase3/${project}-${name}.png` }); };

async function finishDialogue(page: Page, pick?: string) {
  for (let i = 0; i < 40; i++) {
    const d = await g<{ choices: { id?: string }[] } | null>(page, `return window.__hud.dialogue`);
    if (!d) return;
    if (d.choices?.length) {
      const idx = pick ? Math.max(0, d.choices.findIndex((c) => c.id === pick)) : 0;
      await page.keyboard.press(`Digit${idx + 1}`);
    } else await page.keyboard.press("KeyE");
    await page.waitForTimeout(350);
  }
}
async function talk(page: Page, npc: string, pick?: string) {
  await g(page, `const n = g.life.npcs.get("${npc}"); const p = n.pos; g.teleportToFloor(3, new V(p.x + 1.1, 12, p.z), -Math.PI / 2); g.life.startDialogue(n);`);
  await expect.poll(() => g(page, `return !!window.__hud.dialogue`)).toBe(true);
  await finishDialogue(page, pick);
}
async function sit(page: Page, seat: string) {
  await g(page, `const s = g.life.seats.get("${seat}"); if (s.exitX !== undefined) { g.teleportToFloor(3, new V(s.exitX, 12, s.exitZ), 0); g.player.move.yaw = Math.atan2(s.x - s.exitX, s.z - s.exitZ); } else g.teleportToFloor(3, new V(s.x - Math.sin(s.yaw) * 0.6, 12, s.z - Math.cos(s.yaw) * 0.6), s.yaw);`);
  await page.waitForTimeout(500);
  const why = await g(page, `return JSON.stringify({ p: g.life.interactions.prompt, mode: g.player.mode, ov: g.story.overlayActive, qa: window.__play.qaDevice, occ: g.life.seats.occupantOf("${seat}") })`);
  await page.keyboard.press("KeyE");
  await expect.poll(() => g(page, `return g.player.mode`), { message: String(why) }).toBe("seated");
}
const goto = (page: Page, x: number, z: number, floor = 3) => g(page, `g.teleportToFloor(${floor}, new V(${x}, ${floor * 4}, ${z}), 0);`);

test("Chapter 1 · The Production Bug — full playthrough", async ({ page }, info) => {
  test.setTimeout(420_000);
  const P = info.project.name;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = (page.context() as unknown as { _options: { baseURL: string } })._options.baseURL;
  await page.addInitScript(() => indexedDB.deleteDatabase("apptunix-office-chaos"));
  await page.goto(base);
  await page.waitForFunction(() => (window as any).__game && document.querySelector(".loading") === null, null, { timeout: 150_000 });
  await page.evaluate(`window.__play = null; import("/src/game/gameplay/PlayState.ts").then(m => { const s = () => window.__play = m.play.get(); s(); m.play.subscribe(s); })`);
  await expect(page.locator("[data-new-game]")).toBeVisible();
  await page.locator("[data-new-game]").click();

  // ---- M1 Arrival
  await waitObj(page, "m1_arrival:enter");
  await shot(page, "01-mission-intro", P);
  await goto(page, 8.2, 1.5, 0);
  await waitObj(page, "m1_arrival:call");
  await g(page, `g.requestLift(0, "call")`);
  await waitObj(page, "m1_arrival:floor3");
  await g(page, `g.requestLift(3, "panel")`);
  await waitObj(page, "m1_arrival:office");
  await goto(page, 12, 6);
  await waitObj(page, "m1_arrival:neha");
  await talk(page, "neha");
  await waitObj(page, "m1_arrival:react");
  await goto(page, 24, 7);
  await expect.poll(() => cur(page), { timeout: 15_000 }).not.toBe("m1_arrival:react");
  await g(page, `const s = g.life.seats.get("react.dragon.chair"); g.teleportToFloor(3, new V(s.exitX, 12, s.exitZ), 0);`);

  // ---- M2 Standup
  await waitObj(page, "m2_standup:cr1");
  await goto(page, 15, 27);
  await waitObj(page, "m2_standup:sit");
  await g(page, `const free = g.life.seats.inZone("cr1", "meeting").find(s => g.life.seats.isFree(s.id)); window.__seat = free.id;`);
  await sit(page, await g<string>(page, `return window.__seat`));
  await expect.poll(() => g(page, `return !!window.__hud.dialogue`), { timeout: 40_000 }).toBe(true);
  await page.waitForTimeout(900);
  await shot(page, "02-cr1-standup", P);
  await finishDialogue(page, "investigate");
  await waitObj(page, "m3_react_bug:react");

  // ---- M3 React bug
  await page.keyboard.press("KeyX");
  await goto(page, 24, 7);
  await waitObj(page, "m3_react_bug:sit");
  await sit(page, "react.dragon.chair");
  await page.keyboard.press("KeyE");
  await expect.poll(() => g(page, `return window.__hud.computer`)).toBe("desktop");
  await page.locator('[data-app="tasks"]').click();
  await page.locator('[data-ticket="APX-301"]').click();
  await shot(page, "03-developer-computer", P);
  await page.locator('[data-app="editor"]').click();
  await page.locator('[data-file="src/components/AddToCart.tsx"]').click();
  await page.locator('[data-line="3"]').click(); // wrong guess first → feedback + retry
  await page.locator('[data-line="7"]').click();
  await waitObj(page, "m3_react_bug:fix");
  await page.locator('[data-file="src/components/AddToCart.tsx"]').click();
  await page.locator('[data-option="spread"] input').check();
  await page.locator("[data-apply]").click();
  await shot(page, "04-bug-challenge", P);
  await page.locator("[data-run-tests]").click();
  await waitObj(page, "m3_react_bug:qa");
  await page.locator('[data-app="tasks"]').click();
  await page.locator('[data-ticket="APX-301"]').click();
  await page.locator("[data-ready]").click();

  // ---- M4 QA
  await waitObj(page, "m4_qa:qa");
  await page.keyboard.press("Escape");
  await expect.poll(() => g(page, `return window.__hud.computer`)).toBeNull();
  await page.keyboard.press("KeyX");
  await goto(page, 45, 17);
  await waitObj(page, "m4_qa:talk");
  await talk(page, "shruti");
  await waitObj(page, "m4_qa:observe");
  await g(page, `g.teleportToFloor(3, new V(45.6, 12, 18.6), 0)`);
  await expect.poll(() => g(page, `return g.life.interactions.prompt`)).toContain("test device");
  await page.keyboard.press("KeyE");
  await expect(page.locator("[data-qa-device]")).toBeVisible();
  await page.locator("[data-width]").fill("360");
  await shot(page, "05-qa-interaction", P);
  await page.locator("[data-report]").click();
  await waitObj(page, "m4_qa:desk");
  await expect(page.locator("[data-qa-device]")).toBeHidden({ timeout: 8000 });
  await sit(page, "react.dragon.chair");
  await page.keyboard.press("KeyE");
  await expect.poll(() => g(page, `return window.__hud.computer`)).toBe("desktop");
  await page.locator('[data-app="editor"]').click();
  await page.locator('[data-file="src/components/ProductRow.module.css"]').click();
  await page.locator('[data-option="wrap"] input').check();
  await page.locator("[data-apply]").click();
  await page.locator("[data-run-tests]").click();
  await waitObj(page, "m4_qa:inform");
  await page.keyboard.press("Escape");
  await expect.poll(() => g(page, `return window.__hud.computer`)).toBeNull();
  await page.keyboard.press("KeyX");
  await talk(page, "shruti");

  // ---- M5 Chai
  await waitObj(page, "m5_chai:rockey");
  await talk(page, "rockey");
  await goto(page, 6, 28);
  await waitObj(page, "m5_chai:vibhu");
  await talk(page, "vibhu");
  await shot(page, "06-chai-break", P);
  await talk(page, "karan");
  await talk(page, "ramesh").catch(() => {});

  // ---- M6 Ship it
  await waitObj(page, "m6_ship:mohit");
  await talk(page, "mohit");
  await goto(page, 11, 17.5);
  await waitObj(page, "m6_ship:inspect");
  await g(page, `g.teleportToFloor(3, new V(11.0, 12, 18.6), 0)`);
  await page.waitForTimeout(500);
  await expect.poll(() => g(page, `return g.life.interactions.prompt`)).toContain("dashboard");
  await page.keyboard.press("KeyE");
  await expect(page.locator("[data-console]")).toBeVisible();
  const term = page.locator("[data-terminal-input]");
  for (const c of ["deploy", "logs", "rm -rf / ; echo hi", "env check", "env pull --from vault", "deploy"]) { await term.fill(c); await term.press("Enter"); await page.waitForTimeout(250); }
  await shot(page, "07-deployment", P);
  await waitObj(page, "m6_ship:report");
  await page.keyboard.press("Escape");
  await talk(page, "tushar");
  await expect.poll(() => g(page, `return !!window.__play.chapterCard || g.story.finaleRunning`), { timeout: 30_000 }).toBe(true);
  for (let i = 0; i < 60 && !(await g(page, `return !!window.__play.chapterCard`)); i++) { await finishDialogue(page); await page.waitForTimeout(500); }
  await expect(page.locator("[data-chapter-card]")).toBeVisible();
  await shot(page, "08-chapter-complete", P);
  expect(await g(page, `return g.story.missions.state("m6_ship")`)).toBe("COMPLETED");
  // saved progress round-trips
  await page.waitForTimeout(2000);
  await expect.poll(() => g(page, `return g.story.saves.load().then(s => JSON.stringify(s && { c: s.chapterComplete, m: s.missions.m6_ship }))`)).toContain('"c":true');
  expect(errors).toEqual([]);
});
