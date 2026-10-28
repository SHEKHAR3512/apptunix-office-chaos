import type { GameEvents, GameEventType, TicketStatus, ZoneKey } from "../gameplay/GameEventBus";

export type MissionState = "LOCKED" | "AVAILABLE" | "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED";
export type MissionCategory = "story" | "side";

export type ObjectiveType =
  | "REACH_LOCATION" | "TALK_TO_NPC" | "INTERACT_WITH_OBJECT" | "SIT_AT_DESK" | "USE_COMPUTER"
  | "COMPLETE_MINIGAME" | "ATTEND_MEETING" | "INSPECT_OBJECT" | "MAKE_DIALOGUE_CHOICE" | "WAIT_FOR_EVENT" | "RETURN_TO_NPC";

/** An explicit event matcher: event type plus a subset of payload fields that must be equal. */
export interface EventMatch<K extends GameEventType = GameEventType> { event: K; match?: Partial<GameEvents[K]> }

export interface ObjectiveTarget {
  zone?: ZoneKey;
  npc?: string;
  conversation?: string;
  object?: string;
  seat?: string;
  seatZone?: string;
  puzzle?: string;
  room?: string;
  app?: string;
  /** MAKE_DIALOGUE_CHOICE: accepted choice ids (any if omitted) */
  choices?: string[];
  /** WAIT_FOR_EVENT (or alternatives for any type) */
  anyOf?: EventMatch[];
}

/** Where the waypoint marker points. */
export type MarkerTarget =
  | { kind: "zone"; zone: ZoneKey }
  | { kind: "npc"; npc: string }
  | { kind: "seat"; seat: string }
  | { kind: "point"; x: number; y: number; z: number; floor: number };

export interface ObjectiveDef {
  id: string;
  type: ObjectiveType;
  text: string;
  target: ObjectiveTarget;
  optional?: boolean;
  marker?: MarkerTarget;
  hint?: string;
}

/** Data-driven side effects, executed by the StoryDirector (missions never touch rendering). */
export type StoryAction =
  | { do: "chat"; from: string; text: string; delay?: number }
  | { do: "notify"; text: string; icon?: string }
  | { do: "time"; at: string; until: string }
  | { do: "npc"; npc: string | string[]; activity: "work" | "break" | "meeting" | "standup" | "release" | "post"; room?: "cr1" | "cr2" | "cr3"; spot?: string }
  | { do: "meeting"; meeting: string }
  | { do: "cutscene"; id: string }
  | { do: "ticket"; ticket: string; status: TicketStatus }
  | { do: "unlock"; feature: "map" | "journal" | "freeRoam" }
  | { do: "flag"; key: string; value: boolean | number | string }
  | { do: "story"; id: string; delay?: number }
  | { do: "sound"; sound: "mission" | "objective" | "chat" | "bug" | "approve" | "deploy" | "meeting" }
  | { do: "react"; text: string; npcs?: string[] };

export interface Reward { unlock?: ("map" | "journal" | "freeRoam")[]; rel?: Record<string, number>; flags?: Record<string, boolean | number | string> }

export interface MissionDef {
  id: string;
  chapter: string;
  index: number;
  title: string;
  name: string;
  description: string;
  category: MissionCategory;
  prerequisites: string[];
  objectives: ObjectiveDef[];
  targetNpcs: string[];
  rewards: Reward;
  /** NPC → conversation id overrides while this mission is active (dialogue triggers). */
  dialogue?: Record<string, string>;
  /** Persistent setup, re-applied when resuming a save (forces, time windows, meetings). */
  setup?: StoryAction[];
  /** One-shot effects when the mission starts (chat, notifications, sounds). */
  onStart?: StoryAction[];
  onObjective?: Record<string, StoryAction[]>;
  onComplete?: StoryAction[];
  autoStart?: boolean;
  /** Side jobs: who/what offers the job while it is AVAILABLE (NPC offer conversation or object). */
  trigger?: { npc?: string; object?: string; conversation?: string };
  failure?: { onEvent: EventMatch; reason: string }[];
}

export interface MissionProgress { state: MissionState; done: Record<string, true> }
