import { Vector3 } from "@babylonjs/core";
import type { GeometryBuilder, RGB, UVRect } from "../GeometryBuilder";
import { P } from "../../rendering/Palette";
import { bx } from "./Shapes";

/** Monitor on a stand. Origin = desk surface point under the stand. Screen faces −Z. */
export function monitor(b: GeometryBuilder, screen: UVRect, o: { size?: number; portrait?: boolean; bezel?: RGB; arm?: boolean; tilt?: number } = {}): void {
  b.measure("monitor", () => {
    const s = o.size ?? 0.6;
    const w = o.portrait ? s * 0.58 : s, h = o.portrait ? s : s * 0.58;
    const bezel = o.bezel ?? P.bezel;
    const cy = o.arm ? 0.36 : 0.12 + h / 2;
    if (o.arm) {
      b.cyl(0, 0, 0.12, 0.03, 0.03, 0.02, 10, { mat: "metal", color: P.darkMetal });
      b.tube([new Vector3(0, 0.02, 0.12), new Vector3(0, 0.3, 0.12), new Vector3(0, 0.34, 0.04)], 0.016, 8, { mat: "metal", color: P.darkMetal });
    } else {
      slabFoot(b, bezel);
      bx(b, "plastic", bezel, 0, 0.01, 0.05, 0.05, cy - 0.02, 0.025, { r: 0.01 });
    }
    b.at(0, cy, 0.02, 0, () => {
      bx(b, "plastic", bezel, 0, -h / 2, 0, w, h, 0.022, { r: 0.008 });
      bx(b, "plastic", bezel, 0, -h * 0.3, 0.025, w * 0.55, h * 0.5, 0.035, { r: 0.015, seg: 2 });
      b.quad(0, 0, -0.0125, w - 0.016, h - 0.016, { mat: "display", color: "#ffffff", uv: screen });
      bx(b, "plastic", "#1f2128", 0, -h / 2, -0.0115, w, 0.018, 0.002, { r: 0 });
      b.cyl(w * 0.42, -h / 2 + 0.006, -0.012, 0.003, 0.003, 0.002, 6, { mat: "light", color: "#9ee6a8" });
    }, o.tilt ?? -0.06);
  });
}

function slabFoot(b: GeometryBuilder, color: RGB): void {
  bx(b, "plastic", color, 0, 0, 0.04, 0.24, 0.014, 0.17, { r: 0.007 });
}

export function laptop(b: GeometryBuilder, screen: UVRect, open = 1.9, color: RGB = "#c9ccd2"): void {
  b.measure("laptop", () => {
    bx(b, "brushed", color, 0, 0, 0, 0.33, 0.016, 0.23, { r: 0.006 });
    bx(b, "plastic", "#2b2d33", 0, 0.016, 0.01, 0.29, 0.002, 0.11, { r: 0.002 });
    bx(b, "plastic", "#cfd2d8", 0, 0.016, -0.075, 0.1, 0.001, 0.06, { r: 0.002 });
    b.at(0, 0.016, 0.115, 0, () => {
      bx(b, "brushed", color, 0, 0, 0, 0.33, 0.22, 0.008, { r: 0.006 });
      b.quad(0, 0.112, -0.0045, 0.3, 0.19, { mat: "display", color: "#ffffff", uv: screen });
    }, -(Math.PI - open));
  });
}

/** Keyboard: base + individually modelled keycaps (detail LOD). */
export function keyboard(b: GeometryBuilder, base: RGB = P.keyboard, caps: RGB = P.keycap, o: { compact?: boolean; accent?: RGB } = {}): void {
  b.measure("keyboard", () => {
    const w = o.compact ? 0.32 : 0.44;
    bx(b, "plastic", base, 0, 0, 0, w, 0.018, 0.14, { r: 0.007 });
    b.at(0, 0.012, 0, 0, () => bx(b, "plastic", base, 0, 0, 0.04, w, 0.01, 0.04, { r: 0.004 }), -0.04);
    b.details(() => {
      const cols = o.compact ? 12 : 15, k = 0.0235, gap = 0.0045;
      const x0 = -((cols - 1) * (k + gap)) / 2 - (o.compact ? 0 : 0.035);
      for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
        if (!o.compact && c > 12) continue;
        const accent = o.accent && ((r === 0 && c === 0) || (r === 3 && c === cols - 4));
        bx(b, "plastic", accent ? o.accent! : caps, x0 + c * (k + gap) + (r % 2) * 0.006, 0.018, 0.045 - r * (k + gap), k, 0.01, k, { r: 0 });
      }
      bx(b, "plastic", caps, -0.03, 0.018, 0.045 - 4 * (k + gap), 0.14, 0.01, k, { r: 0 });
      if (!o.compact) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) bx(b, "plastic", caps, w / 2 - 0.09 + c * (k + gap), 0.018, 0.045 - r * (k + gap), k, 0.01, k, { r: 0 });
    });
  });
}

export function mouse(b: GeometryBuilder, color: RGB = "#2f323b", pad?: RGB): void {
  b.measure("mouse", () => {
    if (pad) bx(b, "fabric", pad, 0, 0, 0, 0.25, 0.003, 0.21, { r: 0.012 });
    b.sphere(0, 0.004, 0, 0.032, 0.022, 0.052, 8, { mat: "plastic", color, hemi: true });
    b.details(() => b.sphere(0, 0.024, 0.028, 0.004, 0.004, 0.008, 4, { mat: "plastic", color: "#bfc3cc" }));
  });
}

export function mug(b: GeometryBuilder, color: RGB, coffee = true): void {
  b.measure("mug", () => {
    b.lathe(0, 0, 0, [[0, 0], [0.036, 0], [0.04, 0.006], [0.041, 0.095], [0.036, 0.095], [0.035, 0.02]], 16, { mat: "decor", color });
    if (coffee) b.cyl(0, 0.07, 0, 0.035, 0.035, 0.002, 14, { mat: "decor", color: "#5a3826", caps: true });
    b.tube([new Vector3(0.04, 0.075, 0), new Vector3(0.065, 0.07, 0), new Vector3(0.07, 0.045, 0), new Vector3(0.06, 0.025, 0), new Vector3(0.04, 0.022, 0)], 0.008, 6, { mat: "decor", color });
  });
}

export function bottle(b: GeometryBuilder, color: RGB, cap: RGB = "#2b2d33"): void {
  b.measure("bottle", () => {
    b.lathe(0, 0, 0, [[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.19], [0.03, 0.215], [0.018, 0.225], [0, 0.226]], 16, { mat: "decor", color });
    b.cyl(0, 0.222, 0, 0.02, 0.02, 0.03, 12, { mat: "plastic", color: cap });
    b.cyl(0, 0.08, 0, 0.0365, 0.0365, 0.05, 16, { mat: "decor", color: "#ffffff", caps: false });
  });
}

export function notebook(b: GeometryBuilder, cover: RGB): void {
  b.measure("notebook", () => {
    bx(b, "decor", cover, 0, 0, 0, 0.15, 0.016, 0.21, { r: 0.004 });
    bx(b, "decor", "#f5f1e8", 0.004, 0.002, 0, 0.142, 0.012, 0.2, { r: 0.002 });
    bx(b, "decor", "#2b2d33", 0.05, 0, 0, 0.008, 0.0165, 0.212, { r: 0.001 });
  });
}

export function phone(b: GeometryBuilder, screen: UVRect, color: RGB = "#2b2d33"): void {
  b.measure("phone", () => {
    bx(b, "plastic", color, 0, 0, 0, 0.072, 0.009, 0.15, { r: 0.004 });
    b.at(0, 0.0095, 0, 0, () => b.quad(0, 0, 0, 0.064, 0.14, { mat: "display", color: "#ffffff", uv: screen, facing: "+y" }));
  });
}

export function headphones(b: GeometryBuilder, color: RGB, accent: RGB): void {
  b.measure("headphones", () => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; pts.push(new Vector3(Math.cos(a) * 0.085, 0.02 + Math.sin(a) * 0.06, 0)); }
    b.at(0, 0, 0, 0, () => {
      b.tube(pts, 0.009, 6, { mat: "plastic", color });
      for (const s of [-1, 1]) b.at(s * 0.085, 0.03, 0, 0, () => {
        b.cyl(0, -0.02, 0, 0.038, 0.038, 0.035, 14, { mat: "plastic", color });
        b.cyl(0, 0.014, 0, 0.032, 0.032, 0.005, 14, { mat: "fabric", color: accent });
      }, 0, Math.PI / 2);
    }, Math.PI / 2 - 0.3);
  });
}

export function stickyNotes(b: GeometryBuilder, rnd: () => number, n: number, w = 0.3): void {
  const cols = ["#ffe58a", "#ffb7c5", "#a9e8c6", "#a9d6ff", "#ffcf9e"];
  b.details(() => {
    for (let i = 0; i < n; i++) {
      b.at(-w / 2 + rnd() * w, 0.03 + rnd() * 0.18, 0, 0, () => bx(b, "decor", cols[Math.floor(rnd() * cols.length)], 0, 0, 0, 0.06, 0.06, 0.002, { r: 0 }), 0, (rnd() - 0.5) * 0.3);
    }
  });
}

export function deskCalendar(b: GeometryBuilder, uv: UVRect): void {
  b.measure("calendar", () => {
    b.extrude([[-0.06, 0], [0.06, 0], [0, 0.1]], -0.06, 0.12, { mat: "decor", color: "#2b2d33" });
    b.at(0, 0.05, -0.03, 0, () => b.quad(0, 0, -0.002, 0.1, 0.09, { mat: "print", color: "#ffffff", uv }), 0.55);
  });
}

export function penHolder(b: GeometryBuilder, color: RGB, rnd: () => number): void {
  b.lathe(0, 0, 0, [[0, 0], [0.035, 0], [0.036, 0.1], [0.032, 0.1], [0.031, 0.01]], 14, { mat: "decor", color });
  b.details(() => {
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      b.at(Math.cos(a) * 0.012, 0.01, Math.sin(a) * 0.012, 0, () => b.cyl(0, 0, 0, 0.004, 0.004, 0.14, 6, { mat: "plastic", color: [P.brandBlue, P.angular, "#2b2d33", P.devops][i] }), (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3);
    }
  });
}

export function cable(b: GeometryBuilder, pts: Vector3[], color: RGB = "#26282e", r = 0.005): void {
  b.details(() => b.tube(pts, r, 5, { mat: "plastic", color, caps: false }));
}

export function deskLamp(b: GeometryBuilder, color: RGB): void {
  b.measure("deskLamp", () => {
    b.cyl(0, 0, 0, 0.07, 0.075, 0.02, 16, { mat: "metal", color });
    b.tube([new Vector3(0, 0.02, 0), new Vector3(0.02, 0.3, -0.05), new Vector3(0.0, 0.42, 0.1)], 0.008, 6, { mat: "metal", color });
    b.at(0, 0.42, 0.12, 0, () => {
      b.lathe(0, -0.07, 0, [[0.06, 0], [0.05, 0.03], [0.022, 0.07], [0, 0.075]], 14, { mat: "metal", color });
      b.cyl(0, -0.068, 0, 0.045, 0.045, 0.004, 12, { mat: "light", color: "#fff1cf" });
    }, 0.5);
  });
}

/** DRAGON's desk mascot: a tiny chubby green dragon. */
export function dragonFigurine(b: GeometryBuilder): void {
  b.measure("dragonFigurine", () => {
    const g = "#6fbf73", belly = "#f1e2a6", horn = "#f3ead8";
    b.cyl(0, 0, 0, 0.055, 0.06, 0.012, 16, { mat: "decor", color: "#2b2d33" });
    b.sphere(0, 0.065, 0, 0.042, 0.05, 0.038, 10, { mat: "decor", color: g });
    b.sphere(0, 0.06, -0.022, 0.028, 0.034, 0.02, 8, { mat: "decor", color: belly });
    b.sphere(0, 0.13, -0.005, 0.036, 0.032, 0.034, 10, { mat: "decor", color: g });
    b.sphere(0, 0.122, -0.036, 0.022, 0.016, 0.018, 8, { mat: "decor", color: g });
    for (const s of [-1, 1]) {
      b.sphere(s * 0.016, 0.142, -0.03, 0.007, 0.008, 0.005, 6, { mat: "decor", color: "#1f2a44" });
      b.at(s * 0.018, 0.155, 0.005, 0, () => b.cyl(0, 0, 0, 0.008, 0.002, 0.03, 8, { mat: "decor", color: horn }), -0.4, s * 0.3);
      b.at(s * 0.035, 0.09, 0.02, s * 0.5, () => b.extrude([[0, 0], [0.05, 0.045], [0.055, 0.0], [0.035, -0.015]], -0.003, 0.006, { mat: "decor", color: "#4f9e5a" }), 0, 0);
      b.sphere(s * 0.03, 0.02, -0.02, 0.014, 0.012, 0.018, 6, { mat: "decor", color: g });
    }
    b.tube([new Vector3(0, 0.04, 0.03), new Vector3(0.02, 0.025, 0.07), new Vector3(0.05, 0.02, 0.08), new Vector3(0.07, 0.035, 0.07)], 0.012, 6, { mat: "decor", color: g });
    b.cyl(0.072, 0.035, 0.068, 0.012, 0.0, 0.025, 6, { mat: "decor", color: P.brandOrange });
  });
}

// ------------------------------------------------------------------------------------------ plants

/** Fiddle-leaf style floor plant: tapered pot + blobby, posterised foliage clusters. */
export function floorPlant(b: GeometryBuilder, rnd: () => number, o: { pot?: RGB; scale?: number; kind?: "bush" | "snake" | "tree" | "palm" } = {}): void {
  b.measure(`plant:${o.kind ?? "bush"}`, () => {
    const s = o.scale ?? 1, potC = o.pot ?? P.pot;
    b.lathe(0, 0, 0, [[0, 0], [0.16 * s, 0], [0.2 * s, 0.38 * s], [0.215 * s, 0.4 * s], [0.2 * s, 0.41 * s], [0, 0.41 * s]], 18, { mat: "decor", color: potC });
    b.cyl(0, 0.385 * s, 0, 0.19 * s, 0.19 * s, 0.01, 16, { mat: "decor", color: "#5b4433" });
    const leaves = [P.leaf1, P.leaf2, P.leaf3];
    const kind = o.kind ?? "bush";
    if (kind === "snake") {
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, r = rnd() * 0.09 * s;
        b.at(Math.cos(a) * r, 0.39 * s, Math.sin(a) * r, a, () =>
          b.sphere(0, 0.3 * s, 0, 0.035 * s, (0.3 + rnd() * 0.2) * s, 0.012 * s, 6, { mat: "foliage", color: i % 2 ? "#4f8c58" : "#79a95e" }),
          (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.3);
      }
      return;
    }
    if (kind === "tree" || kind === "palm") {
      b.tube([new Vector3(0, 0.39 * s, 0), new Vector3(0.03 * s, 0.9 * s, 0.01), new Vector3(-0.02 * s, 1.35 * s, 0)], 0.02 * s, 6, { mat: "wood", color: "#7a5a3e" });
    }
    const clusters = kind === "bush" ? 6 : 9;
    const baseY = kind === "bush" ? 0.55 : 1.1;
    for (let i = 0; i < clusters; i++) {
      const a = rnd() * Math.PI * 2, r = (0.05 + rnd() * 0.16) * s;
      const y = (baseY + rnd() * (kind === "bush" ? 0.35 : 0.65)) * s;
      const sz = (0.13 + rnd() * 0.09) * s;
      if (kind === "palm") {
        b.at(Math.cos(a) * 0.05, y, Math.sin(a) * 0.05, a, () => b.sphere(0, 0, 0.22 * s, 0.07 * s, 0.018 * s, 0.26 * s, 6, { mat: "foliage", color: leaves[i % 3] }), 0.35 + rnd() * 0.3);
      } else {
        b.sphere(Math.cos(a) * r, y, Math.sin(a) * r, sz, sz * 0.82, sz, 7, { mat: "foliage", color: leaves[i % 3] });
      }
    }
  });
}

export function deskPlant(b: GeometryBuilder, rnd: () => number, pot: RGB = P.potTerracotta): void {
  b.measure("deskPlant", () => {
    b.lathe(0, 0, 0, [[0, 0], [0.04, 0], [0.05, 0.075], [0.054, 0.085], [0, 0.085]], 14, { mat: "decor", color: pot });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd();
      b.sphere(Math.cos(a) * 0.025, 0.11 + rnd() * 0.03, Math.sin(a) * 0.025, 0.032, 0.026, 0.032, 6, { mat: "foliage", color: i % 2 ? P.leaf2 : P.leaf1 });
    }
  });
}

export function succulent(b: GeometryBuilder, rnd: () => number): void {
  b.lathe(0, 0, 0, [[0, 0], [0.035, 0], [0.04, 0.05], [0, 0.05]], 12, { mat: "decor", color: "#efe8dc" });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.at(Math.cos(a) * 0.012, 0.055, Math.sin(a) * 0.012, -a, () => b.sphere(0, 0.012, 0.012, 0.01, 0.022, 0.008, 5, { mat: "foliage", color: "#8cc49a" }), 0.6 + rnd() * 0.3);
  }
}

// ------------------------------------------------------------------------------------------ appliances & fixtures

export function waterDispenser(b: GeometryBuilder): void {
  b.measure("waterDispenser", () => {
    bx(b, "plastic", "#e9e8e4", 0, 0, 0, 0.32, 1.0, 0.34, { r: 0.04, seg: 2 });
    bx(b, "plastic", "#cfd3d8", 0, 0.55, -0.172, 0.24, 0.24, 0.01, { r: 0.02 });
    bx(b, "plastic", "#2b2d33", 0, 0.52, -0.19, 0.18, 0.02, 0.06, { r: 0.006 });
    bx(b, "plastic", "#d9675e", -0.05, 0.7, -0.18, 0.035, 0.05, 0.03, { r: 0.008 });
    bx(b, "plastic", "#4f8fd1", 0.05, 0.7, -0.18, 0.035, 0.05, 0.03, { r: 0.008 });
    b.lathe(0, 1.0, 0, [[0.03, -0.02], [0.03, 0.04], [0.13, 0.1], [0.135, 0.36], [0.12, 0.42], [0, 0.43]], 18, { mat: "glass", color: "#9fd3f2" });
    b.lathe(0, 1.0, 0, [[0, 0], [0.12, 0.08], [0.125, 0.3], [0, 0.31]], 16, { mat: "decor", color: "#7cc1ea" });
  });
}

export function coffeeMachine(b: GeometryBuilder): void {
  b.measure("coffeeMachine", () => {
    bx(b, "plastic", "#2f323b", 0, 0, 0, 0.32, 0.42, 0.38, { r: 0.03, seg: 2 });
    bx(b, "brushed", P.aluminium, 0, 0.0, -0.08, 0.26, 0.04, 0.22, { r: 0.006 });
    bx(b, "plastic", "#22242a", 0, 0.12, -0.17, 0.2, 0.14, 0.06, { r: 0.02 });
    b.cyl(0, 0.04, -0.1, 0.035, 0.04, 0.07, 12, { mat: "decor", color: "#ffffff" });
    bx(b, "display", "#ffffff", 0.07, 0.33, -0.192, 0.1, 0.04, 0.002, { r: 0 });
    bx(b, "brushed", P.aluminium, 0, 0.42, 0, 0.3, 0.015, 0.36, { r: 0.006 });
  });
}

export function fridge(b: GeometryBuilder): void {
  b.measure("fridge", () => {
    bx(b, "metal", "#e8e7e3", 0, 0.02, 0, 0.66, 1.75, 0.66, { r: 0.03, seg: 2 });
    bx(b, "metal", "#dcdad5", 0, 1.18, -0.334, 0.64, 0.006, 0.01, { r: 0 });
    bx(b, "brushed", P.aluminium, 0.27, 1.24, -0.35, 0.025, 0.3, 0.03, { r: 0.01 });
    bx(b, "brushed", P.aluminium, 0.27, 0.8, -0.35, 0.025, 0.3, 0.03, { r: 0.01 });
    // magnets and a postcard
    b.details(() => {
      bx(b, "decor", "#ffd166", -0.15, 1.35, -0.336, 0.08, 0.1, 0.004, { r: 0.002 });
      bx(b, "decor", P.react, -0.05, 1.45, -0.336, 0.05, 0.05, 0.006, { r: 0.01 });
      bx(b, "decor", P.angular, 0.05, 1.32, -0.336, 0.04, 0.04, 0.006, { r: 0.01 });
    });
  });
}

export function microwave(b: GeometryBuilder): void {
  bx(b, "metal", "#e9e8e4", 0, 0, 0, 0.48, 0.28, 0.36, { r: 0.015 });
  bx(b, "glass", "#ffffff", -0.05, 0.05, -0.182, 0.32, 0.18, 0.004, { r: 0 });
  bx(b, "plastic", "#2b2d33", -0.05, 0.05, -0.178, 0.32, 0.18, 0.002, { r: 0 });
  bx(b, "plastic", "#cfd2d8", 0.18, 0.04, -0.182, 0.1, 0.2, 0.006, { r: 0.004 });
}

export function serverRack(b: GeometryBuilder, panel: UVRect): void {
  b.measure("serverRack", () => {
    bx(b, "metal", "#2b2e37", 0, 0, 0, 0.6, 2.0, 1.0, { r: 0.012 });
    b.quad(0, 1.0, -0.502, 0.5, 1.84, { mat: "display", color: "#ffffff", uv: panel });
    bx(b, "metal", "#3a3e49", 0, 2.0, 0, 0.6, 0.04, 1.0, { r: 0.006 });
    for (let i = 0; i < 5; i++) bx(b, "metal", "#1f2128", -0.2 + i * 0.1, 2.04, 0.1, 0.06, 0.01, 0.5, { r: 0 });
  });
}

export function fireExtinguisher(b: GeometryBuilder): void {
  b.measure("fireExtinguisher", () => {
    bx(b, "metal", P.darkMetal, 0, 0.55, 0.06, 0.12, 0.05, 0.02, { r: 0.004 });
    b.lathe(0, 0.08, 0, [[0, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.42], [0.06, 0.48], [0.02, 0.5], [0, 0.5]], 16, { mat: "metal", color: "#d64545" });
    b.cyl(0, 0.58, 0, 0.018, 0.018, 0.06, 8, { mat: "metal", color: "#2b2d33" });
    bx(b, "metal", "#2b2d33", 0.03, 0.62, 0, 0.09, 0.015, 0.03, { r: 0.004 });
    b.tube([new Vector3(-0.02, 0.62, 0), new Vector3(-0.09, 0.5, -0.02), new Vector3(-0.085, 0.25, -0.04)], 0.009, 6, { mat: "plastic", color: "#2b2d33" });
    bx(b, "decor", "#ffffff", 0, 0.25, -0.078, 0.08, 0.1, 0.004, { r: 0 });
  });
}

export function acCassette(b: GeometryBuilder): void {
  b.measure("acCassette", () => {
    bx(b, "ceiling", "#f1efea", 0, -0.04, 0, 0.84, 0.04, 0.84, { r: 0.012 });
    bx(b, "ceiling", "#d9d6cf", 0, -0.045, 0, 0.42, 0.01, 0.42, { r: 0.004 });
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      b.at(Math.sin(a) * 0.32, -0.044, Math.cos(a) * 0.32, a, () => bx(b, "ceiling", "#c7c3bb", 0, 0, 0, 0.6, 0.008, 0.08, { r: 0.002 }));
    }
  });
}

export function pendantLamp(b: GeometryBuilder, drop: number, color: RGB, shade: "cone" | "dome" | "drum" = "dome"): void {
  b.measure("pendantLamp", () => {
    b.cyl(0, -0.02, 0, 0.05, 0.05, 0.02, 12, { mat: "metal", color });
    b.cyl(0, -drop, 0, 0.003, 0.003, drop, 4, { mat: "plastic", color: "#2b2d33" });
    const profile: [number, number][] = shade === "cone" ? [[0.02, 0], [0.18, -0.2], [0.185, -0.21]] : shade === "drum" ? [[0.15, 0], [0.15, -0.2], [0.152, -0.21]] : [[0.02, 0], [0.12, -0.04], [0.19, -0.16], [0.2, -0.2]];
    b.lathe(0, -drop, 0, [[0, 0.002], ...profile], 20, { mat: "metal", color, hard: shade !== "dome" });
    b.sphere(0, -drop - 0.12, 0, 0.05, 0.05, 0.05, 8, { mat: "light", color: "#fff3d6" });
  });
}

export function wallClock(b: GeometryBuilder, face: UVRect): void {
  b.measure("wallClock", () => {
    b.at(0, 0, 0, 0, () => b.cyl(0, 0, 0, 0.17, 0.17, 0.035, 28, { mat: "plastic", color: P.brandNavy }), -Math.PI / 2);
    b.quad(0, 0, -0.036, 0.29, 0.29, { mat: "print", color: "#ffffff", uv: face });
  });
}

export function posterFrame(b: GeometryBuilder, uv: UVRect, w: number, h: number, frame: RGB = "#2b2d33"): void {
  b.measure("posterFrame", () => {
    bx(b, "wood", frame, 0, -h / 2 - 0.02, 0, w + 0.04, h + 0.04, 0.025, { r: 0.005 });
    b.quad(0, 0, -0.014, w, h, { mat: "print", color: "#ffffff", uv });
  });
}

export function trashBin(b: GeometryBuilder, color: RGB = "#596071"): void {
  b.lathe(0, 0, 0, [[0, 0], [0.12, 0], [0.14, 0.32], [0.13, 0.32], [0.11, 0.015]], 16, { mat: "metal", color });
}

export function printer(b: GeometryBuilder): void {
  b.measure("printer", () => {
    bx(b, "plastic", "#e7e6e2", 0, 0, 0, 0.55, 0.42, 0.5, { r: 0.03, seg: 2 });
    bx(b, "plastic", "#2f323b", 0, 0.42, 0.05, 0.5, 0.06, 0.38, { r: 0.015 });
    bx(b, "plastic", "#cfcdc8", 0, 0.18, -0.27, 0.36, 0.015, 0.12, { r: 0.004 });
    bx(b, "decor", "#ffffff", 0, 0.195, -0.27, 0.21, 0.01, 0.12, { r: 0 });
    bx(b, "display", "#ffffff", 0.18, 0.46, -0.16, 0.1, 0.002, 0.06, { r: 0 });
  });
}

export function tvScreen(b: GeometryBuilder, uv: UVRect, w: number): void {
  b.measure("tvScreen", () => {
    const h = w * 0.5625;
    bx(b, "plastic", "#1f2128", 0, -h / 2, 0.02, w, h, 0.04, { r: 0.008 });
    b.quad(0, 0, -0.0005, w - 0.03, h - 0.03, { mat: "display", color: "#ffffff", uv });
    bx(b, "metal", P.darkMetal, 0, -0.15, 0.05, 0.3, 0.3, 0.02, { r: 0.004 });
  });
}

export function deviceTablet(b: GeometryBuilder, screen: UVRect, color: RGB = "#2f323b"): void {
  bx(b, "plastic", color, 0, 0, 0, 0.17, 0.008, 0.24, { r: 0.008 });
  b.at(0, 0.0085, 0, 0, () => b.quad(0, 0, 0, 0.155, 0.225, { mat: "display", color: "#ffffff", uv: screen, facing: "+y" }));
}

export function drawingTablet(b: GeometryBuilder): void {
  b.measure("drawingTablet", () => {
    bx(b, "plastic", "#2b2d33", 0, 0, 0, 0.36, 0.012, 0.24, { r: 0.01 });
    bx(b, "plastic", "#3a3e49", 0.02, 0.012, 0, 0.27, 0.001, 0.19, { r: 0.004 });
    for (let i = 0; i < 4; i++) bx(b, "plastic", "#4a4f5c", -0.155, 0.012, -0.06 + i * 0.04, 0.025, 0.004, 0.025, { r: 0.004 });
    b.at(0.13, 0.016, 0.06, 0.6, () => b.cyl(0, -0.07, 0, 0.005, 0.004, 0.14, 6, { mat: "plastic", color: "#1f2128" }), 0, Math.PI / 2);
  });
}

export function snackBowl(b: GeometryBuilder, rnd: () => number): void {
  b.lathe(0, 0, 0, [[0, 0], [0.06, 0], [0.13, 0.08], [0.12, 0.085], [0.05, 0.01]], 18, { mat: "decor", color: "#e7d6bb" });
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2;
    b.sphere(Math.cos(a) * 0.05, 0.06, Math.sin(a) * 0.05, 0.035, 0.035, 0.035, 6, { mat: "decor", color: [P.angular, "#f3c74f", P.node][i % 3] });
  }
}

export function exitSign(b: GeometryBuilder, uv: UVRect): void {
  bx(b, "plastic", "#f0f0ec", 0, -0.08, 0.01, 0.36, 0.16, 0.04, { r: 0.008 });
  b.quad(0, 0, -0.011, 0.32, 0.12, { mat: "display", color: "#ffffff", uv });
}
