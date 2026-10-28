import { useState } from "react";
import { usePlay } from "../../game/gameplay/PlayState";
import { getGame } from "../App";

const ROW_CSS = (spec: Record<string, unknown>): React.CSSProperties => ({
  display: "flex", flexWrap: spec.wrap ? "wrap" : "nowrap", width: spec.fixed ? 1200 : undefined, maxWidth: spec.fixed ? undefined : "100%",
  overflow: spec.clip ? "hidden" : "visible", zoom: (spec.zoom as number) ?? 1,
});

/** Mock product row rendered with predefined CSS (no user CSS is ever injected). */
export function ProductRow({ spec, width, scale }: { spec: Record<string, unknown>; width: number; scale: number }) {
  return (
    <div className="pv-frame" style={{ width: width * scale, height: 220 * scale }}>
      <div className="pv-vp" style={{ width, transform: `scale(${scale})` }}>
        <div className="pv-nav">FoodDash</div>
        <div style={ROW_CSS(spec)} className="pv-row">
          {["Masala Dosa", "Paneer Roll", "Cold Coffee", "Gulab Jamun"].map((n, i) => (
            <div key={n} className="pv-card"><div className="pv-img" style={{ background: ["#f6b68f", "#8fc7c2", "#f3d27a", "#c4b0e0"][i] }} /><b>{n}</b><span>₹{[149, 119, 99, 79][i]}</span></div>
          ))}
        </div>
      </div>
      {!!spec.fixed && !spec.clip && width < 1200 && <div className="pv-overflow" style={{ left: width * scale }}>overflow →</div>}
    </div>
  );
}

export function BrowserPreview() {
  usePlay("rev");
  const pe = getGame()!.story.computer.puzzles;
  const [count, setCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const cart = pe.currentPreview("react_cart_fix").cart as string;
  const layoutOrig = (pe.def("qa_layout_fix") as { originalPreview: Record<string, unknown> }).originalPreview;
  const layoutNow = pe.currentPreview("qa_layout_fix");
  const layoutApplied = !!pe.state("qa_layout_fix").applied;
  return (
    <div className="pc-browser">
      <div className="pc-url">localhost:3000/product/masala-dosa</div>
      <div className="pv">
        <div className="pv-shop">
          <div className="pv-dish" />
          <div>
            <h2>Masala Dosa</h2><p>₹149 · crispy, golden, legendary.</p>
            <button className="pc-pay" onClick={() => { setClicks(clicks + 1); if (cart === "works") setCount(count + 1); }} data-add-to-cart>
              Add to cart ({count})
            </button>
            {cart === "crash" && clicks > 0 && <p className="pv-err">💥 ReferenceError: forceUpdate is not defined</p>}
            {cart === "stuck" && clicks > 0 && <p className="pv-note">Clicked {clicks}× · counter still {count} 🤔</p>}
            {cart === "works" && clicks > 0 && <p className="pv-ok">Counter updates ✓</p>}
          </div>
        </div>
        <h4>Product row · before / after</h4>
        <div className="pv-cmp">
          <div><small>Before · 360px</small><ProductRow spec={layoutOrig} width={360} scale={0.55} /></div>
          <div><small>{layoutApplied ? "After" : "Current"} · 360px</small><ProductRow spec={layoutNow} width={360} scale={0.55} /></div>
          <div><small>{layoutApplied ? "After" : "Current"} · 1280px</small><ProductRow spec={layoutNow} width={1280} scale={0.2} /></div>
        </div>
      </div>
    </div>
  );
}
