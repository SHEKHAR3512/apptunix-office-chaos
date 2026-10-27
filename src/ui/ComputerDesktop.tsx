import { useState } from "react";
import { useHud } from "../core/Store";
import { getGame } from "./App";

const CODE = `import { useCart } from "../hooks/useCart";

export function CheckoutButton() {
  const { items, total, pay } = useCart();
  const disabled = items.length === 0;

  return (
    <button
      className="btn-primary"
      disabled={disabled}
      onClick={() => pay({ method: "upi" })}
    >
      Pay ₹{total.toFixed(2)}
    </button>
  );
}`;

const TASKS = [
  { id: "APX-214", t: "Fix payment screen crash on Android", s: "In progress", c: "#d9675e" },
  { id: "APX-209", t: "Checkout button cut off on iPhone SE", s: "To do", c: "#e3a548" },
  { id: "APX-197", t: "Migrate cart hook to React Query", s: "Review", c: "#4fb3c8" },
];
const CHAT = [
  { who: "Tushar", m: "Standup at 11 sharp, team 🙏", c: "#2f5fae" },
  { who: "Mohit", m: "PR #482 ready for review", c: "#d9675e" },
  { who: "Rockey", m: "chai? ☕", c: "#c0392b" },
  { who: "Shruti (QA)", m: "Logged APX-209 with screenshots", c: "#d98aa2" },
];

type App = "code" | "tasks" | "chat" | "browser";

/** Small fictional desktop for DRAGON's workstation (full coding mini-games arrive in Phase 3). */
export function ComputerDesktop() {
  const state = useHud("computer");
  const clock = useHud("clock");
  const [app, setApp] = useState<App>("code");
  if (!state) return null;
  const close = () => getGame()?.life.closeComputer();
  return (
    <div className="pc">
      <div className="pc-screen">
        {state === "booting" ? (
          <div className="pc-boot"><div className="logo-badge"><span>A</span></div><div className="pc-bar"><div /></div><p>Starting ApptuOS…</p></div>
        ) : (
          <>
            <div className="pc-top"><b>ApptuOS</b><span>DRAGON · React</span><span className="pc-clock">{clock}</span><button onClick={close}>Log out (Esc)</button></div>
            <div className="pc-body">
              <nav className="pc-dock">
                {([["code", "⌨️", "Editor"], ["tasks", "✅", "Tasks"], ["chat", "💬", "Team chat"], ["browser", "🌐", "Preview"]] as const).map(([k, i, n]) => (
                  <button key={k} className={app === k ? "on" : ""} onClick={() => setApp(k)} title={n}><span>{i}</span>{n}</button>
                ))}
              </nav>
              <section className="pc-win">
                {app === "code" && <><div className="pc-tab">CheckoutButton.tsx</div><pre className="pc-code">{CODE}</pre></>}
                {app === "tasks" && <div className="pc-tasks"><h3>Sprint 42 · Assigned to you</h3>{TASKS.map((t) => <div key={t.id} className="pc-task"><span className="pc-chip" style={{ background: t.c }}>{t.s}</span><b>{t.id}</b> {t.t}</div>)}</div>}
                {app === "chat" && <div className="pc-chat"><h3># react-team</h3>{CHAT.map((c, i) => <div key={i} className="pc-msg"><span className="pc-av" style={{ background: c.c }}>{c.who[0]}</span><div><b>{c.who}</b><p>{c.m}</p></div></div>)}</div>}
                {app === "browser" && <div className="pc-browser"><div className="pc-url">localhost:3000/checkout</div><div className="pc-app"><h2>FoodDash</h2><div className="pc-card" /><div className="pc-card" /><button className="pc-pay">Pay ₹749.00</button></div></div>}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
