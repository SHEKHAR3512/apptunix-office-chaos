import { DynamicTexture, Scene, ShaderMaterial, Texture } from "@babylonjs/core";
import { createNormalDepthMaterial, createToonMaterial, Pattern, ToonFamily, ToonMaterialHandle } from "../rendering/ToonMaterial";

/**
 * Material families. Every mesh in the game references one of these keys; colour variation
 * comes from vertex colours so a whole department can be drawn with ~10 draw calls.
 */
export type MaterialKey =
  | "wall" | "ceiling" | "floorTile" | "floorCarpet" | "floorWood" | "floorStone" | "pavement"
  | "wood" | "metal" | "brushed" | "plastic" | "fabric" | "leather" | "decor" | "foliage" | "skin"
  | "glass" | "glassExterior" | "display" | "print" | "light" | "liftDisplay"
  | "character" | "hair" | "eye";

export const FAMILY_DEFS: Record<MaterialKey, (atlas: Texture, lift: Texture) => ToonFamily> = {
  wall: () => ({ pattern: Pattern.Plaster, patternStrength: 0.07, patternVariation: 0.025, shadowThreshold: 0.02, softness: 0.03, midTone: 0.9, rim: 0, contact: 0.05, outline: 1, outlineId: 1 }),
  ceiling: () => ({ pattern: Pattern.CeilingGrid, patternScale: 0.6, patternStrength: 0.1, shadowThreshold: -2, highlightThreshold: -2, ambientBoost: 0.05, rim: 0, contact: 0, outline: 0.6, outlineId: 2, castsShadow: false }),
  floorTile: () => ({ pattern: Pattern.Tiles, patternScale: 0.8, patternStrength: 0.22, patternVariation: 0.035, softness: 0.03, specular: 0.05, specularSize: 0.985, rim: 0, contact: 0, outline: 0.15, outlineId: 3, castsShadow: false }),
  floorCarpet: () => ({ pattern: Pattern.Carpet, patternScale: 0.5, patternStrength: 0.06, patternVariation: 0.1, softness: 0.04, rim: 0, contact: 0, outline: 0.15, outlineId: 4, castsShadow: false }),
  floorWood: () => ({ pattern: Pattern.WoodPlanks, patternScale: 1.2, patternStrength: 0.35, patternVariation: 0.06, specular: 0.06, specularSize: 0.98, rim: 0, contact: 0, outline: 0.15, outlineId: 5, castsShadow: false }),
  floorStone: () => ({ pattern: Pattern.Tiles, patternScale: 1.2, patternStrength: 0.3, patternVariation: 0.05, specular: 0.08, specularSize: 0.98, rim: 0, contact: 0, outline: 0.15, outlineId: 6, castsShadow: false }),
  pavement: () => ({ pattern: Pattern.Pavement, patternScale: 1.0, patternStrength: 0.25, patternVariation: 0.12, rim: 0, contact: 0, outline: 0.3, outlineId: 7, castsShadow: false }),
  wood: () => ({ softness: 0.025, specular: 0.12, specularSize: 0.975, rim: 0.06, outline: 1, outlineId: 8 }),
  metal: () => ({ softness: 0.015, specular: 0.35, specularSize: 0.96, rim: 0.12, rimWidth: 0.2, midTone: 0.82, outline: 1, outlineId: 9 }),
  brushed: () => ({ pattern: Pattern.BrushedMetal, patternStrength: 0.08, softness: 0.02, specular: 0.4, specularSize: 0.94, rim: 0.18, midTone: 0.8, outline: 1, outlineId: 10 }),
  plastic: () => ({ softness: 0.012, specular: 0.4, specularSize: 0.965, rim: 0.1, outline: 1, outlineId: 11 }),
  fabric: () => ({ softness: 0.05, specular: 0, rim: 0.14, rimWidth: 0.35, midTone: 0.88, outline: 1, outlineId: 12 }),
  leather: () => ({ softness: 0.03, specular: 0.25, specularSize: 0.95, rim: 0.12, outline: 1, outlineId: 13 }),
  decor: () => ({ softness: 0.025, specular: 0.15, specularSize: 0.97, rim: 0.1, outline: 1, outlineId: 14 }),
  foliage: () => ({ shadowThreshold: 0.0, softness: 0.06, midTone: 0.8, rim: 0.2, rimWidth: 0.35, outline: 0.9, outlineId: 15 }),
  skin: () => ({ shadowThreshold: 0.05, softness: 0.03, midTone: 0.9, rim: 0.2, rimWidth: 0.3, contact: 0, outline: 1, outlineId: 16 }),
  // characters: soft painterly terminator, warm rim so figures separate from the office
  character: () => ({ shadowThreshold: 0.02, highlightThreshold: 0.5, softness: 0.035, midTone: 0.9, specular: 0.06, specularSize: 0.975, rim: 0.22, rimWidth: 0.28, contact: 0, outline: 1, outlineId: 21 }),
  // anime hair: crisp specular band
  hair: () => ({ hairBand: true, shadowThreshold: 0.0, softness: 0.03, midTone: 0.85, specular: 0.22, specularSize: 0.9, rim: 0.18, rimWidth: 0.3, contact: 0, outline: 0.75, outlineId: 22 }),
  eye: () => ({ kind: "emissive", emissive: 0.97, contact: 0, outline: 0.0, outlineId: 23, castsShadow: false }),
  glass: () => ({ kind: "glass", tint: [0.78, 0.9, 0.95], alpha: 0.16, contact: 0, outline: 0, castsShadow: false }),
  glassExterior: () => ({ kind: "glass", tint: [0.55, 0.72, 0.82], alpha: 0.72, contact: 1, outline: 0, castsShadow: false }),
  display: (atlas) => ({ kind: "emissive", texture: atlas, emissive: 1.0, contact: 0.2, outline: 0.4, outlineId: 17, castsShadow: false }),
  print: (atlas) => ({ texture: atlas, softness: 0.03, rim: 0, outline: 0.5, outlineId: 18, castsShadow: false }),
  light: () => ({ kind: "emissive", emissive: 1.05, contact: 0, outline: 0.35, outlineId: 19, castsShadow: false }),
  liftDisplay: (_a, lift) => ({ kind: "emissive", texture: lift, emissive: 1.0, contact: 0, outline: 0.3, outlineId: 20, castsShadow: false }),
};

export class MaterialRegistry {
  readonly handles = new Map<MaterialKey, ToonMaterialHandle>();
  private readonly normalDepth = new Map<MaterialKey, ShaderMaterial>();

  readonly liftTexture: DynamicTexture;

  constructor(private readonly scene: Scene, private readonly atlas: Texture) {
    this.liftTexture = new DynamicTexture("liftIndicator", { width: 256, height: 128 }, scene, false);
    (Object.keys(FAMILY_DEFS) as MaterialKey[]).forEach((k) => this.get(k));
  }

  get(key: MaterialKey): ToonMaterialHandle {
    let h = this.handles.get(key);
    if (!h) {
      h = createToonMaterial(this.scene, `toon_${key}`, FAMILY_DEFS[key](this.atlas, this.liftTexture));
      this.handles.set(key, h);
    }
    return h;
  }

  normalDepthFor(key: MaterialKey, skinned = false): ShaderMaterial {
    const k = (skinned ? `${key}:skinned` : key) as MaterialKey;
    let m = this.normalDepth.get(k);
    if (!m) {
      const f = this.get(key).family;
      m = createNormalDepthMaterial(this.scene, f.outline, f.outlineId);
      this.normalDepth.set(k, m);
    }
    return m;
  }

  allNormalDepth(): ShaderMaterial[] {
    return [...this.normalDepth.values()];
  }

  all(): ToonMaterialHandle[] {
    return [...this.handles.values()];
  }
}
