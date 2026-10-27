import { Vector3 } from "@babylonjs/core";
import { bookshelf, coffeeTable, cushion, officeChair, receptionDesk, sofa } from "../assets/prefabs/Furniture";
import { floorPlant, monitor, mug, notebook, pendantLamp, phone, wallClock } from "../assets/prefabs/Props";
import { bx, circleOutline, slab } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { animatedClock } from "../rendering/EnvironmentEffects";
import { P } from "../rendering/Palette";
import { bigPlant, SectionArgs } from "./common";

/** Apptunix entrance: glass doors, reception counter, logo wall, waiting lounge, awards shelf. */
export function buildReception(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(1010);
  b.measure("section:reception", () => {
    // logo feature wall (west face of the x=18 wall): navy panel, oak frame, backlit logo
    bx(b, "wall", P.brandNavy, 17.9, y, 6.0, 0.06, 3.0, 8.0, { r: 0.006 });
    for (const z of [1.95, 10.05]) bx(b, "wood", P.deskOak, 17.86, y, z, 0.08, 3.0, 0.1, { r: 0.01 });
    b.at(17.85, y + 1.95, 6.0, Math.PI / 2, () => b.quad(0, 0, 0, 4.0, 1.0, { mat: "print", color: "#ffffff", uv: ctx.atlas.logoPanel(false) }));
    b.at(17.85, y + 1.2, 6.0, Math.PI / 2, () => b.quad(0, 0, 0, 3.2, 0.48, { mat: "print", color: "#ffffff", uv: ctx.atlas.tagline() }));
    bx(b, "light", "#ffdcb0", 17.84, y + 2.55, 6.0, 0.02, 0.03, 4.4, { r: 0 });
    // reception counter facing the entrance
    b.at(13.6, y, 6.3, Math.PI / 2, () => receptionDesk(b, 3.2, ctx.atlas.logoPanel(false)));
    ctx.colliders.box(13.75, y, 6.3, 1.0, 1.1, 3.4);
    b.at(13.8, y + 0.77, 5.6, Math.PI / 2 + Math.PI + 0.25, () => monitor(b, ctx.atlas.screen("hr", 0), { size: 0.5 }));
    b.at(13.8, y + 0.77, 6.9, -0.3, () => notebook(b, P.brandOrange));
    b.at(13.75, y + 0.77, 7.4, 0.5, () => phone(b, ctx.atlas.phoneScreen(2)));
    b.at(13.3, y + 1.09, 5.2, 0, () => mug(b, "#ffffff"));
    b.at(13.3, y + 1.09, 7.6, 0, () => { b.lathe(0, 0, 0, [[0, 0], [0.06, 0], [0.07, 0.16], [0, 0.16]], 14, { mat: "glass", color: "#ffffff" }); for (let i = 0; i < 3; i++) b.sphere((i - 1) * 0.03, 0.22, 0, 0.04, 0.05, 0.04, 6, { mat: "foliage", color: [P.angular, P.devops, "#f3c3d0"][i] }); });
    b.at(14.75, y, 6.0, -Math.PI / 2 + 0.2, () => officeChair(b, "task", P.chairBlack, P.chairBlack));
    ctx.anchors.add("reception.desk.chair", "chair", new Vector3(14.75, y, 6.0), -Math.PI / 2, floor, "reception");
    ctx.anchors.add("reception.visitor", "stand", new Vector3(12.6, y, 6.3), Math.PI / 2, floor, "reception");
    for (const z of [5.3, 6.3, 7.3]) b.at(13.9, y + 3.0, z, 0, () => pendantLamp(b, 0.85, P.brandOrange, "cone"));
    // waiting lounge by the window
    slab(b, circleOutline(1.7, 32), 13.8, y, 2.2, 0.012, { mat: "floorCarpet", color: "#8b8fa0" });
    b.at(13.8, y, 0.95, 0, () => sofa(b, 2.4, P.sofaRust));
    cushion(b, 13.0, y + 0.48, 0.65, P.sofaMustard, 0.15);
    cushion(b, 14.6, y + 0.48, 0.65, P.sofaTeal, -0.1);
    b.at(13.8, y, 2.4, 0, () => coffeeTable(b, 0.42));
    b.at(13.7, y + 0.435, 2.4, 0.3, () => { bx(b, "decor", P.brandNavy, 0, 0, 0, 0.21, 0.012, 0.28, { r: 0.004 }); bx(b, "decor", "#f1e7d6", -0.05, 0.012, 0.04, 0.21, 0.01, 0.28, { r: 0.004 }); });
    for (const [x, z, yaw] of [[11.6, 2.2, Math.PI / 2], [16.0, 2.2, -Math.PI / 2]] as const) b.at(x, y, z, yaw, () => officeChair(b, "visitor", P.sofaTeal, P.chairBlack));
    ctx.colliders.box(13.8, y, 0.95, 2.4, 0.8, 0.9);
    ctx.colliders.box(13.8, y, 2.4, 0.9, 0.45, 0.9);
    ctx.colliders.box(11.6, y, 2.2, 0.5, 0.9, 0.5);
    ctx.colliders.box(16.0, y, 2.2, 0.5, 0.9, 0.5);
    // awards shelf on the glass-side wall
    b.at(10.35, y, 11.5, -Math.PI / 2, () => {
      bookshelf(b, 2.0, 1.2, r, "#efe8dc");
      for (let i = 0; i < 4; i++) {
        const x = -0.75 + i * 0.5;
        b.lathe(x, 1.22, 0, [[0, 0], [0.06, 0], [0.06, 0.04], [0.015, 0.06], [0.015, 0.14], [0.06, 0.24], [0.05, 0.3], [0, 0.3]], 14, { mat: "metal", color: i % 2 ? "#e2b04a" : "#c9ccd2" });
      }
    });
    ctx.colliders.add(10.1, y, 10.45, 10.6, y + 1.6, 12.55, "furniture");
    b.at(17.82, y + 2.5, 11.6, Math.PI / 2, () => wallClock(b, ctx.atlas.clock()));
    bigPlant(a, 17.2, 0.8, r, "tree");
    bigPlant(a, 10.7, 13.2, r, "palm");
    b.at(10.8, y, 0.8, 0, () => floorPlant(b, r, { kind: "snake", pot: P.brandNavy }));
    ctx.colliders.box(10.8, y, 0.8, 0.45, 1, 0.45);
  });
  animatedClock(ctx, 17.78, y + 2.5, 11.6, Math.PI / 2);
}
