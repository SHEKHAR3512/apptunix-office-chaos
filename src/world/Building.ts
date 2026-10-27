import { Vector3 } from "@babylonjs/core";
import type { GeometryBuilder } from "../assets/GeometryBuilder";
import { rng } from "../assets/TextureAtlas";
import { bx } from "../assets/prefabs/Shapes";
import { floorPlant } from "../assets/prefabs/Props";
import { P } from "../rendering/Palette";
import { ceiling, floorPlate, windowUnit } from "./Architecture";
import { Door } from "./Doors";
import { BUILDING, CORE, floorY, rect } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

const W = BUILDING.width, D = BUILDING.depth, FH = BUILDING.floorHeight;
const OUT = 0.3; // exterior wall thickness (outside the interior rect)
const CLAD = "#e9e1d4", CLAD_DARK = "#8f95a3", BAND = "#4f5a70";

export const ENTRANCE = { x: 8.2, width: 2.4 };

/** Facade, slabs and roof for all six storeys (always visible). */
export function buildShell(ctx: WorldContext): void {
  ctx.currentFloor = "shell";
  const b = ctx.builder();
  b.measure("buildingShell", () => {
    for (let L = 0; L < BUILDING.floors.length; L++) {
      const y = floorY(L);
      // structural slab with a dark edge band (reads as floor lines on the facade)
      if (L > 0) {
        slabWithHole(b, y);
        bx(b, "wall", BAND, W / 2, y - 0.3, -OUT - 0.02, W + OUT * 2 + 0.06, 0.36, 0.06, { r: 0.01 });
        bx(b, "wall", BAND, W / 2, y - 0.3, D + OUT + 0.02, W + OUT * 2 + 0.06, 0.36, 0.06, { r: 0.01 });
        bx(b, "wall", BAND, W + OUT + 0.02, y - 0.3, D / 2, 0.06, 0.36, D + OUT * 2 + 0.06, { r: 0.01 });
        bx(b, "wall", BAND, -OUT - 0.02, y - 0.3, D / 2, 0.06, 0.36, D + OUT * 2 + 0.06, { r: 0.01 });
      }
      facadeSide(b, ctx, L, "south");
      facadeSide(b, ctx, L, "north");
      facadeSide(b, ctx, L, "east");
      facadeSide(b, ctx, L, "west");
      // generic interior so upper floors look occupied from outside
      if (L !== 0 && L !== 3) {
        floorPlate(b, y, rect(10, 0, W, D), "floorCarpet", "#6e7280");
        ceiling(b, ctx, y, rect(10, 0, W, D), { lights: true, spacingX: 4.8, spacingZ: 4.8 });
      }
    }
    // roof
    const ry = floorY(BUILDING.floors.length);
    bx(b, "wall", "#c9c2b6", W / 2, ry - 0.3, D / 2, W + OUT * 2, 0.3, D + OUT * 2, { r: 0 });
    for (const [x, z, w, d] of [[W / 2, -OUT, W + OUT * 2, 0.25], [W / 2, D + OUT, W + OUT * 2, 0.25], [-OUT, D / 2, 0.25, D + OUT * 2], [W + OUT, D / 2, 0.25, D + OUT * 2]] as const)
      bx(b, "wall", CLAD, x, ry, z, w, 1.1, d, { r: 0.02 });
    bx(b, "wall", BAND, W / 2, ry + 1.05, -OUT, W + OUT * 2 + 0.1, 0.12, 0.32, { r: 0.02 });
    // lift machine room + water tanks (silhouette interest against the sky)
    bx(b, "wall", CLAD, 2.2, ry, 6.3, 4.4, 3.0, 4.2, { r: 0.04 });
    bx(b, "wall", BAND, 2.2, ry + 3.0, 6.3, 4.6, 0.15, 4.4, { r: 0.02 });
    for (const [x, z] of [[8, 4], [10.6, 4]]) {
      b.cyl(x, ry + 3.0, z, 1.0, 1.0, 1.5, 20, { mat: "plastic", color: "#3d4352" });
      b.cyl(x, ry, z, 0.08, 0.08, 3.0, 8, { mat: "metal", color: P.darkMetal });
    }
    bx(b, "metal", P.darkMetal, 9.3, ry + 2.9, 4, 4.2, 0.1, 1.4, { r: 0 });
    for (let i = 0; i < 4; i++) {
      bx(b, "metal", "#cfcfcb", 20 + i * 2.2, ry, 28, 1.6, 1.1, 0.9, { r: 0.04 });
      b.cyl(20 + i * 2.2, ry + 1.1, 28, 0.45, 0.45, 0.02, 18, { mat: "metal", color: "#3a3d48" });
    }
    // APPTUNIX facade sign at the 3rd floor head band, south elevation
    const sy = floorY(3) + 2.95;
    bx(b, "metal", BAND, 20.5, sy - 0.05, -OUT - 0.18, 6.4, 1.3, 0.2, { r: 0.04 });
    b.quad(20.5, sy + 0.6, -OUT - 0.285, 6.2, 1.55, { mat: "print", color: "#ffffff", uv: ctx.atlas.logoPanel(true) });
    bx(b, "light", "#fff1d6", 20.5, sy - 0.12, -OUT - 0.24, 6.0, 0.03, 0.04, { r: 0 });
  });
  ctx.commit(b, "shell");
}

function slabWithHole(b: GeometryBuilder, y: number): void {
  const S = CORE.liftShaft;
  // slab split around the lift shaft
  bx(b, "wall", "#b9b4ab", W / 2 + S.x1 / 2, y - 0.3, D / 2, W - S.x1, 0.24, D, { r: 0 });
  bx(b, "wall", "#b9b4ab", S.x1 / 2, y - 0.3, S.z0 / 2, S.x1, 0.24, S.z0, { r: 0 });
  bx(b, "wall", "#b9b4ab", S.x1 / 2, y - 0.3, (S.z1 + D) / 2, S.x1, 0.24, D - S.z1, { r: 0 });
}

type Side = "south" | "north" | "east" | "west";

/** One storey of one elevation: cladding, pilasters, ribbon windows, interior skin, colliders. */
function facadeSide(b: GeometryBuilder, ctx: WorldContext, L: number, side: Side): void {
  const y = floorY(L);
  const alongX = side === "south" || side === "north";
  const len = alongX ? W : D;
  const outSign = side === "south" || side === "west" ? -1 : 1;
  const fixedInner = side === "south" ? 0 : side === "north" ? D : side === "east" ? W : 0;
  const outer = fixedInner + outSign * OUT * 0.5;
  const r = rng(L * 31 + side.length);

  // window bays between pilasters
  const bay = 6;
  const bays: [number, number][] = [];
  for (let s = 0; s < len - 0.01; s += bay) bays.push([s + 0.45, Math.min(len, s + bay) - 0.45]);
  const ground = L === 0;
  let sill = ground ? 0.25 : 0.85, head = ground ? 3.2 : 2.75;
  const openings: [number, number, number, number][] = [];
  for (const [s0, s1] of bays) {
    // the core (west) and the lift shaft region get no windows
    if (side === "west") { if (s0 > 14 && s1 < D) openings.push([s0 + 1.2, s1 - 1.2, 0.95, 2.5]); continue; }
    if (side === "south" && ground && s0 < 3) continue;
    openings.push([s0, s1, sill, head]);
  }
  if (side === "south" && ground) { sill = 0.25; head = 3.2; }

  const box = (s: number, yb: number, l: number, h: number, offset: number, depth: number, color: string, mat: "wall" | "metal" = "wall") => {
    if (alongX) b.box(s, y + yb, fixedInner + offset, l, h, depth, { mat, color, r: 0.012 });
    else b.box(fixedInner + offset, y + yb, s, depth, h, l, { mat, color, r: 0.012 });
  };
  const solid = (s0: number, s1: number, yb: number, yt: number) => {
    if (s1 - s0 < 0.01 || yt - yb < 0.01) return;
    const m = (s0 + s1) / 2, l = s1 - s0;
    box(m, yb, l + (s0 < 0.01 || s1 > len - 0.01 ? OUT : 0), yt - yb, outSign * OUT * 0.6, OUT * 0.8, CLAD);
    box(m, yb, l, yt - yb, outSign * 0.06, 0.12, L === 3 || L === 0 ? P.wallCream : "#e4dccf");
    if (yb < 1.8) {
      const a = alongX ? [s0, fixedInner + Math.min(0, outSign * OUT), s1, fixedInner + Math.max(0, outSign * OUT)] : [fixedInner + Math.min(0, outSign * OUT), s0, fixedInner + Math.max(0, outSign * OUT), s1];
      ctx.colliders.add(a[0], y + yb, a[1], a[2], y + yt, a[3], "wall");
    }
  };

  let cursor = 0;
  for (const [s0, s1, sl, hd] of openings) {
    solid(cursor, s0, 0, FH - 0.3);
    // entrance gap on the ground floor south face
    const isEntranceBay = side === "south" && ground && ENTRANCE.x > s0 && ENTRANCE.x < s1;
    const e0 = ENTRANCE.x - ENTRANCE.width / 2 - 0.1, e1 = ENTRANCE.x + ENTRANCE.width / 2 + 0.1;
    if (isEntranceBay) { solid(s0, e0, 0, sl); solid(e1, s1, 0, sl); }
    else solid(s0, s1, 0, sl);
    solid(s0, s1, hd, FH - 0.3);
    if (isEntranceBay) {
      if (e0 - s0 > 0.2) windowUnit(b, y, alongX, s0, e0, outer, sl, hd, { inwardSign: -outSign, glass: "glass" });
      if (s1 - e1 > 0.2) windowUnit(b, y, alongX, e1, s1, outer, sl, hd, { inwardSign: -outSign, glass: "glass" });
      // transom above the entrance
      bx(b, "metal", P.darkMetal, ENTRANCE.x, y + 2.3, outer, e1 - e0, 0.08, 0.14, { r: 0.008 });
      bx(b, "glass", "#ffffff", ENTRANCE.x, y + 2.38, outer, e1 - e0, hd - 2.4, 0.012, { r: 0 });
      ctx.colliders.add(s0, y, outer - 0.1, e0, y + 3, outer + 0.1, "glass");
      ctx.colliders.add(e1, y, outer - 0.1, s1, y + 3, outer + 0.1, "glass");
    } else {
      const blinds = L === 3 || L === 0 ? (r() < 0.6 ? 0.15 + r() * 0.35 : 0) : 0.3 + r() * 0.5;
      windowUnit(b, y, alongX, s0, s1, outer, sl, hd, { blinds: ground && side === "south" ? 0 : blinds, inwardSign: -outSign, glass: ground && side === "south" ? "glass" : undefined });
      if (alongX) ctx.colliders.add(s0, y, outer - 0.1, s1, y + FH, outer + 0.1, "glass");
      else ctx.colliders.add(outer - 0.1, y, s0, outer + 0.1, y + FH, s1, "glass");
    }
    cursor = s1;
  }
  solid(cursor, len, 0, FH - 0.3);
  // pilasters proud of the facade
  for (let s = 0; s <= len + 0.01; s += bay) {
    const sx = Math.min(len, s);
    if (side === "west" && sx > 0.1 && sx < 14) continue;
    box(sx, 0, 0.6, FH - 0.3, outSign * (OUT + 0.05), 0.12, CLAD_DARK);
  }
}

/** Street, pavement, landscaping and neighbouring buildings (exterior root). */
export function buildExterior(ctx: WorldContext): Door {
  ctx.currentFloor = "ext";
  const b = ctx.builder();
  const r = rng(7);
  b.measure("exterior", () => {
    // ground planes
    bx(b, "pavement", P.asphalt, W / 2, -0.12, -14, 160, 0.1, 12, { r: 0 });
    bx(b, "pavement", P.pavement, W / 2, -0.05, -4.2, 160, 0.05, 8.4, { r: 0 });
    bx(b, "pavement", "#c9bfae", W / 2, -0.07, -20.5, 160, 0.08, 1 + 2, { r: 0 });
    bx(b, "floorStone", "#d4ccc0", W / 2, -0.02, -0.5 - OUT, W + 4, 0.02, 1.0, { r: 0 });
    // curb + road markings
    bx(b, "wall", "#cfc8bc", W / 2, -0.12, -8.4, 160, 0.2, 0.25, { r: 0.02 });
    for (let x = -60; x < 110; x += 5) bx(b, "decor", "#efe9dc", x, -0.065, -14, 2.4, 0.01, 0.16, { r: 0 });
    // landscape strips beside the entrance
    for (const [x0, x1] of [[-6, 3.6], [9.6, 30], [34, 54]]) {
      const cx = (x0 + x1) / 2;
      bx(b, "wall", "#cfc8bc", cx, 0, -2.6, x1 - x0, 0.35, 1.2, { r: 0.03 });
      bx(b, "foliage", P.grass, cx, 0.34, -2.6, x1 - x0 - 0.15, 0.06, 1.05, { r: 0.02 });
      ctx.colliders.add(x0, 0, -3.2, x1, 0.9, -2.0, "furniture");
      for (let x = x0 + 0.6; x < x1 - 0.5; x += 0.9 + r() * 0.6) {
        b.sphere(x, 0.48, -2.6 + (r() - 0.5) * 0.5, 0.28 + r() * 0.15, 0.22 + r() * 0.12, 0.28, 7, { mat: "foliage", color: r() < 0.5 ? P.leaf1 : P.leaf3 });
      }
    }
    // street trees
    for (const x of [-8, 2, 14, 26, 38, 50, 62]) tree(b, x, -6.6, r);
    // entrance canopy with the building name
    const cx = ENTRANCE.x;
    bx(b, "wall", BAND, cx, 3.35, -1.7, 5.4, 0.28, 3.0, { r: 0.04 });
    bx(b, "light", "#fff2d8", cx, 3.33, -1.7, 4.6, 0.02, 2.4, { r: 0 });
    for (const sx of [-2.4, 2.4]) {
      b.cyl(cx + sx, 0, -2.9, 0.09, 0.09, 3.36, 12, { mat: "metal", color: P.darkMetal });
      ctx.colliders.box(cx + sx, 0, -2.9, 0.2, 3.3, 0.2, "wall");
    }
    b.quad(cx, 3.49, -3.21, 2.2, 0.55, { mat: "print", color: "#ffffff", uv: ctx.atlas.buildingSign() });
    // entrance mat
    bx(b, "fabric", "#4a4e5c", cx, -0.0, -1.2, 3.0, 0.012, 1.6, { r: 0.02 });
    // street lamps
    for (const x of [-4, 10, 24, 40]) {
      b.cyl(x, 0, -8.0, 0.08, 0.06, 5.2, 10, { mat: "metal", color: P.darkMetal });
      b.tube([new Vector3(x, 5.1, -8), new Vector3(x, 5.5, -8.6), new Vector3(x, 5.4, -9.4)], 0.05, 6, { mat: "metal", color: P.darkMetal });
      bx(b, "metal", P.darkMetal, x, 5.25, -9.5, 0.3, 0.12, 0.6, { r: 0.04 });
      bx(b, "light", "#fff2d8", x, 5.24, -9.5, 0.24, 0.01, 0.5, { r: 0 });
      ctx.colliders.box(x, 0, -8, 0.2, 5, 0.2, "furniture");
    }
    // parked scooters and a car — everyday Mohali street life
    for (const [x, c] of [[12.5, "#d9675e"], [13.4, "#4f8fd1"], [14.3, "#f3ede3"], [16.2, "#2b2d33"]] as const) scooter(b, x, -4.4, c as string);
    car(b, 30, -10.3, "#e8e4da");
    car(b, -12, -15.8, P.brandBlue, Math.PI);
    ctx.colliders.box(14, 0, -4.4, 5, 1.2, 1.6, "furniture");
    ctx.colliders.box(30, 0, -10.3, 4.3, 1.5, 1.9, "furniture");
    // neighbouring buildings
    neighbour(b, -18, -1, 22, 14, 18, "#cdbfae", r);
    neighbour(b, 66, -1, 24, 18, 26, "#c4cbd1", r);
    neighbour(b, 20, -42, 70, 12, 20, "#d7c6ae", r, true);
    neighbour(b, 24, 45, 60, 18, 30, "#c8c0b4", r);
  });
  ctx.commit(b, "exterior");
  // the street-facing auto doors
  const door = new Door(ctx, { id: "buildingEntrance", x: ENTRANCE.x, y: 0, z: -OUT * 0.5, axis: "x", width: ENTRANCE.width, type: "slide", glass: true, floor: "ext" });
  // keep the player on the street side of the world bounds
  ctx.colliders.add(-30, 0, -9, 90, 2, -8.3, "wall");
  ctx.colliders.add(-30, 0, -9, -6.5, 2, 0, "wall");
  ctx.colliders.add(54.5, 0, -9, 60, 2, 0, "wall");
  ctx.anchors.add("spawn.street", "spawn", new Vector3(ENTRANCE.x, 0, -6.2), 0, 0, "street");
  return door;
}

function tree(b: GeometryBuilder, x: number, z: number, r: () => number): void {
  b.measure("streetTree", () => {
    b.cyl(x, 0, z, 0.55, 0.55, 0.12, 14, { mat: "wall", color: "#cfc8bc" });
    b.tube([new Vector3(x, 0, z), new Vector3(x + 0.1, 1.8, z), new Vector3(x - 0.1, 3.0, z + 0.1)], 0.13, 8, { mat: "wood", color: "#7d5e45" });
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = r() * 1.2;
      const s = 0.9 + r() * 0.7;
      b.sphere(x + Math.cos(a) * d, 3.2 + r() * 1.5, z + Math.sin(a) * d, s, s * 0.8, s, 8, { mat: "foliage", color: [P.leaf1, P.leaf2, P.leaf3][i % 3] });
    }
  });
}

function scooter(b: GeometryBuilder, x: number, z: number, color: string): void {
  b.measure("scooter", () => b.at(x, 0, z, 0.1, () => {
    for (const zz of [-0.55, 0.55]) b.at(0, 0.22, zz, 0, () => b.cyl(0, -0.05, 0, 0.22, 0.22, 0.1, 16, { mat: "plastic", color: "#25262c" }), 0, Math.PI / 2);
    bx(b, "plastic", color, 0, 0.3, 0.15, 0.36, 0.38, 0.7, { r: 0.12, seg: 2 });
    bx(b, "leather", "#2b2d33", 0, 0.68, 0.18, 0.3, 0.1, 0.62, { r: 0.05, seg: 2 });
    bx(b, "plastic", color, 0, 0.25, -0.45, 0.3, 0.75, 0.16, { r: 0.07, seg: 2 });
    b.tube([new Vector3(0, 0.95, -0.5), new Vector3(0, 1.05, -0.55)], 0.03, 6, { mat: "metal", color: P.darkMetal });
    b.tube([new Vector3(-0.32, 1.06, -0.55), new Vector3(0.32, 1.06, -0.55)], 0.018, 6, { mat: "metal", color: P.darkMetal });
    b.sphere(0, 0.9, -0.62, 0.08, 0.07, 0.04, 6, { mat: "light", color: "#fff6dc" });
  }));
}

function car(b: GeometryBuilder, x: number, z: number, color: string, yaw = 0): void {
  b.measure("car", () => b.at(x, 0, z, yaw + Math.PI / 2, () => {
    bx(b, "metal", color, 0, 0.28, 0, 1.75, 0.55, 4.1, { r: 0.2, seg: 2 });
    bx(b, "metal", color, 0, 0.8, 0.15, 1.6, 0.55, 2.2, { r: 0.22, seg: 2 });
    bx(b, "glass", "#ffffff", 0, 0.86, 0.15, 1.62, 0.42, 2.0, { r: 0.12 });
    for (const [wx, wz] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) b.at(wx, 0.32, wz, 0, () => b.cyl(0, -0.12, 0, 0.32, 0.32, 0.24, 16, { mat: "plastic", color: "#25262c" }), 0, Math.PI / 2);
    for (const s of [-0.6, 0.6]) {
      bx(b, "light", "#fff4d8", s, 0.55, -2.04, 0.36, 0.12, 0.04, { r: 0.03 });
      bx(b, "light", "#ff6b5a", s, 0.6, 2.04, 0.32, 0.1, 0.04, { r: 0.03 });
    }
  }));
}

function neighbour(b: GeometryBuilder, cx: number, z0: number, w: number, d: number, h: number, color: string, r: () => number, facingNorth = false): void {
  b.measure("neighbourBuilding", () => {
    const z = facingNorth ? z0 : z0 + d / 2;
    bx(b, "wall", color, cx, 0, z, w, h, d, { r: 0.08 });
    bx(b, "wall", "#7a7f8c", cx, h, z, w + 0.3, 0.4, d + 0.3, { r: 0.04 });
    const face = facingNorth ? z + d / 2 + 0.02 : z - d / 2 - 0.02;
    for (let fy = 1.2; fy < h - 1.5; fy += 3.6) for (let fx = cx - w / 2 + 1.5; fx < cx + w / 2 - 1.5; fx += 3) {
      const lit = r() < 0.25;
      bx(b, lit ? "light" : "glassExterior", lit ? "#ffe3b0" : "#ffffff", fx + 0.6, fy, face, 1.6, 1.8, 0.05, { r: 0 });
      bx(b, "wall", "#6b707c", fx + 0.6, fy - 0.1, face, 1.8, 0.1, 0.12, { r: 0.01 });
    }
  });
}

export function lobbyPlanters(b: GeometryBuilder, positions: [number, number][], y: number, seed: number): void {
  const r = rng(seed);
  for (const [x, z] of positions) b.at(x, y, z, r() * 6, () => floorPlant(b, r, { kind: r() < 0.5 ? "tree" : "bush", scale: 1.1, pot: "#3d4352" }));
}
