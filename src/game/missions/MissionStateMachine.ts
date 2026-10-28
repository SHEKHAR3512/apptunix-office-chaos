import type { MissionState } from "./MissionTypes";

/** Allowed mission transitions. Anything else is rejected (and reported) — never silently applied. */
export const TRANSITIONS: Record<MissionState, MissionState[]> = {
  LOCKED: ["AVAILABLE"],
  AVAILABLE: ["ACTIVE", "LOCKED"],
  ACTIVE: ["PAUSED", "COMPLETED", "FAILED"],
  PAUSED: ["ACTIVE"],
  COMPLETED: [],
  FAILED: ["AVAILABLE"],
};

export function canTransition(from: MissionState, to: MissionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(readonly mission: string, readonly from: MissionState, readonly to: MissionState) {
    super(`Mission ${mission}: invalid transition ${from} → ${to}`);
  }
}
