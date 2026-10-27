import { rng } from "../assets/TextureAtlas";
import { bx } from "../assets/prefabs/Shapes";
import { floorPlant } from "../assets/prefabs/Props";
import { P } from "../rendering/Palette";
import { wall } from "./Architecture";
import { buildCore, framedPoster, lobbyBench } from "./Core";
import type { Lift } from "./Lift";
import { BUILDING, floorY } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

const TENANTS: Record<number, string> = { 1: "Suite 101", 2: "Suite 201", 4: "Suite 401", 5: "Available" };

/** Floors 1, 2, 4, 5: simplified lift lobby with a closed tenant entrance (expandable later). */
export function buildUpperFloor(ctx: WorldContext, lift: Lift, L: number): void {
  const y = floorY(L);
  const b = ctx.builder();
  const r = rng(L * 11);
  const accent = [P.sofaTeal, P.sofaMustard, P.sofaRust, P.brandBlue, P.design, P.node][L];
  b.measure(`upperFloor`, () => {
    buildCore(b, ctx, lift, L, { lobbyWall: "#e3dacb" });
    // tenant wall with frosted glass entrance (locked in Phase 1)
    wall(b, ctx, y, 10, 0, 10, 14, { color: "#e3dacb", openings: [{ from: 5.3, to: 7.3, top: 2.4 }] });
    wall(b, ctx, y, 0, 14, 10, 14, { color: "#e3dacb" });
    bx(b, "metal", P.darkMetal, 10, y, 6.3, 0.12, 2.4, 2.0, { r: 0.01 });
    bx(b, "glass", "#ffffff", 9.93, y + 0.08, 6.3, 0.012, 2.28, 1.9, { r: 0 });
    bx(b, "plastic", "#f2f4f6", 9.92, y + 0.5, 6.3, 0.006, 1.4, 1.86, { r: 0 });
    ctx.colliders.add(9.85, y, 5.3, 10.1, y + 2.4, 7.3, "wall");
    b.at(9.92, y + 2.62, 6.3, Math.PI / 2, () => b.quad(0, 0, 0, 1.2, 0.3, { mat: "print", color: "#ffffff", uv: ctx.atlas.tenantSign(TENANTS[L] ?? "Suite") }));
    // feature wall colour band and a bench
    bx(b, "wall", accent, 9.9, y + 0.09, 2.6, 0.04, 1.2, 4.2, { r: 0.004 });
    b.at(8.9, y, 2.6, -Math.PI / 2, () => lobbyBench(b, accent));
    ctx.colliders.box(8.9, y, 2.6, 0.5, 0.5, 1.7);
    framedPoster(b, ctx, L, 9.92, y + 2.0, 11.5, Math.PI / 2, 1);
    b.at(9.3, y, 12.9, 0, () => floorPlant(b, r, { kind: "tree", pot: "#3d4352" }));
    ctx.colliders.box(9.3, y, 12.9, 0.5, 1.2, 0.5);
  });
  void BUILDING;
  ctx.commit(b, `floor${L}`);
}
