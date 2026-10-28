import { conv } from "../../game/dialogue/DialogueData";

/**
 * Side-job conversations. Offers can be declined (the job stays available and is offered again
 * next time). Accepting emits `accept_<missionId>`, which the StoryDirector turns into a start.
 */
export const SIDE_DIALOGUES = [
  // ------------------------------------------------------------------ S1 missing ticket
  conv("s1_offer", "mohit", [{ node: "a" }], {
    a: { speaker: "mohit", text: "Bhai, APX-288 board se gayab ho gaya. Kal tak yahin tha, main kasam kha sakta hoon. 🫠", expression: "thinking",
      choices: [
        { id: "yes", text: "“Chill, main dhoondta hoon.”", next: "y", rel: { mohit: 1 } },
        { id: "no", text: "“Abhi thoda busy hoon, baad mein?”", next: "n" },
      ] },
    y: { speaker: "mohit", text: "Legend. Mere monitor pe sticky notes check karo, wahan kuch likha tha shayad.", expression: "happy", events: [{ type: "emit", name: "accept_s1_ticket" }] },
    n: { speaker: "mohit", text: "No worries, jab free ho batana. Ticket kahin bhaag toh nahi raha. 😅", expression: "smile" },
  }),
  conv("s1_ishita", "ishita", [{ node: "a" }], {
    a: { speaker: "ishita", text: "APX-288? Oh no… kal design review mein maine galti se apne column mein drag kar diya tha! 🙈", expression: "surprised", next: "b" },
    b: { speaker: "ishita", text: "Wapas React column mein daal diya. Mohit ko sorry bol dena, please.", expression: "smile" },
  }),
  conv("s1_done", "mohit", [{ if: { rel: "mohit", gte: 2 }, node: "close" }, { node: "a" }], {
    close: { speaker: "mohit", text: "Ishita ne drag kar diya tha?! Hahaha. Tu sach mein detective hai bhai. Next chai meri taraf se. ☕", expression: "laugh" },
    a: { speaker: "mohit", text: "Design column mein tha? Wow. Thanks yaar, sprint bach gaya.", expression: "happy" },
  }),

  // ------------------------------------------------------------------ S2 chai run
  conv("s2_offer", "rockey", [{ node: "a" }], {
    a: { speaker: "rockey", text: "Chai run time! Tu orders le aa — Arpit, Tushar sir, aur Neha. Main… supervise karunga. 😎", expression: "happy",
      choices: [
        { id: "yes", text: "“Supervise? Theek hai, chal.”", next: "y" },
        { id: "no", text: "“Bro, tu khud le le.”", next: "n" },
      ] },
    y: { speaker: "rockey", text: "Yeh hui na baat. Orders yaad rakhna, phir pantry machine pe bana dena.", expression: "laugh", events: [{ type: "emit", name: "accept_s2_chai" }] },
    n: { speaker: "rockey", text: "Theek hai theek hai… offer open hai. 🫡", expression: "neutral" },
  }),
  conv("s2_arpit", "arpit", [{ node: "a" }], {
    a: { speaker: "arpit", text: "Cutting chai, kam cheeni. Aur Rockey ko bolna is baar tank bhar ke aaye. 😄", expression: "smile" },
  }),
  conv("s2_tushar", "tushar", [{ node: "a" }], {
    a: { speaker: "tushar", text: "Ek adrak wali. Aur Dragon — thanks for helping the team, chhoti cheezein matter karti hain.", expression: "smile" },
  }),
  conv("s2_neha", "neha", [{ node: "a" }], {
    a: { speaker: "neha", text: "Green tea please! Reception pe chai allowed nahi hai officially. 🤫", expression: "laugh" },
  }),
  conv("s2_done", "rockey", [{ node: "a" }], {
    a: { speaker: "rockey", text: "Cutting kam cheeni, adrak wali, green tea… perfect! Team ka asli hero tu nikla. 🦸", expression: "laugh", next: "b" },
    b: { speaker: "rockey", text: "Main sab ko bataunga ki idea mera tha. 😏", expression: "happy" },
  }),

  // ------------------------------------------------------------------ S3 whiteboard riddle (solo, read from the whiteboard)
  conv("s3_riddle", "player", [{ node: "q" }], {
    q: { speaker: "player", text: "“I have keys but open no locks. I have space but no room. You can enter, but you can't go inside.” — A.",
      choices: [
        { id: "keyboard", text: "A keyboard.", next: "ok" },
        { id: "server", text: "The server room.", next: "no" },
        { id: "lift", text: "The lift.", next: "no" },
        { id: "later", text: "(Think about it later)", next: "later" },
      ] },
    no: { speaker: "player", text: "Hmm, that doesn't fit every line. Space… enter… keys… 🤔", next: "q" },
    later: { speaker: "player", text: "I'll come back to this whiteboard." },
    ok: { speaker: "player", text: "A keyboard! Space bar, Enter key. Now… who is “A.”?", expression: "happy" },
  }),
  conv("s3_arpit", "arpit", [{ node: "a" }], {
    a: { speaker: "arpit", text: "Keyboard! Finally koi solve kar paya. Tushar sir ne ‘lift’ bola tha. 😂", expression: "laugh", next: "b" },
    b: { speaker: "arpit", text: "Agle hafte naya riddle likhunga. Tum hi first try karna.", expression: "smile" },
  }),

  // ------------------------------------------------------------------ S4 extra QA pass
  conv("s4_offer", "shruti", [{ node: "a" }], {
    a: { speaker: "shruti", text: "Fix toh approve ho gaya, but lab ka sabse purana phone — 320px — usko maine check nahi kiya. Ek last pass?", expression: "thinking",
      choices: [
        { id: "yes", text: "“Bilkul. Better safe than reopened.”", next: "y", rel: { team: 1 } },
        { id: "no", text: "“Shayad baad mein.”", next: "n" },
      ] },
    y: { speaker: "shruti", text: "Love it. Test device pe width sabse kam karke dekho.", expression: "happy", events: [{ type: "emit", name: "accept_s4_qa" }] },
    n: { speaker: "shruti", text: "Okay! Offer valid till release. 😄", expression: "smile" },
  }),
  conv("s4_done", "shruti", [{ node: "a" }], {
    a: { speaker: "shruti", text: "320px pe bhi clean? Perfect. Release notes mein ‘tested on the potato phone’ likh rahi hoon. 🥔✅", expression: "laugh" },
  }),

  // ------------------------------------------------------------------ S5 meeting room mix-up
  conv("s5_offer", "simran", [{ node: "a" }], {
    a: { speaker: "simran", text: "Dragon, ek help? CR2 4 baje double-booked hai — Design review aur QA sync. Dono teams mujhe dekh rahi hain. 😬", expression: "thinking",
      choices: [
        { id: "yes", text: "“Main sort karta hoon.”", next: "y" },
        { id: "no", text: "“Abhi nahi, sorry Simran.”", next: "n" },
      ] },
    y: { speaker: "simran", text: "Thank you! Pehle CR2 ka booking screen dekh lo.", expression: "happy", events: [{ type: "emit", name: "accept_s5_rooms" }] },
    n: { speaker: "simran", text: "Koi baat nahi, main manage karti hoon… somehow. 🙃", expression: "smile" },
  }),
  conv("s5_ishita", "ishita", [{ node: "a" }], {
    a: { speaker: "ishita", text: "Design review ko projector chahiye, aur CR2 mein hi big screen hai. Bas 45 minutes.", expression: "neutral" },
  }),
  conv("s5_shruti", "shruti", [{ node: "a" }], {
    a: { speaker: "shruti", text: "QA sync? Hum toh kahin bhi kar lenge — CR3 ka whiteboard bhi chalega.", expression: "smile" },
  }),
  conv("s5_resolve", "simran", [{ node: "a" }], {
    a: { speaker: "simran", text: "Toh? Kya plan hai?",
      choices: [
        { id: "split", text: "“Design CR2 le, QA CR3 mein shift ho jaye.”", next: "good", rel: { team: 1 } },
        { id: "swap", text: "“QA 4:45 pe CR2 le le, Design pehle.”", next: "ok" },
      ] },
    good: { speaker: "simran", text: "Perfect — dono khush. Calendar update kar diya. You're a lifesaver!", expression: "happy" },
    ok: { speaker: "simran", text: "Thoda tight hai, but chalega. Thanks Dragon!", expression: "smile" },
  }),

  // ------------------------------------------------------------------ ambient after the chapter (consequences, never blocking)
  conv("fr_rockey", "rockey", [{ if: { flag: "side.chai" }, node: "done" }, { node: "missed" }], {
    done: { speaker: "rockey", text: "Aaj ka chai run legendary tha. Kal bhi tu hi orders lega, haan? 😄", expression: "laugh" },
    missed: { speaker: "rockey", text: "Kabhi chai run pe chal mere saath, bohot gossip milta hai. ☕", expression: "smile" },
  }),
  conv("fr_simran", "simran", [{ if: { flag: "side.rooms" }, node: "done" }, { node: "missed" }], {
    done: { speaker: "simran", text: "CR2 wala jhagda solve karne ke liye thanks again. HR ki taraf se ek virtual cookie. 🍪", expression: "happy" },
    missed: { speaker: "simran", text: "Long day? Pantry mein snacks rakhe hain, le lena. 😊", expression: "smile" },
  }),
  conv("fr_shruti", "shruti", [{ if: { flag: "side.qa" }, node: "done" }, { node: "missed" }], {
    done: { speaker: "shruti", text: "Potato phone pe bhi pass. Main tumhe officially ‘QA-friendly developer’ declare karti hoon. 🏅", expression: "laugh" },
    missed: { speaker: "shruti", text: "Fix solid tha! Next time chhote phones bhi saath mein check karenge. 📱", expression: "smile" },
  }),
  conv("fr_mohit", "mohit", [{ if: { flag: "side.ticket" }, node: "done" }, { if: { rel: "mohit", gte: 2 }, node: "friend" }, { node: "plain" }], {
    done: { speaker: "mohit", text: "APX-288 wapas mil gaya, deploy ho gaya… aaj ka din set hai. Thanks bhai! 🙌", expression: "happy" },
    friend: { speaker: "mohit", text: "Aaj tune help maangi thi na? Bilkul sahi kiya. Pair-debugging best hai.", expression: "smile" },
    plain: { speaker: "mohit", text: "Good work aaj. Kal fresh bugs milenge. 😅", expression: "smile" },
  }),
];
