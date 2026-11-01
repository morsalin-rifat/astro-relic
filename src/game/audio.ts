import { store } from "../state/store";

// Tiny ambient audio engine: deep-space drone for space scenes, filtered wind for Mars.
class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private mode: "space" | "mars" | null = null;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  play(mode: "space" | "mars") {
    if (store.get().muted) return;
    this.ensure();
    if (this.mode === mode) return;
    this.stopNodes();
    this.mode = mode;
    const ctx = this.ctx!;
    const out = this.master!;

    if (mode === "space") {
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = 55;
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = 55.7;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      o1.connect(g);
      o2.connect(g);
      g.connect(out);
      o1.start();
      o2.start();
      this.nodes = [o1, o2, g];
    } else {
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02; // brown-ish
        data[i] = last * 3;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 320;
      filt.Q.value = 0.6;
      const g = ctx.createGain();
      g.gain.value = 0.32;
      src.connect(filt);
      filt.connect(g);
      g.connect(out);
      src.start();
      this.nodes = [src, filt, g];
    }
    this.fadeTo(1, 2.5);
  }

  private stopNodes() {
    this.nodes.forEach((n) => {
      try {
        (n as any).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    });
    this.nodes = [];
    this.mode = null;
  }

  private fadeTo(v: number, secs: number) {
    if (!this.ctx || !this.master) return;
    const g = this.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(store.get().muted ? 0 : v, this.ctx.currentTime + secs);
  }

  // Short radio blip for UI feedback (works even before the ambient drone starts).
  beep(freq = 880) {
    if (store.get().muted) return;
    this.ensure();
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      g.disconnect();
      o.disconnect();
    }, 250);
  }

  // Lower ambience while a voice line plays so voices never overlap the drone.
  duck(on: boolean) {
    if (!this.ctx || !this.master) return;
    this.fadeTo(on ? 0.12 : 1, 0.4);
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    this.fadeTo(muted ? 0 : 1, 0.4);
  }
}

export const audio = new AmbientAudio();
