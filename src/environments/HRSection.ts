import { Vector3 } from "@babylonjs/core";
import type { DeskPersona } from "../assets/prefabs/DeskSetup";
import { deskSetup } from "../assets/prefabs/DeskSetup";
import { bookshelf, officeChair, storageCabinet, lockerBank } from "../assets/prefabs/Furniture";
import { posterFrame } from "../assets/prefabs/Props";
import { bx } from "../assets/prefabs/Shapes";
import { rng } from "../assets/TextureAtlas";
import { P } from "../rendering/Palette";
import { bigPlant, SectionArgs } from "./common";

/** HR: glass-fronted cabin with an HR lead desk, two HR desks, visitor chairs and filing. */
export function buildHR(a: SectionArgs): void {
  const { b, ctx, y, floor } = a;
  const r = rng(7007);
  const hr = (id: string, name: string, role: string, extra: Partial<DeskPersona> = {}): DeskPersona => ({ id, name, role, dept: "hr", accent: P.hr, items: ["notebook", "phone", "plant"], partition: undefined, ...extra } as DeskPersona);
  b.measure("section:hr", () => {
    // HR lead desk facing the door, with two visitor chairs
    deskSetup(b, ctx, hr("hr.lead", "HR Lead", "People & Culture", { width: 1.6, monitors: 1, items: ["calendar", "penholder", "plant", "notebook"] }), 5.0, y, 21.5, Math.PI, floor, "hr", {});
    for (const x of [4.5, 5.5]) b.at(x, y, 20.45, 0.15 * (x - 5), () => officeChair(b, "visitor", P.sofaMustard, P.chairBlack));
    ctx.anchors.add("hr.visitor.0", "seat", new Vector3(4.5, y, 20.45), 0, floor, "hr");
    ctx.anchors.add("hr.visitor.1", "seat", new Vector3(5.5, y, 20.45), 0, floor, "hr");
    ctx.colliders.box(5.0, y, 20.45, 1.6, 0.9, 0.5);
    // two HR executive desks along the west wall
    deskSetup(b, ctx, hr("hr.exec1", "HR Executive", "Recruitment", { items: ["phone", "sticky", "bottle"] }), 0.5, y, 17.9, -Math.PI / 2, floor, "hr");
    deskSetup(b, ctx, hr("hr.exec2", "HR Executive", "Onboarding", { items: ["calendar", "notebook"] }), 0.5, y, 19.3, -Math.PI / 2, floor, "hr");
    // filing + lockers + culture board on the north wall
    b.at(8.4, y, 22.65, Math.PI, () => storageCabinet(b, 1.8, "#e9e2d6", P.deskOak, 1.1));
    ctx.colliders.add(7.5, y, 22.4, 9.3, y + 1.1, 22.95, "furniture");
    b.at(1.5, y, 22.65, 0, () => lockerBank(b, 3));
    ctx.colliders.add(0.85, y, 22.4, 2.15, y + 1.9, 22.95, "furniture");
    b.at(5.0, y + 1.9, 22.9, 0, () => posterFrame(b, ctx.atlas.hrBoard(), 1.6, 0.8, P.deskOak));
    b.at(9.75, y, 18.6, Math.PI / 2, () => bookshelf(b, 1.4, 1.5, r));
    ctx.colliders.add(9.6, y, 17.9, 9.95, y + 1.5, 19.3, "furniture");
    bx(b, "wall", P.hr, 5.0, y + 0.1, 22.92, 9.6, 0.05, 0.02, { r: 0 });
    bigPlant(a, 3.3, 22.4, r, "bush");
    bigPlant(a, 9.4, 17.1, r, "snake");
  });
}
