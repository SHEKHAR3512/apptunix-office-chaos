# Environment Art Direction — APPTUNIX: Office Chaos

This document defines the visual language of the game world and the technical choices that implement it. Read it before you add or change any environment asset.

## 1. Reference and intent

**Reference:** *Messenger* by Abeto (2025, browser, Three.js + WebGL; models built in Houdini and Blender). Public sources describe it as a cel-shaded, anime-inspired world with a strong commitment to **outlines and colour choices**. ([Wikipedia](https://en.wikipedia.org/wiki/Messenger_(video_game)), [Boing Boing](https://boingboing.net/2025/10/27/messenger-is-the-coolest-browser-game-ive-ever-played.html))

What we take from it is the *language*, not assets:

- illustrated 3D: geometry reads as drawn shapes with confident silhouettes
- few shading tones, with crisp but not aliased transitions
- shadows that keep their colour instead of going grey
- warm, cohesive palette; atmosphere through colour and haze, not bloom
- dark, slightly coloured linework that thins with distance

Nothing was extracted from the reference game. The public page is a WebGL canvas with no inspectable art, and the developers haven't published their outline method. Everything here was implemented from scratch.

**Our target:** a hand-crafted, illustrated version of a real Mohali IT office. It should feel warm, busy and believable, never neon, plastic or blocky.

## 2. Visual rules (checklist for every asset)

| Rule | Do | Don't |
|---|---|---|
| Silhouette | Bevelled edges (8–40 mm), tapered legs, rounded cushions, lathe profiles | 90° raw cubes presented as finished furniture |
| Shading | Three tones: shadow / mid / lit, plus a crisp specular on plastic and metal | Smooth Lambert gradients, PBR roughness looks |
| Shadows | Coloured (rosy-violet indoors, cool blue outdoors), re-saturated | Grey or black shadows |
| Colour | Sample from `src/rendering/Palette.ts`; dusty department accents | Neon purple, saturated primaries, photo textures |
| Lines | Let the outline pass draw them; set the family's outline weight | Painted black edges in textures |
| Detail | Purposeful storytelling: a mug, sticky notes, a figurine | Random clutter scattered for density |
| Glass | Tinted, streaked, fresnel-edged; never outlined itself | Mirror reflections, overlapping hull outlines |
| Light | Soft, warm, high-key office; emissive panels and screens | Bloom, lens flares, dark moody interiors |

## 3. Rendering implementation

### 3.1 Toon surface shader — `src/rendering/ToonShaders.ts`, `ToonMaterial.ts`
Custom `ShaderMaterial` written in GLSL. It runs as-is on WebGL 2, and Babylon transpiles it to WGSL on WebGPU. Both backends were verified in Chrome with matching output.

Per pixel:
1. **Albedo** = vertex colour × family tint × optional atlas texture × procedural world-space pattern (tiles, carpet, planks, ceiling grid, plaster gradient, brushed streaks, pavement).
2. **Bands:** `smoothstep` around a core-shadow threshold and a highlight threshold. Thresholds, softness and mid-tone level are per family.
3. **Cast shadow** is sampled from our own shadow map and folded into the light amount, so cast and form shadows share one tone.
4. **Colour:** `mix(shadeCol, litCol, tone)`. `shadeCol` = albedo × hemispheric ambient × shadow tint, then **re-saturated ×1.28**. This is what keeps shadows illustrated instead of grey.
5. **Crisp Blinn specular** (step, not gradient) and a soft **rim** term.
6. **Contact darkening** near each storey's floor and a vertex-baked occlusion channel (`color.a`).
7. **Distance fog** toward a warm haze.

### 3.2 Material families — `src/assets/MaterialRegistry.ts`
`wall, ceiling, floorTile, floorCarpet, floorWood, floorStone, pavement, wood, metal, brushed, plastic, fabric, leather, decor, foliage, skin, glass, glassExterior, display, print, light, liftDisplay`

Each family owns its band thresholds, softness, specular, rim, pattern, contact strength, outline weight and shadow casting. Colour variety comes from vertex colours, so a whole department renders in roughly 10–15 draw calls.

### 3.3 Outlines — `src/rendering/OutlineSystem.ts`
We evaluated three approaches:

| Approach | Verdict |
|---|---|
| Inverted hull (extruded back faces) | Doubles draw calls; width scales with mesh size, so small props get blobby outlines; needs welded normals; glass overlap problems |
| Babylon `renderOutline` / `HighlightLayer` | Per-mesh, same scaling issue, not material-aware |
| **Screen-space normal + depth edges** ✅ | One extra geometry pass, constant pixel width, per-material weight, glass trivially excluded |

How it works:
- A half-float G-buffer render target stores **world normal × outline weight** (vector length encodes the family's weight) and **view distance**.
- A post-process draws **silhouettes** where a neighbour is farther away (relative depth threshold), with the line on the nearer surface.
- It draws **creases** by comparing the two neighbours on *opposite* sides of a pixel. Sub-pixel slivers (thin trims, panel sides) therefore can't trigger flickering dots. Opposite-normal pairs at equal depth (groove walls) are rejected for the same reason.
- Integer-pixel kernel offsets avoid moiré.
- Line colour = a mix of dark plum `#2b2433` and the darkened scene colour, so lines are tinted rather than pure black. Lines fade to 45% strength between 14 m and 48 m.
- Glass is not written to the G-buffer, so objects behind glass are outlined but the glass itself never is.

### 3.4 Shadows — `src/rendering/LightingManager.ts`
- Our own orthographic shadow map: linear light-space depth **packed into RGBA8**, so it needs no float-texture extensions and works on every backend.
- **Bilinear-weighted 4×4 PCF**, then a smoothstep that re-sharpens the edge: graphic shadow shapes without stair-stepping.
- A normal offset scaled by light grazing angle removes acne and the micro-caster "dashes" from skirting and door panels.
- Casters are bucketed **per floor**. Only the active storey (plus dynamic objects) renders into the map, so upper floors never shadow lower ones.
- The frustum is refitted to the active storey or the street; static shadows refresh only when the frustum moves (Low preset), or every 1–2 frames (Medium/High).

### 3.5 Lighting presets
| Preset | Key direction | Key colour | Shadow tint | Notes |
|---|---|---|---|---|
| Interior | (0.55, 1, 0.34) | warm white | rosy-violet (0.90, 0.82, 0.88) | Aggregate of ceiling panels; floor bounce fills from below |
| Exterior | (−0.45, 0.8, −0.5) | late-afternoon sun | cool blue | Blends over ~0.7 s when crossing the entrance |

Ceilings use an always-lit response (no shadow tone) so they read as bounce-lit, not mauve.

### 3.6 Post grade
Exposure 1.04 · contrast 1.06 · saturation 1.08 · warm lift/gain · vignette 0.42 · 1.2% paper grain · FXAA (plus 4× MSAA on High). **No bloom**, by design.

### 3.7 Sky and atmosphere
Posterised gradient sky with banded noise clouds and a disc sun; distance haze; sparse additive dust motes on floor 3.

## 4. Modelling standard

Phase 1 assets are **code-modelled** with the kit in `src/assets/GeometryBuilder.ts`, because Blender was not available on the build machine (see §6).

- `box` = rounded box: bevel radius and segments, smooth bevel normals. Boxes under 5 cm skip bevels (sub-pixel).
- `lathe` (hard or smooth profiles), `tube` (parallel-transport frames), `sphere/ellipsoid`, `extrude`, `quad` (atlas UVs).
- Winding is auto-corrected against intended normals, so no inside-out faces.
- `measure()` records per-prefab triangle budgets for the manifest.
- `details()` marks fine geometry (keycaps, cables, notes, books) for the LOD bucket.

**Quality bar:** the hero workstation (DRAGON's desk, `src/assets/prefabs/DeskSetup.ts`) sets the standard. It has a bevelled laminate top with edge band, metal leg frames, modesty panel, cable tray and grommet, fabric partition with aluminium cap, 3-drawer pedestal on casters, CPU tower with power LED, dual monitors with stand, a compact mechanical keyboard with individual keycaps and accent keys, a brand-coloured desk mat, routed cables, a LED strip, an executive chair, and personal items (dragon figurine, mug, headphones, plant, sticky notes, bottle).

## 5. Signage, screens and branding
All printed and emissive surfaces come from one runtime-painted **2048×4096 atlas** (`src/assets/AtlasContent.ts`, `TextureAtlas.ts`):
- department signs with vector icons
- 7 kinds of screen UI (editor, terminal, dashboards, design tool, test runner, chat, kanban)
- name plates, posters, whiteboards, slides and video calls, the building directory, lift buttons and floor numbers, the clock face, exit signs

Fonts: Fredoka (display) and JetBrains Mono (code).

⚠️ **The Apptunix logo and brand colours are provisional** (`P.brandBlue`, `P.brandOrange`, `drawLogo`). Replace them with official artwork and values from the brand team.

## 6. Asset pipeline and Blender handoff
- `npm run assets:export` exports prefabs to GLB through the running game. Raw files go to `art-source/exported/`; versions optimised with meshopt via glTF Transform go to `public/models/`, about 8× smaller. Each export is round-trip verified by loading it back.
- Blender convention: name materials **`toon_<family>`** (e.g. `toon_wood`). Use vertex colours or flat base colours. `AssetManager.loadGLB()` maps them onto the toon families automatically.
- `npm run assets:optimize` optimises anything placed in `art-source/blender/`.

## 7. Debug views (press `` ` `` then `V`)
Final · Base colour · Lighting only · Shadow bands (blue = shadow, amber = mid, cream = lit) · Normals · Shadow map · Outlines only · Depth. The overlay shows FPS, frame time, draw calls, active meshes, triangles and shadow casters.

## 8. Characters (Phase 2)

- **One rig, one style.** Every character uses the 31-bone humanoid in `src/game/characters/Skeleton.ts` (bind A-pose, +Z forward, feet at y = 0, eye/brow/jaw bones for the face) and is generated from data by `CharacterAppearance.ts`, so no employee can drift into a different style.
- **Proportions:** slightly large head (×1.07), softly rounded jaw, big readable eyes with an iris, pupil, catch-light and a dark lash line; small nose; simple mouth line. Expressions come from bone transforms (blink, smile, mouth open, brow raise/angle).
- **Hair** is a seamless shell following the skull, with a parametric rim (spiky bangs, ear line, nape) and a folded inner lip so outlines read thickness. The `hair` material draws an anime "angel ring" highlight band.
- **Clothing** is lofted with hard colour seams (sleeve hems, stripes, belts); collars, plackets, buttons, pockets, hoods, lapels and laces are modelled.
- **Materials:** `character` (soft terminator, warm rim), `hair` (band highlight), `eye` (unlit). All share the office's coloured shadows, outlines and grade.
- **Respectful representation:** Sikh characters wear a layered dastar with a contrasting under-band, a full beard and a kara, integrated into the rig so the turban moves with the head.
- **Likeness rule:** no real faces. All looks are original placeholders until approved references exist.
