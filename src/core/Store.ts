import { useSyncExternalStore } from "react";

/** Minimal observable store bridging the Babylon world and the React overlay. */
export class Store<T extends object> {
  private listeners = new Set<() => void>();
  constructor(private state: T) {}
  get(): T { return this.state; }
  set(patch: Partial<T>): void {
    let changed = false;
    for (const k in patch) if ((this.state as Record<string, unknown>)[k] !== patch[k]) { changed = true; break; }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  subscribe = (l: () => void): (() => void) => { this.listeners.add(l); return () => this.listeners.delete(l); };
}

export interface HudState {
  loading: number;          // 0..1
  loadingLabel: string;
  ready: boolean;
  prompt: string | null;
  inLift: boolean;
  liftFloor: string;
  liftTarget: string | null;
  floorLabel: string;
  zoneLabel: string;
  debug: boolean;
  viewMode: number;
  freeFly: boolean;
  stats: string;
  settingsOpen: boolean;
  pointerLocked: boolean;
  backend: string;
  error: string | null;
  showHelp: boolean;
  clock: string;
  paused: boolean;
  toast: string | null;
  overlay: { title: string; lines: string[] } | null;
  computer: "booting" | "desktop" | "off" | null;
  dialogue: { speaker: string; isPlayer: boolean; text: string; choices: string[]; dept: string } | null;
}

export const hud = new Store<HudState>({
  loading: 0, loadingLabel: "Starting…", ready: false, prompt: null, inLift: false, liftFloor: "G", liftTarget: null,
  floorLabel: "Street", zoneLabel: "", debug: false, viewMode: 0, freeFly: false, stats: "", settingsOpen: false,
  pointerLocked: false, backend: "", error: null, showHelp: true,
  clock: "09:45", paused: false, toast: null, overlay: null, computer: null, dialogue: null,
});

export function useHud<K extends keyof HudState>(k: K): HudState[K] {
  return useSyncExternalStore(hud.subscribe, () => hud.get()[k]);
}
