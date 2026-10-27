import { hud, useHud } from "../core/Store";
import { getGame } from "./App";

export function PauseMenu() {
  const paused = useHud("paused");
  if (!paused) return null;
  const g = getGame();
  return (
    <div className="settings-backdrop">
      <div className="settings pause">
        <h2>Paused</h2>
        <p className="muted">APPTUNIX: Office Chaos · Phase 2</p>
        <button className="close" onClick={() => g?.setPaused(false)}>Resume</button>
        <button className="ghost" onClick={() => hud.set({ settingsOpen: true })}>Settings</button>
        <div className="keys">
          <span><b>WASD</b> move</span><span><b>Shift</b> run</span><span><b>RMB</b> strafe</span><span><b>E</b> interact</span>
          <span><b>X</b> stand up</span><span><b>1–3</b> reply</span><span><b>F</b> free camera</span><span><b>Esc</b> pause</span>
        </div>
      </div>
    </div>
  );
}
