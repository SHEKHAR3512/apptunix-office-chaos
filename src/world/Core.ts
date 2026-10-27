import type { GeometryBuilder } from "../assets/GeometryBuilder";
import { rng } from "../assets/TextureAtlas";
import { bx } from "../assets/prefabs/Shapes";
import { exitSign, fireExtinguisher, floorPlant, posterFrame } from "../assets/prefabs/Props";
import { P } from "../rendering/Palette";
import { ceiling, floorPlate, wall } from "./Architecture";
import type { Lift } from "./Lift";
import { CORE, floorY, rect } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

/**
 * The building core repeated on every storey: lift landing, washroom block,
 * fire stairs, and the lift lobby floor/ceiling.
 */
export function buildCore(b: GeometryBuilder, ctx: WorldContext, lift: Lift, L: number, o: { lobbyFloor?: string; lobbyWall?: string } = {}): void {
  const y = floorY(L);
  const r = rng(L * 97 + 13);
  lift.buildLanding(b, L);
  const lobby = CORE.lobby;
  floorPlate(b, y, rect(0, 0, 10, 14), "floorStone", o.lobbyFloor ?? "#d6cdbf");
  // inlaid border strip in front of the lift
  bx(b, "floorStone", "#8e8679", 3.9, y - 0.049, 6.3, 1.2, 0.05, 2.6, { r: 0 });
  ceiling(b, ctx, y, rect(3.2, 0, 10, 14), { spacingX: 2.2, spacingZ: 2.4 });
  ceiling(b, ctx, y, rect(0, 0, 3.2, 4.8), { lights: false });
  ceiling(b, ctx, y, rect(0, 7.8, 3.2, 14), { lights: false });

  const wc = o.lobbyWall ?? "#e7ddcd";
  // washroom block (south of the shaft)
  wall(b, ctx, y, 3.2, 0, 3.2, 4.8, { color: wc, openings: [{ from: 1.8, to: 2.8 }], t: 0.16 });
  wall(b, ctx, y, 0, 4.8, 3.2, 4.8, { color: wc, t: 0.16 });
  // fire stairs (north of the shaft)
  wall(b, ctx, y, 3.2, 7.8, 3.2, 14, { color: wc, openings: [{ from: 10.2, to: 11.2 }], t: 0.16 });
  wall(b, ctx, y, 0, 7.8, 3.2, 7.8, { color: wc, t: 0.16 });

  // closed doors (decorative, not part of Phase 1 exploration)
  closedDoor(b, 3.29, y, 2.3, "#cbb391");
  closedDoor(b, 3.29, y, 10.7, "#b84a3e");
  b.at(3.3, y + 2.42, 10.7, -Math.PI / 2, () => exitSign(b, ctx.atlas.exitSign()));
  b.at(3.29, y + 1.75, 2.3, -Math.PI / 2, () => b.quad(0, 0, -0.04, 0.32, 0.12, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel("WC", "Washrooms") }));
  b.at(3.29, y + 1.75, 10.7, -Math.PI / 2, () => b.quad(0, 0, -0.04, 0.32, 0.12, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel("Stairs", "Fire exit") }));
  ctx.colliders.add(3.15, y, 1.8, 3.4, y + 2.2, 2.8, "wall");
  ctx.colliders.add(3.15, y, 10.2, 3.4, y + 2.2, 11.2, "wall");
  b.at(3.36, y, 12.6, -Math.PI / 2, () => fireExtinguisher(b));
  ctx.colliders.box(3.4, y, 12.6, 0.3, 0.8, 0.3);
  // lobby planter beside the lift
  b.at(4.0, y, 8.6, 0, () => floorPlant(b, r, { kind: "snake", pot: "#3d4352" }));
  ctx.colliders.box(4.0, y, 8.6, 0.5, 1.2, 0.5);
  void lobby;
}

function closedDoor(b: GeometryBuilder, x: number, y: number, z: number, color: string): void {
  b.at(x, y, z, -Math.PI / 2, () => {
    bx(b, "wood", color, 0, 0, 0, 0.96, 2.18, 0.04, { r: 0.01 });
    bx(b, "wood", color, 0, 0.3, -0.022, 0.8, 1.6, 0.004, { r: 0.003 });
    bx(b, "brushed", P.aluminium, 0.36, 1.0, -0.04, 0.13, 0.025, 0.025, { r: 0.01 });
  });
}

/** Lobby bench used on several floors. */
export function lobbyBench(b: GeometryBuilder, color: string): void {
  b.measure("lobbyBench", () => {
    bx(b, "wood", P.deskOak, 0, 0.4, 0, 1.6, 0.05, 0.45, { r: 0.015 });
    bx(b, "fabric", color, 0, 0.45, 0, 1.5, 0.06, 0.4, { r: 0.025, seg: 2 });
    for (const s of [-0.7, 0.7]) bx(b, "metal", P.darkMetal, s, 0, 0, 0.05, 0.4, 0.4, { r: 0.008 });
  });
}

export function framedPoster(b: GeometryBuilder, ctx: WorldContext, i: number, x: number, y: number, z: number, yaw: number, s = 1): void {
  b.at(x, y, z, yaw, () => posterFrame(b, ctx.atlas.poster(i), 0.56 * s, 0.75 * s));
}
