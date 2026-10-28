import { QA_SIDE_SMALL } from "./side";
import type { FindBugDef, FixComponentDef, PipelineDef, PuzzleDef, ReproduceDef } from "../../game/minigames/PuzzleEngine";

/** Chapter 1 puzzles. All code, systems and incidents are fictional. */

const CART_BUGGY = [
  "import { useState } from \"react\";",
  "",
  "export function AddToCart({ product }) {",
  "  const [items, setItems] = useState([]);",
  "",
  "  function handleAdd() {",
  "    items.push(product);",
  "    setItems(items);",
  "  }",
  "",
  "  return (",
  "    <button className=\"btn-primary\" onClick={handleAdd}>",
  "      Add to cart ({items.length})",
  "    </button>",
  "  );",
  "}",
];

const replaceLines = (src: string[], from: number, count: number, lines: string[]) => [...src.slice(0, from), ...lines, ...src.slice(from + count)];

export const REACT_FIND: FindBugDef = {
  kind: "findBug", id: "react_cart_find", title: "Find the bug — AddToCart.tsx", file: "src/components/AddToCart.tsx",
  instructions: "Clicking “Add to cart” never updates the counter. Click the line where the state is changed incorrectly.",
  hints: [
    "React re-renders when you give setState a NEW value. Is the array here new?",
    "items.push() changes the same array React already has.",
    "Line 7 mutates the existing array in place, so line 8 passes the same reference back.",
  ],
  code: CART_BUGGY,
  buggyLines: [7],
  explanation: "Found it: items.push() mutates the existing array, so setItems(items) hands React the same reference and nothing re-renders.",
  wrongFeedback: {
    4: "useState([]) is fine. The state starts as an empty array.",
    8: "Close! setItems is called, but look at WHAT it receives on the line above.",
    12: "The click handler is wired correctly. The problem is inside handleAdd.",
    13: "Rendering items.length is fine once the state actually changes.",
  },
};

const cartTests = (pass: boolean, mutate = false) => [
  { name: "renders “Add to cart (0)” initially", pass: true },
  { name: "increments the counter on click", pass, output: pass ? undefined : "Expected “Add to cart (1)”, received “Add to cart (0)”" },
  { name: "does not mutate previous state", pass: pass && !mutate, output: pass && !mutate ? undefined : "Previous state array was modified" },
];

export const REACT_FIX: FixComponentDef = {
  kind: "fixComponent", id: "react_cart_fix", title: "Fix the component — AddToCart.tsx", file: "src/components/AddToCart.tsx", suite: "cart",
  instructions: "Pick the fix that makes React re-render correctly, apply it, then run the tests.",
  hints: ["React compares state by reference. You need a brand-new array.", "Spread syntax [...items, product] creates a new array."],
  original: CART_BUGGY,
  originalPreview: { cart: "stuck" },
  originalTests: cartTests(false, true),
  options: [
    {
      id: "spread", label: "setItems([...items, product])", correct: true, feedback: "New array, same items plus one. React sees a new reference and re-renders.",
      code: replaceLines(CART_BUGGY, 6, 2, ["    setItems([...items, product]);"]), tests: cartTests(true), preview: { cart: "works" },
    },
    {
      id: "functional", label: "setItems(prev => [...prev, product])", correct: true, feedback: "The functional update is even safer when clicks come fast. Nice.",
      code: replaceLines(CART_BUGGY, 6, 2, ["    setItems((prev) => [...prev, product]);"]), tests: cartTests(true), preview: { cart: "works" },
    },
    {
      id: "reassign", label: "items = [...items, product]", correct: false, feedback: "Reassigning a local variable doesn't tell React anything; setItems is never called.",
      code: replaceLines(CART_BUGGY, 6, 2, ["    items = [...items, product]; // ❌ const + no setState"]), tests: cartTests(false), preview: { cart: "stuck" },
    },
    {
      id: "forceupdate", label: "items.push(product); forceUpdate()", correct: false, feedback: "Forcing a render hides the mutation bug. QA will find stale data elsewhere.",
      code: replaceLines(CART_BUGGY, 6, 2, ["    items.push(product);", "    forceUpdate(); // ❌ not a React hook"]), tests: [{ name: "renders “Add to cart (0)” initially", pass: true }, { name: "increments the counter on click", pass: false, output: "ReferenceError: forceUpdate is not defined" }, { name: "does not mutate previous state", pass: false, output: "Previous state array was modified" }], preview: { cart: "crash" },
    },
  ],
};

const GRID = (css: string[]) => [
  "/* ProductRow.module.css */",
  ".row {",
  ...css.map((l) => `  ${l}`),
  "}",
  "",
  ".card {",
  "  flex: 0 0 220px;",
  "  margin: 8px;",
  "}",
];

const layoutTests = (mobile: boolean, desktop = true, content = true) => [
  { name: "desktop 1280px: 4 cards in one row", pass: desktop },
  { name: "mobile 360px: no horizontal overflow", pass: mobile, output: mobile ? undefined : "Row is 1200px wide inside a 360px viewport" },
  { name: "all product cards remain visible", pass: content, output: content ? undefined : "2 of 4 cards are clipped" },
];

export const QA_LAYOUT: FixComponentDef = {
  kind: "fixComponent", id: "qa_layout_fix", title: "Fix the layout — ProductRow.module.css", file: "src/components/ProductRow.module.css", suite: "cart_mobile",
  instructions: "The product row overflows on phones. Choose the CSS fix, apply it and check the previews at both widths.",
  hints: ["A fixed width of 1200px can't fit a 360px screen.", "Let the row shrink (max-width: 100%) and let cards wrap onto new lines."],
  original: GRID(["display: flex;", "width: 1200px;"]),
  originalPreview: { css: "display:flex;width:1200px", wrap: false, fixed: true },
  originalTests: layoutTests(false),
  options: [
    { id: "wrap", label: "max-width: 100%; flex-wrap: wrap;", correct: true, feedback: "The row fits any screen and cards flow onto new lines.", code: GRID(["display: flex;", "max-width: 100%;", "flex-wrap: wrap;"]), tests: layoutTests(true), preview: { css: "display:flex;max-width:100%;flex-wrap:wrap", wrap: true, fixed: false } },
    { id: "hidden", label: "overflow: hidden;", correct: false, feedback: "The overflow is gone, but so are half the products. QA won't love that.", code: GRID(["display: flex;", "width: 1200px;", "overflow: hidden;"]), tests: layoutTests(true, true, false), preview: { css: "display:flex;width:1200px;overflow:hidden", wrap: false, fixed: true, clip: true } },
    { id: "zoom", label: "zoom: 0.3;", correct: false, feedback: "Everything fits… at microscope size. Tap targets fail accessibility.", code: GRID(["display: flex;", "width: 1200px;", "zoom: 0.3;"]), tests: [...layoutTests(true, false), { name: "tap targets ≥ 44px", pass: false, output: "Buttons are 13px tall" }], preview: { css: "display:flex;width:1200px", wrap: false, fixed: true, zoom: 0.3 } },
    { id: "important", label: "width: 1200px !important;", correct: false, feedback: "That makes the fixed width even harder to override. The bug gets worse.", code: GRID(["display: flex;", "width: 1200px !important;"]), tests: layoutTests(false), preview: { css: "display:flex;width:1200px", wrap: false, fixed: true } },
  ],
};

export const QA_REPRO: ReproduceDef = {
  kind: "reproduce", id: "qa_reproduce", bug: "APX-301-mobile", title: "Reproduce the bug — QA test device",
  instructions: "Shruti says checkout breaks “on her phone”. Resize the test device until the bug appears, then report it.",
  hints: ["Typical phones are 360–414px wide.", "Drag the width below 400px."],
  minWidth: 320, maxWidth: 1280, startWidth: 1280, breaksBelow: 400,
};

export const DEPLOY: PipelineDef = {
  kind: "pipeline", id: "deploy_pipeline", title: "DevOps console — apx-checkout · production", env: "production",
  instructions: "The production deploy failed. Use the console to find out why, fix it safely and deploy again.",
  hints: ["Start with `logs` to see why the last run failed.", "Run `env check` to compare production with .env.example.", "`env pull --from vault` restores missing variables safely. Then `deploy`."],
  failureLog: [
    "▶ pipeline run #482 · apx-checkout → production",
    "  ✓ Building project…            (41s)",
    "  ✓ Checking environment…",
    "  ✓ Running tests…               148 passed",
    "  ✗ Starting service…",
    "ERROR: Missing environment configuration: PAYMENT_API_URL",
    "Deployment failed. Production is still on build #481 (no customer impact).",
  ],
  successLog: [
    "▶ pipeline run #483 · apx-checkout → production",
    "  ✓ Building project…            (39s)",
    "  ✓ Checking environment…        14/14 variables",
    "  ✓ Running tests…               151 passed",
    "  ✓ Starting service…            healthy",
    "  ✓ Smoke tests…                 checkout OK",
    "🚀 DEPLOYMENT SUCCESSFUL — build #483 is live (fictional).",
  ],
  files: {
    ".env.example": ["NODE_ENV=production", "API_BASE_URL=", "PAYMENT_API_URL=", "SENTRY_DSN=", "FEATURE_NEW_CART=true"],
    "deploy.yml": ["pipeline: apx-checkout", "stages: [build, env-check, test, start, smoke]", "env: production", "secrets: vault://apx/checkout"],
    "README.md": ["apx-checkout (fictional)", "Secrets live in the vault. Never commit .env files!"],
  },
  actions: [
    { id: "help", label: "help", effect: "noop", output: ["Available commands:", "  status · logs · ls · cat <file> · env check · env pull --from vault", "  npm test · deploy · git status · clear"] },
    { id: "status", label: "status", effect: "noop", output: ["apx-checkout · production · last run #482 ✗ FAILED (start)", "current live build: #481"] },
    { id: "logs", label: "logs", effect: "info", needs: "identify", output: ["[start] reading config…", "[start] ERROR: Missing environment configuration: PAYMENT_API_URL", "[start] exit 1"] },
    { id: "ls", label: "ls", effect: "noop", output: [".env.example  deploy.yml  README.md  src/  tests/"] },
    { id: "cat:.env.example", label: "cat .env.example", effect: "noop", output: ["NODE_ENV=production", "API_BASE_URL=", "PAYMENT_API_URL=", "SENTRY_DSN=", "FEATURE_NEW_CART=true"] },
    { id: "cat:deploy.yml", label: "cat deploy.yml", effect: "noop", output: ["pipeline: apx-checkout", "stages: [build, env-check, test, start, smoke]", "secrets: vault://apx/checkout"] },
    { id: "cat:readme.md", label: "cat README.md", effect: "noop", output: ["apx-checkout (fictional)", "Secrets live in the vault. Never commit .env files!"] },
    { id: "env-check", label: "env check", effect: "info", needs: "identify", output: ["Comparing production with .env.example…", "  ✓ NODE_ENV", "  ✓ API_BASE_URL", "  ✗ PAYMENT_API_URL   (missing)", "  ✓ SENTRY_DSN", "  ✓ FEATURE_NEW_CART"] },
    { id: "env-pull", label: "env pull --from vault", effect: "fix", output: ["Pulling production secrets from vault://apx/checkout…", "  + PAYMENT_API_URL  ✓ restored", "Environment complete: 14/14 variables."] },
    { id: "test", label: "npm test", effect: "test", output: ["Test Suites: 23 passed", "Tests: 151 passed"] },
    { id: "deploy", label: "deploy", effect: "deploy", output: [] },
    { id: "skip-tests", label: "deploy --skip-tests", effect: "bad", output: ["🙅 Blocked by policy: production deploys can't skip tests.", "(Tushar has been notified. Just kidding. Mostly.)"] },
    { id: "rm-node-modules", label: "rm -rf node_modules", effect: "bad", output: ["Deleted 48,213 files. Reinstalled 48,213 files.", "Nothing changed, but it felt productive."] },
    { id: "git-status", label: "git status", effect: "noop", output: ["On branch release/apx-301", "nothing to commit, working tree clean"] },
    { id: "chai", label: "chai", effect: "noop", output: ["☕ brewing… (Rockey approves)"] },
  ],
};

export const PUZZLES: PuzzleDef[] = [REACT_FIND, REACT_FIX, QA_REPRO, QA_LAYOUT, DEPLOY, QA_SIDE_SMALL];
