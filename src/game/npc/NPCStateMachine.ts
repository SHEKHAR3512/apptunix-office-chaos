/**
 * Small hierarchical finite-state machine. The top level follows the schedule activity;
 * each NPC state has enter/update/exit hooks. Transitions are explicit and logged
 * (ring buffer) for debugging and tests. Babylon-free.
 */
export type NPCState =
  | "IDLE" | "WALKING" | "WORKING" | "SITTING" | "TYPING" | "TALKING" | "IN_MEETING"
  | "ON_BREAK" | "RETURNING_TO_DESK" | "WAITING_FOR_PLAYER" | "AWAY";

export interface StateHooks<C> {
  enter?: (ctx: C, from: NPCState) => void;
  update?: (ctx: C, dt: number) => NPCState | void;
  exit?: (ctx: C, to: NPCState) => void;
}

export class StateMachine<C> {
  state: NPCState;
  time = 0;
  readonly history: { from: NPCState; to: NPCState; at: number }[] = [];
  private clock = 0;

  constructor(private readonly ctx: C, private readonly hooks: Partial<Record<NPCState, StateHooks<C>>>, initial: NPCState = "IDLE") {
    this.state = initial;
  }

  go(to: NPCState): void {
    if (to === this.state) return;
    const from = this.state;
    this.hooks[from]?.exit?.(this.ctx, to);
    this.state = to;
    this.time = 0;
    this.history.push({ from, to, at: this.clock });
    if (this.history.length > 40) this.history.shift();
    this.hooks[to]?.enter?.(this.ctx, from);
  }

  update(dt: number): void {
    this.clock += dt;
    this.time += dt;
    const next = this.hooks[this.state]?.update?.(this.ctx, dt);
    if (next && next !== this.state) this.go(next);
  }
}
