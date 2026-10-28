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

/**
 * Spontaneous micro-breaks inside long work blocks (water, a stretch at the window) so the
 * office never looks frozen. Deterministic for a given (seed, daySeed): about half of the
 * people take one ~6-minute break in each work block of 50+ minutes, each at their own time.
 * Pure: unit-tested.
 */
export function microBreak(block: ResolvedBlock, minutes: number, seed: number, daySeed = 0): Activity | null {
  if (block.activity.kind !== "work" || block.end - block.start < 50) return null;
  const k = seed * 31 + daySeed * 17 + block.index * 7;
  if (Math.abs(jitter(k, 1, 100)) < 50) return null; // ~half of people skip this block
  const span = block.end - block.start - 22;
  const at = block.start + 10 + Math.floor(((jitter(k, 2, 100) + 100) / 200) * span);
  if (minutes < at || minutes >= at + 6) return null;
  return { kind: "break", spot: (["water", "coffee", "lounge"] as const)[Math.abs(k) % 3] };
}
