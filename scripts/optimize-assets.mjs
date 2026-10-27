// Optimises Blender exports for the browser: art-source/blender/*.glb → public/models/*.glb
// Blender convention: name materials `toon_<family>` (toon_wood, toon_fabric, toon_metal, …)
// and use vertex colours or flat base colours; the runtime maps them onto the toon shaders.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const src = path.resolve(process.argv[2] ?? "art-source/blender");
const out = path.resolve(process.argv[3] ?? "public/models");
fs.mkdirSync(out, { recursive: true });
const files = fs.existsSync(src) ? fs.readdirSync(src).filter((f) => f.endsWith(".glb") || f.endsWith(".gltf")) : [];
if (!files.length) { console.log(`No .glb/.gltf files in ${src}`); process.exit(0); }
for (const f of files) {
  const input = path.join(src, f);
  const output = path.join(out, f.replace(/\.gltf$/, ".glb"));
  // palette is disabled: material families must survive. KTX2 textures if toktx is installed.
  const args = ["gltf-transform", "optimize", input, output, "--compress", "meshopt", "--palette", "false", "--texture-compress", process.env.KTX ? "ktx2" : "webp", "--texture-size", "2048"];
  execFileSync("npx", args, { stdio: "inherit" });
  console.log(`${f}: ${(fs.statSync(input).size / 1024).toFixed(0)} KB → ${(fs.statSync(output).size / 1024).toFixed(0)} KB`);
}
