/**
 * Daily schedule templates (gameplay examples — NOT claims about real Apptunix hours).
 * Each block runs from `at` until the next block. Per-NPC jitter (±minutes) is applied by
 * NPCSchedule so the office doesn't move in lock-step.
 */
export type Activity =
  | { kind: "work" }
  | { kind: "arrive" }
  | { kind: "standup"; spot: string }
  | { kind: "meeting"; room: "cr1" | "cr2" | "cr3" }
  | { kind: "break"; spot?: "water" | "coffee" | "tables" | "bar" | "lounge" }
  | { kind: "lunch" }
  | { kind: "chat" }
  | { kind: "post" }          // stationary role (reception, security)
  | { kind: "patrol" }        // support staff walking a loop
  | { kind: "leave" };

export interface ScheduleBlock { at: string; activity: Activity }
export interface ScheduleTemplate { id: string; blocks: ScheduleBlock[] }

export const SCHEDULES: Record<string, ScheduleTemplate> = {
  dev: { id: "dev", blocks: [
    { at: "09:20", activity: { kind: "arrive" } },
    { at: "09:35", activity: { kind: "work" } },
    { at: "11:00", activity: { kind: "standup", spot: "dept" } },
    { at: "11:15", activity: { kind: "work" } },
    { at: "12:20", activity: { kind: "chat" } },
    { at: "12:35", activity: { kind: "work" } },
    { at: "13:00", activity: { kind: "lunch" } },
    { at: "13:45", activity: { kind: "work" } },
    { at: "15:30", activity: { kind: "break", spot: "coffee" } },
    { at: "15:50", activity: { kind: "work" } },
    { at: "18:30", activity: { kind: "leave" } },
  ] },
  react: { id: "react", blocks: [
    { at: "09:20", activity: { kind: "arrive" } },
    { at: "09:35", activity: { kind: "work" } },
    { at: "11:00", activity: { kind: "standup", spot: "react.standup" } },
    { at: "11:15", activity: { kind: "work" } },
    { at: "13:00", activity: { kind: "lunch" } },
    { at: "13:45", activity: { kind: "work" } },
    { at: "15:30", activity: { kind: "meeting", room: "cr2" } },
    { at: "16:00", activity: { kind: "work" } },
    { at: "17:00", activity: { kind: "break", spot: "water" } },
    { at: "17:15", activity: { kind: "work" } },
    { at: "18:30", activity: { kind: "leave" } },
  ] },
  lead: { id: "lead", blocks: [
    { at: "09:15", activity: { kind: "arrive" } },
    { at: "09:30", activity: { kind: "work" } },
    { at: "10:15", activity: { kind: "meeting", room: "cr3" } },
    { at: "10:45", activity: { kind: "work" } },
    { at: "11:00", activity: { kind: "standup", spot: "react.standup" } },
    { at: "11:15", activity: { kind: "work" } },
    { at: "12:00", activity: { kind: "meeting", room: "cr1" } },
    { at: "12:45", activity: { kind: "work" } },
    { at: "13:00", activity: { kind: "lunch" } },
    { at: "13:45", activity: { kind: "work" } },
    { at: "15:30", activity: { kind: "meeting", room: "cr2" } },
    { at: "16:00", activity: { kind: "work" } },
    { at: "18:45", activity: { kind: "leave" } },
  ] },
  meetingHeavy: { id: "meetingHeavy", blocks: [
    { at: "09:25", activity: { kind: "arrive" } },
    { at: "09:40", activity: { kind: "work" } },
    { at: "12:00", activity: { kind: "meeting", room: "cr1" } },
    { at: "12:45", activity: { kind: "work" } },
    { at: "13:05", activity: { kind: "lunch" } },
    { at: "13:50", activity: { kind: "work" } },
    { at: "16:30", activity: { kind: "break", spot: "lounge" } },
    { at: "16:50", activity: { kind: "work" } },
    { at: "18:30", activity: { kind: "leave" } },
  ] },
  hr: { id: "hr", blocks: [
    { at: "09:10", activity: { kind: "arrive" } },
    { at: "09:25", activity: { kind: "work" } },
    { at: "12:00", activity: { kind: "meeting", room: "cr1" } },
    { at: "12:45", activity: { kind: "work" } },
    { at: "13:15", activity: { kind: "lunch" } },
    { at: "14:00", activity: { kind: "work" } },
    { at: "16:00", activity: { kind: "break", spot: "coffee" } },
    { at: "16:15", activity: { kind: "work" } },
    { at: "18:15", activity: { kind: "leave" } },
  ] },
  post: { id: "post", blocks: [{ at: "08:30", activity: { kind: "post" } }, { at: "13:30", activity: { kind: "lunch" } }, { at: "14:00", activity: { kind: "post" } }] },
  support: { id: "support", blocks: [
    { at: "09:00", activity: { kind: "patrol" } },
    { at: "13:00", activity: { kind: "lunch" } },
    { at: "13:30", activity: { kind: "patrol" } },
  ] },
};
