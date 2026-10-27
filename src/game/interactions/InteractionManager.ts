import type { Vector3 } from "@babylonjs/core";
import { Interactable, scoreInteractable } from "./Interactable";

/** Proximity + facing selection. One primary (E) and one secondary (X) action at a time. */
export class InteractionManager {
  private items = new Map<string, Interactable>();
  primary: Interactable | null = null;
  secondary: Interactable | null = null;
  enabled = true;

  add(i: Interactable): void { this.items.set(i.id, i); }
  remove(id: string): void { this.items.delete(id); }
  get(id: string): Interactable | undefined { return this.items.get(id); }
  all(): Interactable[] { return [...this.items.values()]; }

  update(pos: Vector3, yaw: number): void {
    this.primary = null; this.secondary = null;
    if (!this.enabled) return;
    let bestE = Infinity, bestX = Infinity;
    for (const i of this.items.values()) {
      if (!i.available()) continue;
      const p = i.position();
      const s = scoreInteractable(pos.x, pos.z, pos.y, yaw, p.x, p.z, p.y, i.radius, i.facing !== false, i.priority ?? 0);
      if (s === null) continue;
      if ((i.key ?? "E") === "E") { if (s < bestE) { bestE = s; this.primary = i; } }
      else if (s < bestX) { bestX = s; this.secondary = i; }
    }
  }

  get prompt(): string | null {
    const parts: string[] = [];
    if (this.primary) parts.push(`[E] ${this.primary.label}`);
    if (this.secondary) parts.push(`[X] ${this.secondary.label}`);
    return parts.length ? parts.join("   ·   ") : null;
  }

  press(key: "E" | "X"): boolean {
    const i = key === "E" ? this.primary : this.secondary;
    if (!i) return false;
    i.activate();
    return true;
  }
}
