import { useEffect, useRef } from "react";
import { Game } from "../core/Game";
import { hud, useHud } from "../core/Store";
import { Hud } from "./Hud";
import { LoadingScreen } from "./LoadingScreen";
import { SettingsPanel } from "./SettingsPanel";
import { DialoguePanel } from "./dialogue/DialoguePanel";
import { ComputerDesktop } from "./ComputerDesktop";
import { PauseMenu } from "./PauseMenu";
import { ClockWidget, ReadOverlay, Toast } from "./OfficeOverlays";

let gameSingleton: Game | null = null;
export const getGame = (): Game | null => gameSingleton;

export function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ready = useHud("ready");
  useEffect(() => {
    if (!canvas.current || gameSingleton) return;
    const g = new Game();
    gameSingleton = g;
    g.init(canvas.current).catch((e: unknown) => {
      console.error(e);
      hud.set({ error: e instanceof Error ? `${e.message}` : String(e) });
    });
  }, []);
  return (
    <>
      <canvas id="game" ref={canvas} tabIndex={0} />
      {ready && <Hud />}
      {ready && <><ClockWidget /><Toast /><DialoguePanel /><ReadOverlay /><ComputerDesktop /><PauseMenu /></>}
      <SettingsPanel />
      <LoadingScreen />
    </>
  );
}
