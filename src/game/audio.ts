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
      g.gain.value = 0.14;
    }
    // Main background music (uploaded track) plays in every scene; the synth
    // layers above stay as a soft drone/wind bed underneath it.
    this.startTrack("/audio/music/game_bg.mp3");
    this.fadeTo(1, 2.5);
  }

  /** Slow cinematic pad + sparse twinkling chimes so the music evolves instead of droning. */
  private chimeTimer: number | null = null;
  private startMusic(mode: "space" | "mars") {
    const ctx = this.ctx!;
    const out = this.master!;
    const bus = ctx.createGain();
    bus.gain.value = 0.09;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 500;
    lfo.connect(lfoAmt).connect(lp.frequency);
    bus.connect(lp).connect(out);
    lfo.start();
    this.nodes.push(bus, lp, lfo, lfoAmt);
    // chord progression (A minor -> F -> C -> G), hopeful + mysterious
    const chords = mode === "mars"
      ? [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]]
      : [[110, 164.8, 220], [87.3, 130.8, 174.6], [98, 146.8, 196], [130.8, 164.8, 196]];
    const voices = [0, 1, 2].map(() => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.detune.value = 7;
      o.connect(bus);
      o2.connect(bus);
      o.start();
      o2.start();
      this.nodes.push(o, o2);
      return [o, o2];
    });
    let ci = 0;
    const setChord = () => {
      const ch = chords[ci % chords.length]!;
      voices.forEach((pair, i) =>
        pair.forEach((o) => o.frequency.setTargetAtTime(ch[i]!, ctx.currentTime, 1.5)),
      );
      ci++;
    };
    setChord();
    const pent = [523.3, 587.3, 659.3, 784, 880, 1046.5];
    let tick = 0;
    if (this.chimeTimer) clearInterval(this.chimeTimer);
    this.chimeTimer = window.setInterval(() => {
      if (!this.ctx || this.mode !== mode) return;
      tick++;
      if (tick % 8 === 0) setChord();
      if (Math.random() < 0.45) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = pent[Math.floor(Math.random() * pent.length)]!;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.6);
        o.connect(g).connect(out);
        o.start();
        o.stop(ctx.currentTime + 2.7);
      }
    }, 1000);
  }

  /** Looping cinematic organ track (Mars). Routed through master so mute/fade still work. */
  private track: HTMLAudioElement | null = null;
  private startTrack(url: string) {
    const ctx = this.ctx!;
    const el = new Audio(url);
    el.loop = true;
    el.crossOrigin = "anonymous";
    const src = ctx.createMediaElementSource(el);
    const g = ctx.createGain();
    g.gain.value = 0.55;
    src.connect(g).connect(this.master!);
    el.play().catch(() => {});
    this.track = el;
    this.nodes.push(src, g);
  }

  private stopNodes() {
    if (this.track) { this.track.pause(); this.track.src = ""; this.track = null; }
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
    if (this.chimeTimer) clearInterval(this.chimeTimer);
    this.chimeTimer = null;
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
