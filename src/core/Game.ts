import { AbstractEngine, Color4, FreeCamera, Scene, SceneInstrumentation, EngineInstrumentation, Vector3, ParticleSystem } from "@babylonjs/core";
import { AssetManager, ASSET_MANIFEST, EXPORTABLE } from "../assets/AssetManager";
import { AtlasContent } from "../assets/AtlasContent";
import { MaterialRegistry } from "../assets/MaterialRegistry";
import { TextureAtlas } from "../assets/TextureAtlas";
import { CameraController } from "../game/player/CameraController";
import { PlayerCharacter } from "../game/player/PlayerCharacter";
import { Character, CharacterFactory } from "../game/characters/CharacterFactory";
import { DRAGON } from "../data/characters/roster";
import { OfficeLife } from "../game/OfficeLife";
import { createDust, createSky } from "../rendering/EnvironmentEffects";
import { EXTERIOR, LightingManager } from "../rendering/LightingManager";
import { OutlineSystem } from "../rendering/OutlineSystem";
import { buildExterior, buildShell } from "../world/Building";
import { Door } from "../world/Doors";
import { buildGroundFloor } from "../world/GroundFloor";
import { Lift, FLOOR_LABELS } from "../world/Lift";
import { BUILDING, floorY, ZONES } from "../world/OfficeLayout";
import { buildThirdFloor } from "../world/ThirdFloor";
import { buildUpperFloor } from "../world/UpperFloor";
import { WorldContext } from "../world/WorldContext";
import { createEngine, Backend } from "./Engine";
import { Input } from "./Input";
import { SceneManager } from "./SceneManager";
import { GameSettings, loadSettings, QUALITY, saveSettings } from "./Settings";
import { hud } from "./Store";
import { VIEWPOINTS } from "./Viewpoints";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export const VIEW_MODES = ["Final", "Base colour", "Lighting only", "Shadow bands", "Normals", "Shadow map", "Outlines only", "Depth"];

export class Game {
  engine!: AbstractEngine;
  backend!: Backend;
  scene!: Scene;
  camera!: FreeCamera;
  materials!: MaterialRegistry;
  atlas!: TextureAtlas;
  lighting!: LightingManager;
  outlines!: OutlineSystem;
  ctx!: WorldContext;
  scenes!: SceneManager;
  lift!: Lift;
  input!: Input;
  player!: PlayerCharacter;
  character!: Character;
  factory!: CharacterFactory;
  cam!: CameraController;
  doors: Door[] = [];
  life!: OfficeLife;
  readonly eventLog: { name: string; data?: unknown; t: number }[] = [];
  private listeners = new Map<string, ((d: unknown) => void)[]>();
  assets!: AssetManager;
  settings: GameSettings = loadSettings();
  private sceneInst!: SceneInstrumentation;
  private engineInst!: EngineInstrumentation;
  private dust: ParticleSystem | null = null;
  private statsTimer = 0;
  private debug = false;
  private viewMode = 0;
  private ceilingsHidden = false;
  private time = 0;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const progress = (v: number, label: string) => hud.set({ loading: v, loadingLabel: label });
    progress(0.02, "Starting renderer…");
    const { engine, backend } = await createEngine(canvas);
    this.engine = engine; this.backend = backend;
    hud.set({ backend: backend === "webgpu" ? "WebGPU" : "WebGL 2" });
    const q = QUALITY[this.settings.quality];
    engine.setHardwareScalingLevel(1 / (this.settings.renderScale * Math.min(window.devicePixelRatio || 1, 2)));

    const scene = new Scene(engine);
    this.scene = scene;
    scene.clearColor = new Color4(0.96, 0.88, 0.8, 1);
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.blockMaterialDirtyMechanism = false;

    this.camera = new FreeCamera("cam", new Vector3(8, 1.7, -8), scene, true);
    this.camera.minZ = 0.05; this.camera.maxZ = 900;
    this.camera.fov = (this.settings.fov * Math.PI) / 180;
    this.camera.inputs.clear();

    progress(0.06, "Loading fonts…");
    await Promise.race([
      Promise.all(["600 40px Fredoka", "700 40px Fredoka", "500 40px Fredoka", "400 20px 'JetBrains Mono'"].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);

    progress(0.1, "Painting textures…");
    this.atlas = new TextureAtlas(scene);
    const content = new AtlasContent(this.atlas);
    this.materials = new MaterialRegistry(scene, this.atlas.texture);
    this.lighting = new LightingManager(scene, this.materials, this.settings.shadows ? q.shadowSize : 1024);
    this.lighting.setRefreshRate(q.shadowRefresh);
    this.lighting.shadowsEnabled = this.settings.shadows;
    this.lighting.usePreset(EXTERIOR, true);
    this.outlines = new OutlineSystem(scene, this.camera, this.materials, { msaa: q.msaa, fxaa: q.fxaa });
    this.ctx = new WorldContext(scene, this.materials, content, this.lighting, this.outlines);
    this.ctx.detailDistance = q.detailDistance;
    createSky(scene, this.lighting);
    this.scenes = new SceneManager(this.ctx);
    await nextFrame();

    progress(0.18, "Raising the building…");
    buildShell(this.ctx);
    await nextFrame();
    progress(0.26, "Laying out the street…");
    this.doors.push(buildExterior(this.ctx));
    await nextFrame();

    this.assets = new AssetManager(this.ctx);
    this.lift = new Lift(this.ctx);
    this.scenes.register(0, (L) => { this.doors.push(...buildGroundFloor(this.ctx, this.lift, L)); });
    this.scenes.register(3, (L) => { this.doors.push(...buildThirdFloor(this.ctx, this.lift, L)); });
    for (const L of [1, 2, 4, 5]) this.scenes.register(L, (lv) => buildUpperFloor(this.ctx, this.lift, lv));

    progress(0.34, "Building the lobby…");
    this.scenes.ensureBuilt(0);
    await nextFrame();
    progress(0.45, "Furnishing the Apptunix office…");
    await nextFrame();
    this.scenes.ensureBuilt(3);
    await nextFrame();
    progress(0.8, "Placing the dev character…");

    this.input = new Input(canvas);
    this.input.onLockChange = (l) => hud.set({ pointerLocked: l });
    this.factory = new CharacterFactory(this.ctx);
    this.character = this.factory.create(DRAGON, this.ctx.root("dynamic"));
    this.player = new PlayerCharacter(this.character, this.input, this.ctx.colliders);
    this.player.move.groundAt = (p: Vector3) => (this.lift.isInsideCabin(p) ? this.lift.cabinY : floorY(this.scenes.activeFloor));
    this.cam = new CameraController(this.camera, this.input, this.ctx.colliders);
    this.cam.sensitivity = this.settings.mouseSensitivity;
    this.cam.invertY = this.settings.invertY;

    this.lift.onArrive = (level) => {
      if (this.lift.playerInside) { this.scenes.setActiveFloor(level); if (level === 3) this.life?.npcs.catchUp(); }
      hud.set({ liftFloor: FLOOR_LABELS[level], liftTarget: null });
    };
    this.lift.onDepart = (_from, to) => {
      if (this.lift.playerInside) this.scenes.ensureBuilt(to);
      hud.set({ liftTarget: FLOOR_LABELS[to] });
    };

    this.scenes.setActiveFloor(0);
    this.ctx.refreshShadows(0);
    const params = new URLSearchParams(location.search);
    const start = params.get("start");
    if (start === "office") this.teleportToFloor(3, new Vector3(12, floorY(3), 6.3), Math.PI / 2);
    else if (start === "react") this.teleportToFloor(3, new Vector3(24, floorY(3), 12.8), Math.PI);
    else this.player.teleport(new Vector3(8.2, 0, -6.4), 0);
    this.cam.snapTo(this.player.pos, this.player.yaw);

    this.life = new OfficeLife(this);
    await this.life.init(progress);

    this.sceneInst = new SceneInstrumentation(scene);
    this.sceneInst.captureFrameTime = true;
    this.sceneInst.captureActiveMeshesEvaluationTime = false;
    this.engineInst = new EngineInstrumentation(engine);
    this.engineInst.captureGPUFrameTime = false;

    if (q.dust) {
      this.dust = createDust(scene, { min: new Vector3(10, floorY(3) + 0.3, 0.5), max: new Vector3(47, floorY(3) + 2.8, 33) });
      this.dust.start();
    }

    progress(0.92, "Compiling shaders…");
    await scene.whenReadyAsync();
    this.atlas.commit();
    progress(1, "Welcome to Apptunix");
    hud.set({ ready: true });

    window.addEventListener("resize", () => { engine.resize(); this.outlines.resync(); });
    engine.runRenderLoop(() => this.frame());
    (window as unknown as { __game: Game; __VIEWS: object }).__game = this;
    (window as unknown as { __VIEWS: object }).__VIEWS = VIEWPOINTS;
    (window as unknown as { __EXPORTABLE: object }).__EXPORTABLE = EXPORTABLE;
    (window as unknown as { __MANIFEST: object }).__MANIFEST = ASSET_MANIFEST;
    Object.defineProperty(window, "__hud", { get: () => hud.get(), configurable: true });
  }

  teleportToFloor(level: number, pos: Vector3, yaw: number): void {
    this.scenes.setActiveFloor(level);
    this.scenes.updateOutside(pos);
    this.player.teleport(pos, yaw);
    this.cam.snapTo(pos, yaw);
    if (this.cam.mode === "fly") { this.cam.setFly(false); hud.set({ freeFly: false }); }
  }

  private frame(): void {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    this.time += dt;
    this.handleKeys();
    const paused = hud.get().paused;
    const flying = this.cam.mode === "fly";
    if (flying || hud.get().settingsOpen || paused) this.player.move.locked = true;
    else if (this.player.mode === "free") this.player.move.locked = false;
    if (!paused) this.player.update(dt, this.cam.forwardYaw, this.input.rmb);
    this.cam.focusHeight = this.player.isFree || this.player.mode === "locked" ? 1.45 : 1.05;
    this.cam.update(dt, this.player.pos);
    this.scenes.updateOutside(flying ? this.camera.position : this.player.pos);
    this.lift.update(dt, this.player.pos);
    const npcDoors = this.life.npcs.doorTriggers();
    for (const d of this.doors) d.update(dt, this.player.pos, npcDoors);
    this.life.update(paused ? 0 : dt);
    for (const u of this.ctx.updatables) u(dt, this.time);
    this.lighting.update(this.camera, dt);
    this.outlines.update(this.camera, dt);
    this.updateHud(dt);
    this.input.endFrame();
    this.scene.render();
  }

  private handleKeys(): void {
    const i = this.input;
    if (i.hit("KeyF")) this.toggleFly();
    if (i.hit("Backquote") || i.hit("F1")) this.setDebug(!this.debug);
    if (i.hit("KeyV")) this.setViewMode((this.viewMode + 1) % VIEW_MODES.length);
    if (i.hit("KeyH")) this.toggleCeilings();
    if (i.hit("KeyO") || i.hit("Tab")) { hud.set({ settingsOpen: !hud.get().settingsOpen }); if (hud.get().settingsOpen) i.releasePointer(); }
    if (i.hit("KeyP")) hud.set({ showHelp: !hud.get().showHelp });
    if (i.hit("Escape") && !hud.get().dialogue && !this.life.computerOpen && !hud.get().overlay) { this.setPaused(!hud.get().paused); return; }
    if (this.cam.mode === "fly" || hud.get().paused) return;
    // lift floor selection
    if (this.lift.playerInside) {
      const keys: [string, number][] = [["KeyG", 0], ["Digit0", 0], ["Digit1", 1], ["Digit2", 2], ["Digit3", 3], ["Digit4", 4], ["Digit5", 5]];
      for (const [k, f] of keys) if (i.hit(k)) this.lift.request(f);
      return;
    }
    this.life.handleKeys();
  }

  requestLift(level: number): void { this.lift.request(level); }

  setPaused(p: boolean): void {
    hud.set({ paused: p });
    if (p) this.input.releasePointer();
  }

  /** Minimal event bus — Phase 3 missions subscribe here (meeting joins, dialogue events...). */
  emit(name: string, data?: unknown): void {
    this.eventLog.push({ name, data, t: this.life?.clock.minutes ?? 0 });
    if (this.eventLog.length > 200) this.eventLog.shift();
    for (const l of this.listeners.get(name) ?? []) l(data);
  }

  on(name: string, fn: (d: unknown) => void): void {
    const a = this.listeners.get(name) ?? [];
    a.push(fn);
    this.listeners.set(name, a);
  }

  toggleFly(): void {
    const on = this.cam.mode !== "fly";
    this.cam.setFly(on);
    hud.set({ freeFly: on });
  }

  setDebug(on: boolean): void {
    this.debug = on;
    this.ctx.anchors.setDebugVisible(on);
    hud.set({ debug: on });
  }

  setViewMode(m: number): void {
    this.viewMode = m;
    this.lighting.debugMode = m >= 1 && m <= 5 ? m : 0;
    this.outlines.debugMode = m;
    hud.set({ viewMode: m });
  }

  /** Plan-view inspection: hide the building shell and all ceilings. */
  setCutaway(on: boolean): void {
    this.ctx.root("shell").setEnabled(!on);
    if (on !== this.ceilingsHidden) this.toggleCeilings();
  }

  toggleCeilings(): void {
    this.ceilingsHidden = !this.ceilingsHidden;
    for (const m of this.scene.meshes) {
      const key = (m.metadata as { key?: string } | null)?.key;
      if (key === "ceiling" || key === "light") m.isVisible = !this.ceilingsHidden;
      if (m.name.startsWith("shell") && this.ceilingsHidden && key === "wall") m.isVisible = !this.ceilingsHidden;
      if (m.name.startsWith("shell") && !this.ceilingsHidden) m.isVisible = true;
    }
  }

  /** Jump the free camera to a named viewpoint (used by the screenshot tool). */
  goToView(name: string): boolean {
    if (name.startsWith("custom:")) {
      const [f, x, y, z, tx, ty, tz] = name.slice(7).split("_").map(Number);
      this.scenes.setActiveFloor(f);
      this.scenes.updateOutside(new Vector3(x, y, z));
      this.cam.setView(new Vector3(x, y, z), new Vector3(tx, ty, tz));
      hud.set({ freeFly: true });
      return true;
    }
    const v = VIEWPOINTS[name];
    if (!v) return false;
    this.scenes.setActiveFloor(v.floor);
    this.scenes.updateOutside(v.pos);
    if (v.player) { this.player.teleport(v.player, v.playerYaw ?? 0); }
    if (v.lift !== undefined) this.lift.placeAt(v.lift, true);
    this.setCutaway(!!v.cutaway);
    this.cam.setView(v.pos, v.target);
    hud.set({ freeFly: true });
    this.lighting.shadowMap.resetRefreshCounter();
    return true;
  }

  applySettings(s: GameSettings): void {
    const prevQ = this.settings.quality;
    this.settings = s;
    saveSettings(s);
    const q = QUALITY[s.quality];
    this.engine.setHardwareScalingLevel(1 / (s.renderScale * Math.min(window.devicePixelRatio || 1, 2)));
    this.outlines.resync();
    this.lighting.shadowsEnabled = s.shadows;
    if (prevQ !== s.quality) { this.lighting.setShadowSize(q.shadowSize); this.lighting.setRefreshRate(q.shadowRefresh); }
    this.outlines.settings.strength = s.outlines ? 0.92 : 0;
    this.cam.sensitivity = s.mouseSensitivity;
    this.cam.invertY = s.invertY;
    this.camera.fov = (s.fov * Math.PI) / 180;
  }

  private updateHud(dt: number): void {
    // prompts
    let prompt: string | null = null;
    if (this.cam.mode !== "fly") {
      if (this.lift.playerInside) prompt = this.lift.state === "moving" ? null : "Choose a floor: G / 1–5 (or click the panel)";
      else prompt = this.life.interactions.prompt;
    }
    const zone = this.zoneAt(this.cam.mode === "fly" ? this.camera.position : this.player.pos);
    hud.set({
      prompt, inLift: this.lift.playerInside, liftFloor: FLOOR_LABELS[this.lift.level],
      floorLabel: this.scenes.outside ? "Street · C-127" : `Floor ${FLOOR_LABELS[Math.max(0, this.scenes.activeFloor)]}`,
      zoneLabel: zone,
    });
    this.statsTimer += dt;
    if (this.statsTimer > 0.5 && this.debug) {
      this.statsTimer = 0;
      const ft = this.sceneInst.frameTimeCounter.lastSecAverage;
      const draws = this.sceneInst.drawCallsCounter.current;
      const active = this.scene.getActiveMeshes().length;
      const tris = Math.round(this.scene.getActiveIndices() / 3);
      const p = this.player.pos;
      hud.set({
        stats: [
          `${this.backend === "webgpu" ? "WebGPU" : "WebGL 2"} · ${this.settings.quality}`,
          `FPS ${this.engine.getFps().toFixed(0)} · frame ${ft.toFixed(2)} ms`,
          `draw calls ${draws} · meshes ${active}/${this.scene.meshes.length}`,
          `triangles ${(tris / 1000).toFixed(1)}k · shadow casters ${this.lighting.shadowMap.renderList?.length ?? 0}`,
          `pos ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} · lift ${this.lift.state}`,
          `NPCs ${this.life.npcs.npcs.length} · think ${this.life.npcs.stats.thinking} · anim ${this.life.npcs.stats.animating} · ${this.life.clock.label} ×${this.life.clock.scale}`,
          `view: ${VIEW_MODES[this.viewMode]}`,
        ].join("\n"),
      });
    }
  }

  zoneAt(p: Vector3): string {
    if (this.scenes.outside) return "Phase 8, Mohali";
    if (this.lift.playerInside) return "Lift";
    const L = this.scenes.activeFloor;
    if (L !== 3) return p.x < 10 && p.z < 14 ? (L === 0 ? "Lobby" : "Lift lobby") : "";
    if (p.x < 10 && p.z < 14) return "Lift lobby";
    for (const z of ZONES) if (p.x >= z.rect.x0 && p.x <= z.rect.x1 && p.z >= z.rect.z0 && p.z <= z.rect.z1) return z.label;
    return "";
  }

  /** Stats used by the asset manifest generator. */
  assetReport(): object {
    return {
      backend: this.backend,
      meshes: this.scene.meshes.length,
      materials: this.materials.all().length,
      atlasUsage: this.atlas.usage(),
      prefabs: [...this.ctx.stats.prefabs.entries()].map(([name, e]) => ({ name, tris: e.tris, count: e.count, materials: [...e.materials] })),
      totalVertices: this.scene.getTotalVertices(),
      building: BUILDING,
    };
  }
}
