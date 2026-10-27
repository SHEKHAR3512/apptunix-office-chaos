import { whiteboard } from "../assets/prefabs/Furniture";
import { printer } from "../assets/prefabs/Props";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { deptPersonas } from "./AngularSection";
import { bench, bigPlant, dividerZ, hangingSign, SectionArgs } from "./common";

/** Node.js: backend team — terminals, API diagrams, the floor's shared printer. */
export function buildNode(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(3003);
  const p = deptPersonas("node", P.node, {}, [["notebook", "bottle"], ["headphones", "phone"], ["laptop", "sticky"], ["penholder", "plant"], ["bottle", "calendar"], ["headphones", "snack"]]);
  p.forEach((q, i) => { q.monitors = i % 2 === 0 ? 2 : 1; });
  b.measure("section:node", () => {
    bench(a, "node", 41.7, 3.6, p.slice(0, 3), p.slice(3, 6));
    bench(a, "node", 41.7, 8.6, p.slice(6, 9), p.slice(9, 12));
    dividerZ(a, 39.0, 1.0, 4.6, r, P.node);
    dividerZ(a, 39.0, 7.6, 12.0, r, P.angular);
    hangingSign(a, 43.5, 6.1, 0, "Node.js", "node", P.node);
    b.at(46.6, y, 11.6, 0.64, () => whiteboard(b, 1.6, 1.0, ctx.atlas.whiteboard(0), { stand: true }));
    ctx.colliders.box(46.6, y, 11.6, 1.3, 2, 1.1);
    b.at(46.9, y, 1.2, Math.PI / 2, () => printer(b));
    ctx.colliders.box(46.9, y, 1.2, 0.55, 0.6, 0.6);
    bigPlant(a, 40.4, 12.9, r, "bush");
    bigPlant(a, 47.3, 6.1, r, "tree");
  });
}
