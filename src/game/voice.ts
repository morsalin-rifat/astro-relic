import { store } from "../state/store";
import { audio } from "./audio";

/** Plays the team's recorded Sojourner/Nova voice clips (EN/BN), ducking the music. */
class VoicePlayer {
  private el: HTMLAudioElement | null = null;
  private end: (() => void) | null = null;

  play(name: string, onEnd?: () => void) {
    this.stop();
    if (store.get().muted) {
      onEnd?.();
      return;
    }
    const lang = store.get().lang === "bn" ? "bn" : "en";
    const el = new Audio(`/audio/${name.includes("/") ? name : "sojourner/" + name}_${lang}.mp3`);
    this.el = el;
    audio.duck(true);
    const done = () => {
      if (this.el !== el) return;
      this.el = null; this.end = null;
      audio.duck(false);
      onEnd?.();
    };
    this.end = done;
    el.onended = done;
    el.onerror = done;
    el.play().catch(done);
  }

  /** 0..1 playback progress of the current clip, or null when unknown. */
  progress(): number | null {
    const el = this.el;
    if (!el || !isFinite(el.duration) || el.duration <= 0) return null;
    return Math.min(1, el.currentTime / el.duration);
  }

  /** Fast-forward: end the clip now and run its onEnd (story continues). */
  skip() { const f = this.end; if (f) f(); else this.stop(); if (this.el) { this.el.pause(); } }

  isPlaying() { return !!this.el; }

  stop() {
    this.end = null;
    if (this.el) {
      this.el.onended = null;
      this.el.pause();
      this.el = null;
      audio.duck(false);
    }
  }
}

export const voice = new VoicePlayer();
