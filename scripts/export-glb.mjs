// Exports the code-modelled prefabs to GLB via the running game (Babylon glTF serializer),
// optimises them with glTF Transform, then verifies they load back into the toon pipeline.
// Usage: node scripts/export-glb.mjs [url]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const url = process.argv[2] ?? "http://localhost:5173/?renderer=webgl";
const rawDir = path.resolve("art-source/exported");
const outDir = path.resolve("public/models");
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const page = await browser.newPage();
await page.goto(url);
await page.waitForFunction(() => window.__game && document.querySelector(".loading") === null, { timeout: 120000 });
const names = await page.evaluate(() => Object.keys(window.__EXPORTABLE));
for (const n of names) {
  const b64 = await page.evaluate(async (name) => {
    const blob = await window.__game.assets.exportPrefab(name);
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, n);
  const raw = path.join(rawDir, `${n}.glb`);
  fs.writeFileSync(raw, Buffer.from(b64, "base64"));
  const opt = path.join(outDir, `${n}.glb`);
  execFileSync("npx", ["gltf-transform", "optimize", raw, opt, "--compress", "meshopt", "--texture-compress", "false", "--simplify", "false", "--palette", "false"], { stdio: "pipe" });
  console.log(`${n}: raw ${(fs.statSync(raw).size / 1024).toFixed(0)} KB → optimised ${(fs.statSync(opt).size / 1024).toFixed(0)} KB`);
}
// round-trip check: load one optimised GLB back into the toon pipeline
const check = await page.evaluate(async () => {
  const ms = await window.__game.assets.loadGLB("/models/hero-workstation.glb");
  const keys = [...new Set(ms.map((m) => m.metadata?.key))];
  ms.forEach((m) => m.dispose());
  return { meshes: ms.length, families: keys };
});
console.log("round-trip load:", JSON.stringify(check));
await browser.close();
