import { parseTime, type GameClock } from "../GameClock";

/**
 * Narrative time. Missions declare a window [at, until]: the clock jumps forward to `at`
 * (never backwards) and is held at `until`, so exploring can never push a story beat past
 * the NPCs' working hours. Free roam (no window) runs the normal schedule clock.
 */
export class OfficeEventScheduler {
  private window: { start: number; end: number } | null = null;
  private timed: { at: number; fn: () => void; done: boolean }[] = [];

  constructor(private readonly clock: GameClock) {}

  setWindow(at: string, until: string): void {
    const start = parseTime(at), end = parseTime(until);
    this.window = { start, end };
    if (this.clock.minutes < start) this.clock.set(start);
  }

  clearWindow(): void { this.window = null; }

  /** Run once when the clock passes a time (e.g. end-of-day announcement). */
  at(time: string, fn: () => void): void { this.timed.push({ at: parseTime(time), fn, done: false }); }

  update(): void {
    const w = this.window;
    if (w && this.clock.minutes > w.end) this.clock.minutes = w.end;
    for (const t of this.timed) if (!t.done && this.clock.minutes >= t.at) { t.done = true; t.fn(); }
  }
}
