import { useState } from "react";
import { usePlay } from "../../game/gameplay/PlayState";
import { getGame } from "../App";

const LABEL: Record<string, string> = { todo: "To do", in_progress: "In progress", ready_for_qa: "Ready for QA", reopened: "Reopened", approved: "Approved ✓" };

export function TaskBoard() {
  const tickets = usePlay("tickets");
  usePlay("rev");
  const pc = getGame()!.story.computer;
  const [sel, setSel] = useState<string | null>(null);
  const t = tickets.find((x) => x.id === sel);
  return (
    <div className="tb">
      <div className="tb-list">
        <div className="ed-h">SPRINT 42 · ASSIGNED TO YOU</div>
        {tickets.length === 0 && <p className="tb-empty">No tickets yet. Enjoy it while it lasts. ☕</p>}
        {tickets.map((x) => (
          <button key={x.id} className={`tb-item ${sel === x.id ? "on" : ""}`} onClick={() => { setSel(x.id); pc.viewTicket(x.id); }} data-ticket={x.id}>
            <span className={`prio p${x.priority[1]}`}>{x.priority}</span><b>{x.id}</b> {x.title}
            <span className={`st st-${x.status}`}>{LABEL[x.status]}</span>
          </button>
        ))}
      </div>
      {t && (
        <div className="tb-detail">
          <h3>{t.id} · {t.title}</h3>
          <p className="tb-meta">Priority {t.priority} · reported by {t.reporter} · status <b>{LABEL[t.status]}</b></p>
          <p>{t.description}</p>
          <h4>Acceptance criteria</h4>
          <ul>{t.criteria.map((c) => <li key={c}>☐ {c}</li>)}</ul>
          <div className="ed-row">
            <button className="ed-btn" disabled={!pc.canMarkReady(t.id)} onClick={() => pc.setTicket(t.id, "ready_for_qa")} data-ready>Move to Ready for QA</button>
            {!pc.canMarkReady(t.id) && t.status !== "ready_for_qa" && t.status !== "approved" && <span className="ed-meta">Fix it and get the tests green first.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
