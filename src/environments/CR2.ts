import { Vector3 } from "@babylonjs/core";
import { meetingTable, storageCabinet } from "../assets/prefabs/Furniture";
import { deskPlant, laptop, mug, posterFrame, tvScreen } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { bigPlant, SectionArgs, seatsAround, tableSeats } from "./common";

/** CR2 — client/video-call room: 6-seat rounded table facing a video-conference display. */
export function buildCR2(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(8202);
  const cx = 26.0, cz = 30.0;
  b.measure("section:cr2", () => {
    // warm terracotta accent wall with the display
    bx(b, "wall", P.wallTerracotta, 29.9, y, cz, 0.06, 3.0, 8.8, { r: 0.006 });
    b.at(29.84, y + 1.55, cz, Math.PI / 2, () => tvScreen(b, ctx.atlas.videoCall(), 1.9));
    // camera bar on top of the screen
    bx(b, "plastic", "#2b2d33", 29.8, y + 2.1, cz, 0.08, 0.06, 0.7, { r: 0.02 });
    b.at(29.55, y, cz, Math.PI / 2, () => storageCabinet(b, 2.0, "#f1ebe1", P.deskOak, 0.6));
    ctx.colliders.add(29.3, y, cz - 1.05, 29.95, y + 0.7, cz + 1.05, "furniture");
    b.at(cx - 0.3, y, cz, Math.PI / 2, () => meetingTable(b, 2.8, 1.2, { shape: "rounded", top: "#e9e1d3", base: P.frameWhite }));
    ctx.colliders.box(cx - 0.3, y, cz, 1.2, 0.8, 2.8);
    seatsAround(a, "cr2", cx - 0.3, cz, tableSeats(2.8, 1.2, 3, false, 0.5).map(([x, z, yaw]) => [z, -x, yaw + Math.PI / 2] as [number, number, number]), "visitor", P.sofaTeal);
    b.at(cx - 0.5, y + 0.755, cz - 0.6, Math.PI / 2 + 0.2, () => laptop(b, ctx.atlas.screen("angular", 3)));
    b.at(cx - 0.1, y + 0.755, cz + 0.5, 0, () => mug(b, P.brandOrange));
    b.at(cx - 0.3, y + 0.755, cz + 0.1, 0, () => deskPlant(b, r, "#efe8dc"));
    b.at(22.15, y + 1.7, 28.0, -Math.PI / 2, () => posterFrame(b, ctx.atlas.poster(5), 0.6, 0.8));
    b.at(22.15, y + 1.7, 31.5, -Math.PI / 2, () => posterFrame(b, ctx.atlas.poster(6), 0.6, 0.8));
    bigPlant(a, 22.7, 33.4, r, "palm");
  });
  ctx.anchors.add("cr2.screen", "interact", new Vector3(29.2, y, cz), -Math.PI / 2, floor, "cr2");
}
