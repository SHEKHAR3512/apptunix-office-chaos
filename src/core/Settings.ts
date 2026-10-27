export type QualityName = "low" | "medium" | "high" | "ultra";

export interface QualityPreset {
  renderScale: number;     // fraction of device pixels
  shadowSize: number;
  shadowRefresh: number;   // 1 = every frame, 0 = static only
  msaa: number;
  fxaa: boolean;
  detailDistance: number;  // LOD distance for small props
  dust: boolean;
}

export const QUALITY: Record<QualityName, QualityPreset> = {
  low:    { renderScale: 0.6,  shadowSize: 1024, shadowRefresh: 0, msaa: 1, fxaa: true,  detailDistance: 12, dust: false },
  medium: { renderScale: 0.8,  shadowSize: 2048, shadowRefresh: 2, msaa: 1, fxaa: true,  detailDistance: 18, dust: true },
  high:   { renderScale: 1.0,  shadowSize: 4096, shadowRefresh: 1, msaa: 4, fxaa: true,  detailDistance: 26, dust: true },
  ultra:  { renderScale: 1.0,  shadowSize: 4096, shadowRefresh: 1, msaa: 4, fxaa: true,  detailDistance: 40, dust: true },
};

export interface GameSettings {
  quality: QualityName;
  renderScale: number;
  shadows: boolean;
  outlines: boolean;
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
}

const KEY = "aoc.settings.v1";

export function defaultQuality(): QualityName {
  const p = new URLSearchParams(location.search).get("quality") as QualityName | null;
  if (p && p in QUALITY) return p;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile) return "low";
  return cores >= 8 ? "high" : "medium";
}

export function loadSettings(): GameSettings {
  const q = defaultQuality();
  const base: GameSettings = { quality: q, renderScale: QUALITY[q].renderScale, shadows: true, outlines: true, mouseSensitivity: 1, invertY: false, fov: 60 };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && !new URLSearchParams(location.search).has("quality")) return { ...base, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return base;
}

export function saveSettings(s: GameSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
