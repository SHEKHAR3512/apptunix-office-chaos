import type { AnyGameEvent, GameEventBus } from "../gameplay/GameEventBus";
import { satisfies } from "./ObjectiveEvaluator";
import { canTransition, InvalidTransitionError } from "./MissionStateMachine";
import type { MissionDef, MissionProgress, MissionState, ObjectiveDef } from "./MissionTypes";

/**
 * Owns mission state. Listens to every bus event; only the current required objective of
 * each ACTIVE mission (plus its optional objectives) can advance. All mutations go through
 * validated transitions; repeated events are ignored (idempotent completion).
 */
export class MissionManager {
  readonly progress = new Map<string, MissionProgress>();
  readonly errors: string[] = [];
  private unsub: () => void;
  onRewards: (m: MissionDef) => void = () => {};

  constructor(readonly defs: MissionDef[], private readonly bus: GameEventBus) {
    for (const d of defs) this.progress.set(d.id, { state: "LOCKED", done: {} });
    this.unsub = this.bus.onAny((e) => this.handle(e));
  }

  dispose(): void { this.unsub(); }

  def(id: string): MissionDef | undefined { return this.defs.find((d) => d.id === id); }
  state(id: string): MissionState { return this.progress.get(id)?.state ?? "LOCKED"; }
  isDone(mission: string, objective: string): boolean { return !!this.progress.get(mission)?.done[objective]; }

  get active(): MissionDef[] { return this.defs.filter((d) => this.state(d.id) === "ACTIVE"); }
  get activeStory(): MissionDef | undefined { return this.active.find((d) => d.category === "story"); }

  /** First incomplete required objective (the only one that can advance). */
  current(id: string): ObjectiveDef | undefined {
    const d = this.def(id), p = this.progress.get(id);
    if (!d || !p) return undefined;
    return d.objectives.find((o) => !o.optional && !p.done[o.id]);
  }

  /** Objectives that may advance right now. */
  live(id: string): ObjectiveDef[] {
    const d = this.def(id), p = this.progress.get(id);
    if (!d || !p || p.state !== "ACTIVE") return [];
    const cur = this.current(id);
    return d.objectives.filter((o) => !p.done[o.id] && (o === cur || o.optional));
  }

  transition(id: string, to: MissionState): boolean {
    const p = this.progress.get(id);
    if (!p) { this.errors.push(`unknown mission ${id}`); return false; }
    if (!canTransition(p.state, to)) { this.errors.push(new InvalidTransitionError(id, p.state, to).message); return false; }
    p.state = to;
    return true;
  }

  /** Unlock missions whose prerequisites are all completed. */
  refreshAvailability(): void {
    for (const d of this.defs) {
      if (this.state(d.id) !== "LOCKED") continue;
      if (d.prerequisites.every((r) => this.state(r) === "COMPLETED")) {
        this.transition(d.id, "AVAILABLE");
        this.bus.emit("MISSION_AVAILABLE", { mission: d.id });
      }
    }
  }

  start(id: string): boolean {
    if (this.state(id) !== "AVAILABLE") { this.errors.push(`cannot start ${id} from ${this.state(id)}`); return false; }
    if (!this.transition(id, "ACTIVE")) return false;
    this.bus.emit("MISSION_STARTED", { mission: id });
    const cur = this.current(id);
    if (cur) this.bus.emit("OBJECTIVE_ACTIVATED", { mission: id, objective: cur.id });
    return true;
  }

  pause(id: string): boolean { return this.transition(id, "PAUSED"); }
  resume(id: string): boolean { return this.transition(id, "ACTIVE"); }

  fail(id: string, reason: string): void {
    if (this.transition(id, "FAILED")) {
      this.bus.emit("MISSION_FAILED", { mission: id, reason });
      // failures are always recoverable: the mission becomes available again, progress kept
      this.transition(id, "AVAILABLE");
    }
  }

  /** Mark an objective done (validated path used by events; also exposed for tests/debug). */
  complete(id: string, objective: string): boolean {
    const d = this.def(id), p = this.progress.get(id);
    if (!d || !p || p.state !== "ACTIVE" || p.done[objective]) return false;
    const o = d.objectives.find((x) => x.id === objective);
    if (!o) return false;
    if (!this.live(id).includes(o)) return false;
    p.done[objective] = true;
    this.bus.emit("OBJECTIVE_COMPLETED", { mission: id, objective, optional: !!o.optional });
    const next = this.current(id);
    if (next) this.bus.emit("OBJECTIVE_ACTIVATED", { mission: id, objective: next.id });
    else this.finish(d);
    return true;
  }

  private finish(d: MissionDef): void {
    if (!this.transition(d.id, "COMPLETED")) return;
    this.onRewards(d);
    this.bus.emit("MISSION_COMPLETED", { mission: d.id });
    this.refreshAvailability();
    const chapter = this.defs.filter((x) => x.chapter === d.chapter && x.category === "story");
    if (d.category === "story" && chapter.every((x) => this.state(x.id) === "COMPLETED")) this.bus.emit("CHAPTER_COMPLETED", { chapter: d.chapter });
  }

  private handle(e: AnyGameEvent): void {
    if (e.type.startsWith("MISSION_") || e.type.startsWith("OBJECTIVE_") || e.type === "CHAPTER_COMPLETED") return;
    for (const d of this.active) {
      for (const f of d.failure ?? []) {
        if (f.onEvent.event === e.type && Object.entries(f.onEvent.match ?? {}).every(([k, v]) => (e.payload as Record<string, unknown>)[k] === v)) { this.fail(d.id, f.reason); break; }
      }
      if (this.state(d.id) !== "ACTIVE") continue;
      for (const o of this.live(d.id)) if (satisfies(o, e)) this.complete(d.id, o.id);
    }
  }

  // ---------------------------------------------------------------- persistence
  serialize(): Record<string, MissionProgress> {
    return Object.fromEntries([...this.progress].map(([k, v]) => [k, { state: v.state, done: { ...v.done } }]));
  }

  /** Restore from a save. Unknown missions are ignored; missing ones stay LOCKED. */
  restore(data: Record<string, MissionProgress>): void {
    for (const [id, v] of Object.entries(data)) {
      const p = this.progress.get(id);
      if (!p) continue;
      p.state = v.state === "PAUSED" ? "ACTIVE" : v.state;
      p.done = {};
      const d = this.def(id)!;
      for (const o of d.objectives) if (v.done?.[o.id]) p.done[o.id] = true;
    }
    this.refreshAvailability();
  }
}
