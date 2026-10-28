import { describe, expect, it } from "vitest";
import { PuzzleEngine } from "../../src/game/minigames/PuzzleEngine";
import { parseCommand } from "../../src/game/minigames/TerminalParser";
import { DEPLOY, PUZZLES } from "../../src/data/puzzles/chapter1";

const mk = () => {
  const log: string[] = [];
  const pe = new PuzzleEngine(PUZZLES, {
    solved: (id, a, h) => log.push(`solved:${id}:${a}:${h}`), failed: (id) => log.push(`failed:${id}`),
    testsPassed: (s) => log.push(`pass:${s}`), testsFailed: (s) => log.push(`fail:${s}`),
    deployed: (e) => log.push(`deployed:${e}`), deployFailed: (e) => log.push(`deployfail:${e}`), reproduced: (b) => log.push(`repro:${b}`),
  });
  return { pe, log };
};

describe("Find the bug", () => {
  it("wrong lines give feedback and count attempts; the right line solves once", () => {
    const { pe, log } = mk();
    expect(pe.pickLine("react_cart_find", 8)).toBe(false);
    expect(pe.state("react_cart_find").feedback).toContain("WHAT it receives");
    expect(pe.pickLine("react_cart_find", 7)).toBe(true);
    pe.pickLine("react_cart_find", 7);
    expect(log.filter((l) => l.startsWith("solved")).length).toBe(1);
    expect(pe.state("react_cart_find").attempts).toBe(2);
  });
  it("hints reveal progressively and are counted", () => {
    const { pe } = mk();
    expect(pe.hint("react_cart_find")).toContain("NEW value");
    pe.hint("react_cart_find");
    expect(pe.state("react_cart_find").hintsShown).toBe(2);
  });
});

describe("Fix the component", () => {
  it("original code fails tests; wrong fix fails; retry; correct fix passes", () => {
    const { pe, log } = mk();
    expect(pe.runTests("react_cart_fix").every((t) => t.pass)).toBe(false);
    pe.select("react_cart_fix", "reassign");
    expect(pe.apply("react_cart_fix")).toBe(false);
    expect(pe.runTests("react_cart_fix").some((t) => !t.pass)).toBe(true);
    pe.retry("react_cart_fix");
    expect(pe.state("react_cart_fix").applied).toBeNull();
    pe.select("react_cart_fix", "functional");
    expect(pe.apply("react_cart_fix")).toBe(true);
    expect(pe.currentCode("react_cart_fix").join("\n")).toContain("prev => [...prev, product]".replace("prev =>", "(prev) =>"));
    expect(pe.runTests("react_cart_fix").every((t) => t.pass)).toBe(true);
    expect(log).toContain("pass:cart");
    expect(pe.currentPreview("react_cart_fix")).toEqual({ cart: "works" });
  });
  it("every option has deterministic tests and exactly the correct ones pass", () => {
    const { pe } = mk();
    for (const id of ["react_cart_fix", "qa_layout_fix"]) {
      const d = pe.def(id);
      if (d.kind !== "fixComponent") continue;
      for (const o of d.options) expect(o.tests.every((t) => t.pass), `${id}/${o.id}`).toBe(o.correct);
    }
  });
});

describe("Reproduce", () => {
  it("only reports successfully at a breaking width", () => {
    const { pe, log } = mk();
    expect(pe.report("qa_reproduce")).toBe(false);
    pe.setWidth("qa_reproduce", 100);
    expect(pe.state("qa_reproduce").width).toBe(320);
    expect(pe.isBroken("qa_reproduce")).toBe(true);
    expect(pe.report("qa_reproduce")).toBe(true);
    expect(log).toContain("repro:APX-301-mobile");
  });
});

describe("Pipeline + terminal", () => {
  it("deploy fails until the env var is identified and restored", () => {
    const { pe, log } = mk();
    pe.runAction("deploy_pipeline", "deploy");
    expect(log).toContain("deployfail:production");
    expect(pe.runAction("deploy_pipeline", "env-pull")[0]).toContain("fix what");
    pe.runAction("deploy_pipeline", "logs");
    pe.runAction("deploy_pipeline", "env-pull");
    expect(pe.state("deploy_pipeline").fixed).toBe(true);
    pe.runAction("deploy_pipeline", "deploy");
    expect(log).toContain("deployed:production");
    expect(pe.state("deploy_pipeline").solved).toBe(true);
  });
  it("parser only accepts allowlisted commands", () => {
    expect(parseCommand("logs")).toMatchObject({ ok: true, action: "logs" });
    expect(parseCommand("  ENV   pull --from vault ")).toMatchObject({ ok: true, action: "env-pull" });
    expect(parseCommand("cat .env.example")).toMatchObject({ ok: true, action: "cat:.env.example" });
    expect(parseCommand("cat /etc/passwd").ok).toBe(false);
    expect(parseCommand("rm -rf /").ok).toBe(false);
    expect(parseCommand("logs; rm -rf ~").ok).toBe(false);
    expect(parseCommand("echo $(whoami)").ok).toBe(false);
    expect(parseCommand("deploy --skip-tests")).toMatchObject({ ok: true, action: "skip-tests" });
    expect(parseCommand("x".repeat(200)).ok).toBe(false);
  });
  it("every parser action exists in the pipeline puzzle", () => {
    const ids = new Set(DEPLOY.actions.map((a) => a.id));
    for (const c of ["help", "status", "logs", "ls", "cat .env.example", "cat deploy.yml", "cat README.md", "env check", "env pull", "npm test", "deploy", "deploy --skip-tests", "rm -rf node_modules", "git status", "chai"]) {
      const r = parseCommand(c);
      expect(r.ok, c).toBe(true);
      if (r.ok && r.action !== "clear") expect(ids.has(r.action), `${c} → ${r.action}`).toBe(true);
    }
  });
});

describe("Puzzle persistence", () => {
  it("restores solved state", () => {
    const { pe } = mk();
    pe.pickLine("react_cart_find", 7);
    const s = JSON.parse(JSON.stringify(pe.serialize()));
    const { pe: pe2 } = mk();
    pe2.restore(s);
    expect(pe2.state("react_cart_find").solved).toBe(true);
  });
});
