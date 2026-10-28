# Phase 4 — Living Office, Free Roam & Gameplay Validation

Builds on Phases 1–3 without rebuilding them: same Babylon.js renderer, office, characters, mission framework and save format (still schema v2).

## Milestone status

| # | Milestone | Status |
|---|---|---|
| 1 | Real walking & navigation validation | ✅ Done. The chapter plays by walking on WebGL2 and WebGPU (see test results). |
| 2 | Navigation & interaction recovery | ✅ Done. Fixes came from failures in the walking runs. |
| 3 | Living office behaviour | ✅ Done (extends the existing NPC AI). Not yet browser-tested. |
| 4 | Five optional side jobs | ✅ Built and unit-tested. Browser spec written, not run. |
| 5 | Story consequences | ✅ Built and unit-tested. |
| 6 | Environmental storytelling | ✅ Built. Not browser-tested. |
| 7 | UI & input regression | 🟡 Spec written, not run. |
| 8 | Complete regression | 🟡 Unit tests run; the browser suites were not re-run after the later changes. |
| 9 | Performance & visual quality | 🟡 Spec and screenshot baseline prepared, not run. |

Browser testing was paused at the user's request ("don't test, I will test it later"). The items marked 🟡 are ready to run.

## Milestone 1 — real walking

- **`tests/e2e/walker.ts`**, a player bot that uses real input only:
  - Steering: W/Shift held, camera turned by locked-pointer mouse movement (what a player's mouse does). Interactions use E/X, digit keys and clicks.
  - It never writes positions. It *reads* them through the dev diagnostics, plans with the Recast path, and aims at the nav mesh's nearest reachable point. It fails if that point is more than 1 m from the intended spot.
  - Per route it records start, destination, path length, distance walked, detour ratio, blocked frames and stuck recoveries.
  - It fails on timeout, being stuck, overshoot or a detour over 1.8×, and screenshots each failure to `docs/screenshots/phase4/failures/`.
- **`tests/e2e/phase4-navigation.spec.ts`** runs from the title screen through the street, lift, office and all six missions to the chapter card. It then reloads and uses Continue.
  - Checks along the way: DRAGON can't move while the computer is open; typing in the terminal moves nothing and opens nothing; the click-to-look hint stays hidden on the title screen and the chapter card; there is no residual lock after dialogues and panels.
  - It also leaves the computer mid-task and comes back, and re-enters rooms it has already visited.
- **Dev-only diagnostics** in `src/game/debug/NavDiagnostics.ts`:
  - Loaded only when `import.meta.env.DEV`, so they're stripped from production builds.
  - `?diag=1` shows a panel. `window.__diag` reports position, floor and lift state, movement mode, speed, collision blockage, navigation target and path, interaction target and its blockers, current objective, open modal, and perf.
- **`PlayerMovement.blockage`**: the fraction of the intended step lost to collision each frame.
- **Debug controls gated**: F (free camera), backtick (debug), V (views) and H (ceilings), plus `window.__game`, are now dev-only.

## Milestone 2 — recovery fixes (each found by the walking runs)

1. **Seated story NPCs couldn't be talked to.** The `SITTING` state blocked the talk prompt, and Shruti, Mohit and Tushar sit at their desks. An NPC that a live objective (or a side-job offer) needs is now talkable while seated. The Phase 3 test had missed this because it started dialogues directly.
2. **Bystanders stole the E prompt.** Ramesh beat Rockey at the pantry. Talk prompt priority is now ranked: the current required objective's NPC first, then optional objectives and offers, then everyone else.
3. **A Phase 3 save could softlock after load.** If the save happened in the 3-second gap between missions, the next mission was already AVAILABLE and nothing started it. A pending auto-start story mission now starts after the restore.
4. **Chapter completion could fire twice.** Finishing a side job after the chapter would emit `CHAPTER_COMPLETED` again. It now only fires from story missions.
5. Kept from Phase 3: a teleport releases seat reservations and closes the computer; chapter completion is saved as soon as the card appears; remembered story events (Karan's deploy clue) are replayed.

## Milestone 3 — living office (extends the existing NPC AI)

- **Micro-breaks.** About half the office takes one ~6-minute water/coffee/lounge break during each work block of 50+ minutes, each at its own time.
  - This is a pure function, `microBreak()` in `NPCSchedule.ts`, unit-tested.
  - NPCs the story currently needs never wander off.
- **Per-session variety.** `daySeed` varies schedule jitter and breaks between sessions. It is pinned to 0 under automation (`navigator.webdriver`) or with `?seed=N`, so tests stay deterministic.
- **Already existing and reused, not rebuilt:**
  - Desk work and meetings.
  - Colleague chats.
  - Seat reservations.
  - Stuck recovery and watchdog re-planning.
  - Resuming routines after a conversation.
  - Distance-based think/animation rates (10/5/2 Hz think; animation every 1/2/4 frames).

## Milestone 4 — side jobs (`src/data/missions/side.ts`, `src/data/dialogues/side.ts`)

| Job | Starts from | Needs | Steps | Reward / consequence |
|---|---|---|---|---|
| The Missing Task Ticket | Mohit (offer) | M2 done | sticky notes → Arpit's notes → Ishita → Mohit | Mohit +1, `side.ticket` |
| Rockey's Chai Run | Rockey (offer) | M1 done | orders from Arpit, Tushar, Neha → pantry machine → Rockey | Rockey +1, Team +1, `side.chai` |
| The Mystery on the Whiteboard | CR3 whiteboard (object) | M1 done | solve the riddle (wrong answers re-ask) → find “A.” (Arpit) | Team +1, `side.riddle` |
| One Last QA Check | Shruti (offer) | M4 done | QA device → confirm the 320px phone → Shruti | Team +1, `side.qa` |
| Meeting Room Mix-Up | Simran (offer) | M1 done | CR2 booking screen → Ishita → Shruti → propose a fix | Team +1, `side.rooms` |

- **Offers.** Every offer can be declined and is offered again next time. Accepting emits `accept_<id>`, and the StoryDirector starts the job.
- **Saving.** Progress is saved like any other mission, so an interrupted job resumes at the same step.
- **Never required.** Side jobs are never needed for the chapter (unit-tested).
- **Story always wins.** The player's choice of conversation for each NPC is prioritised: live required objective (story before side) > optional objective > mission map > side-job offer > free-roam ambient.
- **HUD.** It shows a ✦ line per active side job. When no story mission is active, the side job becomes the HUD focus and its waypoint is used. The journal lists offered and finished jobs.
- **Engine additions:**
  - `MissionDef.trigger`.
  - `OfficeLife.startSolo()` for NPC-less dialogue (the riddle).
  - A `verify` mode for the QA reproduce puzzle.

## Milestone 5 — consequences

These reuse the existing relationship flags (`rel.tushar`, `rel.mohit`, `rel.rockey`, `rel.team`) and the new `side.*` flags, all saved through the v2 save.

- **Dialogue nodes** gained `branch: [{ if, next }]`.
- **Tushar's deploy report** acknowledges the meeting-room fix and the extra QA pass, only if you did them.
- **After the chapter**, Rockey, Simran, Shruti and Mohit have ambient lines that change depending on whether you did their job, or asked Mohit for help in the stand-up. Missing a job only changes these lines; it never blocks anything.
- **Save compatibility.** Phase 3 saves need no migration: unknown side jobs start LOCKED and unlock from existing progress (unit-tested). The v1 → v2 migration is unchanged and still tested.

## Milestone 6 — environmental storytelling

These are readable details using existing furniture positions; no rooms were remodelled.

- Mohit's sticky notes and Arpit's sprint notes (these change while the ticket job is active).
- The CR3 riddle whiteboard.
- The CR2 booking screen (shows the double-booking until you resolve it).
- The React team achievement board (gains "APX-301 shipped" after the chapter).
- Karan's birthday desk.
- Sprint 42 info on the React whiteboard.

All of it is fictional, with no floating markers.

## Milestones 7–9 — prepared, not run

- **`tests/e2e/phase4-side-missions.spec.ts`:**
  - A: side jobs before and alongside the main story, with a reload mid-job, then the stand-up still works.
  - B: Title → Import of a post-M4 save, then the QA pass and the missing ticket next to Mission 5, consequences checked after a reload, and the journal.
- **`tests/e2e/phase4-regression.spec.ts`** (UI/input and performance):
  - Title, free roam, the HUD hint, pause and pointer-lock restoration, J/M/U, the direction arrow.
  - Keys typed into the computer don't leak to the game; an occupied chair offers no Sit; leaving the computer mid-task; walking right after a dialogue.
  - An interrupted conversation and reload; reaching CR1 from the east side.
  - Performance in six scenarios: FPS, p95/max frame time, spikes over 50 ms, JS heap and its growth, NPC/life update ms, NPCs animated and thinking.
- **Screenshot comparison.** The Phase 3 screenshots were copied as a baseline before any Phase 4 change. Re-running `phase3.spec.ts` regenerates them for comparison.

## Known issues / not done

- **Not run since the later changes:** the walking test passed before Milestones 3–6. After the side jobs, micro-breaks, prompt priority tweaks and the load fix, it has not been re-run.
- **Never run:** the side-mission, regression and performance specs. The Phase 2 and Phase 3 suites were also not re-run after the Phase 4 changes.
- **Side jobs vs the stand-up:** during the CR1 stand-up the React team is in the meeting, so side-job steps that need them only make sense after it. The jobs are ordered so this never blocks.
- **Following moving NPCs:** detour ratios for routes that follow a moving NPC are recorded but don't fail the test (Rockey walks to the pantry while you follow him).
