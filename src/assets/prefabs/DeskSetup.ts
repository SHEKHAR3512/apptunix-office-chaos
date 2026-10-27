import { Vector3 } from "@babylonjs/core";
import type { GeometryBuilder, RGB } from "../GeometryBuilder";
import { rng } from "../TextureAtlas";
import { P } from "../../rendering/Palette";
import type { WorldContext } from "../../world/WorldContext";
import { officeChair, workstation } from "./Furniture";
import {
  bottle, cable, deskCalendar, deskLamp, deskPlant, deviceTablet, dragonFigurine, drawingTablet, headphones, keyboard, laptop,
  monitor, mouse, mug, notebook, penHolder, phone, stickyNotes, succulent,
} from "./Props";
import { bx } from "./Shapes";

export type DeskItem =
  | "plant" | "succulent" | "headphones" | "notebook" | "phone" | "sticky" | "calendar" | "lamp" | "figurine" | "laptop"
  | "penholder" | "bottle" | "devices" | "drawingTablet" | "books" | "snack";

export interface DeskPersona {
  id: string;
  name: string;
  role: string;
  dept: string;
  accent: string;
  monitors?: 1 | 2 | 3;
  portrait?: boolean;
  mugColor?: RGB;
  bottleColor?: RGB;
  padColor?: RGB;
  chair?: RGB;
  items: DeskItem[];
  hero?: boolean;
  width?: number;
  screenScreens?: number[];
  nameplate?: boolean;
}

/** Rotate a local (x,z) offset by yaw, Babylon convention (yaw 0 faces +Z). */
export function rot(lx: number, lz: number, yaw: number): [number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/**
 * Full workstation: desk, chair, screens, input devices, cables and personal objects,
 * plus named anchors (chair / computer / stand / camera) and colliders.
 */
export function deskSetup(b: GeometryBuilder, ctx: WorldContext, p: DeskPersona, x: number, y: number, z: number, yaw: number, floor: number, zone: string, o: { legLeft?: boolean; legRight?: boolean; partition?: string } = {}): void {
  const r = rng(hashCode(p.id));
  const w = p.width ?? (p.hero ? 1.6 : 1.2);
  const top = 0.75;
  // the chair sits slightly pulled out, like someone just stood up. Kept small so a seated
  // character's hands still land on the keyboard; anchors use this exact transform.
  const cr = rng(hashCode(p.id + ":chair"));
  const chairPos = new Vector3((cr() - 0.5) * 0.08, 0, -0.64 - cr() * 0.06);
  const chairYaw = (cr() - 0.5) * 0.2;
  b.at(x, y, z, yaw, () => {
    b.measure(p.hero ? "heroWorkstation" : "deskSetup", () => {
      workstation(b, { width: w, screen: o.partition ?? mixFabric(p.accent), legLeft: o.legLeft, legRight: o.legRight, pedestal: p.hero ? "left" : "right" });

      // screens
      const n = p.monitors ?? 1;
      const scr = (i: number) => ctx.atlas.screen(p.dept, (p.screenScreens?.[i] ?? hashCode(p.id + i)) % 4);
      if (n === 1) monitorAt(b, 0, top, 0.1, 0, () => monitor(b, scr(0), { size: 0.6 }));
      else if (n === 2) {
        monitorAt(b, -0.31, top, 0.1, 0.18, () => monitor(b, scr(0), { size: 0.58 }));
        monitorAt(b, 0.31, top, 0.1, -0.18, () => monitor(b, scr(1), { size: p.portrait ? 0.56 : 0.58, portrait: p.portrait }));
      } else {
        monitorAt(b, 0, top, 0.14, 0, () => monitor(b, scr(0), { size: 0.56 }));
        monitorAt(b, -0.55, top, 0.06, 0.35, () => monitor(b, scr(1), { size: 0.52 }));
        monitorAt(b, 0.55, top, 0.06, -0.35, () => monitor(b, scr(2), { size: 0.52 }));
      }

      // input devices
      b.at(-0.04, top, -0.15, (r() - 0.5) * 0.08, () => keyboard(b, p.hero ? "#2a2c34" : P.keyboard, p.hero ? "#efe6d6" : P.keycap, { compact: p.hero, accent: p.hero ? P.brandOrange : undefined }));
      if (p.hero) {
        // full desk mat in brand colours
        bx(b, "fabric", "#262a36", 0.05, top, -0.13, 0.9, 0.003, 0.34, { r: 0.02 });
        bx(b, "fabric", P.brandOrange, 0.05, top, -0.13, 0.905, 0.002, 0.345, { r: 0.02 });
        b.at(0.32, top + 0.003, -0.12, -0.15, () => mouse(b, "#2a2c34"));
        // LED strip under the partition cap
        bx(b, "light", P.react, 0, top + 0.37, w > 1.3 ? 0.29 : 0.29, w - 0.06, 0.01, 0.01, { r: 0 });
      } else {
        b.at(0.33, top, -0.12, (r() - 0.5) * 0.4, () => mouse(b, "#2f323b", p.padColor ?? pickPad(r)));
      }

      // cables from monitor to grommet and from keyboard
      cable(b, [new Vector3(0, top + 0.05, 0.16), new Vector3(0.1, top + 0.01, 0.2), new Vector3(w * 0.3, top + 0.005, 0.22)]);
      cable(b, [new Vector3(-0.04, top + 0.01, -0.08), new Vector3(-0.02, top + 0.004, 0.0), new Vector3(0.1, top + 0.004, 0.08), new Vector3(w * 0.3, top + 0.004, 0.22)], "#3a3d48", 0.0035);
      cable(b, [new Vector3(w * 0.3, top, 0.22), new Vector3(w * 0.3, top - 0.12, 0.25), new Vector3(w * 0.1, top - 0.14, 0.24), new Vector3(-w / 2 + 0.2, top - 0.3, 0.22), new Vector3(-w / 2 + 0.2, 0.44, 0.1)], "#26282e", 0.007);

      // personal objects in free slots
      const slots: [number, number][] = [[-w / 2 + 0.12, -0.12], [w / 2 - 0.12, 0.08], [-w / 2 + 0.16, 0.12], [w / 2 - 0.1, -0.16], [-w / 2 + 0.3, -0.18], [w / 2 - 0.28, 0.14]];
      let si = 0;
      const next = () => slots[si++ % slots.length];
      const [mx, mz] = next();
      b.at(mx, top, mz, r() * 6, () => mug(b, p.mugColor ?? pickMug(r)));
      for (const it of p.items) {
        const [sx, sz] = next();
        b.at(sx, top, sz, (r() - 0.5) * 1.2, () => {
          switch (it) {
            case "plant": deskPlant(b, r); break;
            case "succulent": succulent(b, r); break;
            case "headphones": headphones(b, "#2b2d33", p.accent); break;
            case "notebook": notebook(b, pickNotebook(r)); break;
            case "phone": phone(b, ctx.atlas.phoneScreen(Math.floor(r() * 4))); break;
            case "calendar": deskCalendar(b, ctx.atlas.calendar()); break;
            case "lamp": deskLamp(b, P.darkMetal); break;
            case "figurine": dragonFigurine(b); break;
            case "laptop": laptop(b, ctx.atlas.screen(p.dept, 3)); break;
            case "penholder": penHolder(b, P.darkMetal, r); break;
            case "bottle": bottle(b, p.bottleColor ?? pickBottle(r)); break;
            case "devices": deviceTablet(b, ctx.atlas.phoneScreen(1)); b.at(0.14, 0, 0.02, 0.3, () => phone(b, ctx.atlas.phoneScreen(2))); break;
            case "drawingTablet": drawingTablet(b); break;
            case "books":
              for (let k = 0; k < 3; k++) bx(b, "decor", [P.brandBlue, "#e6d6b8", P.angular][k], 0, k * 0.03, 0, 0.17, 0.028, 0.24, { r: 0.003 });
              break;
            case "snack": b.cyl(0, 0, 0, 0.033, 0.033, 0.12, 12, { mat: "decor", color: P.angular }); break;
            case "sticky": break;
          }
        });
      }
      // sticky notes on the partition face + monitor bezel
      if (p.items.includes("sticky")) b.at(-w * 0.25, top + 0.05, 0.296, 0, () => stickyNotes(b, r, 4 + Math.floor(r() * 3), w * 0.4));
      // name plate on the partition
      if (p.nameplate !== false) {
        const uv = p.hero ? ctx.atlas.dragonPlate() : ctx.atlas.nameplate(p.name, p.role, p.accent);
        const pw = p.hero ? 0.3 : 0.24, ph = p.hero ? 0.09 : 0.068;
        b.at(w / 2 - pw / 2 - 0.05, top + 0.38 - ph / 2 - 0.035, 0.296, 0, () => b.quad(0, 0, 0, pw, ph, { mat: "print", color: "#ffffff", uv }));
      }
      // chair, pulled out a little and turned as if someone just stood up
      b.at(chairPos.x, 0, chairPos.z, chairYaw, () => officeChair(b, p.hero ? "exec" : "task", p.chair ?? P.chairMesh, P.chairBlack));
    });
  });

  // anchors (world space)
  const toW = (lx: number, ly: number, lz: number) => { const [ox, oz] = rot(lx, lz, yaw); return new Vector3(x + ox, y + ly, z + oz); };
  ctx.anchors.add(`${p.id}.desk`, "interact", new Vector3(x, y, z), yaw, floor, zone, p.name);
  ctx.anchors.add(`${p.id}.chair`, "chair", toW(chairPos.x, 0, chairPos.z), yaw + chairYaw, floor, zone, p.name);
  ctx.anchors.add(`${p.id}.computer`, "computer", toW(0, top + 0.32, 0.12), yaw + Math.PI, floor, zone, p.name);
  ctx.anchors.add(`${p.id}.stand`, "stand", toW(0.55, 0, -0.75), yaw - 0.6, floor, zone, p.name);
  ctx.anchors.add(`${p.id}.camera`, "camera", toW(0.55, 1.45, -1.55), yaw - 0.25, floor, zone, p.name);

  // colliders: desk body including partition, and the chair
  const [hx, hz] = extents(w, 0.66, yaw);
  const [dcx, dcz] = rot(0, 0.03, yaw);
  ctx.colliders.add(x + dcx - hx, y, z + dcz - hz, x + dcx + hx, y + 1.15, z + dcz + hz, "furniture", `${p.id}.desk`);
  const [ccx, ccz] = rot(chairPos.x, chairPos.z, yaw);
  ctx.colliders.add(x + ccx - 0.24, y, z + ccz - 0.24, x + ccx + 0.24, y + 1.0, z + ccz + 0.24, "furniture", `${p.id}.chair`);
}

function monitorAt(b: GeometryBuilder, x: number, y: number, z: number, yaw: number, fn: () => void) {
  b.at(x, y, z, yaw, fn);
}

export function extents(w: number, d: number, yaw: number): [number, number] {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  return [(w * c + d * s) / 2, (w * s + d * c) / 2];
}

function mixFabric(accent: string): string {
  // partition fabric: department accent desaturated towards warm grey
  const a = parseInt(accent.slice(1), 16);
  const g = [0x9a, 0x96, 0x94];
  const ch = [(a >> 16) & 255, (a >> 8) & 255, a & 255].map((v, i) => Math.round(v * 0.55 + g[i] * 0.45));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const pickMug = (r: () => number) => ["#ffffff", P.brandOrange, P.brandBlue, "#e9d8b8", "#d9675e", "#2b2d33"][Math.floor(r() * 6)];
const pickPad = (r: () => number) => ["#2f3544", "#3b4256", "#4a3f5c", "#24303c"][Math.floor(r() * 4)];
const pickNotebook = (r: () => number) => [P.brandNavy, "#c4694b", "#4f8a8b", "#e3a548", "#2b2d33"][Math.floor(r() * 5)];
const pickBottle = (r: () => number) => ["#4fb3c8", "#79b06a", "#d98aa2", "#e3a548", "#c9ccd2"][Math.floor(r() * 5)];

export function hashCode(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
