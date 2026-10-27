import { conv } from "../../game/dialogue/DialogueData";

/** React team conversations (Hinglish, as in the brief). All lines are fictional placeholders. */
export const REACT_DIALOGUES = [
  conv("tushar_intro", "tushar", [
    { if: { flag: "tushar.met", not: true }, node: "hello" },
    { if: { flag: "task.checked" }, node: "after" },
    { node: "repeat" },
  ], {
    hello: { speaker: "tushar", text: "Dragon, aa gaye? Aaj ka task check kar lena.", expression: "smile", camera: "twoShot", events: [{ type: "setFlag", key: "tushar.met", value: true }],
      choices: [
        { text: "Okay sir.", next: "ok" },
        { text: "Koi priority issue hai?", next: "priority" },
        { text: "Team standup kab hai?", next: "standup" },
      ] },
    ok: { speaker: "tushar", text: "Good. Jira pe sab assign hai — pehle checkout flow wala bug dekhna.", expression: "neutral", next: "close" },
    priority: { speaker: "tushar", text: "Haan, client ka payment screen crash ho raha hai on Android. Woh pehle. Mohit ke saath pair kar lo.", expression: "serious", events: [{ type: "setFlag", key: "task.priority", value: "payment-crash" }], next: "close" },
    standup: { speaker: "tushar", text: "Gyarah baje, standup corner pe. Time pe aana, Rockey ki tarah nahi!", expression: "happy", events: [{ type: "gesture", speaker: "tushar", gesture: "Pointing" }], next: "close" },
    close: { speaker: "player", text: "Done sir, abhi dekhta hoon.", expression: "smile", next: "bye" },
    bye: { speaker: "tushar", text: "Chalo, all the best.", expression: "smile" },
    after: { speaker: "tushar", text: "Task dekh liya? Koi blocker ho toh batana, main CR3 mein hoon baad mein.", expression: "smile",
      choices: [{ text: "Sab clear hai sir.", next: "bye" }, { text: "Ek doubt tha API ka.", next: "api" }] },
    api: { speaker: "tushar", text: "Node team se baat karo — unka staging thoda unstable hai aaj.", expression: "thinking" },
    repeat: { speaker: "tushar", text: "Dragon, desk pe task list khol ke dekh lo pehle.", expression: "neutral",
      choices: [{ text: "Haan sir, abhi.", next: undefined }] },
  }),
  conv("mohit_intro", "mohit", [{ if: { flag: "mohit.met", not: true }, node: "q" }, { node: "again" }], {
    q: { speaker: "mohit", text: "Kal wala UI issue solve hua?", expression: "neutral", events: [{ type: "setFlag", key: "mohit.met", value: true }],
      choices: [{ text: "Haan, fix kar diya.", next: "yes" }, { text: "Abhi check kar raha hoon.", next: "no" }] },
    yes: { speaker: "mohit", text: "Mast! PR bhej do, main review kar deta hoon.", expression: "happy" },
    no: { speaker: "mohit", text: "Theek hai, lunch se pehle ho jaye toh best. Design team wait kar rahi hai.", expression: "thinking" },
    again: { speaker: "mohit", text: "PR ka link Slack pe daal dena bhai.", expression: "smile" },
  }),
  conv("rockey_chai", "rockey", [{ if: { flag: "rockey.chai", not: true }, node: "ask" }, { node: "back" }], {
    ask: { speaker: "rockey", text: "Bro, chai break?", expression: "happy", events: [{ type: "gesture", speaker: "rockey", gesture: "Waving" }],
      choices: [
        { text: "Chalo!", next: "go", set: { "rockey.chai": true }, events: [{ type: "npcActivity", npc: "rockey", activity: "break", spot: "coffee" }] },
        { text: "Thodi der baad.", next: "later" },
      ] },
    go: { speaker: "rockey", text: "Pantry mein milte hain, main coffee machine on karta hoon!", expression: "laugh" },
    later: { speaker: "rockey", text: "Theek hai, par chai thandi ho jayegi phir mat bolna.", expression: "smile" },
    back: { speaker: "rockey", text: "Waah, chai ke baad code bhi fast chalta hai.", expression: "happy" },
  }),
  conv("arpit_intro", "arpit", [{ node: "a" }], {
    a: { speaker: "arpit", text: "Dragon, naya component library ka branch dekha? Storybook bhi update kiya hai.", expression: "smile",
      choices: [{ text: "Abhi dekhta hoon.", next: "b" }, { text: "Kaunsa branch?", next: "c" }] },
    b: { speaker: "arpit", text: "Feedback dena, button variants pe confusion hai.", expression: "neutral" },
    c: { speaker: "arpit", text: "feature/ui-kit-v2. Tushar sir ne approve bhi kar diya.", expression: "smile" },
  }),
  conv("vibhu_intro", "vibhu", [{ node: "a" }], {
    a: { speaker: "vibhu", text: "Yaar build phir se slow ho gaya... Vite config mein kuch toh gadbad hai.", expression: "thinking",
      choices: [{ text: "Cache clear karke dekho.", next: "b" }, { text: "Main baad mein dekhta hoon.", next: "c" }] },
    b: { speaker: "vibhu", text: "Arre haan! Chal gaya. Thanks bhai!", expression: "happy" },
    c: { speaker: "vibhu", text: "Okay, tab tak main tests likhta hoon.", expression: "neutral" },
  }),
  conv("karan_intro", "karan", [{ node: "a" }], {
    a: { speaker: "karan", text: "Dragon! Aaj Friday fun ka plan hai — tum aa rahe ho na?", expression: "happy",
      choices: [{ text: "Pakka!", next: "b" }, { text: "Dekhte hain, deadline hai.", next: "c" }] },
    b: { speaker: "karan", text: "Badhiya. Notice board pe naam likh dena.", expression: "laugh" },
    c: { speaker: "karan", text: "Deadline toh har Friday hoti hai bhai.", expression: "smile" },
  }),
];
