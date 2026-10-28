import { usePlay } from "../../game/gameplay/PlayState";

const COL: Record<string, string> = { Tushar: "#2f5fae", Mohit: "#d9675e", Rockey: "#c0392b", Karan: "#5b6b86", Vibhu: "#e3a548", "Shruti (QA)": "#d98aa2", "Vikram (DevOps)": "#e3a548" };

export function TeamChat() {
  const chat = usePlay("chat");
  return (
    <div className="pc-chat">
      <h3># react-team</h3>
      {chat.length === 0 && <p className="tb-empty">Quiet morning…</p>}
      {chat.map((m, i) => (
        <div key={i} className="pc-msg">
          <span className="pc-av" style={{ background: COL[m.from] ?? "#5b6b86" }}>{m.from[0]}</span>
          <div><b>{m.from}</b> <small>{m.time}</small><p>{m.text}</p></div>
        </div>
      ))}
    </div>
  );
}
