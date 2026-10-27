import { useEffect, useState } from "react";
import { useHud } from "../core/Store";

export function LoadingScreen() {
  const loading = useHud("loading");
  const label = useHud("loadingLabel");
  const ready = useHud("ready");
  const error = useHud("error");
  const [gone, setGone] = useState(false);
  useEffect(() => { if (ready) { const t = setTimeout(() => setGone(true), 900); return () => clearTimeout(t); } }, [ready]);
  if (gone) return null;
  return (
    <div className={`loading ${ready ? "fade" : ""}`}>
      <div className="loading-card">
        <div className="logo-badge"><span>A</span></div>
        <h1>APPTUNIX <em>Office Chaos</em></h1>
        <p className="sub">Phase 2 · Characters &amp; living office</p>
        <div className="bar"><div style={{ width: `${Math.round(loading * 100)}%` }} /></div>
        <p className="label">{error ? `Something went wrong: ${error}` : label}</p>
        <div className="skyline">
          {Array.from({ length: 6 }).map((_, i) => <i key={i} style={{ height: `${30 + ((i * 37) % 50)}%`, animationDelay: `${i * 0.12}s` }} />)}
        </div>
      </div>
    </div>
  );
}
