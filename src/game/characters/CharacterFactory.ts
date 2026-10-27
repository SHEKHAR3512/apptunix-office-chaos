import { Bone, Matrix, Mesh, Skeleton, TransformNode, Vector3 } from "@babylonjs/core";
import { GeometryBuilder } from "../../assets/GeometryBuilder";
import type { WorldContext } from "../../world/WorldContext";
import { buildCharacter } from "./CharacterAppearance";
import { CharacterAnimator, Gesture } from "./CharacterAnimator";
import type { CharacterConfig } from "./CharacterConfig";
import { BONES, BoneName, DEFAULT_PROPORTIONS, jointPositions, PARENT } from "./Skeleton";

/** A live character instance: transform root, rig, skinned meshes, animator and props. */
export class Character {
  readonly root: TransformNode;
  readonly nodes: Record<BoneName, TransformNode>;
  readonly skeleton: Skeleton;
  readonly meshes: Mesh[];
  readonly animator: CharacterAnimator;
  readonly props: Record<"phone" | "cup", Mesh[]>;
  yaw = 0;
  private visible = true;

  constructor(readonly config: CharacterConfig, root: TransformNode, nodes: Record<BoneName, TransformNode>, skeleton: Skeleton, meshes: Mesh[], props: Record<"phone" | "cup", Mesh[]>, seed: number) {
    this.root = root; this.nodes = nodes; this.skeleton = skeleton; this.meshes = meshes; this.props = props;
    this.animator = new CharacterAnimator(nodes, seed);
    const pe = config.persona ?? {};
    this.animator.params.energy = pe.energy ?? 0.5;
    this.animator.params.posture = pe.posture ?? 0.6;
    this.animator.params.gestures = pe.gestures ?? 0.6;
  }

  get position(): Vector3 { return this.root.position; }

  place(pos: Vector3, yaw: number): void {
    this.root.position.copyFrom(pos);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }

  /** World position of a bone (for look targets, speech bubbles, camera framing). */
  bonePosition(b: BoneName): Vector3 {
    return this.nodes[b].getAbsolutePosition();
  }

  get headPosition(): Vector3 { return this.bonePosition("head").add(new Vector3(0, 0.12, 0)); }

  update(dt: number): void {
    const g = this.animator.gesture;
    this.setProp("phone", g === "UsingPhone");
    this.setProp("cup", g === "DrinkingWater");
    this.animator.update(dt, { pos: this.root.position, yaw: this.yaw });
    // bone matrices must be current for every pass (shadow + outline RTTs render before the
    // main pass evaluates active meshes), so prepare explicitly instead of lazily
    this.root.computeWorldMatrix(true);
    this.skeleton.prepare(true);
  }

  setGesture(g: Gesture): void { this.animator.setGesture(g); }

  private setProp(k: "phone" | "cup", on: boolean): void {
    for (const m of this.props[k]) if (m.isEnabled() !== on) m.setEnabled(on);
  }

  setVisible(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    this.root.setEnabled(v);
  }

  /** Distance LOD: hide tiny face meshes and throttle animation when far away. */
  setLod(distance: number): void {
    const far = distance > 22;
    for (const m of this.meshes) if ((m.metadata as { key?: string })?.key === "eye") m.isVisible = !far;
    this.animator.lodSkip = distance > 30 ? 3 : distance > 16 ? 1 : 0;
  }
}

let serial = 0;

/** Builds characters from configs. Geometry is generated once per config id and cached. */
export class CharacterFactory {
  constructor(private readonly ctx: WorldContext) {}

  create(cfg: CharacterConfig, parent: TransformNode): Character {
    const id = `${cfg.id}_${serial++}`;
    const scene = this.ctx.scene;
    const p = { ...DEFAULT_PROPORTIONS, ...cfg.appearance.body };
    const scale = (p.height ?? 1.74) / 1.74;
    const J = jointPositions({ ...p, height: 1.74 });

    const root = new TransformNode(`char:${id}`, scene);
    root.parent = parent;
    root.scaling.setAll(scale);

    // rig: transform nodes (animated) linked to skeleton bones
    const nodes = {} as Record<BoneName, TransformNode>;
    const skeleton = new Skeleton(`skel:${id}`, `skel:${id}`, scene);
    const bones = {} as Record<BoneName, Bone>;
    for (const b of BONES) {
      const par = PARENT[b];
      const local = par ? J[b].subtract(J[par]) : J[b].clone();
      const n = new TransformNode(`${id}:${b}`, scene);
      n.parent = par ? nodes[par] : root;
      n.position.copyFrom(local);
      n.rotation.setAll(0);
      nodes[b] = n;
      const m = Matrix.Translation(local.x, local.y, local.z);
      const bone = new Bone(b, skeleton, par ? bones[par] : null, m, m, m);
      bone.linkTransformNode(n);
      bones[b] = bone;
    }

    // skinned meshes
    const builder = new GeometryBuilder();
    buildCharacter(builder, cfg.appearance);
    const prev = this.ctx.currentFloor;
    this.ctx.currentFloor = "dynamic";
    const meshes = this.ctx.commit(builder, `char:${id}`, root, { static: false });
    this.ctx.currentFloor = prev;
    for (const m of meshes) {
      m.skeleton = skeleton;
      m.numBoneInfluencers = 2;
      this.ctx.outlines.setSkinned(m, (m.metadata as { key: never }).key);
      // ShaderMaterial only re-binds per-mesh uniforms (incl. bone matrices) when the cached
      // material changes; consecutive characters sharing a material would reuse one skeleton.
      m.onBeforeRenderObservable.add(() => scene.resetCachedMaterial());
      m.alwaysSelectAsActiveMesh = false;
      // bind-pose bounds are fine for culling; give them headroom for sitting/arms
      m.getBoundingInfo().scale(1.25);
    }

    // hand props (rigid, parented to hand nodes)
    const props = { phone: this.prop("phone", nodes.handL, root), cup: this.prop("cup", nodes.handR, root) };
    const seed = hash(cfg.id);
    return new Character(cfg, root, nodes, skeleton, meshes, props, seed);
  }

  private prop(kind: "phone" | "cup", hand: TransformNode, root: TransformNode): Mesh[] {
    const b = new GeometryBuilder();
    if (kind === "phone") {
      b.at(-0.012, -0.11, 0.01, 0, () => {
        b.box(0, -0.075, 0, 0.012, 0.15, 0.072, { mat: "plastic", color: "#2b2d33", r: 0.006 });
        b.box(0.0065, -0.072, 0, 0.001, 0.14, 0.064, { mat: "display", color: "#ffffff", r: 0 });
      });
    } else {
      b.at(0.0, -0.11, 0.02, 0, () => b.lathe(0, -0.045, 0, [[0, 0], [0.03, 0], [0.034, 0.09], [0.03, 0.09], [0.026, 0.01]], 12, { mat: "decor", color: "#ffffff" }));
    }
    const prev = this.ctx.currentFloor;
    this.ctx.currentFloor = "dynamic";
    const ms = this.ctx.commit(b, `prop:${kind}`, hand, { static: false });
    this.ctx.currentFloor = prev;
    ms.forEach((m) => m.setEnabled(false));
    void root;
    return ms;
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1000;
}
