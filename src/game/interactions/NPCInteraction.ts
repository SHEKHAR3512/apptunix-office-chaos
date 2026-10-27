import type { NPCController } from "../npc/NPCController";
import type { PlayerCharacter } from "../player/PlayerCharacter";
import type { InteractionManager } from "./InteractionManager";

/** "Talk to <name>" for every NPC. */
export function registerNPCInteractions(im: InteractionManager, npcs: NPCController[], player: PlayerCharacter, talk: (n: NPCController) => void): void {
  for (const n of npcs) {
    im.add({
      id: `talk:${n.id}`, type: "talk", radius: 2.1, priority: 2,
      // people in meetings are busy — don't let them steal E from free chairs around them
      label: `Talk to ${n.char.config.name}`,
      position: () => n.pos,
      available: () => player.isFree && !n.hidden && !n.inDialogue && n.state !== "SITTING" && n.state !== "AWAY" && n.state !== "IN_MEETING",
      animation: "Talking",
      activate: () => talk(n),
    });
  }
}
