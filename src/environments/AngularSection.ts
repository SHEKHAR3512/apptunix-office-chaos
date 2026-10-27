import type { DeskPersona } from "../assets/prefabs/DeskSetup";
import { whiteboard } from "../assets/prefabs/Furniture";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { DEPT_SEATS } from "../world/OfficeLayout";
import { bench, bigPlant, dividerZ, hangingSign, SectionArgs } from "./common";

const ITEMS: DeskPersona["items"][] = [["notebook", "phone"], ["headphones", "bottle", "sticky"], ["plant", "calendar"], ["laptop", "penholder"], ["sticky", "snack", "phone"], ["succulent", "notebook"]];

export function deptPersonas(dept: keyof typeof DEPT_SEATS, accent: string, extra: Partial<DeskPersona> = {}, items = ITEMS): DeskPersona[] {
  return DEPT_SEATS[dept].map((name, i) => ({
    id: `${dept}.${i + 1}`, name, role: `${name.split(" ")[0]} Developer`, dept, accent, items: items[i % items.length],
    monitors: (i % 3 === 1 ? 2 : 1) as 1 | 2, ...extra,
  }));
}

/** Angular: six workstations, sprint board, divider cabinets towards React. */
export function buildAngular(a: SectionArgs): void {
  const { b, ctx, y } = a;
  const r = rng(2002);
  const p = deptPersonas("angular", P.angular);
  b.measure("section:angular", () => {
    bench(a, "angular", 32.7, 3.6, p.slice(0, 3), p.slice(3, 6));
    bench(a, "angular", 32.7, 8.6, p.slice(6, 9), p.slice(9, 12));
    dividerZ(a, 30.0, 1.0, 4.6, r, P.angular);
    dividerZ(a, 30.0, 7.6, 12.0, r, P.react);
    hangingSign(a, 34.5, 6.1, 0, "Angular", "angular", P.angular);
    b.at(37.9, y, 12.4, Math.PI / 2 - 0.3, () => whiteboard(b, 1.6, 1.0, ctx.atlas.whiteboard(2), { stand: true }));
    ctx.colliders.box(37.9, y, 12.4, 0.9, 2, 1.0);
    bigPlant(a, 38.4, 1.0, r, "palm");
  });
}
