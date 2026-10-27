import { useEffect, useState } from "react";
import { useHud } from "../../core/Store";
import { getGame } from "../App";
import { DialogueChoices } from "./DialogueChoices";

const DEPT_COLOR: Record<string, string> = { react: "#4fb3c8", angular: "#d9675e", node: "#79b06a", devops: "#e3a548", design: "#a08ac2", qa: "#d98aa2", hr: "#e0b35a", reception: "#f08a3c", support: "#8a9bb5", security: "#5b6b86" };

/** Bottom-of-screen conversation box: speaker tag, typewriter text, numbered replies. */
export function DialoguePanel() {
  const d = useHud("dialogue");
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!d) return;
    const id = setInterval(() => setShown((n) => (n >= d.text.length ? n : n + 2)), 16);
    return () => clearInterval(id);
  }, [d?.text]);
  if (!d) return null;
  const done = shown >= d.text.length;
  const color = d.isPlayer ? "#f08a3c" : DEPT_COLOR[d.dept] ?? "#4fb3c8";
  return (
    <div className="dlg" onClick={() => { if (!done) setShown(d.text.length); else if (!d.choices.length) getGame()?.life.advanceDialogue(); }}>
      <div className="dlg-name" style={{ background: color }}>{d.speaker}</div>
      <p className="dlg-text">{d.text.slice(0, shown)}<span className="dlg-caret">{done ? "" : "▍"}</span></p>
      {done && d.choices.length > 0 && <DialogueChoices choices={d.choices} />}
      {done && d.choices.length === 0 && <div className="dlg-next">E / click to continue ▸</div>}
    </div>
  );
}
