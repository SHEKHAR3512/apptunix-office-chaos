import { AbstractMesh, Color3, Mesh, SceneLoader, StandardMaterial, TransformNode, VertexBuffer } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { GLTF2Export } from "@babylonjs/serializers/glTF";
import { FAMILY_DEFS, MaterialKey } from "./MaterialRegistry";
import { GeometryBuilder } from "./GeometryBuilder";
import type { WorldContext } from "../world/WorldContext";
import { REACT_PERSONAS } from "../environments/ReactSection";
import { deskSetup } from "./prefabs/DeskSetup";
import { officeChair, meetingTable, receptionDesk, sofa } from "./prefabs/Furniture";
import { dragonFigurine, floorPlant } from "./prefabs/Props";
import { rng } from "./TextureAtlas";

/**
 * Asset manifest entry. `source` is either `procedural:<module>#<fn>` (code-modelled prefab,
 * current Phase 1 state) or a GLB path under /public/models (Blender pipeline).
 * Triangle counts are measured at runtime by GeometryBuilder.measure() and written into
 * docs/ASSET_MANIFEST.md by scripts/screenshots.mjs.
 */
export interface AssetEntry {
  name: string;
  source: string;
  license: string;
  textureSize: string;
  materials: MaterialKey[];
  lod: string;
  collision: string;
}

const P = "procedural:src/assets/prefabs";
export const ASSET_MANIFEST: AssetEntry[] = [
  { name: "heroWorkstation", source: `${P}/DeskSetup.ts#deskSetup(hero)`, license: "Original (Apptunix project)", textureSize: "shared UI atlas", materials: ["wood", "metal", "plastic", "fabric", "display", "print", "decor", "foliage", "light", "brushed", "leather"], lod: "keycaps/cables/notes: detail LOD (hidden > detailDistance)", collision: "AABB desk + chair" },
  { name: "deskSetup", source: `${P}/DeskSetup.ts#deskSetup`, license: "Original", textureSize: "shared UI atlas", materials: ["wood", "metal", "plastic", "fabric", "display", "print", "decor"], lod: "detail LOD", collision: "AABB desk + chair" },
  { name: "workstation", source: `${P}/Furniture.ts#workstation`, license: "Original", textureSize: "none (vertex colour)", materials: ["wood", "metal", "fabric", "brushed", "plastic"], lod: "single", collision: "via deskSetup" },
  { name: "chair:task|exec|meeting|visitor", source: `${P}/Furniture.ts#officeChair`, license: "Original", textureSize: "none", materials: ["fabric", "leather", "plastic", "brushed"], lod: "single", collision: "0.46m AABB" },
  { name: "meetingTable", source: `${P}/Furniture.ts#meetingTable`, license: "Original", textureSize: "none", materials: ["wood", "metal", "brushed", "plastic"], lod: "single", collision: "AABB" },
  { name: "receptionDesk", source: `${P}/Furniture.ts#receptionDesk`, license: "Original", textureSize: "UI atlas (logo)", materials: ["wood", "print", "light", "metal"], lod: "single", collision: "AABB" },
  { name: "sofa", source: `${P}/Furniture.ts#sofa`, license: "Original", textureSize: "none", materials: ["fabric", "wood"], lod: "single", collision: "AABB" },
  { name: "monitor / laptop / keyboard / mouse", source: `${P}/Props.ts`, license: "Original", textureSize: "UI atlas 320×192 per screen", materials: ["plastic", "display", "light", "brushed"], lod: "keycaps detail LOD", collision: "none (on desk)" },
  { name: "plants (bush/snake/tree/palm/desk/succulent)", source: `${P}/Props.ts#floorPlant`, license: "Original", textureSize: "none", materials: ["decor", "foliage", "wood"], lod: "single", collision: "0.5m AABB (floor plants)" },
  { name: "dragonFigurine", source: `${P}/Props.ts#dragonFigurine`, license: "Original", textureSize: "none", materials: ["decor"], lod: "single", collision: "none" },
  { name: "appliances (water dispenser, coffee, fridge, microwave, printer)", source: `${P}/Props.ts`, license: "Original", textureSize: "none", materials: ["plastic", "metal", "glass", "decor", "display"], lod: "single", collision: "AABB" },
  { name: "lift cabin / landing / doors", source: "procedural:src/world/Lift.ts", license: "Original", textureSize: "dynamic 256×128 indicator", materials: ["brushed", "wood", "floorStone", "light", "liftDisplay", "print"], lod: "single", collision: "AABB walls + door colliders" },
  { name: "building shell / facade", source: "procedural:src/world/Building.ts", license: "Original", textureSize: "UI atlas (signage)", materials: ["wall", "metal", "glassExterior", "fabric", "print", "light"], lod: "single", collision: "AABB per wall run" },
  { name: "placeholder character", source: "procedural:src/player/PlaceholderCharacter.ts", license: "Original (temporary)", textureSize: "none", materials: ["fabric", "skin", "plastic", "metal", "decor"], lod: "single", collision: "capsule r=0.28" },
  { name: "UI atlas", source: "runtime canvas (src/assets/AtlasContent.ts)", license: "Original; logo provisional", textureSize: "2048×4096 RGBA (mipmapped)", materials: ["display", "print"], lod: "mipmaps", collision: "n/a" },
];

/** Exportable prefab set: each builds into a builder at the origin. */
export const EXPORTABLE: Record<string, (b: GeometryBuilder, ctx: WorldContext) => void> = {
  "hero-workstation": (b, ctx) => deskSetup(b, ctx, { ...REACT_PERSONAS.DRAGON, id: "export.dragon" }, 0, 0, 0, 0, -1, "export"),
  "task-chair": (b) => officeChair(b, "task"),
  "exec-chair": (b) => officeChair(b, "exec", "#4b3a30"),
  "meeting-table": (b) => meetingTable(b, 5.2, 1.5, { shape: "stadium" }),
  "reception-desk": (b, ctx) => receptionDesk(b, 3.2, ctx.atlas.logoPanel(false)),
  "sofa": (b) => sofa(b, 2.2, "#4f8a8b"),
  "floor-plant": (b) => floorPlant(b, rng(3), { kind: "tree" }),
  "dragon-figurine": (b) => dragonFigurine(b),
};

export class AssetManager {
  constructor(private readonly ctx: WorldContext) {}

  /** Build a prefab in isolation and export it as GLB (vertex colours + material family names). */
  async exportPrefab(name: string): Promise<Blob> {
    const fn = EXPORTABLE[name];
    if (!fn) throw new Error(`Unknown prefab ${name}`);
    const root = new TransformNode(`export:${name}`, this.ctx.scene);
    const b = new GeometryBuilder();
    fn(b, this.ctx);
    const prev = this.ctx.currentFloor;
    this.ctx.currentFloor = "dynamic";
    const meshes = b.build({ scene: this.ctx.scene, stats: this.ctx.stats, registerMesh: (m, key) => { m.name = `toon_${key}`; m.material = this.exportMaterial(key); } }, name, root, { lodDistance: 0 });
    this.ctx.currentFloor = prev;
    const set = new Set<AbstractMesh>(meshes);
    const data = await GLTF2Export.GLBAsync(this.ctx.scene, name, { shouldExportNode: (n) => n === root || set.has(n as AbstractMesh) });
    root.dispose(false, false);
    meshes.forEach((m) => m.dispose());
    const blob = Object.values(data.files)[0] as Blob;
    return blob;
  }

  private exportMats = new Map<string, StandardMaterial>();
  /** Plain named material per family so the GLB carries `toon_<family>` (Blender convention). */
  private exportMaterial(key: MaterialKey): StandardMaterial {
    let m = this.exportMats.get(key);
    if (!m) {
      m = new StandardMaterial(`toon_${key}`, this.ctx.scene);
      // distinct per family: glTF Transform's dedup would otherwise merge identical materials
      const idx = Object.keys(FAMILY_DEFS).indexOf(key);
      m.diffuseColor = new Color3(1, 1 - idx / 255, 1 - (idx * 7 % 32) / 255);
      m.specularColor = new Color3(0, 0, 0);
      this.exportMats.set(key, m);
    }
    return m;
  }

  /**
   * Load a GLB (Blender export or a round-tripped prefab) and convert it to the toon pipeline.
   * Material family is taken from the glTF material or node name: `toon_<family>` (e.g.
   * `toon_wood`, `toon_fabric`). Unknown names fall back to `decor`. If the mesh has no vertex
   * colours, the glTF base colour is baked into them so it still batches with shared materials.
   */
  async loadGLB(url: string, parent?: TransformNode): Promise<Mesh[]> {
    const res = await SceneLoader.ImportMeshAsync("", "", url, this.ctx.scene);
    const out: Mesh[] = [];
    for (const m of res.meshes) {
      if (!(m instanceof Mesh) || m.getTotalVertices() === 0) continue;
      const label = `${m.material?.name ?? ""} ${m.name}`;
      const match = /toon_([a-zA-Z]+)/.exec(label);
      const key = (match && match[1] in FAMILY_DEFS ? match[1] : "decor") as MaterialKey;
      if (!m.isVerticesDataPresent(VertexBuffer.ColorKind)) {
        const pbr = m.material as unknown as { albedoColor?: { r: number; g: number; b: number } } | null;
        const c = pbr?.albedoColor ?? { r: 0.8, g: 0.8, b: 0.8 };
        const n = m.getTotalVertices();
        const cols = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b, 1], i * 4);
        m.setVerticesData(VertexBuffer.ColorKind, cols, false, 4);
      }
      if (!m.isVerticesDataPresent(VertexBuffer.UVKind)) m.setVerticesData(VertexBuffer.UVKind, new Float32Array(m.getTotalVertices() * 2), false, 2);
      m.material?.dispose();
      if (parent) m.parent = parent;
      this.ctx.registerMesh(m, key, { static: false, detail: false });
      out.push(m);
    }
    for (const t of res.transformNodes) if (parent && !t.parent) t.parent = parent;
    return out;
  }
}
