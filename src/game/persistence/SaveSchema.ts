import type { TicketStatus } from "../gameplay/GameEventBus";
import type { MissionProgress, MissionState } from "../missions/MissionTypes";

/**
 * Save format. Bump SAVE_VERSION and add a migration whenever the shape changes;
 * older saves are upgraded step by step, invalid data is rejected (never half-applied).
 */
export const SAVE_VERSION = 2;

export type FlagValue = boolean | number | string;
export interface ChatMessage { from: string; text: string; time: string; read: boolean }
export interface PuzzleSave { solved: boolean; attempts: number; hints: number; applied?: string | null; fixed?: boolean; identified?: boolean }

export interface SaveDataV2 {
  version: 2;
  savedAt: number;
  chapter: string;
  player: { floor: number; x: number; y: number; z: number; yaw: number };
  clock: number;
  missions: Record<string, MissionProgress>;
  flags: Record<string, FlagValue>;
  puzzles: Record<string, PuzzleSave>;
  tickets: Record<string, TicketStatus>;
  chat: ChatMessage[];
  unlocked: string[];
  chapterComplete: boolean;
  playTime: number;
}
export type SaveData = SaveDataV2;

/** v1 (early prototype): mission states only, flat position. Kept for migration tests. */
export interface SaveDataV1 {
  version: 1;
  savedAt: number;
  missions: Record<string, MissionState>;
  flags: Record<string, FlagValue>;
  playerPos: [number, number, number];
  floor: number;
  clock: number;
}

const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  1: (d) => {
    const v1 = d as unknown as SaveDataV1;
    const missions: Record<string, MissionProgress> = {};
    for (const [k, s] of Object.entries(v1.missions ?? {})) missions[k] = { state: s, done: {} };
    const [x, y, z] = v1.playerPos ?? [8.2, 0, -6.4];
    const v2: SaveDataV2 = {
      version: 2, savedAt: v1.savedAt ?? Date.now(), chapter: "ch1",
      player: { floor: v1.floor ?? 0, x, y, z, yaw: 0 }, clock: v1.clock ?? 585,
      missions, flags: v1.flags ?? {}, puzzles: {}, tickets: {}, chat: [], unlocked: [], chapterComplete: false, playTime: 0,
    };
    return v2 as unknown as Record<string, unknown>;
  },
};

export type MigrationResult = { ok: true; data: SaveData; migratedFrom?: number } | { ok: false; error: string };

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const STATES: MissionState[] = ["LOCKED", "AVAILABLE", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"];

/** Parse, migrate and validate untrusted save data. Pure — unit-tested. */
export function migrate(raw: unknown): MigrationResult {
  let d: Record<string, unknown>;
  try { d = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>); }
  catch { return { ok: false, error: "Save file is not valid JSON." }; }
  if (!d || typeof d !== "object") return { ok: false, error: "Save data is empty." };
  const from = d.version;
  if (!num(from)) return { ok: false, error: "Save has no version." };
  if ((from as number) > SAVE_VERSION) return { ok: false, error: `Save is from a newer version (v${from}).` };
  let v = from as number;
  try {
    while (v < SAVE_VERSION) {
      const m = MIGRATIONS[v];
      if (!m) return { ok: false, error: `No migration from v${v}.` };
      d = m(d);
      v = d.version as number;
    }
  } catch (e) { return { ok: false, error: `Migration failed: ${(e as Error).message}` }; }
  const err = validate(d);
  if (err) return { ok: false, error: err };
  return { ok: true, data: d as unknown as SaveData, migratedFrom: from !== SAVE_VERSION ? (from as number) : undefined };
}

function validate(d: Record<string, unknown>): string | null {
  const p = d.player as Record<string, unknown> | undefined;
  if (!p || !["floor", "x", "y", "z", "yaw"].every((k) => num(p[k]))) return "Corrupt player position.";
  if (!num(d.clock)) return "Corrupt clock.";
  const ms = d.missions as Record<string, MissionProgress> | undefined;
  if (!ms || typeof ms !== "object") return "Corrupt missions.";
  for (const [k, m] of Object.entries(ms)) if (!m || !STATES.includes(m.state) || typeof m.done !== "object") return `Corrupt mission ${k}.`;
  if (typeof d.flags !== "object" || d.flags === null) return "Corrupt flags.";
  if (!Array.isArray(d.chat) || !Array.isArray(d.unlocked)) return "Corrupt lists.";
  return null;
}
