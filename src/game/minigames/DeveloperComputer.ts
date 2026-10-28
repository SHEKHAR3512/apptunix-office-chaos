import { PUZZLES } from "../../data/puzzles/chapter1";
import type { AppId, GameEventBus, TicketStatus } from "../gameplay/GameEventBus";
import { play } from "../gameplay/PlayState";
import type { ProgressionManager } from "../gameplay/ProgressionManager";
import { PuzzleEngine } from "./PuzzleEngine";
import { parseCommand } from "./TerminalParser";

/** Files shown in the editor's explorer; puzzle-backed files show live puzzle code. */
export const PROJECT_FILES: { path: string; puzzle?: string[]; note?: string }[] = [
  { path: "src/components/AddToCart.tsx", puzzle: ["react_cart_find", "react_cart_fix"] },
  { path: "src/components/ProductRow.module.css", puzzle: ["qa_layout_fix"] },
  { path: "src/hooks/useCart.ts", note: "export function useCart() {\n  // TODO(mohit): retries\n  return useContext(CartContext);\n}" },
  { path: "src/App.tsx", note: "export default function App() {\n  return <Shop />;\n}" },
];

/**
 * Session behind DRAGON's workstation: tickets, apps, files, puzzles. The React desktop calls
 * these methods; each one publishes typed events so missions advance only through real use.
 */
export class DeveloperComputer {
  readonly puzzles: PuzzleEngine;

  constructor(private readonly bus: GameEventBus, private readonly prog: ProgressionManager, private readonly sound: (s: string) => void) {
    this.puzzles = new PuzzleEngine(PUZZLES, {
      solved: (puzzle, attempts, hints) => { bus.emit("PUZZLE_SOLVED", { puzzle, attempts, hints }); if (puzzle.startsWith("react_")) bus.emit("CODE_CHALLENGE_SOLVED", { puzzle }); this.sound("objective"); },
      failed: (puzzle) => { bus.emit("PUZZLE_ATTEMPT_FAILED", { puzzle }); this.sound("bug"); },
      testsPassed: (suite) => { bus.emit("BUILD_TESTS_PASSED", { suite }); this.sound("approve"); },
      testsFailed: (suite) => bus.emit("BUILD_TESTS_FAILED", { suite }),
      deployFailed: (env, reason) => { bus.emit("DEPLOYMENT_FAILED", { env, reason }); this.sound("bug"); },
      deployed: (env) => bus.emit("DEPLOYMENT_COMPLETED", { env }),
      reproduced: (bug) => bus.emit("QA_BUG_REPRODUCED", { bug }),
    });
  }

  private bump(): void { play.set({ rev: play.get().rev + 1 }); }

  openApp(app: AppId): void {
    play.set({ app });
    if (app === "chat") { this.prog.markRead(); play.set({ chat: [...this.prog.chat], unread: 0 }); }
    this.bus.emit("APP_OPENED", { app });
    this.sound("typing");
  }

  viewTicket(id: string): void {
    this.bus.emit("TICKET_VIEWED", { ticket: id });
    if (this.prog.tickets.get(id) === "todo" || this.prog.tickets.get(id) === "reopened") this.setTicket(id, "in_progress");
  }

  setTicket(id: string, status: TicketStatus): void {
    if (!this.prog.setTicket(id, status)) return;
    play.set({ tickets: this.prog.ticketList() });
    this.bus.emit("TICKET_STATUS_CHANGED", { ticket: id, status });
  }

  /** "Ready for QA" is only allowed once the relevant suite is green (acceptance criteria). */
  canMarkReady(id: string): boolean {
    if (id !== "APX-301") return false;
    const reopened = this.puzzles.state("qa_reproduce").solved;
    const suite = reopened ? this.puzzles.state("qa_layout_fix") : this.puzzles.state("react_cart_fix");
    return suite.testsPassed && (this.prog.tickets.get(id) === "in_progress" || this.prog.tickets.get(id) === "reopened");
  }

  openFile(path: string): void { this.bus.emit("FILE_OPENED", { file: path }); this.bump(); }

  pickLine(puzzle: string, line: number): void { this.bus.emit("PUZZLE_OPENED", { puzzle }); this.puzzles.pickLine(puzzle, line); this.bump(); }
  select(puzzle: string, option: string): void { this.puzzles.select(puzzle, option); this.bump(); }
  apply(puzzle: string): void { this.puzzles.apply(puzzle); this.sound("typing"); this.bump(); }
  runTests(puzzle: string): void { this.sound("terminal"); this.puzzles.runTests(puzzle); this.bump(); }
  hint(puzzle: string): string | null { const h = this.puzzles.hint(puzzle); this.bump(); return h; }
  retry(puzzle: string): void { this.puzzles.retry(puzzle); this.bump(); }

  /** Terminal input → allowlisted action only. */
  terminal(puzzle: string, input: string): void {
    const s = this.puzzles.state(puzzle);
    s.log.push(`$ ${input}`);
    const r = parseCommand(input);
    if (!r.ok) { if (r.message) s.log.push(r.message, ""); }
    else if (r.action === "clear") s.log.length = 0;
    else this.puzzles.runAction(puzzle, r.action);
    this.sound("terminal");
    this.bump();
  }

  setWidth(puzzle: string, w: number): void { this.puzzles.setWidth(puzzle, w); this.bump(); }
  report(puzzle: string): void { this.puzzles.report(puzzle); this.bump(); }
}
