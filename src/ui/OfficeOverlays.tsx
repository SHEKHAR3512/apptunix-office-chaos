import { useHud } from "../core/Store";
import { getGame } from "./App";

export function ClockWidget() {
  const clock = useHud("clock");
  const debug = useHud("debug");
  const g = getGame();
  return (
    <div className="clock">
      <span className="clock-time">{clock}</span>
      {debug && g && (
        <span className="clock-ctl">
          {[1, 10, 60].map((s) => <button key={s} onClick={() => { g.life.clock.scale = s; }}>×{s}</button>)}
          {["09:45", "11:00", "13:00", "15:30"].map((t) => <button key={t} onClick={() => g.life.clock.set(t)}>{t}</button>)}
        </span>
      )}
    </div>
  );
}

export function Toast() {
  const t = useHud("toast");
  return t ? <div className="toast">{t}</div> : null;
}

export function ReadOverlay() {
  const o = useHud("overlay");
  if (!o) return null;
  return (
    <div className="read" onClick={() => getGame()?.life.closeOverlay()}>
      <div className="read-card">
        <h2>{o.title}</h2>
        <ul>{o.lines.map((l, i) => <li key={i} style={{ transform: `rotate(${((i * 37) % 7) - 3}deg)` }}>{l}</li>)}</ul>
        <p className="muted">E / click to close</p>
      </div>
    </div>
  );
}
