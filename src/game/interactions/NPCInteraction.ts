import type { NPCController } from "../npc/NPCController";
import type { PlayerCharacter } from "../player/PlayerCharacter";
import type { InteractionManager } from "./InteractionManager";

/** "Talk to <name>" for every NPC. */
export function registerNPCInteractions(im: InteractionManager, npcs: NPCController[], player: PlayerCharacter, talk: (n: NPCController) => void, wanted: (id: string) => number = () => 0): void {
  for (const n of npcs) {
    im.add({
      id: `talk:${n.id}`, type: "talk", radius: 2.1,
      // the person the story needs wins the prompt over bystanders
      get priority() { return 2 + wanted(n.id) * 2; },
      // people in meetings are busy — don't let them steal E from free chairs around them
      label: `Talk to ${n.char.config.name}`,
      position: () => n.pos,
      // …but someone the story needs right now can always be talked to, even from their desk
      available: () => player.isFree && !n.hidden && !n.inDialogue && n.state !== "AWAY" && (wanted(n.id) > 0 || (n.state !== "SITTING" && n.state !== "IN_MEETING")),
      animation: "Talking",
      activate: () => talk(n),
    });
  }
}
