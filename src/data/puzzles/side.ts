import type { ReproduceDef } from "../../game/minigames/PuzzleEngine";

/** Side job S4: an extra pass on the smallest phone in the lab (fictional). */
export const QA_SIDE_SMALL: ReproduceDef = {
  kind: "reproduce", id: "qa_side_small", bug: "APX-301-320", title: "Last QA pass — smallest supported phone",
  instructions: "Shruti wants the fixed product row checked on the oldest lab phone. Shrink the device to its smallest width and confirm the layout.",
  hints: ["The oldest phone is 320px wide.", "Drag the slider all the way to the left."],
  minWidth: 320, maxWidth: 1280, startWidth: 1280, breaksBelow: 330, verify: true,
};
