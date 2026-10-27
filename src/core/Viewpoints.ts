import { Vector3 } from "@babylonjs/core";

export interface Viewpoint { floor: number; pos: Vector3; target: Vector3; player?: Vector3; playerYaw?: number; label: string; lift?: number; cutaway?: boolean }

const F3 = 12;
/** Named inspection cameras — used by the screenshot script and the debug menu. */
export const VIEWPOINTS: Record<string, Viewpoint> = {
  entrance: { label: "Building entrance", floor: 0, pos: new Vector3(14.5, 2.2, -11.5), target: new Vector3(7, 3.5, 0), player: new Vector3(8.2, 0, -5.5), playerYaw: 0 },
  facade: { label: "Facade", floor: 0, pos: new Vector3(36, 4, -24), target: new Vector3(20, 10, 10) },
  groundLobby: { label: "Ground lobby", floor: 0, pos: new Vector3(16.5, 2.0, 1.2), target: new Vector3(6, 1.0, 9) },
  liftLobby: { label: "Lift lobby 3F", floor: 3, pos: new Vector3(9.3, F3 + 1.9, 1.0), target: new Vector3(3, F3 + 1.2, 7.5) },
  liftInterior: { label: "Lift interior", floor: 3, pos: new Vector3(4.6, F3 + 1.6, 6.0), target: new Vector3(0.5, F3 + 1.0, 6.4), lift: 3 },
  reception: { label: "Apptunix reception", floor: 3, pos: new Vector3(10.8, F3 + 1.8, 11.5), target: new Vector3(17, F3 + 1.2, 4.5) },
  react: { label: "React department", floor: 3, pos: new Vector3(27.5, F3 + 2.2, 12.6), target: new Vector3(22.5, F3 + 0.6, 6.5) },
  dragon: { label: "DRAGON's desk", floor: 3, pos: new Vector3(23.6, F3 + 1.55, 11.0), target: new Vector3(22.2, F3 + 0.85, 9.2) },
  angular: { label: "Angular", floor: 3, pos: new Vector3(36.6, F3 + 2.0, 13.4), target: new Vector3(34.0, F3 + 0.7, 6.0) },
  node: { label: "Node.js", floor: 3, pos: new Vector3(47.2, F3 + 2.1, 12.8), target: new Vector3(42.5, F3 + 0.7, 5.5) },
  devops: { label: "DevOps", floor: 3, pos: new Vector3(20.5, F3 + 2.0, 22.6), target: new Vector3(12.5, F3 + 1.0, 18.5) },
  design: { label: "Design", floor: 3, pos: new Vector3(33.2, F3 + 2.0, 16.9), target: new Vector3(25.5, F3 + 0.8, 20.5) },
  qa: { label: "QA / Testing", floor: 3, pos: new Vector3(46.5, F3 + 2.0, 16.9), target: new Vector3(39, F3 + 0.8, 20.5) },
  hr: { label: "HR", floor: 3, pos: new Vector3(9.3, F3 + 2.0, 17.2), target: new Vector3(3, F3 + 0.8, 21.5) },
  cr1: { label: "CR1", floor: 3, pos: new Vector3(21.2, F3 + 2.2, 25.8), target: new Vector3(13, F3 + 0.6, 30.5) },
  cr2: { label: "CR2", floor: 3, pos: new Vector3(22.8, F3 + 2.1, 25.7), target: new Vector3(28, F3 + 0.8, 30.5) },
  cr3: { label: "CR3", floor: 3, pos: new Vector3(30.7, F3 + 2.1, 25.7), target: new Vector3(34.5, F3 + 0.8, 30) },
  breakArea: { label: "Break area", floor: 3, pos: new Vector3(9.0, F3 + 2.0, 25.6), target: new Vector3(2.5, F3 + 0.8, 31) },
  lounge: { label: "Lounge", floor: 3, pos: new Vector3(41.8, F3 + 1.9, 25.6), target: new Vector3(46, F3 + 0.6, 31) },
  corridor: { label: "Main corridor", floor: 3, pos: new Vector3(11.5, F3 + 1.7, 15.3), target: new Vector3(40, F3 + 1.2, 15.3) },
  overview: { label: "Floor overview (cutaway)", floor: 3, pos: new Vector3(24, F3 + 30, -14), target: new Vector3(24, F3, 16), cutaway: true },
  upperLobby: { label: "Floor 4 lift lobby", floor: 4, pos: new Vector3(9.2, 16 + 1.9, 1.0), target: new Vector3(3.5, 16 + 1.2, 7.5) },
};
