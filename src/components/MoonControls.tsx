import { useGame } from "../state/store";

/** Small always-visible key guide on the Moon so kids know what to press. */
export function MoonControls() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  if (phase !== "moon") return null;
  const bn = lang === "bn";
  const keys: [string, string][] = [["W A S D", bn ? "হাঁটো" : "Walk"], ["SPACE", bn ? "লাফ" : "Jump"], ["E", bn ? "কথা বলো / দেখো" : "Talk / Inspect"], ["M", bn ? "বড় ম্যাপ" : "Big map"], ["ESC", bn ? "হাব" : "Hub"]];
  return (
    <div className="hidden md:flex absolute z-30 bottom-3 left-1/2 -translate-x-1/2 gap-3 rounded-full bg-black/55 border border-white/15 px-4 py-1.5 text-[11px] text-white/85 pointer-events-none">
      {keys.map(([k, l]) => (
        <span key={k} className="flex items-center gap-1.5"><kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#ffd97d]">{k}</kbd>{l}</span>
      ))}
    </div>
  );
}
