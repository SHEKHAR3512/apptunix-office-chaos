/**
 * Typed gameplay event bus. Every gameplay-relevant thing that happens in the world is
 * published here with a typed payload; missions, the story director, audio and save
 * subscribe. Pure TypeScript (no Babylon) so it is unit-testable.
 */

export type ZoneKey =
  | "lobby_g" | "lift" | "floor3_lobby" | "office" | "react" | "dragon_desk" | "corridor"
  | "hr" | "angular" | "node" | "devops" | "design" | "qa" | "cr1" | "cr2" | "cr3" | "break" | "server" | "lounge" | "street";

export type AppId = "tasks" | "editor" | "chat" | "terminal" | "browser";
export type TicketStatus = "todo" | "in_progress" | "ready_for_qa" | "reopened" | "approved";

export interface GameEvents {
  PLAYER_ENTERED_ZONE: { zone: ZoneKey; floor: number };
  LIFT_CALLED: { floor: number };
  LIFT_FLOOR_SELECTED: { floor: number };
  LIFT_ARRIVED: { floor: number; withPlayer: boolean };
  PLAYER_SAT: { seat: string; zone: string };
  PLAYER_STOOD: { seat: string };
  COMPUTER_STARTED: Record<string, never>;
  COMPUTER_CLOSED: Record<string, never>;
  APP_OPENED: { app: AppId };
  FILE_OPENED: { file: string };
  TICKET_VIEWED: { ticket: string };
  TICKET_STATUS_CHANGED: { ticket: string; status: TicketStatus };
  NPC_DIALOGUE_STARTED: { npc: string; conversation: string };
  NPC_DIALOGUE_COMPLETED: { npc: string; conversation: string };
  DIALOGUE_CHOICE: { conversation: string; node: string; choice: string };
  OBJECT_INTERACTED: { object: string };
  OBJECT_INSPECTED: { object: string };
  MEETING_JOINED: { room: string; meeting?: string };
  MEETING_STARTED: { meeting: string };
  MEETING_ENDED: { meeting: string };
  TASK_ACCEPTED: { ticket: string };
  PUZZLE_OPENED: { puzzle: string };
  PUZZLE_SOLVED: { puzzle: string; attempts: number; hints: number };
  PUZZLE_ATTEMPT_FAILED: { puzzle: string };
  CODE_CHALLENGE_SOLVED: { puzzle: string };
  QA_BUG_REPRODUCED: { bug: string };
  BUILD_TESTS_PASSED: { suite: string };
  BUILD_TESTS_FAILED: { suite: string };
  DEPLOYMENT_FAILED: { env: string; reason: string };
  DEPLOYMENT_COMPLETED: { env: string };
  CHAT_RECEIVED: { from: string; text: string };
  STORY_EVENT: { id: string };
  MISSION_AVAILABLE: { mission: string };
  MISSION_STARTED: { mission: string };
  OBJECTIVE_ACTIVATED: { mission: string; objective: string };
  OBJECTIVE_COMPLETED: { mission: string; objective: string; optional: boolean };
  MISSION_COMPLETED: { mission: string };
  MISSION_FAILED: { mission: string; reason: string };
  CHAPTER_COMPLETED: { chapter: string };
}

export type GameEventType = keyof GameEvents;
export interface AnyGameEvent { type: GameEventType; payload: GameEvents[GameEventType]; seq: number }
type Handler<K extends GameEventType> = (payload: GameEvents[K], ev: { type: K; seq: number }) => void;

export class GameEventBus {
  private handlers = new Map<GameEventType, Set<Handler<GameEventType>>>();
  private any = new Set<(e: AnyGameEvent) => void>();
  readonly history: AnyGameEvent[] = [];
  private seq = 0;
  private depth = 0;
  private queue: AnyGameEvent[] = [];

  on<K extends GameEventType>(type: K, h: Handler<K>): () => void {
    let s = this.handlers.get(type);
    if (!s) { s = new Set(); this.handlers.set(type, s); }
    s.add(h as unknown as Handler<GameEventType>);
    return () => s!.delete(h as unknown as Handler<GameEventType>);
  }

  onAny(h: (e: AnyGameEvent) => void): () => void { this.any.add(h); return () => this.any.delete(h); }

  /**
   * Publish an event. Events emitted from inside a handler are queued and dispatched after
   * the current one finishes (breadth-first), so handlers always see a consistent order.
   */
  emit<K extends GameEventType>(type: K, payload: GameEvents[K]): void {
    const ev: AnyGameEvent = { type, payload, seq: ++this.seq };
    this.queue.push(ev);
    if (this.depth > 0) return;
    this.depth++;
    try {
      while (this.queue.length) {
        const e = this.queue.shift()!;
        this.history.push(e);
        if (this.history.length > 400) this.history.shift();
        for (const h of this.handlers.get(e.type) ?? []) h(e.payload, { type: e.type, seq: e.seq });
        for (const h of this.any) h(e);
      }
    } finally { this.depth--; }
  }

  count(type: GameEventType): number { return this.history.filter((e) => e.type === type).length; }
}
