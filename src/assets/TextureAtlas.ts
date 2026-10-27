import { DynamicTexture, Scene, Texture } from "@babylonjs/core";
import type { UVRect } from "./GeometryBuilder";
import { P } from "../rendering/Palette";

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/**
 * Runtime-painted texture atlas. Screens, signage, posters and name plates are illustrated
 * with Canvas2D into a single texture, so every "printed" surface in the game shares one
 * material and one GPU texture.
 */
export class TextureAtlas {
  readonly size = 2048;
  readonly height = 4096;
  readonly texture: DynamicTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rects = new Map<string, UVRect>();
  private shelves: { y: number; h: number; x: number }[] = [];
  private nextY = 0;
  private readonly pad = 4;

  constructor(scene: Scene) {
    this.texture = new DynamicTexture("uiAtlas", { width: this.size, height: this.height }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    this.texture.anisotropicFilteringLevel = 8;
    this.ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D;
    this.ctx.fillStyle = "#808080";
    this.ctx.fillRect(0, 0, this.size, this.height);
  }

  add(name: string, w: number, h: number, draw: Draw): UVRect {
    const existing = this.rects.get(name);
    if (existing) return existing;
    // multi-shelf packing: reuse a shelf whose height fits closely, else open a new one
    let shelf = this.shelves.find((sh) => h <= sh.h && h >= sh.h * 0.6 && sh.x + w <= this.size);
    if (!shelf) {
      if (this.nextY + h > this.height) throw new Error(`TextureAtlas overflow while adding ${name}`);
      shelf = { y: this.nextY, h, x: 0 };
      this.shelves.push(shelf);
      this.nextY += h + this.pad;
    }
    const x = shelf.x, y = shelf.y;
    shelf.x += w + this.pad;
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.rect(0, 0, w, h);
    g.clip();
    draw(g, w, h);
    g.restore();
    // half-texel inset avoids bleeding between neighbours
    const S = this.size, SH = this.height;
    const r: UVRect = { u0: (x + 0.5) / S, u1: (x + w - 0.5) / S, v0: 1 - (y + h - 0.5) / SH, v1: 1 - (y + 0.5) / SH };
    this.rects.set(name, r);
    return r;
  }

  get(name: string): UVRect {
    const r = this.rects.get(name);
    if (!r) throw new Error(`Atlas entry ${name} missing`);
    return r;
  }

  has(name: string): boolean { return this.rects.has(name); }
  usage(): number { return this.nextY / this.height; }
  commit(): void { this.texture.update(true); }
}

// ---------------------------------------------------------------------------------------------
// Illustration helpers
// ---------------------------------------------------------------------------------------------

export const FONT = "Fredoka, 'Trebuchet MS', sans-serif";
export const MONO = "'JetBrains Mono', Menlo, monospace";

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, opts: { weight?: number; align?: CanvasTextAlign; font?: string; base?: CanvasTextBaseline; maxW?: number } = {}): void {
  g.font = `${opts.weight ?? 600} ${size}px ${opts.font ?? FONT}`;
  g.fillStyle = color;
  g.textAlign = opts.align ?? "left";
  g.textBaseline = opts.base ?? "middle";
  g.fillText(s, x, y, opts.maxW);
}

/** Deterministic PRNG so painted content is identical on every load. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOKEN_COLORS = ["#c792ea", "#82aaff", "#f78c6c", "#c3e88d", "#89ddff", "#ffcb6b", "#eeffff", "#f07178"];

/** A code editor screen. accent tints the sidebar icon and tab. */
export function drawEditor(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string, title: string): void {
  const R = rng(seed);
  g.fillStyle = "#1e2230"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#171a25"; g.fillRect(0, 0, w * 0.06, h);
  g.fillStyle = "#1a1d29"; g.fillRect(w * 0.06, 0, w * 0.2, h);
  for (let i = 0; i < 4; i++) rr(g, w * 0.015, 14 + i * 26, w * 0.03, w * 0.03, 3, i === 0 ? accent : "#3b4256");
  for (let i = 0; i < 12; i++) {
    const ind = (i % 4 === 0 ? 0 : 1) * 10;
    rr(g, w * 0.075 + ind, 30 + i * 13, w * 0.11 - ind + R() * 14, 6, 3, i === 3 ? accent : "#4a526a");
  }
  g.fillStyle = "#232838"; g.fillRect(w * 0.26, 0, w, 20);
  rr(g, w * 0.27, 3, 92, 17, 3, "#1e2230");
  text(g, title, w * 0.27 + 8, 12, 10, "#c8d0e8", { font: MONO, weight: 400 });
  g.fillStyle = accent; g.fillRect(w * 0.27, 18, 92, 2);
  let y = 32;
  let indent = 0;
  while (y < h - 18) {
    text(g, String(Math.floor((y - 32) / 11) + 1), w * 0.29, y, 8, "#4b536b", { font: MONO, weight: 400, align: "right" });
    if (R() < 0.12) { y += 11; indent = Math.max(0, indent - 1); continue; }
    let x = w * 0.31 + indent * 12;
    const toks = 1 + Math.floor(R() * 5);
    for (let t = 0; t < toks && x < w - 20; t++) {
      const tw = 10 + R() * 42;
      rr(g, x, y - 3, tw, 6, 3, TOKEN_COLORS[Math.floor(R() * TOKEN_COLORS.length)]);
      x += tw + 5;
    }
    if (R() < 0.25) indent = Math.min(4, indent + 1);
    else if (R() < 0.2) indent = Math.max(0, indent - 1);
    y += 11;
  }
  g.fillStyle = accent; g.fillRect(0, h - 12, w, 12);
  text(g, "main ✓  0 ⚠  Ln 42, Col 17", 8, h - 6, 8, "#10131c", { font: MONO, weight: 600 });
}

export function drawTerminal(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string): void {
  const R = rng(seed);
  g.fillStyle = "#14161d"; g.fillRect(0, 0, w, h);
  rr(g, 6, 5, 8, 8, 4, "#ff6b6b"); rr(g, 18, 5, 8, 8, 4, "#ffd166"); rr(g, 30, 5, 8, 8, 4, "#6fd08c");
  const lines = ["$ npm run dev", "> api@2.4.1 dev", "> nodemon src/server.ts", "[nodemon] watching 48 files", "✓ MongoDB connected", "✓ Redis connected", "server listening on :4000", "GET /api/v1/users 200 12ms", "POST /api/v1/auth 201 48ms", "GET /api/v1/orders 200 9ms", "GET /health 200 1ms", "PATCH /api/v1/cart 200 21ms"];
  let y = 26;
  for (const l of lines) {
    if (y > h - 8) break;
    const c = l.startsWith("✓") ? "#6fd08c" : l.startsWith("$") ? accent : l.includes(" 20") ? "#9ab0d8" : "#d6dbe6";
    text(g, l, 8, y, 9, c, { font: MONO, weight: 400 });
    y += 12 + (R() < 0.1 ? 4 : 0);
  }
  g.fillStyle = accent; g.fillRect(8 + 6 * 6, y - 5, 6, 10);
}

export function drawDashboard(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string): void {
  const R = rng(seed);
  g.fillStyle = "#171b26"; g.fillRect(0, 0, w, h);
  text(g, "prod-cluster · ap-south-1", 8, 10, 9, "#c9d1e6", { font: MONO, weight: 600 });
  const cols = 3, rows = 2, pw = (w - 8 * (cols + 1)) / cols, ph = (h - 24 - 8 * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 8 + c * (pw + 8), y = 22 + r * (ph + 8);
    rr(g, x, y, pw, ph, 4, "#212637");
    const kind = (r * cols + c + seed) % 3;
    const col = [accent, "#6fd08c", "#82aaff", "#ffcb6b"][(r * cols + c) % 4];
    if (kind === 0) {
      g.beginPath();
      for (let i = 0; i <= 20; i++) {
        const px = x + 6 + (i / 20) * (pw - 12);
        const py = y + ph - 10 - (0.3 + 0.5 * Math.abs(Math.sin(i * 0.6 + seed)) * R()) * (ph - 24);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokeStyle = col; g.lineWidth = 2; g.stroke();
    } else if (kind === 1) {
      for (let i = 0; i < 8; i++) {
        const bh = (0.2 + R() * 0.7) * (ph - 24);
        rr(g, x + 6 + i * ((pw - 12) / 8), y + ph - 8 - bh, (pw - 12) / 8 - 3, bh, 2, col);
      }
    } else {
      g.beginPath(); g.arc(x + pw / 2, y + ph / 2 + 4, ph * 0.32, 0, Math.PI * 2); g.strokeStyle = "#2f364b"; g.lineWidth = 7; g.stroke();
      g.beginPath(); g.arc(x + pw / 2, y + ph / 2 + 4, ph * 0.32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.4 + R() * 0.5)); g.strokeStyle = col; g.stroke();
      text(g, `${Math.floor(40 + R() * 59)}%`, x + pw / 2, y + ph / 2 + 4, 11, "#e8ecf6", { align: "center" });
    }
    text(g, ["CPU", "Requests", "Memory", "Pods", "Latency p95", "Deploys"][r * cols + c], x + 6, y + 9, 8, "#8d97b3", { weight: 500 });
  }
}

export function drawDesignTool(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string): void {
  const R = rng(seed);
  g.fillStyle = "#e9e6ef"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#2b2c33"; g.fillRect(0, 0, w, 16);
  g.fillStyle = "#fbfafc"; g.fillRect(0, 16, w * 0.15, h); g.fillRect(w * 0.82, 16, w, h);
  for (let i = 0; i < 9; i++) rr(g, 6, 24 + i * 12, w * 0.1, 6, 3, i === 2 ? accent : "#d4d0dc");
  for (let i = 0; i < 7; i++) rr(g, w * 0.84, 24 + i * 16, w * 0.14, 9, 3, "#e8e5ee");
  // three phone frames
  for (let i = 0; i < 3; i++) {
    const fx = w * 0.19 + i * w * 0.21, fy = 30, fw = w * 0.17, fh = h - 46;
    rr(g, fx, fy, fw, fh, 8, "#ffffff", "#c8c3d4", 1);
    rr(g, fx + 6, fy + 10, fw - 12, fh * 0.32, 5, [accent, "#f6b68f", "#8fc7c2"][(i + seed) % 3]);
    for (let k = 0; k < 4; k++) rr(g, fx + 6, fy + fh * 0.45 + k * 12, (fw - 12) * (0.4 + R() * 0.6), 6, 3, "#d8d4e2");
    rr(g, fx + 6, fy + fh - 22, fw - 12, 14, 7, P.brandBlue);
  }
  g.strokeStyle = accent; g.lineWidth = 1.5; g.setLineDash([3, 3]);
  g.strokeRect(w * 0.4 - 4, 26, w * 0.17 + 8, h - 38); g.setLineDash([]);
}

export function drawTestRunner(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string): void {
  const R = rng(seed);
  g.fillStyle = "#1b1e28"; g.fillRect(0, 0, w, h);
  text(g, "e2e · checkout.spec.ts", 8, 11, 9, "#d6dbe6", { font: MONO });
  rr(g, w - 92, 3, 84, 16, 8, "#2d6a46");
  text(g, "142 passed", w - 50, 11, 9, "#b9f3cf", { align: "center" });
  let y = 30;
  const names = ["login with valid OTP", "add item to cart", "apply coupon", "payment via UPI", "order history loads", "push notification", "logout clears session", "deep link opens", "dark mode toggle", "profile photo upload", "search with filters", "rate driver"];
  for (const n of names) {
    if (y > h - 10) break;
    const fail = R() < 0.12;
    rr(g, 8, y - 5, 10, 10, 5, fail ? "#ff6b6b" : "#6fd08c");
    text(g, n, 24, y, 9, fail ? "#ffb3b3" : "#c9cfdd", { font: MONO, weight: 400 });
    text(g, `${Math.floor(R() * 900 + 40)}ms`, w - 10, y, 8, "#6b748c", { font: MONO, align: "right", weight: 400 });
    y += 13;
  }
  g.fillStyle = accent; g.fillRect(0, h - 3, w * 0.86, 3);
}

export function drawChat(g: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const R = rng(seed);
  g.fillStyle = "#f7f5f2"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#3f2e4e"; g.fillRect(0, 0, w * 0.22, h);
  for (let i = 0; i < 8; i++) rr(g, 8, 18 + i * 14, w * 0.15, 7, 3, i === 1 ? "#ffffff" : "#7d6a8e");
  let y = 16;
  while (y < h - 30) {
    rr(g, w * 0.26, y, 18, 18, 5, ["#f08a3c", "#4fb3c8", "#79b06a", "#d98aa2"][Math.floor(R() * 4)]);
    rr(g, w * 0.26 + 24, y + 1, 50 + R() * 40, 6, 3, "#3a3542");
    rr(g, w * 0.26 + 24, y + 11, (w * 0.6) * (0.4 + R() * 0.6), 6, 3, "#b8b3bf");
    y += 28;
  }
  rr(g, w * 0.25, h - 22, w * 0.72, 16, 4, "#ffffff", "#cfc9d4", 1);
}

export function drawKanban(g: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const R = rng(seed);
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, w, h);
  g.fillStyle = P.brandBlue; g.fillRect(0, 0, w, 16);
  text(g, "Sprint 42 — Board", 8, 8, 9, "#ffffff");
  const cols = ["TO DO", "IN PROGRESS", "REVIEW", "DONE"];
  const cw = (w - 10) / 4;
  cols.forEach((c, i) => {
    const x = 5 + i * cw;
    rr(g, x + 2, 22, cw - 4, h - 26, 4, "#e6e8ee");
    text(g, c, x + 8, 30, 7, "#5a6178", { weight: 700 });
    let y = 38;
    const n = 2 + Math.floor(R() * 3);
    for (let k = 0; k < n && y < h - 26; k++) {
      rr(g, x + 6, y, cw - 12, 22, 3, "#ffffff");
      rr(g, x + 10, y + 5, (cw - 24) * (0.5 + R() * 0.5), 4, 2, "#9aa1b5");
      rr(g, x + 10, y + 13, 14, 5, 2, ["#4fb3c8", "#d9675e", "#79b06a", "#e3a548"][Math.floor(R() * 4)]);
      y += 27;
    }
  });
}

export function drawBrowserApp(g: CanvasRenderingContext2D, w: number, h: number, seed: number, accent: string): void {
  const R = rng(seed);
  g.fillStyle = "#dfe3ea"; g.fillRect(0, 0, w, 18);
  rr(g, 40, 4, w - 80, 11, 5, "#ffffff");
  text(g, "localhost:3000", 48, 10, 8, "#6a7285", { font: MONO, weight: 400 });
  g.fillStyle = "#ffffff"; g.fillRect(0, 18, w, h);
  g.fillStyle = accent; g.fillRect(0, 18, w, 26);
  text(g, "FoodDash", 10, 31, 12, "#ffffff", { weight: 700 });
  for (let i = 0; i < 6; i++) {
    const x = 10 + (i % 3) * ((w - 20) / 3), y = 54 + Math.floor(i / 3) * ((h - 64) / 2);
    const cw = (w - 20) / 3 - 8, ch = (h - 64) / 2 - 8;
    rr(g, x, y, cw, ch, 6, "#f3f1ee");
    rr(g, x + 5, y + 5, cw - 10, ch * 0.5, 5, ["#f6b68f", "#8fc7c2", "#f3d27a", "#c4b0e0"][Math.floor(R() * 4)]);
    rr(g, x + 5, y + ch * 0.62, cw * 0.7, 6, 3, "#4a4f5c");
    rr(g, x + 5, y + ch * 0.8, cw * 0.4, 5, 3, "#a9adb8");
  }
}

/** Simple vector icons used on department signage. */
export function drawIcon(g: CanvasRenderingContext2D, kind: string, cx: number, cy: number, s: number, color: string): void {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = s * 0.08; g.lineCap = "round"; g.lineJoin = "round";
  switch (kind) {
    case "react":
      for (let i = 0; i < 3; i++) { g.save(); g.rotate((i * Math.PI) / 3); g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.19, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
      g.beginPath(); g.arc(0, 0, s * 0.09, 0, Math.PI * 2); g.fill();
      break;
    case "angular":
      g.beginPath(); g.moveTo(0, -s * 0.5); g.lineTo(s * 0.45, -s * 0.34); g.lineTo(s * 0.38, s * 0.3); g.lineTo(0, s * 0.5); g.lineTo(-s * 0.38, s * 0.3); g.lineTo(-s * 0.45, -s * 0.34); g.closePath(); g.stroke();
      text(g, "A", 0, s * 0.03, s * 0.55, color, { align: "center", weight: 700 });
      break;
    case "node":
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5); }
      g.closePath(); g.stroke();
      text(g, "JS", 0, s * 0.03, s * 0.36, color, { align: "center", weight: 700 });
      break;
    case "devops":
      g.beginPath();
      for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 2; const d = 1 + Math.sin(t) ** 2; g.lineTo((s * 0.48 * Math.cos(t)) / d, (s * 0.48 * Math.sin(t) * Math.cos(t)) / d); }
      g.closePath(); g.lineWidth = s * 0.1; g.stroke();
      break;
    case "design":
      g.beginPath(); g.moveTo(-s * 0.32, s * 0.36); g.lineTo(s * 0.28, -s * 0.24); g.lineTo(s * 0.38, -s * 0.14); g.lineTo(-s * 0.22, s * 0.46); g.closePath(); g.fill();
      g.beginPath(); g.arc(s * 0.3, -s * 0.3, s * 0.12, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(-s * 0.2, -s * 0.2, s * 0.16, 0, Math.PI * 2); g.stroke();
      break;
    case "qa":
      g.beginPath(); g.arc(0, 0, s * 0.45, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-s * 0.2, 0); g.lineTo(-s * 0.04, s * 0.17); g.lineTo(s * 0.24, -s * 0.16); g.lineWidth = s * 0.11; g.stroke();
      break;
    case "hr":
      g.beginPath(); g.arc(-s * 0.15, -s * 0.15, s * 0.14, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(s * 0.2, -s * 0.12, s * 0.12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(-s * 0.15, s * 0.25, s * 0.25, s * 0.18, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.ellipse(s * 0.2, s * 0.24, s * 0.2, s * 0.15, 0, Math.PI, 0); g.fill();
      break;
    case "coffee":
      rr(g, -s * 0.3, -s * 0.15, s * 0.5, s * 0.5, s * 0.08, color);
      g.beginPath(); g.arc(s * 0.25, s * 0.08, s * 0.13, -Math.PI / 2, Math.PI / 2); g.stroke();
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-s * 0.18 + i * s * 0.14, -s * 0.25); g.quadraticCurveTo(-s * 0.1 + i * s * 0.14, -s * 0.38, -s * 0.18 + i * s * 0.14, -s * 0.48); g.stroke(); }
      break;
    case "meeting":
      rr(g, -s * 0.4, -s * 0.3, s * 0.8, s * 0.45, s * 0.06, undefined, color);
      g.beginPath(); g.moveTo(0, s * 0.15); g.lineTo(0, s * 0.42); g.moveTo(-s * 0.2, s * 0.42); g.lineTo(s * 0.2, s * 0.42); g.stroke();
      break;
  }
  g.restore();
}

/** The provisional Apptunix wordmark: rounded badge + wordmark. Replace with official artwork. */
export function drawLogo(g: CanvasRenderingContext2D, x: number, y: number, h: number, dark: boolean): void {
  const s = h;
  rr(g, x, y, s, s, s * 0.26, P.brandBlue);
  g.save();
  g.translate(x + s / 2, y + s / 2);
  g.strokeStyle = "#ffffff"; g.lineWidth = s * 0.12; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(-s * 0.24, s * 0.24); g.lineTo(0, -s * 0.26); g.lineTo(s * 0.24, s * 0.24); g.stroke();
  g.fillStyle = P.brandOrange; g.beginPath(); g.arc(0, s * 0.1, s * 0.09, 0, Math.PI * 2); g.fill();
  g.restore();
  text(g, "APPTUNIX", x + s * 1.22, y + s * 0.53, s * 0.62, dark ? P.brandNavy : "#ffffff", { weight: 700 });
}
