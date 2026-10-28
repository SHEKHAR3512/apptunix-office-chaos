import { useState } from "react";
import { usePlay } from "../../game/gameplay/PlayState";
import { PROJECT_FILES } from "../../game/minigames/DeveloperComputer";
import type { FixComponentDef } from "../../game/minigames/PuzzleEngine";
import { getGame } from "../App";

const KW = /\b(import|from|export|function|const|let|return|if|else|new|true|false|null|undefined)\b/g;

/** Tiny highlighter (display only — nothing here is ever executed). */
export function highlight(line: string): { t: string; c: string }[] {
  const out: { t: string; c: string }[] = [];
  const re = /(\/\/.*$|\/\*.*\*\/)|("[^"]*"|'[^']*'|`[^`]*`)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b\d+(\.\d+)?\b)|(\b(?:import|from|export|function|const|let|return|if|else|new|true|false|null|undefined)\b)|([{}()[\];,.=+\-!?:])/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), c: "id" });
    out.push({ t: m[0], c: m[1] ? "cm" : m[2] ? "st" : m[3] ? "tg" : m[4] ? "nm" : m[6] ? "kw" : "pn" });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ t: line.slice(last), c: "id" });
  void KW;
  return out;
}

export function CodeView({ code, pickable, picked, wrong, onPick }: { code: string[]; pickable?: boolean; picked?: number[]; wrong?: number | null; onPick?: (n: number) => void }) {
  return (
    <pre className="ed-code">
      {code.map((l, i) => {
        const n = i + 1;
        const cls = picked?.includes(n) ? "ok" : wrong === n ? "bad" : "";
        return (
          <div key={i} className={`ed-line ${pickable ? "pick" : ""} ${cls}`} onClick={() => pickable && onPick?.(n)} data-line={n}>
            <span className="ed-ln">{n}</span>
            <span>{highlight(l).map((t, k) => <span key={k} className={`tk-${t.c}`}>{t.t}</span>)}{l === "" ? " " : ""}</span>
          </div>
        );
      })}
    </pre>
  );
}

/** Editor app: explorer, live puzzle-backed file, puzzle panel (hints, fixes, tests). */
export function CodeEditor() {
  usePlay("rev");
  const g = getGame()!;
  const pc = g.story.computer, pe = pc.puzzles;
  const [file, setFile] = useState<string | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const open = (f: string) => { setFile(f); setWrong(null); setHint(null); pc.openFile(f); };
  const meta = PROJECT_FILES.find((f) => f.path === file);
  let puzzleId: string | null = null;
  if (meta?.puzzle) puzzleId = meta.puzzle.find((p) => !pe.state(p).solved || pe.def(p).kind === "fixComponent") ?? meta.puzzle[meta.puzzle.length - 1];
  if (puzzleId === "react_cart_fix" && !pe.state("react_cart_find").solved) puzzleId = "react_cart_find";
  const d = puzzleId ? pe.def(puzzleId) : null;
  const s = puzzleId ? pe.state(puzzleId) : null;
  return (
    <div className="ed">
      <aside className="ed-files">
        <div className="ed-h">EXPLORER · apx-checkout</div>
        {PROJECT_FILES.map((f) => (
          <button key={f.path} className={file === f.path ? "on" : ""} onClick={() => open(f.path)} data-file={f.path}>
            {f.path.endsWith(".css") ? "🎨" : "⚛️"} {f.path.split("/").pop()}
          </button>
        ))}
      </aside>
      <section className="ed-main">
        {!file && <div className="ed-empty">Open a file from the explorer. <br />Tip: the bug report mentions <b>AddToCart.tsx</b>.</div>}
        {file && !puzzleId && <><div className="pc-tab">{file}</div><CodeView code={meta?.note?.split("\n") ?? []} /></>}
        {file && d && s && (
          <>
            <div className="pc-tab">{file}{s.solved && d.kind === "findBug" ? " · bug located" : ""}</div>
            <CodeView code={pe.currentCode(puzzleId!)} pickable={d.kind === "findBug" && !s.solved} picked={d.kind === "findBug" ? s.picked : []} wrong={wrong}
              onPick={(n) => { const ok = d.kind === "findBug" && d.buggyLines.includes(n); setWrong(ok ? null : n); pc.pickLine(puzzleId!, n); }} />
          </>
        )}
      </section>
      {d && s && (
        <aside className="ed-panel" data-puzzle={puzzleId!}>
          <h4>{d.title}</h4>
          <p className="ed-ins">{d.instructions}</p>
          {d.kind === "fixComponent" && <FixPanel d={d} />}
          {s.feedback && <p className={`ed-fb ${s.solved ? "ok" : ""}`}>{s.feedback}</p>}
          {s.solved && d.kind === "findBug" && <button className="ed-btn" onClick={() => setHint(null)} data-next>Great — now choose a fix ↓ (reopen the file)</button>}
          <div className="ed-row">
            <button className="ed-ghost" onClick={() => setHint(pc.hint(puzzleId!))} data-hint>💡 Hint</button>
            {!s.solved && <button className="ed-ghost" onClick={() => { pc.retry(puzzleId!); setWrong(null); }}>↺ Reset</button>}
            <span className="ed-meta">attempts {s.attempts} · hints {s.hintsShown}</span>
          </div>
          {hint && <p className="ed-hint">{hint}</p>}
        </aside>
      )}
    </div>
  );
}

function FixPanel({ d }: { d: FixComponentDef }) {
  const g = getGame()!;
  const pc = g.story.computer;
  const s = pc.puzzles.state(d.id);
  return (
    <div className="fix">
      {d.options.map((o) => (
        <label key={o.id} className={`fix-opt ${s.selected === o.id ? "sel" : ""} ${s.applied === o.id ? "app" : ""}`} data-option={o.id}>
          <input type="radio" name={d.id} checked={s.selected === o.id} onChange={() => pc.select(d.id, o.id)} />
          <code>{o.label}</code>
        </label>
      ))}
      <div className="ed-row">
        <button className="ed-btn" disabled={!s.selected} onClick={() => pc.apply(d.id)} data-apply>Apply fix</button>
        <button className="ed-btn alt" onClick={() => pc.runTests(d.id)} data-run-tests>▶ Run tests</button>
      </div>
      {s.testResults && (
        <ul className="tests">
          {s.testResults.map((t) => <li key={t.name} className={t.pass ? "ok" : "bad"}>{t.pass ? "✓" : "✗"} {t.name}{t.output && <small>{t.output}</small>}</li>)}
          <li className={`sum ${s.testsPassed ? "ok" : "bad"}`}>{s.testsPassed ? `All ${s.testResults.length} tests passed` : `${s.testResults.filter((t) => !t.pass).length} failing`}</li>
        </ul>
      )}
    </div>
  );
}
