import { useEffect, useRef } from "react";
import { store, useGame } from "../state/store";

/** Soft structure-borne motor hum (felt through the seat — no air on the Moon). */
function useRoverHum(driving: boolean, speed: number) {
  const r = useRef<{ ctx: AudioContext; o: OscillatorNode; g: GainNode } | null>(null);
  useEffect(() => {
    if (!driving) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(lp); lp.connect(g); g.connect(ctx.destination); o.start();
      r.current = { ctx, o, g };
    } catch { /* no audio */ }
    return () => { r.current?.o.stop(); r.current?.ctx.close(); r.current = null; };
  }, [driving]);
  useEffect(() => {
    const a = r.current; if (!a) return;
    const t = a.ctx.currentTime, k = Math.min(speed / 12, 1);
    a.o.frequency.setTargetAtTime(55 + k * 90, t, 0.25);
    a.g.gain.setTargetAtTime((0.012 + k * 0.03) * (store.get().musicVol ?? 1), t, 0.25);
  }, [speed]);
}

/** Lunar Rover ride/drive controls (Apollo 15 & 17). Scene logic lives in moonWorld; this only shows prompts + touch pedals. */
export function RoverDrive() {
  const phase = useGame((s) => s.phase);
  const near = useGame((s) => s.moonRover);
  const driving = useGame((s) => s.moonDriving);
  const speed = useGame((s) => s.moonSpeed);
  const freeze = useGame((s) => s.moonFreeze);
  const dist = useGame((s) => s.moonRoverDist);
  const bn = useGame((s) => s.lang) === "bn";
  useRoverHum(driving && phase === "moon", speed);
  if (phase === "moon" && !freeze && !near && !driving && dist > 0) {
    const far = dist > 35;
    return (
      <div className="rover-tip absolute z-40 left-1/2 -translate-x-1/2 bottom-24 pointer-events-none max-w-[86vw] rounded-2xl border border-[#ffd97d]/60 bg-black/70 px-4 py-2 text-center text-sm text-[#ffd97d] font-semibold">
        {far
          ? (bn ? `💡 রোভার মিস করেছ! ${dist} মিটার পেছনে আছে — ফিরে গিয়ে চড়ে বসো, দ্রুত পৌঁছাবে।` : `💡 You missed the rover! It's ${dist} m back — go ride it, it's much faster.`)
          : (bn ? `🏎️ লুনার রোভার ${dist} মিটার দূরে — কাছে গিয়ে চড়ে বসো!` : `🏎️ The Lunar Rover is ${dist} m away — walk up and hop in!`)}
      </div>
    );
  }
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
          <div className="rover-dash absolute z-40 left-1/2 -translate-x-1/2 top-[6.5rem] pointer-events-none max-w-[min(90vw,30rem)] rounded-xl bg-black/55 px-3 py-1 text-center text-[10px] leading-snug text-white/85">
            🔇 {bn ? "চাঁদে বাতাস নেই, তাই বাইরে কোনো শব্দ ছড়ায় না। তুমি যে মৃদু গুঞ্জন শুনছ, তা সিট আর স্পেসস্যুটের কম্পন দিয়ে আসছে!" : "No air on the Moon, so sound can't travel outside. The soft hum you hear comes through the seat and your spacesuit!"}
          </div>
          {speed <= 2 && (
            <button onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); store.emit("rover:toggle"); }}
              className="rover-ride absolute z-40 left-1/2 -translate-x-1/2 bottom-24 pointer-events-auto rounded-2xl border-2 border-[#ffd97d] bg-black/70 px-5 py-3 text-[#ffd97d] font-bold text-base">
              🚪 {bn ? "রোভার থেকে নামো" : "Get out of Rover"} <kbd className="ml-2 hidden [@media(pointer:fine)]:inline rounded bg-white/15 px-1.5 font-mono text-xs">F</kbd>
            </button>
          )}
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
