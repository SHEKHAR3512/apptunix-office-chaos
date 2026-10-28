# Phase 3 Implementation — Gameplay, Missions, Story & Developer Simulator

## 1. Audit: what already exists (reused, not rebuilt)

| System | Location | Reuse in Phase 3 |
|---|---|---|
| Game loop, floors, lift, doors | `core/Game.ts`, `core/SceneManager.ts`, `world/Lift.ts` | Lift requests and arrivals become typed events |
| DRAGON controller and camera | `game/player/*` | Scripted camera (`setScripted`, smooth blend) drives every cinematic shot |
| NPC brains | `game/npc/NPCController.ts` (FSM, `force(activity)`, schedule, Recast) | Story choreography uses `force()`: meetings, chai break, finale |
| Interactions | `game/interactions/*` (proximity + facing, seats with reservations) | New inspectables (QA device, DevOps dashboard) use the same system |
| Dialogue engine | `game/dialogue/DialogueManager.ts` (flags, time conditions, events) | Extended: numeric conditions (`gte`), relationship deltas, choice callbacks, multi-speaker scenes |
| Computer | `game/interactions/ComputerInteraction.ts` + `ui/ComputerDesktop.tsx` | Session and in-world screen kept; the desktop is replaced by a full app suite |
| Clock and schedules | `game/GameClock.ts`, `data/schedules` | Narrative time windows clamp the clock during missions (no softlocks) |
| UI store | `core/Store.ts` (`hud`) | A second store (`play`) holds gameplay UI state |
| Event hooks | `Game.emit/on` (untyped strings) | Replaced by the typed `GameEventBus` (`Game.emit` kept as an adapter) |
| Save state | — (only settings in `localStorage`) | **New:** `SaveManager` (Dexie/IndexedDB → localStorage → memory) |

## 2. New systems

```
src/game/gameplay/   GameEventBus · ProgressionManager · PlayState (UI store)
src/game/missions/   MissionTypes · MissionStateMachine · ObjectiveEvaluator · MissionManager · MissionRegistry
src/game/minigames/  PuzzleEngine (find-bug · fix-component · pipeline · reproduce) · TerminalParser (allowlist)
src/game/persistence SaveSchema (versioned + migrations) · SaveManager
src/game/story/      StoryDirector · MeetingDirector · CutsceneDirector · OfficeEventScheduler · ZoneTracker · WaypointMarker
src/data/missions/   chapter1.ts        src/data/puzzles/ chapter1.ts      src/data/dialogues/ chapter1.ts
src/ui/computer/     Desktop · TaskBoard · CodeEditor · TerminalSimulator · TeamChat · BrowserPreview
src/ui/missions/     MissionHUD · MissionJournal · ObjectiveNotification · OfficeMap · TitleMenu · ChapterCard · QADevice
```

## 3. Integration strategy
- **Missions only move on validated, typed events.** Each objective declares the event type and payload it accepts. Only the *current* required objective of the *active* mission (plus that mission's optional objectives) can advance, so an unrelated NPC or object can't complete anything by accident. Completion is idempotent.
- **Mission behaviour is data.** `onStart`, `onObjective` and `onComplete` are lists of story actions (chat, notify, set time window, force NPC activity, prepare meeting, cutscene, unlock, sound). The `StoryDirector` executes them, so missions never touch rendering code.
- **State re-checks:** when an objective activates, the director re-emits the current state (zone, seat, computer), so "already there" objectives complete immediately instead of stalling.
- **No time softlocks:** each mission sets a narrative time window, and story-critical NPCs are forced into place, so schedules can never send them home mid-mission.
- **Choices never block progress.** Every branch converges, and relationships only change later lines.

## 4. Dependency decisions
| Need | Decision | Why |
|---|---|---|
| Mission workflows | Own typed state machine (≈120 lines, unit-tested) instead of XState | Tiny transition set, no extra runtime |
| Code editor | Own highlighted editor instead of Monaco | Puzzles are structured (select / apply), so no free-form code is ever evaluated; Monaco would add ~3 MB |
| Terminal | Own allowlisted parser + UI instead of xterm.js | Commands are tokenised against a fixed allowlist; nothing reaches an OS |
| Persistence | **Dexie** (IndexedDB) with localStorage and in-memory fallbacks | Robust, small, handles quota and denial |
| Browser tests | Playwright (already in use) | Full chapter playthrough on WebGL 2 and WebGPU |

## 5. Milestones
1. Core gameplay: event bus, mission FSM, objectives, tracker.
2. Computer simulator: apps and puzzle engine.
3. Vertical slice: Missions 1–3 (arrival, CR1 stand-up, React bug).
4. Missions 4–6: QA, chai break, deployment.
5. Cinematics: shots, meeting director, finale.
6. Persistence: save, continue, migrations.
7. Polish: audio, notifications, side conversations, map.
8. Testing: unit + full-chapter browser playthrough + screenshots.

## 6. Test strategy
- **Vitest (pure logic):** objective matching, prerequisites, duplicate events, invalid transitions, branching and relationship conditions, every puzzle (validation, hints, retries), terminal allowlist, meeting readiness, save round-trip and migration, recovery from corrupt data, chapter completion.
- **Playwright:** a full Chapter 1 playthrough driven by real key presses and UI clicks, with screenshots at each required beat, run on both backends.

## 7. Status (2026-10-28)
All eight milestones are done. Chapter 1 can be played from the title screen to the chapter card.
- `tests/e2e/phase3.spec.ts` plays the whole chapter through real key presses and UI clicks, on both WebGL 2 and WebGPU. The run includes a wrong-line guess and a rejected shell-injection attempt in the terminal. Screenshots are in `docs/screenshots/phase3/`.
- 51 Vitest unit tests cover missions, puzzles, the terminal allowlist, saves and migration, meeting readiness and zones.
- Bugs found and fixed during the playthrough:
  - Teleporting mid-stand leaked the seat reservation.
  - Teleporting left the computer open.
  - Return-to-NPC objectives replayed the first conversation; they now use the live objective's conversation.
  - Story beats emitted before their objective went live were lost; they are now saved as `story.<id>` flags and replayed on activation.
  - Chapter completion is now saved as soon as the chapter card appears.
- Known gaps:
  - The test drives movement by teleporting.
  - The office layout is still unverified against the real building.
  - Likenesses and the logo are placeholders.
