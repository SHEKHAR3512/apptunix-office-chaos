import { Vector3 } from "@babylonjs/core";
import type { Game } from "../../core/Game";
import { hud } from "../../core/Store";
import { formatTime } from "../GameClock";
import type { ZoneKey } from "../gameplay/GameEventBus";
import { play, pushNotice, MissionView } from "../gameplay/PlayState";
import { ProgressionManager } from "../gameplay/ProgressionManager";
import { DeveloperComputer } from "../minigames/DeveloperComputer";
import { MissionManager } from "../missions/MissionManager";
import { MISSIONS } from "../missions/MissionRegistry";
import type { MarkerTarget, MissionDef, StoryAction } from "../missions/MissionTypes";
import type { NPCController } from "../npc/NPCController";
import { SPOTS } from "../npc/NPCBehavior";
import { SaveManager } from "../persistence/SaveManager";
import { SAVE_VERSION, SaveData } from "../persistence/SaveSchema";
import { floorY, ZONES } from "../../world/OfficeLayout";
import { CutsceneDirector } from "./CutsceneDirector";
import { MeetingDirector } from "./MeetingDirector";
import { OfficeEventScheduler } from "./OfficeEventScheduler";
import { WaypointMarker } from "./WaypointMarker";
import { ZoneTracker } from "./ZoneTracker";

const NAMES: Record<string, string> = { tushar: "Tushar", mohit: "Mohit", shruti: "Shruti (QA)", rockey: "Rockey", karan: "Karan", vibhu: "Vibhu", vikram: "Vikram (DevOps)" };
const ZONE_CENTRE: Partial<Record<ZoneKey, { x: number; z: number; floor: number }>> = { lobby_g: { x: 10.6, z: 7, floor: 0 } };

/**
 * Glue between the pure gameplay core and the 3D office. Executes mission story actions,
 * translates world state into typed events, owns meetings, cutscenes, narrative time,
 * waypoints and save/load. Missions themselves never reference rendering.
 */
export class StoryDirector {
  readonly missions: MissionManager;
  readonly progression: ProgressionManager;
  readonly computer: DeveloperComputer;
  readonly cut: CutsceneDirector;
  readonly meetings: MeetingDirector;
  readonly scheduler: OfficeEventScheduler;
  readonly saves = new SaveManager();
  private zones: ZoneTracker;
  private marker!: WaypointMarker;
  mode: "title" | "story" | "sandbox" = "sandbox";
  chapterComplete = false;
  playTime = 0;
  private timers: { t: number; fn: () => void }[] = [];
  private autosaveT = 0;
  private dirty = false;
  private zoneT = 0;
  finaleRunning = false;
  private overlayOpen: "qa" | "console" | null = null;

  constructor(private readonly g: Game) {
    const life = g.life;
    this.progression = new ProgressionManager(life.dialogue.flags);
    this.missions = new MissionManager(MISSIONS, g.bus);
    this.computer = new DeveloperComputer(g.bus, this.progression, (s) => g.sfx(s));
    this.cut = new CutsceneDirector(g);
    this.meetings = new MeetingDirector(g, this.cut);
    this.scheduler = new OfficeEventScheduler(life.clock);
    this.zones = new ZoneTracker((zone, floor) => g.bus.emit("PLAYER_ENTERED_ZONE", { zone, floor }));
    this.missions.onRewards = (m) => this.reward(m);
  }

  async init(): Promise<void> {
    const g = this.g;
    this.marker = new WaypointMarker(g.ctx);
    await this.saves.init();
    const save = await this.saves.load();
    play.set({ hasSave: !!save, saveInfo: save ? this.describe(save) : "", saveStatus: this.saves.status.ok ? "" : this.saves.status.message });
    this.registerInspectables();
    this.registerDetails();
    g.life.dialogueOverride = (npc) => this.conversationFor(npc);
    // 2 = the current required objective needs them, 1 = an optional objective does
    g.life.npcWanted = (npc) => {
      if (this.mode !== "story") return 0;
      let w = 0;
      for (const m of this.missions.active) for (const o of this.missions.live(m.id)) if (o.target.npc === npc) w = Math.max(w, o.optional ? 1 : 2);
      // someone offering a side job can be approached at their desk too
      if (!w && this.missions.defs.some((d) => d.category === "side" && d.trigger?.npc === npc && this.missions.state(d.id) === "AVAILABLE")) w = 1;
      return w;
    };
    g.life.npcs.busy = (id) => g.life.npcWanted(id) >= 2 || this.missions.active.some((m) => m.targetNpcs.includes(id) && m.category === "story");
    const bus = g.bus;
    bus.on("MISSION_STARTED", ({ mission }) => this.onMissionStarted(mission));
    // story beats are sticky so an objective that goes live later (or after a reload) still sees them
    bus.on("STORY_EVENT", ({ id }) => { if (!g.life.dialogue.flags.get(`story.${id}`)) { g.life.dialogue.flags.set(`story.${id}`, true); this.dirty = true; } });
    bus.on("STORY_EVENT", ({ id }) => { if (id.startsWith("accept_")) this.after(0.3, () => this.startSide(id.slice(7))); });
    bus.on("OBJECTIVE_ACTIVATED", () => { this.recheck(); this.view(); });
    bus.on("OBJECTIVE_COMPLETED", ({ mission, objective, optional }) => {
      const d = this.missions.def(mission)!;
      const o = d.objectives.find((x) => x.id === objective)!;
      g.sfx("objective");
      pushNotice(optional ? "✦" : "✓", o.text, "objective", 2600);
      this.run(d.onObjective?.[objective] ?? []);
      this.view(); this.dirty = true;
    });
    bus.on("MISSION_COMPLETED", ({ mission }) => {
      const d = this.missions.def(mission)!;
      pushNotice("🏁", `${d.category === "side" ? "Side job" : "Mission"} complete — ${d.title}`, "mission", 3600);
      this.run(d.onComplete ?? []);
      this.view(); this.dirty = true;
      this.saveNow();
    });
    bus.on("MISSION_AVAILABLE", ({ mission }) => {
      const d = this.missions.def(mission)!;
      if (this.mode === "story" && d.autoStart && !this.missions.activeStory && !this.finaleRunning) this.after(3, () => { if (!this.missions.activeStory) this.missions.start(mission); });
    });
    bus.on("PUZZLE_SOLVED", ({ puzzle }) => { if (puzzle === "qa_reproduce" || puzzle === "qa_side_small") this.after(2.2, () => this.closeOverlay()); });
    bus.on("CHAT_RECEIVED", () => g.sfx("chat"));
    window.addEventListener("visibilitychange", () => { if (document.hidden && this.mode === "story") void this.saveNow(); });
    // end-of-day announcement once the chapter is done
    this.scheduler.at("18:30", () => { if (this.chapterComplete) pushNotice("📢", "18:30 — Office closing soon. Great work today! (fictional)", "info", 5000); });
  }

  // ------------------------------------------------------------------ game flow

  startSandbox(): void { this.mode = "sandbox"; play.set({ mode: "sandbox", mission: null }); }

  newGame(): void {
    const g = this.g;
    this.mode = "story";
    play.set({ mode: "story" });
    g.teleportToFloor(0, new Vector3(8.2, 0, -6.4), 0);
    this.missions.refreshAvailability();
    pushNotice("🧭", "Follow the orange marker · J opens your journal", "info", 5000);
    this.missions.start("m1_arrival");
    g.sfx("mission");
    this.saveNow();
  }

  async continueGame(): Promise<boolean> {
    const s = await this.saves.load();
    if (!s) return false;
    this.apply(s);
    return true;
  }

  async resetProgress(): Promise<void> {
    await this.saves.clear();
    location.search = "";
  }

  // ------------------------------------------------------------------ missions

  /**
   * Which conversation an NPC plays. Priority: a live required objective (story before side),
   * then a live optional one, then an active mission's dialogue map, then a side-job offer
   * (never while the story needs that person), then free-roam ambient lines that react to
   * what the player did or missed.
   */
  private conversationFor(npc: string): string | null {
    if (this.mode !== "story") return null;
    const ordered = [...this.missions.active].sort((a, b) => (a.category === "story" ? 0 : 1) - (b.category === "story" ? 0 : 1));
    const live = (optional: boolean) => {
      for (const m of ordered) for (const o of this.missions.live(m.id)) if (!!o.optional === optional && o.target.npc === npc && o.target.conversation) return o.target.conversation;
      return null;
    };
    const req = live(false); if (req) return req;
    const opt = live(true); if (opt) return opt;
    for (const m of ordered) { const c = m.dialogue?.[npc]; if (c) return c; }
    const offer = this.missions.defs.find((d) => d.category === "side" && d.trigger?.npc === npc && this.missions.state(d.id) === "AVAILABLE");
    if (offer?.trigger?.conversation && !this.finaleRunning) return offer.trigger.conversation;
    if (this.chapterComplete && this.g.life.dialogue.has(`fr_${npc}`)) return `fr_${npc}`;
    return null;
  }

  /** The mission the HUD and waypoint follow: the story mission, else the oldest active side job. */
  get focus(): MissionDef | undefined { return this.missions.activeStory ?? this.missions.active.find((d) => d.category === "side"); }

  private startSide(id: string): void {
    if (this.missions.def(id)?.category === "side" && this.missions.state(id) === "AVAILABLE") this.missions.start(id);
  }

  private onMissionStarted(id: string): void {
    const d = this.missions.def(id)!;
    this.g.sfx("mission");
    play.set({ chapterCard: null });
    if (d.category === "side") pushNotice("✦", `Side job — ${d.title}`, "mission", 4200);
    else pushNotice(`${d.index}`, `Mission ${String(d.index).padStart(2, "0")} — ${d.title}`, "mission", 4600);
    this.run(d.setup ?? []);
    this.run(d.onStart ?? []);
    this.view();
    this.dirty = true;
  }

  private reward(m: MissionDef): void {
    this.progression.applyReward(m.rewards);
    play.set({ unlocked: [...this.progression.unlocked], relationships: this.progression.relationships() });
  }

  /** Execute data-driven story actions. */
  run(actions: StoryAction[]): void {
    for (const a of actions) {
      switch (a.do) {
        case "chat": this.after(a.delay ?? 0, () => this.chat(a.from, a.text)); break;
        case "notify": pushNotice(a.icon ?? "•", a.text, "info", 4200); break;
        case "time": this.scheduler.setWindow(a.at, a.until); break;
        case "npc": for (const id of Array.isArray(a.npc) ? a.npc : [a.npc]) this.forceNpc(id, a); break;
        case "meeting": this.meetings.prepare(a.meeting); break;
        case "cutscene": if (a.id === "chapter1_finale") this.after(2.5, () => this.finale()); break;
        case "ticket": this.computer.setTicket(a.ticket, a.status); break;
        case "unlock": this.progression.unlocked.add(a.feature); play.set({ unlocked: [...this.progression.unlocked] }); break;
        case "flag": this.g.life.dialogue.flags.set(a.key, a.value); break;
        case "story": this.after(a.delay ?? 0, () => this.g.bus.emit("STORY_EVENT", { id: a.id })); break;
        case "sound": this.g.sfx(a.sound); break;
        case "react": this.cheer(a.npcs); break;
      }
    }
  }

  private forceNpc(id: string, a: Extract<StoryAction, { do: "npc" }>): void {
    const n = this.g.life.npcs.get(id);
    if (!n) return;
    switch (a.activity) {
      case "release": n.force(null); break;
      case "work": n.force({ kind: "work" }); break;
      case "post": n.force({ kind: "post" }); break;
      case "break": n.force({ kind: "break", spot: (a.spot as "coffee") ?? "coffee" }); break;
      case "meeting": n.force({ kind: "meeting", room: a.room ?? "cr1" }); break;
      case "standup": n.force({ kind: "standup", spot: a.spot ?? "react.standup" }); break;
    }
  }

  chat(from: string, text: string): void {
    this.progression.addChat({ from: NAMES[from] ?? from, text, time: formatTime(this.g.life.clock.minutes), read: false });
    play.set({ chat: [...this.progression.chat], unread: this.progression.unread });
    pushNotice("💬", `${NAMES[from] ?? from}: ${text}`, "chat", 5200);
    this.g.bus.emit("CHAT_RECEIVED", { from, text });
  }

  /** Nearby NPCs react to a story moment with a little celebration. */
  private cheer(ids?: string[]): void {
    const p = this.g.player.pos;
    for (const n of this.g.life.npcs.npcs) {
      if (ids && !ids.includes(n.id)) continue;
      if (Vector3.Distance(n.pos, p) > 14 || n.hidden) continue;
      this.after(Math.random() * 0.6, () => { n.char.setGesture("Waving"); n.char.animator.expression = "happy"; });
      this.after(2.6, () => { n.char.setGesture("none"); n.char.animator.expression = "neutral"; });
    }
  }

  private after(sec: number, fn: () => void): void { this.timers.push({ t: sec, fn }); }

  /** State re-check when a new objective activates ("already there / already sitting"). */
  private recheck(): void {
    const g = this.g;
    this.after(0.1, () => {
      this.zones.refresh(g.scenes.activeFloor);
      if (g.player.isSeated && g.player.seat) g.bus.emit("PLAYER_SAT", { seat: g.player.seat.id, zone: g.life.seats.get(g.player.seat.id)?.zone ?? "" });
      if (g.life.computerOpen) g.bus.emit("COMPUTER_STARTED", {});
      for (const m of this.missions.active) for (const o of this.missions.live(m.id))
        for (const e of o.target.anyOf ?? []) {
          const id = (e.match as { id?: string } | undefined)?.id;
          if (e.event === "STORY_EVENT" && id && g.life.dialogue.flags.get(`story.${id}`)) g.bus.emit("STORY_EVENT", { id });
        }
    });
  }

  // ------------------------------------------------------------------ inspectables

  private registerInspectables(): void {
    const g = this.g, y = floorY(3);
    const add = (id: string, label: string, pos: Vector3, open: () => void) => g.life.interactions.add({
      id: `inspect:${id}`, type: "read", label, radius: 1.6, position: () => pos, available: () => g.player.isFree,
      activate: () => { g.bus.emit("OBJECT_INSPECTED", { object: id }); open(); },
    });
    add("qa_device", "Inspect test device", new Vector3(45.6, y, 19.75), () => {
      const s = this.computer.puzzles.state("qa_reproduce");
      if (this.missions.state("m4_qa") === "ACTIVE" && !s.solved) this.openOverlay("qa", "qa_reproduce");
      else if (this.missions.state("s4_qa") === "ACTIVE" && !this.computer.puzzles.state("qa_side_small").solved) this.openOverlay("qa", "qa_side_small");
      else g.life.showOverlay("QA device lab", ["📱 9 test phones, 2 tablets, 1 very old Android", "🧪 All devices on the latest test build", "Shruti's rule: “If it breaks on the small phone, it's not done.”"]);
    });
    add("noc_dashboard", "Inspect deployment dashboard", new Vector3(11.0, y, 19.75), () => {
      if (this.missions.state("m6_ship") === "ACTIVE" && !this.computer.puzzles.state("deploy_pipeline").solved) this.openOverlay("console");
      else g.life.showOverlay("NOC dashboard", ["prod-cluster · ap-south-1 (fictional)", "CPU 41% · Requests 2.3k/min · p95 120ms", "Last deploy: " + (this.computer.puzzles.state("deploy_pipeline").solved ? "#483 ✓ (you!)" : "#481 ✓")]);
    });
  }

  /** Environmental storytelling: small readable details, some of which are side-job clues. */
  private registerDetails(): void {
    const g = this.g, y = floorY(3), life = g.life;
    const add = (id: string, label: string, x: number, z: number, open: () => void, radius = 1.8) => life.interactions.add({
      id: `inspect:${id}`, type: "read", label, radius, position: () => new Vector3(x, y, z), available: () => g.player.isFree,
      activate: () => { g.bus.emit("OBJECT_INSPECTED", { object: id }); open(); },
    });
    const ticketHunt = () => this.missions.state("s1_ticket") === "ACTIVE";
    add("mohit_sticky", "Read sticky notes", 23.2, 4.08, () => life.showOverlay("Mohit's monitor", ticketHunt()
      ? ["🟨 “APX-288 — payment retry backoff”", "🟨 “moved?? ask Arpit, he updated the board”", "🟨 “chai @ 4 (Rockey says)”"]
      : ["🟨 “Retry backoff: 1s → 2s → 4s”", "🟨 “Don't deploy on Friday (lol)”", "🟨 “chai @ 4 (Rockey says)”"]));
    add("arpit_notes", "Read sprint notes", 22.0, 4.72, () => life.showOverlay("Arpit's sprint notes", ticketHunt()
      ? ["Sprint 42 board cleanup ✓", "APX-288 last seen near the 🎨 Design column after yesterday's review…", "Ishita was presenting — ask her?"]
      : ["Sprint 42 board cleanup ✓", "Button variants → Storybook ✓", "Riddle for CR3 whiteboard 🤫"]));
    add("cr3_whiteboard", "Read whiteboard", 35.2, 28.6, () => {
      if (this.missions.state("s3_whiteboard") === "AVAILABLE") this.startSide("s3_whiteboard");
      if (this.missions.state("s3_whiteboard") === "ACTIVE" && !this.missions.isDone("s3_whiteboard", "solve")) this.after(0.2, () => life.startSolo("s3_riddle"));
      else life.showOverlay("CR3 whiteboard", this.missions.state("s3_whiteboard") === "COMPLETED"
        ? ["Riddle #1: solved by Dragon ✓ (answer: keyboard)", "Riddle #2: coming next week — A."]
        : ["“I have keys but open no locks…” — A.", "(the rest is smudged)"]);
    });
    add("cr2_booking", "Check booking screen", 29.2, 30.0, () => life.showOverlay("CR2 · bookings (today)", this.missions.state("s5_rooms") === "COMPLETED"
      ? ["10:30 React standup overflow", "16:00 Design review ✓", "16:00 QA regression sync → moved to CR3 ✓"]
      : ["10:30 React standup overflow", "16:00 Design review", "16:00 QA regression sync ⚠ double-booked"]));
    add("achievements", "Read team board", 28.2, 2.0, () => life.showOverlay("React team · wins this quarter", [
      "🏆 Driver app redesign shipped", "🐛 Bug-bash champions (Sprint 40)", "☕ Most chai consumed: Rockey (unchallenged)",
      this.chapterComplete ? "🚀 APX-301 shipped by Dragon — build #483" : "🚀 Next: APX-301 checkout fix",
    ]));
    add("karan_desk", "Look at Karan's desk", 23.2, 8.69, () => life.showOverlay("Karan's desk", ["🎂 A tiny “Happy Birthday Karan” banner", "🌵 A cactus named Prod", "📌 “Config lives in the vault. Always.”"]));
  }

  openOverlay(kind: "qa" | "console", puzzle = "qa_reproduce"): void {
    this.overlayOpen = kind;
    play.set({ qaPuzzle: puzzle });
    this.g.player.lock();
    this.g.input.releasePointer();
    play.set({ qaDevice: kind === "qa", console: kind === "console" });
  }

  closeOverlay(): void {
    if (!this.overlayOpen) return;
    this.overlayOpen = null;
    play.set({ qaDevice: false, console: false });
    this.g.player.unlock();
  }

  get overlayActive(): boolean { return this.overlayOpen !== null; }

  /** Keys for story overlays/HUD; returns true if consumed. */
  handleKeys(): boolean {
    const i = this.g.input;
    if (this.overlayOpen) { if (i.hit("Escape")) this.closeOverlay(); return true; }
    if (this.mode !== "story" || hud.get().dialogue || this.g.life.computerOpen) return false;
    if (i.hit("KeyJ") && this.progression.unlocked.has("journal")) play.set({ journalOpen: !play.get().journalOpen, mapOpen: false });
    if (i.hit("KeyM") && this.progression.unlocked.has("map")) play.set({ mapOpen: !play.get().mapOpen, journalOpen: false });
    if (i.hit("KeyU")) play.set({ hudVisible: !play.get().hudVisible });
    if ((play.get().journalOpen || play.get().mapOpen) && i.hit("Escape")) { play.set({ journalOpen: false, mapOpen: false }); return true; }
    return false;
  }

  // ------------------------------------------------------------------ finale

  private finale(): void {
    const g = this.g, life = g.life;
    this.finaleRunning = true;
    const team = ["tushar", "mohit", "arpit", "vibhu", "rockey", "karan"].map((id) => life.npcs.get(id)).filter((n): n is NPCController => !!n);
    const c = SPOTS["react.standup"];
    const y = floorY(3);
    const centre = new Vector3(c.x, y, c.z + 0.2);
    play.set({ letterbox: true });
    if (g.player.isSeated) g.player.teleport(g.player.pos, g.player.yaw);
    g.player.lock();
    // gather in a circle, DRAGON included
    const all = team.length + 1;
    team.forEach((n, i) => {
      const a = ((i + 1) / all) * Math.PI * 2;
      const p = centre.add(new Vector3(Math.sin(a) * 1.35, 0, Math.cos(a) * 1.35));
      n.snapToSpot(p, Math.atan2(centre.x - p.x, centre.z - p.z));
    });
    const pp = centre.add(new Vector3(0, 0, 1.35));
    g.player.teleport(pp, Math.PI);
    g.player.lock(centre);
    this.cut.startOrbit(centre, 3.4, 1.75, 0.3, 0.1);
    const tushar = team[0];
    this.after(2.2, () => {
      life.sceneCamera = (speaker, shot) => {
        if (shot === "wide") this.cut.startOrbit(centre, 3.4, 1.75, this.orbitAngle(), 0.1);
        else { const n = team.find((t) => t.id === speaker); if (n) this.cut.closeUp(n.char, centre.add(new Vector3(0, 1.5, 0))); }
      };
      life.onSceneEnd = (conv) => { if (conv === "m6_finale") this.finaleEnd(team, centre); };
      life.startScene("m6_finale", team, tushar);
    });
  }

  private orbitAngle(): number { return (performance.now() / 1000) * 0.1; }

  private finaleEnd(team: NPCController[], centre: Vector3): void {
    const g = this.g;
    this.chapterComplete = true;
    this.dirty = true;
    g.life.sceneCamera = null; g.life.onSceneEnd = null;
    this.cut.startOrbit(centre, 3.8, 1.9, this.orbitAngle(), 0.14);
    g.player.char.setGesture("Waving");
    team.forEach((n, i) => this.after(i * 0.15, () => { n.char.setGesture("Waving"); n.char.animator.expression = "happy"; }));
    g.sfx("chapter");
    const rel = this.progression.relationships();
    const hints = Object.values(this.computer.puzzles.serialize()).reduce((a, p) => a + p.hints, 0);
    this.after(2.4, () => play.set({
      chapterCard: {
        title: "CHAPTER 1 COMPLETE", subtitle: "The Production Bug",
        stats: [
          `Office time ${formatTime(this.g.life.clock.minutes)} · played ${Math.max(1, Math.round(this.playTime / 60))} min`,
          `Hints used: ${hints}`,
          `Team ${"★".repeat(Math.min(5, Math.max(1, (rel.team ?? 0) + 1)))} · Tushar ${"♥".repeat(Math.min(5, Math.max(1, (rel.tushar ?? 0))))} · Rockey ${"☕".repeat(Math.min(3, Math.max(1, rel.rockey ?? 0)))}`,
        ],
      },
    }));
  }

  /** Called by the chapter card's Continue button. */
  closeChapterCard(): void {
    const g = this.g;
    play.set({ chapterCard: null, letterbox: false });
    g.player.char.setGesture("none");
    for (const id of ["tushar", "mohit", "arpit", "vibhu", "rockey", "karan"]) { const n = g.life.npcs.get(id); n?.char.setGesture("none"); n?.force(null); }
    this.cut.release();
    g.player.unlock();
    this.finaleRunning = false;
    this.chapterComplete = true;
    this.scheduler.clearWindow();
    g.life.clock.set("18:15");
    this.progression.unlocked.add("freeRoam");
    play.set({ unlocked: [...this.progression.unlocked], mission: null });
    pushNotice("🌆", "Free roam — the office is yours. More chapters coming soon.", "info", 6000);
    this.saveNow();
  }

  // ------------------------------------------------------------------ per frame

  update(dt: number): void {
    const g = this.g;
    const paused = hud.get().paused;
    if (!paused) {
      for (const t of [...this.timers]) { t.t -= dt; if (t.t <= 0) { this.timers.splice(this.timers.indexOf(t), 1); t.fn(); } }
      this.playTime += dt;
    }
    this.cut.update(dt);
    this.meetings.update(dt);
    this.scheduler.update();
    if (this.mode !== "story") { this.marker.set(null); return; }
    this.zoneT += dt;
    if (this.zoneT > 0.2) {
      this.zoneT = 0;
      const desk = g.ctx.anchors.get("react.dragon.chair")?.position;
      this.zones.update(g.player.pos, g.scenes.outside ? 0 : g.scenes.activeFloor, g.lift.playerInside, desk);
    }
    this.updateWaypoint(dt);
    this.autosaveT += dt;
    if ((this.dirty && this.autosaveT > 1.5) || this.autosaveT > 45) { this.autosaveT = 0; this.dirty = false; void this.saveNow(); }
  }

  private markerWorld(m: MarkerTarget): { pos: Vector3; floor: number } | null {
    const life = this.g.life;
    switch (m.kind) {
      case "point": return { pos: new Vector3(m.x, m.y, m.z), floor: m.floor };
      case "npc": { const n = life.npcs.get(m.npc); return n && !n.hidden ? { pos: n.pos.clone(), floor: 3 } : null; }
      case "seat": { const s = life.seats.get(m.seat); return s ? { pos: new Vector3(s.x, s.y, s.z), floor: 3 } : null; }
      case "zone": {
        const c = ZONE_CENTRE[m.zone]; if (c) return { pos: new Vector3(c.x, floorY(c.floor), c.z), floor: c.floor };
        const id = { office: "reception", corridor: "corridorA" }[m.zone as string] ?? m.zone;
        const z = ZONES.find((zz) => zz.id === id);
        return z ? { pos: new Vector3((z.rect.x0 + z.rect.x1) / 2, floorY(3), (z.rect.z0 + z.rect.z1) / 2), floor: 3 } : null;
      }
    }
  }

  private updateWaypoint(dt: number): void {
    const g = this.g;
    const m = this.focus;
    const cur = m ? this.missions.current(m.id) : undefined;
    let target: { pos: Vector3; floor: number } | null = cur?.marker && !this.finaleRunning && !g.life.computerOpen ? this.markerWorld(cur.marker) : null;
    let label = cur?.text ?? "";
    let otherFloor: string | null = null;
    const floor = g.scenes.outside ? 0 : g.scenes.activeFloor;
    if (target && target.floor !== floor && !g.lift.playerInside) {
      otherFloor = target.floor === 0 ? "G" : String(target.floor);
      target = { pos: g.lift.callPoint(floor), floor };
      label = `Take the lift to floor ${otherFloor}`;
    }
    if (g.lift.playerInside || hud.get().dialogue) target = null;
    this.marker.set(target ? target.pos : null);
    this.marker.update(dt, g.player.pos);
    if (target) {
      const d = target.pos.subtract(g.player.pos);
      const ang = Math.atan2(d.x, d.z) - g.cam.forwardYaw;
      const dist = Math.hypot(d.x, d.z);
      const prev = play.get().waypoint;
      if (!prev || Math.abs(prev.angle - ang) > 0.03 || Math.abs(prev.dist - dist) > 0.4 || prev.label !== label) play.set({ waypoint: { angle: ang, dist, label, otherFloor } });
    } else if (play.get().waypoint) play.set({ waypoint: null });
  }

  /** HUD view model. */
  view(): void {
    const toView = (d: MissionDef): MissionView => {
      const cur = this.missions.current(d.id);
      return {
        id: d.id, category: d.category, index: d.index, name: d.name, title: d.title, description: d.description, state: this.missions.state(d.id),
        objectives: d.objectives.map((o) => ({ id: o.id, text: o.text, optional: !!o.optional, done: this.missions.isDone(d.id, o.id), current: o === cur, hint: o.hint })),
      };
    };
    const active = this.focus;
    play.set({
      mission: active ? toView(active) : null,
      side: this.missions.active.filter((d) => d.category === "side" && d !== active).map(toView),
      missions: this.missions.defs.map(toView),
      tickets: this.progression.ticketList(),
      relationships: this.progression.relationships(),
      unlocked: [...this.progression.unlocked],
    });
  }

  // ------------------------------------------------------------------ save / load

  snapshot(): SaveData {
    const g = this.g;
    let floor = g.scenes.outside ? 0 : g.scenes.activeFloor;
    let p = g.player.pos.clone();
    if (g.lift.playerInside) { floor = g.lift.level; p = g.lift.callPoint(floor); }
    if (g.player.isSeated && g.player.seat) { const s = g.life.seats.get(g.player.seat.id); if (s?.exitX !== undefined) p = new Vector3(s.exitX, s.y, s.exitZ!); }
    return {
      version: SAVE_VERSION, savedAt: Date.now(), chapter: "ch1",
      player: { floor, x: p.x, y: floorY(floor), z: p.z, yaw: g.player.yaw },
      clock: g.life.clock.minutes,
      missions: this.missions.serialize(),
      flags: Object.fromEntries(g.life.dialogue.flags),
      puzzles: this.computer.puzzles.serialize(),
      tickets: Object.fromEntries(this.progression.tickets),
      chat: [...this.progression.chat],
      unlocked: [...this.progression.unlocked],
      chapterComplete: this.chapterComplete,
      playTime: this.playTime,
    };
  }

  async saveNow(): Promise<boolean> {
    if (this.mode !== "story") return false;
    const ok = await this.saves.save(this.snapshot());
    play.set({ hasSave: true, saveStatus: ok ? "" : this.saves.status.message });
    return ok;
  }

  private describe(s: SaveData): string {
    const done = Object.values(s.missions).filter((m) => m.state === "COMPLETED").length;
    const act = MISSIONS.find((m) => s.missions[m.id]?.state === "ACTIVE");
    return s.chapterComplete ? "Chapter 1 complete · free roam" : act ? `Mission ${act.index} — ${act.title}` : `${done}/6 missions`;
  }

  /** Apply a validated save to the live game. */
  apply(s: SaveData): void {
    const g = this.g, life = g.life;
    this.mode = "story";
    play.set({ mode: "story" });
    life.dialogue.flags.clear();
    for (const [k, v] of Object.entries(s.flags)) life.dialogue.flags.set(k, v);
    this.progression.tickets.clear();
    for (const [k, v] of Object.entries(s.tickets)) this.progression.tickets.set(k, v);
    this.progression.chat.length = 0;
    this.progression.chat.push(...s.chat);
    this.progression.unlocked.clear();
    for (const u of s.unlocked) this.progression.unlocked.add(u);
    this.computer.puzzles.restore(s.puzzles);
    this.chapterComplete = s.chapterComplete;
    this.playTime = s.playTime;
    life.clock.set(s.clock);
    g.teleportToFloor(s.player.floor, new Vector3(s.player.x, floorY(s.player.floor), s.player.z), s.player.yaw);
    if (s.player.floor === 0 && s.player.z < 0) g.scenes.updateOutside(g.player.pos);
    // missions last: restoring may make the next mission available (auto-start handles it)
    this.missions.restore(s.missions);
    const act = this.missions.activeStory;
    // saved between two missions: the next one is AVAILABLE already, so no event will start it
    const pending = !act && this.missions.defs.find((d) => d.category === "story" && d.autoStart && this.missions.state(d.id) === "AVAILABLE");
    if (pending) this.after(1.5, () => { if (!this.missions.activeStory) this.missions.start(pending.id); });
    for (const d of this.missions.active) if (d.category === "side") this.run(d.setup ?? []);
    if (act) { this.run(act.setup ?? []); pushNotice("↻", `Resumed: Mission ${act.index} — ${act.title}`, "mission", 4000); }
    else if (this.chapterComplete) pushNotice("🌆", "Free roam — Chapter 1 complete", "info", 4000);
    if (life.npcs.activeFloor === 3 || s.player.floor === 3) life.npcs.catchUp();
    play.set({ chat: [...this.progression.chat], unread: this.progression.unread });
    this.view();
    this.recheck();
  }
}
