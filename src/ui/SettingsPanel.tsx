import { useState } from "react";
import { hud, useHud } from "../core/Store";
import { QUALITY, QualityName, GameSettings } from "../core/Settings";
import { getGame } from "./App";

export function SettingsPanel() {
  const open = useHud("settingsOpen");
  const backend = useHud("backend");
  const game = getGame();
  const [s, setS] = useState<GameSettings | null>(null);
  if (!open || !game) return null;
  const cur = s ?? game.settings;
  const update = (patch: Partial<GameSettings>) => {
    const next = { ...cur, ...patch };
    if (patch.quality) next.renderScale = QUALITY[patch.quality].renderScale;
    setS(next);
    game.applySettings(next);
  };
  return (
    <div className="settings-backdrop" onClick={() => hud.set({ settingsOpen: false })}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="muted">Renderer: {backend}</p>
        <label>Graphics preset
          <select value={cur.quality} onChange={(e) => update({ quality: e.target.value as QualityName })}>
            {(Object.keys(QUALITY) as QualityName[]).map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </label>
        <label>Render scale {Math.round(cur.renderScale * 100)}%
          <input type="range" min={0.4} max={1} step={0.05} value={cur.renderScale} onChange={(e) => update({ renderScale: +e.target.value })} />
        </label>
        <label className="check"><input type="checkbox" checked={cur.shadows} onChange={(e) => update({ shadows: e.target.checked })} /> Shadows</label>
        <label className="check"><input type="checkbox" checked={cur.outlines} onChange={(e) => update({ outlines: e.target.checked })} /> Outlines</label>
        <label>Field of view {cur.fov}°
          <input type="range" min={45} max={80} step={1} value={cur.fov} onChange={(e) => update({ fov: +e.target.value })} />
        </label>
        <label>Mouse sensitivity {cur.mouseSensitivity.toFixed(2)}
          <input type="range" min={0.3} max={2.5} step={0.05} value={cur.mouseSensitivity} onChange={(e) => update({ mouseSensitivity: +e.target.value })} />
        </label>
        <label className="check"><input type="checkbox" checked={cur.invertY} onChange={(e) => update({ invertY: e.target.checked })} /> Invert Y</label>
        <button className="close" onClick={() => hud.set({ settingsOpen: false })}>Done</button>
      </div>
    </div>
  );
}
