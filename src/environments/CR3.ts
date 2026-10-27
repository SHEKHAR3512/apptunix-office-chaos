import { Vector3 } from "@babylonjs/core";
import { bookshelf, meetingTable, sofa, whiteboard } from "../assets/prefabs/Furniture";
import { deskLamp, floorPlant, mug, notebook } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { circleSeats, SectionArgs, seatsAround } from "./common";

/** CR3 — team-leader room: round table with 4 executive chairs, retro whiteboard, reading nook. */
export function buildCR3(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(8303);
  const cx = 33.0, cz = 28.6;
  b.measure("section:cr3", () => {
    bx(b, "wall", P.wallSage, 35.9, y, 29.5, 0.06, 3.0, 8.8, { r: 0.006 });
    b.at(35.86, y, 28.6, Math.PI / 2, () => whiteboard(b, 2.2, 1.2, ctx.atlas.whiteboard(2)));
    b.at(cx, y, cz, 0, () => meetingTable(b, 1.4, 1.4, { shape: "round", top: P.deskWalnut }));
    ctx.colliders.box(cx, y, cz, 1.3, 0.8, 1.3);
    seatsAround(a, "cr3", cx, cz, circleSeats(4, 1.05, Math.PI / 4), "exec", "#4b3a30");
    b.at(cx + 0.2, y + 0.755, cz - 0.1, 0.4, () => notebook(b, P.brandOrange));
    b.at(cx - 0.3, y + 0.755, cz + 0.2, 0, () => mug(b, "#ffffff"));
    // reading nook by the window: compact sofa + shelf + lamp
    b.at(32.4, y, 33.3, Math.PI, () => sofa(b, 1.7, P.sofaMustard, { seats: 2 }));
    ctx.colliders.box(32.4, y, 33.3, 1.7, 0.8, 0.9);
    b.at(30.35, y, 31.6, -Math.PI / 2, () => bookshelf(b, 1.4, 1.8, r));
    ctx.colliders.add(30.1, y, 30.9, 30.6, y + 1.8, 32.3, "furniture");
    b.at(30.4, y + 1.8, 31.2, 0, () => deskLamp(b, P.brandNavy));
    b.at(35.4, y, 33.4, 0, () => floorPlant(b, r, { kind: "palm", pot: "#3d4352" }));
    ctx.colliders.box(35.4, y, 33.4, 0.5, 1.2, 0.5);
  });
  ctx.anchors.add("cr3.whiteboard", "interact", new Vector3(35.2, y, 28.6), Math.PI / 2, floor, "cr3");
}
