import { store, useGame } from "../state/store";

/** Lunar Rover ride/drive controls (Apollo 15 & 17). Scene logic lives in moonWorld; this only shows prompts + touch pedals. */
export function RoverDrive() {
  const phase = useGame((s) => s.phase);
  const near = useGame((s) => s.moonRover);
  const driving = useGame((s) => s.moonDriving);
  const speed = useGame((s) => s.moonSpeed);
  const freeze = useGame((s) => s.moonFreeze);
  const bn = useGame((s) => s.lang) === "bn";
  if (phase !== "moon" || freeze || (!near && !driving)) return null;
  const hold = (k: "gas" | "brake", on: boolean) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); store.emit("drive", { [k]: on }); };
  const pedal = "touch-none select-none rounded-full border-2 font-bold flex flex-col items-center justify-center active:scale-90 transition-transform shadow-lg";
  return (
    <>
      {!driving && (
        <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); store.emit("rover:toggle"); }}
          className="rover-ride absolute z-40 left-1/2 -translate-x-1/2 bottom-24 pointer-events-auto rounded-2xl border-2 border-[#ffd97d] bg-black/70 px-5 py-3 text-[#ffd97d] font-bold text-base animate-pulse">
          🏎️ {bn ? "রোভারে ওঠো" : "Ride the Moon Rover"} <kbd className="ml-2 hidden [@media(pointer:fine)]:inline rounded bg-white/15 px-1.5 font-mono text-xs">F</kbd>
        </button>
      )}
      {driving && (
        <>
          <div className="rover-dash absolute z-40 left-1/2 -translate-x-1/2 top-14 pointer-events-none flex items-center gap-3 rounded-2xl border border-[#ffd97d]/50 bg-black/65 px-4 py-2 text-white">
            <span className="text-2xl font-black text-[#ffd97d] tabular-nums w-12 text-right">{speed}</span>
            <span className="text-[11px] leading-tight text-white/70">km/h<br />LRV</span>
            <span className="hidden [@media(pointer:fine)]:flex gap-2 text-[11px] text-white/80 ml-2">
              <span><kbd className="rounded bg-white/15 px-1 font-mono text-[#ffd97d]">W</kbd> {bn ? "চালাও" : "Go"}</span>
              <span><kbd className="rounded bg-white/15 px-1 font-mono text-[#ffd97d]">S</kbd> {bn ? "ব্রেক/পেছনে" : "Brake/Back"}</span>
              <span><kbd className="rounded bg-white/15 px-1 font-mono text-[#ffd97d]">A D</kbd> {bn ? "ঘোরাও" : "Steer"}</span>
              <span><kbd className="rounded bg-white/15 px-1 font-mono text-[#ffd97d]">F</kbd> {bn ? "নামো" : "Get off"}</span>
            </span>
          </div>
          <div className="rover-pedals absolute z-40 right-5 bottom-6 flex items-end gap-3 pointer-events-auto [@media(pointer:fine)]:hidden">
            <button aria-label="Get off" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); store.emit("rover:toggle"); }} className={pedal + " w-12 h-12 text-[10px] border-white/50 bg-black/55 text-white"}>🚶<span>{bn ? "নামো" : "Exit"}</span></button>
            <button aria-label="Brake" onPointerDown={hold("brake", true)} onPointerUp={hold("brake", false)} onPointerCancel={hold("brake", false)} onPointerLeave={hold("brake", false)} className={pedal + " w-16 h-16 text-xs border-[#ff6b5b] bg-[#ff6b5b]/30 text-white"}>🛑<span>{bn ? "ব্রেক" : "Brake"}</span></button>
            <button aria-label="Go" onPointerDown={hold("gas", true)} onPointerUp={hold("gas", false)} onPointerCancel={hold("gas", false)} onPointerLeave={hold("gas", false)} className={pedal + " w-20 h-20 text-sm border-[#5bff9a] bg-[#5bff9a]/30 text-white"}>🚀<span>{bn ? "চালাও" : "Go"}</span></button>
          </div>
        </>
      )}
    </>
  );
}
