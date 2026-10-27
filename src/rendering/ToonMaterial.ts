import { Color3, Constants, Scene, ShaderMaterial, Texture, Vector3, Vector4 } from "@babylonjs/core";
import { registerToonShaders } from "./ToonShaders";

/** Surface patterns evaluated procedurally in world space (see ToonShaders.surfacePattern). */
export enum Pattern {
  None = 0,
  Tiles = 1,
  Carpet = 2,
  WoodPlanks = 3,
  CeilingGrid = 4,
  Plaster = 5,
  BrushedMetal = 6,
  Pavement = 7,
}

export interface ToonFamily {
  /** Multiplied with vertex colour. Keep near white so vertex colours stay authoritative. */
  tint?: [number, number, number];
  /** Core shadow terminator (N·L). Higher = more of the surface falls into shadow. */
  shadowThreshold?: number;
  /** Second band, separates mid-tone from full light. */
  highlightThreshold?: number;
  /** Half-width of the smoothstep between bands. 0.005 = razor sharp, 0.08 = painterly. */
  softness?: number;
  /** Brightness of the mid-tone band relative to full light. */
  midTone?: number;
  specular?: number;
  specularSize?: number;
  rim?: number;
  rimWidth?: number;
  pattern?: Pattern;
  patternScale?: number;
  patternStrength?: number;
  patternVariation?: number;
  emissive?: number;
  alpha?: number;
  /** How much the floor contact-darkening affects this family. */
  contact?: number;
  ambientBoost?: number;
  /** Outline weight written into the normal/depth buffer (0 = no outline). */
  outline?: number;
  /** Family id: material boundaries with different ids may draw faint lines. */
  outlineId?: number;
  kind?: "lit" | "emissive" | "glass";
  /** Anime "angel ring" highlight band instead of a Blinn spot (hair). */
  hairBand?: boolean;
  texture?: Texture | null;
  backFaceCulling?: boolean;
  castsShadow?: boolean;
}

export interface ToonMaterialHandle {
  material: ShaderMaterial;
  family: Required<Omit<ToonFamily, "texture">> & { texture: Texture | null };
}

const LIT_UNIFORMS = [
  "world", "viewProjection",
  "uKeyDir", "uKeyColor", "uSkyColor", "uGroundColor", "uShadowTint", "uCameraPos", "uFog",
  "uShadowParams", "uLightVP", "uLightOrigin", "uLightForward", "uLightRange", "uDebugMode", "uTime",
  "uFloorHeight", "uInside",
  "uTint", "uBands", "uSpec", "uPattern", "uSurface",
];

const DEFAULTS: Required<Omit<ToonFamily, "texture">> = {
  tint: [1, 1, 1],
  shadowThreshold: 0.08,
  highlightThreshold: 0.55,
  softness: 0.02,
  midTone: 0.86,
  specular: 0,
  specularSize: 0.97,
  rim: 0.08,
  rimWidth: 0.25,
  pattern: Pattern.None,
  patternScale: 1,
  patternStrength: 0,
  patternVariation: 0,
  emissive: 0,
  alpha: 1,
  contact: 0.25,
  ambientBoost: 0,
  outline: 1,
  outlineId: 0,
  kind: "lit",
  hairBand: false,
  backFaceCulling: true,
  castsShadow: true,
};

export function createToonMaterial(scene: Scene, name: string, family: ToonFamily): ToonMaterialHandle {
  registerToonShaders();
  const f = { ...DEFAULTS, ...family, texture: family.texture ?? null };
  const defines: string[] = [];
  const samplers = ["uShadowMap"];
  if (f.texture) {
    defines.push("#define USE_TEXTURE");
    samplers.push("uAlbedo");
  }
  if (f.kind === "emissive") defines.push("#define FAMILY_EMISSIVE");
  if (f.kind === "glass") defines.push("#define FAMILY_GLASS");
  if (f.hairBand) defines.push("#define HAIR_BAND");

  const mat = new ShaderMaterial(
    name,
    scene,
    { vertex: "toon", fragment: "toon" },
    {
      attributes: ["position", "normal", "color", "uv"],
      uniforms: LIT_UNIFORMS,
      samplers,
      defines,
      needAlphaBlending: f.kind === "glass",
    },
  );
  mat.backFaceCulling = f.backFaceCulling;
  if (f.kind === "glass") {
    mat.alphaMode = Constants.ALPHA_COMBINE;
    mat.disableDepthWrite = true;
    mat.backFaceCulling = false;
  }
  if (f.texture) mat.setTexture("uAlbedo", f.texture);
  applyFamily(mat, f);
  return { material: mat, family: f };
}

export function applyFamily(mat: ShaderMaterial, f: Required<Omit<ToonFamily, "texture">>): void {
  mat.setVector3("uTint", new Vector3(...f.tint));
  mat.setVector4("uBands", new Vector4(f.shadowThreshold, f.highlightThreshold, f.softness, f.midTone));
  mat.setVector4("uSpec", new Vector4(f.specular, f.specularSize, f.rim, f.rimWidth));
  mat.setVector4("uPattern", new Vector4(f.pattern, f.patternScale, f.patternStrength, f.patternVariation));
  mat.setVector4("uSurface", new Vector4(f.emissive, f.alpha, f.contact, f.ambientBoost));
}

/** Override materials used by the custom shadow and outline render targets. */
export function createShadowDepthMaterial(scene: Scene): ShaderMaterial {
  registerToonShaders();
  const m = new ShaderMaterial("shadowDepth", scene, { vertex: "shadowDepth", fragment: "shadowDepth" }, {
    attributes: ["position", "normal", "color", "uv"],
    uniforms: ["world", "viewProjection", "uLightOrigin", "uLightForward", "uLightRange"],
  });
  m.backFaceCulling = false;
  return m;
}

export function createNormalDepthMaterial(scene: Scene, weight: number, id: number): ShaderMaterial {
  registerToonShaders();
  const m = new ShaderMaterial(`normalDepth_${weight}_${id}`, scene, { vertex: "normalDepth", fragment: "normalDepth" }, {
    attributes: ["position", "normal", "color", "uv"],
    uniforms: ["world", "viewProjection", "uCameraPos", "uOutlineWeight", "uOutlineId"],
  });
  m.setFloat("uOutlineWeight", weight);
  m.setFloat("uOutlineId", id);
  m.backFaceCulling = false;
  return m;
}

export const hex = (h: string): Color3 => Color3.FromHexString(h);
