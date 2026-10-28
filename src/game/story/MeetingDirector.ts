import { Vector3 } from "@babylonjs/core";
import type { Game } from "../../core/Game";
import { hud } from "../../core/Store";
import type { NPCController } from "../npc/NPCController";
import type { CutsceneDirector } from "./CutsceneDirector";

export interface MeetingDef { id: string; room: "cr1" | "cr2" | "cr3"; participants: string[]; lead: string; conversation: string; timeout: number }

export const MEETINGS: Record<string, MeetingDef> = {
  standup: { id: "standup", room: "cr1", participants: ["tushar", "mohit", "arpit", "vibhu", "rockey", "karan"], lead: "tushar", conversation: "m2_standup", timeout: 22 },
};

export interface ParticipantStatus { id: string; seatedInRoom: boolean }

/** Pure readiness rule: everyone seated, or the timeout passed (late people are snapped into seats). */
export function meetingReadiness(ps: ParticipantStatus[], elapsed: number, timeout: number): { ready: boolean; late: string[] } {
  const late = ps.filter((p) => !p.seatedInRoom).map((p) => p.id);
  return { ready: late.length === 0 || elapsed >= timeout, late };
}

type Phase = "idle" | "gathering" | "running" | "done";

/**
 * Runs a meeting: send participants to the room (they pick free seats themselves via the
 * seat registry), wait for the player to sit, handle late or blocked participants, run the
 * multi-speaker conversation with meeting camera shots, then release everyone to their
 * schedules.
 */
export class MeetingDirector {
  phase: Phase = "idle";
  def: MeetingDef | null = null;
  private elapsed = 0;
  private waitingToast = 0;
  onEnded: (id: string) => void = () => {};

  constructor(private readonly g: Game, private readonly cut: CutsceneDirector) {}

  private npc(id: string): NPCController | undefined { return this.g.life.npcs.get(id); }

  prepare(id: string): void {
    const d = MEETINGS[id]; if (!d) return;
    this.def = d; this.phase = "gathering"; this.elapsed = 0;
    for (const p of d.participants) this.npc(p)?.force({ kind: "meeting", room: d.room });
  }

  status(): ParticipantStatus[] {
    const d = this.def!;
    return d.participants.map((id) => { const n = this.npc(id); return { id, seatedInRoom: !!n?.seatId?.startsWith(`${d.room}.`) && n.state !== "SITTING" }; });
  }

  private playerSeatedInRoom(): boolean {
    const p = this.g.player;
    return p.isSeated && !!p.seat?.id.startsWith(`${this.def!.room}.`);
  }

  update(dt: number): void {
    if (this.phase !== "gathering" || !this.def) return;
    this.elapsed += dt;
    if (!this.playerSeatedInRoom()) return;
    const { ready, late } = meetingReadiness(this.status(), this.elapsed, this.def.timeout);
    if (!ready) {
      this.waitingToast -= dt;
      if (this.waitingToast <= 0) { hud.set({ toast: `Waiting for the team… (${late.length} on the way)` }); this.waitingToast = 3; }
      return;
    }
    hud.set({ toast: null });
    // late or blocked participants are seated directly in the remaining free chairs
    for (const id of late) {
      const n = this.npc(id); if (!n) continue;
      const free = this.g.life.seats.inZone(this.def.room, "meeting").find((s) => this.g.life.seats.isFree(s.id));
      if (free) n.snapToSeat(free.id);
    }
    this.run();
  }

  private run(): void {
    const d = this.def!;
    const people = d.participants.map((id) => this.npc(id)).filter((n): n is NPCController => !!n);
    const lead = this.npc(d.lead) ?? people[0];
    this.phase = "running";
    this.g.bus.emit("MEETING_STARTED", { meeting: d.id });
    this.g.sfx("meeting");
    this.cut.meetingWide(d.room);
    this.g.life.sceneCamera = (speaker, shot) => {
      if (shot === "wide") this.cut.meetingWide(d.room);
      else if (speaker === "player") this.cut.meetingSpeaker(d.room, this.g.player.char);
      else { const n = this.npc(speaker); if (n) this.cut.meetingSpeaker(d.room, n.char); }
    };
    this.g.life.onSceneEnd = (conv) => { if (conv === d.conversation) this.end(); };
    this.g.life.startScene(d.conversation, people, lead);
    // the player looks at the lead between lines
    this.g.player.char.animator.lookTarget = lead.char.headPosition;
  }

  end(): void {
    const d = this.def; if (!d) return;
    this.phase = "done";
    this.g.life.sceneCamera = null;
    this.g.life.onSceneEnd = null;
    this.cut.release();
    this.g.bus.emit("MEETING_ENDED", { meeting: d.id });
    // everyone heads back to their schedules after a beat
    setTimeout(() => { for (const p of d.participants) this.npc(p)?.force(null); }, 1500);
    this.onEnded(d.id);
    this.def = null;
  }

  cancel(): void {
    if (!this.def) return;
    for (const p of this.def.participants) this.npc(p)?.force(null);
    this.phase = "idle"; this.def = null;
  }

  /** for the waypoint / tests */
  get roomCentre(): Vector3 | null { return null; }
}
