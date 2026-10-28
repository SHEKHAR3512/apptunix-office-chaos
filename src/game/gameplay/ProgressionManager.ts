import type { ChatMessage, FlagValue } from "../persistence/SaveSchema";
import type { Reward } from "../missions/MissionTypes";
import type { TicketStatus } from "./GameEventBus";

export interface Ticket { id: string; title: string; priority: "P1" | "P2" | "P3"; status: TicketStatus; description: string; criteria: string[]; reporter: string }

/** Fictional tickets used in Chapter 1. */
export const TICKETS: Record<string, Omit<Ticket, "status">> = {
  "APX-301": {
    id: "APX-301", title: "Cart counter not updating on “Add to cart”", priority: "P1", reporter: "Tushar",
    description: "On the product page, clicking “Add to cart” does nothing visible. The badge stays at (0) even though the click handler runs. Reported by the (fictional) FoodDash client.",
    criteria: ["Counter increments on every click", "No mutation of previous state", "Works on mobile (360px) and desktop", "All tests in cart suite pass"],
  },
};

/**
 * Lightweight progression: relationship values, unlocks, tickets, chat history.
 * Relationships live in the dialogue flag map as `rel.<name>` so dialogue conditions read them
 * directly. No RPG stats — just enough to make later lines react to earlier choices.
 */
export class ProgressionManager {
  readonly unlocked = new Set<string>();
  readonly tickets = new Map<string, TicketStatus>();
  readonly chat: ChatMessage[] = [];

  constructor(readonly flags: Map<string, FlagValue>) {}

  rel(name: string): number { const v = this.flags.get(`rel.${name}`); return typeof v === "number" ? v : 0; }
  addRel(name: string, d: number): void { this.flags.set(`rel.${name}`, this.rel(name) + d); }

  relationships(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.flags) if (k.startsWith("rel.") && typeof v === "number") out[k.slice(4)] = v;
    return out;
  }

  applyReward(r: Reward): void {
    for (const u of r.unlock ?? []) this.unlocked.add(u);
    for (const [k, d] of Object.entries(r.rel ?? {})) this.addRel(k, d);
    for (const [k, v] of Object.entries(r.flags ?? {})) this.flags.set(k, v);
  }

  setTicket(id: string, s: TicketStatus): boolean {
    if (this.tickets.get(id) === s) return false;
    this.tickets.set(id, s);
    return true;
  }

  ticketList(): Ticket[] { return [...this.tickets].map(([id, status]) => ({ ...TICKETS[id], status })); }

  addChat(m: ChatMessage): void { this.chat.push(m); if (this.chat.length > 60) this.chat.shift(); }
  get unread(): number { return this.chat.filter((m) => !m.read).length; }
  markRead(): void { for (const m of this.chat) m.read = true; }
}
