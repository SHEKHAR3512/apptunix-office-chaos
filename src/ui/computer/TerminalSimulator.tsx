import { useEffect, useRef, useState } from "react";
import { usePlay } from "../../game/gameplay/PlayState";
import { getGame } from "../App";

/** Fictional terminal bound to a pipeline puzzle. Input goes through the allowlisted parser only. */
export function TerminalSimulator({ puzzle, onClose }: { puzzle: string; onClose?: () => void }) {
  usePlay("rev");
  const pc = getGame()!.story.computer;
  const s = pc.puzzles.state(puzzle);
  const d = pc.puzzles.def(puzzle);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.scrollTo(0, 1e6); }, [s.log.length]);
  useEffect(() => { inp.current?.focus(); }, []);
  const send = (cmd: string) => { if (!cmd.trim()) return; pc.terminal(puzzle, cmd); setHist([cmd, ...hist].slice(0, 30)); setHi(-1); setInput(""); };
  const quick = ["logs", "env check", "env pull --from vault", "deploy"];
  return (
    <div className="term" onClick={() => inp.current?.focus()}>
      <div className="term-top"><span className="dots"><i /><i /><i /></span> {d.title}{onClose && <button onClick={onClose}>Close (Esc)</button>}</div>
      <div className="term-body" ref={box}>
        {d.kind === "pipeline" && s.log.length <= 2 && <p className="term-ins">{d.instructions}</p>}
        {s.log.map((l, i) => <div key={i} className={l.startsWith("$") ? "cmd" : /ERROR|✗|🙅/.test(l) ? "err" : /✓|SUCCESS|🚀/.test(l) ? "ok" : ""}>{l || " "}</div>)}
        <div className="term-in">
          <span>dragon@apx:~$</span>
          <input ref={inp} value={input} spellCheck={false} maxLength={80} onChange={(e) => setInput(e.target.value)} data-terminal-input
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") send(input);
              else if (e.key === "Escape") onClose?.();
              else if (e.key === "ArrowUp") { const n = Math.min(hist.length - 1, hi + 1); setHi(n); setInput(hist[n] ?? ""); }
              else if (e.key === "ArrowDown") { const n = Math.max(-1, hi - 1); setHi(n); setInput(n < 0 ? "" : hist[n]); }
            }} />
        </div>
      </div>
      <div className="term-quick">
        {quick.map((q) => <button key={q} onClick={() => send(q)} data-cmd={q}>{q}</button>)}
        <button onClick={() => { const h = pc.hint(puzzle); if (h) pc.puzzles.appendLog(puzzle, [`💡 ${h}`, ""]); }}>💡 hint</button>
        {s.deployed && <span className="term-done">✓ Deployed</span>}
      </div>
    </div>
  );
}
