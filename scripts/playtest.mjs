// Automated exploration test: drives the dev controller with real key events in Chrome.
// Street → entrance doors → lobby → lift call → ride to 3F → exit → Apptunix doors → React.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:5173/?renderer=webgl";
const outDir = process.env.SHOT_DIR ?? path.resolve("docs/screenshots/playtest");
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__game && document.querySelector(".loading") === null, { timeout: 120000 });
await page.evaluate(() => window.__game && (document.querySelector(".help") ? null : null));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const g = window.__game;
  return { x: +g.player.pos.x.toFixed(2), y: +g.player.pos.y.toFixed(2), z: +g.player.pos.z.toFixed(2), floor: g.scenes.activeFloor, lift: g.lift.state, liftLevel: g.lift.level, inLift: g.lift.playerInside, zone: g.zoneAt(g.player.pos) };
});
const face = (yaw) => page.evaluate((y) => { window.__game.cam.yaw = y; }, yaw);
const hold = async (key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); await sleep(250); };
const tap = async (key) => { await page.keyboard.press(key); await sleep(200); };
const shot = (n) => page.screenshot({ path: path.join(outDir, `${n}.png`) });
const results = [];
const check = (name, ok, s) => { results.push({ name, ok, s }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${JSON.stringify(s)}`); };

let s = await state();
check("spawn on street", s.z < -4 && s.y === 0, s);
await shot("01-street");
await face(0);
await hold("KeyW", 4600); // walk speed 1.85 m/s (Phase 2 gait)
s = await state();
check("walked through entrance doors into lobby", s.z > 0.6, s);
await shot("02-lobby");

// walk to the lift call panel: head west along z ≈ 7.4
await page.evaluate(() => window.__game.player.teleport(new window.__game.player.pos.constructor(6.0, 0, 7.4), -Math.PI / 2));
await face(-Math.PI / 2);
await hold("KeyW", 900);
s = await state();
await tap("KeyE");
await sleep(2200);
s = await state();
check("lift doors open after call", s.lift === "open" || s.lift === "opening", s);
await page.evaluate(() => window.__game.player.teleport(new window.__game.player.pos.constructor(4.2, 0, 6.3), -Math.PI / 2));
await face(-Math.PI / 2);
await hold("KeyW", 1500);
s = await state();
check("entered lift cabin", s.inLift === true, s);
await shot("03-in-lift");
await tap("Digit3");
await sleep(1500);
await shot("04-lift-moving");
await sleep(9000);
s = await state();
check("arrived at floor 3", s.liftLevel === 3 && s.floor === 3 && Math.abs(s.y - 12) < 0.05, s);
await face(Math.PI / 2);
await hold("KeyW", 2600);
s = await state();
check("stepped out into 3F lift lobby", !s.inLift && s.x > 3.5 && s.floor === 3, s);
await shot("05-3f-lobby");
// walk to Apptunix glass doors along z = 6.3
await page.evaluate(() => window.__game.player.teleport(new window.__game.player.pos.constructor(7.5, 12, 6.3), Math.PI / 2));
await face(Math.PI / 2);
await hold("KeyW", 2500);
s = await state();
check("auto glass doors let player into reception", s.x > 10.4, s);
await shot("06-reception");
// head to the React department via the corridor
await page.evaluate(() => window.__game.player.teleport(new window.__game.player.pos.constructor(20, 12, 15.2), Math.PI));
await face(Math.PI);
await hold("KeyW", 1800);
s = await state();
check("walked from corridor into React department", s.zone === "React", s);
await shot("07-react");
// collision: try walking into DRAGON's desk
await page.evaluate(() => window.__game.player.teleport(new window.__game.player.pos.constructor(22.2, 12, 11.0), Math.PI));
await face(Math.PI);
await hold("KeyW", 2000);
s = await state();
check("desk collision stops player", s.z > 9.9, s);
await shot("08-dragon-desk");
check("no page errors", errors.length === 0, errors.slice(0, 5));
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
await browser.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
