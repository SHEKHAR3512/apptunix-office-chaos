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

  private tone(freqs: number[], step: number, dur: number, vol: number, type: OscillatorType = "sine"): void {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime;
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      const s = t + i * step;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g).connect(ac.destination);
      o.start(s); o.stop(s + dur + 0.05);
    });
  }

  /** Gameplay cues — short, soft, never repetitive-loud. */
  play(kind: string): void {
    switch (kind) {
      case "mission": this.tone([523.3, 659.3, 784], 0.11, 0.7, 0.07); break;
      case "objective": this.tone([880, 1174.7], 0.07, 0.35, 0.05); break;
      case "chat": this.tone([1046.5, 1318.5], 0.06, 0.25, 0.04, "triangle"); break;
      case "bug": this.tone([220, 185], 0.12, 0.35, 0.05, "square"); break;
      case "approve": this.tone([659.3, 830.6, 987.8], 0.08, 0.5, 0.05); break;
      case "deploy": this.tone([523.3, 659.3, 784, 1046.5], 0.1, 0.9, 0.07); break;
      case "meeting": this.chime(); break;
      case "typing": this.ticks(4, 0.045); break;
      case "terminal": this.tone([1567.98], 0, 0.06, 0.02, "square"); break;
      case "chapter": this.tone([392, 523.3, 659.3, 784, 1046.5], 0.16, 1.4, 0.07); break;
    }
  }

  private ticks(n: number, gap: number): void {
    const ac = this.ac; if (!ac) return;
    for (let i = 0; i < n; i++) {
      const t = ac.currentTime + i * gap * (0.7 + Math.random() * 0.6);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "square"; o.frequency.value = 2400 + Math.random() * 900;
      g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.03);
    }
  }

  /** Very quiet office bed: filtered noise (air-con) + occasional distant keyboard bursts. */
  ambience(on: boolean): void {
    const ac = this.ac; if (!ac) return;
    if (on && !this.amb) {
      const len = ac.sampleRate * 2;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380;
      const g = ac.createGain(); g.gain.value = 0.012;
      src.connect(f).connect(g).connect(ac.destination); src.start();
      const timer = window.setInterval(() => { if (Math.random() < 0.35) this.ticks(3 + Math.floor(Math.random() * 6), 0.07); }, 2600);
      this.amb = { src, timer };
    } else if (!on && this.amb) { this.amb.src.stop(); clearInterval(this.amb.timer); this.amb = null; }
  }
  private amb: { src: AudioBufferSourceNode; timer: number } | null = null;

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
