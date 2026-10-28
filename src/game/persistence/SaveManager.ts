import Dexie, { type Table } from "dexie";
import { migrate, SaveData } from "./SaveSchema";

interface SaveRow { slot: string; json: string; savedAt: number }

class SaveDB extends Dexie {
  saves!: Table<SaveRow, string>;
  constructor() { super("apptunix-office-chaos"); this.version(1).stores({ saves: "slot" }); }
}

export type StorageBackend = "indexeddb" | "localstorage" | "memory";

/**
 * Browser saves: IndexedDB (Dexie) first, localStorage second, memory last. Every operation is
 * wrapped; failures are reported via `status` instead of throwing into gameplay. Storage is
 * never assumed permanent (private windows, quota, cleared data).
 */
export class SaveManager {
  backend: StorageBackend = "memory";
  status: { ok: boolean; message: string } = { ok: true, message: "" };
  private db: SaveDB | null = null;
  private mem = new Map<string, string>();
  private readonly lsKey = (slot: string) => `aoc.save.${slot}`;

  async init(): Promise<StorageBackend> {
    try {
      if (typeof indexedDB !== "undefined") {
        const db = new SaveDB();
        await db.open();
        await db.saves.count();
        this.db = db; this.backend = "indexeddb";
        return this.backend;
      }
    } catch { /* fall through */ }
    try {
      localStorage.setItem("aoc.probe", "1"); localStorage.removeItem("aoc.probe");
      this.backend = "localstorage";
    } catch { this.backend = "memory"; this.status = { ok: false, message: "Browser storage is unavailable — progress will be lost when the tab closes." }; }
    return this.backend;
  }

  async save(data: SaveData, slot = "auto"): Promise<boolean> {
    const json = JSON.stringify(data);
    try {
      if (this.backend === "indexeddb" && this.db) await this.db.saves.put({ slot, json, savedAt: data.savedAt });
      else if (this.backend === "localstorage") localStorage.setItem(this.lsKey(slot), json);
      else this.mem.set(slot, json);
      this.status = { ok: true, message: "Saved" };
      return true;
    } catch (e) {
      // quota exceeded / denied: degrade to memory so the session keeps working
      this.mem.set(slot, json);
      this.status = { ok: false, message: `Couldn't save to browser storage (${(e as Error).name ?? "error"}). Progress kept for this session only.` };
      return false;
    }
  }

  async loadRaw(slot = "auto"): Promise<string | null> {
    try {
      if (this.backend === "indexeddb" && this.db) return (await this.db.saves.get(slot))?.json ?? this.mem.get(slot) ?? null;
      if (this.backend === "localstorage") return localStorage.getItem(this.lsKey(slot)) ?? this.mem.get(slot) ?? null;
    } catch { /* ignore */ }
    return this.mem.get(slot) ?? null;
  }

  async load(slot = "auto"): Promise<SaveData | null> {
    const raw = await this.loadRaw(slot);
    if (!raw) return null;
    const r = migrate(raw);
    if (!r.ok) { this.status = { ok: false, message: `Save couldn't be loaded: ${r.error}` }; return null; }
    return r.data;
  }

  async exists(slot = "auto"): Promise<boolean> { return (await this.load(slot)) !== null; }

  async clear(slot = "auto"): Promise<void> {
    this.mem.delete(slot);
    try {
      if (this.backend === "indexeddb" && this.db) await this.db.saves.delete(slot);
      else if (this.backend === "localstorage") localStorage.removeItem(this.lsKey(slot));
    } catch { /* ignore */ }
  }

  /** Export to a downloadable JSON file. */
  async exportFile(slot = "auto"): Promise<void> {
    const raw = await this.loadRaw(slot);
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `office-chaos-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Import from a user-picked file (validated + migrated before it is stored). */
  async importText(text: string, slot = "auto"): Promise<{ ok: boolean; message: string }> {
    const r = migrate(text);
    if (!r.ok) return { ok: false, message: r.error };
    await this.save(r.data, slot);
    return { ok: true, message: r.migratedFrom ? `Imported (upgraded from v${r.migratedFrom}).` : "Imported." };
  }
}
