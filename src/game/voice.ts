import { store } from "../state/store";
import { audio } from "./audio";

/** Plays the team's recorded Sojourner/Nova voice clips (EN/BN), ducking the music. */
class VoicePlayer {
  private el: HTMLAudioElement | null = null;

  play(name: string, onEnd?: () => void) {
    this.stop();
    if (store.get().muted) {
      onEnd?.();
      return;
    }
    const lang = store.get().lang === "bn" ? "bn" : "en";
    const el = new Audio(`/audio/sojourner/${name}_${lang}.mp3`);
    this.el = el;
    audio.duck(true);
    const done = () => {
      if (this.el !== el) return;
      this.el = null;
      audio.duck(false);
      onEnd?.();
    };
    el.onended = done;
    el.onerror = done;
    el.play().catch(done);
  }

  stop() {
    if (this.el) {
      this.el.onended = null;
      this.el.pause();
      this.el = null;
      audio.duck(false);
    }
  }
}

export const voice = new VoicePlayer();
