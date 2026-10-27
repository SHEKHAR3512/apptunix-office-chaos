# Blender sources

Save editable `.blend` files here, and export GLB next to them (`File → Export → glTF 2.0`, format: GLB).

Conventions so assets drop into the toon pipeline:
- Units: metres; +Y up in glTF (Blender's +Z up converts automatically); origin on the floor.
- Front of furniture faces −Y in Blender (−Z in game); the sitter or user is on the front side.
- Name each material `toon_<family>`: wall, ceiling, floorTile, floorCarpet, floorWood, floorStone, wood, metal, brushed, plastic, fabric, leather, decor, foliage, skin, glass, display, print, light.
- Colour via vertex colours (preferred, so it batches) or a flat base colour. No PBR texture sets.
- Bevel edges (0.8–4 cm) and keep silhouettes expressive; small props under ~1.5k tris, furniture 2–8k.
- Run `npm run assets:optimize` to compress into `public/models/`.

Start from the code-modelled references in `../exported/` (e.g. `hero-workstation.glb`).
