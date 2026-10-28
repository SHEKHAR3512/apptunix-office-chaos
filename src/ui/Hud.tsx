import { usePlay } from "../game/gameplay/PlayState";
import { useHud, hud } from "../core/Store";
import { FLOOR_LABELS } from "../world/Lift";
import { VIEW_MODES } from "../core/Game";
import { VIEWPOINTS } from "../core/Viewpoints";
import { getGame } from "./App";

export function Hud() {
  const mode = usePlay("mode");
  const card = usePlay("chapterCard");
  const prompt = useHud("prompt");
  const inLift = useHud("inLift");
  const liftFloor = useHud("liftFloor");
  const liftTarget = useHud("liftTarget");
  const floor = useHud("floorLabel");
  const zone = useHud("zoneLabel");
  const debug = useHud("debug");
  const stats = useHud("stats");
  const viewMode = useHud("viewMode");
  const fly = useHud("freeFly");
  const locked = useHud("pointerLocked");
  const help = useHud("showHelp");
  const dialogue = useHud("dialogue");
  const computer = useHud("computer");
  const game = getGame();
  return (
    <div className="hud">
      <div className="location">
        <span className="floor">{floor}</span>
        {zone && <span className="zone">{zone}</span>}
        {fly && <span className="tag">FREE CAMERA</span>}
      </div>
      {prompt && !dialogue && !computer && <div className="prompt">{prompt}</div>}
      {inLift && (
        <div className="lift-panel">
          <div className="lift-display">{liftTarget ? `${liftFloor} → ${liftTarget}` : liftFloor}</div>
          <div className="lift-buttons">
            {[...FLOOR_LABELS].reverse().map((f) => (
              <button key={f} className={liftTarget === f ? "lit" : ""} onClick={() => game?.requestLift(FLOOR_LABELS.indexOf(f))}>{f}</button>
            ))}
          </div>
        </div>
      )}
      {help && (
        <div className="help">
          <b>Explore</b> WASD · Shift run · Mouse look (click to lock) · Wheel zoom<br />
          <b>E</b> interact (talk · sit · use) · <b>X</b> stand up · <b>RMB</b> strafe · <b>Esc</b> pause · <b>F</b> free camera · <b>`</b> debug · <b>P</b> hide help
        </div>
      )}
      {!locked && !dialogue && !computer && !card && mode !== "title" && <div className="click-hint">Click to look around</div>}
      {debug && (
        <div className="debug">
          <pre>{stats}</pre>
          <div className="row">
            <select value={viewMode} onChange={(e) => game?.setViewMode(+e.target.value)}>
              {VIEW_MODES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <button onClick={() => game?.toggleCeilings()}>Ceilings</button>
          </div>
          <div className="views">
            {Object.entries(VIEWPOINTS).map(([k, v]) => <button key={k} onClick={() => game?.goToView(k)}>{v.label}</button>)}
          </div>
          <div className="row">
            <button onClick={() => { game?.teleportToFloor(3, game.ctx.anchors.get("spawn.office")!.position, Math.PI / 2); }}>Walk: 3F reception</button>
            <button onClick={() => { game?.teleportToFloor(0, game.ctx.anchors.get("spawn.street")!.position, 0); }}>Walk: street</button>
            <button onClick={() => { console.log(JSON.stringify(game?.ctx.anchors.toJSON(), null, 1)); hud.set({}); }}>Log anchors</button>
          </div>
        </div>
      )}
    </div>
  );
}
