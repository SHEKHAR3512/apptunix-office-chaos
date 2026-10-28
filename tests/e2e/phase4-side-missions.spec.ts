import { Page, test, TestInfo } from "@playwright/test";
import {
  bootTitle, diag, expect, expectFreeAfter, finishDialogue, inspect, missionState, playArrival,
  sitIn, snap, standUp, talkTo, waitLoaded, waitObj, walkTo,
} from "./walker";

/**
 * Phase 4 · Milestone 4 — the five side jobs, played with real input (walking, E/X, mouse).
 * A: side jobs before/alongside the main story, interrupted by a reload, main story intact.
 * B: an imported post-Mission-4 save (Title → Import) → the remaining jobs next to Mission 5.
 */
const shot = (page: Page, info: TestInfo, name: string) => info.project.name === "webgl2" ? page.screenshot({ path: `docs/screenshots/phase4/${name}.png` }) : Promise.resolve(Buffer.alloc(0));
const flag = (page: Page, k: string) => page.evaluate((key) => (window as any).__game.life.dialogue.flags.get(key) ?? null, k);

test("A · side jobs before and alongside the main story, with a reload mid-job", async ({ page }, info) => {
  test.setTimeout(1_500_000);
  const errors = await bootTitle(page);
  await playArrival(page, info);
  await waitObj(page, "m2_standup:cr1", 40_000);
  const m2 = await page.evaluate(() => JSON.stringify((window as any).__game.story.missions.progress.get("m2_standup")));

  // ---- S5 Meeting Room Mix-Up (started from Simran, finished before the stand-up)
  await talkTo(page, info, "simran", "Simran", "yes");
  await expect.poll(() => missionState(page, "s5_rooms")).toBe("ACTIVE");
  await expect(page.locator('[data-side="s5_rooms"]')).toBeVisible(); // side job shown on the quest HUD
  await inspect(page, info, "CR2 booking screen", 29.2, 30.0, /booking screen/);
  await page.keyboard.press("KeyE"); // close the read overlay
  await expectFreeAfter(page);
  // interrupted: reload in the middle of the side job → Continue resumes at the same step
  await page.waitForTimeout(2500); // autosave
  await page.reload(); await waitLoaded(page);
  await page.locator("[data-continue]").click();
  await expectFreeAfter(page);
  await expect.poll(() => page.evaluate(() => (window as any).__game.story.missions.current("s5_rooms")?.id)).toBe("ishita");
  await talkTo(page, info, "ishita", "Ishita");
  await talkTo(page, info, "shruti", "Shruti");
  await talkTo(page, info, "simran", "Simran", "split");
  await expect.poll(() => missionState(page, "s5_rooms")).toBe("COMPLETED");
  expect(await flag(page, "side.rooms")).toBe(true);

  // ---- S3 riddle: object trigger, wrong answer first, then the right one
  await inspect(page, info, "CR3 whiteboard", 35.2, 28.6, /whiteboard/);
  await expect.poll(() => page.evaluate(() => !!(window as any).__hud.dialogue)).toBe(true);
  await expect.poll(() => missionState(page, "s3_whiteboard")).toBe("ACTIVE");
  await shot(page, info, "side-03-whiteboard-riddle");
  await page.keyboard.press("Digit3"); // "The lift." — wrong
  await page.waitForTimeout(400); await page.keyboard.press("KeyE");
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__hud.dialogue?.choices.length)).toBe(4); // asked again
  await finishDialogue(page, "keyboard");
  await expect.poll(() => page.evaluate(() => (window as any).__game.story.missions.current("s3_whiteboard")?.id)).toBe("arpit");
  await expectFreeAfter(page);

  // the main story was not touched by any of this
  expect(await page.evaluate(() => JSON.stringify((window as any).__game.story.missions.progress.get("m2_standup")))).toBe(m2);
  await waitObj(page, "m2_standup:cr1");

  // ---- the stand-up still works after the detour
  await walkTo(page, info, "→ CR1 after side jobs", 15, 27.5, { timeout: 60_000 });
  const seat = await diag<string>(page, `return d.freeSeats("cr1", "meeting")[0]`);
  await sitIn(page, info, seat, /Sit/);
  await expect.poll(() => page.evaluate(() => !!(window as any).__hud.dialogue), { timeout: 45_000 }).toBe(true);
  await finishDialogue(page, "clarify");
  await waitObj(page, "m3_react_bug:react");
  await standUp(page);

  // ---- S3 finish: "A." is Arpit, at his desk during Mission 3
  await talkTo(page, info, "arpit", "Arpit");
  await expect.poll(() => missionState(page, "s3_whiteboard")).toBe("COMPLETED");

  // ---- S2 Rockey's chai run, alongside Mission 3
  await talkTo(page, info, "rockey", "Rockey", "yes");
  await expect.poll(() => missionState(page, "s2_chai")).toBe("ACTIVE");
  // talking to Rockey again too early must not skip ahead
  expect(await page.evaluate(() => (window as any).__game.story.missions.current("s2_chai")?.id)).toBe("arpit");
  await talkTo(page, info, "arpit", "Arpit");
  await talkTo(page, info, "tushar", "Tushar");
  await talkTo(page, info, "neha", "Neha");
  await inspect(page, info, "pantry machine", 1.1, 28.4, /Make Coffee/);
  await expect.poll(async () => (await snap(page)).mode, { timeout: 12_000 }).toBe("free");
  await talkTo(page, info, "rockey", "Rockey");
  await expect.poll(() => missionState(page, "s2_chai")).toBe("COMPLETED");
  await shot(page, info, "side-02-chai-run-done");
  expect(await missionState(page, "m3_react_bug")).toBe("ACTIVE");
  await waitObj(page, "m3_react_bug:react");
  expect(errors).toEqual([]);
});

/** A post-Mission-4 save, as the game's own Export would write it (fictional data). */
const POST_M4 = (() => {
  const done = (ids: string[]) => Object.fromEntries(ids.map((i) => [i, true]));
  return {
    version: 2, savedAt: Date.now(), chapter: "ch1", player: { floor: 3, x: 21.65, y: 12, z: 10.6, yaw: 3.14 }, clock: 15 * 60 + 45,
    missions: {
      m1_arrival: { state: "COMPLETED", done: done(["enter", "call", "floor3", "office", "neha", "react", "desk"]) },
      m2_standup: { state: "COMPLETED", done: done(["request", "cr1", "sit", "status", "task"]) },
      m3_react_bug: { state: "COMPLETED", done: done(["react", "sit", "pc", "ticket", "code", "find", "fix", "tests", "qa"]) },
      m4_qa: { state: "COMPLETED", done: done(["notice", "qa", "talk", "observe", "repro", "desk", "fix", "tests", "inform"]) },
    },
    flags: { "rel.mohit": 1, "rel.tushar": 1 }, puzzles: { react_cart_find: { solved: true, attempts: 0, hints: 0 }, react_cart_fix: { solved: true, attempts: 0, hints: 0, applied: "spread" }, qa_reproduce: { solved: true, attempts: 0, hints: 0 }, qa_layout_fix: { solved: true, attempts: 0, hints: 0, applied: "wrap" } },
    tickets: { "APX-301": "approved" }, chat: [], unlocked: ["map", "journal"], chapterComplete: false, playTime: 600,
  };
})();

test("B · imported post-M4 save → the QA pass and the missing ticket next to Mission 5", async ({ page }, info) => {
  test.setTimeout(1_200_000);
  const errors = await bootTitle(page);
  // Title → Import save (the real file picker)
  const chooser = page.waitForEvent("filechooser");
  await page.getByText("Import save").click();
  await (await chooser).setFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(POST_M4)) });
  await expect(page.locator("[data-continue]")).toBeVisible();
  await page.locator("[data-continue]").click();
  await expectFreeAfter(page);
  await expect.poll(() => missionState(page, "m5_chai"), { timeout: 15_000 }).toBe("ACTIVE");
  for (const id of ["s1_ticket", "s4_qa"]) expect(await missionState(page, id), id).toBe("AVAILABLE");

  // ---- S4 One Last QA Check
  await talkTo(page, info, "shruti", "Shruti", "yes");
  await expect.poll(() => missionState(page, "s4_qa")).toBe("ACTIVE");
  await inspect(page, info, "QA device", 45.6, 19.75, /test device/);
  await expect(page.locator("[data-qa-device]")).toBeVisible();
  await page.locator("[data-width]").fill("360");
  await page.locator("[data-report]").click();
  await expect(page.locator("[data-qa-device] .ed-fb")).toContainText("Not small enough");
  await page.locator("[data-width]").fill("320");
  await page.locator("[data-report]").click();
  await expect(page.locator("[data-qa-device] .ed-fb")).toContainText("holds");
  await shot(page, info, "side-04-qa-pass");
  await expect(page.locator("[data-qa-device]")).toBeHidden({ timeout: 8000 });
  await expectFreeAfter(page);
  await talkTo(page, info, "shruti", "Shruti");
  await expect.poll(() => missionState(page, "s4_qa")).toBe("COMPLETED");

  // ---- S1 The Missing Task Ticket (clues on desks)
  await talkTo(page, info, "mohit", "Mohit", "yes");
  await expect.poll(() => missionState(page, "s1_ticket")).toBe("ACTIVE");
  await inspect(page, info, "Mohit's sticky notes", 23.2, 4.08, /sticky notes/);
  await expect(page.getByText("ask Arpit")).toBeVisible();
  await page.keyboard.press("KeyE"); await expectFreeAfter(page);
  await inspect(page, info, "Arpit's notes", 22.0, 4.72, /sprint notes/);
  await page.keyboard.press("KeyE"); await expectFreeAfter(page);
  await talkTo(page, info, "ishita", "Ishita");
  await talkTo(page, info, "mohit", "Mohit");
  await expect.poll(() => missionState(page, "s1_ticket")).toBe("COMPLETED");
  expect(await flag(page, "side.ticket")).toBe(true);
  expect(await flag(page, "side.qa")).toBe(true);

  // consequences persist across a reload
  await page.waitForTimeout(2500);
  await page.reload(); await waitLoaded(page);
  await page.locator("[data-continue]").click();
  await expectFreeAfter(page);
  expect(await flag(page, "side.qa")).toBe(true);
  expect(await missionState(page, "s1_ticket")).toBe("COMPLETED");
  expect(await missionState(page, "m5_chai")).toBe("ACTIVE");
  await page.keyboard.press("KeyJ");
  await expect(page.locator(".journal")).toContainText("One Last QA Check");
  await shot(page, info, "side-05-journal");
  await page.keyboard.press("KeyJ");
  expect(errors).toEqual([]);
});
