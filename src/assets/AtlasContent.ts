import type { UVRect } from "./GeometryBuilder";
import {
  drawBrowserApp, drawChat, drawDashboard, drawDesignTool, drawEditor, drawIcon, drawKanban, drawLogo, drawTerminal, drawTestRunner,
  FONT, MONO, rng, rr, text, TextureAtlas,
} from "./TextureAtlas";
import { P } from "../rendering/Palette";

/** Named, lazily painted atlas entries. Prefabs request what they need while building. */
export class AtlasContent {
  constructor(readonly atlas: TextureAtlas) {}

  screen(dept: string, i: number): UVRect {
    const name = `scr:${dept}:${i}`;
    const acc = (P as Record<string, string>)[dept] ?? P.brandBlue;
    const seed = hashStr(name);
    return this.atlas.add(name, 320, 192, (g, w, h) => {
      const k = i % 4;
      switch (dept) {
        case "react":
          if (k === 3) drawBrowserApp(g, w, h, seed, acc);
          else drawEditor(g, w, h, seed, acc, ["App.tsx", "useCart.ts", "Navbar.jsx"][k]);
          break;
        case "angular":
          if (k === 3) drawKanban(g, w, h, seed);
          else drawEditor(g, w, h, seed, acc, ["app.component.ts", "auth.service.ts", "routes.ts"][k]);
          break;
        case "node":
          if (k % 2 === 0) drawTerminal(g, w, h, seed, acc);
          else drawEditor(g, w, h, seed, acc, ["server.ts", "orders.controller.ts"][Math.floor(k / 2)]);
          break;
        case "devops":
          if (k === 2) drawTerminal(g, w, h, seed, acc);
          else drawDashboard(g, w, h, seed, acc);
          break;
        case "design":
          if (k === 3) drawKanban(g, w, h, seed);
          else drawDesignTool(g, w, h, seed, acc);
          break;
        case "qa":
          if (k === 3) drawBrowserApp(g, w, h, seed, acc);
          else drawTestRunner(g, w, h, seed, acc);
          break;
        case "hr":
          if (k % 2 === 0) drawChat(g, w, h, seed);
          else drawKanban(g, w, h, seed);
          break;
        default:
          drawChat(g, w, h, seed);
      }
      // a soft glass glare so screens read as glass, not flat stickers
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, "rgba(255,255,255,0.07)");
      grd.addColorStop(0.45, "rgba(255,255,255,0.0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
  }

  phoneScreen(i: number): UVRect {
    return this.atlas.add(`phone:${i}`, 64, 128, (g, w, h) => {
      const R = rng(i * 77 + 3);
      g.fillStyle = "#101218"; g.fillRect(0, 0, w, h);
      rr(g, 4, 10, w - 8, h * 0.3, 6, ["#f6b68f", "#8fc7c2", "#4fb3c8", "#c4b0e0"][i % 4]);
      for (let k = 0; k < 5; k++) rr(g, 4, h * 0.45 + k * 12, (w - 8) * (0.4 + R() * 0.6), 6, 3, "#6b7286");
      rr(g, 4, h - 18, w - 8, 12, 6, P.brandBlue);
    });
  }

  sign(label: string, icon: string, accent: string): UVRect {
    return this.atlas.add(`sign:${label}`, 512, 144, (g, w, h) => {
      rr(g, 0, 0, w, h, 26, P.brandNavy);
      rr(g, 6, 6, w - 12, h - 12, 22, undefined, "rgba(255,255,255,0.12)", 3);
      rr(g, 18, 18, h - 36, h - 36, 22, accent);
      drawIcon(g, icon, 18 + (h - 36) / 2, h / 2, h * 0.5, "#ffffff");
      text(g, label, h + 6, h / 2 - 12, 50, "#ffffff", { weight: 600 });
      text(g, "DEPARTMENT · 3F", h + 8, h / 2 + 30, 20, accent, { weight: 500 });
    });
  }

  nameplate(name: string, role: string, accent: string): UVRect {
    return this.atlas.add(`np:${name}`, 256, 72, (g, w, h) => {
      rr(g, 0, 0, w, h, 12, "#fbf8f2");
      g.fillStyle = accent; g.fillRect(0, 0, 14, h);
      text(g, name, 28, 28, 32, P.brandNavy, { weight: 700, maxW: w - 40 });
      text(g, role, 29, 56, 16, "#7d7a86", { weight: 500, maxW: w - 40 });
    });
  }

  dragonPlate(): UVRect {
    return this.atlas.add("np:DRAGON", 320, 96, (g, w, h) => {
      rr(g, 0, 0, w, h, 16, "#1f2a44");
      rr(g, 5, 5, w - 10, h - 10, 12, undefined, P.brandOrange, 3);
      // little dragon head mark
      g.fillStyle = "#6fbf73";
      g.beginPath(); g.ellipse(46, 48, 26, 22, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(30, 30); g.lineTo(24, 10); g.lineTo(40, 26); g.fill();
      g.beginPath(); g.moveTo(56, 28); g.lineTo(64, 8); g.lineTo(66, 30); g.fill();
      g.fillStyle = "#1f2a44"; g.beginPath(); g.arc(54, 44, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.brandOrange; g.beginPath(); g.moveTo(70, 52); g.lineTo(88, 46); g.lineTo(84, 58); g.fill();
      text(g, "DRAGON", 98, 42, 42, "#ffffff", { weight: 700 });
      text(g, "React Developer", 100, 74, 18, P.react, { weight: 500 });
    });
  }

  logoPanel(dark: boolean): UVRect {
    return this.atlas.add(`logo:${dark ? "dark" : "light"}`, 640, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = dark ? "#f6f1e8" : P.brandNavy; g.fillRect(0, 0, w, h);
      drawLogo(g, 30, 22, h - 44, dark);
    });
  }

  tagline(): UVRect {
    return this.atlas.add("tagline", 640, 96, (g, w, h) => {
      g.fillStyle = "#f6f1e8"; g.fillRect(0, 0, w, h);
      text(g, "We build apps that people love.", w / 2, h / 2, 40, P.brandNavy, { align: "center", weight: 500 });
    });
  }

  poster(i: number): UVRect {
    const data = [
      { t: "SHIP IT", s: "Done is better than perfect", c: P.brandOrange, b: P.brandNavy },
      { t: "CODE\nREVIEW\nIS LOVE", s: "", c: P.react, b: "#f6efe4" },
      { t: "Think\nUser\nFirst", s: "Apptunix values", c: P.brandBlue, b: "#f3dcc4" },
      { t: "git push\n--with-care", s: "", c: "#c3e88d", b: "#22283a" },
      { t: "Stay\nCurious", s: "", c: P.design, b: "#f2ebe0" },
      { t: "Test\nEarly", s: "QA team", c: P.qa, b: "#2a2e3c" },
      { t: "Hustle\n& Heart", s: "", c: P.devops, b: "#f5efe6" },
    ][i % 7];
    return this.atlas.add(`poster:${i}`, 192, 256, (g, w, h) => {
      g.fillStyle = data.b; g.fillRect(0, 0, w, h);
      const R = rng(i * 13 + 5);
      for (let k = 0; k < 5; k++) {
        g.fillStyle = data.c; g.globalAlpha = 0.18;
        g.beginPath(); g.arc(R() * w, R() * h, 20 + R() * 50, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      const lines = data.t.split("\n");
      const dark = parseInt(data.b.slice(1, 3), 16) < 100;
      lines.forEach((l, k) => text(g, l, 16, 50 + k * 46, 42, k === 0 ? data.c : dark ? "#ffffff" : P.brandNavy, { weight: 700, font: l.includes("--") || l.includes("git") ? MONO : FONT, maxW: w - 28 }));
      if (data.s) text(g, data.s, 16, h - 24, 14, dark ? "#c8ccd8" : "#6d6a75", { weight: 500 });
      g.strokeStyle = "rgba(0,0,0,0.15)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
    });
  }

  roomLabel(label: string, sub: string): UVRect {
    return this.atlas.add(`room:${label}`, 256, 96, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      rr(g, 0, 0, w, h, 14, "rgba(255,255,255,0.92)");
      text(g, label, 20, 38, 40, P.brandNavy, { weight: 700 });
      text(g, sub, 21, 74, 18, "#7d7a86", { weight: 500 });
    });
  }

  frostBand(): UVRect {
    return this.atlas.add("frost", 256, 32, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#d9dee4";
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 8, h);
    });
  }

  exitSign(): UVRect {
    return this.atlas.add("exit", 256, 96, (g, w, h) => {
      g.fillStyle = "#2fa363"; g.fillRect(0, 0, w, h);
      text(g, "EXIT", w * 0.62, h / 2 + 2, 48, "#ffffff", { align: "center", weight: 700 });
      g.fillStyle = "#ffffff";
      g.beginPath(); g.arc(44, 26, 9, 0, Math.PI * 2); g.fill();
      g.lineWidth = 9; g.strokeStyle = "#ffffff"; g.lineCap = "round";
      g.beginPath(); g.moveTo(42, 40); g.lineTo(36, 62); g.lineTo(22, 78); g.moveTo(36, 62); g.lineTo(54, 78); g.moveTo(40, 46); g.lineTo(58, 52); g.stroke();
    });
  }

  directory(): UVRect {
    return this.atlas.add("directory", 384, 448, (g, w, h) => {
      g.fillStyle = "#26304a"; g.fillRect(0, 0, w, h);
      text(g, "C-127 · BUILDING DIRECTORY", 24, 34, 22, "#e9e2d4", { weight: 600 });
      g.fillStyle = "#e9e2d4"; g.fillRect(24, 56, w - 48, 2);
      const floors = [["5", "Vacant — available"], ["4", "Suite 401–404"], ["3", "APPTUNIX"], ["2", "Suite 201–203"], ["1", "Suite 101–102"], ["G", "Lobby · Security"]];
      floors.forEach(([f, n], i) => {
        const y = 96 + i * 58;
        const hl = n === "APPTUNIX";
        if (hl) rr(g, 16, y - 26, w - 32, 52, 10, P.brandOrange);
        rr(g, 28, y - 18, 36, 36, 8, hl ? "#ffffff" : "#3a4566");
        text(g, f, 46, y + 1, 22, hl ? P.brandOrange : "#e9e2d4", { align: "center", weight: 700 });
        text(g, n, 80, y + 1, 24, hl ? "#ffffff" : "#cfd5e3", { weight: hl ? 700 : 500 });
      });
    });
  }

  floorNumber(f: string): UVRect {
    return this.atlas.add(`floor:${f}`, 192, 192, (g, w, h) => {
      g.fillStyle = "#f3ede3"; g.fillRect(0, 0, w, h);
      rr(g, 12, 12, w - 24, h - 24, 30, P.brandNavy);
      text(g, f, w / 2, h / 2 - 6, 96, "#ffffff", { align: "center", weight: 700 });
      text(g, f === "G" ? "LOBBY" : "FLOOR", w / 2, h - 40, 20, P.brandOrange, { align: "center", weight: 600 });
    });
  }

  liftButton(f: string, lit: boolean): UVRect {
    return this.atlas.add(`btn:${f}:${lit ? 1 : 0}`, 64, 64, (g, w, h) => {
      g.fillStyle = "#9aa1ab"; g.fillRect(0, 0, w, h);
      g.beginPath(); g.arc(w / 2, h / 2, 26, 0, Math.PI * 2); g.fillStyle = lit ? "#ffcf6b" : "#e8eaee"; g.fill();
      g.lineWidth = 3; g.strokeStyle = lit ? "#fff1c9" : "#6f7682"; g.stroke();
      text(g, f, w / 2, h / 2 + 2, 28, lit ? "#5a3d00" : "#3a3f4a", { align: "center", weight: 700 });
    });
  }

  whiteboard(i: number): UVRect {
    return this.atlas.add(`wb:${i}`, 512, 288, (g, w, h) => {
      g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h);
      const R = rng(i * 31 + 9);
      g.lineCap = "round"; g.lineJoin = "round";
      if (i === 0) {
        // architecture sketch
        const boxes = [[40, 40, "Mobile App"], [40, 170, "Web (React)"], [210, 100, "API Gateway"], [370, 40, "Orders svc"], [370, 170, "Payments"]] as const;
        g.strokeStyle = "#2f5fae"; g.lineWidth = 4;
        for (const [x, y, t] of boxes) { g.strokeRect(x, y, 110, 60); text(g, t, x + 55, y + 30, 18, "#2f5fae", { align: "center", weight: 500 }); }
        g.strokeStyle = "#d9675e"; g.lineWidth = 3;
        for (const [a, b] of [[[150, 70], [210, 130]], [[150, 200], [210, 130]], [[320, 130], [370, 70]], [[320, 130], [370, 200]]]) {
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
        text(g, "v2 launch → Fri!", 220, 260, 22, "#3a8a4a", { weight: 600 });
      } else if (i === 1) {
        text(g, "Q4 ROADMAP", 30, 36, 30, "#1f2a44", { weight: 700 });
        const items = ["✓ Driver app redesign", "✓ Payment retries", "• Ride-share v3", "• Admin analytics", "• Offline mode"];
        items.forEach((t, k) => text(g, t, 40, 84 + k * 38, 22, k < 2 ? "#3a8a4a" : "#2f5fae", { weight: 500 }));
        g.strokeStyle = "#f08a3c"; g.lineWidth = 4; g.beginPath(); g.ellipse(390, 160, 80, 60, -0.2, 0, Math.PI * 2); g.stroke();
        text(g, "MVP", 390, 160, 34, "#f08a3c", { align: "center", weight: 700 });
      } else {
        text(g, "Retro", 30, 36, 30, "#1f2a44", { weight: 700 });
        const cols = ["Went well", "Improve", "Actions"];
        cols.forEach((c, k) => {
          text(g, c, 30 + k * 160, 76, 18, "#5a6178", { weight: 600 });
          for (let s = 0; s < 3; s++) {
            const col = ["#ffe08a", "#ffb3c1", "#a8e6cf", "#a8d8ff"][Math.floor(R() * 4)];
            g.save(); g.translate(40 + k * 160 + R() * 30, 96 + s * 58); g.rotate((R() - 0.5) * 0.15);
            g.fillStyle = col; g.fillRect(0, 0, 100, 48);
            for (let l = 0; l < 2; l++) { g.fillStyle = "rgba(40,40,60,0.45)"; g.fillRect(8, 12 + l * 14, 60 + R() * 24, 4); }
            g.restore();
          }
        });
      }
    });
  }

  slide(): UVRect {
    return this.atlas.add("slide:cr1", 640, 360, (g, w, h) => {
      g.fillStyle = "#f6f1e8"; g.fillRect(0, 0, w, h);
      g.fillStyle = P.brandNavy; g.fillRect(0, 0, w * 0.38, h);
      drawLogo(g, 28, 28, 44, false);
      text(g, "Sprint 42", 28, 150, 46, "#ffffff", { weight: 700 });
      text(g, "Review & Demo", 28, 196, 26, P.brandOrange, { weight: 500 });
      text(g, "React · Angular · Node · QA", 28, h - 36, 16, "#aab3cc", { weight: 500 });
      const bars = [0.62, 0.8, 0.55, 0.92, 0.74];
      bars.forEach((b, i) => {
        const x = w * 0.45 + i * 62, bh = b * 190;
        rr(g, x, h - 70 - bh, 40, bh, 8, [P.react, P.angular, P.node, P.qa, P.devops][i]);
      });
      text(g, "Story points delivered", w * 0.45, 46, 24, P.brandNavy, { weight: 600 });
      g.fillStyle = "#c9c1b3"; g.fillRect(w * 0.44, h - 68, w * 0.52, 2);
    });
  }

  videoCall(): UVRect {
    return this.atlas.add("slide:call", 512, 288, (g, w, h) => {
      g.fillStyle = "#1c1f27"; g.fillRect(0, 0, w, h);
      const R = rng(11);
      for (let i = 0; i < 6; i++) {
        const x = 10 + (i % 3) * 166, y = 10 + Math.floor(i / 3) * 126;
        rr(g, x, y, 158, 118, 10, ["#3b4a63", "#4a3b5c", "#3b5c55", "#5c4a3b", "#3b4f5c", "#563b4a"][i]);
        g.fillStyle = ["#f1c7a5", "#c68e6a", "#e8b48f", "#a86f4f", "#f0c09b", "#d49d7a"][i];
        g.beginPath(); g.arc(x + 79, y + 50, 22, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(x + 79, y + 112, 40, 34, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#2a2430"; g.beginPath(); g.ellipse(x + 79, y + 36, 24, 12 + R() * 6, 0, Math.PI, 0); g.fill();
        rr(g, x + 6, y + 96, 60, 16, 5, "rgba(0,0,0,0.5)");
        text(g, ["Client", "PM", "Tushar", "Mohit", "Arpit", "QA"][i], x + 12, y + 104, 11, "#ffffff", { weight: 500 });
      }
    });
  }

  calendar(): UVRect {
    return this.atlas.add("calendar", 128, 112, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      g.fillStyle = P.angular; g.fillRect(0, 0, w, 30);
      text(g, "OCT", w / 2, 16, 20, "#ffffff", { align: "center", weight: 700 });
      text(g, "27", w / 2, 72, 54, P.brandNavy, { align: "center", weight: 700 });
    });
  }

  clock(): UVRect {
    return this.atlas.add("clock", 192, 192, (g, w, h) => {
      g.fillStyle = "#f7f3ec"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillStyle = P.brandNavy;
        g.beginPath(); g.arc(w / 2 + Math.sin(a) * 74, h / 2 - Math.cos(a) * 74, i % 3 === 0 ? 7 : 4, 0, Math.PI * 2); g.fill();
      }
      text(g, "APPTUNIX", w / 2, h / 2 + 34, 14, P.brandOrange, { align: "center", weight: 600 });
    });
  }

  tenantSign(label: string): UVRect {
    return this.atlas.add(`tenant:${label}`, 256, 64, (g, w, h) => {
      g.fillStyle = "#3d4459"; g.fillRect(0, 0, w, h);
      text(g, label, w / 2, h / 2, 26, "#e7e1d6", { align: "center", weight: 600 });
    });
  }

  buildingSign(): UVRect {
    return this.atlas.add("bldg", 512, 128, (g, w, h) => {
      g.fillStyle = "#2a3149"; g.fillRect(0, 0, w, h);
      text(g, "C-127", 28, h / 2, 64, "#f3ede3", { weight: 700 });
      text(g, "PHASE 8 · INDUSTRIAL AREA", 220, h / 2 - 14, 20, "#e9b27a", { weight: 600 });
      text(g, "MOHALI", 220, h / 2 + 18, 22, "#cfd5e3", { weight: 500 });
    });
  }

  noticeBoard(): UVRect {
    return this.atlas.add("notice", 384, 256, (g, w, h) => {
      g.fillStyle = "#c79a6b"; g.fillRect(0, 0, w, h);
      const R = rng(91);
      const notes = ["Friday Fun 5PM", "Birthday: Karan!", "Hackathon Nov", "Keep pantry clean", "New joiners ✨", "Cricket league"];
      notes.forEach((n, i) => {
        g.save();
        g.translate(18 + (i % 3) * 122, 20 + Math.floor(i / 3) * 116);
        g.rotate((R() - 0.5) * 0.14);
        g.fillStyle = ["#fff6c9", "#ffd7e0", "#d8f3e4", "#dbeafe", "#ffffff", "#ffe4c9"][i];
        g.fillRect(0, 0, 108, 96);
        g.fillStyle = "#d9675e"; g.beginPath(); g.arc(54, 8, 5, 0, Math.PI * 2); g.fill();
        text(g, n, 54, 52, 15, "#2b2b3a", { align: "center", weight: 600, maxW: 98 });
        g.restore();
      });
    });
  }

  hrBoard(): UVRect {
    return this.atlas.add("hrboard", 384, 192, (g, w, h) => {
      g.fillStyle = "#fbf6ee"; g.fillRect(0, 0, w, h);
      text(g, "PEOPLE & CULTURE", 20, 30, 26, P.brandNavy, { weight: 700 });
      const R = rng(5);
      for (let i = 0; i < 8; i++) {
        const x = 24 + (i % 4) * 88, y = 64 + Math.floor(i / 4) * 64;
        g.fillStyle = ["#f1c7a5", "#c68e6a", "#e8b48f", "#a86f4f"][i % 4];
        g.beginPath(); g.arc(x + 24, y + 22, 20, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2a2430"; g.beginPath(); g.ellipse(x + 24, y + 12, 21, 10 + R() * 4, 0, Math.PI, 0); g.fill();
      }
    });
  }

  serverPanel(): UVRect {
    return this.atlas.add("server", 128, 256, (g, w, h) => {
      g.fillStyle = "#23262f"; g.fillRect(0, 0, w, h);
      const R = rng(4);
      for (let u = 0; u < 14; u++) {
        const y = 6 + u * 18;
        rr(g, 6, y, w - 12, 14, 2, "#30343f");
        for (let k = 0; k < 4; k++) {
          g.fillStyle = R() < 0.7 ? "#6fd08c" : R() < 0.5 ? "#ffcb6b" : "#4fb3c8";
          g.fillRect(12 + k * 7, y + 5, 4, 4);
        }
        g.fillStyle = "#454a58"; for (let k = 0; k < 6; k++) g.fillRect(56 + k * 9, y + 3, 5, 8);
      }
    });
  }
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
