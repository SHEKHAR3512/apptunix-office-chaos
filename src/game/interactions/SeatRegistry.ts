/** Seat reservations shared by the player and every NPC: one occupant per chair. Babylon-free. */
export interface Seat { id: string; x: number; y: number; z: number; yaw: number; zone: string; kind: "desk" | "meeting" | "break" | "sofa"; exitX?: number; exitZ?: number }

export class SeatRegistry {
  private seats = new Map<string, Seat>();
  private occupant = new Map<string, string>();

  add(seat: Seat): void { this.seats.set(seat.id, seat); }
  get(id: string): Seat | undefined { return this.seats.get(id); }
  all(): Seat[] { return [...this.seats.values()]; }
  inZone(zone: string, kind?: Seat["kind"]): Seat[] { return this.all().filter((s) => s.zone === zone && (!kind || s.kind === kind)); }

  isFree(id: string): boolean { return !this.occupant.has(id); }
  occupantOf(id: string): string | undefined { return this.occupant.get(id); }

  /** Reserve a seat. Returns false if someone else holds it. Re-reserving your own seat is fine. */
  reserve(id: string, who: string): boolean {
    const cur = this.occupant.get(id);
    if (cur && cur !== who) return false;
    this.releaseAll(who, id);
    this.occupant.set(id, who);
    return true;
  }

  release(id: string, who: string): void { if (this.occupant.get(id) === who) this.occupant.delete(id); }

  /** Release every seat held by `who` except `keep`. */
  releaseAll(who: string, keep?: string): void {
    for (const [k, v] of this.occupant) if (v === who && k !== keep) this.occupant.delete(k);
  }

  seatOf(who: string): string | undefined {
    for (const [k, v] of this.occupant) if (v === who) return k;
    return undefined;
  }

  /** First free seat from a list of candidates (in order). */
  firstFree(ids: string[]): string | undefined { return ids.find((i) => this.isFree(i) && this.seats.has(i)); }
}
