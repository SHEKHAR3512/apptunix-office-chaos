# Environment Progress — Phase 1

_Last updated: 2026-10-27_

## Definition of Done audit

| # | Requirement | Status | Evidence / notes |
|---|---|---|---|
| 1 | Game launches in a browser | ✅ | Dev (`npm run dev`) and production (`npm run build && npm run preview`) both run in Chrome on WebGPU and WebGL 2 |
| 2 | Building entrance modelled | ✅ | Street, sidewalk, planters, trees, scooters, canopy with C-127 sign, auto sliding doors, storefront — `screenshots/entrance.png`, `facade.png` |
| 3 | Lift works | ✅ | Call button, centre-opening cabin and landing doors, G–5 buttons (keys + clickable HUD), indicator with arrows, arrival chime and flash, door re-open if the doorway is blocked. Playtest: G → 3 |
| 4 | Third floor explorable | ✅ | One continuous space; playtest walks lobby → reception → corridor → React |
| 5 | All required departments | ✅ | Reception, HR, React, Angular, Node.js, DevOps, Design, QA, CR1–3, corridors, break/water area, plus server room and lounge |
| 6 | React: 7 recognisable workstations | ✅ | Tushar, Mohit, Arpit, Vibhu, Rockey, Karan, DRAGON — name plates, distinct personal items, 4 anchors each |
| 7 | CR1, CR2, CR3 complete | ✅ | Three distinct rooms (12-seat stadium table + TV + feature wall / 6-seat video-call room / round 4-seat leads room with reading nook) |
| 8 | Cohesive toon shading | ✅ | Custom banded shader, coloured re-saturated shadows, one palette |
| 9 | Consistent outlines | ✅ (minor) | Screen-space system with per-material weights. Very thin details (1 cm tile strips, door gaps) can show dashed lines at distance |
| 10 | Polished lighting | 🟡 | Warm interior/exterior presets, custom PCF shadows, emissive fixtures, haze. No per-fixture light pools yet |
| 11 | Professionally modelled furniture/architecture | 🟡 | Code-modelled, bevelled hero-quality prefabs. **Not Blender-authored**: Blender was not installed on the build machine. The GLB pipeline is ready for replacements |
| 12 | Collisions and corridors | ✅ | AABB world (~1,000 colliders, grid-accelerated), sub-stepped capsule, camera wall avoidance; corridors 2.0–2.5 m |
| 13 | Assets optimised for web | 🟡 | Static batching per zone × material, LOD for fine detail, meshopt GLBs (about 8× smaller), shared atlas. Babylon is imported from the package root (1.3 MB gzip) |
| 14 | Inspectable with temp controller | ✅ | Third-person controller plus free-fly camera (`F`), 22 bookmarked viewpoints, cutaway plan view |
| 15 | Browser testing completed | ✅ | 22 viewpoints × 2 backends, automated playtest 10/10, Low preset checked. Tested on **one machine** (Apple Silicon Mac, Chrome); midrange PC/GPU not yet tested |
| 16 | Art-directed illustrated look | ✅ (judgement) | See `docs/screenshots/` |

## Browser test results

**Automated playtest** (`npm run playtest`, real key events in Chrome) — all pass:
spawn on street · walk through entrance doors · lift opens on call · enter cabin · ride G→3 (floor swap and y=12) · exit cabin · auto glass doors into reception · corridor → React · desk collision blocks the player · no page errors.

**Viewpoint capture** (`npm run shots`, 1600×900, High preset):

| View | WebGPU fps | Draw calls* |
|---|---|---|
| Entrance / facade | 60 | ~222 |
| Ground lobby | 60 | ~195 |
| 3F lift lobby / lift | 60 | ~515–575 |
| Reception, React, depts | 60 | ~565–690 |
| CR1 / CR2 / CR3 | 60 | ~545–565 |
| Upper-floor lobby | 60 | ~181 |

\* Includes the shadow and outline passes (about 3× the colour-pass count). Load to first frame is about 2.5–4 s on a local dev server.

## Iterations made from screenshot review
1. Ghost line-art over the scene: the outline G-buffer inherited the shadow light's camera → camera pinned explicitly.
2. Mauve ceiling: ceilings switched to an always-lit response.
3. Dark squares on carpet: ceiling fixtures stopped casting shadows.
4. Weak shadows: key light lowered to around 55°, shadow tone deepened.
5. Grey shadowed walls: shadow tint warmed, shadow chroma re-saturated.
6. Dotted lines: integer kernel offsets, opposite-pair crease test, groove rejection, bilinear PCF, normal-offset shadows.
7. Coplanar z-fighting: window frames, sills, ceilings and wall heights adjusted so no two faces coincide.
8. Lift portal cladding covered the doorway → split around the opening.
9. WebGPU WGSL uniformity errors → explicit-LOD sampling for the shadow and G-buffer textures.
10. Sparse departments → Angular and Node doubled to two benches.

## Known issues and next steps
- **Real layout unverified.** Waiting for photos and measurements (see `APPTUNIX_OFFICE_REFERENCES.md`).
- **Blender pass.** Artists should start from `art-source/exported/*.glb`, refine, and save to `art-source/blender/`.
- **Logo and brand** are placeholders.
- **Bundle size:** move to deep `@babylonjs/core/...` imports (expect ~50% smaller).
- **Draw calls:** merge small sections per floor and use thin instances for chairs if lower-end GPUs struggle.
- **Atlas** is 88% full; add a second page before adding many more unique screens.
- **Navigation:** colliders are ready as nav blockers; bake a Recast nav mesh (`@babylonjs/core` RecastJSPlugin + `recast-detour`) when NPCs arrive in Phase 2.
- Floors 1, 2, 4 and 5 are lift-lobby only; stairs are decorative.
- WebGPU fetches Babylon's GLSL→WGSL transpiler from its CDN on first load. Offline, the engine falls back to WebGL 2 automatically.
