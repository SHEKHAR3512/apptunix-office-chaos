import type { CharacterAppearanceConfig, CharacterConfig } from "../../game/characters/CharacterConfig";

/**
 * Character roster. All designs are ORIGINAL stylised placeholders — no real likenesses.
 * Swap any appearance block once approved reference photos exist. Non-React names are
 * fictional placeholders. Desk ids refer to Phase 1 anchors ("<desk id>.chair").
 */

const SKIN = { fair: "#e3b08f", light: "#d9a07c", medium: "#c98d6a", tan: "#bb7f5d", brown: "#a86f50", deep: "#8e5b41" };
const HAIR = { black: "#1d1a1e", soft: "#2a2026", brown: "#3e2c24", chestnut: "#5a3a28", grey: "#6e6a6a" };

type Look = Partial<CharacterAppearanceConfig> & Pick<CharacterAppearanceConfig, "skin" | "hair" | "top" | "bottom">;
const look = (l: Look): CharacterAppearanceConfig => ({
  body: {}, eyes: { iris: "#3a2a20" }, shoes: { type: "sneakers", color: "#ecebe7" }, accessories: [], ...l,
});

export const DRAGON: CharacterConfig = {
  id: "dragon", name: "DRAGON", role: "React Developer", department: "react", isPlayer: true, desk: "react.dragon.chair", floor: 3,
  persona: { energy: 0.75, posture: 0.75, gestures: 0.7 },
  appearance: {
    model: "dragonHero",
    body: { height: 1.76, shoulder: 0.19, girth: 1.0 },
    skin: SKIN.medium,
    hair: { style: "messyFringe", color: HAIR.soft, highlight: "#3d3036" },
    eyes: { iris: "#4a2f22", size: 1.06 },
    brows: { thickness: 1.05 },
    top: { type: "hoodie", color: "#2f7566", secondary: "#f08a3c" },
    bottom: { type: "jeans", color: "#3e4d70" },
    shoes: { type: "sneakers", color: "#f3efe8", sole: "#f08a3c" },
    accessories: ["headphonesNeck", "watch", "lanyard"],
    accessoryColor: "#f08a3c",
  },
};

export const REACT_TEAM: CharacterConfig[] = [
  {
    id: "tushar", name: "Tushar", role: "React Team Lead", department: "react", desk: "react.tushar.chair", dialogue: "tushar_intro", schedule: "lead",
    persona: { energy: 0.6, posture: 0.95, gestures: 0.95, talkative: 0.8 },
    appearance: look({
      body: { height: 1.78, shoulder: 0.195, girth: 1.05, belly: 0.25 }, skin: SKIN.tan,
      hair: { style: "sidePart", color: HAIR.black }, eyes: { iris: "#3a2a20", shape: "almond" }, brows: { thickness: 1.3, angle: 0.3 },
      top: { type: "blazer", color: "#2c3a5c", secondary: "#d6e4f2" }, bottom: { type: "trousers", color: "#3b3d45" },
      shoes: { type: "formal", color: "#4a3428" }, accessories: ["glasses", "watch", "stubble"], accessoryColor: "#3a3036",
    }),
  },
  {
    id: "mohit", name: "Mohit", role: "React Developer", department: "react", desk: "react.mohit.chair", dialogue: "mohit_intro", schedule: "react",
    persona: { energy: 0.5, posture: 0.55, gestures: 0.5 },
    appearance: look({
      body: { height: 1.72, girth: 0.98 }, skin: SKIN.light,
      hair: { style: "quiff", color: HAIR.brown }, eyes: { iris: "#4a3426" },
      top: { type: "shirt", color: "#d9675e", secondary: "#f2efe8", sleeves: "rolled" }, bottom: { type: "chinos", color: "#c9b48e" },
      shoes: { type: "sneakers", color: "#2b2d33", sole: "#f2efe8" }, accessories: ["roundGlasses", "watch"], accessoryColor: "#8a5a3a",
    }),
  },
  {
    id: "arpit", name: "Arpit", role: "React Developer", department: "react", desk: "react.arpit.chair", dialogue: "arpit_intro", schedule: "react",
    persona: { energy: 0.45, posture: 0.7, gestures: 0.4 },
    appearance: look({
      body: { height: 1.75, girth: 1.0 }, skin: SKIN.brown,
      hair: { style: "wavy", color: HAIR.black }, eyes: { iris: "#2f2018", shape: "sleepy" },
      top: { type: "polo", color: "#e9d8b8" }, bottom: { type: "jeans", color: "#2f3a52" },
      shoes: { type: "sneakers", color: "#d9675e", sole: "#f2efe8" }, accessories: ["beard"],
    }),
  },
  {
    id: "vibhu", name: "Vibhu", role: "React Developer", department: "react", desk: "react.vibhu.chair", dialogue: "vibhu_intro", schedule: "react",
    persona: { energy: 0.85, posture: 0.6, gestures: 0.85 },
    appearance: look({
      body: { height: 1.69, girth: 0.95 }, skin: SKIN.fair,
      hair: { style: "curly", color: HAIR.brown }, eyes: { iris: "#3e2a1e", size: 1.08 },
      top: { type: "tshirt", color: "#f3c74f", pattern: "stripes", secondary: "#2b2d33" }, bottom: { type: "joggers", color: "#3a3d48" },
      shoes: { type: "sneakers", color: "#f3efe8", sole: "#4fb3c8" }, accessories: ["headphonesNeck"], accessoryColor: "#d9675e",
    }),
  },
  {
    id: "rockey", name: "Rockey", role: "React Developer", department: "react", desk: "react.rockey.chair", dialogue: "rockey_chai", schedule: "react",
    persona: { energy: 0.8, posture: 0.85, gestures: 0.9, talkative: 0.9 },
    appearance: look({
      body: { height: 1.83, shoulder: 0.2, girth: 1.08 }, skin: SKIN.light,
      hair: { style: "turban", color: HAIR.black }, turban: { color: "#c0392b" }, accessoryColor: "#f3c74f",
      eyes: { iris: "#3a2a1e" }, brows: { thickness: 1.35 },
      top: { type: "overshirt", color: "#3b4a63", secondary: "#f2efe8" }, bottom: { type: "jeans", color: "#2a3346" },
      shoes: { type: "boots", color: "#5a3e2b", sole: "#2a2522" }, accessories: ["fullBeard", "kara", "watch"],
    }),
  },
  {
    id: "karan", name: "Karan", role: "React Developer", department: "react", desk: "react.karan.chair", dialogue: "karan_intro", schedule: "react",
    persona: { energy: 0.7, posture: 0.65, gestures: 0.7 },
    appearance: look({
      body: { height: 1.74, girth: 0.97 }, skin: SKIN.medium,
      hair: { style: "slick", color: HAIR.black }, eyes: { iris: "#2f2018" },
      top: { type: "sweater", color: "#5b6b86", secondary: "#f2efe8" }, bottom: { type: "chinos", color: "#4a4038" },
      shoes: { type: "loafers", color: "#3a2a20" }, accessories: ["watch", "stubble"],
    }),
  },
];

/** Compact factory for department staff. */
function staff(id: string, name: string, role: string, department: CharacterConfig["department"], desk: string | undefined, schedule: string, a: Look, persona?: CharacterConfig["persona"]): CharacterConfig {
  return { id, name, role, department, desk, schedule, dialogue: `${department}_generic`, persona, appearance: look(a) };
}

const F = { female: true, shoulder: 0.165, hip: 0.098, girth: 0.92, chest: 0.5 };

export const DEPARTMENTS: CharacterConfig[] = [
  // Angular
  staff("priya", "Priya", "Angular Developer", "angular", "angular.1.chair", "dev", { body: { ...F, height: 1.62 }, skin: SKIN.light, hair: { style: "longStraight", color: HAIR.black }, top: { type: "kurti", color: "#4f8a8b", secondary: "#e3a548" }, bottom: { type: "trousers", color: "#2b2d33" }, shoes: { type: "loafers", color: "#8a5a3a" }, accessories: ["earrings", "bindi"], eyes: { iris: "#3a2a20", size: 1.1 } }, { gestures: 0.7 }),
  staff("aman", "Aman", "Angular Developer", "angular", "angular.2.chair", "dev", { body: { height: 1.76, girth: 1.02 }, skin: SKIN.tan, hair: { style: "buzz", color: HAIR.black }, top: { type: "tshirt", color: "#2b2d33" }, bottom: { type: "jeans", color: "#4a5a7a" }, accessories: ["beard"] }),
  staff("sahil", "Sahil", "Angular Developer", "angular", "angular.4.chair", "dev", { body: { height: 1.71 }, skin: SKIN.medium, hair: { style: "messyFringe", color: HAIR.brown }, top: { type: "hoodie", color: "#7a4a6a", secondary: "#f2efe8" }, bottom: { type: "joggers", color: "#2b2d33" }, accessories: ["glasses"] }),
  staff("ritika", "Ritika", "Angular Lead", "angular", "angular.5.chair", "meetingHeavy", { body: { ...F, height: 1.65 }, skin: SKIN.fair, hair: { style: "bob", color: HAIR.chestnut }, top: { type: "blazer", color: "#e9d8b8", secondary: "#2b2d33" }, bottom: { type: "trousers", color: "#3b3d45" }, shoes: { type: "formal", color: "#2b2d33" }, accessories: ["earrings", "watch"], eyes: { iris: "#4a3426", size: 1.08 } }, { posture: 0.95 }),
  // Node.js
  staff("gaurav", "Gaurav", "Node.js Developer", "node", "node.1.chair", "dev", { body: { height: 1.8, girth: 1.12, belly: 0.4 }, skin: SKIN.light, hair: { style: "sidePart", color: HAIR.black }, top: { type: "shirt", color: "#cfe0f2" }, bottom: { type: "trousers", color: "#2b2d33" }, shoes: { type: "formal", color: "#3a2a20" }, accessories: ["moustache", "watch"] }),
  staff("ankit", "Ankit", "Node.js Developer", "node", "node.2.chair", "dev", { body: { height: 1.7 }, skin: SKIN.brown, hair: { style: "curly", color: HAIR.black }, top: { type: "tshirt", color: "#79b06a" }, bottom: { type: "jeans", color: "#3e4d70" }, accessories: ["headphonesNeck"], accessoryColor: "#2b2d33" }),
  staff("pooja", "Pooja", "Node.js Developer", "node", "node.4.chair", "dev", { body: { ...F, height: 1.6 }, skin: SKIN.medium, hair: { style: "ponytail", color: HAIR.black }, top: { type: "sweater", color: "#d98aa2", secondary: "#f2efe8" }, bottom: { type: "jeans", color: "#2f3a52" }, accessories: ["glasses"], accessoryColor: "#c0392b", eyes: { iris: "#2f2018", size: 1.1 } }),
  staff("deepak", "Deepak", "Backend Lead", "node", "node.5.chair", "meetingHeavy", { body: { height: 1.77, girth: 1.06 }, skin: SKIN.deep, hair: { style: "slick", color: HAIR.grey }, top: { type: "polo", color: "#1f2a44" }, bottom: { type: "chinos", color: "#9a8a6a" }, shoes: { type: "loafers", color: "#5a3e2b" }, accessories: ["beard", "watch"] }, { posture: 0.9 }),
  // DevOps
  staff("vikram", "Vikram", "DevOps Engineer", "devops", "devops.1.chair", "dev", { body: { height: 1.82, girth: 1.1 }, skin: SKIN.tan, hair: { style: "buzz", color: HAIR.black }, top: { type: "hoodie", color: "#2b2d33", secondary: "#e3a548" }, bottom: { type: "jeans", color: "#2a3346" }, shoes: { type: "boots", color: "#2b2d33" }, accessories: ["fullBeard"] }),
  staff("rohit", "Rohit", "DevOps Engineer", "devops", "devops.2.chair", "dev", { body: { height: 1.73 }, skin: SKIN.medium, hair: { style: "quiff", color: HAIR.black }, top: { type: "overshirt", color: "#6b5a46", secondary: "#2b2d33" }, bottom: { type: "jeans", color: "#4a5a7a" }, accessories: ["glasses", "watch"] }),
  staff("sneha", "Sneha", "Site Reliability Engineer", "devops", "devops.3.chair", "dev", { body: { ...F, height: 1.64 }, skin: SKIN.light, hair: { style: "bun", color: HAIR.brown }, top: { type: "tshirt", color: "#e3a548" }, bottom: { type: "jeans", color: "#2f3a52" }, accessories: ["earrings", "watch"], eyes: { iris: "#3a2a20", size: 1.08 } }),
  staff("manpreet", "Manpreet", "DevOps Lead", "devops", "devops.4.chair", "meetingHeavy", { body: { height: 1.8, girth: 1.06 }, skin: SKIN.tan, hair: { style: "turban", color: HAIR.black }, turban: { color: "#1f3a6a" }, accessoryColor: "#d6e4f2", top: { type: "shirt", color: "#f2efe8" }, bottom: { type: "trousers", color: "#3b3d45" }, shoes: { type: "formal", color: "#2b2d33" }, accessories: ["fullBeard", "kara"] }, { posture: 0.9 }),
  // Design
  staff("ishita", "Ishita", "Product Designer", "design", "design.1.chair", "dev", { body: { ...F, height: 1.63 }, skin: SKIN.fair, hair: { style: "longStraight", color: HAIR.chestnut }, top: { type: "sweater", color: "#a08ac2", secondary: "#f2efe8" }, bottom: { type: "jeans", color: "#3e4d70" }, accessories: ["roundGlasses", "earrings"], accessoryColor: "#8a5a3a", eyes: { iris: "#4a3426", size: 1.12 } }, { gestures: 0.85 }),
  staff("kabir", "Kabir", "UI Designer", "design", "design.2.chair", "dev", { body: { height: 1.75, girth: 0.94 }, skin: SKIN.medium, hair: { style: "wavy", color: HAIR.brown }, top: { type: "tshirt", color: "#f2efe8" }, bottom: { type: "chinos", color: "#4a4038" }, shoes: { type: "sneakers", color: "#2b2d33" }, accessories: ["scarf", "stubble"], accessoryColor: "#d98a5a" }),
  staff("tanya", "Tanya", "UX Researcher", "design", "design.3.chair", "dev", { body: { ...F, height: 1.66 }, skin: SKIN.brown, hair: { style: "curly", color: HAIR.black }, top: { type: "overshirt", color: "#d9675e", secondary: "#f2efe8" }, bottom: { type: "jeans", color: "#2b2d33" }, accessories: ["earrings"], eyes: { iris: "#2f2018", size: 1.1 } }),
  staff("meera", "Meera", "Design Lead", "design", "design.4.chair", "meetingHeavy", { body: { ...F, height: 1.6 }, skin: SKIN.light, hair: { style: "bun", color: HAIR.black }, top: { type: "kurti", color: "#e9d8b8", secondary: "#c0392b" }, bottom: { type: "trousers", color: "#8a5a3a" }, shoes: { type: "loafers", color: "#8a5a3a" }, accessories: ["bindi", "glasses", "earrings"], accessoryColor: "#3a3036", eyes: { iris: "#3a2a20", size: 1.08 } }, { posture: 0.9 }),
  // QA
  staff("shruti", "Shruti", "QA Engineer", "qa", "qa.1.chair", "dev", { body: { ...F, height: 1.58 }, skin: SKIN.medium, hair: { style: "ponytail", color: HAIR.black }, top: { type: "tshirt", color: "#d98aa2" }, bottom: { type: "jeans", color: "#3e4d70" }, accessories: ["glasses"], accessoryColor: "#2b2d33", eyes: { iris: "#3a2a20", size: 1.1 } }),
  staff("nikhil", "Nikhil", "QA Automation", "qa", "qa.2.chair", "dev", { body: { height: 1.72, girth: 0.96 }, skin: SKIN.tan, hair: { style: "messyFringe", color: HAIR.black }, top: { type: "polo", color: "#4fb3c8" }, bottom: { type: "chinos", color: "#2b2d33" }, accessories: ["watch"] }),
  staff("kavya", "Kavya", "QA Engineer", "qa", "qa.4.chair", "dev", { body: { ...F, height: 1.63 }, skin: SKIN.light, hair: { style: "bob", color: HAIR.black }, top: { type: "hoodie", color: "#79b06a", secondary: "#f2efe8" }, bottom: { type: "joggers", color: "#3a3d48" }, accessories: ["earrings"], eyes: { iris: "#3e2a1e", size: 1.1 } }),
  staff("rahul", "Rahul", "QA Lead", "qa", "qa.5.chair", "meetingHeavy", { body: { height: 1.78, girth: 1.04 }, skin: SKIN.brown, hair: { style: "sidePart", color: HAIR.black }, top: { type: "shirt", color: "#f2efe8", pattern: "stripes", secondary: "#5b6b86" }, bottom: { type: "trousers", color: "#2b2d33" }, shoes: { type: "formal", color: "#3a2a20" }, accessories: ["glasses", "moustache"] }, { posture: 0.9 }),
];

export const SUPPORT: CharacterConfig[] = [
  { id: "simran", name: "Simran", role: "HR Manager", department: "hr", desk: "hr.lead.chair", schedule: "hr", dialogue: "hr", persona: { posture: 0.95, gestures: 0.8 },
    appearance: look({ body: { ...F, height: 1.64 }, skin: SKIN.fair, hair: { style: "longStraight", color: HAIR.brown }, top: { type: "blazer", color: "#c0392b", secondary: "#f2efe8" }, bottom: { type: "trousers", color: "#2b2d33" }, shoes: { type: "formal", color: "#2b2d33" }, accessories: ["earrings", "watch", "lanyard"], eyes: { iris: "#4a3426", size: 1.08 } }) },
  { id: "ananya", name: "Ananya", role: "HR Executive", department: "hr", desk: "hr.exec1.chair", schedule: "hr", dialogue: "hr",
    appearance: look({ body: { ...F, height: 1.6 }, skin: SKIN.medium, hair: { style: "ponytail", color: HAIR.black }, top: { type: "kurti", color: "#e3a548", secondary: "#4f8a8b" }, bottom: { type: "trousers", color: "#f2efe8" }, shoes: { type: "loafers", color: "#8a5a3a" }, accessories: ["bindi", "earrings"], eyes: { iris: "#3a2a20", size: 1.1 } }) },
  { id: "neha", name: "Neha", role: "Receptionist", department: "reception", desk: "reception.desk.chair", schedule: "post", dialogue: "reception", persona: { posture: 0.9, gestures: 0.75 },
    appearance: look({ body: { ...F, height: 1.62 }, skin: SKIN.light, hair: { style: "bun", color: HAIR.black }, top: { type: "blazer", color: "#1f2a44", secondary: "#f2efe8" }, bottom: { type: "trousers", color: "#1f2a44" }, shoes: { type: "formal", color: "#2b2d33" }, accessories: ["earrings", "lanyard"], eyes: { iris: "#3a2a20", size: 1.1 } }) },
  { id: "ramesh", name: "Ramesh", role: "Office Support", department: "support", schedule: "support", dialogue: "support_generic", persona: { energy: 0.6 },
    appearance: look({ body: { height: 1.68, girth: 0.95 }, skin: SKIN.deep, hair: { style: "buzz", color: HAIR.grey }, top: { type: "uniform", color: "#8a9bb5" }, bottom: { type: "trousers", color: "#2b3248" }, shoes: { type: "formal", color: "#2b2d33" }, accessories: ["moustache"] }) },
];

/** Ground-floor security guard (not on the navigation floor; stationary post). */
export const SECURITY: CharacterConfig = { id: "baldev", name: "Baldev", role: "Security", department: "security", floor: 0, schedule: "post", dialogue: "security_generic", desk: "lobby.security.chair",
  appearance: look({ body: { height: 1.8, girth: 1.12, belly: 0.35 }, skin: SKIN.tan, hair: { style: "buzz", color: HAIR.grey }, top: { type: "uniform", color: "#3b4a63" }, bottom: { type: "trousers", color: "#2b2d33" }, shoes: { type: "boots", color: "#1f2128" }, accessories: ["moustache", "cap"], accessoryColor: "#2b3248" }) };

export const ROSTER: CharacterConfig[] = [...REACT_TEAM, ...DEPARTMENTS, ...SUPPORT];
