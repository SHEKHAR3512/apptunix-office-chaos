import type { MaterialKey } from "../assets/MaterialRegistry";
import { P, DeptKey } from "../rendering/Palette";

/**
 * APPTUNIX 3RD FLOOR — EDITABLE LAYOUT DEFINITION
 *
 * The real floor plan has NOT been verified (see docs/APPTUNIX_OFFICE_REFERENCES.md).
 * Every zone below is a provisional, data-driven placement. Moving a department means
 * changing its rect here; the section builders read everything from this file.
 *
 * Units: metres. +X = east, +Z = north. Building origin = south-west interior corner.
 * The building's main street frontage faces south (−Z).
 */

export const BUILDING = {
  width: 48,           // interior X extent
  depth: 34,           // interior Z extent
  floorHeight: 4,      // slab to slab
  ceilingHeight: 3,    // false ceiling height
  wallThickness: 0.3,  // exterior
  floors: ["G", "1", "2", "3", "4", "5"] as const,
};

export const floorY = (level: number): number => level * BUILDING.floorHeight;

export interface Rect { x0: number; z0: number; x1: number; z1: number }
export const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 });
export const cx = (r: Rect): number => (r.x0 + r.x1) / 2;
export const cz = (r: Rect): number => (r.z0 + r.z1) / 2;

/** The shared building core (same on every floor). */
export const CORE = {
  liftShaft: rect(0.2, 4.8, 3.2, 7.8),
  liftDoorZ: 6.3,         // centre of the landing door on the east face of the shaft
  liftDoorWidth: 1.2,
  liftCabin: rect(0.45, 5.05, 2.95, 7.55),
  washrooms: rect(0, 0, 3.2, 4.8),
  stairs: rect(0, 7.8, 3.2, 14),
  lobby: rect(3.2, 0, 10, 14),
};

export type ZoneId =
  | "lobby" | "reception" | "hr" | "react" | "angular" | "node" | "devops" | "design" | "qa"
  | "cr1" | "cr2" | "cr3" | "corridorA" | "corridorC" | "break" | "server" | "lounge";

export interface Zone {
  id: ZoneId;
  label: string;
  rect: Rect;
  floor: MaterialKey;
  floorColor: string;
  verified: boolean;      // true only once confirmed against real photos / measurements
  accent?: string;
  dept?: DeptKey;
}

export const ZONES: Zone[] = [
  { id: "reception", label: "Reception", rect: rect(10, 0, 18, 14), floor: "floorWood", floorColor: P.woodFloor, verified: false, accent: P.brandOrange },
  { id: "react", label: "React", rect: rect(18, 0, 30, 14), floor: "floorCarpet", floorColor: "#5f6c80", verified: false, accent: P.react, dept: "react" },
  { id: "angular", label: "Angular", rect: rect(30, 0, 39, 14), floor: "floorCarpet", floorColor: "#6d6670", verified: false, accent: P.angular, dept: "angular" },
  { id: "node", label: "Node.js", rect: rect(39, 0, 48, 14), floor: "floorCarpet", floorColor: "#63706a", verified: false, accent: P.node, dept: "node" },
  { id: "corridorA", label: "Main corridor", rect: rect(0, 14, 48, 16.5), floor: "floorTile", floorColor: P.tileCream, verified: false },
  { id: "hr", label: "HR", rect: rect(0, 16.5, 10, 23), floor: "floorCarpet", floorColor: "#7a6e6a", verified: false, accent: P.hr },
  { id: "devops", label: "DevOps", rect: rect(10, 16.5, 22, 23), floor: "floorCarpet", floorColor: "#6b6a74", verified: false, accent: P.devops, dept: "devops" },
  { id: "design", label: "Design", rect: rect(22, 16.5, 34, 23), floor: "floorCarpet", floorColor: "#6e6878", verified: false, accent: P.design, dept: "design" },
  { id: "qa", label: "QA / Testing", rect: rect(34, 16.5, 48, 23), floor: "floorCarpet", floorColor: "#706870", verified: false, accent: P.qa, dept: "qa" },
  { id: "corridorC", label: "North corridor", rect: rect(0, 23, 48, 25), floor: "floorTile", floorColor: P.tileCream, verified: false },
  { id: "break", label: "Break area", rect: rect(0, 25, 10, 34), floor: "floorTile", floorColor: "#d8cdbb", verified: false, accent: P.sofaMustard },
  { id: "cr1", label: "CR1", rect: rect(10, 25, 22, 34), floor: "floorCarpet", floorColor: "#56627a", verified: false, accent: P.brandBlue },
  { id: "cr2", label: "CR2", rect: rect(22, 25, 30, 34), floor: "floorCarpet", floorColor: "#5d6676", verified: false, accent: P.react },
  { id: "cr3", label: "CR3", rect: rect(30, 25, 36, 34), floor: "floorCarpet", floorColor: "#686272", verified: false, accent: P.brandOrange },
  { id: "server", label: "Server room", rect: rect(36, 25, 41, 34), floor: "floorStone", floorColor: "#b5b3b0", verified: false },
  { id: "lounge", label: "Lounge", rect: rect(41, 25, 48, 34), floor: "floorWood", floorColor: "#b98b5c", verified: false, accent: P.sofaTeal },
];

export const zone = (id: ZoneId): Zone => ZONES.find((z) => z.id === id)!;

/** React team seating. Order = seat index in ReactSection. */
export const REACT_TEAM = ["Tushar", "Mohit", "Arpit", "Vibhu", "Rockey", "Karan", "DRAGON"] as const;

/** Desk counts per department (≥4 each, per brief). */
export const DEPT_SEATS: Record<Exclude<DeptKey, "react">, string[]> = {
  angular: Array.from({ length: 12 }, (_, i) => `Angular ${i + 1}`),
  node: Array.from({ length: 12 }, (_, i) => `Node ${i + 1}`),
  devops: ["DevOps 1", "DevOps 2", "DevOps 3", "DevOps 4"],
  design: ["Design 1", "Design 2", "Design 3", "Design 4"],
  qa: ["QA 1", "QA 2", "QA 3", "QA 4", "QA 5", "QA 6"],
};

/** Doors on the 3rd floor. type slide = automatic glass, swing = hinged. */
export interface DoorDef { id: string; x: number; z: number; axis: "x" | "z"; width: number; type: "slide" | "swing"; glass: boolean; label?: string; locked?: boolean }

export const FLOOR3_DOORS: DoorDef[] = [
  { id: "entrance", x: 10, z: 6.3, axis: "z", width: 2.0, type: "slide", glass: true, label: "APPTUNIX" },
  { id: "hr", x: 7.5, z: 16.5, axis: "x", width: 1.0, type: "swing", glass: true },
  { id: "cr1", x: 12.2, z: 25, axis: "x", width: 1.1, type: "swing", glass: true },
  { id: "cr2", x: 23.4, z: 25, axis: "x", width: 1.0, type: "swing", glass: true },
  { id: "cr3", x: 31.4, z: 25, axis: "x", width: 1.0, type: "swing", glass: true },
  { id: "server", x: 38.5, z: 25, axis: "x", width: 1.0, type: "swing", glass: false },
];
