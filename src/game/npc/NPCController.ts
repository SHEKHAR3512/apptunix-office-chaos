import { Vector3 } from "@babylonjs/core";
import type { Activity } from "../../data/schedules/templates";
import type { Character } from "../characters/CharacterFactory";
import type { Gesture } from "../characters/CharacterAnimator";
import type { SeatRegistry } from "../interactions/SeatRegistry";
import { NPCState, StateMachine } from "./NPCStateMachine";
import { resolveBlock } from "./NPCSchedule";
import type { AgentHandle, NPCNavigation } from "./NPCNavigation";
import { seatTarget, spotTarget, Target } from "./NPCBehavior";

const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const angDiff = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export interface NPCWorld {
  nav: NPCNavigation;
  seats: SeatRegistry;
  minutes: () => number;
  playerPos: () => Vector3;
  playerBusyWith: () => string | null;
  colleagues: (npc: NPCController) => NPCController[];
  meetingSeats: (room: string) => string[];
  breakSeats: () => string[];
}

/**
 * One office employee. The schedule picks an Activity; the state machine turns it into
 * concrete behaviour (walk → sit → type, chat, meeting, break...). Motion has three modes:
 * nav (crowd-steered), script (sit/stand root motion) and static (seated / standing).
 */
export class NPCController {
  readonly fsm: StateMachine<NPCController>;
  readonly seed: number;
  activity: Activity = { kind: "work" };
  private blockIndex = -2;
  target: Target | null = null;
  private afterArrive: NPCState = "IDLE";
  agent: AgentHandle | null = null;
  pos = new Vector3();
  yaw = 0;
  seatId: string | null = null;
  private tr = { t: 0, dur: 1, from: new Vector3(), to: new Vector3(), fromYaw: 0, toYaw: 0, sitting: true };
  private stuck = 0;
  private repaths = 0;
  private microT = 0;
  private micro: Gesture = "none";
  private nextMicro = 4;
  talkingWith: NPCController | null = null;
  inDialogue = false;
  forced: Activity | null = null;
  hidden = false;
  homeSeat: string | null;

  constructor(readonly id: string, readonly char: Character, private readonly w: NPCWorld) {
    this.seed = hash(id);
    this.homeSeat = char.config.desk ?? null;
    this.nextMicro = 3 + (this.seed % 9);
    this.fsm = new StateMachine<NPCController>(this, {
      IDLE: { enter: (n) => n.anim("Idle"), update: (n) => n.updateIdle() },
      WALKING: { enter: (n) => n.anim("Locomotion"), update: (n, dt) => n.updateWalk(dt) },
      RETURNING_TO_DESK: { enter: (n) => n.anim("Locomotion"), update: (n, dt) => n.updateWalk(dt) },
      SITTING: { update: (n, dt) => n.updateTransition(dt) },
      WORKING: { enter: (n) => n.anim("Sitting"), update: (n, dt) => n.updateWorking(dt) },
      TYPING: { enter: (n) => n.anim("Typing"), update: (n, dt) => n.updateWorking(dt) },
      TALKING: { enter: (n) => n.anim(n.seatId ? "SitTalking" : "Talking"), update: (n, dt) => n.updateTalking(dt), exit: (n) => { n.char.animator.talking = false; } },
      IN_MEETING: { enter: (n) => n.anim(n.seatId ? "SitListening" : "Listening"), update: (n, dt) => n.updateMeeting(dt) },
      ON_BREAK: { enter: (n) => n.anim(n.seatId ? "Sitting" : "Idle"), update: (n, dt) => n.updateBreak(dt), exit: (n) => n.char.setGesture("none") },
      WAITING_FOR_PLAYER: { enter: (n) => { n.anim(n.seatId ? "Sitting" : "Idle"); n.char.setGesture("Waving"); }, update: (n) => n.updateWaiting(), exit: (n) => n.char.setGesture("none") },
      AWAY: { enter: (n) => n.setHidden(true), exit: (n) => n.setHidden(false) },
    }, "IDLE");
  }

  get state(): NPCState { return this.fsm.state; }

  private anim(s: Parameters<Character["animator"]["play"]>[0]): void { this.char.animator.play(s, 0.35); }

  setHidden(h: boolean): void {
    this.hidden = h;
    this.char.setVisible(!h);
    if (h && this.agent) this.removeAgent();
  }

  /** Place directly in the state the schedule implies (initial spawn / floor catch-up). */
  snapToSchedule(): void {
    if (this.agent) this.removeAgent();
    if (this.seatId) { this.w.seats.release(this.seatId, this.id); this.seatId = null; }
    this.talkingWith = null;
    const blk = resolveBlock(this.char.config.schedule ?? "dev", this.w.minutes(), this.seed);
    this.blockIndex = blk.index;
    this.activity = this.forced ?? blk.activity;
    const t = this.chooseTarget(this.activity);
    if (this.activity.kind === "leave" || blk.index < 0) { this.fsm.go("AWAY"); return; }
    if (!t) { this.fsm.go("IDLE"); return; }
    this.target = t;
    if (t.kind === "seat" && t.seatId && this.w.seats.reserve(t.seatId, this.id)) {
      this.seatId = t.seatId;
      this.pos.copyFrom(t.pos); this.yaw = t.yaw;
      this.char.animator.play("Sitting", 0);
      this.fsm.go(this.stateForActivity(true));
    } else {
      this.pos.copyFrom(t.pos); this.yaw = t.yaw;
      this.fsm.go(this.stateForActivity(false));
    }
    this.sync();
  }

  /** Called at ~5–30 Hz depending on distance; dt is accumulated real time. */
  think(dt: number): void {
    // schedule changes
    const blk = resolveBlock(this.char.config.schedule ?? "dev", this.w.minutes(), this.seed);
    if (blk.index !== this.blockIndex && !this.inDialogue) {
      this.blockIndex = blk.index;
      if (!this.forced) this.beginActivity(blk.index < 0 ? { kind: "leave" } : blk.activity);
    }
    this.fsm.update(dt);
    this.watchdog(dt);
  }

  private watchT = 0;
  /**
   * Self-correction: a settled NPC that isn't where its current activity wants it (e.g. a
   * schedule change landed mid sit/stand transition) re-plans. Rate-limited.
   */
  private watchdog(dt: number): void {
    this.watchT += dt;
    if (this.watchT < 3 || this.inDialogue || !this.target || this.agent) return;
    const settled = this.state === "TYPING" || this.state === "WORKING" || this.state === "IDLE" || this.state === "IN_MEETING" || this.state === "ON_BREAK";
    if (!settled) return;
    this.watchT = 0;
    const wantSeat = this.target.kind === "seat" && this.target.seatId;
    const atTarget = wantSeat ? this.seatId === this.target.seatId : Vector3.Distance(this.pos, this.target.pos) < 1.0;
    // activity/target mismatch, e.g. typing at the desk while scheduled for the stand-up
    const deskStateMismatch = (this.state === "TYPING" || this.state === "WORKING") && this.activity.kind !== "work" && this.activity.kind !== "arrive" && this.activity.kind !== "post";
    if (!atTarget || deskStateMismatch) this.beginActivity(this.activity);
  }

  /** Drive the visible character (every frame or throttled). */
  animate(dt: number): void {
    if (this.hidden) return;
    if (this.agent && (this.state === "WALKING" || this.state === "RETURNING_TO_DESK")) {
      const p = this.w.nav.position(this.agent), v = this.w.nav.velocity(this.agent);
      this.pos.copyFrom(p);
      const sp = Math.hypot(v.x, v.z);
      if (sp > 0.15) this.yaw += angDiff(this.yaw, Math.atan2(v.x, v.z)) * Math.min(1, dt * 7);
      this.char.animator.params.speed = sp;
    } else this.char.animator.params.speed = 0;
    // head tracking: player when close and in front, colleague when talking
    const pp = this.w.playerPos();
    const d = Vector3.Distance(pp, this.pos);
    const a = this.char.animator;
    if (this.talkingWith) a.lookTarget = this.talkingWith.char.headPosition;
    else if (d < 4.5 && Math.abs(pp.y - this.pos.y) < 1) a.lookTarget = pp.add(new Vector3(0, 1.55, 0));
    else a.lookTarget = null;
    this.sync();
    this.char.update(dt);
  }

  private sync(): void { this.char.place(this.pos, this.yaw); }

  // ---------------------------------------------------------------------------------------- activities

  /** Force an activity from gameplay (e.g. dialogue event "chai break"). */
  force(act: Activity | null): void { this.forced = act; if (act) this.beginActivity(act); else this.blockIndex = -2; }

  private beginActivity(act: Activity): void {
    this.activity = act;
    this.talkingWith = null;
    if (act.kind === "leave") { this.walkTo(spotTarget("lobby", this.seed % 5), "AWAY"); return; }
    if (this.state === "AWAY") { this.pos.copyFrom(spotTarget("lobby", this.seed % 5).pos); this.fsm.go("IDLE"); }
    const t = this.chooseTarget(act);
    if (!t) return;
    const seated = t.kind === "seat";
    this.walkTo(t, seated ? "SITTING" : this.stateForActivity(false), act.kind === "work" || act.kind === "arrive");
  }

  private stateForActivity(seated: boolean): NPCState {
    switch (this.activity.kind) {
      case "work": case "arrive": return seated ? (this.seed % 3 === 0 ? "WORKING" : "TYPING") : "IDLE";
      case "meeting": return "IN_MEETING";
      case "standup": return "IN_MEETING";
      case "break": case "lunch": return "ON_BREAK";
      case "chat": return "TALKING";
      case "post": return seated ? "WORKING" : "IDLE";
      default: return "IDLE";
    }
  }

  private chooseTarget(act: Activity): Target | null {
    const seats = this.w.seats;
    const desk = this.homeSeat ? seats.get(this.homeSeat) : undefined;
    switch (act.kind) {
      case "work": case "arrive": case "post":
        if (desk) return seatTarget(desk);
        return spotTarget("lobby", this.seed % 5);
      case "meeting": {
        const free = seats.firstFree(this.w.meetingSeats(act.room).sort((a, b) => ((hash(a) + this.seed) % 7) - ((hash(b) + this.seed) % 7)));
        return free ? seatTarget(seats.get(free)!) : spotTarget("lobby", this.seed % 5);
      }
      case "standup": {
        const dept = this.char.config.department;
        const name = act.spot === "dept" ? `${dept}.standup` : act.spot;
        return spotTarget(name, this.seed % 7, "standup");
      }
      case "break": {
        const spot = act.spot ?? "coffee";
        if (spot === "tables") { const f = seats.firstFree(this.w.breakSeats()); if (f) return seatTarget(seats.get(f)!); }
        return spotTarget(spot === "water" ? "water" : spot === "lounge" ? "lounge" : spot === "bar" ? "bar" : "coffee", this.seed % 6, "break");
      }
      case "lunch": {
        const f = seats.firstFree(this.w.breakSeats().sort((a, b) => ((hash(a) + this.seed) % 5) - ((hash(b) + this.seed) % 5)));
        return f ? seatTarget(seats.get(f)!) : spotTarget(this.seed % 2 ? "bar" : "lounge", this.seed % 6, "lunch");
      }
      case "chat": {
        const mates = this.w.colleagues(this).filter((c) => c.seatId && (c.state === "TYPING" || c.state === "WORKING"));
        const m = mates[this.seed % Math.max(1, mates.length)];
        if (!m) return desk ? seatTarget(desk) : null;
        this.talkingWith = m;
        const s = seats.get(m.seatId!)!;
        const t = seatTarget(s);
        // stand beside the colleague's chair, facing them
        const side = t.approach.clone();
        return { kind: "spot", pos: side, yaw: Math.atan2(t.pos.x - side.x, t.pos.z - side.z), approach: side, label: `chat:${m.id}` };
      }
      case "patrol": return spotTarget(["corridorWindow", "coffee", "lounge", "bar"][Math.floor((this.w.minutes() / 7 + this.seed) % 4)], this.seed % 4, "patrol");
      default: return null;
    }
  }

  // ---------------------------------------------------------------------------------------- motion

  private walkTo(t: Target, then: NPCState, returning = false): void {
    // stand up first if seated
    if (this.seatId) { this.standThen(() => this.walkTo(t, then, returning)); return; }
    this.target = t;
    this.afterArrive = then;
    if (t.kind === "seat" && t.seatId && !this.w.seats.reserve(t.seatId, this.id)) {
      // seat taken: fall back to standing near it
      this.target = { ...t, kind: "spot", seatId: undefined, pos: t.approach.clone() };
      if (then === "SITTING") this.afterArrive = this.stateForActivity(false);
    }
    if (Vector3.Distance(this.pos, this.target.approach) < 0.3) { this.arrive(); return; }
    if (!this.agent) this.agent = this.w.nav.addAgent(this.pos, this.seed % 3 === 0 ? 1.35 : 1.2);
    else this.w.nav.teleport(this.agent, this.pos);
    this.w.nav.goTo(this.agent, this.target.approach);
    this.stuck = 0; this.repaths = 0;
    this.fsm.go(returning ? "RETURNING_TO_DESK" : "WALKING");
  }

  private updateWalk(dt: number): NPCState | void {
    if (!this.agent || !this.target) return "IDLE";
    const d = Vector3.Distance(new Vector3(this.pos.x, 0, this.pos.z), new Vector3(this.target.approach.x, 0, this.target.approach.z));
    if (d < 0.32) { this.arrive(); return; }
    const v = this.w.nav.velocity(this.agent);
    if (Math.hypot(v.x, v.z) < 0.08) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt);
    if (this.stuck > 2.2) {
      // recover: re-path, then nudge, then teleport close to the goal
      this.stuck = 0;
      this.repaths++;
      if (this.repaths <= 2) this.w.nav.goTo(this.agent, this.target.approach);
      else if (this.repaths === 3) this.w.nav.teleport(this.agent, this.pos.add(new Vector3((this.seed % 3) - 1, 0, ((this.seed >> 2) % 3) - 1).scale(0.4)));
      else { this.w.nav.teleport(this.agent, this.target.approach); this.arrive(); }
    }
  }

  private arrive(): void {
    const t = this.target!;
    this.pendingAfterStand = null;
    if (this.agent) { this.pos.copyFrom(this.w.nav.position(this.agent)); this.removeAgent(); }
    if (this.afterArrive === "AWAY") { this.fsm.go("AWAY"); return; }
    if (t.kind === "seat" && t.seatId) {
      this.seatId = t.seatId;
      this.tr = { t: 0, dur: this.char.animator.durations.SitDown ?? 1.1, from: this.pos.clone(), to: t.pos.clone(), fromYaw: this.yaw, toYaw: t.yaw, sitting: true };
      this.char.animator.play("SitDown", 0.25);
      this.fsm.go("SITTING");
      return;
    }
    this.yaw = this.yaw + angDiff(this.yaw, t.yaw);
    this.fsm.go(this.afterArrive === "SITTING" ? this.stateForActivity(false) : this.afterArrive);
  }

  private standThen(cb: () => void): void {
    const s = this.seatId ? this.w.seats.get(this.seatId) : undefined;
    const exit = s ? seatTarget(s).approach : this.pos.clone();
    this.tr = { t: 0, dur: this.char.animator.durations.StandUp ?? 1, from: this.pos.clone(), to: exit, fromYaw: this.yaw, toYaw: this.yaw, sitting: false };
    this.char.animator.play("StandUp", 0.2);
    if (this.seatId) this.w.seats.release(this.seatId, this.id);
    this.seatId = null;
    this.pendingAfterStand = cb;
    this.fsm.go("SITTING");
  }
  private pendingAfterStand: (() => void) | null = null;

  private updateTransition(dt: number): NPCState | void {
    const tr = this.tr;
    tr.t += dt;
    const k = ease(tr.t / (tr.dur * (tr.sitting ? 0.6 : 0.75)));
    Vector3.LerpToRef(tr.from, tr.to, k, this.pos);
    this.yaw = tr.fromYaw + angDiff(tr.fromYaw, tr.toYaw) * ease(tr.t / (tr.dur * 0.5));
    if (tr.t >= tr.dur) {
      if (tr.sitting) return this.stateForActivity(true);
      const cb = this.pendingAfterStand; this.pendingAfterStand = null;
      this.fsm.go("IDLE");
      cb?.();
    }
  }

  // ---------------------------------------------------------------------------------------- states

  private nearPlayer(r = 2.6): boolean {
    const pp = this.w.playerPos();
    return Math.abs(pp.y - this.pos.y) < 1 && Vector3.Distance(pp, this.pos) < r;
  }

  private updateIdle(): NPCState | void {
    if (this.nearPlayer(2.2) && this.fsm.time > 1 && !this.w.playerBusyWith() && this.seed % 2 === 0 && !this.wavedRecently()) return "WAITING_FOR_PLAYER";
    this.microGestures();
  }

  private lastWave = -99;
  private wavedRecently(): boolean { return this.w.minutes() - this.lastWave < 30; }

  private updateWaiting(): NPCState | void {
    if (this.fsm.time > 1.6) this.char.setGesture("none");
    if (!this.nearPlayer(3.2) || this.fsm.time > 6) {
      this.lastWave = this.w.minutes();
      return this.seatId ? this.stateForActivity(true) : "IDLE";
    }
  }

  private updateWorking(dt: number): NPCState | void {
    // typing bursts, pauses, phone checks, stretches — seeded so desks never sync
    this.microT += dt;
    const a = this.char.animator;
    if (this.state === "TYPING" && this.fsm.time > 14 + (this.seed % 17)) return "WORKING";
    if (this.state === "WORKING") {
      if (this.fsm.time > 6 + (this.seed % 7)) { a.setGesture("none"); return "TYPING"; }
      a.setGesture(this.fsm.time > 1.5 && this.fsm.time < 5 && this.seed % 4 === 1 ? "UsingPhone" : "none");
    }
    if (this.nearPlayer(2.4) && this.fsm.time > 2 && !this.wavedRecently() && this.seed % 3 === 0) { this.lastWave = this.w.minutes(); a.setGesture("Waving"); this.waveTimer = 1.6; }
    if (this.waveTimer > 0) { this.waveTimer -= dt; if (this.waveTimer <= 0) a.setGesture("none"); }
  }
  private waveTimer = 0;

  private updateTalking(dt: number): NPCState | void {
    const a = this.char.animator;
    // alternate speaking turns with the colleague
    const turn = Math.floor((this.fsm.time + (this.seed % 5)) / 3.2) % 2 === 0;
    a.talking = turn;
    if (this.talkingWith) {
      const o = this.talkingWith;
      if (!o.seatId || o.inDialogue) { this.talkingWith = null; return; }
      o.char.animator.lookTarget = this.char.headPosition;
      o.char.animator.talking = !turn;
      if (o.state === "TYPING" || o.state === "WORKING") o.char.animator.play(turn ? "SitListening" : "SitTalking", 0.4);
    }
    void dt;
  }

  private updateMeeting(dt: number): NPCState | void {
    const a = this.char.animator;
    // in a meeting someone is always speaking: rotate the speaker role by seed and time
    const slot = Math.floor(this.w.minutes() / 2 + this.seed) % 6;
    const speaking = slot === 0;
    a.talking = speaking;
    if (this.seatId) a.play(speaking ? "SitTalking" : "SitListening", 0.5);
    else a.play(speaking ? "Talking" : "Listening", 0.5);
    void dt;
  }

  private updateBreak(dt: number): NPCState | void {
    this.microT += dt;
    const phase = Math.floor((this.fsm.time + this.seed) / 6) % 4;
    const g: Gesture = this.target?.label === "break" && (this.target.pos.x < 2) ? (phase < 2 ? "DrinkingWater" : "none") : phase === 1 ? "UsingPhone" : "none";
    if (g !== this.micro) { this.micro = g; this.char.setGesture(g); }
    this.char.animator.talking = phase === 3 && !this.seatId;
  }

  private microGestures(): void {
    this.microT += 0.2;
    if (this.microT > this.nextMicro) {
      this.microT = 0;
      this.nextMicro = 5 + ((this.seed + this.fsm.time) % 9);
      const g: Gesture = this.micro === "none" && this.seed % 3 !== 0 ? "UsingPhone" : "none";
      this.micro = g;
      this.char.setGesture(g);
    }
  }

  // ---------------------------------------------------------------------------------------- dialogue

  /** Player started talking to this NPC: stop, face DRAGON, listen. */
  beginDialogue(playerPos: Vector3): void {
    this.inDialogue = true;
    this.talkingWith = null;
    if (this.agent) { this.pos.copyFrom(this.w.nav.position(this.agent)); this.removeAgent(); }
    // standing: turn to DRAGON; seated: swivel the chair toward DRAGON
    const d = playerPos.subtract(this.pos);
    this.yaw = Math.atan2(d.x, d.z);
    this.char.animator.play(this.seatId ? "SitListening" : "Listening", 0.3);
    this.dialogueResume = this.state;
    this.fsm.go("TALKING");
  }
  private dialogueResume: NPCState = "IDLE";

  endDialogue(): void {
    this.inDialogue = false;
    this.char.animator.talking = false;
    this.char.animator.expression = "neutral";
    const seat = this.seatId ? this.w.seats.get(this.seatId) : undefined;
    if (seat) this.yaw = seat.yaw; // swivel back to the desk
    const back = this.dialogueResume === "WALKING" || this.dialogueResume === "RETURNING_TO_DESK" ? null : this.dialogueResume;
    this.blockIndex = -2; // re-evaluate schedule
    if (back && back !== "TALKING") this.fsm.go(back);
  }

  speak(on: boolean): void {
    const a = this.char.animator;
    a.talking = on;
    a.play(this.seatId ? (on ? "SitTalking" : "SitListening") : on ? "Talking" : "Listening", 0.3);
  }

  private removeAgent(): void {
    if (!this.agent) return;
    this.w.nav.crowd.removeAgent(this.agent.index);
    this.agent.node.dispose();
    this.agent = null;
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 10007;
}
