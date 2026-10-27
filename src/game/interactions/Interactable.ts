import type { Vector3 } from "@babylonjs/core";

export type InteractionType = "talk" | "sit" | "stand" | "computer" | "drink" | "coffee" | "read" | "lift" | "door" | "meeting";

/** Anything DRAGON can interact with. Everything here is data + callbacks (no rendering). */
export interface Interactable {
  id: string;
  /** Prompt text after the key, e.g. "Talk to Tushar". */
  label: string;
  type: InteractionType;
  /** World-space interaction point. */
  position: () => Vector3;
  /** Activation distance (metres). */
  radius: number;
  /** Require the player to roughly face the point (default true). */
  facing?: boolean;
  /** Key that triggers it (default "E"). */
  key?: "E" | "X";
  priority?: number;
  available: () => boolean;
  /** Animation the player plays when activating (handled by the callback owner). */
  animation?: string;
  activate: () => void;
}

/** Pure scoring used by InteractionManager (unit-tested): lower is better, null = not selectable. */
export function scoreInteractable(px: number, pz: number, py: number, yaw: number, ix: number, iz: number, iy: number, radius: number, facing: boolean, priority = 0): number | null {
  const dx = ix - px, dz = iz - pz;
  const d = Math.hypot(dx, dz);
  if (d > radius || Math.abs(iy - py) > 2.2) return null;
  let ang = 0;
  if (facing && d > 0.35) {
    const a = Math.atan2(dx, dz);
    ang = Math.abs(((a - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (ang > 1.35) return null;
  }
  return d / radius + ang * 0.45 - priority * 0.25;
}
