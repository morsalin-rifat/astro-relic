import { store, useGame, t } from "../state/store";
import { UI } from "../data/content";

export function SolarHUD() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const selectedPlanetId = useGame((s) => s.selectedPlanet);
  const orbitSpeed = useGame((s) => s.orbitSpeed ?? 1);
  const tutorialDone = useGame((s) => s.tutorialDone);
  const showChoice = useGame((s) => s.showChoice);

  if (phase !== "solar" && phase !== "map") return null;

  const selectWorld = (id: "Mars" | "Moon" | null) => {
    store.emit("solar:selectPlanet", id);
  };

  const launchMars = () => {
    store.set({ showChoice: false, current: null, queue: [] });
    store.emit("choose:mars");
  };

  const toggleOrbitSpeed = () => {
    const next = orbitSpeed === 0 ? 1 : orbitSpeed === 1 ? 3 : 0;
    store.set({ orbitSpeed: next });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 sm:p-7 select-none font-sans">
      {/* ---------------- TOP BAR: CINEMATIC GAME STATUS ---------------- */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Minimal Game Header with Nova AI Guide */}
        <div className="pointer-events-auto flex items-center gap-3 bg-black/70 backdrop-blur-md border border-white/15 px-3 py-2 rounded-xl shadow-2xl">
          <img
            src="/images/nova.png"
            alt="Nova AI Guide"
            className="w-10 h-10 rounded-full border border-[#00f0ff] object-cover shadow-[0_0_10px_rgba(0,240,255,0.5)]"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-[9px] tracking-[0.3em] text-[#00f0ff] font-bold uppercase">
              NOVA AI GUIDE
            </div>
            <div className="text-xs sm:text-sm font-bold tracking-[0.15em] text-[#f3ede0] uppercase">
              {selectedPlanetId === "Mars"
                ? lang === "bn"
                  ? "টার্গেট: মঙ্গল গ্রহ"
                  : "TARGET: MARS"
                : selectedPlanetId === "Moon"
                  ? lang === "bn"
                    ? "টার্গেট: চাঁদ"
                    : "TARGET: THE MOON"
                  : lang === "bn"
                    ? "গন্তব্য বেছে নিন"
                    : "CHOOSE DESTINATION"}
            </div>
          </div>
        </div>

        {/* Right: Minimal Game Control Pills */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-1.5 rounded-lg mr-28 sm:mr-32">
          {selectedPlanetId && (
            <button
              onClick={() => selectWorld(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium tracking-wider text-white/80 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
            >
              <span>↺</span>
              <span>{lang === "bn" ? "সামগ্রিক দৃশ্য" : "OVERVIEW"}</span>
            </button>
          )}

          <button
            onClick={toggleOrbitSpeed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium tracking-wider text-white/80 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
          >
            <span>{orbitSpeed === 0 ? "⏸" : "▶"}</span>
            <span>
              {orbitSpeed === 0 ? (lang === "bn" ? "স্থগিত" : "PAUSED") : `${orbitSpeed}x`}
            </span>
          </button>
        </div>
      </div>

      {/* ---------------- RIGHT SIDE: TWO WORLDS SELECTION CARDS ---------------- */}
      {/* As specified in Master Plan: ONLY Mars and Moon! */}
      <div className="pointer-events-auto absolute right-5 top-24 flex flex-col gap-3 w-[min(320px,88vw)]">
        {/* WORLD 1: MARS (Primary Destination) */}
        <div
          onClick={() => selectWorld("Mars")}
          className={`cursor-pointer group relative p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${
            selectedPlanetId === "Mars"
              ? "bg-[#c1543a]/25 border-[#ffd97d] shadow-[0_0_25px_rgba(224,96,63,0.35)] scale-[1.02]"
              : "bg-black/65 border-[#c1543a]/40 hover:border-[#ffd97d]/80 hover:bg-[#c1543a]/15"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase px-2 py-0.5 rounded bg-[#c1543a] text-white">
              {lang === "bn" ? "প্রথম অভিযান" : "PRIMARY MISSION"}
            </span>
            <span className="text-xs text-[#ffd97d] font-bold">🔴 1997</span>
          </div>

          <h3 className="text-lg font-bold tracking-wider text-[#f3ede0] group-hover:text-white transition-colors">
            {t(UI.mars, lang)}
          </h3>
          <p className="text-xs text-white/70 leading-relaxed mt-1">{t(UI.marsDesc, lang)}</p>

          <div className="mt-3 text-[10px] tracking-[0.25em] text-[#ffd97d] flex items-center gap-1.5">
            <span>🚩</span>
            <span>PATHFINDER · SOJOURNER</span>
          </div>

          {selectedPlanetId === "Mars" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                launchMars();
              }}
              className="mt-4 w-full py-2.5 px-4 bg-gradient-to-r from-[#e0603f] to-[#ff9d6b] hover:from-[#ff6b47] hover:to-[#ffb68d] text-black font-bold text-xs tracking-[0.25em] uppercase rounded shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>{lang === "bn" ? "মঙ্গলে অবতরণ শুরু" : "BEGIN MARS DESCENT"} →</span>
            </button>
          )}
        </div>

        {/* WORLD 2: MOON (Chapter 02 - Locked) */}
        <div
          onClick={() => selectWorld("Moon")}
          className={`cursor-pointer group relative p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${
            selectedPlanetId === "Moon"
              ? "bg-white/15 border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-[1.02]"
              : "bg-black/50 border-white/10 hover:border-white/30 opacity-70 hover:opacity-90"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase px-2 py-0.5 rounded bg-white/10 text-white/70">
              {lang === "bn" ? "অধ্যায় ০২" : "CHAPTER 02"}
            </span>
            <span className="text-xs text-white/50">🌙</span>
          </div>

          <h3 className="text-lg font-bold tracking-wider text-white/80">{t(UI.moon, lang)}</h3>
          <p className="text-xs text-white/50 leading-relaxed mt-1">{t(UI.moonDesc, lang)}</p>

          <div className="mt-3 text-[10px] tracking-[0.2em] text-white/40 flex items-center gap-1.5">
            <span>🔒</span>
            <span>{t(UI.comingSoon, lang)}</span>
          </div>
        </div>
      </div>

      {/* ---------------- BOTTOM BAR: MINIMAL GAME HINT & SKIP GUIDE ---------------- */}
      <div className="flex items-end justify-between">
        {/* Subtle Game Interaction Hint */}
        <div className="pointer-events-auto bg-black/40 backdrop-blur-sm border border-white/5 px-4 py-2 rounded text-[10px] tracking-[0.25em] text-white/50">
          {selectedPlanetId
            ? lang === "bn"
              ? "মাউস দিয়ে ঘোরান • জুম ইন-আউট করুন"
              : "DRAG TO ROTATE WORLD • SCROLL TO ZOOM"
            : lang === "bn"
              ? "মঙ্গল বা চাঁদে ক্লিক করুন • চারপাশ দেখতে মাউস টানুন"
              : "CLICK MARS OR MOON • DRAG TO ROTATE SOLAR SYSTEM"}
        </div>

        {/* Skip Tutorial Button */}
        {!tutorialDone && !showChoice && (
          <button
            onClick={() => store.emit("skipTutorial")}
            className="pointer-events-auto text-[10px] tracking-[0.3em] text-white/40 hover:text-[#ffd97d] transition-colors pb-1"
          >
            {lang === "bn" ? "টিউটোরিয়াল এড়িয়ে যান ▸▸" : "SKIP GUIDE ▸▸"}
          </button>
        )}
      </div>
    </div>
  );
}
