import { parseTime } from "../GameClock";
import { Activity, SCHEDULES, ScheduleBlock } from "../../data/schedules/templates";

export interface ResolvedBlock { index: number; start: number; end: number; activity: Activity }

/** Deterministic per-character jitter in minutes, so routines don't run in lock-step. */
export function jitter(seed: number, index: number, range = 8): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return Math.round((x - Math.floor(x) - 0.5) * 2 * range);
}

/** Which schedule block applies at a given minute of the day. Pure: unit-tested. */
export function resolveBlock(templateId: string, minutes: number, seed = 0): ResolvedBlock {
  const t = SCHEDULES[templateId] ?? SCHEDULES.dev;
  const base = t.blocks.map((b: ScheduleBlock) => parseTime(b.at));
  // jitter is bounded by a third of the neighbouring gaps and starts stay strictly ordered,
  // so a short block (e.g. a 15-minute stand-up) can never be skipped
  const starts: number[] = [];
  base.forEach((m, i) => {
    if (i === 0) { starts.push(m); return; }
    const gap = Math.min(m - base[i - 1], (base[i + 1] ?? m + 60) - m);
    const j = Math.max(-gap / 3, Math.min(gap / 3, jitter(seed, i)));
    starts.push(Math.max(starts[i - 1] + 3, Math.round(m + j)));
  });
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (minutes >= starts[i]) idx = i;
  if (idx < 0) return { index: -1, start: 0, end: starts[0], activity: { kind: "leave" } };
  return { index: idx, start: starts[idx], end: idx + 1 < starts.length ? starts[idx + 1] : 24 * 60, activity: t.blocks[idx].activity };
}
