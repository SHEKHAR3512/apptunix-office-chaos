import { Vector3 } from "@babylonjs/core";
import { meetingTable, storageCabinet, whiteboard } from "../assets/prefabs/Furniture";
import { bottle, floorPlant, laptop, notebook, pendantLamp, tvScreen } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { SectionArgs, seatsAround, tableSeats } from "./common";

/** CR1 — main conference room: 12-seat stadium table, presentation TV, whiteboard, feature wall. */
export function buildCR1(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(8101);
  const cx = 16.2, cz = 29.6;
  b.measure("section:cr1", () => {
    // acoustic feature wall behind the TV (west wall)
    bx(b, "fabric", "#3e4a66", 10.1, y, cz, 0.06, 3.0, 8.6, { r: 0.006 });
    for (let i = 0; i < 14; i++) bx(b, "wood", P.deskWalnut, 10.16, y, 25.6 + i * 0.6, 0.05, 3.0, 0.08, { r: 0.008 });
    b.at(10.2, y + 1.6, cz, -Math.PI / 2, () => tvScreen(b, ctx.atlas.slide(), 2.2));
    b.at(10.5, y, cz, -Math.PI / 2, () => storageCabinet(b, 2.6, "#2f3544", P.deskWalnut, 0.55));
    ctx.colliders.add(10.1, y, cz - 1.35, 10.75, y + 0.6, cz + 1.35, "furniture");
    // table and chairs
    b.at(cx, y, cz, 0, () => meetingTable(b, 5.2, 1.5, { shape: "stadium", top: P.deskOak }));
    ctx.colliders.box(cx, y, cz, 5.2, 0.8, 1.5);
    seatsAround(a, "cr1", cx, cz, [...tableSeats(4.2, 1.5, 5, false, 0.5), [3.15, 0, -Math.PI / 2]], "meeting", "#3a3f4d");
    // tabletop storytelling
    b.at(cx - 1.2, y + 0.755, cz - 0.35, 0.1, () => laptop(b, ctx.atlas.screen("react", 3)));
    b.at(cx + 0.8, y + 0.755, cz + 0.4, Math.PI - 0.2, () => laptop(b, ctx.atlas.screen("qa", 0), 1.8, "#2f323b"));
    b.at(cx + 0.2, y + 0.755, cz - 0.4, 0.3, () => notebook(b, P.brandNavy));
    for (let i = 0; i < 4; i++) b.at(cx - 1.8 + i * 1.2, y + 0.755, cz + (i % 2 ? 0.45 : -0.45), 0, () => bottle(b, "#bfe3f2", "#4fb3c8"));
    // conference speakerphone
    b.at(cx, y + 0.755, cz, 0, () => { b.lathe(0, 0, 0, [[0, 0], [0.14, 0], [0.13, 0.03], [0, 0.04]], 20, { mat: "plastic", color: "#2b2d33" }); b.cyl(0, 0.03, 0, 0.04, 0.04, 0.012, 12, { mat: "light", color: "#7fd1ff" }); });
    // whiteboard on the east wall
    b.at(21.9, y, cz, Math.PI / 2, () => whiteboard(b, 2.8, 1.25, ctx.atlas.whiteboard(0)));
    // pendant line over the table
    for (let i = -2; i <= 2; i++) b.at(cx + i * 1.0, y + 3.0, cz, 0, () => pendantLamp(b, 0.7, "#e9e1d3", "dome"));
    b.at(21.4, y, 33.4, 0, () => floorPlant(b, r, { kind: "tree", pot: "#3d4352" }));
    ctx.colliders.box(21.4, y, 33.4, 0.5, 1.2, 0.5);
    b.at(10.9, y, 33.4, 0, () => floorPlant(b, r, { kind: "bush", pot: "#3d4352" }));
    ctx.colliders.box(10.9, y, 33.4, 0.5, 1.2, 0.5);
  });
  ctx.anchors.add("cr1.presenter", "stand", new Vector3(11.3, y, cz + 1.6), Math.PI / 2, floor, "cr1");
  ctx.anchors.add("cr1.camera", "camera", new Vector3(21.0, y + 2.1, 26.0), -2.2, floor, "cr1");
}
