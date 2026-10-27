import { Vector3 } from "@babylonjs/core";
import { barStool, bookshelf, cafeTable, coffeeTable, cushion, officeChair, sofa } from "../assets/prefabs/Furniture";
import {
  acCassette, coffeeMachine, exitSign, fireExtinguisher, fridge, microwave, mug, posterFrame, serverRack, snackBowl,
  trashBin, waterDispenser, wallClock,
} from "../assets/prefabs/Props";
import { bx, circleOutline, slab } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { animatedClock } from "../rendering/EnvironmentEffects";
import { P } from "../rendering/Palette";
import { bigPlant, SectionArgs, seatsAround, circleSeats } from "./common";

/** Break / water-dispenser area: pantry counter, appliances, café tables, notice board. */
export function buildBreak(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(9001);
  b.measure("section:break", () => {
    // pantry counter along the west wall (base cabinets, worktop, sink, splashback)
    const z0 = 25.6, z1 = 31.4, len = z1 - z0, mz = (z0 + z1) / 2;
    bx(b, "wood", "#e9e3d8", 0.42, y + 0.1, mz, 0.62, 0.78, len, { r: 0.01 });
    bx(b, "metal", P.darkMetal, 0.45, y, mz, 0.56, 0.1, len - 0.04, { r: 0 });
    for (let i = 0; i < 8; i++) {
      bx(b, "wood", "#f3efe8", 0.735, y + 0.13, z0 + (len / 8) * (i + 0.5), 0.006, 0.72, len / 8 - 0.012, { r: 0.002 });
      bx(b, "brushed", P.aluminium, 0.745, y + 0.72, z0 + (len / 8) * (i + 0.5) + (i % 2 ? -0.25 : 0.25), 0.012, 0.012, 0.14, { r: 0.005 });
    }
    bx(b, "wood", "#3f4452", 0.4, y + 0.88, mz, 0.68, 0.04, len + 0.02, { r: 0.008 });
    bx(b, "wall", "#cfe0dc", 0.08, y + 0.92, mz, 0.03, 0.7, len, { r: 0.002 });
    for (let k = 0; k < 18; k++) bx(b, "wall", "#b8d0cb", 0.1, y + 0.92, z0 + 0.16 + k * 0.32, 0.004, 0.7, 0.01, { r: 0 });
    // wall cabinets
    bx(b, "wood", "#f1ece3", 0.2, y + 1.75, mz, 0.36, 0.7, len, { r: 0.01 });
    bx(b, "light", "#fff1d6", 0.36, y + 1.73, mz, 0.04, 0.015, len - 0.2, { r: 0 });
    // sink + tap
    bx(b, "brushed", "#b9c0c8", 0.42, y + 0.86, 27.0, 0.45, 0.04, 0.6, { r: 0.02 });
    b.tube([new Vector3(0.16, y + 0.92, 27.0), new Vector3(0.16, y + 1.18, 27.0), new Vector3(0.36, y + 1.2, 27.0), new Vector3(0.4, y + 1.1, 27.0)], 0.014, 8, { mat: "brushed", color: P.aluminium });
    b.at(0.42, y + 0.92, 28.4, -Math.PI / 2, () => coffeeMachine(b));
    b.at(0.45, y + 0.92, 29.9, -Math.PI / 2, () => microwave(b));
    b.at(0.45, y + 0.92, 30.9, 0, () => snackBowl(b, r));
    for (let i = 0; i < 4; i++) b.at(0.55 + (i % 2) * 0.12, y + 0.92, 28.95 + Math.floor(i / 2) * 0.12, i, () => mug(b, ["#ffffff", P.brandOrange, P.brandBlue, "#e9d8b8"][i], false));
    ctx.colliders.add(0, y, z0, 0.8, y + 1.0, z1, "furniture");
    b.at(0.45, y, 32.3, -Math.PI / 2, () => fridge(b));
    ctx.colliders.add(0.1, y, 31.95, 0.8, y + 1.8, 32.65, "furniture");
    // the water dispenser — a key landmark of the floor
    b.at(0.4, y, 33.35, -Math.PI / 2 + 0.3, () => waterDispenser(b));
    ctx.colliders.box(0.4, y, 33.35, 0.45, 1.4, 0.45);
    ctx.anchors.add("break.waterDispenser", "interact", new Vector3(1.05, y, 33.2), -Math.PI / 2, floor, "break");
    ctx.anchors.add("break.coffee", "interact", new Vector3(1.1, y, 28.4), -Math.PI / 2, floor, "break");
    b.at(1.0, y, 31.5, 0, () => trashBin(b));
    // café tables
    slab(b, circleOutline(2.6, 32), 5.6, y, 29.6, 0.012, { mat: "floorWood", color: "#c69a68" });
    b.at(4.4, y, 28.6, 0, () => cafeTableLow(b));
    seatsAround(a, "break.t1", 4.4, 28.6, circleSeats(3, 0.72, 0.4), "visitor", P.sofaMustard);
    b.at(6.9, y, 30.6, 0, () => cafeTableLow(b));
    seatsAround(a, "break.t2", 6.9, 30.6, circleSeats(3, 0.72, 1.2), "visitor", P.sofaTeal);
    ctx.colliders.box(4.4, y, 28.6, 0.8, 0.8, 0.8);
    ctx.colliders.box(6.9, y, 30.6, 0.8, 0.8, 0.8);
    // high bar by the window
    bx(b, "wood", P.deskOak, 5.0, y + 1.02, 33.55, 6.5, 0.04, 0.45, { r: 0.01 });
    for (const x of [2.0, 8.0]) bx(b, "metal", P.darkMetal, x, y, 33.55, 0.05, 1.02, 0.4, { r: 0.008 });
    for (let i = 0; i < 5; i++) b.at(2.8 + i * 1.1, y, 33.0, 0, () => barStool(b, [P.sofaRust, P.sofaTeal, P.sofaMustard][i % 3]));
    ctx.colliders.add(1.7, y, 33.25, 8.3, y + 1.1, 33.8, "furniture");
    // notice board + clock on the east wall (x=10)
    b.at(9.92, y + 1.6, 28.0, Math.PI / 2, () => posterFrame(b, ctx.atlas.noticeBoard(), 1.5, 1.0, P.deskOak));
    b.at(9.92, y + 2.45, 30.6, Math.PI / 2, () => wallClock(b, ctx.atlas.clock()));
    b.at(9.92, y + 1.7, 32.4, Math.PI / 2, () => posterFrame(b, ctx.atlas.poster(6), 0.5, 0.66));
    bigPlant(a, 9.4, 25.6, r, "tree");
    // coffee icon sign
    b.at(5.0, y + 2.42, 26.0, 0, () => { bx(b, "plastic", P.brandNavy, 0, -0.2, 0, 1.44, 0.41, 0.04, { r: 0.03 }); b.quad(0, 0, -0.021, 1.4, 0.394, { mat: "print", color: "#ffffff", uv: ctx.atlas.sign("Break Area", "coffee", P.sofaMustard) }); for (const s of [-0.55, 0.55]) b.cyl(s, 0.2, 0, 0.003, 0.003, 0.4, 4, { mat: "metal", color: "#6b707c" }); });
  });
  animatedClock(ctx, 9.87, y + 2.45, 30.6, Math.PI / 2);
}

function cafeTableLow(b: ReturnType<SectionArgs["ctx"]["builder"]>): void {
  slab(b, circleOutline(0.42, 24), 0, 0.72, 0, 0.03, { mat: "wood", color: "#f3efe8" });
  b.cyl(0, 0, 0, 0.25, 0.25, 0.02, 18, { mat: "metal", color: P.darkMetal });
  b.cyl(0, 0.02, 0, 0.03, 0.03, 0.7, 10, { mat: "metal", color: P.darkMetal });
}

/** DevOps server room: racks with blinking status panels, cable tray, precision AC. */
export function buildServer(a: SectionArgs): void {
  const { b, ctx, y } = a;
  b.measure("section:server", () => {
    for (let i = 0; i < 3; i++) {
      b.at(37.0 + i * 0.75, y, 31.8, 0, () => serverRack(b, ctx.atlas.serverPanel()));
    }
    ctx.colliders.add(36.6, y, 31.3, 39.2, y + 2.1, 32.3, "furniture");
    bx(b, "metal", "#6b707c", 38.0, y + 2.4, 31.8, 2.6, 0.06, 0.4, { r: 0 });
    for (let i = 0; i < 6; i++) b.tube([new Vector3(36.9 + i * 0.4, y + 2.42, 31.8), new Vector3(36.9 + i * 0.4, y + 2.1, 31.6)], 0.015, 5, { mat: "plastic", color: ["#4fb3c8", "#e3a548", "#2b2d33"][i % 3], caps: false });
    bx(b, "metal", "#e9e8e4", 40.4, y, 33.3, 0.9, 1.9, 0.6, { r: 0.03 });
    for (let k = 0; k < 8; k++) bx(b, "metal", "#cfcdc8", 40.4, y + 1.2 + k * 0.08, 33.0, 0.8, 0.02, 0.01, { r: 0 });
    ctx.colliders.box(40.4, y, 33.3, 0.95, 2, 0.65);
    bx(b, "plastic", "#2b2d33", 40.6, y, 26.0, 0.6, 0.02, 0.6, { r: 0 });
    b.at(36.25, y, 26.0, -Math.PI / 2, () => fireExtinguisher(b));
  });
}

/** Lounge: soft seating, bookshelf, a phone booth and bean bags. */
export function buildLounge(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(9100);
  b.measure("section:lounge", () => {
    slab(b, circleOutline(2.2, 32), 44.6, y, 30.0, 0.012, { mat: "floorCarpet", color: "#9c6c5a" });
    b.at(44.6, y, 31.8, Math.PI, () => sofa(b, 2.4, P.sofaTeal));
    cushion(b, 43.8, y + 0.48, 32.15, P.sofaMustard, Math.PI + 0.1);
    b.at(44.6, y, 29.9, 0, () => coffeeTable(b, 0.5, P.deskWalnut));
    for (const [x, z, c] of [[43.0, 28.4, P.sofaRust], [46.1, 28.5, P.sofaMustard]] as const) {
      b.sphere(x, y + 0.25, z, 0.42, 0.3, 0.42, 10, { mat: "fabric", color: c });
      b.sphere(x, y + 0.42, z + 0.18, 0.32, 0.25, 0.22, 8, { mat: "fabric", color: c });
      ctx.colliders.box(x, y, z, 0.8, 0.6, 0.8);
    }
    ctx.colliders.box(44.6, y, 31.8, 2.4, 0.8, 0.9);
    ctx.colliders.box(44.6, y, 29.9, 1.0, 0.45, 1.0);
    b.at(41.4, y, 30.0, -Math.PI / 2, () => bookshelf(b, 2.4, 2.0, r));
    ctx.colliders.add(41.1, y, 28.8, 41.6, y + 2.0, 31.2, "furniture");
    // phone booth pod
    b.at(47.0, y, 26.4, Math.PI / 2, () => {
      bx(b, "wood", "#e7dfd2", 0, 0, 0, 1.1, 2.3, 1.1, { r: 0.04 });
      bx(b, "glass", "#ffffff", 0, 0.1, -0.56, 0.9, 2.0, 0.02, { r: 0 });
      bx(b, "fabric", P.sofaTeal, 0, 0.45, 0.2, 0.8, 0.12, 0.4, { r: 0.03 });
      bx(b, "light", "#fff1d6", 0, 2.25, 0, 0.6, 0.02, 0.6, { r: 0 });
      bx(b, "wood", P.deskOak, 0, 0.95, 0.4, 0.8, 0.03, 0.3, { r: 0.008 });
    });
    ctx.colliders.box(47.0, y, 26.4, 1.15, 2.3, 1.15);
    bigPlant(a, 47.4, 33.4, r, "palm");
    bigPlant(a, 41.8, 33.4, r, "tree");
  });
}

/** Corridor dressing: AC cassettes, exit signage, extinguishers, plants, art. */
export function buildCorridors(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(9200);
  b.measure("section:corridors", () => {
    for (const [x, z] of [[14, 15.25], [26, 15.25], [38, 15.25], [20, 24], [34, 24], [5, 24], [24, 7], [43, 7], [16, 20], [41, 20], [34.5, 7]]) {
      b.at(x, y + 3.0, z, 0, () => acCassette(b));
    }
    b.at(47.85, y + 2.45, 15.25, Math.PI / 2, () => exitSign(b, ctx.atlas.exitSign()));
    b.at(0.15, y + 2.45, 24.0, -Math.PI / 2, () => exitSign(b, ctx.atlas.exitSign()));
    b.at(47.82, y, 16.1, Math.PI / 2, () => fireExtinguisher(b));
    ctx.colliders.box(47.7, y, 16.1, 0.3, 0.8, 0.3);
    bigPlant(a, 47.3, 14.6, r, "bush");
    bigPlant(a, 0.8, 15.9, r, "palm");
    // art along the HR glass is not possible; put framed posters on the CR solid walls facing the corridor
    for (const [x, i] of [[36.6, 3], [40.4, 4]] as const) b.at(x, y + 1.6, 24.92, 0, () => posterFrame(b, ctx.atlas.poster(i), 0.56, 0.75));
    // a reception-facing team photo wall on the lobby side of the corridor wall
    b.at(6.5, y + 1.65, 14.08, Math.PI, () => posterFrame(b, ctx.atlas.hrBoard(), 1.8, 0.9, P.deskOak));
    b.at(2.0, y, 15.0, 0, () => officeChair(b, "visitor", P.sofaRust, P.chairBlack));
  });
  ctx.colliders.box(2.0, y, 15.0, 0.5, 0.9, 0.5);
  void cafeTable;
}
