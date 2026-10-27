# APPTUNIX: Office Chaos — Phases 1–2

A browser-based, stylised 3D recreation of the Apptunix Mohali office, built with Babylon.js, TypeScript, Vite and React.

- **Phase 1:** environment, art style, lighting, shaders, building, lift.
- **Phase 2:** playable DRAGON, 31 NPCs with schedules and Recast navigation, sitting, computer, meeting rooms, branching dialogue. See `docs/PHASE_2_PROGRESS.md`.

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173
```

| URL parameter | Effect |
|---|---|
| `?renderer=webgl` / `?renderer=webgpu` | Force a backend (default: WebGPU, falling back to WebGL 2) |
| `?quality=low\|medium\|high\|ultra` | Graphics preset |
| `?start=office` / `?start=react` | Spawn on the 3rd floor instead of the street |
| `?time=11:00` | Start the office clock at a given time (default 09:45) |

## Controls
| Key | Action |
|---|---|
| WASD + mouse (click to lock) | Move / look · Shift run · right mouse strafe · wheel zoom |
| E | Interact: talk, sit, use computer, drink water, read, call lift |
| X | Stand up |
| 1–3 | Choose a dialogue reply (E / click advances lines) |
| Esc | Pause (also exits the computer) |
| G, 0–5 or click the HUD panel | Choose a floor inside the lift |
| F | Free-fly camera (Q/E down/up, Shift fast) |
| `` ` `` | Debug overlay: stats, view modes, viewpoints, anchors |
| V | Cycle view mode (base colour, lighting, bands, normals, shadow map, outlines, depth) |
| H | Hide ceilings · O settings · P hide help |

## Scripts
| Script | Purpose |
|---|---|
| `npm run shots` | Capture every named viewpoint in Chrome → `docs/screenshots/`, regenerate `docs/ASSET_MANIFEST.md` |
| `npm run playtest` | Automated walk-through (street → lift → 3F → React) with pass/fail checks |
| `npm run assets:export` | Export prefabs to GLB, optimise with glTF Transform, round-trip verify |
| `npm run assets:optimize` | Optimise Blender GLBs from `art-source/blender/` → `public/models/` |
| `npm test` | Vitest unit tests (schedules, state machine, dialogue, seats, roster) |
| `npm run test:e2e` | Playwright browser tests on WebGL 2 and WebGPU (saves `docs/screenshots/phase2/`) |
| `npm run build` | Typecheck and production build |

The screenshot and playtest scripts need the dev server running and Google Chrome installed (`CHROME=` overrides the path).

## Structure
```
src/core         Game loop, engine (WebGPU/WebGL2), scene/floor manager, settings, input, viewpoints
src/rendering    Toon shaders, outline + grade post, shadow/lighting manager, palette, sky/dust
src/assets       Modelling kit, material registry, UI atlas, asset manager, prefabs/
src/world        Layout data, architecture kit, building shell, ground/3rd/upper floors, lift, doors, colliders, anchors
src/environments Reception, HR, React, Angular, Node, DevOps, Design, QA, CR1–3, shared spaces
src/game         characters/ (rig, appearance, animator, factory) · player/ · npc/ (schedule, FSM, navigation, manager) · interactions/ · dialogue/ · OfficeLife.ts
src/data         characters/roster.ts · dialogues/ · schedules/ — edit people, lines and routines here
src/ui           Loading screen, HUD, settings, dialogue panel, computer desktop, pause (React)
docs/            Art direction, office references, progress, asset manifest, screenshots
art-source/      Blender sources and handoff exports
```

Read `docs/ENVIRONMENT_ART_DIRECTION.md` before adding assets. The office layout is data-driven in `src/world/OfficeLayout.ts`, and every zone is provisional until verified (`docs/APPTUNIX_OFFICE_REFERENCES.md`).
