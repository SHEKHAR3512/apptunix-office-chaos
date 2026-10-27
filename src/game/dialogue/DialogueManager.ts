import { parseTime } from "../GameClock";
import type { Condition, Conversation, DialogueChoice, DialogueEvent, DialogueNode, FlagValue } from "./DialogueData";

export interface DialogueView {
  conversation: string;
  node: DialogueNode;
  choices: DialogueChoice[];
}

/**
 * Local, data-driven conversation engine (no network/AI). Pure logic: the game supplies
 * flags and the clock, and receives events. Unit-tested in tests/unit/dialogue.test.ts.
 */
export class DialogueManager {
  readonly flags = new Map<string, FlagValue>();
  private convs = new Map<string, Conversation>();
  private cur: { conv: Conversation; node: DialogueNode } | null = null;
  now = () => 9 * 60;
  onEvent: (e: DialogueEvent, conv: string) => void = () => {};
  onChange: (v: DialogueView | null) => void = () => {};

  register(list: Conversation[]): void { for (const c of list) this.convs.set(c.id, c); }
  has(id: string): boolean { return this.convs.has(id); }
  get active(): DialogueView | null { return this.cur ? this.view() : null; }

  check(c: Condition | undefined): boolean {
    if (!c) return true;
    if ("all" in c) return c.all.every((x) => this.check(x));
    if ("any" in c) return c.any.some((x) => this.check(x));
    if ("after" in c) return this.now() >= parseTime(c.after);
    if ("before" in c) return this.now() < parseTime(c.before);
    const v = this.flags.get(c.flag);
    const ok = c.equals === undefined ? !!v : v === c.equals;
    return c.not ? !ok : ok;
  }

  start(id: string): DialogueView | null {
    const conv = this.convs.get(id);
    if (!conv) return null;
    const entry = conv.entries.find((e) => this.check(e.if));
    if (!entry) return null;
    this.enter(conv, entry.node);
    return this.active;
  }

  /** Advance a node without choices (or pick choice i). Returns null when the conversation ends. */
  advance(choice?: number): DialogueView | null {
    if (!this.cur) return null;
    const { conv, node } = this.cur;
    const choices = this.visibleChoices(node);
    let next: string | undefined;
    if (choices.length) {
      const c = choices[Math.max(0, Math.min(choices.length - 1, choice ?? 0))];
      if (c.set) for (const [k, v] of Object.entries(c.set)) this.flags.set(k, v);
      c.events?.forEach((e) => this.fire(e, conv.id));
      next = c.next;
    } else next = node.next;
    if (!next || !conv.nodes[next]) { this.end(); return null; }
    this.enter(conv, next);
    return this.active;
  }

  end(): void {
    if (!this.cur) return;
    const id = this.cur.conv.id;
    this.flags.set(`talked:${this.cur.conv.owner}`, true);
    this.cur = null;
    this.onChange(null);
    this.fire({ type: "emit", name: "dialogueEnded", data: { conversation: id } }, id);
  }

  private enter(conv: Conversation, nodeId: string): void {
    const node = conv.nodes[nodeId];
    this.cur = { conv, node };
    node.events?.forEach((e) => this.fire(e, conv.id));
    this.onChange(this.view());
  }

  private fire(e: DialogueEvent, conv: string): void {
    if (e.type === "setFlag") this.flags.set(e.key, e.value);
    this.onEvent(e, conv);
  }

  private visibleChoices(n: DialogueNode): DialogueChoice[] { return (n.choices ?? []).filter((c) => this.check(c.if)); }

  private view(): DialogueView { const { conv, node } = this.cur!; return { conversation: conv.id, node, choices: this.visibleChoices(node) }; }
}
