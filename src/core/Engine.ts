import { AbstractEngine, Engine, WebGPUEngine } from "@babylonjs/core";

export type Backend = "webgpu" | "webgl2";

/**
 * Prefers WebGPU when available and falls back to WebGL 2.
 * `?renderer=webgl` or `?renderer=webgpu` in the URL forces a backend for testing.
 */
export async function createEngine(canvas: HTMLCanvasElement): Promise<{ engine: AbstractEngine; backend: Backend }> {
  const forced = new URLSearchParams(location.search).get("renderer");
  if (forced !== "webgl") {
    try {
      if (await WebGPUEngine.IsSupportedAsync) {
        const engine = new WebGPUEngine(canvas, { antialias: false, stencil: true, adaptToDeviceRatio: false, powerPreference: "high-performance" });
        await engine.initAsync();
        return { engine, backend: "webgpu" };
      }
    } catch (err) {
      console.warn("[engine] WebGPU init failed, falling back to WebGL 2", err);
    }
  }
  const engine = new Engine(canvas, false, { stencil: true, preserveDrawingBuffer: true, powerPreference: "high-performance", disableWebGL2Support: false }, false);
  if (engine.webGLVersion < 2) console.warn("[engine] WebGL 2 not available — rendering quality may degrade");
  return { engine, backend: "webgl2" };
}
