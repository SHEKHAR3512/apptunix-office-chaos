import { tvScreen } from "../assets/prefabs/Props";
import { storageCabinet } from "../assets/prefabs/Furniture";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { deptPersonas } from "./AngularSection";
import { bench, bigPlant, hangingSign, SectionArgs } from "./common";

/** DevOps: triple-monitor desks facing a wall of infrastructure dashboards (NOC wall). */
export function buildDevOps(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(4004);
  const p = deptPersonas("devops", P.devops, { monitors: 3, width: 1.6 }, [["headphones", "bottle"], ["notebook", "phone"], ["sticky", "plant"], ["penholder", "headphones"]]);
  b.measure("section:devops", () => {
    bench(a, "devops", 13.6, 19.75, p.slice(0, 2), p.slice(2, 4));
    hangingSign(a, 15.2, 19.75, 0, "DevOps", "devops", P.devops);
    // NOC wall on the HR partition
    bx(b, "wall", P.wallSlate, 10.1, y + 0.9, 19.75, 0.04, 2.0, 6.0, { r: 0.004 });
    [0, 1, 3].forEach((s, i) => b.at(10.16, y + 2.05, 17.75 + i * 2.0, -Math.PI / 2, () => tvScreen(b, ctx.atlas.screen("devops", s), 1.5)));
    b.at(10.35, y, 19.75, Math.PI / 2, () => storageCabinet(b, 3.6, "#3d4352", "#2b2d33", 0.7));
    ctx.colliders.add(10.0, y, 17.95, 10.6, y + 0.8, 21.55, "furniture");
    bigPlant(a, 21.3, 17.2, r, "snake");
  });
}
