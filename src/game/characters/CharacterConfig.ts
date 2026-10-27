import type { Proportions } from "./Skeleton";

export type HairStyle =
  | "messyFringe" | "sidePart" | "quiff" | "curly" | "buzz" | "slick" | "wavy"
  | "longStraight" | "bob" | "ponytail" | "bun" | "turban" | "bald";
export type TopType = "tshirt" | "shirt" | "hoodie" | "polo" | "sweater" | "blazer" | "kurti" | "overshirt" | "uniform";
export type BottomType = "jeans" | "chinos" | "trousers" | "joggers" | "skirt";
export type ShoeType = "sneakers" | "formal" | "loafers" | "boots";
export type Accessory = "glasses" | "roundGlasses" | "watch" | "lanyard" | "headphonesNeck" | "beard" | "fullBeard" | "stubble" | "moustache" | "earrings" | "bindi" | "kara" | "backpack" | "cap" | "scarf";
export type Expression = "neutral" | "happy" | "smile" | "surprised" | "thinking" | "serious" | "laugh";

/**
 * Data-only description of a character's look. The same config always produces the same
 * character (deterministic), and every field can be swapped later for approved likenesses.
 */
export interface CharacterAppearanceConfig {
  /** Dedicated hand-tuned model (overrides the generic builder). */
  model?: "dragonHero";
  body: Partial<Proportions>;
  skin: string;
  hair: { style: HairStyle; color: string; highlight?: string };
  eyes: { iris: string; size?: number; shape?: "round" | "almond" | "sleepy" };
  brows?: { thickness?: number; color?: string; angle?: number };
  top: { type: TopType; color: string; secondary?: string; pattern?: "plain" | "stripes" | "check"; sleeves?: "short" | "long" | "rolled" };
  bottom: { type: BottomType; color: string };
  shoes: { type: ShoeType; color: string; sole?: string };
  accessories?: Accessory[];
  accessoryColor?: string;
  turban?: { color: string };
}

export interface CharacterConfig {
  id: string;
  name: string;
  role: string;
  department: "react" | "angular" | "node" | "devops" | "design" | "qa" | "hr" | "reception" | "support" | "security";
  appearance: CharacterAppearanceConfig;
  /** Personality knobs that drive animation flavour. */
  persona?: { energy?: number; posture?: number; gestures?: number; talkative?: number };
  /** Anchor id of the assigned workstation chair (Phase 1 anchors, e.g. "react.tushar.chair"). */
  desk?: string;
  /** Floor index the character lives on. */
  floor?: number;
  /** Dialogue id (src/data/dialogues). */
  dialogue?: string;
  /** Schedule template (src/data/schedules). */
  schedule?: string;
  isPlayer?: boolean;
}
