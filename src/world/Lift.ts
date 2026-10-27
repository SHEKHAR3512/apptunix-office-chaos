import { Mesh, TransformNode, Vector3 } from "@babylonjs/core";
import type { GeometryBuilder } from "../assets/GeometryBuilder";
import { sfx } from "../core/Audio";
import { P } from "../rendering/Palette";
import { bx } from "../assets/prefabs/Shapes";
import type { Collider } from "./Colliders";
import { BUILDING, CORE, floorY } from "./OfficeLayout";
import type { WorldContext } from "./WorldContext";

type LiftState = "idle" | "opening" | "open" | "closing" | "moving";

const DOOR_Z0 = CORE.liftDoorZ - CORE.liftDoorWidth / 2;
const DOOR_Z1 = CORE.liftDoorZ + CORE.liftDoorWidth / 2;
const FRONT_X = CORE.liftShaft.x1;        // east face of the shaft (landing side)
const CAB = CORE.liftCabin;
const CAB_H = 2.5;
export const FLOOR_LABELS = BUILDING.floors;

interface Landing { level: number; panels: { node: TransformNode; closed: number; dir: number }[]; collider: Collider }

/**
 * Passenger lift serving G + 5 floors: cabin, centre-opening cabin and landing doors,
 * floor indicators (dynamic texture), call buttons, cabin buttons with lit states,
 * arrival chime and indicator flash.
 */
export class Lift {
  readonly cabin: TransformNode;
  level = 0;
  target: number | null = null;
  private queue: number[] = [];
  state: LiftState = "idle";
  door = 0;
  private openTimer = 0;
  private velocity = 0;
  private displayed = -1;
  private flash = 0;
  private readonly cabinPanels: { node: TransformNode; closed: number; dir: number }[] = [];
  private readonly landings = new Map<number, Landing>();
  private readonly buttonLights = new Map<number, Mesh[]>();
  private readonly cabinDoor: Collider;
  private readonly cabinWalls: Collider[] = [];
  onArrive: (level: number) => void = () => {};
  onDepart: (from: number, to: number) => void = () => {};
  playerInside = false;

  constructor(private readonly ctx: WorldContext) {
    this.cabin = new TransformNode("liftCabin", ctx.scene);
    this.cabin.parent = ctx.root("dynamic");
    this.buildCabin();
    this.cabinDoor = ctx.colliders.add(CAB.x1 - 0.05, 0, DOOR_Z0, CAB.x1 + 0.05, CAB_H, DOOR_Z1, "lift", "lift.cabinDoor");
    // cabin side walls (inside the shaft) so the cabin is solid even mid-travel
    this.cabinWalls.push(
      ctx.colliders.add(CAB.x0 - 0.05, 0, CAB.z0, CAB.x1, CAB_H, CAB.z0 + 0.05, "lift"),
      ctx.colliders.add(CAB.x0 - 0.05, 0, CAB.z1 - 0.05, CAB.x1, CAB_H, CAB.z1, "lift"),
      ctx.colliders.add(CAB.x0 - 0.05, 0, CAB.z0, CAB.x0, CAB_H, CAB.z1, "lift"),
      ctx.colliders.add(CAB.x1 - 0.05, 0, CAB.z0, CAB.x1 + 0.05, CAB_H, DOOR_Z0, "lift"),
      ctx.colliders.add(CAB.x1 - 0.05, 0, DOOR_Z1, CAB.x1 + 0.05, CAB_H, CAB.z1, "lift"),
    );
    this.drawIndicator(0, 0);
    ctx.anchors.add("lift.cabin.centre", "lift", new Vector3((CAB.x0 + CAB.x1) / 2, 0, (CAB.z0 + CAB.z1) / 2), Math.PI / 2, 0, "lift");
  }

  get cabinY(): number { return this.cabin.position.y; }

  isInsideCabin(p: Vector3): boolean {
    return p.x > CAB.x0 && p.x < CAB.x1 + 0.05 && p.z > CAB.z0 && p.z < CAB.z1 && Math.abs(p.y - this.cabinY) < 1.2;
  }

  /** Landing call point for a floor (in front of the call panel). */
  callPoint(level: number): Vector3 { return new Vector3(FRONT_X + 0.5, floorY(level), DOOR_Z1 + 0.55); }

  // ------------------------------------------------------------------ geometry

  private buildCabin(): void {
    const ctx = this.ctx, b = ctx.builder();
    const x0 = CAB.x0, x1 = CAB.x1, z0 = CAB.z0, z1 = CAB.z1;
    const w = x1 - x0, d = z1 - z0;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    b.measure("liftCabin", () => {
      bx(b, "floorStone", "#4b4d55", mx, -0.06, mz, w, 0.06, d, { r: 0 });
      bx(b, "floorStone", "#6a6560", mx, -0.002, mz, w - 0.3, 0.004, d - 0.3, { r: 0 });
      // walls: brushed steel lower, warm wood upper panels, mirror band on the back wall
      bx(b, "brushed", "#9aa2ad", x0 + 0.03, 0, mz, 0.06, CAB_H, d, { r: 0.004 });
      bx(b, "wood", "#b98b5c", x0 + 0.065, 0.95, mz, 0.01, 1.2, d - 0.5, { r: 0.002 });
      bx(b, "glass", "#ffffff", x0 + 0.075, 1.0, mz, 0.006, 1.1, d - 0.7, { r: 0 });
      for (const zz of [z0 + 0.03, z1 - 0.03]) {
        bx(b, "brushed", "#9aa2ad", mx, 0, zz, w, CAB_H, 0.06, { r: 0.004 });
        bx(b, "wood", "#b98b5c", mx - 0.1, 0.95, zz + (zz < mz ? 0.035 : -0.035), w - 0.6, 1.2, 0.01, { r: 0.002 });
      }
      // handrails
      for (const zz of [z0 + 0.12, z1 - 0.12]) b.tube([new Vector3(x0 + 0.25, 0.92, zz), new Vector3(x1 - 0.5, 0.92, zz)], 0.018, 8, { mat: "brushed", color: P.aluminium });
      b.tube([new Vector3(x0 + 0.12, 0.92, z0 + 0.25), new Vector3(x0 + 0.12, 0.92, z1 - 0.25)], 0.018, 8, { mat: "brushed", color: P.aluminium });
      // front wall returns
      bx(b, "brushed", "#a8afb9", x1 - 0.03, 0, (z0 + DOOR_Z0) / 2, 0.06, CAB_H, DOOR_Z0 - z0, { r: 0.004 });
      bx(b, "brushed", "#a8afb9", x1 - 0.03, 0, (DOOR_Z1 + z1) / 2, 0.06, CAB_H, z1 - DOOR_Z1, { r: 0.004 });
      bx(b, "brushed", "#a8afb9", x1 - 0.03, 2.2, CORE.liftDoorZ, 0.06, CAB_H - 2.2, CORE.liftDoorWidth, { r: 0.004 });
      // ceiling with a warm light box
      bx(b, "metal", "#e6e3dd", mx, CAB_H, mz, w, 0.05, d, { r: 0 });
      bx(b, "light", "#fff1d6", mx, CAB_H - 0.012, mz, w - 0.6, 0.012, d - 0.6, { r: 0 });
      // control panel on the inside of the front wall, beside the door
      const pz = (DOOR_Z1 + z1) / 2;
      bx(b, "brushed", "#c3c9d1", x1 - 0.07, 0.85, pz, 0.02, 0.75, 0.28, { r: 0.008 });
      FLOOR_LABELS.forEach((f, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const by = 0.95 + (2 - row) * 0.17 + 0.17, bz = pz - 0.06 + col * 0.12;
        b.at(x1 - 0.081, by, bz, Math.PI / 2, () => b.quad(0, 0, 0, 0.085, 0.085, { mat: "print", color: "#ffffff", uv: ctx.atlas.liftButton(f, false) }));
      });
      b.at(x1 - 0.081, 2.33, CORE.liftDoorZ, Math.PI / 2, () => b.quad(0, 0, 0, 0.36, 0.14, { mat: "liftDisplay", color: "#ffffff", uv: { u0: 0, v0: 0, u1: 1, v1: 1 } }));
    });
    ctx.commit(b, "liftCabin", this.cabin, { static: false }).forEach((m) => ctx.addDynamicCaster(m));

    // lit button overlays (toggled per request)
    FLOOR_LABELS.forEach((f, i) => {
      const lb = ctx.builder();
      const col = i % 2, row = Math.floor(i / 2);
      const pz = (DOOR_Z1 + z1) / 2;
      const by = 0.95 + (2 - row) * 0.17 + 0.17, bz = pz - 0.06 + col * 0.12;
      lb.at(x1 - 0.083, by, bz, Math.PI / 2, () => lb.quad(0, 0, 0, 0.085, 0.085, { mat: "display", color: "#ffffff", uv: ctx.atlas.liftButton(f, true) }));
      const ms = ctx.commit(lb, `liftBtn${f}`, this.cabin, { static: false });
      ms.forEach((m) => m.setEnabled(false));
      this.buttonLights.set(i, ms);
    });

    // cabin doors
    for (const s of [-1, 1]) {
      const node = new TransformNode(`liftCabinDoor${s}`, ctx.scene);
      node.parent = this.cabin;
      const pb = ctx.builder();
      const pw = CORE.liftDoorWidth / 2 + 0.02;
      pb.measure("liftDoorPanel", () => {
        pb.box(0, 0, 0, 0.03, 2.2, pw, { mat: "brushed", color: "#b5bcc6", r: 0.004 });
        pb.box(-0.017, 0.1, 0, 0.004, 2.0, pw - 0.1, { mat: "brushed", color: "#c4cad2", r: 0 });
      });
      ctx.commit(pb, `liftCabinDoor${s}`, node, { static: false }).forEach((m) => ctx.addDynamicCaster(m));
      const closed = CORE.liftDoorZ + s * (pw / 2 - 0.01);
      node.position.set(x1 + 0.02, 0, closed);
      this.cabinPanels.push({ node, closed, dir: s * (pw - 0.05) });
    }
  }

  /** Build the landing (shaft walls, portal, call panel, indicator, doors) on a floor. */
  buildLanding(b: GeometryBuilder, level: number): void {
    const ctx = this.ctx, y = floorY(level);
    const S = CORE.liftShaft, t = 0.2;
    b.measure("liftLanding", () => {
      // shaft walls (full storey so the shaft is never see-through)
      bx(b, "wall", "#d9d2c6", S.x0 + t / 2, y, (S.z0 + S.z1) / 2, t, BUILDING.floorHeight, S.z1 - S.z0, { r: 0 });
      bx(b, "wall", "#d9d2c6", (S.x0 + S.x1) / 2, y, S.z0 + t / 2, S.x1 - S.x0, BUILDING.floorHeight, t, { r: 0 });
      bx(b, "wall", "#d9d2c6", (S.x0 + S.x1) / 2, y, S.z1 - t / 2, S.x1 - S.x0, BUILDING.floorHeight, t, { r: 0 });
      bx(b, "wall", "#d9d2c6", S.x1 - t / 2, y, (S.z0 + DOOR_Z0) / 2, t, BUILDING.floorHeight, DOOR_Z0 - S.z0, { r: 0 });
      bx(b, "wall", "#d9d2c6", S.x1 - t / 2, y, (DOOR_Z1 + S.z1) / 2, t, BUILDING.floorHeight, S.z1 - DOOR_Z1, { r: 0 });
      bx(b, "wall", "#d9d2c6", S.x1 - t / 2, y + 2.2, CORE.liftDoorZ, t, BUILDING.floorHeight - 2.2, CORE.liftDoorWidth, { r: 0 });
      // stone portal cladding on the landing face
      // (split around the doorway — the opening must stay clear)
      bx(b, "floorStone", "#4c4f5a", FRONT_X + 0.02, y, (S.z0 - 0.05 + DOOR_Z0) / 2, 0.04, 2.75, DOOR_Z0 - S.z0 + 0.05, { r: 0.006 });
      bx(b, "floorStone", "#4c4f5a", FRONT_X + 0.02, y, (DOOR_Z1 + S.z1 + 0.05) / 2, 0.04, 2.75, S.z1 + 0.05 - DOOR_Z1, { r: 0.006 });
      bx(b, "floorStone", "#4c4f5a", FRONT_X + 0.02, y + 2.2, CORE.liftDoorZ, 0.04, 0.55, CORE.liftDoorWidth, { r: 0.006 });
      bx(b, "brushed", P.aluminium, FRONT_X + 0.05, y, DOOR_Z0 - 0.05, 0.04, 2.3, 0.1, { r: 0.008 });
      bx(b, "brushed", P.aluminium, FRONT_X + 0.05, y, DOOR_Z1 + 0.05, 0.04, 2.3, 0.1, { r: 0.008 });
      bx(b, "brushed", P.aluminium, FRONT_X + 0.05, y + 2.2, CORE.liftDoorZ, 0.04, 0.1, CORE.liftDoorWidth + 0.2, { r: 0.008 });
      // sill
      bx(b, "brushed", "#8d949e", FRONT_X - 0.1, y - 0.005, CORE.liftDoorZ, 0.3, 0.01, CORE.liftDoorWidth, { r: 0 });
      // indicator above the doors
      b.at(FRONT_X + 0.045, y + 2.47, CORE.liftDoorZ, -Math.PI / 2, () => {
        bx(b, "plastic", "#1d1f26", 0, -0.1, 0.01, 0.5, 0.2, 0.02, { r: 0.01 });
        b.quad(0, 0, -0.002, 0.46, 0.17, { mat: "liftDisplay", color: "#ffffff", uv: { u0: 0, v0: 0, u1: 1, v1: 1 } });
      });
      // call panel
      b.at(FRONT_X + 0.045, y + 1.1, DOOR_Z1 + 0.3, -Math.PI / 2, () => {
        bx(b, "brushed", "#c3c9d1", 0, -0.13, 0.005, 0.11, 0.26, 0.012, { r: 0.008 });
        bx(b, "light", "#ffd98a", 0, 0.015, -0.004, 0.05, 0.05, 0.012, { r: 0.02, seg: 2 });
        bx(b, "light", "#ffd98a", 0, -0.075, -0.004, 0.05, 0.05, 0.012, { r: 0.02, seg: 2 });
      });
      // floor number sign beside the lift
      b.at(FRONT_X + 0.045, y + 1.55, S.z0 + 0.45, -Math.PI / 2, () => b.quad(0, 0, 0, 0.42, 0.42, { mat: "print", color: "#ffffff", uv: ctx.atlas.floorNumber(FLOOR_LABELS[level]) }));
    });
    ctx.colliders.add(S.x0, y, S.z0, S.x1, y + BUILDING.floorHeight, S.z0 + t, "wall");
    ctx.colliders.add(S.x0, y, S.z1 - t, S.x1, y + BUILDING.floorHeight, S.z1, "wall");
    ctx.colliders.add(S.x0, y, S.z0, S.x0 + t, y + BUILDING.floorHeight, S.z1, "wall");
    ctx.colliders.add(S.x1 - t, y, S.z0, S.x1 + 0.06, y + BUILDING.floorHeight, DOOR_Z0, "wall");
    ctx.colliders.add(S.x1 - t, y, DOOR_Z1, S.x1 + 0.06, y + BUILDING.floorHeight, S.z1, "wall");
    ctx.colliders.add(S.x1 - t, y + 2.2, DOOR_Z0, S.x1, y + BUILDING.floorHeight, DOOR_Z1, "wall");

    // landing doors (dynamic)
    const panels: Landing["panels"] = [];
    for (const s of [-1, 1]) {
      const node = new TransformNode(`landingDoor${level}${s}`, ctx.scene);
      node.parent = ctx.root(level);
      const pb = ctx.builder();
      const pw = CORE.liftDoorWidth / 2 + 0.02;
      pb.measure("liftDoorPanel", () => {
        pb.box(0, 0, 0, 0.035, 2.2, pw, { mat: "brushed", color: "#aeb5bf", r: 0.004 });
        pb.box(0.02, 0.1, 0, 0.004, 2.0, pw - 0.1, { mat: "brushed", color: "#bcc2cb", r: 0 });
      });
      ctx.commit(pb, `landingDoor${level}${s}`, node, { static: false }).forEach((m) => ctx.addDynamicCaster(m));
      const closed = CORE.liftDoorZ + s * (pw / 2 - 0.01);
      node.position.set(FRONT_X - 0.12, y, closed);
      panels.push({ node, closed, dir: s * (pw - 0.05) });
    }
    const collider = ctx.colliders.add(FRONT_X - 0.15, y, DOOR_Z0, FRONT_X - 0.05, y + 2.2, DOOR_Z1, "lift", `lift.landing${level}`);
    this.landings.set(level, { level, panels, collider });
  }

  // ------------------------------------------------------------------ control

  /** Teleport the cabin (debug / viewpoints). */
  placeAt(level: number, open: boolean): void {
    this.moveCabin(floorY(level) - this.cabinY);
    this.level = level;
    this.target = null; this.queue = []; this.velocity = 0;
    this.state = open ? "open" : "idle";
    this.door = open ? 1 : 0;
    this.openTimer = -30;
    this.drawIndicator(level, 0);
  }

  /** Request the lift to a floor (from a call button or the cabin panel). */
  request(level: number): void {
    if (level < 0 || level >= FLOOR_LABELS.length) return;
    sfx.click();
    if (level === this.level && this.state !== "moving") {
      if (this.state === "closing" || this.state === "idle") this.state = "opening";
      this.openTimer = 0;
      return;
    }
    if (this.target === level || this.queue.includes(level)) return;
    if (this.target === null) this.target = level;
    else this.queue.push(level);
    this.setButtonLit(level, true);
    if (this.state === "open" || this.state === "opening") { this.state = "closing"; }
    else if (this.state === "idle") this.startMove();
  }

  private setButtonLit(level: number, lit: boolean): void {
    this.buttonLights.get(level)?.forEach((m) => m.setEnabled(lit));
  }

  private startMove(): void {
    if (this.target === null) return;
    this.state = "moving";
    this.onDepart(this.level, this.target);
    sfx.hum(true);
  }

  update(dt: number, player: Vector3): void {
    this.playerInside = this.isInsideCabin(player);
    const inDoorway = player.x > FRONT_X - 0.6 && player.x < FRONT_X + 0.5 && player.z > DOOR_Z0 - 0.1 && player.z < DOOR_Z1 + 0.1 && Math.abs(player.y - this.cabinY) < 1;
    switch (this.state) {
      case "opening":
        this.door = Math.min(1, this.door + dt * 1.1);
        if (this.door >= 1) { this.state = "open"; this.openTimer = 0; }
        break;
      case "open":
        this.openTimer += dt;
        if ((this.target !== null && !inDoorway && this.openTimer > 1.2) || (this.openTimer > 7 && !inDoorway)) this.state = "closing";
        break;
      case "closing":
        if (inDoorway) { this.state = "opening"; break; }
        this.door = Math.max(0, this.door - dt * 0.9);
        if (this.door <= 0) {
          if (this.target !== null) this.startMove();
          else this.state = "idle";
        }
        break;
      case "moving": {
        const ty = floorY(this.target!);
        const dy = ty - this.cabinY;
        const dist = Math.abs(dy);
        const maxV = 2.4, acc = 1.6;
        const stopV = Math.sqrt(2 * acc * dist);
        this.velocity = Math.min(maxV, stopV, this.velocity + acc * dt);
        const step = Math.min(dist, this.velocity * dt);
        this.moveCabin(Math.sign(dy) * step);
        const f = Math.round(this.cabinY / BUILDING.floorHeight);
        if (f !== this.displayed || this.flash > 0) this.drawIndicator(f, Math.sign(dy));
        if (dist - step < 0.002) {
          this.moveCabin(ty - this.cabinY);
          this.level = this.target!;
          this.velocity = 0;
          this.setButtonLit(this.level, false);
          this.target = this.queue.shift() ?? null;
          this.onArrive(this.level);
          sfx.hum(false);
          sfx.chime();
          this.flash = 1;
          this.state = "opening";
        }
        break;
      }
      case "idle":
        if (this.target !== null) this.startMove();
        break;
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 0.8);
      this.drawIndicator(this.level, 0);
    }
    // doors
    const e = this.door * this.door * (3 - 2 * this.door);
    for (const p of this.cabinPanels) p.node.position.z = p.closed + p.dir * e;
    for (const l of this.landings.values()) {
      const open = l.level === this.level && this.state !== "moving" ? e : 0;
      for (const p of l.panels) p.node.position.z = p.closed + p.dir * open;
      l.collider.enabled = open < 0.7;
    }
    this.cabinDoor.enabled = e < 0.7;
  }

  private moveCabin(dy: number): void {
    if (dy === 0) return;
    this.cabin.position.y += dy;
    this.ctx.colliders.move(this.cabinDoor, 0, dy, 0);
    for (const c of this.cabinWalls) this.ctx.colliders.move(c, 0, dy, 0);
  }

  private drawIndicator(level: number, dir: number): void {
    this.displayed = level;
    const tex = this.ctx.materials.liftTexture;
    const g = tex.getContext() as unknown as CanvasRenderingContext2D;
    const w = 256, h = 128;
    g.fillStyle = "#14161c"; g.fillRect(0, 0, w, h);
    const glow = this.flash > 0 && Math.floor(this.flash * 6) % 2 === 0;
    const col = glow ? "#fff3c2" : "#ffb347";
    g.fillStyle = col;
    g.font = "700 88px Fredoka, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(FLOOR_LABELS[Math.max(0, Math.min(FLOOR_LABELS.length - 1, level))], w * 0.62, h / 2 + 4);
    if (dir !== 0) {
      g.beginPath();
      const ax = w * 0.24, ay = h / 2;
      if (dir > 0) { g.moveTo(ax, ay - 30); g.lineTo(ax + 26, ay + 10); g.lineTo(ax - 26, ay + 10); }
      else { g.moveTo(ax, ay + 30); g.lineTo(ax + 26, ay - 10); g.lineTo(ax - 26, ay - 10); }
      g.closePath(); g.fill();
    } else {
      g.fillStyle = "#3a3d48"; g.fillRect(w * 0.18, h / 2 - 3, 36, 6);
    }
    tex.update(false);
  }

  get displayLabel(): string { return FLOOR_LABELS[this.level]; }
}
