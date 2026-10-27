import { Effect } from "@babylonjs/core";

/**
 * GLSL sources for the stylized renderer.
 *
 * All shaders are authored once in GLSL. On WebGL 2 they run as-is; on WebGPU Babylon
 * transpiles them to WGSL (glslang + twgsl), so the look is identical on both backends.
 *
 * Shared conventions
 *  - Every mesh carries: position, normal, color (rgb = vertex tint, a = baked occlusion), uv.
 *  - Shadow depth is a *linear* light-space distance packed into RGBA8 so it is filterable
 *    and portable on every backend (no float-texture extensions required).
 */

const PACK = /* glsl */ `
vec4 packDepth(float d){
  d = clamp(d, 0.0, 0.99999);
  vec4 enc = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0));
  enc -= enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
  return enc;
}
float unpackDepth(vec4 e){
  return dot(e, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
}
`;

const COMMON_VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
#include<instancesDeclaration>
#include<bonesDeclaration>
uniform mat4 viewProjection;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vUV;
void main(void){
  #include<instancesVertex>
  #include<bonesVertex>
  vec4 wp = finalWorld * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(finalWorld) * normal);
  vColor = color;
  vUV = uv;
  gl_Position = viewProjection * wp;
}
`;

/* ------------------------------------------------------------------------------------------ */
/* Main toon surface shader                                                                    */
/* ------------------------------------------------------------------------------------------ */

const TOON_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vUV;

// ---- global lighting (shared by every family, set by LightingManager) ----
uniform vec3 uKeyDir;        // direction TOWARDS the key light
uniform vec3 uKeyColor;
uniform vec3 uSkyColor;      // hemispheric fill, upward normals
uniform vec3 uGroundColor;   // hemispheric fill, downward normals (floor bounce)
uniform vec3 uShadowTint;    // colour of shadowed regions (cool, slightly violet)
uniform vec3 uCameraPos;
uniform vec4 uFog;           // rgb colour, a = density
uniform vec4 uShadowParams;  // x texel, y bias, z enabled, w strength
uniform mat4 uLightVP;
uniform vec3 uLightOrigin;
uniform vec3 uLightForward;
uniform float uLightRange;
uniform sampler2D uShadowMap;
uniform float uDebugMode;
uniform float uTime;
uniform float uFloorHeight;
uniform float uInside;       // 1 when camera is inside the building (glass response)

// ---- per-family parameters (MaterialRegistry) ----
uniform vec3 uTint;
uniform vec4 uBands;     // x core-shadow threshold, y highlight threshold, z softness, w mid-tone level
uniform vec4 uSpec;      // x strength, y size (ndh threshold), z rim strength, w rim width
uniform vec4 uPattern;   // x type, y scale, z strength, w variation
uniform vec4 uSurface;   // x emissive, y alpha, z contact-darkening, w ambient boost

#ifdef USE_TEXTURE
uniform sampler2D uAlbedo;
#endif

${PACK}

float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1.0,0.0)), u.x), mix(hash12(i+vec2(0.0,1.0)), hash12(i+vec2(1.0,1.0)), u.x), u.y);
}

float shadowCmp(vec2 uv, float d){
  // explicit LOD: legal in non-uniform control flow on WebGPU, and correct for a depth map
  return (d > unpackDepth(texture2DLodEXT(uShadowMap, uv, 0.0))) ? 0.0 : 1.0;
}

float sampleShadow(vec3 wp, vec3 n){
  if (uShadowParams.z < 0.5) return 1.0;
  // normal offset scaled by how grazing the light is: kills acne and micro-caster dashes
  float ndl = clamp(dot(n, uKeyDir), 0.0, 1.0);
  vec3 p = wp + n * (0.03 + 0.05 * (1.0 - ndl));
  vec4 lc = uLightVP * vec4(p, 1.0);
  vec2 suv = lc.xy / lc.w * 0.5 + 0.5;
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) return 1.0;
  float d = dot(p - uLightOrigin, uLightForward) / uLightRange - uShadowParams.y;
  float t = uShadowParams.x;
  // bilinear-weighted 4x4 PCF: smooth sub-texel edges without blurring the graphic shape
  vec2 tc = suv / t - 0.5;
  vec2 f = fract(tc);
  vec2 base = (floor(tc) + 0.5) * t;
  float sum = 0.0;
  for (int x = -1; x <= 2; x++) {
    float wx = x == -1 ? 1.0 - f.x : (x == 2 ? f.x : 1.0);
    for (int y = -1; y <= 2; y++) {
      float wy = y == -1 ? 1.0 - f.y : (y == 2 ? f.y : 1.0);
      sum += shadowCmp(base + vec2(float(x), float(y)) * t, d) * wx * wy;
    }
  }
  float vis = sum / 9.0;
  return smoothstep(0.2, 0.8, vis);
}

vec3 surfacePattern(vec3 base, vec3 wp, vec3 n){
  float type = uPattern.x;
  float sc = uPattern.y;
  float k = uPattern.z;
  if (type < 0.5) return base;
  vec2 q = wp.xz;
  if (abs(n.y) < 0.5) q = vec2(wp.x + wp.z, wp.y);
  if (type < 1.5) {
    // 1: large format tiles with soft grout lines
    vec2 g = abs(fract(q / sc) - 0.5);
    float line = smoothstep(0.485, 0.497, max(g.x, g.y));
    float var = hash12(floor(q / sc)) * uPattern.w;
    return base * (1.0 - var) * (1.0 - line * k);
  }
  if (type < 2.5) {
    // 2: carpet tiles: quarter-turned tiles + fine fibre noise
    vec2 cell = floor(q / sc);
    float checker = mod(cell.x + cell.y, 2.0);
    float fib = vnoise(q * 18.0) * 0.5 + vnoise(q * 41.0) * 0.5;
    float shade = mix(1.0 - k * 0.5, 1.0, checker) * (1.0 - uPattern.w * fib);
    return base * shade;
  }
  if (type < 3.5) {
    // 3: wood planks
    float row = floor(q.y / (sc * 0.18));
    float off = hash12(vec2(row, 3.1)) * 3.0;
    float plank = floor((q.x + off) / sc);
    float var = hash12(vec2(plank, row));
    vec2 f = vec2(fract((q.x + off) / sc), fract(q.y / (sc * 0.18)));
    float seam = max(smoothstep(0.985, 1.0, f.x), smoothstep(0.95, 1.0, f.y));
    float grain = vnoise(vec2(q.x * 1.5, q.y * 40.0)) * 0.08;
    return base * (1.0 - var * uPattern.w - grain) * (1.0 - seam * k);
  }
  if (type < 4.5) {
    // 4: ceiling grid (600mm suspended tiles)
    vec2 g = abs(fract(q / sc) - 0.5);
    float line = smoothstep(0.47, 0.49, max(g.x, g.y));
    float speck = vnoise(q * 30.0) * 0.04;
    return base * (1.0 - speck) * (1.0 - line * k);
  }
  if (type < 5.5) {
    // 5: wall: painted plaster, slightly darker towards the skirting
    float h = mod(wp.y + 0.001, uFloorHeight);
    float grad = mix(1.0 - k, 1.0, smoothstep(0.0, 1.6, h));
    return base * grad * (1.0 - vnoise(q * 3.0) * uPattern.w);
  }
  if (type < 6.5) {
    // 6: brushed metal streaks
    float s = vnoise(vec2(q.x * 2.0, q.y * 80.0));
    return base * (1.0 - k + s * k * 2.0);
  }
  if (type < 7.5) {
    // 7: asphalt / pavement
    float n1 = vnoise(q * 6.0) * 0.5 + vnoise(q * 23.0) * 0.5;
    vec2 g = abs(fract(q / sc) - 0.5);
    float line = smoothstep(0.48, 0.495, max(g.x, g.y));
    return base * (1.0 - n1 * uPattern.w) * (1.0 - line * k);
  }
  return base;
}

void main(void){
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCameraPos - vWorldPos);

  vec3 albedo = vColor.rgb * uTint;
#ifdef USE_TEXTURE
  vec4 tex = texture2D(uAlbedo, vUV);
  albedo *= tex.rgb;
#endif
  albedo = surfacePattern(albedo, vWorldPos, N);
  float ao = vColor.a;

  // ---------------- emissive displays: unlit with a little screen character ----------------
#ifdef FAMILY_EMISSIVE
  vec3 e = albedo * uSurface.x;
  float scan = 0.96 + 0.04 * sin(vUV.y * 900.0 + uTime * 2.0);
  e *= scan;
  float facing = clamp(dot(N, V), 0.0, 1.0);
  e = mix(e * (1.0 - uSurface.z), e, facing);
  if (uDebugMode > 0.5 && uDebugMode < 1.5) e = albedo;
  gl_FragColor = vec4(e, 1.0);
  return;
#endif

  // ---------------- glass: stylised streaks + fresnel, no PBR reflections ----------------
#ifdef FAMILY_GLASS
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 3.0);
  float diag = fract((vWorldPos.x + vWorldPos.z) * 0.33 + vWorldPos.y * 0.33);
  float streak = smoothstep(0.0, 0.02, diag) * (1.0 - smoothstep(0.06, 0.08, diag));
  float streak2 = smoothstep(0.12, 0.13, diag) * (1.0 - smoothstep(0.145, 0.155, diag));
  vec3 sky = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5);
  vec3 gcol = albedo * sky * 1.1 + vec3(1.0) * (streak + streak2) * 0.35;
  float a = uSurface.y * mix(1.0, 0.55, uInside * uSurface.z) + fres * 0.35 + (streak + streak2) * 0.15;
  gl_FragColor = vec4(gcol, clamp(a, 0.0, 0.95));
  return;
#endif

  // ---------------- cel shading ----------------
  float ndl = dot(N, uKeyDir);
  float shadow = sampleShadow(vWorldPos, N);
  float s = uBands.z;
  // core shadow terminator and highlight band
  float core = smoothstep(uBands.x - s, uBands.x + s, ndl);
  float high = smoothstep(uBands.y - s, uBands.y + s, ndl);
  float lightAmt = min(core, mix(1.0 - uShadowParams.w, 1.0, shadow));
  float tone = lightAmt * mix(uBands.w, 1.0, high);

  // hemispheric fill gives the "bounced room light" feeling
  vec3 ambient = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5) * (1.0 + uSurface.w);

  // contact darkening near the floor of each storey (baked-AO feel)
  float hLocal = mod(vWorldPos.y + 0.001, uFloorHeight);
  float contact = mix(1.0 - uSurface.z, 1.0, smoothstep(0.0, 0.45, hLocal));
  ao *= contact;

  vec3 shadeCol = albedo * ambient * uShadowTint * 0.86;
  // illustrated shadows keep their chroma: re-saturate the shaded tone
  float sl = dot(shadeCol, vec3(0.299, 0.587, 0.114));
  shadeCol = max(mix(vec3(sl), shadeCol, 1.28), vec3(0.0));
  vec3 litCol = albedo * (ambient * 0.62 + uKeyColor * 0.55);
  vec3 col = mix(shadeCol, litCol, tone) * mix(0.62, 1.0, ao);

  // crisp illustrated specular
  vec3 H = normalize(uKeyDir + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = smoothstep(uSpec.y - 0.01, uSpec.y + 0.01, ndh) * uSpec.x * lightAmt;
#ifdef HAIR_BAND
  // angel ring: a band of normals tilted toward the viewer, broken up along the strands
  vec3 bandAxis = normalize(vec3(0.0, 1.0, 0.0) + V * 0.55);
  float bd = dot(N, bandAxis);
  float band = smoothstep(0.55, 0.6, bd) * (1.0 - smoothstep(0.72, 0.77, bd));
  float breakup = step(0.35, fract(atan(N.x, N.z) * 3.1831 * 2.0 + vWorldPos.y * 3.0));
  spec = band * breakup * uSpec.x * mix(0.35, 1.0, lightAmt);
#endif
  col += uKeyColor * spec;

  // soft rim to separate shapes from the background
  float rim = 1.0 - clamp(dot(N, V), 0.0, 1.0);
  rim = smoothstep(1.0 - uSpec.w, 1.0 - uSpec.w + 0.08, rim) * uSpec.z;
  col += ambient * albedo * rim;

  col += albedo * uSurface.x;

  // atmospheric depth
  float dist = length(uCameraPos - vWorldPos);
  float fog = 1.0 - exp(-dist * uFog.a);
  col = mix(col, uFog.rgb, clamp(fog, 0.0, 0.85));

  // ---- debug views ----
  if (uDebugMode > 0.5) {
    if (uDebugMode < 1.5) col = albedo;                                       // base colour
    else if (uDebugMode < 2.5) col = mix(ambient * uShadowTint, ambient * 0.62 + uKeyColor * 0.55, tone) * mix(0.62, 1.0, ao); // lighting only
    else if (uDebugMode < 3.5) {                                              // shadow bands
      col = lightAmt < 0.5 ? vec3(0.25, 0.3, 0.75) : (high < 0.5 ? vec3(0.95, 0.75, 0.3) : vec3(1.0, 0.98, 0.85));
      col *= mix(0.7, 1.0, ao);
    }
    else if (uDebugMode < 4.5) col = N * 0.5 + 0.5;                           // normals
    else if (uDebugMode < 5.5) col = vec3(shadow);                            // shadow map only
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------------------------------------ */
/* Depth for the custom shadow map                                                             */
/* ------------------------------------------------------------------------------------------ */
const SHADOW_DEPTH_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vUV;
uniform vec3 uLightOrigin;
uniform vec3 uLightForward;
uniform float uLightRange;
${PACK}
void main(void){
  float d = dot(vWorldPos - uLightOrigin, uLightForward) / uLightRange;
  gl_FragColor = packDepth(d);
}
`;

/* ------------------------------------------------------------------------------------------ */
/* Normal + depth G-buffer used by the outline pass                                            */
/* rgb = world normal * outline weight (length encodes weight), a = view distance              */
/* ------------------------------------------------------------------------------------------ */
const NORMAL_DEPTH_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vUV;
uniform vec3 uCameraPos;
uniform float uOutlineWeight;
uniform float uOutlineId;
void main(void){
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  float w = max(uOutlineWeight, 0.02);
  gl_FragColor = vec4(N * w, length(uCameraPos - vWorldPos));
}
`;

/* ------------------------------------------------------------------------------------------ */
/* Outline + colour grading post-process                                                       */
/* ------------------------------------------------------------------------------------------ */
const OUTLINE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;   // lit scene
uniform sampler2D uNormalDepth;
uniform vec2 uTexel;
uniform vec4 uOutline;     // x thickness px, y depth threshold, z normal threshold, w strength
uniform vec3 uOutlineColor;
uniform vec4 uOutlineFade; // x start, y end, z far strength, w colour mix (0 = flat colour, 1 = darkened scene)
uniform vec4 uGrade;       // x exposure, y contrast, z saturation, w vignette
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uDebugMode;
uniform float uTime;

vec4 nd(vec2 uv){ return texture2DLodEXT(uNormalDepth, uv, 0.0); }

void main(void){
  vec3 scene = texture2D(textureSampler, vUV).rgb;
  vec4 c = nd(vUV);
  float dc = c.a;
  float wc = length(c.rgb);
  vec3 nc = c.rgb / max(wc, 1e-4);

  float t = uOutline.x;
  vec2 o[8];
  o[0] = vec2( 1.0, 0.0); o[1] = vec2(-1.0, 0.0); o[2] = vec2(0.0, 1.0); o[3] = vec2(0.0,-1.0);
  o[4] = vec2( 1.0, 1.0); o[5] = vec2(-1.0,-1.0); o[6] = vec2(1.0,-1.0); o[7] = vec2(-1.0, 1.0);

  float depthEdge = 0.0;
  float normalEdge = 0.0;
  float weight = wc;
  vec4 S[8];
  for (int i = 0; i < 8; i++) S[i] = nd(vUV + o[i] * uTexel * t);
  for (int i = 0; i < 8; i++) {
    float ws = length(S[i].rgb);
    // silhouette: neighbour is farther away -> line on the nearer surface
    float dd = (S[i].a - dc) / max(dc, 0.05);
    depthEdge = max(depthEdge, smoothstep(uOutline.y, uOutline.y * 1.8, dd));
    weight = max(weight, ws * step(dd, -uOutline.y)); // let the nearer object's weight dominate
  }
  // creases: compare the two neighbours on OPPOSITE sides of this pixel. Sub-pixel sliver
  // faces (thin trims, panel edges) cannot trigger this, which removes dotted-line artefacts.
  for (int i = 0; i < 8; i += 2) {
    vec4 a = S[i], b = S[i + 1];
    vec3 na = a.rgb / max(length(a.rgb), 1e-4);
    vec3 nb = b.rgb / max(length(b.rgb), 1e-4);
    float nd2 = 1.0 - dot(na, nb);
    float sameDepth = 1.0 - smoothstep(0.03, 0.12, abs(a.a - b.a) / max(dc, 0.05));
    float centreAgrees = max(dot(nc, na), dot(nc, nb));
    // opposite normals at equal depth are the two walls of a sub-pixel groove, not a crease
    float notGroove = smoothstep(-0.6, -0.3, dot(na, nb));
    normalEdge = max(normalEdge, smoothstep(uOutline.z, uOutline.z + 0.15, nd2) * sameDepth * step(0.6, centreAgrees) * notGroove);
  }
  weight = min(weight, 1.0);
  float edge = max(depthEdge, normalEdge * 0.85) * weight * uOutline.w;
  float fade = mix(1.0, uOutlineFade.z, smoothstep(uOutlineFade.x, uOutlineFade.y, dc));
  edge *= fade;
  if (dc > 900.0) edge *= 0.0;

  vec3 lineCol = mix(uOutlineColor, scene * uOutlineColor * 2.2, uOutlineFade.w);
  vec3 col = mix(scene, lineCol, clamp(edge, 0.0, 1.0));

  // ---- grading ----
  col *= uGrade.x;
  col = uLift + col * (uGain - uLift);
  col = (col - 0.5) * uGrade.y + 0.5;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uGrade.z);
  vec2 vq = vUV - 0.5;
  col *= 1.0 - dot(vq, vq) * uGrade.w;
  // paper grain, very subtle
  float g = fract(sin(dot(vUV * 1000.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.012;

  if (uDebugMode > 5.5 && uDebugMode < 6.5) col = mix(vec3(0.97, 0.95, 0.9), uOutlineColor, clamp(edge, 0.0, 1.0));
  if (uDebugMode > 6.5) col = vec3(fract(dc / 10.0));
  if (uDebugMode > 0.5 && uDebugMode < 5.5) col = mix(scene, lineCol, clamp(edge, 0.0, 1.0) * 0.5);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* ------------------------------------------------------------------------------------------ */
/* Sky dome                                                                                    */
/* ------------------------------------------------------------------------------------------ */
const SKY_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vColor;
varying vec2 vUV;
uniform vec3 uCameraPos;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform float uTime;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
void main(void){
  vec3 d = normalize(vWorldPos - uCameraPos);
  float t = clamp(d.y * 1.6 + 0.1, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 1.0, t));
  // banded clouds (posterised noise)
  vec2 cp = d.xz / max(d.y + 0.15, 0.05) * 1.2 + vec2(uTime * 0.004, 0.0);
  float c = n2(cp) * 0.6 + n2(cp * 2.3) * 0.4;
  float cloud = smoothstep(0.58, 0.62, c) * smoothstep(-0.05, 0.25, d.y);
  float cloudShade = smoothstep(0.66, 0.70, c);
  col = mix(col, mix(vec3(0.98, 0.93, 0.92), vec3(1.0), cloudShade), cloud * 0.85);
  float sun = smoothstep(0.995, 0.997, dot(d, uSunDir));
  col = mix(col, vec3(1.0, 0.97, 0.85), sun);
  col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.2, d.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

let registered = false;
export function registerToonShaders(): void {
  if (registered) return;
  registered = true;
  Effect.ShadersStore["toonVertexShader"] = COMMON_VERTEX;
  Effect.ShadersStore["toonFragmentShader"] = TOON_FRAGMENT;
  Effect.ShadersStore["shadowDepthVertexShader"] = COMMON_VERTEX;
  Effect.ShadersStore["shadowDepthFragmentShader"] = SHADOW_DEPTH_FRAGMENT;
  Effect.ShadersStore["normalDepthVertexShader"] = COMMON_VERTEX;
  Effect.ShadersStore["normalDepthFragmentShader"] = NORMAL_DEPTH_FRAGMENT;
  Effect.ShadersStore["toonOutlineFragmentShader"] = OUTLINE_FRAGMENT;
  Effect.ShadersStore["toonSkyVertexShader"] = COMMON_VERTEX;
  Effect.ShadersStore["toonSkyFragmentShader"] = SKY_FRAGMENT;
}
