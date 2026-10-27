import { bx } from "../assets/prefabs/Shapes";
import { deviceTablet, phone, monitor } from "../assets/prefabs/Props";
import { officeChair } from "../assets/prefabs/Furniture";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { deptPersonas } from "./AngularSection";
import { bench, bigPlant, hangingSign, SectionArgs } from "./common";

/** QA / Testing: six test stations and a device lab with a rack of phones and tablets. */
export function buildQA(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(6006);
  const p = deptPersonas("qa", P.qa, { monitors: 2 }, [["devices", "notebook"], ["devices", "sticky"], ["phone", "bottle", "sticky"], ["devices", "plant"], ["phone", "calendar"], ["devices", "headphones"]]);
  p.forEach((q) => { q.role = "QA Engineer"; });
  b.measure("section:qa", () => {
    bench(a, "qa", 37.4, 19.75, p.slice(0, 3), p.slice(3, 6));
    hangingSign(a, 39.2, 19.75, 0, "QA", "qa", P.qa);
    // device lab bench
    b.at(45.2, y, 19.75, -Math.PI / 2, () => {
      bx(b, "wood", "#f2ebdf", 0, 0.72, 0, 2.4, 0.03, 0.8, { r: 0.008 });
      for (const s of [-1, 1]) bx(b, "metal", P.frameGrey, s * 1.15, 0, 0, 0.05, 0.72, 0.72, { r: 0.01 });
      // tiered device stand
      for (let t = 0; t < 2; t++) {
        bx(b, "plastic", "#e9e8e4", 0, 0.75 + t * 0.12, 0.15 + t * 0.1, 2.0, 0.12, 0.12, { r: 0.01 });
        for (let i = 0; i < 9; i++) b.at(-0.88 + i * 0.22, 0.87 + t * 0.12, 0.12 + t * 0.1, 0, () => phone(b, ctx.atlas.phoneScreen(i + t)), -1.2);
      }
      b.at(-0.6, 0.75, -0.18, 0.2, () => deviceTablet(b, ctx.atlas.phoneScreen(3)));
      b.at(0.5, 0.75, -0.15, -0.1, () => deviceTablet(b, ctx.atlas.phoneScreen(0), "#d9d6cf"));
      b.at(0.0, 0.75, 0.32, 0, () => monitor(b, ctx.atlas.screen("qa", 1), { size: 0.55 }));
      b.at(0.2, 0, -0.75, 0.3, () => officeChair(b, "task", P.chairMesh, P.chairBlack));
    });
    ctx.colliders.box(45.2, y, 19.75, 0.85, 1.1, 2.45);
    bigPlant(a, 47.3, 22.4, r, "tree");
    bigPlant(a, 35.0, 17.1, r, "snake");
  });
}
