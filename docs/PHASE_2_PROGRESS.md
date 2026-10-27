# Phase 2 Progress — Characters, NPC AI & Interactions

_Last updated: 2026-10-27_

## Definition of Done audit

| Requirement | Status | Evidence / notes |
|---|---|---|
| DRAGON is a completed stylised 3D character | ✅ (code-modelled) | Skinned 31-bone rig, hoodie/jeans/sneakers, swept-fringe hair with anime highlight band, headphones, lanyard, watch, five-finger hands, eyes that blink and track. `screenshots/phase2/dragon-reception.png`, `react-team-lineup*.png` |
| Natural player movement | ✅ | Camera-relative WASD, Shift run, backpedal on S, strafe with right mouse, acceleration and braking, turn-in-place steps, NPC body collision. e2e test 1–4 |
| Smooth animation blending | ✅ | Cross-faded base states plus a gesture layer and additive look-at, blink, expressions and lip-flap. The walk/run cycle is phase-locked to ground speed (stride 1.45 → 2.5 m) to avoid foot sliding |
| Six named React NPCs | ✅ | Tushar, Mohit, Arpit, Vibhu, Rockey (dastar, full beard, kara), Karan, each on their Phase 1 desk. e2e test 5–7 |
| ≥ 4 NPCs per other department | ✅ | Angular 4 · Node 4 · DevOps 4 · Design 4 · QA 4 · HR 2 · reception 1 · office support 1 · security 1 (ground floor). **31 characters + DRAGON** |
| Believable routines | ✅ | In-game clock (1 game-min per real second), schedule templates with per-NPC jitter: arrive, work (typing bursts, phone checks), stand-ups, CR1/CR2/CR3 meetings, chats at colleagues' desks, lunch, coffee/water breaks, leaving |
| Navigation around furniture | ✅ | Recast nav mesh baked from Phase 1 floor and colliders, Detour crowd avoidance, stuck recovery (re-path → nudge → teleport). NPCs open automatic doors. e2e test 8 checks no wall penetration on a cross-floor route |
| Interact with employees | ✅ | `[E] Talk to <name>` for every NPC, proximity + facing selection |
| Conversations work | ✅ | Data-driven branching dialogue (flags, time conditions, events) with all lines from the brief; React panel with typewriter text and numbered replies; NPC swivels or turns to face DRAGON; over-the-shoulder camera; movement locked and restored. e2e test 11–12 |
| DRAGON can sit at his desk | ✅ | Aligns to the exact chair anchor, SitDown → Sitting → StandUp, seat reservations (one occupant per chair), cancel-safe. e2e test 9 |
| Basic computer interaction | ✅ | Monitor powers on in-world (boot → desktop texture), scripted camera, ApptuOS desktop with Editor, Tasks, Team chat and Preview; Esc to exit. e2e test 10 |
| Meeting-room seating | ✅ | Free chair in CR1/CR2/CR3 → sit, look toward the screen, `meeting:joined` event for Phase 3. e2e test 13–14 |
| Phase 1 art direction preserved | ✅ | Characters use the same toon pipeline (bands, coloured shadows, outlines, grade); new `character`, `hair` and `eye` families |
| Runs in the browser | ✅ | WebGL 2 and WebGPU, dev and production builds |
| Automated + real browser testing | ✅ | **21 Vitest** unit tests, **14 Playwright** tests (7 × 2 backends), Phase 1 playtest 10/10, screenshot review |

## Measurements (Apple Silicon Mac, Chrome, 1600×900, High preset)

| View | WebGL 2 | WebGPU | Draw calls* |
|---|---|---|---|
| React department | 60 fps | 60 fps | ~700 |
| Main corridor (most NPCs in view) | 60 fps | 60 fps | ~795 |
| CR1 | 60 fps | 60 fps | ~650 |

\* Across the colour, shadow and outline passes. CPU frame time ≈ 3.2 ms with 30 NPCs (behaviour updates at 10/5/2 Hz by distance; animation every 1st/2nd/4th frame by distance; eye meshes hidden beyond 22 m). JS heap ≈ 330 MB. Load ≈ 3.7 s (WebGL 2) / 7.8 s (WebGPU, includes shader transpile).

## Bugs found and fixed during testing
1. **All NPCs rendered standing** while their logic said "seated". The shadow and outline passes drew skinned meshes with one shared override material, and Babylon's `ShaderMaterial` only re-binds bone matrices when the cached material changes. Fixed with dedicated skinned override materials, per-mesh rebind, and an explicit skeleton `prepare()` after animating.
2. Recast's emscripten factory writes to `this` (undefined in ES modules) → bound an explicit `this`.
3. **Schedule jitter could skip short blocks** (found by a unit test) → jitter is now bounded by the neighbouring gaps and starts stay ordered.
4. **Clock dropped minute events at high time scale** (unit test) → one event per minute crossed.
5. **NPCs could settle in the wrong place** if a schedule change landed mid sit/stand transition → watchdog re-plans settled NPCs that aren't at their activity target.
6. Sleeve and stripe colours bled as vertex-colour gradients → hard colour bands inside the lofts.
7. The dialogue camera framed the back of seated NPCs → office chairs now swivel toward DRAGON; over-the-shoulder framing searches for a clear line of sight.
8. Talking to meeting attendees stole `E` from free chairs → busy NPCs aren't talk targets.

## Known limitations / next steps
- **Not Blender-authored.** Blender is not installed on this machine, so characters are code-modelled (procedural meshes and skin weights) and animations are procedural rather than mocap. The rig convention (`src/game/characters/Skeleton.ts`) is documented so Blender characters and clips can replace them.
- **Likenesses are original placeholders.** Swap `appearance` blocks in `src/data/characters/roster.ts` once approved references exist. Non-React names are fictional.
- Faces are expressive but simple (blink, brows, mouth open/smile); no full blend-shape set yet.
- Feet are planted by animation timing, not IK; on the flat office floor there's no visible sliding, but stairs or slopes would need foot IK.
- NPCs live on floor 3 (plus the ground-floor guard); other floors have no staff yet.
- Angular and Node have 12 desks with 4 staff each, so some benches are empty, which reads as people working from home.
- Dialogue content is introductory only; mission triggers are emitted as events (`g.on("meeting:joined" | "dialogue:*", …)`) for Phase 3.
