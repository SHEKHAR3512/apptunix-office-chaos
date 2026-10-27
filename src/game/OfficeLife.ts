import { Vector3 } from "@babylonjs/core";
import type { Game } from "../core/Game";
import { hud } from "../core/Store";
import { REACT_DIALOGUES } from "../data/dialogues/react";
import { OFFICE_DIALOGUES } from "../data/dialogues/office";
import { ROSTER, SECURITY } from "../data/characters/roster";
import { floorY } from "../world/OfficeLayout";
import type { Character } from "./characters/CharacterFactory";
import { DialogueManager, DialogueView } from "./dialogue/DialogueManager";
import type { DialogueEvent } from "./dialogue/DialogueData";
import { GameClock, formatTime } from "./GameClock";
import { registerChairInteractions } from "./interactions/ChairInteraction";
import { ComputerScreen } from "./interactions/ComputerInteraction";
import { InteractionManager } from "./interactions/InteractionManager";
import { registerNPCInteractions } from "./interactions/NPCInteraction";
import { SeatRegistry } from "./interactions/SeatRegistry";
import { registerSeats } from "./npc/NPCBehavior";
import type { NPCController } from "./npc/NPCController";
import { NPCManager } from "./npc/NPCManager";

/** Phase 2 systems layered on the Phase 1 world: people, schedules, interactions, dialogue. */
export class OfficeLife {
  readonly clock: GameClock;
  readonly seats = new SeatRegistry();
  readonly interactions = new InteractionManager();
  readonly dialogue = new DialogueManager();
  npcs!: NPCManager;
  computer!: ComputerScreen;
  guard: Character | null = null;
  private talkingTo: NPCController | null = null;
  private actionTimer = 0;
  private overlayCb: (() => void) | null = null;
  computerOpen = false;

  constructor(private readonly g: Game) {
    const start = new URLSearchParams(location.search).get("time") ?? "09:45";
    this.clock = new GameClock(start);
    this.dialogue.now = () => this.clock.minutes;
    this.dialogue.register([...REACT_DIALOGUES, ...OFFICE_DIALOGUES]);
  }

  async init(progress: (v: number, label: string) => void): Promise<void> {
    const g = this.g, ctx = g.ctx;
    registerSeats(ctx.anchors, this.seats);
    progress(0.84, "Baking navigation…");
    this.npcs = new NPCManager(ctx, g.factory, this.seats, this.clock);
    progress(0.86, "Hiring the team…");
    await this.npcs.init(ROSTER);
    // ground-floor security guard: stationary post
    const ga = ctx.anchors.get("lobby.security.chair");
    if (ga) {
      this.guard = g.factory.create(SECURITY, ctx.root(0));
      this.guard.place(ga.position, ga.yaw);
      this.guard.animator.play("Sitting", 0);
    }
    ctx.refreshShadows(g.scenes.activeFloor);

    // player collision with NPC bodies
    g.player.move.bodies = () => (g.scenes.activeFloor === 3 ? this.npcs.bodies() : []);

    // interactions
    registerChairInteractions(this.interactions, this.seats, g.player, (seat) => this.onSeated(seat.id, seat.kind), () => this.onStood());
    registerNPCInteractions(this.interactions, this.npcs.npcs, g.player, (n) => this.startDialogue(n));
    this.registerObjects();

    // DRAGON's computer
    const desk = ctx.anchors.get("react.dragon.desk");
    if (desk) {
      this.computer = new ComputerScreen(ctx, desk, ctx.root(3));
      this.interactions.add({
        id: "computer", type: "computer", radius: 99, facing: false, label: "Use Computer", priority: 3,
        position: () => g.player.pos,
        available: () => g.player.isSeated && g.player.seat?.id === "react.dragon.chair" && !this.computerOpen,
        activate: () => this.openComputer(),
      });
    }

    this.dialogue.onChange = (v) => this.renderDialogue(v);
    this.dialogue.onEvent = (e) => this.handleEvent(e);
  }

  private registerObjects(): void {
    const g = this.g, ctx = g.ctx;
    const y3 = floorY(3);
    const obj = (id: string, label: string, type: "drink" | "coffee" | "read", pos: Vector3, act: () => void, radius = 1.4) =>
      this.interactions.add({ id, label, type, radius, position: () => pos, available: () => g.player.isFree, activate: act });
    const water = ctx.anchors.get("break.waterDispenser");
    if (water) obj("water", "Drink Water", "drink", new Vector3(0.5, y3, 33.35), () => this.playAction("DrinkingWater", new Vector3(0.4, y3 + 1, 33.35), 3.4, "Refreshing. 💧"));
    obj("coffee", "Make Coffee", "coffee", new Vector3(0.45, y3, 28.4), () => this.playAction("Interacting", new Vector3(0.4, y3 + 1, 28.4), 2.0, "Coffee brewing… ☕", () => this.playAction("DrinkingWater", new Vector3(0.4, y3 + 1, 28.4), 3, null)));
    obj("notice", "Read Noticeboard", "read", new Vector3(9.9, y3, 28.0), () => this.showOverlay("Noticeboard", ["🎉 Friday Fun — 5 PM, Lounge", "🎂 Birthday today: Karan!", "💻 Hackathon in November — form teams with HR", "🧹 Please keep the pantry clean", "✨ Welcome to our new joiners", "🏏 Inter-department cricket league sign-ups open"]), 1.8);
    obj("roadmap", "Read Whiteboard", "read", new Vector3(18.6, y3, 6.0), () => this.showOverlay("React Q4 Roadmap", ["✓ Driver app redesign", "✓ Payment retries", "• Ride-share v3", "• Admin analytics", "• Offline mode"]), 1.8);
    // lift call now goes through the interaction system
    for (let L = 0; L < 6; L++) {
      const cp = g.lift.callPoint(L);
      this.interactions.add({ id: `lift:${L}`, type: "lift", label: "Call the lift", radius: 1.6, facing: false, position: () => cp, available: () => g.player.isFree && g.scenes.activeFloor === L && !g.lift.playerInside, activate: () => g.requestLift(L) });
    }
  }

  // ------------------------------------------------------------------------------- actions

  private playAction(gesture: "DrinkingWater" | "Interacting", face: Vector3, dur: number, toast: string | null, then?: () => void): void {
    const p = this.g.player;
    p.lock(face);
    p.char.setGesture(gesture);
    if (toast) hud.set({ toast });
    this.actionTimer = dur;
    this.overlayCb = () => { p.char.setGesture("none"); p.unlock(); hud.set({ toast: null }); then?.(); };
  }

  showOverlay(title: string, lines: string[]): void {
    this.g.player.lock();
    hud.set({ overlay: { title, lines } });
  }

  closeOverlay(): void {
    if (!hud.get().overlay) return;
    hud.set({ overlay: null });
    this.g.player.unlock();
  }

  private onSeated(id: string, kind: string): void {
    const g = this.g;
    if (kind === "meeting") {
      // look toward the room's screen / speaker
      const room = id.split(".")[0];
      const front: Record<string, Vector3> = { cr1: new Vector3(10.3, floorY(3) + 1.6, 29.6), cr2: new Vector3(29.8, floorY(3) + 1.5, 30), cr3: new Vector3(35.8, floorY(3) + 1.5, 28.6) };
      g.player.char.animator.lookTarget = front[room] ?? null;
      g.player.char.animator.play("SitListening", 0.4);
      hud.set({ toast: `Joined ${room.toUpperCase()} — meeting events arrive in Phase 3` });
      this.actionTimer = 3; this.overlayCb = () => hud.set({ toast: null });
      g.emit("meeting:joined", { room });
    }
  }

  private onStood(): void { this.g.player.char.animator.lookTarget = null; }

  openComputer(): void {
    const g = this.g;
    this.computerOpen = true;
    this.computer.powerOn();
    g.cam.setScripted(this.computer.viewPos, this.computer.viewTarget);
    g.player.char.animator.play("Typing", 0.4);
    g.input.releasePointer();
    hud.set({ computer: this.computer.state === "desktop" ? "desktop" : "booting" });
    this.computer.onStateChange = (s) => hud.set({ computer: s });
  }

  closeComputer(): void {
    if (!this.computerOpen) return;
    this.computerOpen = false;
    this.g.cam.setScripted(null);
    this.g.player.char.animator.play("Sitting", 0.4);
    hud.set({ computer: null });
  }

  // ------------------------------------------------------------------------------- dialogue

  startDialogue(n: NPCController): void {
    const g = this.g;
    const id = n.char.config.dialogue && this.dialogue.has(n.char.config.dialogue) ? n.char.config.dialogue : `${n.char.config.department}_generic`;
    if (!this.dialogue.has(id)) return;
    this.talkingTo = n;
    this.npcs.playerBusyWith = n.id;
    n.beginDialogue(g.player.pos);
    g.player.lock(n.pos);
    g.input.releasePointer();
    this.frameConversation(n);
    g.player.char.animator.lookTarget = n.char.headPosition;
    this.dialogue.start(id);
  }

  /**
   * Over-the-shoulder two-shot: camera behind DRAGON's shoulder, offset to the side and
   * looking at the NPC's face, so the speaker is readable. Tries both shoulders and several
   * distances; keeps the one with a clear line of sight (no walls/partitions in between).
   */
  private frameConversation(n: NPCController): void {
    const g = this.g;
    const a = g.player.pos, b = n.pos;
    const d = b.subtract(a); d.y = 0;
    const dist = Math.max(0.6, d.length());
    d.normalize();
    const side = new Vector3(d.z, 0, -d.x);
    const face = n.char.headPosition.subtract(new Vector3(0, 0.08, 0));
    const lookAt = Vector3.Lerp(face, a.add(new Vector3(0, 1.45, 0)), 0.18);
    let best: { pos: Vector3; score: number } | null = null;
    for (const s of [1, -1]) for (const back of [1.0, 0.7, 0.4]) {
      const pos = a.add(d.scale(-back)).add(side.scale(s * (0.8 + dist * 0.3))).add(new Vector3(0, 1.5, 0));
      const head = a.add(new Vector3(0, 1.5, 0));
      const toCam = pos.subtract(head);
      const free = g.ctx.colliders.raycast(head, toCam.normalize(), toCam.length() + 0.2);
      const toFace = face.subtract(pos);
      const los = g.ctx.colliders.raycast(pos, toFace.clone().normalize(), toFace.length(), (c) => c.blocksCamera || c.tag === "furniture" && c.maxY > face.y - 0.3);
      const score = (free >= toCam.length() ? 2 : 0) + (los >= toFace.length() - 0.1 ? 3 : 0) + back * 0.5 + (s > 0 ? 0.1 : 0);
      if (!best || score > best.score) best = { pos, score };
    }
    g.cam.setScripted(best!.pos, lookAt);
  }

  private speakerName(id: string): string {
    if (id === "player") return "DRAGON";
    if (id === "$npc") return this.talkingTo?.char.config.name ?? "";
    return this.npcs.get(id)?.char.config.name ?? id;
  }

  private renderDialogue(v: DialogueView | null): void {
    const g = this.g, n = this.talkingTo;
    if (!v) {
      hud.set({ dialogue: null });
      if (n) n.endDialogue();
      this.talkingTo = null;
      this.npcs.playerBusyWith = null;
      g.player.unlock();
      g.player.char.animator.lookTarget = null;
      g.player.char.animator.talking = false;
      g.player.char.animator.expression = "neutral";
      g.player.char.animator.play("Locomotion", 0.3);
      g.cam.setScripted(null);
      return;
    }
    const sp = v.node.speaker;
    const playerSpeaks = sp === "player";
    const pa = g.player.char.animator;
    pa.talking = playerSpeaks;
    pa.play(playerSpeaks ? "Talking" : "Listening", 0.3);
    if (playerSpeaks && v.node.expression) pa.expression = v.node.expression;
    if (n) {
      n.speak(!playerSpeaks);
      if (!playerSpeaks && v.node.expression) n.char.animator.expression = v.node.expression;
    }
    const dept = n?.char.config.department ?? "react";
    hud.set({ dialogue: { speaker: this.speakerName(sp), isPlayer: playerSpeaks, text: v.node.text.replace("$name", "Dragon"), choices: v.choices.map((c) => c.text), dept } });
  }

  advanceDialogue(choice?: number): void { this.dialogue.advance(choice); }

  private handleEvent(e: DialogueEvent): void {
    if (e.type === "npcActivity") {
      const n = this.npcs.get(e.npc);
      if (n && e.activity === "break") {
        // leaves after the conversation closes
        setTimeout(() => n.force({ kind: "break", spot: (e.spot as "coffee") ?? "coffee" }), 400);
        setTimeout(() => n.force(null), 90_000);
      }
    } else if (e.type === "gesture") {
      const target = e.speaker === "player" ? this.g.player.char : this.npcs.get(e.speaker)?.char;
      if (target) { target.setGesture(e.gesture); setTimeout(() => target.setGesture("none"), 1800); }
    } else if (e.type === "expression") {
      const c = e.speaker === "player" ? this.g.player.char : this.npcs.get(e.speaker)?.char;
      if (c) c.animator.expression = e.expression;
    }
    this.g.emit(`dialogue:${e.type}`, e as unknown as Record<string, unknown>);
  }

  // ------------------------------------------------------------------------------- frame

  update(dt: number): void {
    const g = this.g;
    if (!hud.get().paused) this.clock.tick(dt);
    this.npcs.activeFloor = g.scenes.activeFloor;
    this.npcs.playerPos.copyFrom(g.player.pos);
    this.npcs.paused = !!hud.get().paused;
    this.npcs.update(dt, g.camera.position);
    if (this.guard && g.scenes.activeFloor === 0) {
      this.guard.animator.lookTarget = Vector3.Distance(g.player.pos, this.guard.position) < 5 ? g.player.pos.add(new Vector3(0, 1.55, 0)) : null;
      this.guard.update(dt);
    }
    this.computer?.update(dt);
    if (this.actionTimer > 0) { this.actionTimer -= dt; if (this.actionTimer <= 0) { const cb = this.overlayCb; this.overlayCb = null; cb?.(); } }
    // interactions (only when free or seated and nothing modal is open)
    const modal = !!hud.get().dialogue || this.computerOpen || !!hud.get().overlay || g.cam.mode === "fly";
    this.interactions.enabled = !modal && !g.lift.playerInside;
    this.interactions.update(g.player.pos, g.player.yaw);
    const clockLabel = formatTime(this.clock.minutes);
    if (hud.get().clock !== clockLabel) hud.set({ clock: clockLabel });
  }

  handleKeys(): void {
    const i = this.g.input;
    if (hud.get().dialogue) {
      const choices = hud.get().dialogue!.choices;
      for (let k = 0; k < choices.length; k++) if (i.hit(`Digit${k + 1}`)) { this.advanceDialogue(k); return; }
      if (!choices.length && (i.hit("KeyE") || i.hit("Space") || i.hit("Enter"))) this.advanceDialogue();
      return;
    }
    if (hud.get().overlay) { if (i.hit("KeyE") || i.hit("Escape") || i.hit("Space")) this.closeOverlay(); return; }
    if (this.computerOpen) { if (i.hit("Escape")) this.closeComputer(); return; }
    if (i.hit("KeyE")) this.interactions.press("E");
    if (i.hit("KeyX")) this.interactions.press("X");
  }

  /** Lightweight state dump for tests and the debug overlay. */
  snapshot(): Record<string, unknown> {
    return {
      time: formatTime(this.clock.minutes),
      npcs: this.npcs.npcs.map((n) => ({ id: n.id, dept: n.char.config.department, state: n.state, activity: n.activity.kind, seat: n.seatId, x: +n.pos.x.toFixed(2), y: +n.pos.y.toFixed(2), z: +n.pos.z.toFixed(2), hidden: n.hidden })),
    };
  }
}
