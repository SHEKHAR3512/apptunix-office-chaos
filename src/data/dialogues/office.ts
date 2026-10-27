import { conv } from "../../game/dialogue/DialogueData";

/** Conversations for the rest of the office: receptionist, HR, departments (generic but in-character). */
export const OFFICE_DIALOGUES = [
  conv("reception", "neha", [{ if: { before: "10:00" }, node: "morning" }, { node: "day" }], {
    morning: { speaker: "neha", text: "Good morning Dragon! Aaj thoda late? Biometric laga dena.", expression: "smile",
      choices: [{ text: "Good morning! Laga diya.", next: "ok" }, { text: "Traffic tha Phase 8 pe.", next: "traffic" }] },
    ok: { speaker: "neha", text: "Perfect. Aaj 12 baje CR1 mein all-hands hai.", expression: "smile" },
    traffic: { speaker: "neha", text: "Haha, har roz ka hai. Coffee pantry mein ready hai.", expression: "happy" },
    day: { speaker: "neha", text: "Koi courier aaye toh main bata dungi.", expression: "smile" },
  }),
  conv("hr", "simran", [{ node: "a" }], {
    a: { speaker: "simran", text: "Hi Dragon! Leave policy update mail kiya hai, padh lena. Aur Friday ko team lunch hai.", expression: "smile",
      choices: [{ text: "Sure, padh lunga.", next: "b" }, { text: "Lunch kahan hai?", next: "c" }] },
    b: { speaker: "simran", text: "Thanks! Koi doubt ho toh HR cabin mein aa jana.", expression: "smile" },
    c: { speaker: "simran", text: "Sector 70 wala naya cafe. Vote notice board pe hai.", expression: "happy" },
  }),
  conv("angular_generic", "angular", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Angular 17 migration almost done hai. Signals ne life easy kar di!", expression: "happy", choices: [{ text: "Nice, demo dikhana.", next: "b" }, { text: "All the best!", next: undefined }] },
    b: { speaker: "$npc", text: "Standup ke baad pakka.", expression: "smile" },
  }),
  conv("node_generic", "node", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Staging pe orders API ka latency badh gaya hai, DevOps ko ping kiya hai.", expression: "thinking", choices: [{ text: "Frontend pe timeout badha doon?", next: "b" }, { text: "Theek hai.", next: undefined }] },
    b: { speaker: "$npc", text: "Nahi nahi, 10 minute do. Fix aa raha hai.", expression: "serious" },
  }),
  conv("devops_generic", "devops", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Kubernetes cluster green hai. Deploy Friday ko mat karna, bas.", expression: "serious", choices: [{ text: "Haha, noted.", next: undefined }] },
  }),
  conv("design_generic", "design", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Naye onboarding screens Figma mein hain. Spacing 8 ke multiples mein rakhna please!", expression: "smile", choices: [{ text: "Promise.", next: "b" }] },
    b: { speaker: "$npc", text: "Aur icons SVG mein export kar diye hain.", expression: "happy" },
  }),
  conv("qa_generic", "qa", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Dragon, checkout pe ek bug mila — iPhone SE pe button cut ho raha hai.", expression: "thinking", choices: [{ text: "Ticket bana do, dekhta hoon.", next: "b" }, { text: "Mere machine pe toh chal raha hai!", next: "c" }] },
    b: { speaker: "$npc", text: "Ban gaya, screenshot ke saath.", expression: "smile" },
    c: { speaker: "$npc", text: "Classic. Device lab mein aao, dikhati hoon.", expression: "laugh" },
  }),
  conv("support_generic", "support", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Sir chai? Adrak wali bani hai aaj.", expression: "smile", choices: [{ text: "Haan, ek cup please.", next: "b" }, { text: "Abhi nahi, thanks.", next: undefined }] },
    b: { speaker: "$npc", text: "Desk pe rakh deta hoon sir.", expression: "happy" },
  }),
  conv("security_generic", "security", [{ node: "a" }], {
    a: { speaker: "$npc", text: "Namaste sir! Teesri manzil ke liye lift seedha left mein hai.", expression: "smile" },
  }),
];
