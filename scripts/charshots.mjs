// Character review shots: places characters in reception and frames close-ups.
// Usage: node scripts/charshots.mjs <outDir> [state] [gesture]
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
const out = process.argv[2] ?? "docs/screenshots/phase2";
const state = process.argv[3] ?? "Locomotion";
const gesture = process.argv[4] ?? "none";
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal", "--enable-unsafe-webgpu"], defaultViewport: { width: 1400, height: 900 } });
const p = await b.newPage();
const logs = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") logs.push(m.text()); });
p.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await p.goto(process.env.URL ?? "http://localhost:5173/?renderer=webgl&start=office");
await p.waitForFunction(() => window.__game && document.querySelector(".loading") === null, { timeout: 120000 });
await p.evaluate((st, ge) => {
  const g = window.__game, V = g.player.pos.constructor;
  g.teleportToFloor(3, new V(14.6, 12, 10.2), Math.PI);
  g.character.animator.play(st, 0);
  g.character.setGesture(ge);
  document.querySelector(".help")?.remove();
}, state, gesture);
await new Promise((r) => setTimeout(r, 1200));
const shots = [
  ["full", [14.6, 13.1, 7.6], [14.6, 12.9, 10.2]],
  ["face", [14.6, 13.62, 9.55], [14.6, 13.6, 10.2]],
  ["side", [12.6, 13.0, 9.6], [14.6, 12.9, 10.2]],
  ["back", [15.4, 13.4, 12.4], [14.6, 12.95, 10.2]],
];
for (const [n, pos, tgt] of shots) {
  await p.evaluate((pos, tgt) => { const g = window.__game, V = g.player.pos.constructor; g.cam.setView(new V(...pos), new V(...tgt)); }, pos, tgt);
  await new Promise((r) => setTimeout(r, 500));
  await p.screenshot({ path: path.join(out, `${state}-${n}.png`) });
}
if (logs.length) console.log(logs.slice(0, 15).join("\n"));
await b.close();
