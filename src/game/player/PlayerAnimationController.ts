import type { CharacterAnimator } from "../characters/CharacterAnimator";
import type { PlayerMovement } from "./PlayerMovement";

/** Maps the player's movement state onto the animator's locomotion states. */
export class PlayerAnimationController {
  private turnHold = 0;

  constructor(private readonly anim: CharacterAnimator, private readonly move: PlayerMovement) {}

  update(dt: number): void {
    const a = this.anim, m = this.move;
    a.params.speed = m.speed;
    a.params.backward = m.backward;
    a.params.sideways = m.sideways;
    a.params.turnRate = m.yawRate;
    // whole-body weight shift: lean into acceleration (back when braking), bank into turns
    a.params.lean = Math.max(-0.3, Math.min(0.22, m.accelFwd * 0.028)) + (m.pivoting ? -0.18 : 0);
    a.params.bank = Math.max(-0.28, Math.min(0.28, -m.accelLat * 0.03));
    // turning on the spot gets a small stepping animation instead of an ice-skate spin
    if (m.speed < 0.25 && Math.abs(m.yawRate) > 1.6) this.turnHold = 0.35;
    else this.turnHold = Math.max(0, this.turnHold - dt);
    const free = a.base === "Locomotion" || a.base === "Idle" || a.base === "TurnLeft" || a.base === "TurnRight" || a.base === "Stop";
    if (!free) return;
    if (this.turnHold > 0 && m.speed < 0.4) a.play(m.yawRate > 0 ? "TurnRight" : "TurnLeft", 0.15);
    else a.play("Locomotion", 0.2);
  }
}
