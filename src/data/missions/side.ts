import type { MissionDef } from "../../game/missions/MissionTypes";

/**
 * Chapter 1 side jobs. Optional, never required for the chapter, always resumable: each is
 * offered by an NPC or an object, can be declined and offered again, and its progress is part
 * of the normal mission save. Everything here is fictional.
 */
const CH = "ch1";

export const SIDE_MISSIONS: MissionDef[] = [
  {
    id: "s1_ticket", chapter: CH, index: 1, name: "Side job", title: "The Missing Task Ticket", category: "side",
    description: "Mohit's ticket APX-288 vanished from the sprint board. Follow the office clues and find where it went.",
    prerequisites: ["m2_standup"], targetNpcs: ["mohit", "arpit", "ishita"],
    trigger: { npc: "mohit", conversation: "s1_offer" },
    objectives: [
      { id: "sticky", type: "INSPECT_OBJECT", text: "Check the sticky notes on Mohit's monitor", target: { object: "mohit_sticky" }, marker: { kind: "point", x: 23.2, y: 12, z: 4.08, floor: 3 }, hint: "Mohit sits in the first React pod, near Tushar." },
      { id: "notes", type: "INSPECT_OBJECT", text: "Look at Arpit's sprint notes", target: { object: "arpit_notes" }, marker: { kind: "point", x: 22.0, y: 12, z: 4.72, floor: 3 }, hint: "Arpit's desk faces Mohit's." },
      { id: "ishita", type: "TALK_TO_NPC", text: "Ask Ishita in Design about the board", target: { npc: "ishita", conversation: "s1_ishita" }, marker: { kind: "npc", npc: "ishita" }, hint: "The notes mention the Design column." },
      { id: "mohit", type: "RETURN_TO_NPC", text: "Tell Mohit where APX-288 went", target: { npc: "mohit", conversation: "s1_done" }, marker: { kind: "npc", npc: "mohit" } },
    ],
    rewards: { rel: { mohit: 1 }, flags: { "side.ticket": true } },
  },
  {
    id: "s2_chai", chapter: CH, index: 2, name: "Side job", title: "Rockey's Chai Run", category: "side",
    description: "Rockey is doing a chai run and has 'delegated' taking the orders. Ask three people, then make the chai.",
    prerequisites: ["m1_arrival"], targetNpcs: ["rockey", "arpit", "tushar", "neha"],
    trigger: { npc: "rockey", conversation: "s2_offer" },
    objectives: [
      { id: "arpit", type: "TALK_TO_NPC", text: "Take Arpit's order", target: { npc: "arpit", conversation: "s2_arpit" }, marker: { kind: "npc", npc: "arpit" } },
      { id: "tushar", type: "TALK_TO_NPC", text: "Take Tushar's order", target: { npc: "tushar", conversation: "s2_tushar" }, marker: { kind: "npc", npc: "tushar" } },
      { id: "neha", type: "TALK_TO_NPC", text: "Take Neha's order at reception", target: { npc: "neha", conversation: "s2_neha" }, marker: { kind: "npc", npc: "neha" } },
      { id: "brew", type: "INTERACT_WITH_OBJECT", text: "Make the chai at the pantry machine", target: { object: "coffee" }, marker: { kind: "point", x: 1.1, y: 12, z: 28.4, floor: 3 }, hint: "The coffee machine is in the break area, north-west corner." },
      { id: "rockey", type: "RETURN_TO_NPC", text: "Hand the orders to Rockey", target: { npc: "rockey", conversation: "s2_done" }, marker: { kind: "npc", npc: "rockey" } },
    ],
    rewards: { rel: { rockey: 1, team: 1 }, flags: { "side.chai": true } },
  },
  {
    id: "s3_whiteboard", chapter: CH, index: 3, name: "Side job", title: "The Mystery on the Whiteboard", category: "side",
    description: "Someone left a riddle on the CR3 whiteboard, signed only “— A.”",
    prerequisites: ["m1_arrival"], targetNpcs: ["arpit"],
    trigger: { object: "cr3_whiteboard" },
    objectives: [
      { id: "solve", type: "MAKE_DIALOGUE_CHOICE", text: "Solve the riddle", target: { conversation: "s3_riddle", choices: ["keyboard"] }, hint: "Read the whiteboard again (E). Think about what's on every desk." },
      { id: "arpit", type: "TALK_TO_NPC", text: "Find “A.” and give the answer", target: { npc: "arpit", conversation: "s3_arpit" }, marker: { kind: "npc", npc: "arpit" }, hint: "Which teammate starts with A and loves puzzles?" },
    ],
    rewards: { rel: { team: 1 }, flags: { "side.riddle": true } },
  },
  {
    id: "s4_qa", chapter: CH, index: 4, name: "Side job", title: "One Last QA Check", category: "side",
    description: "Shruti wants one more pass on the oldest phone in the lab before the release goes out.",
    prerequisites: ["m4_qa"], targetNpcs: ["shruti"],
    trigger: { npc: "shruti", conversation: "s4_offer" },
    objectives: [
      { id: "device", type: "INSPECT_OBJECT", text: "Use the QA test device", target: { object: "qa_device" }, marker: { kind: "point", x: 45.6, y: 12, z: 19.75, floor: 3 } },
      { id: "repro", type: "COMPLETE_MINIGAME", text: "Check the smallest supported phone", target: { puzzle: "qa_side_small" }, hint: "The oldest phone in the lab is only 320px wide." },
      { id: "shruti", type: "RETURN_TO_NPC", text: "Report back to Shruti", target: { npc: "shruti", conversation: "s4_done" }, marker: { kind: "npc", npc: "shruti" } },
    ],
    rewards: { rel: { team: 1 }, flags: { "side.qa": true } },
  },
  {
    id: "s5_rooms", chapter: CH, index: 5, name: "Side job", title: "Meeting Room Mix-Up", category: "side",
    description: "CR2 is double-booked at four: Design review and QA regression sync. Simran needs it sorted, politely.",
    prerequisites: ["m1_arrival"], targetNpcs: ["simran", "ishita", "shruti"],
    trigger: { npc: "simran", conversation: "s5_offer" },
    objectives: [
      { id: "panel", type: "INSPECT_OBJECT", text: "Check the CR2 booking screen", target: { object: "cr2_booking" }, marker: { kind: "point", x: 29.2, y: 12, z: 30.0, floor: 3 } },
      { id: "ishita", type: "TALK_TO_NPC", text: "Ask Ishita how long the Design review needs", target: { npc: "ishita", conversation: "s5_ishita" }, marker: { kind: "npc", npc: "ishita" } },
      { id: "shruti", type: "TALK_TO_NPC", text: "Ask Shruti if QA can move", target: { npc: "shruti", conversation: "s5_shruti" }, marker: { kind: "npc", npc: "shruti" } },
      { id: "simran", type: "MAKE_DIALOGUE_CHOICE", text: "Propose a fix to Simran", target: { npc: "simran", conversation: "s5_resolve" }, marker: { kind: "npc", npc: "simran" } },
    ],
    rewards: { rel: { team: 1 }, flags: { "side.rooms": true } },
  },
];
