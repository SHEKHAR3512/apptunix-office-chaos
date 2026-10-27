import { Vector3 } from "@babylonjs/core";
import type { CharacterConfig } from "../characters/CharacterConfig";
import type { CharacterFactory } from "../characters/CharacterFactory";
import type { GameClock } from "../GameClock";
import type { SeatRegistry } from "../interactions/SeatRegistry";
import type { WorldContext } from "../../world/WorldContext";
import { floorY } from "../../world/OfficeLayout";
import { NPCController, NPCWorld } from "./NPCController";
import { NPCNavigation } from "./NPCNavigation";

/**
 * Owns every NPC on the Apptunix floor. Throttling: behaviour "thinks" at 10 Hz (near) to
 * 2 Hz (far); animation runs every frame near the camera and every 2nd/4th frame further away.
 * When the player is on another storey the floor is hidden and NPCs only advance their schedule.
 */
export class NPCManager {
  readonly npcs: NPCController[] = [];
  readonly byId = new Map<string, NPCController>();
  readonly nav: NPCNavigation;
  private thinkAcc = new Map<NPCController, number>();
  private frame = 0;
  activeFloor = -1;
  paused = false;
  playerPos = new Vector3();
  playerBusyWith: string | null = null;
  stats = { thinking: 0, animating: 0 };

  constructor(private readonly ctx: WorldContext, private readonly factory: CharacterFactory, readonly seats: SeatRegistry, private readonly clock: GameClock) {
    this.nav = new NPCNavigation(ctx.scene);
  }

  async init(roster: CharacterConfig[]): Promise<void> {
    await this.nav.build(this.ctx.colliders, floorY(3), { x0: 0, z0: 0, x1: 48, z1: 34 });
    const world: NPCWorld = {
      nav: this.nav,
      seats: this.seats,
      minutes: () => this.clock.minutes,
      playerPos: () => this.playerPos,
      playerBusyWith: () => this.playerBusyWith,
      colleagues: (n) => this.npcs.filter((o) => o !== n && o.char.config.department === n.char.config.department),
      meetingSeats: (room) => this.seats.inZone(room, "meeting").map((s) => s.id),
      breakSeats: () => this.seats.all().filter((s) => s.kind === "break").map((s) => s.id),
    };
    for (const cfg of roster) {
      const floor = cfg.floor ?? 3;
      const char = this.factory.create(cfg, this.ctx.root(floor));
      const npc = new NPCController(cfg.id, char, world);
      this.npcs.push(npc);
      this.byId.set(cfg.id, npc);
    }
    // seat everyone where the schedule says they should be right now
    for (const n of this.npcs) n.snapToSchedule();
  }

  get(id: string): NPCController | undefined { return this.byId.get(id); }

  /** Bodies the player collides with (standing NPCs on the same storey). */
  bodies(): { x: number; z: number; r: number; y: number }[] {
    const out = [];
    for (const n of this.npcs) if (!n.hidden && !n.seatId) out.push({ x: n.pos.x, z: n.pos.z, r: 0.26, y: n.pos.y });
    return out;
  }

  /** Positions that should open automatic doors. */
  doorTriggers(): Vector3[] {
    const out: Vector3[] = [];
    for (const n of this.npcs) if (!n.hidden && (n.state === "WALKING" || n.state === "RETURNING_TO_DESK")) out.push(n.pos);
    return out;
  }

  update(dt: number, cameraPos: Vector3): void {
    if (this.paused) return;
    this.frame++;
    const onFloor = this.activeFloor === 3;
    // off-floor: nothing visible to simulate — positions are re-resolved by catchUp() on arrival
    if (!onFloor) return;
    this.nav.update(dt);
    let thinking = 0, animating = 0;
    for (const n of this.npcs) {
      const d = onFloor ? Vector3.Distance(cameraPos, n.pos) : 999;
      // behaviour tick rate by distance
      const hz = d < 12 ? 10 : d < 25 ? 5 : 2;
      const acc = (this.thinkAcc.get(n) ?? 0) + dt;
      if (acc >= 1 / hz) { n.think(acc); this.thinkAcc.set(n, 0); thinking++; }
      else this.thinkAcc.set(n, acc);
      if (!onFloor || n.hidden) continue;
      n.char.setLod(d);
      // animation every frame when close; walking NPCs always update for smooth motion
      const walking = n.agent !== null;
      const every = d < 14 || walking ? 1 : d < 26 ? 2 : 4;
      if ((this.frame + (n.seed % every)) % every === 0) { n.animate(dt * every); animating++; }
    }
    this.stats = { thinking, animating };
  }

  /** Arriving on the floor after being away: resolve positions from the schedule instantly. */
  catchUp(): void {
    for (const n of this.npcs) if (!n.inDialogue) n.snapToSchedule();
  }
}
