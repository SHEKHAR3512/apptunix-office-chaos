/** Tiny synthesized SFX (no audio files needed in Phase 1). */
class Sfx {
  private ctx: AudioContext | null = null;
  private get ac(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  chime(): void {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime;
    for (const [f, d] of [[880, 0], [1318.5, 0.18]] as const) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.12, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.2);
      o.connect(g).connect(ac.destination);
      o.start(t + d); o.stop(t + d + 1.3);
    }
  }

  whoosh(volume = 0.05): void {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime, len = 0.6;
    const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700;
    const g = ac.createGain(); g.gain.value = volume;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t);
  }

  click(): void {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "square"; o.frequency.value = 1900;
    g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.06);
  }

  hum(on: boolean): void {
    const ac = this.ac; if (!ac) return;
    if (on && !this.humNode) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sawtooth"; o.frequency.value = 55;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 160;
      g.gain.value = 0.015;
      o.connect(f).connect(g).connect(ac.destination); o.start();
      this.humNode = { o, g };
    } else if (!on && this.humNode) {
      this.humNode.g.gain.setTargetAtTime(0, ac.currentTime, 0.1);
      this.humNode.o.stop(ac.currentTime + 0.5);
      this.humNode = null;
    }
  }
  private humNode: { o: OscillatorNode; g: GainNode } | null = null;
}

export const sfx = new Sfx();
