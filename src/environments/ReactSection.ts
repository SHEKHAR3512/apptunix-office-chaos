import { Vector3 } from "@babylonjs/core";
import type { DeskPersona } from "../assets/prefabs/DeskSetup";
import { bookshelf, storageCabinet, whiteboard, cafeTable, barStool } from "../assets/prefabs/Furniture";
import { dragonFigurine, floorPlant, posterFrame, succulent, mug } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { zone } from "../world/OfficeLayout";
import { bench, bigPlant, hangingSign, SectionArgs } from "./common";

const A = P.react;

/** The React team: 7 named workstations, DRAGON's hero desk, team wall and stand-up corner. */
export const REACT_PERSONAS: Record<string, DeskPersona> = {
  Tushar: { id: "react.tushar", name: "Tushar", role: "React · Team Lead", dept: "react", accent: A, monitors: 2, items: ["notebook", "phone", "calendar", "penholder"], mugColor: "#ffffff", padColor: "#2f3544" },
  Mohit: { id: "react.mohit", name: "Mohit", role: "React Developer", dept: "react", accent: A, monitors: 1, items: ["headphones", "bottle", "sticky", "succulent"], mugColor: P.brandOrange },
  Arpit: { id: "react.arpit", name: "Arpit", role: "React Developer", dept: "react", accent: A, monitors: 2, items: ["laptop", "plant", "phone"], mugColor: "#2b2d33", bottleColor: P.node },
  Vibhu: { id: "react.vibhu", name: "Vibhu", role: "React Developer", dept: "react", accent: A, monitors: 1, items: ["notebook", "sticky", "snack", "headphones"], mugColor: P.brandBlue },
  Rockey: { id: "react.rockey", name: "Rockey", role: "React Developer", dept: "react", accent: A, monitors: 2, portrait: true, items: ["lamp", "bottle", "books"], mugColor: "#e9d8b8" },
  Karan: { id: "react.karan", name: "Karan", role: "React Developer", dept: "react", accent: A, monitors: 1, items: ["plant", "phone", "calendar", "sticky"], mugColor: "#d9675e" },
  DRAGON: {
    id: "react.dragon", name: "DRAGON", role: "React Developer", dept: "react", accent: A, monitors: 2, hero: true, width: 1.6,
    items: ["figurine", "headphones", "plant", "sticky", "bottle"], mugColor: P.brandOrange, bottleColor: "#6fbf73", chair: "#2f3a52",
    screenScreens: [0, 3],
  },
};

export function buildReact(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const z = zone("react").rect;
  const r = rng(1919);
  const T = REACT_PERSONAS;
  b.measure("section:react", () => {
    // Bench 1 (window side): Tushar, Mohit face north; Arpit, Vibhu face south
    bench(a, "react", 21.4, 4.4, [T.Tushar, T.Mohit], [T.Arpit, T.Vibhu]);
    // Bench 2 (corridor side): Rockey, Karan face north; DRAGON faces south — visible from the corridor
    bench(a, "react", 21.4, 9.0, [T.Rockey, T.Karan], [T.DRAGON]);
    // DRAGON's side return: low credenza with personal shelf items
    b.at(23.4, y, 9.42, 0, () => storageCabinet(b, 0.8, "#e9e4da", P.deskOak, 0.74));
    b.at(23.2, y + 0.74, 9.45, 0.4, () => dragonFigurine(b));
    b.at(23.6, y + 0.74, 9.35, 0, () => succulent(b, r));
    b.at(23.45, y + 0.74, 9.6, 0, () => { bx(b, "decor", P.brandNavy, 0, 0, 0, 0.18, 0.24, 0.02, { r: 0.004 }); }, -0.2);
    ctx.colliders.box(23.4, y, 9.42, 0.82, 0.8, 0.47);
    // a dragon poster pinned on DRAGON's partition (facing DRAGON)
    b.at(21.85, y + 0.95, 9.0 - 0.0, Math.PI, () => b.quad(0, 0, -0.05, 0.2, 0.27, { mat: "print", color: "#ffffff", uv: ctx.atlas.poster(0) }));

    // hanging signage, visible from the corridor and from the reception
    hangingSign(a, 22.6, 6.7, 0, "React", "react", A);

    // team wall (back of the reception logo wall): posters + React roadmap
    b.at(18.09, y, 6.0, -Math.PI / 2, () => whiteboard(b, 2.4, 1.2, ctx.atlas.whiteboard(1)));
    b.at(18.09, y + 1.6, 2.2, -Math.PI / 2, () => posterFrame(b, ctx.atlas.poster(1), 0.6, 0.8));
    b.at(18.09, y + 1.6, 9.8, -Math.PI / 2, () => posterFrame(b, ctx.atlas.poster(3), 0.6, 0.8));
    // React accent stripe along the team wall
    bx(b, "wall", A, 18.08, y + 0.1, 6.0, 0.02, 0.06, 11.8, { r: 0 });

    // stand-up corner: high table + stools by the window
    b.at(28.2, y, 2.0, 0, () => cafeTable(b, 0.45));
    for (const [sx, sz] of [[-0.7, 0], [0.7, 0], [0, -0.7]]) b.at(28.2 + sx, y, 2.0 + sz, 0, () => barStool(b, P.chairBlack));
    b.at(28.1, y + 1.05, 1.9, 0.5, () => mug(b, "#ffffff"));
    a.ctx.colliders.box(28.2, y, 2.0, 1.9, 1.05, 1.6);
    // bookshelf with React / JS books
    b.at(29.6, y, 9.5, -Math.PI / 2, () => bookshelf(b, 1.6, 1.6, r));
    ctx.colliders.add(29.4, y, 8.7, 29.8, y + 1.6, 10.3, "furniture");
    // plants
    bigPlant(a, 19.0, 0.9, r, "tree");
    bigPlant(a, 29.2, 12.7, r, "bush");
    b.at(26.4, y, 12.6, 0, () => floorPlant(b, r, { kind: "snake", pot: "#e9e1d3" }));
    ctx.colliders.box(26.4, y, 12.6, 0.45, 1.0, 0.45);
  });
  void z;
  ctx.anchors.add("react.standup", "interact", new Vector3(28.2, y, 2.0), 0, a.floor, "react");
  ctx.anchors.add("react.whiteboard", "interact", new Vector3(18.8, y, 6.0), -Math.PI / 2, a.floor, "react");
}
