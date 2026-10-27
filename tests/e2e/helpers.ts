import { expect, Page } from "@playwright/test";

export async function boot(page: Page, extra = ""): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = (page.context() as unknown as { _options: { baseURL: string } })._options.baseURL;
  await page.goto(`${base}${extra}`);
  await page.waitForFunction(() => (window as any).__game && document.querySelector(".loading") === null, null, { timeout: 150_000 });
  await page.keyboard.press("KeyP"); // hide help panel
  return errors;
}

/** Run code against the live game. */
export const g = <T>(page: Page, fn: string): Promise<T> => page.evaluate(`(() => { const g = window.__game, V = g.player.pos.constructor; ${fn} })()`) as Promise<T>;

export async function hold(page: Page, keys: string[], ms: number): Promise<void> {
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(ms);
  for (const k of keys) await page.keyboard.up(k);
}

export async function shot(page: Page, name: string, project: string): Promise<void> {
  if (project !== "webgl2") return;
  await page.screenshot({ path: `docs/screenshots/phase2/${name}.png` });
}

export { expect };
