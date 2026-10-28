/**
 * Puzzle engine for the developer computer. All puzzles are *structured*: players select,
 * apply and run predefined things; no user-written code is ever evaluated. Deterministic and
 * pure (no DOM, no Babylon) — unit-tested.
 *
 * Formats
 *  A. findBug      — click the incorrect line(s)
 *  B. fixComponent — pick a fix, apply it, run the tests, compare previews
 *  C. pipeline     — fictional CI/CD failure resolved through an allowlisted terminal
 *  D. reproduce    — find the conditions (viewport width) under which a bug appears
 */

export interface TestCase { name: string; pass: boolean; output?: string }

export interface FindBugDef {
  kind: "findBug"; id: string; title: string; file: string; instructions: string; hints: string[];
  code: string[]; buggyLines: number[]; explanation: string;
  /** feedback when the player picks a correct-but-innocent line */
  wrongFeedback?: Record<number, string>;
}

export interface FixOption {
  id: string; label: string; code: string[]; correct: boolean; feedback: string; tests: TestCase[];
  /** behaviour shown in the browser preview */
  preview: Record<string, unknown>;
}

export interface FixComponentDef {
  kind: "fixComponent"; id: string; title: string; file: string; instructions: string; hints: string[];
  original: string[]; originalPreview: Record<string, unknown>; originalTests: TestCase[]; suite: string;
  options: FixOption[];
}

export interface PipelineAction { id: string; label: string; effect: "fix" | "info" | "bad" | "deploy" | "test" | "noop"; output: string[]; needs?: string }

export interface PipelineDef {
  kind: "pipeline"; id: string; title: string; instructions: string; hints: string[]; env: string;
  failureLog: string[]; successLog: string[]; actions: PipelineAction[]; files: Record<string, string[]>;
}

export interface ReproduceDef {
  /** Verification pass: "breaksBelow" marks the widths that must be checked, nothing is broken. */
  verify?: boolean;
  kind: "reproduce"; id: string; bug: string; title: string; instructions: string; hints: string[];
  minWidth: number; maxWidth: number; startWidth: number; breaksBelow: number;
}

export type PuzzleDef = FindBugDef | FixComponentDef | PipelineDef | ReproduceDef;

export interface PuzzleState {
  id: string;
  solved: boolean;
  attempts: number;
  hintsShown: number;
  feedback: string | null;
  // findBug
  picked: number[];
  // fixComponent
  selected: string | null;
  applied: string | null;
  testResults: TestCase[] | null;
  testsPassed: boolean;
  // pipeline
  log: string[];
  identified: boolean;
  fixed: boolean;
  deployed: boolean;
  // reproduce
  width: number;
}

export type PuzzleEventSink = {
  solved(id: string, attempts: number, hints: number): void;
  failed(id: string): void;
  testsPassed?(suite: string): void;
  testsFailed?(suite: string): void;
  deployFailed?(env: string, reason: string): void;
  deployed?(env: string): void;
  reproduced?(bug: string): void;
};

export class PuzzleEngine {
  private states = new Map<string, PuzzleState>();
  constructor(private readonly defs: PuzzleDef[], private readonly sink: PuzzleEventSink) {}

  def(id: string): PuzzleDef { const d = this.defs.find((x) => x.id === id); if (!d) throw new Error(`unknown puzzle ${id}`); return d; }

  state(id: string): PuzzleState {
    let s = this.states.get(id);
    if (!s) {
      const d = this.def(id);
      s = { id, solved: false, attempts: 0, hintsShown: 0, feedback: null, picked: [], selected: null, applied: null, testResults: null, testsPassed: false,
        log: d.kind === "pipeline" ? ["Simulated terminal — type `help` for commands.", ""] : [], identified: false, fixed: false, deployed: false,
        width: d.kind === "reproduce" ? d.startWidth : 0 };
      this.states.set(id, s);
    }
    return s;
  }

  hint(id: string): string | null {
    const d = this.def(id), s = this.state(id);
    if (s.hintsShown >= d.hints.length) return d.hints[d.hints.length - 1] ?? null;
    return d.hints[s.hintsShown++];
  }

  /** Reset the attempt (keeps attempt/hint counts) — retry without restarting the mission. */
  retry(id: string): void {
    const s = this.state(id);
    if (s.solved) return;
    s.picked = []; s.selected = null; s.applied = null; s.testResults = null; s.feedback = null;
  }

  private solve(id: string): void {
    const s = this.state(id);
    if (s.solved) return;
    s.solved = true;
    this.sink.solved(id, s.attempts, s.hintsShown);
  }

  // ---------------------------------------------------------------- A. find the bug
  pickLine(id: string, line: number): boolean {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "findBug" || s.solved) return false;
    s.attempts++;
    if (d.buggyLines.includes(line)) {
      if (!s.picked.includes(line)) s.picked.push(line);
      s.feedback = d.explanation;
      if (d.buggyLines.every((l) => s.picked.includes(l))) this.solve(id);
      return true;
    }
    s.feedback = d.wrongFeedback?.[line] ?? "That line looks fine. Look for where the state changes.";
    this.sink.failed(id);
    return false;
  }

  // ---------------------------------------------------------------- B. fix the component
  select(id: string, option: string): void {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "fixComponent" || s.solved && s.testsPassed) return;
    if (!d.options.some((o) => o.id === option)) return;
    s.selected = option;
  }

  apply(id: string): boolean {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "fixComponent" || !s.selected) return false;
    s.applied = s.selected;
    s.testResults = null; s.testsPassed = false;
    const o = d.options.find((x) => x.id === s.applied)!;
    s.feedback = o.feedback;
    if (o.correct) this.solve(id);
    else { s.attempts++; this.sink.failed(id); }
    return o.correct;
  }

  /** Run the suite against the current code (original if nothing applied). */
  runTests(id: string): TestCase[] {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "fixComponent") return [];
    const o = d.options.find((x) => x.id === s.applied);
    const tests = o ? o.tests : d.originalTests;
    s.testResults = tests;
    s.testsPassed = tests.every((t) => t.pass);
    if (s.testsPassed) this.sink.testsPassed?.(d.suite);
    else this.sink.testsFailed?.(d.suite);
    return tests;
  }

  currentCode(id: string): string[] {
    const d = this.def(id), s = this.state(id);
    if (d.kind === "fixComponent") return d.options.find((o) => o.id === s.applied)?.code ?? d.original;
    if (d.kind === "findBug") return d.code;
    return [];
  }

  currentPreview(id: string): Record<string, unknown> {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "fixComponent") return {};
    return d.options.find((o) => o.id === s.applied)?.preview ?? d.originalPreview;
  }

  // ---------------------------------------------------------------- C. pipeline
  /** Run a parsed, allowlisted action. Returns the lines appended to the log. */
  runAction(id: string, actionId: string): string[] {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "pipeline") return [];
    const a = d.actions.find((x) => x.id === actionId);
    if (!a) return [];
    let out = [...a.output];
    switch (a.effect) {
      case "info": if (a.needs === "identify") s.identified = true; break;
      case "fix":
        if (!s.identified) { out = ["Hmm — fix what? Check the logs or the environment first."]; break; }
        s.fixed = true; break;
      case "bad": s.attempts++; this.sink.failed(id); break;
      case "test": break;
      case "deploy":
        if (!s.fixed) {
          s.attempts++;
          out = [...d.failureLog];
          s.identified = s.identified || false;
          this.sink.deployFailed?.(d.env, "missing environment configuration");
        } else {
          out = [...d.successLog];
          s.deployed = true;
          this.sink.deployed?.(d.env);
          this.solve(id);
        }
        break;
      case "noop": break;
    }
    s.log.push(...out, "");
    if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
    return out;
  }

  appendLog(id: string, lines: string[]): void { const s = this.state(id); s.log.push(...lines); }

  // ---------------------------------------------------------------- D. reproduce
  setWidth(id: string, w: number): void {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "reproduce") return;
    s.width = Math.max(d.minWidth, Math.min(d.maxWidth, Math.round(w)));
  }

  isBroken(id: string): boolean {
    const d = this.def(id), s = this.state(id);
    return d.kind === "reproduce" && s.width < d.breaksBelow;
  }

  report(id: string): boolean {
    const d = this.def(id), s = this.state(id);
    if (d.kind !== "reproduce" || s.solved) return false;
    if (!this.isBroken(id)) { s.attempts++; s.feedback = d.verify ? "Not small enough yet — the oldest phone is narrower." : "Looks fine at this width. Try a phone-sized screen."; this.sink.failed(id); return false; }
    s.feedback = d.verify ? `Checked at ${s.width}px: the layout holds. ✓` : `Reproduced: the product row overflows at ${s.width}px.`;
    this.sink.reproduced?.(d.bug);
    this.solve(id);
    return true;
  }

  // ---------------------------------------------------------------- persistence
  serialize(): Record<string, { solved: boolean; attempts: number; hints: number; applied?: string | null; fixed?: boolean; identified?: boolean }> {
    return Object.fromEntries([...this.states].map(([k, s]) => [k, { solved: s.solved, attempts: s.attempts, hints: s.hintsShown, applied: s.applied, fixed: s.fixed, identified: s.identified }]));
  }

  restore(data: Record<string, { solved: boolean; attempts: number; hints: number; applied?: string | null; fixed?: boolean; identified?: boolean }>): void {
    for (const [id, v] of Object.entries(data)) {
      if (!this.defs.some((d) => d.id === id)) continue;
      const s = this.state(id);
      s.solved = v.solved; s.attempts = v.attempts; s.hintsShown = v.hints;
      s.applied = v.applied ?? null; s.selected = s.applied; s.fixed = !!v.fixed; s.identified = !!v.identified;
      if (s.solved && this.def(id).kind === "pipeline") s.deployed = true;
    }
  }
}
