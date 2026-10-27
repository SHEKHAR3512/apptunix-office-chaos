# Phase 2 Implementation Plan — Characters, NPC AI & Interactions

## 1. Audit of the Phase 1 codebase

| Area | Where | Finding | Phase 2 action |
|---|---|---|---|
| Engine init | `src/core/Engine.ts` | WebGPU first, WebGL 2 fallback, `?renderer=` override | Reuse unchanged |
| Game loop / orchestration | `src/core/Game.ts` | Builds atlas → materials → lighting → outlines → world → player; per-frame update of player, camera, lift, doors, updatables | Extend: character, NPC, interaction, dialogue and clock updates |
| Scene / floors | `src/core/SceneManager.ts` | Active-floor enabling, lazy builds, shadow-caster buckets | Reuse; NPCs live on floor 3 (guard on G) and hide with their floor |
| Toon shaders | `src/rendering/ToonShaders.ts` | Shared vertex shader with instancing includes; no skinning | **Add `bonesDeclaration`/`bonesVertex`.** Babylon `ShaderMaterial` binds bones automatically, so the toon, shadow and outline passes all support skinned meshes with no new pipeline |
| Materials | `src/assets/MaterialRegistry.ts` | Families via vertex colours | Add character families: `charSkin`, `charCloth`, `charHair`, `charEye` |
| Camera | `src/player/CameraController.ts` | Orbit, collision pull-in, fly mode | Move to `src/game/player/`; add shoulder offset, look-ahead, scripted framing (dialogue, computer, sitting) |
| Player controller | `src/player/DevelopmentController.ts` | Camera-relative WASD, AABB collision, smoothing | Evolve into `src/game/player/PlayerMovement.ts`; add NPC avoidance, locomotion lock |
| Placeholder character | `src/player/PlaceholderCharacter.ts` | Rigid transform-node figure | **Replaced** by the skinned character system |
| Rooms & departments | `src/environments/*`, `OfficeLayout.ts` | All rooms exist; zones as data | Reuse; NPC homes come from zones and anchors |
| Desk / chair transforms | `deskSetup()` in `DeskSetup.ts` | Anchors `*.chair/.computer/.stand/.camera` **at the nominal chair spot**, while the visible chair has random offset and yaw | **Fix:** anchors take the chair's real transform so sitting aligns |
| Meeting seats | `seatsAround()` | `cr1.seat.N`, `cr2…`, `cr3…`, `break.t1/t2…` anchors with real transforms | Reuse as the seat registry source |
| Collision | `src/world/Colliders.ts` | ~1,000 AABBs with a grid, door colliders toggle | Reuse for the player; feed into Recast as obstacle geometry |
| Navigation | — | None (brief: Recast) | **Add** Recast nav mesh per floor (floor slab + collider boxes), `RecastJSPlugin` crowd |
| Doors | `src/world/Doors.ts` | Open on player proximity | Open for any character (NPCs included) |
| Lift | `src/world/Lift.ts` | Working; call via E | Route the E prompt through the new interaction system |
| Assets | `AssetManager.ts`, `GeometryBuilder.ts` | Code-modelling kit, GLB export/import | Extend the kit with bone weights; character meshes are built from it |
| UI | `src/ui/*` (React), `core/Store.ts` | HUD, settings, loading | Add dialogue panel, interaction prompt, computer desktop, pause menu, clock |
| Tests | `scripts/playtest.mjs`, `screenshots.mjs` | Puppeteer scripts | Add **Vitest** (logic) and **Playwright** (browser) suites |

Baseline screenshots from the end of Phase 1 are kept in `docs/screenshots/` (Phase 2 shots go to `docs/screenshots/phase2/`).

## 2. Key technical decisions

1. **Characters are code-modelled and skinned.** Blender is not installed on the build machine (same constraint as Phase 1). Characters are built with the modelling kit into one skinned mesh per character on a shared 30-bone humanoid skeleton, with smooth joint weights, so they deform instead of looking segmented. The same `CharacterConfig` data drives every employee, so the style can't diverge.
2. **Procedural, data-driven animation.** No licensed mocap is available offline, and Mixamo is excluded by the brief. Clips are authored as parametric poses (idle variations, walk, run, sit-down, sitting, stand-up, typing, talking, listening, wave, drink, phone, interact) and blended per bone with a cross-fading state machine. Walk and run cycles are phase-locked to ground speed (stride-matched) to avoid foot sliding. Locomotion is in-place, driven by collision and navigation.
3. **Recast** nav mesh plus crowd for NPC routing and avoidance. Sitting and standing are scripted root motions from the approach point to the chair anchor.
4. **Logic separated from rendering** (schedules, state machines, dialogue, seat reservations, interaction scoring) so it can be unit-tested with Vitest in Node.
5. **One shared toon pipeline:** characters get outlines, colour-preserving shadows and the same grade as the office.

## 3. New modules

```
src/game/characters/  CharacterConfig, CharacterAppearance, CharacterFactory, CharacterAnimator, CharacterRegistry, Skeleton
src/game/player/      PlayerCharacter, PlayerMovement, PlayerAnimationController, CameraController
src/game/npc/         NPCController, NPCManager, NPCStateMachine, NPCSchedule, NPCNavigation, NPCBehavior
src/game/interactions InteractionManager, Interactable, ChairInteraction, ComputerInteraction, NPCInteraction, SeatRegistry
src/game/dialogue/    DialogueManager, DialogueData, DialogueEvents
src/game/GameClock.ts
src/ui/dialogue/      DialoguePanel, DialogueChoices
src/ui/               InteractionPrompt, ComputerDesktop, PauseMenu, ClockWidget
src/data/characters/  roster
src/data/dialogues/   conversations
src/data/schedules/   department templates
tests/unit/           Vitest      tests/e2e/   Playwright
```

## 4. Milestones and quality gates

1. **DRAGON:** close-up review of face, hair, hands and outline in the React department; walk and run at matching speed.
2. **Tushar:** desk assignment, sit and type, dialogue with facing and camera; navigation to standup.
3. **Roster:** six React NPCs plus four per department, HR, receptionist, support staff (31 characters).
4. **Living office:** clock, schedules, meetings, breaks, ambient variation, throttling.
5. **Interactions:** sit (player and NPC reservations), computer, CR seating, water, noticeboard.
6. **Tests and performance:** Vitest, Playwright, screenshot review, FPS on both backends.
