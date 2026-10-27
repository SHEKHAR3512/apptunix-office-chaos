/** Keyboard + mouse state with pointer-lock look and drag-to-look fallback. */
export class Input {
  readonly keys = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  private dragging = false;
  /** Right mouse button held (strafe / focus). */
  rmb = false;
  locked = false;
  onLockChange: (locked: boolean) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (["Space", "Tab", "F1", "Backquote"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener("click", () => {
      if (!this.locked && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {});
    });
    canvas.addEventListener("mousedown", (e) => { if (e.button === 2) this.rmb = true; else this.dragging = true; });
    window.addEventListener("mouseup", (e) => { if (e.button === 2) this.rmb = false; else this.dragging = false; });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange(this.locked);
    });
    window.addEventListener("mousemove", (e) => {
      if (this.locked || this.dragging) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    canvas.addEventListener("wheel", (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  }

  down(code: string): boolean { return this.keys.has(code); }
  /** True once per physical key press. */
  hit(code: string): boolean { return this.pressed.has(code); }
  endFrame(): void { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0; }
  releasePointer(): void { if (document.pointerLockElement) document.exitPointerLock(); }
}
