import { useSyncExternalStore } from "react";
import { Store } from "../../core/Store";
import type { ChatMessage } from "../persistence/SaveSchema";
import type { AppId } from "./GameEventBus";
import type { Ticket } from "./ProgressionManager";

export interface ObjectiveView { id: string; text: string; done: boolean; current: boolean; optional: boolean; hint?: string }
export interface MissionView { id: string; category: "story" | "side"; index: number; name: string; title: string; description: string; objectives: ObjectiveView[]; state: string }
export interface Notice { id: number; icon: string; text: string; kind: "mission" | "objective" | "chat" | "info" | "warn" }

export interface PlayView {
  mode: "title" | "story" | "sandbox";
  hasSave: boolean;
  saveInfo: string;
  saveStatus: string;
  mission: MissionView | null;
  missions: MissionView[];
  /** Active side jobs not currently in focus. */
  side: MissionView[];
  notices: Notice[];
  hudVisible: boolean;
  journalOpen: boolean;
  mapOpen: boolean;
  unlocked: string[];
  chat: ChatMessage[];
  unread: number;
  tickets: Ticket[];
  /** bump to re-render puzzle UIs after engine state changes */
  rev: number;
  app: AppId;
  waypoint: { angle: number; dist: number; label: string; otherFloor: string | null } | null;
  qaDevice: boolean;
  qaPuzzle: string;
  console: boolean;
  chapterCard: { title: string; subtitle: string; stats: string[] } | null;
  letterbox: boolean;
  relationships: Record<string, number>;
}

export const play = new Store<PlayView>({
  mode: "sandbox", hasSave: false, saveInfo: "", saveStatus: "", mission: null, missions: [], side: [], notices: [],
  hudVisible: true, journalOpen: false, mapOpen: false, unlocked: [], chat: [], unread: 0, tickets: [], rev: 0, app: "tasks",
  waypoint: null, qaDevice: false, qaPuzzle: "qa_reproduce", console: false, chapterCard: null, letterbox: false, relationships: {},
});

export function usePlay<K extends keyof PlayView>(k: K): PlayView[K] {
  return useSyncExternalStore(play.subscribe, () => play.get()[k]);
}

let noticeId = 0;
export function pushNotice(icon: string, text: string, kind: Notice["kind"] = "info", ms = 4200): void {
  const n: Notice = { id: ++noticeId, icon, text, kind };
  play.set({ notices: [...play.get().notices, n].slice(-4) });
  setTimeout(() => play.set({ notices: play.get().notices.filter((x) => x.id !== n.id) }), ms);
}
