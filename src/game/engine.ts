import * as THREE from "three";
import { store, type Phase } from "../state/store";
import { audio } from "./audio";
import type { Scene } from "./utils";
import { HomeScene } from "./scenes/home";
import { HubScene } from "./scenes/hub";
import { MarsScene } from "./scenes/marsFocus";
import { MarsCinematicScene } from "./scenes/cinematic";
import { MarsWorldScene } from "./scenes/marsWorld";
import { StoryScene } from "./scenes/story";
import { InspectScene } from "./scenes/inspect";
import { CompleteScene } from "./scenes/complete";
import { MoonWorldScene } from "./scenes/moonWorld";

function makeScene(phase: Phase, renderer: THREE.WebGLRenderer): Scene | null {
  switch (phase) {
    case "home":
      return new HomeScene(renderer);
    case "hub":
      return new HubScene(renderer);
    case "solar":
      return new MarsScene(renderer);
    case "map":
      return new MarsScene(renderer, true);
    case "cinematic":
      return null; // replaced by Mars intro video overlay
      void MarsCinematicScene;
    case "explore":
      return new MarsWorldScene(renderer);
    case "story":
      return new StoryScene(renderer);
    case "inspect":
      return new InspectScene(renderer);
    case "complete":
      return new CompleteScene(renderer);
    case "moon":
      return new MoonWorldScene(renderer);
    default:
      return null;
  }
}

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene: Scene | null = null;
  private clock = new THREE.Clock();
  private disposers: (() => void)[] = [];
  private pointerDown = false;
  private downAt = { x: 0, y: 0 };
  private rafId = 0;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    window.addEventListener("resize", this.onResize);
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    // UI -> engine transitions
    this.disposers.push(store.on("engine:goto", (d) => this.transitionTo(d as Phase)));
    this.onBus("start", () => {
      audio.play("space");
      this.transitionTo("hub");
    });
    this.onBus("hub:newgame", () => {
      store.set({ showChoice: false, current: null, queue: [], choices: null });
      this.transitionTo("cinematic");
    });
    this.onBus("choose:mars", () => {
      store.set({ showChoice: false, current: null, queue: [], choices: null });
      this.transitionTo("cinematic");
    });
    this.onBus("hearStory", () => this.transitionTo("story"));
    this.onBus("storyFinished", () => {
      store.set({ storyDone: true, showStory: false });
      this.transitionTo("explore");
    });
    this.onBus("openInspect", () => this.transitionTo("inspect"));
    this.onBus("finishInspect", () => this.transitionTo("complete"));
    this.onBus("nextChapter", () => this.transitionTo("hub"));
    this.onBus("toSolar", () => this.transitionTo("solar"));
    this.onBus("replay", () => this.transitionTo("cinematic"));

    // dev aid: ?phase=explore
    const forced = new URLSearchParams(location.search).get("phase") as Phase | null;
    const initial: Phase =
      forced &&
      [
        "home",
        "hub",
        "solar",
        "cinematic",
        "explore",
        "story",
        "inspect",
        "complete",
        "map",
        "moon",
      ].includes(forced)
        ? forced
        : "home";
    this.setPhase(initial);
    store.set({ phase: initial });
    this.loop();
  }

  private onBus(event: string, fn: () => void) {
    this.disposers.push(store.on(event, fn));
  }

  transitionTo(phase: Phase) {
    store.set({ fading: true });
    const showLoader = phase === "hub" || phase === "explore" || phase === "moon";
    if (showLoader) store.set({ loading: true });
    window.setTimeout(() => {
      this.setPhase(phase);
      if (phase === "hub") store.clearDialogue();
      store.set({ phase, fading: false });
      // explore clears the loader itself once the NASA terrain is ready
      if (phase === "hub") window.setTimeout(() => store.set({ loading: false }), 1400);
    }, 650);
  }

  private setPhase(phase: Phase) {
    this.scene?.dispose();
    this.scene = makeScene(phase, this.renderer);
    this.clock.getDelta();
  }

  private onResize = () => {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    (this.scene as any)?.resize?.(this.container.clientWidth, this.container.clientHeight);
  };

  private norm(e: PointerEvent | WheelEvent): [number, number] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    ];
  }

  private activePointer: number | null = null;
  private onPointerDown = (e: PointerEvent) => {
    if (this.activePointer !== null && this.activePointer !== e.pointerId) return; // second finger: ignore
    this.activePointer = e.pointerId;
    this.pointerDown = true;
    this.downAt = { x: e.clientX, y: e.clientY };
    const [x, y] = this.norm(e);
    this.scene?.onPointerDown?.(x, y);
  };

  private onPointerMove = (e: PointerEvent) => {
    // only the finger that started on the 3D view steers the camera (joystick finger stays separate)
    if (this.activePointer !== null && e.pointerId !== this.activePointer) return;
    const [x, y] = this.norm(e);
    this.scene?.onPointerMove?.(x, y, this.pointerDown);
  };

  private onPointerUp = (e?: PointerEvent) => {
    if (e && this.activePointer !== null && e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    // treat as click if barely moved
    if (this.pointerDown && e) {
      const dx = e.clientX - this.downAt.x;
      const dy = e.clientY - this.downAt.y;
      if (Math.hypot(dx, dy) < 6) {
        const [x, y] = this.norm(e);
        (this.scene as any)?.onClick?.(x, y);
      }
    }
    this.pointerDown = false;
    this.scene?.onPointerUp?.();
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.scene?.onWheel?.(e.deltaY);
  };

  private onKeyDown = (e: KeyboardEvent) => this.scene?.onKey?.(e.code, true);
  private onKeyUp = (e: KeyboardEvent) => this.scene?.onKey?.(e.code, false);

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.scene?.update(dt, this.clock.elapsedTime);
  };

  dispose() {
    cancelAnimationFrame(this.rafId);
    this.scene?.dispose();
    this.disposers.forEach((d) => d());
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
