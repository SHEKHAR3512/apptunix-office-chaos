import { useRef, useState } from "react";
import { usePlay, play } from "../../game/gameplay/PlayState";
import { ZONES } from "../../world/OfficeLayout";
import { sfx } from "../../core/Audio";
import { getGame } from "../App";
import { ProductRow } from "../computer/BrowserPreview";
import { TerminalSimulator } from "../computer/TerminalSimulator";

export function TitleMenu() {
  const mode = usePlay("mode");
  const hasSave = usePlay("hasSave");
  const info = usePlay("saveInfo");
  const status = usePlay("saveStatus");
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  if (mode !== "title") return null;
  const g = getGame()!;
  const go = (f: () => void) => { sfx.ambience(true); g.player.unlock(); f(); };
  return (
    <div className="title">
      <div className="title-card">
        <div className="logo-badge"><span>A</span></div>
        <h1>APPTUNIX<small>OFFICE CHAOS</small></h1>
        <p className="title-ch">Chapter 1 · The Production Bug</p>
        {hasSave && <button className="ed-btn" onClick={() => go(() => void g.story.continueGame())} data-continue>Continue<small>{info}</small></button>}
        <button className="ed-btn" onClick={() => go(() => g.story.newGame())} data-new-game>New Game</button>
        <button className="ed-ghost" onClick={() => go(() => g.story.startSandbox())}>Free roam (sandbox)</button>
        <div className="ed-row">
          {hasSave && <button className="ed-ghost" onClick={() => void g.story.saves.exportFile()}>Export save</button>}
          <button className="ed-ghost" onClick={() => file.current?.click()}>Import save</button>
          {hasSave && <button className="ed-ghost danger" onClick={() => { if (confirm("Delete all progress?")) void g.story.resetProgress(); }}>Reset</button>}
        </div>
        <input ref={file} type="file" accept=".json" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const r = await g.story.saves.importText(await f.text()); setMsg(r.message);
          if (r.ok) play.set({ hasSave: true, saveInfo: "Imported save" });
        }} />
        {(msg || status) && <p className="ed-meta">{msg || status}</p>}
        <p className="title-foot">A fictional comedy. Any resemblance to real production incidents is purely relatable.</p>
      </div>
    </div>
  );
}

export function MissionHUD() {
  const mode = usePlay("mode");
  const m = usePlay("mission");
  const vis = usePlay("hudVisible");
  const wp = usePlay("waypoint");
  const notices = usePlay("notices");
  const lb = usePlay("letterbox");
  const side = usePlay("side");
  return (
    <>
      {lb && <><div className="lb top" /><div className="lb bot" /></>}
      <div className="notices">{notices.map((n) => <div key={n.id} className={`notice n-${n.kind}`}><span>{n.icon}</span>{n.text}</div>)}</div>
      {mode === "story" && vis && m && !lb && (
        <div className="qhud" data-mission={m.id}>
          <small>{m.category === "side" ? "SIDE JOB" : `MISSION ${String(m.index).padStart(2, "0")}`}</small>
          <b>{m.title}</b>
          <ul>{m.objectives.filter((o) => o.done || o.current || o.optional).map((o) => (
            <li key={o.id} className={`${o.done ? "done" : ""} ${o.current ? "cur" : ""} ${o.optional ? "opt" : ""}`}>{o.done ? "✓" : o.optional ? "◇" : "▸"} {o.text}</li>
          ))}</ul>
          {side.map((s) => { const c = s.objectives.find((o) => o.current); return <div key={s.id} className="qside" data-side={s.id}>✦ {s.title}{c ? <span> · {c.text}</span> : null}</div>; })}
          {wp && <div className="wp"><span style={{ transform: `rotate(${wp.angle}rad)` }}>➤</span>{wp.label} · {wp.otherFloor ?? `${Math.round(wp.dist)} m`}</div>}
          <em>J journal · M map · U hide</em>
        </div>
      )}
    </>
  );
}

export function MissionJournal() {
  const open = usePlay("journalOpen");
  const ms = usePlay("missions");
  const rel = usePlay("relationships");
  if (!open) return null;
  return (
    <div className="modal" onClick={() => play.set({ journalOpen: false })}>
      <div className="journal" onClick={(e) => e.stopPropagation()}>
        <h2>Journal · Chapter 1</h2>
        {ms.filter((m) => m.category === "story" || m.state !== "LOCKED").map((m) => (
          <div key={m.id} className={`jm st-${m.state}`}>
            <b>{m.category === "side" ? "✦ Side" : String(m.index).padStart(2, "0")} · {m.state === "LOCKED" ? "???" : m.title}</b> <small>{m.state === "AVAILABLE" && m.category === "side" ? "OFFERED" : m.state}</small>
            {m.state !== "LOCKED" && <p>{m.description}</p>}
            {(m.state === "ACTIVE" || m.state === "PAUSED") && <ul>{m.objectives.map((o) => <li key={o.id} className={o.done ? "done" : ""}>{o.done ? "✓" : "☐"} {o.text}{o.current && o.hint ? ` — ${o.hint}` : ""}</li>)}</ul>}
          </div>
        ))}
        <h3>Team</h3>
        <div className="rels">{Object.entries(rel).map(([k, v]) => <span key={k}>{k} <b>{v >= 0 ? "+" : ""}{v}</b></span>)}</div>
        <button className="ed-ghost" onClick={() => play.set({ journalOpen: false })}>Close (J)</button>
      </div>
    </div>
  );
}

export function OfficeMap() {
  const open = usePlay("mapOpen");
  usePlay("waypoint");
  if (!open) return null;
  const g = getGame()!;
  const p = g.player.pos;
  const xs = ZONES.flatMap((z) => [z.rect.x0, z.rect.x1]), zs = ZONES.flatMap((z) => [z.rect.z0, z.rect.z1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  return (
    <div className="modal" onClick={() => play.set({ mapOpen: false })}>
      <div className="map" onClick={(e) => e.stopPropagation()}>
        <h2>3rd Floor</h2>
        <svg viewBox={`${x0 - 1} ${z0 - 1} ${x1 - x0 + 2} ${z1 - z0 + 2}`}>
          {ZONES.map((z) => (
            <g key={z.id}>
              <rect x={z.rect.x0} y={z.rect.z0} width={z.rect.x1 - z.rect.x0} height={z.rect.z1 - z.rect.z0} fill={z.floorColor} stroke="#22252d" strokeWidth={0.15} opacity={0.85} />
              <text x={(z.rect.x0 + z.rect.x1) / 2} y={(z.rect.z0 + z.rect.z1) / 2} fontSize={1} textAnchor="middle" fill="#fff">{z.label}</text>
            </g>
          ))}
          <circle cx={p.x} cy={p.z} r={0.7} fill="#ff8a3d" stroke="#fff" strokeWidth={0.2} />
        </svg>
        <button className="ed-ghost" onClick={() => play.set({ mapOpen: false })}>Close (M)</button>
      </div>
    </div>
  );
}

export function ChapterCard() {
  const c = usePlay("chapterCard");
  if (!c) return null;
  return (
    <div className="chapter" data-chapter-card>
      <small>CHAPTER COMPLETE</small><h1>{c.title}</h1><p>{c.subtitle}</p>
      <ul>{c.stats.map((s) => <li key={s}>{s}</li>)}</ul>
      <button className="ed-btn" onClick={() => getGame()!.story.closeChapterCard()} data-close-chapter>Keep exploring</button>
    </div>
  );
}

export function QADevice() {
  const open = usePlay("qaDevice");
  const pid = usePlay("qaPuzzle");
  usePlay("rev");
  if (!open) return null;
  const g = getGame()!, pc = g.story.computer, pe = pc.puzzles;
  const s = pe.state(pid);
  const verify = !!(pe.def(pid) as { verify?: boolean }).verify;
  const broken = !verify && pe.isBroken(pid);
  const orig = (pe.def("qa_layout_fix") as { originalPreview: Record<string, unknown> }).originalPreview;
  return (
    <div className="modal">
      <div className="qa" data-qa-device>
        <h2>📱 QA test device · FoodDash</h2>
        <p className="ed-ins">{pe.def(pid).instructions}</p>
        <ProductRow spec={broken ? orig : { wrap: true }} width={s.width} scale={Math.min(1, 520 / s.width)} />
        <label className="qa-w">Viewport {s.width}px
          <input type="range" min={320} max={1440} value={s.width} onChange={(e) => pc.setWidth(pid, +e.target.value)} data-width />
        </label>
        <div className="ed-row">
          <button className="ed-btn" onClick={() => pc.report(pid)} disabled={s.solved} data-report>{verify ? "Confirm: layout OK" : "Report: bug reproduced"}</button>
          <button className="ed-ghost" onClick={() => g.story.closeOverlay()}>Close (Esc)</button>
        </div>
        {s.feedback && <p className={`ed-fb ${s.solved ? "ok" : ""}`}>{s.feedback}</p>}
      </div>
    </div>
  );
}

export function DevOpsConsole() {
  const open = usePlay("console");
  if (!open) return null;
  const g = getGame()!;
  return <div className="modal"><div className="console" data-console><TerminalSimulator puzzle="deploy_pipeline" onClose={() => g.story.closeOverlay()} /></div></div>;
}
