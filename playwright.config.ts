import { defineConfig } from "@playwright/test";

/** Browser tests run against the real game in system Chrome (WebGL 2 and WebGPU projects). */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    channel: "chrome",
    viewport: { width: 1600, height: 900 },
    launchOptions: { args: ["--use-angle=metal", "--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] },
  },
  webServer: { command: "npx vite --port 5173", url: "http://localhost:5173", reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "webgl2", use: { baseURL: "http://localhost:5173/?renderer=webgl" } },
    { name: "webgpu", use: { baseURL: "http://localhost:5173/?renderer=webgpu" } },
  ],
});
