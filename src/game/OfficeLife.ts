import { Vector3 } from "@babylonjs/core";
import type { Game } from "../core/Game";
import { hud } from "../core/Store";
import { REACT_DIALOGUES } from "../data/dialogues/react";
import { OFFICE_DIALOGUES } from "../data/dialogues/office";
import { CHAPTER1_DIALOGUES } from "../data/dialogues/chapter1";
import { SIDE_DIALOGUES } from "../data/dialogues/side";
import type { GameEventType } from "./gameplay/GameEventBus";
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
  /** Story hook: mission-specific conversation for an NPC (null → default). */
  dialogueOverride: (npcId: string) => string | null = () => null;
  /** True when a live objective needs this NPC (they stay talkable while seated). */
  npcWanted: (npcId: string) => number = () => 0;
  /** Story hook: camera for a dialogue node in a scene (meetings / cutscenes). */
  sceneCamera: ((speaker: string, shot: string | undefined) => void) | null = null;
  /** Participants of a multi-speaker scene (meeting, finale). */
  private scene: NPCController[] = [];
  private sceneConv: string | null = null;
  onSceneEnd: ((conversation: string) => void) | null = null;

  constructor(private readonly g: Game) {
    const start = new URLSearchParams(location.search).get("time") ?? "09:45";
    this.clock = new GameClock(start);
    this.dialogue.now = () => this.clock.minutes;
    this.dialogue.register([...REACT_DIALOGUES, ...OFFICE_DIALOGUES, ...CHAPTER1_DIALOGUES, ...SIDE_DIALOGUES]);
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
    registerChairInteractions(this.interactions, this.seats, g.player, (seat) => this.onSeated(seat.id, seat.kind), (seat) => this.onStood(seat.id));
    registerNPCInteractions(this.interactions, this.npcs.npcs, g.player, (n) => this.startDialogue(n), (id) => this.npcWanted(id));
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
    this.dialogue.onChoice = (conversation, node, choice) => g.bus.emit("DIALOGUE_CHOICE", { conversation, node, choice });
  }

  private registerObjects(): void {
    const g = this.g, ctx = g.ctx;
    const y3 = floorY(3);
    const obj = (id: string, label: string, type: "drink" | "coffee" | "read", pos: Vector3, act: () => void, radius = 1.4) =>
      this.interactions.add({ id, label, type, radius, position: () => pos, available: () => g.player.isFree, activate: () => { act(); g.bus.emit("OBJECT_INTERACTED", { object: id }); } });
    const water = ctx.anchors.get("break.waterDispenser");
    if (water) obj("water", "Drink Water", "drink", new Vector3(0.5, y3, 33.35), () => this.playAction("DrinkingWater", new Vector3(0.4, y3 + 1, 33.35), 3.4, "Refreshing. 💧"));
    obj("coffee", "Make Coffee", "coffee", new Vector3(0.45, y3, 28.4), () => this.playAction("Interacting", new Vector3(0.4, y3 + 1, 28.4), 2.0, "Coffee brewing… ☕", () => this.playAction("DrinkingWater", new Vector3(0.4, y3 + 1, 28.4), 3, null)));
    obj("notice", "Read Noticeboard", "read", new Vector3(9.9, y3, 28.0), () => this.showOverlay("Noticeboard", ["🎉 Friday Fun — 5 PM, Lounge", "🎂 Birthday today: Karan!", "💻 Hackathon in November — form teams with HR", "🧹 Please keep the pantry clean", "✨ Welcome to our new joiners", "🏏 Inter-department cricket league sign-ups open"]), 1.8);
    obj("roadmap", "Read Whiteboard", "read", new Vector3(18.6, y3, 6.0), () => this.showOverlay("React · Sprint 42 & Q4 roadmap", ["Sprint 42 (fictional): APX-301 cart fix · APX-288 retry backoff · Storybook variants", "Sprint goal: “Checkout that just works” 🎯", "Q4: ✓ Driver app redesign · ✓ Payment retries · • Ride-share v3 · • Admin analytics · • Offline mode"]), 1.8);
    // lift call now goes through the interaction system
    for (let L = 0; L < 6; L++) {
      const cp = g.lift.callPoint(L);
      this.interactions.add({ id: `lift:${L}`, type: "lift", label: "Call the lift", radius: 1.6, facing: false, position: () => cp, available: () => g.player.isFree && g.scenes.activeFloor === L && !g.lift.playerInside, activate: () => g.requestLift(L, "call") });
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
    const zone = this.seats.get(id)?.zone ?? "";
    g.bus.emit("PLAYER_SAT", { seat: id, zone: zone.split(".")[0] });
    if (kind === "meeting") {
      // look toward the room's screen / speaker
      const room = id.split(".")[0];
      const front: Record<string, Vector3> = { cr1: new Vector3(10.3, floorY(3) + 1.6, 29.6), cr2: new Vector3(29.8, floorY(3) + 1.5, 30), cr3: new Vector3(35.8, floorY(3) + 1.5, 28.6) };
      g.player.char.animator.lookTarget = front[room] ?? null;
      g.player.char.animator.play("SitListening", 0.4);
      g.bus.emit("MEETING_JOINED", { room });
    }
  }

  private onStood(seat?: string): void { this.g.player.char.animator.lookTarget = null; this.g.bus.emit("PLAYER_STOOD", { seat: seat ?? "" }); }

  openComputer(): void {
    const g = this.g;
    this.computerOpen = true;
    this.computer.powerOn();
    g.cam.setScripted(this.computer.viewPos, this.computer.viewTarget);
    g.player.char.animator.play("Typing", 0.4);
    g.input.releasePointer();
    hud.set({ computer: this.computer.state === "desktop" ? "desktop" : "booting" });
    this.computer.onStateChange = (s) => hud.set({ computer: s });
    g.bus.emit("COMPUTER_STARTED", {});
  }

  closeComputer(): void {
    if (!this.computerOpen) return;
    this.computerOpen = false;
    this.g.cam.setScripted(null);
    this.g.player.char.animator.play("Sitting", 0.4);
    hud.set({ computer: null });
    this.g.bus.emit("COMPUTER_CLOSED", {});
  }

  // ------------------------------------------------------------------------------- dialogue

  startDialogue(n: NPCController): void {
    const g = this.g;
    const ov = this.dialogueOverride(n.id);
    const id = ov && this.dialogue.has(ov) ? ov : n.char.config.dialogue && this.dialogue.has(n.char.config.dialogue) ? n.char.config.dialogue : `${n.char.config.department}_generic`;
    if (!this.dialogue.has(id)) return;
    this.scene = [n];
    this.sceneConv = id;
    g.bus.emit("NPC_DIALOGUE_STARTED", { npc: n.id, conversation: id });
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
   * Multi-speaker scene (meeting, finale): every participant listens/looks at whoever speaks,
   * the camera is driven per node by `sceneCamera`. Participants keep their seats/places.
   */
  startScene(conversation: string, participants: NPCController[], primary: NPCController): boolean {
    const g = this.g;
    if (!this.dialogue.has(conversation) || this.dialogue.active) return false;
    this.scene = participants;
    this.sceneConv = conversation;
    this.talkingTo = primary;
    this.npcs.playerBusyWith = primary.id;
    for (const n of participants) n.beginDialogue(g.player.pos, true);
    g.player.lock();
    g.input.releasePointer();
    g.bus.emit("NPC_DIALOGUE_STARTED", { npc: primary.id, conversation });
    this.dialogue.start(conversation);
    return true;
  }

  /** A conversation with no NPC (DRAGON reading or thinking), e.g. a whiteboard riddle. */
  startSolo(conversation: string): boolean {
    const g = this.g;
    if (!this.dialogue.has(conversation) || this.dialogue.active) return false;
    this.scene = []; this.sceneConv = conversation; this.talkingTo = null;
    g.player.lock();
    g.input.releasePointer();
    this.dialogue.start(conversation);
    return true;
  }

  get inScene(): boolean { return this.scene.length > 1; }

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
      const conv = this.sceneConv, members = this.scene;
      for (const m of members) { m.endDialogue(); m.char.animator.lookTarget = null; }
      if (n && !members.includes(n)) n.endDialogue();
      this.scene = []; this.sceneConv = null;
      if (n && conv) g.bus.emit("NPC_DIALOGUE_COMPLETED", { npc: n.id, conversation: conv });
      if (conv && members.length > 1) this.onSceneEnd?.(conv);
      this.talkingTo = null;
      this.npcs.playerBusyWith = null;
      g.player.unlock();
      g.player.char.animator.lookTarget = null;
      g.player.char.animator.talking = false;
      g.player.char.animator.expression = "neutral";
      if (g.player.mode === "locked") g.player.char.animator.play("Locomotion", 0.3);
      else if (g.player.isSeated) g.player.char.animator.play("Sitting", 0.3);
      g.cam.setScripted(null);
      return;
    }
    const sp = v.node.speaker;
    const playerSpeaks = sp === "player";
    const pa = g.player.char.animator;
    pa.talking = playerSpeaks;
    const seated = g.player.isSeated;
    pa.play(seated ? (playerSpeaks ? "SitTalking" : "SitListening") : playerSpeaks ? "Talking" : "Listening", 0.3);
    if (playerSpeaks && v.node.expression) pa.expression = v.node.expression;
    // who is speaking: "$npc" = primary, else an explicit character id
    const speakerNpc = playerSpeaks ? null : sp === "$npc" ? n : (this.scene.find((m) => m.id === sp) ?? (n && n.id === sp ? n : null));
    const members = this.scene.length ? this.scene : n ? [n] : [];
    const speakerHead = speakerNpc ? speakerNpc.char.headPosition : g.player.char.headPosition;
    for (const m of members) {
      const me = m === speakerNpc;
      m.speak(me);
      if (me && v.node.expression) m.char.animator.expression = v.node.expression;
      m.char.animator.lookTarget = me ? g.player.char.headPosition : speakerHead;
    }
    pa.lookTarget = speakerNpc ? speakerNpc.char.headPosition : n ? n.char.headPosition : null;
    if (this.sceneCamera && members.length > 1) this.sceneCamera(speakerNpc ? speakerNpc.id : "player", v.node.camera);
    const dept = (speakerNpc ?? n)?.char.config.department ?? "react";
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
    if (e.type === "emit") {
      const known = ["TASK_ACCEPTED", "QA_BUG_REPRODUCED", "BUILD_TESTS_PASSED", "DEPLOYMENT_COMPLETED"];
      if (known.includes(e.name)) this.g.bus.emit(e.name as GameEventType, (e.data ?? {}) as never);
      else if (e.name !== "dialogueEnded") this.g.bus.emit("STORY_EVENT", { id: e.name });
    }
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
    const modal = !!hud.get().dialogue || this.computerOpen || !!hud.get().overlay || g.cam.mode === "fly" || !!g.story?.overlayActive || !!g.story?.finaleRunning;
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
