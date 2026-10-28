import { useHud } from "../../core/Store";
import type { AppId } from "../../game/gameplay/GameEventBus";
import { usePlay } from "../../game/gameplay/PlayState";
import { getGame } from "../App";
import { BrowserPreview } from "./BrowserPreview";
import { CodeEditor } from "./CodeEditor";
import { TaskBoard } from "./TaskBoard";
import { TeamChat } from "./TeamChat";
import { TerminalSimulator } from "./TerminalSimulator";

const APPS: [AppId, string, string][] = [["tasks", "✅", "Task Board"], ["editor", "⌨️", "Code Editor"], ["chat", "💬", "Team Chat"], ["terminal", "▤", "Terminal"], ["browser", "🌐", "Preview"]];

/** DRAGON's workstation desktop (opened by sitting at the desk and using the computer). */
export function Desktop() {
  const state = useHud("computer");
  const clock = useHud("clock");
  const app = usePlay("app");
  const unread = usePlay("unread");
  const mission = usePlay("mission");
  if (!state) return null;
  const g = getGame()!;
  const close = () => g.life.closeComputer();
  const cur = mission?.objectives.find((o) => o.current);
  return (
    <div className="pc">
      <div className="pc-screen">
        {state === "booting" ? (
          <div className="pc-boot"><div className="logo-badge"><span>A</span></div><div className="pc-bar"><div /></div><p>Starting ApptuOS…</p></div>
        ) : (
          <>
            <div className="pc-top"><b>ApptuOS</b><span>DRAGON · React</span>{cur && <span className="pc-obj">🎯 {cur.text}</span>}<span className="pc-clock">{clock}</span><button onClick={close}>Log out (Esc)</button></div>
            <div className="pc-body">
              <nav className="pc-dock">
                {APPS.map(([k, i, n]) => (
                  <button key={k} className={app === k ? "on" : ""} onClick={() => g.story.computer.openApp(k)} data-app={k}>
                    <span>{i}</span>{n}{k === "chat" && unread > 0 && <em className="badge">{unread}</em>}
                  </button>
                ))}
              </nav>
              <section className="pc-win">
                {app === "tasks" && <TaskBoard />}
                {app === "editor" && <CodeEditor />}
                {app === "chat" && <TeamChat />}
                {app === "terminal" && <DeskTerminal />}
                {app === "browser" && <BrowserPreview />}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** At the desk the terminal can reach the pipeline once Mission 6 is underway. */
function DeskTerminal() {
  const g = getGame()!;
  if (g.story.missions.state("m6_ship") === "ACTIVE" || g.story.computer.puzzles.state("deploy_pipeline").solved) return <TerminalSimulator puzzle="deploy_pipeline" />;
  return (
    <div className="term"><div className="term-top"><span className="dots"><i /><i /><i /></span> zsh · apx-checkout</div>
      <div className="term-body"><div>Last login: today on ttys001</div><div className="ok">✓ dev server running on http://localhost:3000</div><div>Tip: run the test suite from the editor (▶ Run tests).</div><div>The deploy pipeline is managed from the DevOps console.</div></div>
    </div>
  );
}
