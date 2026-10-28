import { CHAPTER_1 } from "../../data/missions/chapter1";
import { SIDE_MISSIONS } from "../../data/missions/side";
import type { MissionDef } from "./MissionTypes";

/** All missions known to the game, validated on load (stable ids, prerequisites exist). */
export const MISSIONS: MissionDef[] = [...CHAPTER_1, ...SIDE_MISSIONS];

export function validateMissions(list: MissionDef[]): string[] {
  const problems: string[] = [];
  const ids = new Set(list.map((m) => m.id));
  if (ids.size !== list.length) problems.push("duplicate mission ids");
  for (const m of list) {
    for (const p of m.prerequisites) if (!ids.has(p)) problems.push(`${m.id}: unknown prerequisite ${p}`);
    const oids = m.objectives.map((o) => o.id);
    if (new Set(oids).size !== oids.length) problems.push(`${m.id}: duplicate objective ids`);
    if (!m.objectives.some((o) => !o.optional)) problems.push(`${m.id}: no required objectives`);
    for (const o of m.objectives) if (o.type === "WAIT_FOR_EVENT" && !o.target.anyOf?.length) problems.push(`${m.id}.${o.id}: WAIT_FOR_EVENT without events`);
  }
  return problems;
}
