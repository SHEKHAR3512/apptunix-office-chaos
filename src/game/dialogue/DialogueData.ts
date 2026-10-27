import type { Expression } from "../characters/CharacterConfig";

export type FlagValue = boolean | number | string;
export type Condition =
  | { flag: string; equals?: FlagValue; not?: boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { after: string } | { before: string };

export type DialogueEvent =
  | { type: "setFlag"; key: string; value: FlagValue }
  | { type: "npcActivity"; npc: string; activity: "break" | "work" | "meeting" | "follow"; spot?: string; room?: string }
  | { type: "expression"; speaker: string; expression: Expression }
  | { type: "gesture"; speaker: string; gesture: "Waving" | "Pointing" | "Interacting" | "UsingPhone" | "DrinkingWater" }
  | { type: "emit"; name: string; data?: Record<string, FlagValue> };

export interface DialogueChoice { text: string; next?: string; if?: Condition; set?: Record<string, FlagValue>; events?: DialogueEvent[] }

export interface DialogueNode {
  id: string;
  /** speaker id: "player" or a character id */
  speaker: string;
  text: string;
  expression?: Expression;
  choices?: DialogueChoice[];
  next?: string;
  events?: DialogueEvent[];
  camera?: "twoShot" | "speaker" | "overShoulder";
}

export interface Conversation {
  id: string;
  /** the NPC this conversation belongs to */
  owner: string;
  /** first matching entry wins; lets an NPC say different things over time */
  entries: { if?: Condition; node: string }[];
  nodes: Record<string, DialogueNode>;
}

/** Builder helper so data files stay terse. */
export function conv(id: string, owner: string, entries: Conversation["entries"], nodes: Record<string, Omit<DialogueNode, "id">>): Conversation {
  const map: Record<string, DialogueNode> = {};
  for (const [k, n] of Object.entries(nodes)) map[k] = { id: k, ...n };
  return { id, owner, entries, nodes: map };
}
