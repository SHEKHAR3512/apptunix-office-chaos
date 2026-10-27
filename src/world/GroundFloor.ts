import { Vector3 } from "@babylonjs/core";
import { rng } from "../assets/TextureAtlas";
import { bx, circleOutline, slab } from "../assets/prefabs/Shapes";
import { coffeeTable, officeChair, receptionDesk, sofa, cushion } from "../assets/prefabs/Furniture";
import { floorPlant, monitor, mug, pendantLamp, posterFrame, wallClock } from "../assets/prefabs/Props";
import { animatedClock } from "../rendering/EnvironmentEffects";
import { P } from "../rendering/Palette";
import { ceiling, floorPlate, wall } from "./Architecture";
import { buildCore, framedPoster } from "./Core";
import type { Door } from "./Doors";
import type { Lift } from "./Lift";
import { floorY, rect } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

/** Ground floor: building lobby with security desk, directory, waiting area and lift. */
export function buildGroundFloor(ctx: WorldContext, lift: Lift, L: number): Door[] {
  const y = floorY(L);
  const b = ctx.builder();
  const r = rng(404);
  b.measure("groundLobby", () => {
    buildCore(b, ctx, lift, L, { lobbyFloor: "#d9d0c2", lobbyWall: "#eadfce" });
    floorPlate(b, y, rect(10, 0, 18, 14), "floorStone", "#d9d0c2");
    ceiling(b, ctx, y, rect(10, 0, 18, 14), { spacingX: 2.6, spacingZ: 2.6, height: 3.0 });
    // round rug under the waiting area
    slab(b, circleOutline(1.9, 32), 14.6, y, 4.2, 0.012, { mat: "floorCarpet", color: "#b4705a" });
    slab(b, circleOutline(1.6, 32), 14.6, y + 0.001, 4.2, 0.012, { mat: "floorCarpet", color: "#c98468" });

    // walls
    wall(b, ctx, y, 3.2, 14, 18, 14, { color: "#eadfce" });
    wall(b, ctx, y, 18, 0, 18, 14, { color: "#eadfce", openings: [{ from: 8.5, to: 11.5, top: 2.6 }] });
    // feature wall behind the security desk: navy with oak slats
    bx(b, "wall", P.wallNavy, 14, y, 13.86, 6.0, 3.0, 0.06, { r: 0.006 });
    for (let i = 0; i < 26; i++) bx(b, "wood", P.deskOak, 11.25 + i * 0.22, y, 13.8, 0.07, 3.0, 0.05, { r: 0.008 });
    b.quad(14, y + 2.1, 13.77, 3.0, 0.75, { mat: "print", color: "#ffffff", uv: ctx.atlas.buildingSign() });

    // tenant shutter (Unit G-2) on the east wall
    for (let i = 0; i < 22; i++) bx(b, "brushed", "#a9afb8", 17.96, y + 0.05 + i * 0.115, 10, 0.05, 0.1, 3.0, { r: 0.01 });
    bx(b, "metal", P.darkMetal, 17.96, y + 2.55, 10, 0.2, 0.25, 3.2, { r: 0.02 });
    b.at(17.85, y + 2.95, 10, Math.PI / 2, () => b.quad(0, 0, 0, 1.3, 0.32, { mat: "print", color: "#ffffff", uv: ctx.atlas.tenantSign("Unit G-2") }));
    ctx.colliders.add(17.85, y, 8.5, 18.1, y + 2.6, 11.5, "wall");

    // security / concierge desk
    b.at(14, y, 11.2, 0, () => receptionDesk(b, 3.0, ctx.atlas.logoPanel(false)));
    ctx.colliders.box(14, y, 11.35, 3.2, 1.1, 1.0);
    b.at(14.5, y + 0.77, 11.55, Math.PI + 0.3, () => monitor(b, ctx.atlas.screen("default", 1), { size: 0.5 }));
    b.at(13.3, y + 0.77, 11.45, 0, () => mug(b, P.brandOrange));
    b.at(14.2, y, 12.4, Math.PI + 0.2, () => officeChair(b, "task", P.chairBlack, P.chairBlack));
    ctx.anchors.add("lobby.security.chair", "chair", new Vector3(14.2, y, 12.4), Math.PI, 0, "lobby");
    for (const x of [12.8, 14, 15.2]) b.at(x, y + 3.0, 11.3, 0, () => pendantLamp(b, 0.9, "#2b2d33", "dome"));

    // building directory near the lift
    b.at(6.2, y + 1.55, 13.92, 0, () => posterFrame(b, ctx.atlas.directory(), 1.0, 1.17, "#1f2a44"));

    // waiting area
    b.at(14.6, y, 2.4, 0, () => sofa(b, 2.2, P.sofaTeal));
    b.at(14.6, y, 6.1, Math.PI, () => sofa(b, 2.2, P.sofaMustard));
    cushion(b, 13.9, y + 0.48, 2.05, P.sofaMustard, 0.1);
    cushion(b, 15.4, y + 0.48, 6.45, P.sofaTeal, Math.PI - 0.1);
    b.at(14.6, y, 4.25, 0, () => coffeeTable(b, 0.45));
    b.at(14.5, y + 0.435, 4.2, 0.4, () => { bx(b, "decor", P.brandBlue, 0, 0, 0, 0.22, 0.015, 0.3, { r: 0.004 }); bx(b, "decor", "#efe8dc", 0.04, 0.015, 0.03, 0.22, 0.012, 0.3, { r: 0.004 }); });
    b.at(14.8, y + 0.435, 4.35, 0, () => floorPlantMini(b, r));
    ctx.colliders.box(14.6, y, 2.4, 2.2, 0.8, 0.9);
    ctx.colliders.box(14.6, y, 6.1, 2.2, 0.8, 0.9);
    ctx.colliders.box(14.6, y, 4.25, 0.9, 0.45, 0.9);

    // planters
    for (const [x, z, kind] of [[17.3, 0.8, "tree"], [10.8, 13.3, "palm"], [17.3, 13.3, "bush"], [10.6, 0.7, "snake"]] as const) {
      b.at(x, y, z, r() * 6, () => floorPlant(b, r, { kind, pot: "#3d4352", scale: 1.15 }));
      ctx.colliders.box(x, y, z, 0.55, 1.2, 0.55);
    }
    // mailboxes on the core wall
    b.at(3.32, y + 1.0, 4.0, -Math.PI / 2, () => {
      for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) {
        bx(b, "metal", "#bfc4cb", -0.45 + k * 0.3, i * 0.24, 0, 0.28, 0.22, 0.25, { r: 0.008 });
        bx(b, "metal", "#2b2d33", -0.45 + k * 0.3, i * 0.24 + 0.15, -0.126, 0.14, 0.015, 0.004, { r: 0 });
      }
    });
    ctx.colliders.add(3.2, y, 3.4, 3.6, y + 1.8, 4.6, "furniture");
    // A-frame sign guiding visitors to the 3rd floor
    b.at(5.6, y, 9.4, -2.2, () => {
      b.at(0, 0, 0, 0, () => bx(b, "wood", "#2b3248", 0, 0, -0.12, 0.6, 0.95, 0.03, { r: 0.01 }), 0.18);
      b.at(0, 0, 0, 0, () => bx(b, "wood", "#2b3248", 0, 0, 0.12, 0.6, 0.95, 0.03, { r: 0.01 }), -0.18);
      b.at(0, 0.62, -0.165, 0, () => b.quad(0, 0, -0.02, 0.5, 0.125, { mat: "print", color: "#ffffff", uv: ctx.atlas.logoPanel(false) }), 0.18);
      b.at(0, 0.3, -0.12, 0, () => b.quad(0, 0, -0.02, 0.32, 0.32, { mat: "print", color: "#ffffff", uv: ctx.atlas.floorNumber("3") }), 0.18);
    });
    ctx.colliders.box(5.6, y, 9.4, 0.7, 1, 0.7);
    framedPoster(b, ctx, 2, 17.92, y + 1.7, 4.2, Math.PI / 2, 1.1);
    b.at(17.92, y + 2.3, 6.8, Math.PI / 2, () => wallClock(b, ctx.atlas.clock()));
  });
  ctx.commit(b, `floor${L}`);
  animatedClock(ctx, 17.87, y + 2.3, 6.8, Math.PI / 2);
  return [];
}

function floorPlantMini(b: ReturnType<WorldContext["builder"]>, r: () => number): void {
  b.lathe(0, 0, 0, [[0, 0], [0.05, 0], [0.06, 0.1], [0, 0.1]], 14, { mat: "decor", color: "#efe8dc" });
  for (let i = 0; i < 4; i++) b.sphere((r() - 0.5) * 0.05, 0.14 + r() * 0.04, (r() - 0.5) * 0.05, 0.05, 0.04, 0.05, 6, { mat: "foliage", color: P.leaf2 });
}
