import { bx } from "../assets/prefabs/Shapes";
import { posterFrame } from "../assets/prefabs/Props";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { deptPersonas } from "./AngularSection";
import { bench, bigPlant, hangingSign, SectionArgs } from "./common";

/** Design: wider desks, large displays, drawing tablets and a mood board. */
export function buildDesign(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(5005);
  const p = deptPersonas("design", P.design, { width: 1.4, monitors: 2, portrait: false }, [["drawingTablet", "plant"], ["drawingTablet", "sticky", "bottle"], ["drawingTablet", "notebook"], ["drawingTablet", "succulent", "phone"]]);
  p.forEach((q) => { q.role = "Product Designer"; });
  b.measure("section:design", () => {
    bench(a, "design", 25.0, 19.75, p.slice(0, 2), p.slice(2, 4));
    hangingSign(a, 26.4, 19.75, 0, "Design", "design", P.design);
    // freestanding mood board
    b.at(31.6, y, 19.75, Math.PI / 2, () => {
      bx(b, "fabric", "#cdb9a0", 0, 0.3, 0, 2.2, 1.7, 0.05, { r: 0.02 });
      for (const s of [-1, 1]) bx(b, "metal", P.darkMetal, s * 1.08, 0, 0, 0.05, 2.0, 0.05, { r: 0.01 });
      for (const s of [-1, 1]) bx(b, "metal", P.darkMetal, s * 1.08, 0, 0, 0.07, 0.03, 0.5, { r: 0.01 });
      for (let i = 0; i < 4; i++) b.at(-0.78 + i * 0.52, 1.18, -0.03, 0, () => posterFrame(b, ctx.atlas.screen("design", i), 0.44, 0.28, "#ffffff"));
      for (let i = 0; i < 3; i++) b.at(-0.55 + i * 0.55, 0.78, -0.03, 0, () => posterFrame(b, ctx.atlas.poster(4 + i), 0.3, 0.4, "#ffffff"));
    });
    ctx.colliders.box(31.6, y, 19.75, 0.5, 2, 2.3);
    bigPlant(a, 33.3, 17.1, r, "palm");
    bigPlant(a, 22.7, 22.4, r, "bush");
  });
}
