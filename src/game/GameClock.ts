/**
 * In-game office clock. Minutes since midnight; by default 1 real second = 1 game minute,
 * so the 09:30–18:30 workday plays out in about nine real minutes. Purely logical (no Babylon).
 */
export class GameClock {
  minutes: number;
  scale = 1;           // game minutes per real second
  paused = false;
  day = 1;
  private listeners: ((m: number) => void)[] = [];

  constructor(start = "09:25") { this.minutes = parseTime(start); }

  tick(dt: number): void {
    if (this.paused) return;
    const before = Math.floor(this.minutes);
    this.minutes += dt * this.scale;
    const crossed = Math.floor(this.minutes) - before;
    if (this.minutes >= 24 * 60) { this.minutes -= 24 * 60; this.day++; }
    // one notification per minute crossed (capped so a huge time-skip can't stall a frame)
    for (let i = 0; i < Math.min(crossed, 120); i++) this.listeners.forEach((l) => l(this.minutes));
  }

  set(time: string | number): void { this.minutes = typeof time === "number" ? time : parseTime(time); this.listeners.forEach((l) => l(this.minutes)); }
  onMinute(fn: (m: number) => void): void { this.listeners.push(fn); }
  get label(): string { return formatTime(this.minutes); }
}

export function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
