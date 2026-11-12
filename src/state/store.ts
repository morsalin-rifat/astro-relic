import { useSyncExternalStore } from "react";

export type Lang = "en" | "bn";
export type Phase =
  "home" | "hub" | "solar" | "cinematic" | "explore" | "story" | "inspect" | "complete" | "map" | "moon";

export type Speaker = "nova" | "sojourner" | "narrator";

export interface DialogueLine {
  speaker: Speaker;
  en: string;
  bn: string;
}

export interface Choice {
  en: string;
  bn: string;
  action: string; // bus event
  data?: unknown;
}

interface GameState {
  phase: Phase;
  universe: "mars" | "moon";
  lang: Lang;
  muted: boolean;
  // dialogue
  queue: DialogueLine[];
  current: DialogueLine | null;
  choices: Choice[] | null;
  speaker0: boolean;
  // ui
  objective: { en: string; bn: string } | null;
  caption: { en: string; bn: string } | null;
  hint: { en: string; bn: string } | null;
  showChoice: boolean; // journey choice overlay
  showStory: boolean; // story narration overlay
  storyIndex: number;
  visitedHotspots: string[];
  activeHotspot: string | null;
  flags: string[]; // raised mission flags
  tutorialDone: boolean;
  hasSeenHubIntro: boolean;
  fading: boolean; // black fade overlay
  metSojourner: boolean;
  storyDone: boolean;
  // solar system interactive state
  selectedPlanet: string | null;
  orbitSpeed: number;
  showOrbits: boolean;
  showLabels: boolean;
  badges: string[];
  newBadge: string | null;
  loading: boolean;
  showEncounter: boolean;
  showSpirit: boolean;
  showOppy: boolean;
  showInsight: boolean;
  bigMap: boolean;
}

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem("astro-relic") || "{}");
  } catch {
    return {};
  }
})();

class Store {
  state: GameState = {
    phase: (import.meta.env.DEV && new URLSearchParams(location.search).get("phase")) as Phase || "home",
    universe: "mars",
    lang: persisted.lang === "bn" ? "bn" : "en",
    muted: false,
    queue: [],
    current: null,
    choices: null,
    speaker0: false,
    objective: null,
    caption: null,
    hint: null,
    showChoice: false,
    showStory: false,
    storyIndex: 0,
    visitedHotspots: [],
    activeHotspot: null,
    flags: Array.isArray(persisted.flags) ? persisted.flags : [],
    tutorialDone: !!persisted.tutorialDone,
    hasSeenHubIntro: false, // session-only: guide returns on every fresh browser run
    fading: false,
    metSojourner: false,
    storyDone: false,
    selectedPlanet: null,
    orbitSpeed: 1,
    showOrbits: true,
    showLabels: true,
    badges: Array.isArray(persisted.badges) ? persisted.badges : [],
    newBadge: null,
    loading: false,
    showEncounter: false,
    showSpirit: false,
    showOppy: false,
    showInsight: false,
    bigMap: false,
  };

  private listeners = new Set<() => void>();
  private bus = new Map<string, Set<(d?: unknown) => void>>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.state;

  set(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial };
    if (
      "flags" in partial ||
      "lang" in partial ||
      "tutorialDone" in partial ||
      "hasSeenHubIntro" in partial ||
      "badges" in partial
    ) {
      try {
        localStorage.setItem(
          "astro-relic",
          JSON.stringify({
            flags: this.state.flags,
            lang: this.state.lang,
            tutorialDone: this.state.tutorialDone,
            badges: this.state.badges,
          }),
        );
      } catch {
        /* ignore */
      }
    }
    this.listeners.forEach((fn) => fn());
  }

  awardBadge(id: string) {
    if (this.state.badges.includes(id)) return;
    this.set({ badges: [...this.state.badges, id], newBadge: id });
  }

  // ---- dialogue helpers ----
  say(lines: DialogueLine[], choices?: Choice[] | null) {
    const [current, ...rest] = lines;
    this.set({ current: current ?? null, queue: rest, choices: choices ?? null });
  }

  advanceDialogue() {
    const [current, ...rest] = this.state.queue;
    this.set({ current: current ?? null, queue: rest });
    return current ?? null;
  }

  clearDialogue() {
    this.set({ current: null, queue: [], choices: null });
  }

  // ---- event bus (UI -> engine, engine -> engine) ----
  on(event: string, fn: (d?: unknown) => void) {
    if (!this.bus.has(event)) this.bus.set(event, new Set());
    this.bus.get(event)!.add(fn);
    return () => {
      this.bus.get(event)?.delete(fn);
    };
  }

  emit(event: string, data?: unknown) {
    this.bus.get(event)?.forEach((fn) => fn(data));
  }
}

export const store = new Store();

export function useGame<T>(selector: (s: GameState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()));
}

export function t(pair: { en: string; bn: string } | null, lang: Lang): string {
  if (!pair) return "";
  return lang === "bn" ? pair.bn : pair.en;
}
