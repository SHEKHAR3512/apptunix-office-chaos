import { conv } from "../../game/dialogue/DialogueData";

/**
 * Chapter 1 conversations. Fictional, playful, respectful. Choices change later lines and
 * relationships (rel.*) but every branch converges, so the story can never be blocked.
 */
const ACKS = [{ if: { flag: "side.rooms" }, next: "ack_rooms" }, { if: { flag: "side.qa" }, next: "ack_qa" }];

export const CHAPTER1_DIALOGUES = [
  // ------------------------------------------------------------------ M1
  conv("m1_neha", "neha", [{ node: "a" }], {
    a: { speaker: "neha", text: "Good morning Dragon! Tushar sir subah se aapko dhoondh rahe the. 😄", expression: "smile",
      choices: [
        { id: "coffee", text: "Pehle coffee, phir Tushar sir.", next: "b", rel: { neha: 1 } },
        { id: "hurry", text: "Uh oh. Kya hua?", next: "c" },
      ] },
    b: { speaker: "neha", text: "Haha, coffee pantry mein ready hai. React wing straight corridor ke left mein hai.", expression: "happy", next: "d" },
    c: { speaker: "neha", text: "Kuch nahi, bas “ek chhota sa change” bol rahe the. Aap toh jaante ho. 😅", expression: "laugh", next: "d" },
    d: { speaker: "neha", text: "Aapka desk React section mein hai, window ke paas. Have a great day!", expression: "smile" },
  }),

  // ------------------------------------------------------------------ M2 stand-up (multi-speaker, run by the MeetingDirector)
  conv("m2_standup", "tushar", [{ node: "open" }], {
    open: { speaker: "tushar", text: "Okay team, quick standup. Five minutes, I promise. 🙏", expression: "smile", camera: "speaker", next: "mohit" },
    mohit: { speaker: "mohit", text: "Kal maine checkout API integrate kar di. Aaj payment retries pe hoon.", expression: "neutral", camera: "speaker", next: "arpit" },
    arpit: { speaker: "arpit", text: "Storybook mein naye button variants add kiye. Design se feedback pending hai.", expression: "smile", camera: "speaker", next: "rockey" },
    rockey: { speaker: "rockey", text: "Mera blocker: chai machine ka water tank khaali hai. 😤", expression: "serious", camera: "speaker", next: "tushar_r" },
    tushar_r: { speaker: "tushar", text: "Rockey… noted. 😑 Dragon, tumhara update?", expression: "thinking", camera: "speaker", next: "status" },
    status: { speaker: "player", text: "(Your status update)", camera: "overShoulder",
      choices: [
        { id: "confident", text: "“Profile screen done hai. Aaj kuch bhi de do, kar dunga!”", next: "r_conf", rel: { tushar: 1 }, set: { "m2.status": "confident" } },
        { id: "clarify", text: "“Profile screen done. Aaj ka priority kya hai, exactly?”", next: "r_clar", rel: { tushar: 1, team: 1 }, set: { "m2.status": "clarify" } },
        { id: "investigate", text: "“Ek issue dekh raha tha… usse investigate karna padega.”", next: "r_inv", set: { "m2.status": "investigate" } },
      ] },
    r_conf: { speaker: "tushar", text: "Confidence! I like it. Toh yeh lo…", expression: "happy", camera: "speaker", next: "task" },
    r_clar: { speaker: "tushar", text: "Good question. Priority ek hi hai aaj —", expression: "smile", camera: "speaker", next: "task" },
    r_inv: { speaker: "tushar", text: "Investigate karna achhi baat hai. Par pehle yeh dekh lo —", expression: "thinking", camera: "speaker", next: "task" },
    task: { speaker: "tushar", text: "APX-301: “Add to cart” counter update nahi ho raha. Bas ek chhota sa change hai. 🙂", expression: "smile", camera: "speaker",
      events: [{ type: "emit", name: "TASK_ACCEPTED", data: { ticket: "APX-301" } }], next: "karan" },
    karan: { speaker: "karan", text: "“Chhota sa change”… famous last words. 😂", expression: "laugh", camera: "speaker", next: "mohit_help" },
    mohit_help: { speaker: "mohit", text: "Dragon, help chahiye toh ping kar dena. Main cart hook jaanta hoon.", expression: "smile", camera: "speaker",
      choices: [
        { id: "ask_mohit", text: "“Thanks Mohit, zaroor!”", next: "close", rel: { mohit: 1 } },
        { id: "solo", text: "“Main sambhal lunga, bro.”", next: "close" },
      ] },
    close: { speaker: "tushar", text: "Perfect. Standup done — 4 minutes 59 seconds. New record! Chalo, kaam pe. 🚀", expression: "happy", camera: "wide" },
  }),

  // ------------------------------------------------------------------ M4
  conv("m4_shruti", "shruti", [{ node: "a" }], {
    a: { speaker: "shruti", text: "Dragon! Desktop pe sab perfect hai. Par mere phone pe dekho…", expression: "thinking",
      choices: [
        { id: "works", text: "“But it works on my machine!”", next: "b_works" },
        { id: "show", text: "“Dikhao, kya ho raha hai?”", next: "b_show", rel: { shruti: 1 } },
      ] },
    b_works: { speaker: "shruti", text: "Sabki machine pe chalta hai, users ki machine pe nahi. 😏 Device lab mein test phone rakha hai.", expression: "smile", next: "c" },
    b_show: { speaker: "shruti", text: "Device lab mein test phone hai. Screen chhoti karke dekho, product row bahar nikal jaati hai.", expression: "neutral", next: "c" },
    c: { speaker: "shruti", text: "Reproduce kar lo, phir fix. Main yahin hoon.", expression: "smile" },
  }),
  conv("m4_approve", "shruti", [{ if: { flag: "qa.reproduced" }, node: "a" }, { node: "a" }], {
    a: { speaker: "shruti", text: "Ek second… 360px, 414px, tablet… sab clean! ✅", expression: "happy", next: "b" },
    b: { speaker: "shruti", text: "Approved. Aur haan — overflow hidden nahi kiya, thank you. QA ka dil jeet liya. 💖", expression: "laugh",
      events: [{ type: "emit", name: "QA_APPROVED", data: { ticket: "APX-301" } }] },
  }),

  // ------------------------------------------------------------------ M5
  conv("m5_rockey", "rockey", [{ node: "a" }], {
    a: { speaker: "rockey", text: "Bro, chai pe chalein? Tank maine khud bhara hai. Hero hoon main. 🦸", expression: "happy",
      choices: [
        { id: "yes", text: "“Build deploy hone wali hai, usse pehle ek chai toh banti hai.”", next: "b", rel: { rockey: 1 } },
        { id: "quick", text: "“Chalo, par jaldi — paanch baje deploy hai.”", next: "b" },
      ] },
    b: { speaker: "rockey", text: "Yeh hui na baat! Vibhu aur Karan bar table pe hain. Aaja. ☕", expression: "laugh" },
  }),
  conv("m5_vibhu", "vibhu", [{ node: "a" }], {
    a: { speaker: "vibhu", text: "Dragon! Cart wala bug tune fix kiya? Spread operator ka kamaal. ✨", expression: "happy",
      choices: [
        { id: "credit", text: "“Mohit ne hint diya tha.”", next: "b_credit", if: { rel: "mohit", gte: 1 }, rel: { mohit: 1, team: 1 } },
        { id: "humble", text: "“Team effort, bhai.”", next: "b_humble", rel: { team: 1 } },
        { id: "brag", text: "“Haan, ek line ka fix. Easy.”", next: "b_brag" },
      ] },
    b_credit: { speaker: "vibhu", text: "Mohit aur cart hooks — legendary jodi. 😄", expression: "laugh", next: "c" },
    b_humble: { speaker: "vibhu", text: "Humble bhi ho, nice. Mujhe bhi Vite config mein help chahiye kabhi.", expression: "smile", next: "c" },
    b_brag: { speaker: "vibhu", text: "Ek line, do QA rounds. 😏 Classic.", expression: "laugh", next: "c" },
    c: { speaker: "vibhu", text: "Waise Karan kuch deploy ke baare mein bol raha tha. Usse pucho.", expression: "neutral" },
  }),
  conv("m5_karan", "karan", [{ node: "a" }], {
    a: { speaker: "karan", text: "Dragon, ek baat — kal staging pe ek naya env var add hua tha. PAYMENT_API_URL.", expression: "thinking",
      choices: [
        { id: "prod", text: "“Production mein bhi add hua?”", next: "b" },
        { id: "so", text: "“Toh?”", next: "b" },
      ] },
    b: { speaker: "karan", text: "Pata nahi yaar… agar production mein nahi hai toh deploy phat jayega. Vault check kar lena. 👀", expression: "serious",
      events: [{ type: "emit", name: "clue_env" }, { type: "setFlag", key: "clue.env", value: true }], next: "c" },
    c: { speaker: "karan", text: "Aur haan, Friday fun mein aa rahe ho na? 😄", expression: "happy" },
  }),
  conv("m5_side_design", "ishita", [{ node: "a" }], {
    a: { speaker: "ishita", text: "Dragon! Tumhare cart fix ke baad maine button ka shadow bhi theek kar diya. 2px se 3px. Huge.", expression: "happy",
      choices: [{ id: "wow", text: "“Pixel-perfect queen. 👑”", next: "b", rel: { team: 1 } }, { id: "nod", text: "“Mujhe toh same lag raha hai…”", next: "c" }] },
    b: { speaker: "ishita", text: "Finally someone appreciates spacing! 💜", expression: "laugh" },
    c: { speaker: "ishita", text: "…Engineers. 🙄 Figma mein side-by-side dekhna.", expression: "serious" },
  }),
  conv("m5_side_chai", "ramesh", [{ node: "a" }], {
    a: { speaker: "ramesh", text: "Sir, adrak wali ya elaichi? Aaj dono bani hai.", expression: "smile",
      choices: [{ id: "adrak", text: "“Adrak wali, please!”", next: "b" }, { id: "elaichi", text: "“Elaichi, bhaiya.”", next: "b" }] },
    b: { speaker: "ramesh", text: "Bilkul sir. Deploy se pehle chai, deploy ke baad samosa — yahi rule hai. 😄", expression: "laugh" },
  }),
  conv("m5_side_hr", "simran", [{ node: "a" }], {
    a: { speaker: "simran", text: "Dragon, Friday fun ke liye team name chahiye. React team ka koi idea?", expression: "smile",
      choices: [{ id: "hooks", text: "“The Hooked Ones.”", next: "b" }, { id: "state", text: "“useState of Mind.”", next: "b" }] },
    b: { speaker: "simran", text: "Haha, likh liya! Notice board pe lag jayega. 📝", expression: "laugh" },
  }),
  conv("m5_side_devops", "vikram", [{ node: "a" }], {
    a: { speaker: "vikram", text: "Deploy paanch baje? Bas please Friday ko nahi. Aaj Thursday hai na? …Na? 😰", expression: "surprised",
      choices: [{ id: "thursday", text: "“Thursday hai, relax.”", next: "b" }] },
    b: { speaker: "vikram", text: "Phew. Pipeline mein kuch phate toh pehle `logs` dekhna, phir mujhe ping karna.", expression: "smile" },
  }),

  // ------------------------------------------------------------------ M6
  conv("m6_mohit", "mohit", [{ if: { rel: "mohit", gte: 1 }, node: "friend" }, { node: "a" }], {
    friend: { speaker: "mohit", text: "Partner! Pipeline red hai. Tumne help maangi thi na subah — ab meri baari. 😅", expression: "thinking", next: "a" },
    a: { speaker: "mohit", text: "Build aur tests pass hain, par service start hi nahi ho rahi production pe.", expression: "serious",
      choices: [
        { id: "clue", text: "“Karan ne ek env var ka bola tha… PAYMENT_API_URL?”", next: "b_clue", if: { flag: "clue.env" }, rel: { mohit: 1 } },
        { id: "look", text: "“Chalo DevOps console dekhte hain.”", next: "b" },
      ] },
    b_clue: { speaker: "mohit", text: "Ohhh. Woh staging pe add hua tha! DevOps console pe check karo. 🔍", expression: "surprised", next: "c" },
    b: { speaker: "mohit", text: "Haan, DevOps wall pe dashboard hai. Logs se shuru karna.", expression: "neutral", next: "c" },
    c: { speaker: "mohit", text: "Main yahin hoon, kuch chahiye toh shout kar dena!", expression: "smile" },
  }),
  conv("m6_tushar", "tushar", [{ if: { rel: "tushar", gte: 2 }, node: "proud" }, { node: "a" }], {
    proud: { speaker: "tushar", text: "Deploy live dekha maine. Dragon, aaj tumne kamaal kar diya. 👏", expression: "happy", next: "b" },
    a: { speaker: "tushar", text: "Deploy live hai? Kya hua tha?", expression: "thinking", next: "b" },
    b: { speaker: "player", text: "Production mein PAYMENT_API_URL missing tha. Vault se restore kiya, tests green, deploy done.",
      choices: [
        { id: "team", text: "“Poori team ka kaam hai, sir.”", next: "c", rel: { team: 1 } },
        { id: "small", text: "“Bas ek chhota sa change tha. 😏”", next: "c_joke", rel: { tushar: 1 } },
      ] },
    c: { speaker: "tushar", text: "Exactly the attitude.", expression: "happy", branch: ACKS, next: "go" },
    c_joke: { speaker: "tushar", text: "Haha! Touché. 😂", expression: "laugh", branch: ACKS, next: "go" },
    // consequences of optional side jobs: acknowledged here, never required
    ack_rooms: { speaker: "tushar", text: "Aur Simran bata rahi thi tumne CR2 ka double-booking bhi sort kiya. Ownership, love it.", expression: "smile", branch: [{ if: { flag: "side.qa" }, next: "ack_qa" }], next: "go" },
    ack_qa: { speaker: "tushar", text: "Shruti ne bola tumne 320px wala extra QA pass bhi kiya. Isse hi ‘done’ kehte hain.", expression: "happy", next: "go" },
    go: { speaker: "tushar", text: "Chalo, sab ko bulao — celebration banta hai!", expression: "happy" },
  }),
  conv("m6_finale", "tushar", [{ node: "a" }], {
    a: { speaker: "tushar", text: "Team! APX-301 production pe live hai. Cart counter finally count kar raha hai. 🎉", expression: "happy", camera: "wide", next: "b" },
    b: { speaker: "rockey", text: "Iska matlab… samosa party? 🥟", expression: "laugh", camera: "speaker", next: "c" },
    c: { speaker: "mohit", text: "Aur Monday ko retro mein “env vars checklist” pakka.", expression: "smile", camera: "speaker", next: "d" },
    d: { speaker: "karan", text: "Main pehle se bol raha tha. Clue mera tha! 😎", expression: "happy", camera: "speaker", next: "e" },
    e: { speaker: "vibhu", text: "Aur QA ne sirf ek baar reject kiya. Growth. 📈", expression: "laugh", camera: "speaker", next: "f" },
    f: { speaker: "tushar", text: "Great work, everyone. Kal milte hain — aur haan, kal bas ek chhota sa change… 😉", expression: "smile", camera: "wide" },
  }),
];
