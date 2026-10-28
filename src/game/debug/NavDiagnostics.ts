import { Vector3 } from "@babylonjs/core";
import type { Game } from "../../core/Game";
import { play } from "../gameplay/PlayState";
import { hud } from "../../core/Store";

/**
 * Development-only navigation diagnostics (loaded by Game only when import.meta.env.DEV).
 * Read-only: it reports state and answers path queries, it never moves anything.
 * Panel: add `?diag=1` to the URL. Automation: `window.__diag`.
 */
export interface DiagSnapshot {
  pos: { x: number; y: number; z: number }; floor: number; inLift: boolean; liftLevel: number; liftDoors: number; liftState: string;
  yaw: number; camYaw: number; camSens: number; speed: number; mode: string; blockage: number;
  target: { label: string; x: number; z: number; dist: number; path: { x: number; z: number }[] } | null;
  prompt: string | null; interact: { enabled: boolean; storyOverlay: boolean; finale: boolean; cam: string; near: string[] }; objective: string | null; modal: string | null;
}

export function installDiagnostics(g: Game): void {
  let target: { label: string; to: Vector3 } | null = null;
  let path: { x: number; z: number }[] = [];
  const pathTo = (x: number, z: number): { x: number; z: number }[] => {
    const nav = g.life.npcs.nav;
    if (g.scenes.activeFloor !== 3 || g.lift.playerInside) return [{ x, z }];
    try { return nav.path(g.player.pos, new Vector3(x, g.player.pos.y, z)).map((p) => ({ x: p.x, z: p.z })); } catch { return [{ x, z }]; }
  };
  const modal = (): string | null => {
    const h = hud.get(), p = play.get();
    return h.dialogue ? "dialogue" : h.computer ? "computer" : h.overlay ? "overlay" : p.qaDevice ? "qa" : p.console ? "console" : p.journalOpen ? "journal" : p.mapOpen ? "map" : p.chapterCard ? "chapterCard" : p.mode === "title" ? "title" : h.paused ? "paused" : null;
  };
  const snapshot = (): DiagSnapshot => {
    const p = g.player.pos, m = g.player.move;
    const cur = play.get().mission?.objectives.find((o) => o.current);
    return {
      pos: { x: p.x, y: p.y, z: p.z }, floor: g.scenes.activeFloor, inLift: g.lift.playerInside, liftLevel: g.lift.level, liftDoors: g.lift.door, liftState: g.lift.state,
      yaw: g.player.yaw, camYaw: g.cam.yaw, camSens: 0.0024 * g.cam.sensitivity, speed: m.speed, mode: g.player.mode, blockage: m.blockage,
      target: target ? { label: target.label, x: target.to.x, z: target.to.z, dist: Math.hypot(target.to.x - p.x, target.to.z - p.z), path } : null,
      prompt: g.life.interactions.prompt,
      interact: { enabled: g.life.interactions.enabled, storyOverlay: !!g.story?.overlayActive, finale: !!g.story?.finaleRunning, cam: g.cam.mode, near: g.life.interactions.all().filter((i) => i.available() && Math.hypot(i.position().x - p.x, i.position().z - p.z) < (i.radius ?? 1.5) && i.radius < 50).map((i) => i.id) }, objective: cur ? `${play.get().mission!.id}:${cur.id}` : null, modal: modal(),
    };
  };
  const api = {
    snapshot,
    path: pathTo,
    /** Mark what automation (or a developer) is heading for; shown in the panel. */
    setTarget(label: string, x: number, z: number) { target = { label, to: new Vector3(x, 0, z) }; path = pathTo(x, z); },
    clearTarget() { target = null; path = []; },
    seat(id: string) { const s = g.life.seats.get(id); return s ? { ...s, occupant: g.life.seats.occupantOf(id) ?? null } : null; },
    npc(id: string) { const n = g.life.npcs.get(id); return n ? { x: n.pos.x, z: n.pos.z, state: n.state, seat: n.seatId ?? null } : null; },
    freeSeats(zone: string, kind?: string) { return g.life.seats.inZone(zone, kind as never).filter((s) => g.life.seats.isFree(s.id)).map((s) => s.id); },
    perf() { return { fps: g.engine.getFps(), frameMs: 1000 / Math.max(1, g.engine.getFps()), heapMB: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576 : null }; },
  };
  (window as unknown as { __diag: typeof api }).__diag = api;
  Object.defineProperty(window, "__play", { get: () => play.get(), configurable: true });

  if (new URLSearchParams(location.search).get("diag") !== "1") return;
  const el = document.createElement("pre");
  el.style.cssText = "position:fixed;left:8px;bottom:120px;z-index:50;margin:0;padding:6px 8px;background:rgba(0,0,0,.7);color:#7ee787;font:11px/1.35 ui-monospace,monospace;pointer-events:none;max-width:360px;white-space:pre-wrap";
  document.body.appendChild(el);
  setInterval(() => {
    const s = snapshot();
    if (target) path = pathTo(target.to.x, target.to.z);
    el.textContent = [
      `pos ${s.pos.x.toFixed(2)}, ${s.pos.y.toFixed(2)}, ${s.pos.z.toFixed(2)}  floor ${s.floor}${s.inLift ? " (lift)" : ""}`,
      `mode ${s.mode}  speed ${s.speed.toFixed(2)}  blocked ${(s.blockage * 100).toFixed(0)}%`,
      `target ${s.target ? `${s.target.label} · ${s.target.dist.toFixed(1)} m · ${s.target.path.length} corners` : "—"}`,
      `prompt ${s.prompt ?? "—"}`, `objective ${s.objective ?? "—"}`, `modal ${s.modal ?? "—"}`,
    ].join("\n");
  }, 250);
}
