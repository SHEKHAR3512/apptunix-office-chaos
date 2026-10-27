import { Vector3 } from "@babylonjs/core";
import type { GeometryBuilder, RGB, UVRect } from "../GeometryBuilder";
import { P } from "../../rendering/Palette";
import { bx, circleOutline, roundedRectOutline, slab, stadiumOutline } from "./Shapes";

/**
 * Furniture prefabs. Local frame convention: origin on the floor, the user/sitter is on the
 * −Z side facing +Z. Rotate with b.at(..., ry) to place.
 */

export interface WorkstationOpts {
  width?: number;
  depth?: number;
  top?: RGB;
  edge?: RGB;
  frame?: RGB;
  screen?: RGB;       // partition fabric colour
  partition?: boolean;
  legLeft?: boolean;
  legRight?: boolean;
  pedestal?: "left" | "right" | "none";
  cpu?: boolean;
}

/** Linear 1200×600 workstation module as commonly used in Indian IT offices. */
export function workstation(b: GeometryBuilder, o: WorkstationOpts = {}): void {
  b.measure("workstation", () => {
    const w = o.width ?? 1.2, d = o.depth ?? 0.6, h = 0.75, t = 0.026;
    const frame = o.frame ?? P.frameGrey;
    // laminate top with darker edge band
    bx(b, "wood", o.edge ?? "#c9b9a0", 0, h - t, 0, w, t, d, { r: 0.008 });
    bx(b, "wood", o.top ?? P.deskTop, 0, h - 0.002, 0, w - 0.012, 0.004, d - 0.012, { r: 0.002 });
    // metal leg frames
    for (const side of [-1, 1]) {
      if ((side < 0 && o.legLeft === false) || (side > 0 && o.legRight === false)) continue;
      const x = side * (w / 2 - 0.03);
      bx(b, "metal", frame, x, 0, 0, 0.05, 0.03, d - 0.04, { r: 0.008 });
      bx(b, "metal", frame, x, 0.03, d * 0.18, 0.045, h - t - 0.03, 0.06, { r: 0.01 });
      bx(b, "metal", frame, x, 0.03, -d * 0.18, 0.045, h - t - 0.03, 0.06, { r: 0.01 });
      bx(b, "metal", frame, x, h - t - 0.05, 0, 0.04, 0.05, d - 0.06, { r: 0.008 });
      b.cyl(x, 0, d / 2 - 0.05, 0.016, 0.016, 0.012, 8, { mat: "plastic", color: "#2b2d33" });
      b.cyl(x, 0, -d / 2 + 0.05, 0.016, 0.016, 0.012, 8, { mat: "plastic", color: "#2b2d33" });
    }
    // modesty panel + cable tray
    bx(b, "metal", frame, 0, 0.32, d / 2 - 0.04, w - 0.1, 0.36, 0.012, { r: 0.004 });
    bx(b, "metal", "#4d5361", 0, h - t - 0.11, d / 2 - 0.11, w - 0.16, 0.08, 0.12, { r: 0.004 });
    // grommet
    b.cyl(w * 0.3, h - 0.001, d / 2 - 0.08, 0.03, 0.03, 0.004, 14, { mat: "plastic", color: "#2f323b" });
    // front partition: fabric pinboard + aluminium cap
    if (o.partition !== false) {
      const ph = 0.38;
      bx(b, "fabric", o.screen ?? P.fabricGrey, 0, h, d / 2 + 0.015, w - 0.02, ph, 0.03, { r: 0.008 });
      bx(b, "brushed", P.aluminium, 0, h + ph, d / 2 + 0.015, w, 0.022, 0.04, { r: 0.008 });
      bx(b, "brushed", P.aluminium, -w / 2 + 0.01, h, d / 2 + 0.015, 0.02, ph, 0.04, { r: 0.005 });
      bx(b, "brushed", P.aluminium, w / 2 - 0.01, h, d / 2 + 0.015, 0.02, ph, 0.04, { r: 0.005 });
    }
    if ((o.pedestal ?? "right") !== "none") pedestal(b, (o.pedestal === "left" ? -1 : 1) * (w / 2 - 0.26), 0.02);
    if (o.cpu !== false) cpuTower(b, (o.pedestal === "left" ? 1 : -1) * (w / 2 - 0.2), 0.02);
  });
}

export function pedestal(b: GeometryBuilder, x: number, z: number, color: RGB = "#e8e4dc"): void {
  b.at(x, 0, z, 0, () => {
    bx(b, "wood", color, 0, 0.04, 0, 0.4, 0.56, 0.48, { r: 0.012 });
    for (let i = 0; i < 3; i++) {
      const y = 0.08 + i * 0.17;
      bx(b, "wood", "#f2efe9", 0, y, -0.242, 0.37, 0.15, 0.006, { r: 0.004 });
      bx(b, "brushed", P.aluminium, 0, y + 0.115, -0.252, 0.14, 0.014, 0.014, { r: 0.006 });
    }
    for (const [cx, cz] of [[-0.16, -0.18], [0.16, -0.18], [-0.16, 0.18], [0.16, 0.18]]) b.sphere(cx, 0.022, cz, 0.022, 0.022, 0.022, 5, { mat: "plastic", color: "#2b2d33" });
  });
}

export function cpuTower(b: GeometryBuilder, x: number, z: number): void {
  b.at(x, 0, z, 0, () => {
    bx(b, "plastic", "#2d3039", 0, 0.02, 0, 0.19, 0.42, 0.42, { r: 0.012 });
    bx(b, "plastic", "#3b3f4b", 0, 0.03, -0.212, 0.17, 0.4, 0.006, { r: 0.004 });
    b.cyl(0.05, 0.37, -0.216, 0.01, 0.01, 0.005, 8, { mat: "light", color: "#7fd1ff" });
    for (let i = 0; i < 5; i++) bx(b, "plastic", "#25272e", -0.03, 0.08 + i * 0.05, -0.216, 0.08, 0.012, 0.004, { r: 0 });
  });
}

export type ChairStyle = "task" | "exec" | "meeting" | "visitor";

/** Ergonomic office chair. Seat at ~0.47m, backrest on −Z, sitter faces +Z. */
export function officeChair(b: GeometryBuilder, style: ChairStyle = "task", color: RGB = P.chairMesh, accent: RGB = P.chairBlack): void {
  b.measure(`chair:${style}`, () => {
    const seatY = style === "visitor" ? 0.46 : 0.47;
    if (style === "visitor") {
      // cantilever sled frame
      const fr = P.aluminium;
      for (const s of [-1, 1]) {
        b.tube([new Vector3(s * 0.22, 0.01, 0.24), new Vector3(s * 0.22, 0.01, -0.22), new Vector3(s * 0.22, 0.2, -0.24), new Vector3(s * 0.22, seatY - 0.03, -0.2), new Vector3(s * 0.22, 0.88, -0.27)], 0.012, 8, { mat: "brushed", color: fr });
      }
      b.tube([new Vector3(-0.22, 0.01, 0.24), new Vector3(0.22, 0.01, 0.24)], 0.012, 8, { mat: "brushed", color: fr, caps: false });
    } else {
      // five-star base
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 10;
        b.at(0, 0, 0, a, () => {
          bx(b, "plastic", accent, 0, 0.075, 0.16, 0.045, 0.035, 0.32, { r: 0.014 });
          b.cyl(0, 0.0, 0.3, 0.028, 0.028, 0.04, 10, { mat: "plastic", color: "#25262c" });
          bx(b, "plastic", "#25262c", 0, 0.035, 0.3, 0.012, 0.04, 0.05, { r: 0.004 });
        });
      }
      b.cyl(0, 0.07, 0, 0.045, 0.04, 0.06, 14, { mat: "plastic", color: accent });
      b.cyl(0, 0.12, 0, 0.022, 0.022, 0.26, 12, { mat: "brushed", color: P.aluminium });
      b.cyl(0, 0.2, 0, 0.032, 0.032, 0.14, 12, { mat: "plastic", color: accent });
      bx(b, "plastic", accent, 0, seatY - 0.1, 0.01, 0.2, 0.05, 0.22, { r: 0.012 });
    }
    // seat cushion with a softly rounded waterfall front
    bx(b, style === "exec" || style === "meeting" ? "leather" : "fabric", color, 0, seatY - 0.06, 0.02, 0.5, 0.085, 0.47, { r: 0.04, seg: 2 });
    bx(b, "plastic", accent, 0, seatY - 0.075, 0.02, 0.46, 0.02, 0.43, { r: 0.008 });
    // backrest
    const backH = style === "exec" ? 0.68 : style === "meeting" ? 0.52 : style === "visitor" ? 0.36 : 0.56;
    const backMat = style === "exec" || style === "meeting" ? "leather" : "fabric";
    b.at(0, seatY + 0.06, -0.25, 0, () => {
      bx(b, backMat, color, 0, 0, 0, 0.46, backH, 0.06, { r: 0.028, seg: 2 });
      bx(b, "plastic", accent, 0, 0.02, 0.035, 0.42, backH - 0.04, 0.02, { r: 0.01 });
      if (style === "task") {
        // lumbar pad
        bx(b, "fabric", accent, 0, 0.08, -0.035, 0.36, 0.08, 0.025, { r: 0.012 });
      }
      if (style === "exec") {
        bx(b, "leather", color, 0, backH + 0.03, 0.0, 0.3, 0.16, 0.07, { r: 0.03, seg: 2 });
        bx(b, "plastic", accent, 0, backH - 0.02, 0.035, 0.04, 0.08, 0.02, { r: 0.006 });
      }
    }, -0.12);
    if (style !== "visitor") {
      // spine connecting back to mechanism
      b.tube([new Vector3(0, seatY - 0.09, -0.1), new Vector3(0, seatY - 0.07, -0.25), new Vector3(0, seatY + 0.12, -0.3)], 0.022, 8, { mat: "plastic", color: accent });
      // armrests
      for (const s of [-1, 1]) {
        b.tube([new Vector3(s * 0.2, seatY - 0.08, -0.04), new Vector3(s * 0.25, seatY - 0.06, -0.04), new Vector3(s * 0.26, seatY + 0.17, -0.05)], 0.016, 8, { mat: "plastic", color: accent });
        bx(b, "plastic", accent, s * 0.26, seatY + 0.17, -0.02, 0.07, 0.03, 0.24, { r: 0.014 });
      }
    }
  });
}

/** Meeting table with a stadium or rounded-rect top and pedestal legs. */
export function meetingTable(b: GeometryBuilder, w: number, d: number, o: { shape?: "stadium" | "rounded" | "round"; top?: RGB; base?: RGB } = {}): void {
  b.measure(`meetingTable:${o.shape ?? "rounded"}`, () => {
    const top = o.top ?? P.deskOak, base = o.base ?? P.darkMetal;
    const outline = o.shape === "stadium" ? stadiumOutline(w, d) : o.shape === "round" ? circleOutline(w / 2, 28) : roundedRectOutline(w, d, Math.min(0.12, d * 0.2));
    slab(b, outline, 0, 0.71, 0, 0.045, { mat: "wood", color: top });
    // a slightly inset darker underside edge for depth
    slab(b, o.shape === "round" ? circleOutline(w / 2 - 0.03, 28) : o.shape === "stadium" ? stadiumOutline(w - 0.06, d - 0.06) : roundedRectOutline(w - 0.06, d - 0.06, Math.min(0.1, d * 0.18)), 0, 0.69, 0, 0.022, { mat: "wood", color: P.deskWalnut });
    if (o.shape === "round") {
      b.cyl(0, 0.0, 0, 0.3, 0.3, 0.025, 24, { mat: "metal", color: base });
      b.cyl(0, 0.02, 0, 0.05, 0.05, 0.67, 14, { mat: "metal", color: base });
      return;
    }
    const legs = w > 2.6 ? [-w * 0.3, w * 0.3] : [0];
    for (const lx of legs) {
      bx(b, "metal", base, lx, 0, 0, 0.12, 0.02, d * 0.6, { r: 0.008 });
      bx(b, "metal", base, lx, 0.02, 0, 0.08, 0.67, 0.12, { r: 0.02 });
      bx(b, "metal", base, lx, 0.62, 0, 0.1, 0.07, d * 0.55, { r: 0.01 });
    }
    // cable box with power/HDMI ports in the middle of the top
    bx(b, "brushed", P.aluminium, 0, 0.752, 0, 0.32, 0.008, 0.12, { r: 0.004 });
    bx(b, "plastic", "#2b2d33", -0.07, 0.758, 0, 0.05, 0.004, 0.03, { r: 0.002 });
    bx(b, "plastic", "#2b2d33", 0.07, 0.758, 0, 0.05, 0.004, 0.03, { r: 0.002 });
  });
}

export function sofa(b: GeometryBuilder, w: number, color: RGB, o: { seats?: number; legs?: RGB } = {}): void {
  b.measure("sofa", () => {
    const d = 0.86, seats = o.seats ?? Math.max(1, Math.round((w - 0.3) / 0.65));
    bx(b, "fabric", color, 0, 0.12, 0.05, w, 0.26, d - 0.1, { r: 0.04, seg: 2 });
    bx(b, "fabric", color, 0, 0.12, -d / 2 + 0.12, w, 0.62, 0.22, { r: 0.06, seg: 2 });
    for (const s of [-1, 1]) bx(b, "fabric", color, s * (w / 2 - 0.09), 0.12, 0.03, 0.18, 0.46, d - 0.06, { r: 0.06, seg: 2 });
    const cw = (w - 0.36) / seats;
    for (let i = 0; i < seats; i++) {
      const x = -w / 2 + 0.18 + cw * (i + 0.5);
      bx(b, "fabric", color, x, 0.38, 0.1, cw - 0.02, 0.12, d - 0.32, { r: 0.05, seg: 2 });
      b.at(x, 0.48, -d / 2 + 0.3, 0, () => bx(b, "fabric", color, 0, 0, 0, cw - 0.04, 0.4, 0.14, { r: 0.06, seg: 2 }), -0.18);
    }
    for (const [lx, lz] of [[-w / 2 + 0.08, -d / 2 + 0.1], [w / 2 - 0.08, -d / 2 + 0.1], [-w / 2 + 0.08, d / 2 - 0.1], [w / 2 - 0.08, d / 2 - 0.1]]) {
      b.cyl(lx, 0, lz, 0.018, 0.026, 0.12, 8, { mat: "wood", color: o.legs ?? P.deskWalnut });
    }
  });
}

export function cushion(b: GeometryBuilder, x: number, y: number, z: number, color: RGB, ry = 0): void {
  b.at(x, y, z, ry, () => bx(b, "fabric", color, 0, 0, 0, 0.38, 0.36, 0.12, { r: 0.06, seg: 2 }), -0.25);
}

export function coffeeTable(b: GeometryBuilder, r = 0.4, top: RGB = P.deskOak): void {
  b.measure("coffeeTable", () => {
    slab(b, circleOutline(r, 28), 0, 0.4, 0, 0.035, { mat: "wood", color: top });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.tube([new Vector3(Math.cos(a) * r * 0.5, 0.4, Math.sin(a) * r * 0.5), new Vector3(Math.cos(a) * r * 0.75, 0.0, Math.sin(a) * r * 0.75)], 0.016, 8, { mat: "metal", color: P.darkMetal });
    }
  });
}

/** Low storage credenza; used as soft department dividers. */
export function storageCabinet(b: GeometryBuilder, w: number, color: RGB = "#ebe6dd", top: RGB = P.deskOak, h = 0.78): void {
  b.measure("storageCabinet", () => {
    const d = 0.45;
    bx(b, "wood", color, 0, 0.06, 0, w, h - 0.08, d, { r: 0.01 });
    bx(b, "wood", top, 0, h - 0.025, 0, w + 0.02, 0.025, d + 0.02, { r: 0.008 });
    bx(b, "metal", P.darkMetal, 0, 0, 0, w - 0.06, 0.06, d - 0.06, { r: 0.004 });
    const n = Math.max(1, Math.round(w / 0.45));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      for (const s of [-1, 1]) {
        bx(b, "wood", "#f4f1ec", x, 0.09, s * (d / 2 + 0.002), w / n - 0.012, h - 0.15, 0.006, { r: 0.003 });
        bx(b, "brushed", P.aluminium, x + (i % 2 ? -1 : 1) * (w / n / 2 - 0.05), h * 0.62, s * (d / 2 + 0.01), 0.014, 0.16, 0.014, { r: 0.006 });
      }
    }
  });
}

export function bookshelf(b: GeometryBuilder, w: number, h: number, rnd: () => number, color: RGB = "#e9e2d6"): void {
  b.measure("bookshelf", () => {
    const d = 0.35, shelves = Math.max(2, Math.round(h / 0.38));
    bx(b, "wood", color, -w / 2 + 0.01, 0, 0, 0.02, h, d, { r: 0.004 });
    bx(b, "wood", color, w / 2 - 0.01, 0, 0, 0.02, h, d, { r: 0.004 });
    bx(b, "wood", "#d8cfc0", 0, 0, d / 2 - 0.01, w, h, 0.01, { r: 0.002 });
    const bookCols = [P.brandBlue, P.brandOrange, "#e6d6b8", P.react, P.angular, "#5d6577", P.node, "#efe8dc", P.design];
    for (let s = 0; s <= shelves; s++) {
      const y = (s / shelves) * (h - 0.02);
      bx(b, "wood", color, 0, y, 0, w - 0.02, 0.02, d, { r: 0.004 });
      if (s === shelves) continue;
      let x = -w / 2 + 0.04;
      while (x < w / 2 - 0.1) {
        if (rnd() < 0.15) { x += 0.08 + rnd() * 0.1; continue; }
        const bw = 0.025 + rnd() * 0.03, bh = 0.18 + rnd() * 0.1;
        b.details(() => bx(b, "decor", bookCols[Math.floor(rnd() * bookCols.length)], x + bw / 2, y + 0.02, 0, bw, bh, 0.22 + rnd() * 0.06, { r: 0 }));
        x += bw + 0.004;
      }
    }
  });
}

export function whiteboard(b: GeometryBuilder, w: number, h: number, uv: UVRect, o: { stand?: boolean } = {}): void {
  b.measure("whiteboard", () => {
    const y0 = o.stand ? 0.85 : 0.95;
    bx(b, "plastic", "#d9dce1", 0, y0 - 0.03, 0.002, w + 0.03, h + 0.06, 0.026, { r: 0.008 });
    bx(b, "brushed", P.aluminium, 0, y0 - 0.03, -0.001, w + 0.06, h + 0.06, 0.024, { r: 0.012 });
    b.quad(0, y0 + h / 2, -0.017, w, h, { mat: "print", color: "#ffffff", uv });
    bx(b, "brushed", P.aluminium, 0, y0 - 0.06, -0.04, w * 0.5, 0.025, 0.06, { r: 0.008 });
    const markers = [P.brandBlue, P.angular, "#2b2d33", P.node];
    markers.forEach((c, i) => b.details(() => b.at(-w * 0.15 + i * 0.07, y0 - 0.025, -0.045, Math.PI / 2, () => b.cyl(0, -0.06, 0, 0.009, 0.009, 0.12, 8, { mat: "plastic", color: c }), 0, Math.PI / 2)));
    if (o.stand) {
      for (const s of [-1, 1]) {
        bx(b, "metal", P.darkMetal, s * (w / 2 + 0.02), 0.04, 0, 0.04, y0 + h, 0.04, { r: 0.01 });
        bx(b, "metal", P.darkMetal, s * (w / 2 + 0.02), 0, 0, 0.06, 0.04, 0.5, { r: 0.01 });
        for (const z of [-0.22, 0.22]) b.sphere(s * (w / 2 + 0.02), 0.025, z, 0.025, 0.025, 0.025, 5, { mat: "plastic", color: "#2b2d33" });
      }
    }
  });
}

/** Reception counter with a raised transaction ledge, logo front, and lower work surface behind. */
export function receptionDesk(b: GeometryBuilder, w: number, logo: UVRect): void {
  b.measure("receptionDesk", () => {
    const d = 0.8;
    // body (front faces −Z)
    slab(b, roundedRectOutline(w, d, 0.2, 8), 0, 0, 0, 1.05, { mat: "wood", color: "#f3ede2" });
    slab(b, roundedRectOutline(w + 0.08, 0.36, 0.14, 8), 0, 1.05, -d / 2 + 0.16, 0.04, { mat: "wood", color: P.deskOak });
    slab(b, roundedRectOutline(w - 0.2, d - 0.3, 0.12, 6), 0, 0.74, 0.12, 0.03, { mat: "wood", color: P.deskOak });
    // oak slat band on the front
    for (let i = 0; i < Math.floor(w / 0.09); i++) {
      const x = -w / 2 + 0.25 + i * 0.09;
      if (x > w / 2 - 0.25) break;
      bx(b, "wood", P.deskOak, x, 0.08, -d / 2 - 0.012, 0.05, 0.85, 0.02, { r: 0.006 });
    }
    // logo plaque
    b.quad(0, 0.62, -d / 2 - 0.03, 1.4, 0.35, { mat: "print", color: "#ffffff", uv: logo });
    bx(b, "light", "#ffe2b8", 0, 0.03, -d / 2 + 0.02, w - 0.3, 0.015, 0.02, { r: 0 });
    bx(b, "metal", P.darkMetal, 0, 0, 0, w - 0.1, 0.06, d - 0.1, { r: 0.004 });
  });
}

export function lockerBank(b: GeometryBuilder, cols: number, color: RGB = "#e7e2d8"): void {
  b.measure("lockers", () => {
    const cw = 0.4, h = 1.8, d = 0.45;
    for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * cw;
      bx(b, "metal", color, x, 0.05, 0, cw - 0.01, h, d, { r: 0.008 });
      for (let k = 0; k < 3; k++) {
        bx(b, "metal", "#f1eee8", x, 0.1 + k * 0.6, -d / 2 - 0.004, cw - 0.05, 0.55, 0.008, { r: 0.003 });
        bx(b, "brushed", P.aluminium, x + 0.12, 0.3 + k * 0.6, -d / 2 - 0.014, 0.03, 0.08, 0.012, { r: 0.004 });
      }
    }
  });
}

export function barStool(b: GeometryBuilder, color: RGB): void {
  b.cyl(0, 0, 0, 0.2, 0.2, 0.02, 18, { mat: "metal", color: P.darkMetal });
  b.cyl(0, 0.02, 0, 0.025, 0.025, 0.62, 10, { mat: "brushed", color: P.aluminium });
  b.lathe(0, 0.3, 0, [[0.16, 0], [0.165, 0.008], [0.16, 0.016]], 16, { mat: "brushed", color: P.aluminium });
  b.lathe(0, 0.64, 0, [[0, 0], [0.18, 0.0], [0.19, 0.04], [0.17, 0.07], [0, 0.075]], 18, { mat: "leather", color });
}

export function cafeTable(b: GeometryBuilder, r: number, top: RGB = "#f3efe8"): void {
  slab(b, circleOutline(r, 24), 0, 1.02, 0, 0.03, { mat: "wood", color: top });
  b.cyl(0, 0, 0, 0.22, 0.22, 0.02, 18, { mat: "metal", color: P.darkMetal });
  b.cyl(0, 0.02, 0, 0.03, 0.03, 1.0, 10, { mat: "metal", color: P.darkMetal });
}
