import { Vector3 } from "@babylonjs/core";
import { P } from "../rendering/Palette";
import { buildAngular } from "../environments/AngularSection";
import { buildCR1 } from "../environments/CR1";
import { buildCR2 } from "../environments/CR2";
import { buildCR3 } from "../environments/CR3";
import { buildDesign } from "../environments/DesignSection";
import { buildDevOps } from "../environments/DevOpsSection";
import { buildHR } from "../environments/HRSection";
import { buildNode } from "../environments/NodeSection";
import { buildQA } from "../environments/QASection";
import { buildReact } from "../environments/ReactSection";
import { buildReception } from "../environments/Reception";
import { buildBreak, buildCorridors, buildLounge, buildServer } from "../environments/SharedSpaces";
import type { SectionArgs } from "../environments/common";
import { ceiling, column, floorPlate, glassWall, wall } from "./Architecture";
import { buildCore } from "./Core";
import { Door } from "./Doors";
import type { Lift } from "./Lift";
import { FLOOR3_DOORS, floorY, rect, ZONES } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

/**
 * Apptunix — 3rd floor. Architecture is generated from OfficeLayout.ts; each department is
 * committed as its own mesh group so frustum culling works per zone.
 */
export function buildThirdFloor(ctx: WorldContext, lift: Lift, L: number): Door[] {
  const y = floorY(L);

  // ---------------------------------------------------------------- architecture
  {
    const b = ctx.builder();
    b.measure("floor3:architecture", () => {
      buildCore(b, ctx, lift, L, { lobbyFloor: "#d3cabb", lobbyWall: "#e9dfcf" });
      for (const z of ZONES) floorPlate(b, y, z.rect, z.floor, z.floorColor);
      // accent inlays in the corridor marking the department openings
      for (const x of [24, 34.5, 43.5]) floorPlate(b, y + 0.001, rect(x - 0.6, 14.0, x + 0.6, 14.12), "floorTile", P.brandOrange);
      ceiling(b, ctx, y, rect(10, 0, 48, 34));
      ceiling(b, ctx, y, rect(0, 14, 10, 34));

      // lift lobby → Apptunix glass frontage
      glassWall(b, ctx, y, 10, 0, 10, 14, { openings: [{ from: 5.3, to: 7.3 }], mullion: 1.4 });
      wall(b, ctx, y, 0, 14, 10, 14, { color: "#e9dfcf", colorB: P.wallCream });
      // reception logo wall (navy cladding added by the reception section)
      wall(b, ctx, y, 18, 0, 18, 12, { t: 0.2, color: P.wallCream });
      // HR cabin
      glassWall(b, ctx, y, 0, 16.5, 10, 16.5, { openings: [{ from: 7.0, to: 8.0 }] });
      wall(b, ctx, y, 10, 16.5, 10, 23, { color: P.wallCream });
      wall(b, ctx, y, 0, 23, 10, 23, { color: P.wallCream, colorB: P.wallWarm });
      // north room row
      glassWall(b, ctx, y, 10, 25, 22, 25, { openings: [{ from: 11.65, to: 12.75 }] });
      glassWall(b, ctx, y, 22, 25, 30, 25, { openings: [{ from: 22.9, to: 23.9 }] });
      glassWall(b, ctx, y, 30, 25, 36, 25, { openings: [{ from: 30.9, to: 31.9 }] });
      wall(b, ctx, y, 36, 25, 41, 25, { color: P.wallSlate, colorB: "#d9d4cc", openings: [{ from: 38.0, to: 39.0 }] });
      for (const x of [10, 22, 30, 36, 41]) wall(b, ctx, y, x, 25, x, 34, { color: P.wallCream });
      column(b, ctx, y, 30, 14.25);
      column(b, ctx, y, 39, 14.25);
      // room labels on the frosted bands beside each door
      const labels: [number, string, string][] = [[13.6, "CR1", "Main conference"], [24.8, "CR2", "Client & calls"], [32.8, "CR3", "Team leads"]];
      for (const [x, l, sub] of labels) b.quad(x, y + 1.75, 24.97, 0.42, 0.16, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel(l, sub) });
      b.quad(5.5, y + 1.75, 16.47, 0.42, 0.16, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel("HR", "People & Culture") });
      b.quad(39.8, y + 1.75, 24.9, 0.42, 0.16, { mat: "print", color: "#ffffff", uv: ctx.atlas.roomLabel("Server", "Authorised only") });
      // entrance branding on the glass
      b.at(9.98, y + 1.45, 9.0, Math.PI / 2, () => b.quad(0, 0, 0, 2.4, 0.6, { mat: "print", color: "#ffffff", uv: ctx.atlas.logoPanel(true) }));
    });
    ctx.commit(b, "f3:architecture");
  }

  // ---------------------------------------------------------------- sections
  const sections: [string, (a: SectionArgs) => void][] = [
    ["reception", buildReception], ["react", buildReact], ["angular", buildAngular], ["node", buildNode],
    ["hr", buildHR], ["devops", buildDevOps], ["design", buildDesign], ["qa", buildQA],
    ["cr1", buildCR1], ["cr2", buildCR2], ["cr3", buildCR3],
    ["break", buildBreak], ["server", buildServer], ["lounge", buildLounge], ["corridors", buildCorridors],
  ];
  for (const [name, fn] of sections) {
    const b = ctx.builder();
    fn({ b, ctx, y, floor: L });
    ctx.commit(b, `f3:${name}`);
  }

  ctx.anchors.add("spawn.office", "spawn", new Vector3(12, y, 6.3), Math.PI / 2, L, "reception");
  ctx.anchors.add("spawn.react", "spawn", new Vector3(24, y, 12.8), Math.PI, L, "react");

  return FLOOR3_DOORS.map((d) => new Door(ctx, {
    id: `f3.${d.id}`, x: d.x, y, z: d.z, axis: d.axis, width: d.width, type: d.type, glass: d.glass, floor: L,
    label: d.id === "server" ? "Server" : undefined,
  }));
}
