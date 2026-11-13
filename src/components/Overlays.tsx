import { MobileLandscape } from "@/components/MobileLandscape";
import { voice } from "../game/voice";
import { useEffect, useRef, useState } from "react";
import { store, useGame, t } from "../state/store";
import { audio } from "../game/audio";
import { UI, MISSIONS, TELEMETRY, HUB, HOWTO, CHAPTERS } from "../data/content";
import { STORY, HOTSPOTS, HOTSPOT_ORDER } from "../data/story";
import { SolarHUD } from "./SolarHUD";
import { NovaGuide } from "./NovaGuide";
import { SpiritEncounter } from "./SpiritUI";
import { OppyEncounter } from "./OppyUI";
import { InsightEncounter } from "./InsightUI";
import { FinaleUI } from "./FinaleUI";
import { MoonFinaleUI, MOON_PATCHES } from "./MoonFinaleUI";
import { Apollo11Mission } from "./Apollo11UI";
import { Apollo12Mission } from "./Apollo12UI";
import { Apollo15Mission } from "./Apollo15UI";
import { Apollo17Mission } from "./Apollo17UI";
import { MoonControls } from "./MoonControls";
import { MarsStarHunt } from "./MarsStarHunt";
import { MARS_REGIONS } from "../data/marsDiscoveries";
import { zoneCount } from "../game/sim/marsStarRules";
import { SojournerEncounter, Badges, BigMapClose, RoverLoader, HoloBubble } from "./MissionUI";

const POP = "cubic-bezier(.785, .135, .15, .01)";


/* ---------------- Mars intro video ---------------- */
function MarsIntroVideo() {
  const phase = useGame((s) => s.phase);
  const [showSkip, setShowSkip] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (phase !== "cinematic") return;
    setShowSkip(false);
    setFading(false);
    const id = setTimeout(() => setShowSkip(true), 2500);
    return () => clearTimeout(id);
  }, [phase]);
  if (phase !== "cinematic") return null;
  const isMoon = store.get().universe === "moon";
  const finish = () => {
    if (fading) return;
    setFading(true);
    const moon = store.get().universe === "moon";
    store.set(moon ? { moonZone: 0 } : { marsZone: 0 });
    setTimeout(() => store.emit("engine:goto", moon ? "moon" : "explore"), 600);
  };
  return (
    <div className="absolute inset-0 z-50 bg-black">
      <video
        src={isMoon ? "/videos/moon/moon_intro.mp4" : "/videos/mars/mars_intro.mp4"}
        autoPlay
        playsInline
        onEnded={finish}
        onError={finish}
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500"
        style={{ opacity: fading ? 1 : 0 }}
      />
      {showSkip && !fading && (
        <button
          onClick={finish}
          className="absolute bottom-8 right-8 px-6 py-3 rounded-full border border-white/40 bg-white/10 backdrop-blur-md text-white tracking-[0.2em] text-sm hover:bg-white/25 transition"
        >
          ⏭️ SKIP INTRO
        </button>
      )}
    </div>
  );
}

/* ---------------- Dialogue box ---------------- */
function Dialogue() {
  const current = useGame((s) => s.current);
  const choices = useGame((s) => s.choices);
  const lang = useGame((s) => s.lang);
  const phase = useGame((s) => s.phase);

  if (phase === "home" || phase === "cinematic" || phase === "hub") return null;

  if (!current && choices) {
    return (
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {choices.map((c) => (
          <button
            key={c.action}
            onClick={() => {
              store.set({ choices: null });
              store.emit(c.action, c.data);
            }}
            className="px-7 py-3 border border-[#ffd97d]/70 text-[#ffd97d] tracking-[0.25em] text-sm hover:bg-[#ffd97d] hover:text-black transition-all duration-200"
            style={{ transitionTimingFunction: POP }}
          >
            {t(c, lang)}
          </button>
        ))}
      </div>
    );
  }

  if (!current) return null;
  const sp = current.speaker === "sojourner" ? "sojourner" : "nova";
  return <HoloBubble key={t(current, lang)} speaker={sp} text={t(current, lang)} onClick={() => store.advanceDialogue()} hint={t(UI.clickContinue, lang)} />;
}

/* ---------------- Home overlay ---------------- */
function HomeUI() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (phase === "home") {
      const id = setTimeout(() => setShow(true), 400);
      return () => clearTimeout(id);
    }
    setShow(false);
    return undefined;
  }, [phase]);
  if (phase !== "home") return null;
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: show ? 1 : 0 }}
    >
      <div className="astro-badge mb-6">{t(UI.badge, lang)}</div>
      <h1 className="font-display astro-title text-[clamp(2.8rem,9vw,7rem)] leading-none tracking-[0.08em] select-none text-center">
        ASTRO&nbsp;RELIC
      </h1>
      <div className="mt-4 text-[11px] sm:text-[13px] tracking-[0.35em] text-[#ffd97d]/90 uppercase text-center">
        {t(UI.tagline1, lang)}
      </div>
      <div className="mt-5 text-center text-[12px] sm:text-[13px] text-white/60 tracking-[0.18em] leading-7">
        <div>{t(UI.tagline2, lang)}</div>
        <div>{t(UI.tagline3, lang)}</div>
      </div>
      <button
        onPointerEnter={() => audio.beep()}
        onClick={() => store.emit("start")}
        className="pointer-events-auto cta-adventure mt-10"
      >
        <span className="cta-rocket">🚀</span>
        <span>{t(UI.cta, lang)}</span>
      </button>
      <div className="mt-6 text-[10px] sm:text-[11px] tracking-[0.3em] text-white/40 text-center">
        {t(UI.starHint, lang)}
      </div>
    </div>
  );
}

/* ---------------- Journey choice ---------------- */
function JourneyChoice() {
  const show = useGame((s) => s.showChoice);
  const lang = useGame((s) => s.lang);
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="text-[11px] tracking-[0.5em] text-white/50 mb-2">
        {t(UI.chooseJourney, lang)}
      </div>
      <div className="text-white/80 text-lg mb-10">{t(UI.twoWorlds, lang)}</div>
      <div className="flex gap-6 flex-wrap justify-center px-6">
        <button
          onClick={() => store.emit("choose:mars")}
          className="group relative w-72 p-8 border border-[#c1543a]/60 text-left overflow-hidden hover:border-[#ffd97d] transition-colors duration-300"
        >
          <span
            className="absolute inset-0 bg-[#c1543a]/20 origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
            style={{ transitionTimingFunction: POP }}
          />
          <div className="relative">
            <div className="text-3xl tracking-[0.2em] text-[#e0603f] mb-3">{t(UI.mars, lang)}</div>
            <div className="text-sm text-white/60 leading-relaxed">{t(UI.marsDesc, lang)}</div>
            <div className="mt-6 text-[10px] tracking-[0.35em] text-[#ffd97d]">
              🚩 PATHFINDER / SOJOURNER
            </div>
          </div>
        </button>
        <div className="relative w-72 p-8 border border-white/10 text-left opacity-50">
          <div className="text-3xl tracking-[0.2em] text-white/70 mb-3">{t(UI.moon, lang)}</div>
          <div className="text-sm text-white/50 leading-relaxed">{t(UI.moonDesc, lang)}</div>
          <div className="mt-6 text-[10px] tracking-[0.35em] text-white/40">
            🔒 {t(UI.locked, lang)} — {t(UI.comingSoon, lang)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Cinematic caption ---------------- */
function Caption() {
  const caption = useGame((s) => s.caption);
  const lang = useGame((s) => s.lang);
  if (!caption) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="text-[clamp(1.4rem,4vw,2.6rem)] tracking-[0.45em] text-[#f3ede0] font-display animate-[fadein_1.2s_ease]">
        {t(caption, lang)}
      </div>
    </div>
  );
}

/* ---------------- Story mode overlay ---------------- */
function StoryOverlay() {
  const show = useGame((s) => s.showStory);
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const [chapter, setChapter] = useState(0);
  const [line, setLine] = useState(-1); // -1 = title card
  const active = show && phase === "story";

  useEffect(() => {
    if (active) {
      setChapter(0);
      setLine(-1);
      store.emit("story:chapter", STORY[0]?.camera);
    }
  }, [active]);

  if (!active) return null;
  const ch = STORY[chapter]!;
  const isLast = chapter === STORY.length - 1 && line === ch.lines.length - 1;

  const advance = () => {
    if (line === -1) {
      setLine(0);
      return;
    }
    if (line < ch.lines.length - 1) {
      setLine(line + 1);
      return;
    }
    if (chapter < STORY.length - 1) {
      const next = chapter + 1;
      setChapter(next);
      setLine(-1);
      store.emit("story:chapter", STORY[next]!.camera);
      return;
    }
    store.emit("storyFinished");
  };

  return (
    <div className="absolute inset-0 z-30 cursor-pointer" onClick={advance}>
      {/* letterbox */}
      <div className="absolute top-0 inset-x-0 h-[9vh] bg-black" />
      <div className="absolute bottom-0 inset-x-0 h-[9vh] bg-black" />
      <div className="absolute top-[9vh] left-6 text-[10px] tracking-[0.5em] text-[#ffd97d]/80">
        {t(UI.storyMode, lang)}
      </div>

      {line === -1 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <div className="text-[clamp(1.3rem,3.5vw,2.2rem)] font-display tracking-[0.2em] text-[#f3ede0]">
              {t(ch.title, lang)}
            </div>
            <div className="mt-4 text-[10px] tracking-[0.4em] text-white/40">
              {t(UI.clickContinue, lang)} ▸
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-[12vh] inset-x-0 flex justify-center px-6">
          <div
            key={`${chapter}-${line}`}
            className="max-w-[680px] text-center text-[clamp(0.95rem,2vw,1.2rem)] leading-8 text-[#ece7db] animate-[fadein_0.8s_ease]"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}
          >
            {lang === "bn" ? ch.lines[line]!.bn : ch.lines[line]!.en}
          </div>
        </div>
      )}
      {line !== -1 && (
        <div className="absolute bottom-[9.5vh] right-6 text-[10px] tracking-[0.35em] text-white/40">
          {isLast ? "●●●●●" : t(UI.clickContinue, lang) + " ▸"}
        </div>
      )}
    </div>
  );
}

/* ---------------- Inspect panel ---------------- */
function InspectPanel() {
  const phase = useGame((s) => s.phase);
  const active = useGame((s) => s.activeHotspot);
  const visited = useGame((s) => s.visitedHotspots);
  const lang = useGame((s) => s.lang);
  if (phase !== "inspect") return null;
  const h = HOTSPOTS.find((x) => x.id === active);
  const allVisited = HOTSPOT_ORDER.every((id) => visited.includes(id));

  return (
    <>
      <div className="absolute top-6 left-6 z-30 text-[10px] tracking-[0.5em] text-[#ffd97d]/80">
        SOJOURNER — {t(UI.myHardware, lang)}
      </div>
      <div className="absolute top-6 right-20 z-30 flex gap-2">
        {HOTSPOT_ORDER.map((id) => (
          <div
            key={id}
            className={`w-2 h-2 rotate-45 ${visited.includes(id) ? "bg-[#9fd8ff]" : "bg-white/20"}`}
          />
        ))}
      </div>

      {h && (
        <div className="absolute right-0 top-0 bottom-0 z-30 w-[min(420px,92vw)] bg-black/70 backdrop-blur-md border-l border-white/10 p-7 overflow-y-auto animate-[slidein_0.35s_ease]">
          <button
            onClick={() => store.set({ activeHotspot: null })}
            className="absolute top-4 left-4 text-white/40 hover:text-white text-lg z-10"
          >
            ✕
          </button>
          <div className="text-[10px] tracking-[0.45em] text-white/40 mb-1">HARDWARE</div>
          <div className="text-2xl font-display tracking-[0.1em] text-[#ffd97d] mb-6">
            {t(h.label, lang)}
          </div>
          {[
            { k: UI.whatItDid, v: h.did, c: "#9fd8ff" },
            { k: UI.whyItMattered, v: h.mattered, c: "#ffd97d" },
            { k: UI.missionEvent, v: h.event, c: "#e0603f" },
          ].map(({ k, v, c }) => (
            <div key={k.en} className="mb-6">
              <div className="text-[10px] tracking-[0.4em] mb-2" style={{ color: c }}>
                {t(k, lang)}
              </div>
              <div className="text-sm leading-7 text-[#e6e1d4]">{t(v, lang)}</div>
            </div>
          ))}
        </div>
      )}

      {allVisited && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
          <div className="text-xs tracking-[0.25em] text-[#9fd8ff]">{t(UI.allVisited, lang)}</div>
          <button
            onClick={() => store.emit("finishInspect")}
            className="px-8 py-3 bg-[#ffd97d] text-black tracking-[0.3em] text-sm hover:bg-white transition-colors"
            style={{ transitionTimingFunction: POP }}
          >
            {t(UI.finishInspect, lang)} →
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- Chapter complete overlay ---------------- */
function CompleteOverlay() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (phase !== "complete") {
      setShow(false);
      return;
    }
    const off = store.on("ui:showComplete", () => setShow(true));
    return off;
  }, [phase]);
  if (phase !== "complete" || !show) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
      <div className="text-[clamp(2rem,6vw,4rem)] font-display tracking-[0.3em] text-[#f3ede0] animate-[fadein_1.5s_ease]">
        {t(UI.chapterComplete, lang)}
      </div>
      <div className="mt-3 text-[11px] tracking-[0.5em] text-[#ffd97d]">
        🚩 PATHFINDER / SOJOURNER
      </div>
      <button
        onClick={() => {
          const flags = store.get().flags;
          if (!flags.includes("pathfinder")) store.set({ flags: [...flags, "pathfinder"] });
          store.emit("nextChapter");
        }}
        className="pointer-events-auto mt-10 px-9 py-3 border border-[#ffd97d]/70 text-[#ffd97d] tracking-[0.3em] text-sm hover:bg-[#ffd97d] hover:text-black transition-all duration-200"
        style={{ transitionTimingFunction: POP }}
      >
        {t(UI.nextChapter, lang)} →
      </button>
    </div>
  );
}

/* ---------------- Journey map ---------------- */
function JourneyMap() {
  const phase = useGame((s) => s.phase);
  const flags = useGame((s) => s.flags);
  const lang = useGame((s) => s.lang);
  if (phase !== "map") return null;
  return (
    <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[min(480px,92vw)]">
        <div className="text-center text-[11px] tracking-[0.55em] text-[#e0603f] mb-8">
          🔴 {t(UI.marsJourney, lang)}
        </div>
        <div className="space-y-0">
          {MISSIONS.map((m, i) => {
            const done = flags.includes(m.id);
            const isFirst = i === 0;
            return (
              <div key={m.id} className="flex flex-col items-center">
                {i > 0 && <div className="w-px h-6 bg-white/15" />}
                <div
                  className={`w-full text-center py-4 border tracking-[0.2em] text-sm ${
                    done
                      ? "border-[#ffd97d]/60 text-[#ffd97d]"
                      : isFirst
                        ? "border-white/25 text-white/80"
                        : "border-white/10 text-white/30"
                  }`}
                >
                  {done ? "🚩" : isFirst ? "🚩" : "🔒"} {lang === "bn" ? m.bn : m.name}
                  {!done && !isFirst && (
                    <div className="text-[9px] tracking-[0.35em] text-white/25 mt-1">
                      {t(UI.completeFirst, lang)}
                    </div>
                  )}
                  {isFirst && !done && (
                    <button
                      onClick={() => store.emit("replay")}
                      className="block mx-auto mt-2 text-[10px] tracking-[0.3em] text-[#9fd8ff] hover:text-white"
                    >
                      {t(UI.replay, lang)} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center text-[10px] tracking-[0.3em] text-white/40">
          🌙 {t(UI.moon, lang)} — {t(UI.comingSoon, lang)}
        </div>
        <button
          onClick={() => store.emit("toSolar")}
          className="mt-6 mx-auto block text-[10px] tracking-[0.4em] text-white/50 hover:text-[#ffd97d] transition-colors"
        >
          ← {t(UI.backToSolar, lang)}
        </button>
      </div>
    </div>
  );
}

/* ---------------- HUD ---------------- */
function HUD() {
  const phase = useGame((s) => s.phase);
  const objective = useGame((s) => s.objective);
  const hint = useGame((s) => s.hint);
  const tutorialDone = useGame((s) => s.tutorialDone);
  const showChoice = useGame((s) => s.showChoice);
  const lang = useGame((s) => s.lang);
  return (
    <>
      {phase === "solar" && !tutorialDone && !showChoice && (
        <button
          onClick={() => store.emit("skipTutorial")}
          className="absolute bottom-6 right-6 z-30 text-[10px] tracking-[0.35em] text-white/40 hover:text-[#ffd97d] transition-colors"
        >
          SKIP GUIDE ▸▸
        </button>
      )}
      {objective && (phase === "explore" || phase === "moon") && (
        <div className="absolute top-6 left-6 z-20 border-l-2 border-[#ffd97d] pl-3">
          <div className="text-[9px] tracking-[0.45em] text-white/40 mb-1">OBJECTIVE</div>
          <div className="text-xs tracking-[0.15em] text-[#ece7db]">{t(objective, lang)}</div>
        </div>
      )}
      {hint && phase === "explore" && (
        <div className="absolute top-[4.5rem] right-6 z-20 text-[10px] tracking-[0.2em] text-white/40 text-right">
          {t(hint, lang)}
        </div>
      )}
    </>
  );
}

/* ---------------- Top controls ---------------- */
function TopControls() {
  const lang = useGame((s) => s.lang);
  const muted = useGame((s) => s.muted);
  const phase = useGame((s) => s.phase);
  if (phase === "home") return null;
  return (
    <div className="absolute top-5 right-5 z-50 flex gap-2">
      <button
        onClick={() => store.set({ lang: lang === "en" ? "bn" : "en" })}
        className="px-3 py-1.5 border border-white/20 text-[11px] tracking-[0.2em] text-white/70 hover:border-[#ffd97d] hover:text-[#ffd97d] transition-colors"
      >
        {t(UI.langBtn, lang)}
      </button>
      <button
        onClick={() => {
          const next = !muted;
          store.set({ muted: next });
          audio.setMuted(next);
        }}
        className="px-3 py-1.5 border border-white/20 text-[11px] tracking-[0.2em] text-white/70 hover:border-[#ffd97d] hover:text-[#ffd97d] transition-colors"
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}

/* ---------------- Touch action buttons (moon) ---------------- */
function pressKey(code: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code === "Space" ? " " : code.slice(3).toLowerCase(), bubbles: true }));
  setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code === "Space" ? " " : code.slice(3).toLowerCase(), bubbles: true })), 120);
}
function TouchActions() {
  const phase = useGame((s) => s.phase);
  const moonNear = useGame((s) => s.moonNear);
  const marsNear = useGame((s) => s.marsNear);
  const lang = useGame((s) => s.lang);
  if (phase !== "moon" && phase !== "explore") return null;
  const near = phase === "moon" ? moonNear : marsNear;
  const btn = "touch-btn rounded-full border border-[#ffd97d]/60 bg-black/45 text-[#ffd97d] font-semibold touch-none select-none active:scale-90 transition-transform flex items-center justify-center";
  return (
    <div className="touch-actions absolute z-30 flex items-end gap-3 [@media(pointer:fine)]:hidden">
      <button aria-label="Map (M)" className={btn + " w-12 h-12 text-lg"} onPointerDown={(e) => { e.preventDefault(); pressKey("KeyM"); }}>🗺️</button>
      {near && <button aria-label="Action (E)" className={btn + " w-16 h-16 text-sm bg-[#ffd97d]/25 animate-pulse"} onPointerDown={(e) => { e.preventDefault(); pressKey("KeyE"); }}>{lang === "bn" ? "দেখো" : "Look"}</button>}
      <button aria-label="Jump" className={btn + " w-20 h-20 text-base"} onPointerDown={(e) => { e.preventDefault(); pressKey("Space"); }}>{lang === "bn" ? "লাফ" : "Jump"}</button>
    </div>
  );
}

/* ---------------- Touch joystick ---------------- */
function Joystick() {
  const phase = useGame((s) => s.phase);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const active = useRef(false);
  if (phase !== "explore" && phase !== "moon") return null;
  return (
    <div
      ref={ref}
      className="mobile-joystick absolute bottom-8 left-8 z-30 w-28 h-28 rounded-full border border-white/20 bg-black/30 touch-none [@media(pointer:fine)]:hidden"
      onPointerDown={(e) => {
        active.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!active.current || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(len, 1) / len;
        setPos({ x: dx * k, y: dy * k });
        store.emit("joystick", { x: dx * k, y: -dy * k });
      }}
      onPointerCancel={(e) => (e.currentTarget as HTMLElement).dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))}
      onLostPointerCapture={() => {
        active.current = false;
        setPos({ x: 0, y: 0 });
        store.emit("joystick", { x: 0, y: 0 });
      }}
      onPointerUp={() => {
        active.current = false;
        setPos({ x: 0, y: 0 });
        store.emit("joystick", { x: 0, y: 0 });
      }}
    >
      <div
        className="absolute w-10 h-10 rounded-full bg-[#ffd97d]/50 left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${pos.x * 30}px), calc(-50% + ${pos.y * 30}px))`,
        }}
      />
    </div>
  );
}

/* ---------------- Homepage telemetry bar ---------------- */
function TelemetryBar() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);

  if (phase !== "home") return null;

  return (
    <div className="absolute top-0 inset-x-0 z-40 pointer-events-none">
      <div className="flex items-center justify-between px-4 sm:px-6 pt-3">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg"
          alt="NASA"
          className="h-9 sm:h-11 w-auto opacity-90 drop-shadow-lg"
        />
        <button
          onClick={() => {
            store.set({ lang: lang === "en" ? "bn" : "en" });
            audio.beep();
          }}
          className="pointer-events-auto px-3.5 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs tracking-[0.15em] text-white/80 hover:border-[#ffd97d] hover:text-[#ffd97d] transition-colors"
        >
          {t(UI.langBtn, lang)}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Mission Command Hub ---------------- */

type HubPanel = "chapters" | "howto" | "reset" | "trophy" | null;

const HUB_ACTIONS: {
  id: string;
  icon: string;
  label: { en: string; bn: string };
  desc: { en: string; bn: string };
  num: string;
  primary?: boolean;
}[] = [
  { id: "newgame", icon: "▶", label: HUB.newGame, desc: HUB.newGameSub, num: "01", primary: true },
  { id: "chapters", icon: "🚩", label: HUB.chapters, desc: HUB.chaptersSub, num: "02" },
  { id: "trophy", icon: "🎖️", label: { en: "HALL OF FAME", bn: "হল অফ ফেম" }, desc: { en: "Your rover medals", bn: "তোমার রোভার মেডেল" }, num: "03" },
  { id: "howto", icon: "🤖", label: HUB.howToPlay, desc: HUB.howtoSub, num: "04" },
  { id: "reset", icon: "🔄", label: HUB.resetGame, desc: HUB.resetSub, num: "05" },
  { id: "home", icon: "⌂", label: HUB.home, desc: HUB.homeSub, num: "06" },
];

function FlagMark({ tone }: { tone: "gold" | "locked" }) {
  return (
    <div className="hub-flag" aria-hidden>
      <div className={`hub-flag-pole ${tone === "gold" ? "hub-flag-pole-gold" : ""}`} />
      <div
        className={`hub-flag-cloth ${tone === "gold" ? "hub-flag-cloth-gold" : "hub-flag-cloth-locked"}`}
      />
    </div>
  );
}

function HubUI() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const universe = useGame((s) => s.universe);
  const flags = useGame((s) => s.flags);
  const hasSeenHubIntro = useGame((s) => s.hasSeenHubIntro);
  const [panel, setPanel] = useState<HubPanel>(null);
  useEffect(() => {
    if (panel && !store.get().hasSeenHubIntro) store.set({ hasSeenHubIntro: true, tutorialDone: true });
  }, [panel]);
  const [toast, setToast] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (phase === "hub") {
      setPanel(null);
      setToast(null);
      const id = window.setTimeout(() => setEntered(true), 250);
      return () => window.clearTimeout(id);
    }
    setEntered(false);
    return undefined;
  }, [phase]);

  if (phase !== "hub") return null;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2800);
  };

  const menuAction = (id: string) => {
    audio.beep();
    if (id === "newgame") {
      store.set({ hasSeenHubIntro: true });
      store.emit("hub:newgame");
    } else if (id === "home") {
      store.emit("engine:goto", "home");
    } else {
      setPanel((p) => (p === id ? null : (id as HubPanel)));
    }
  };

  const switchUniverse = (u: "mars" | "moon") => {
    if (u === universe) return;
    audio.beep(u === "moon" ? 640 : 500);
    voice.stop();
    store.set({ universe: u, hasSeenHubIntro: false });
    if (u === "moon") {
      showToast(lang === "bn" ? "🌙 চাঁদের কক্ষপথে স্বাগতম!" : "🌙 Welcome to lunar orbit!");
    }
  };

  const chapters = CHAPTERS.filter((c) => c.universe === universe);

  return (
    <>
      {/* Planetary Orbital Dock (Top Center) */}
      <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5">
        <div className="pointer-events-auto hub-planet-dock flex items-center gap-1">
          {(["mars", "moon"] as const).map((u) => (
            <button
              key={u}
              onClick={() => switchUniverse(u)}
              onPointerEnter={() => audio.beep()}
              className={`px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-[11px] tracking-[0.22em] whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                universe === u ? "hub-universe-active" : "text-white/60 hover:text-white/95"
              }`}
            >
              <span className="text-sm">{u === "mars" ? "🔴" : "⚪"}</span>
              <span>{t(u === "mars" ? HUB.marsExp : HUB.moonExp, lang)}</span>
            </button>
          ))}
        </div>
        <div className="hidden sm:block text-[9px] font-mono tracking-[0.28em] text-white/40 drop-shadow">
          {universe === "mars"
            ? "TARGET: MARS · LAT 19.33° N, LON 33.55° W"
            : "TARGET: MOON · LAT 0.67° N, LON 23.47° E"}
        </div>
      </div>

      {/* Nova AI Companion Terminal (Top Left - click to call Nova) */}
      {hasSeenHubIntro && (
      <div
        onClick={() => store.emit("hub:callNova")}
        className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30 max-w-[320px] pointer-events-auto cursor-pointer group"
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0 pointer-events-auto">
            <img
              src="/assets/aistudio/chact__2__4eb39933.png"
              alt="Nova AI Guide"
              referrerPolicy="no-referrer"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-[#00f0ff] object-contain p-1 bg-black/60 hub-nova-glow transition-transform group-hover:scale-105"
            />
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
          </div>
          <div className="pointer-events-auto hub-console-panel px-4 py-3 text-[#ece7db] animate-[fadein_0.9s_ease] border-[#00f0ff]/35 group-hover:border-[#00f0ff] transition-colors">
            <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-white/10">
              <span className="text-[9px] font-mono tracking-[0.22em] text-[#00f0ff]">
                AI CO-PILOT · NOVA
              </span>
              <span className="text-[8px] font-mono text-cyan-300/80 animate-pulse">
                {lang === "bn" ? "ট্যাপ করো 💬" : "TAP TO TALK 💬"}
              </span>
            </div>
            <div className="text-[12px] leading-relaxed text-[#ece7db]/95">
              {t(HUB.novaGreet, lang)}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Planetary Target Telemetry Widget (Bottom Left - shown after intro) */}
      {hasSeenHubIntro && (
        <div className="hidden md:block absolute bottom-6 left-6 z-30 pointer-events-none animate-[fadein_0.6s_ease]">
          <div className="pointer-events-auto hub-console-panel p-3.5 w-76">
            <div className="flex items-center justify-between text-[9px] font-mono tracking-[0.25em] text-white/45 pb-2 border-b border-white/10">
              <span className="text-[#00f0ff]">{t(HUB.metricsTitle, lang)}</span>
              <span className="text-[#ffd97d]">
                {universe === "mars" ? "ARES VALLIS" : "TRANQUILITY"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
              <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/5">
                <div className="text-[8px] text-white/40 tracking-wider font-mono">
                  {t(HUB.gravity, lang)}
                </div>
                <div className="text-[11px] font-mono text-[#ffd97d] font-semibold mt-0.5">
                  {universe === "mars" ? "0.38 G" : "0.16 G"}
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/5">
                <div className="text-[8px] text-white/40 tracking-wider font-mono">
                  {t(HUB.temp, lang)}
                </div>
                <div className="text-[11px] font-mono text-[#00f0ff] font-semibold mt-0.5">
                  {universe === "mars" ? "-63 °C" : "-130 °C"}
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/5">
                <div className="text-[8px] text-white/40 tracking-wider font-mono">
                  {t(HUB.atmosphere, lang)}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-0.5">
                  {universe === "mars" ? "CO₂ 95%" : "VACUUM"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right-Side Mission Command Console Menu */}
      <div
        className={`hub-console-wrap absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-30 transition-all duration-700 pointer-events-none ${
          entered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
        }`}
      >
        <div className="pointer-events-auto hub-console-panel w-[min(350px,92vw)] p-4 sm:p-5 flex flex-col gap-3">
          {/* Console Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse" />
              <span className="text-[10px] tracking-[0.3em] text-[#00f0ff] font-mono">
                {t(HUB.cmdConsole, lang)}
              </span>
            </div>
            <span className="text-[9px] tracking-[0.18em] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              ● {t(HUB.onlineStatus, lang)}
            </span>
          </div>

          <div className="text-[10px] tracking-[0.25em] text-white/40 uppercase -mt-0.5">
            {t(HUB.selectDirective, lang)}
          </div>

          {/* Menu Action Cards */}
          <div className="flex flex-col gap-2">
            {HUB_ACTIONS.map((a) => {
              const isTargetNewGame = a.primary && !hasSeenHubIntro;
              return (
                <div key={a.id} className="relative">
                  {/* Floating Animated Pointer for Target Button during Onboarding */}
                  {isTargetNewGame && (
                    <div className="absolute right-3 -top-6 sm:right-auto sm:-left-36 sm:top-1/2 sm:-translate-y-1/2 z-40 flex md:hidden items-center gap-1.5 pointer-events-none animate-gold-arrow">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-bold text-[10px] tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.9)] whitespace-nowrap">
                        {lang === "bn" ? "এখানে ট্যাপ করো!" : "TAP HERE!"}
                      </span>
                      <span className="text-amber-400 text-lg font-bold drop-shadow-[0_0_8px_rgba(245,158,11,1)]">
                        ➔
                      </span>
                    </div>
                  )}

                  <button
                    id={a.primary ? "hub-newgame-btn" : undefined}
                    onPointerEnter={() => audio.beep()}
                    onClick={() => menuAction(a.id)}
                    className={`w-full group relative ${
                      a.primary
                        ? isTargetNewGame
                          ? "hub-action-card hub-action-card-primary animate-gold-spotlight ring-2 sm:ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.85)]"
                          : "hub-action-card hub-action-card-primary"
                        : "hub-action-card"
                    }`}
                  >
                    <div className="hub-action-icon">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="hub-action-chip">{a.num}</span>
                        <span className="font-display tracking-[0.16em] text-[13px] text-[#f6f1e4] group-hover:text-[#ffd97d] transition-colors truncate">
                          {t(a.label, lang)}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/45 tracking-wide mt-0.5 truncate group-hover:text-white/75 transition-colors">
                        {t(a.desc, lang)}
                      </div>
                    </div>
                    <div className="text-[#ffd97d]/40 group-hover:text-[#ffd97d] group-hover:translate-x-1 transition-all text-sm font-bold pl-1">
                      ›
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Console Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[8px] font-mono tracking-widest text-white/35">
            <span>ASTRO-RELIC OS // V2.4</span>
            <span>DSN: ENCRYPTED</span>
          </div>
        </div>
      </div>

      {/* chapters panel with waving flags */}
      {panel === "chapters" && (
        <div className="absolute inset-0 z-40 flex items-center pl-4 sm:pl-10 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={() => setPanel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="pointer-events-auto hub-console-panel w-[min(420px,92vw)] p-6 animate-[hubrise_0.45s_ease]">
            <div className="flex items-center justify-between mb-1 pb-2 border-b border-white/10">
              <div className="text-[10px] tracking-[0.4em] text-[#ffd97d] font-mono">
                🚩 {t(HUB.chapterTrail, lang)}
              </div>
              <button
                onClick={() => setPanel(null)}
                aria-label="close"
                className="text-white/40 hover:text-white text-base leading-none px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-[10px] tracking-[0.25em] text-[#00f0ff] font-mono mt-1">
              {universe === "mars"
                ? `🔴 ${t(UI.mars, lang)} DIRECTORY`
                : `⚪ ${t(UI.moon, lang)} DIRECTORY`}
            </div>
            <div className="mt-4 space-y-2.5">
              {chapters.map((c, i) => {
                const done = ({ ch1: "sojourner", ch2: "spirit", ch3: "oppy", ch8: "insight" } as Record<string, string>)[c.id] ? flags.includes(({ ch1: "sojourner", ch2: "spirit", ch3: "oppy", ch8: "insight" } as Record<string, string>)[c.id]!) || (c.id === "ch1" && flags.includes("pathfinder")) : false;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (c.ready && c.universe === "moon") {
                        audio.beep(640);
                        voice.stop();
                        store.set({ moonZone: Math.max(0, ["ch4", "ch5", "ch6", "ch7"].indexOf(c.id)) });
                        store.emit("engine:goto", "moon");
                      } else if (c.ready) {
                        audio.beep();
                        voice.stop();
                        store.set({ marsZone: Math.max(0, ["ch1", "ch2", "ch3", "ch8"].indexOf(c.id)) });
                        store.emit("engine:goto", "explore");
                      } else {
                        audio.beep(320);
                        showToast(t(HUB.inProduction, lang));
                      }
                    }}
                    className={`hub-chapter ${c.ready ? "" : "hub-chapter-locked"}`}
                  >
                    <FlagMark tone={c.ready ? "gold" : "locked"} />
                    <span className="flex-1 min-w-0 text-left">
                      <span className="block text-[9px] tracking-[0.35em] text-white/40 mb-0.5">
                        CH {String(i + 1).padStart(2, "0")} · {t(c.tag, lang)}
                      </span>
                      <span className="block font-display text-[13px] tracking-[0.12em] text-[#f3ede0]">
                        {t(c.name, lang)}
                      </span>
                      {c.universe === "moon" && (() => {
                        const y = ({ ch4: 1969, ch5: 1969, ch6: 1971, ch7: 1972 } as Record<string, number>)[c.id];
                        return y ? (
                          <span className="block text-[9px] tracking-[0.2em] text-[#9fd8ff] mt-0.5">
                            ⏱️ {lang === "bn" ? `${new Date().getFullYear() - y} বছর ধরে নীরব` : `SILENT FOR ${new Date().getFullYear() - y} YEARS`}
                          </span>
                        ) : null;
                      })()}
                    </span>
                    <span className={`hub-badge ${c.ready ? "hub-badge-gold" : ""}`}>
                      {done ? t(HUB.done, lang) : c.ready ? t(HUB.launch, lang) : t(HUB.soon, lang)}
                    </span>
                  </button>
                );
              })}
              {chapters.length === 0 && (
                <div className="text-center text-[11px] tracking-[0.25em] text-white/50 py-6">
                  🌙 {t(HUB.moonSoon, lang)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* how-to-play modal */}
      {panel === "howto" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto p-4"
          onClick={() => setPanel(null)}
        >
          <div
            className="hub-console-panel w-[min(520px,94vw)] p-7 animate-[hubrise_0.45s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="text-[10px] tracking-[0.4em] text-[#00f0ff] font-mono">
                🤖 NOVA MISSION GUIDE
              </div>
              <button
                onClick={() => setPanel(null)}
                className="text-white/40 hover:text-white text-base leading-none px-2 py-0.5 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="font-display text-xl tracking-[0.15em] text-[#f3ede0]">
              {t(HUB.howToPlay, lang)}
            </div>
            <div className="mt-5 space-y-4">
              {HOWTO.map((s) => (
                <div
                  key={s.title.en}
                  className="flex gap-4 items-start p-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div className="text-2xl leading-none mt-0.5">{s.icon}</div>
                  <div>
                    <div className="text-sm tracking-[0.1em] text-[#ffd97d] font-display">
                      {t(s.title, lang)}
                    </div>
                    <div className="text-[12px] text-white/70 leading-relaxed mt-1 font-sans">
                      {t(s.body, lang)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setPanel(null)}
              className="hub-btn-gold mt-6 w-full cursor-pointer"
            >
              {t(HUB.close, lang)}
            </button>
          </div>
        </div>
      )}

      {panel === "trophy" && <TrophyHall lang={lang} onClose={() => setPanel(null)} />}

      {/* reset confirmation */}
      {panel === "reset" && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto p-4"
          onClick={() => setPanel(null)}
        >
          <div
            className="hub-console-panel w-[min(400px,92vw)] p-7 text-center animate-[hubrise_0.45s_ease] border-[#e0603f]/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl mb-3">⚠️</div>
            <div className="font-display text-base tracking-[0.12em] text-[#f3ede0]">
              {t(HUB.resetConfirm, lang)}
            </div>
            <div className="text-[12px] text-white/60 leading-relaxed mt-2">
              {t(HUB.resetWarn, lang)}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPanel(null)}
                className="hub-btn-ghost flex-1 cursor-pointer"
              >
                {t(HUB.no, lang)}
              </button>
              <button
                onClick={() => {
                  store.set({ flags: [], tutorialDone: false, hasSeenHubIntro: false });
                  audio.beep(320);
                  setPanel(null);
                  showToast(t(HUB.resetDone, lang));
                  window.setTimeout(() => store.emit("hub:callNova"), 400);
                }}
                className="hub-btn-danger flex-1 cursor-pointer"
              >
                {t(HUB.yes, lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 hub-glass rounded-full text-[11px] tracking-[0.2em] text-[#ffd97d] text-center animate-[hubtoast_0.35s_ease] pointer-events-none whitespace-nowrap max-w-[92vw]">
          {toast}
        </div>
      )}
    </>
  );
}

/* ---------------- Root overlays ---------------- */
export function Overlays() {
  const fading = useGame((s) => s.fading);
  const marsMapOpen = useGame((s) => s.phase === "explore" && s.bigMap);
  return (
    <>
      <HomeUI />
      <HubUI />
      <div className={marsMapOpen ? "hidden" : "contents"}><NovaGuide /></div>
      <Caption />
      <MarsIntroVideo />
      <div className={marsMapOpen ? "hidden" : "contents"}><Dialogue /></div>
      <JourneyChoice />
      <StoryOverlay />
      <InspectPanel />
      <CompleteOverlay />
      <JourneyMap />
      <SolarHUD />
      <HUD />
      <TelemetryBar />
      <TopControls />
      <Joystick />
      <TouchActions />
      <MobileLandscape />
      <SojournerEncounter />
      <SpiritEncounter />
      <OppyEncounter />
      <InsightEncounter />
      <FinaleUI />
      <MoonFinaleUI />
      <Apollo11Mission />
      <Apollo12Mission />
      <Apollo15Mission />
      <Apollo17Mission />
      <MoonControls />
      <MarsStarHunt />
      <Badges />
      <BigMapClose />
      <RoverLoader />
      {/* backdrop fade overlay */}
      <div
        className="absolute inset-0 z-[60] bg-black pointer-events-none transition-opacity duration-500"
        style={{ opacity: fading ? 1 : 0 }}
      />
    </>
  );
}

const TROPHIES = [
  { id: "ares-pioneer", rover: "Sojourner", year: "1997", icon: "🛞", name: { en: "Ares Pioneer", bn: "অ্যারেস পথিকৃৎ" }, fact: { en: "First wheels on Mars", bn: "মঙ্গলে প্রথম চাকা" } },
  { id: "gusev-fighter", rover: "Spirit", year: "2004–2010", icon: "💪", name: { en: "Gusev Fighter", bn: "গুসেভ যোদ্ধা" }, fact: { en: "Found silica with a broken wheel", bn: "ভাঙা চাকায় সিলিকা আবিষ্কার" } },
  { id: "meridiani-marathoner", rover: "Opportunity", year: "2004–2018", icon: "🏃", name: { en: "Meridiani Marathoner", bn: "মেরিডিয়ানি ম্যারাথনার" }, fact: { en: "45 km in 15 years", bn: "১৫ বছরে ৪৫ কিমি" } },
  { id: "silent-listener", rover: "InSight", year: "2018–2022", icon: "📡", name: { en: "Silent Listener", bn: "নীরব শ্রোতা" }, fact: { en: "Heard 1,300+ marsquakes", bn: "১৩০০+ মঙ্গলকম্পন শুনেছে" } },
  { id: "master-explorer", rover: "Grand Finale", year: "★", icon: "👑", name: { en: "Master Mars Explorer", bn: "মাস্টার মার্স এক্সপ্লোরার" }, fact: { en: "Planted the flag after all 4 missions", bn: "৪ মিশন শেষে পতাকা উড়িয়েছে" } },
];

function TrophyHall({ lang, onClose }: { lang: "en" | "bn"; onClose: () => void }) {
  const badges = useGame((s) => s.badges);
  const marsStars = useGame((s) => s.marsStars);
  const got = TROPHIES.filter((x) => badges.includes(x.id)).length;
  const master = got === TROPHIES.length;
  const L = (o: { en: string; bn: string }) => o[lang];
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 backdrop-blur-md pointer-events-auto p-4" onClick={onClose}>
      <div className="hub-console-panel w-[min(640px,95vw)] max-h-[90vh] overflow-y-auto p-6 sm:p-7 animate-[hubrise_0.45s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="text-[10px] tracking-[0.4em] text-[#ffd97d] font-mono">🎖️ RELIC HALL OF FAME</div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-lg">✕</button>
        </div>
        <div className={`text-center rounded-xl py-3 mb-5 border ${master ? "border-[#ffd97d] bg-[#ffd97d]/10 shadow-[0_0_30px_rgba(255,217,125,0.35)]" : "border-white/10 bg-white/5"}`}>
          <div className={`font-display tracking-[0.2em] text-lg ${master ? "text-[#ffd97d]" : "text-white/50"}`}>
            {master ? "👑 " : "🔒 "}{lang === "bn" ? "মাস্টার মার্স এক্সপ্লোরার" : "MASTER MARS EXPLORER"}
          </div>
          <div className="text-[11px] text-white/60 mt-1">{lang === "bn" ? `${got}/${TROPHIES.length} মেডেল পেয়েছো` : `${got}/${TROPHIES.length} medals earned`}</div>
          <div className="mx-auto mt-2 h-1.5 w-48 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#ffd97d] transition-all" style={{ width: `${(got / TROPHIES.length) * 100}%` }} />
          </div>
        </div>
        <div className="text-[10px] tracking-[0.3em] text-white/60 font-mono mb-2">🔴 MARS</div>
        <div className="grid grid-cols-2 gap-3">
          {TROPHIES.map((x) => {
            const on = badges.includes(x.id);
            return (
              <div key={x.id} className={`${x.id === "master-explorer" ? "col-span-2 " : ""}rounded-xl p-4 text-center border transition ${on ? "border-[#ffd97d]/70 bg-gradient-to-b from-[#ffd97d]/15 to-transparent" : "border-white/10 bg-white/5 opacity-60"}`}>
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 ${on ? "border-[#ffd97d] bg-[#3a2410] shadow-[0_0_18px_rgba(255,217,125,0.5)]" : "border-white/20 bg-black/40 grayscale"}`}>
                  {on ? x.icon : "🔒"}
                </div>
                <div className={`mt-2 text-sm font-bold ${on ? "text-[#ffd97d]" : "text-white/60"}`}>{L(x.name)}</div>
                <div className="text-[10px] tracking-[0.2em] text-white/50 mt-0.5">{x.rover.toUpperCase()} · {x.year}</div>
                <div className="text-[11px] text-white/70 mt-1.5">{on ? L(x.fact) : lang === "bn" ? "মিশন শেষ করে আনলক করো" : "Finish the mission to unlock"}</div>
              </div>
            );
          })}
        </div>
        <h3 className="text-relic-gold text-sm font-bold mt-6 mb-2">★ {lang === "bn" ? "মঙ্গলের স্টার হান্ট" : "Mars Star Hunt"} · {marsStars.length}/28</h3>
        <div className="grid grid-cols-2 gap-2">{MARS_REGIONS.map((r,zone)=><div key={r.en} className="rounded-lg border border-expedition-line bg-expedition text-expedition-ink p-3 text-center"><div>{zoneCount(marsStars,zone) === 7 ? "🏅" : "★"}</div><div className="text-sm font-bold">{r[lang]}</div><div className="text-relic-gold text-xs mt-1">{zoneCount(marsStars,zone)}/7 {lang === "bn" ? "আবিষ্কার" : "discoveries"}</div></div>)}</div>
        <div className="text-[10px] tracking-[0.3em] text-white/60 font-mono mt-6 mb-2">🌕 MOON · NASA MISSION PATCHES</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOON_PATCHES.map((p) => {
            const on = badges.includes(p.id);
            return (
              <div key={p.id} className={`rounded-xl p-3 text-center border ${on ? "border-[#ffd97d]/70 bg-[#ffd97d]/10" : "border-white/10 bg-white/5 opacity-60"}`}>
                <img src={p.img} alt={`${p.name} patch`} className={`w-16 h-16 mx-auto object-contain ${on ? "drop-shadow-[0_0_10px_rgba(255,217,125,0.6)]" : "grayscale"}`} />
                <div className={`mt-1 text-xs font-bold ${on ? "text-[#ffd97d]" : "text-white/60"}`}>{p.badge}</div>
                <div className="text-[10px] text-white/50">{p.name.toUpperCase()} · {p.year}</div>
              </div>
            );
          })}
        </div>
        <div className={`mt-3 rounded-xl p-3 text-center border ${badges.includes("master-lunar") ? "border-[#ffd97d] bg-[#ffd97d]/10" : "border-white/10 bg-white/5 opacity-60"}`}>
          <div className="text-sm font-bold text-[#ffd97d]">{badges.includes("master-lunar") ? "🌕 " : "🔒 "}{lang === "bn" ? "মাস্টার লুনার এক্সপ্লোরার" : "Master Lunar Explorer"}</div>
          {badges.includes("master-lunar") && (
            <button className="mt-2 text-xs underline text-white/80" onClick={() => { onClose(); store.emit("moonfinale:open"); }}>{lang === "bn" ? "🎓 সনদ ও সেলফি আবার খোলো" : "🎓 Reopen certificate & selfie"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
