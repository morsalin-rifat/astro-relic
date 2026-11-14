import { useState } from "react";
import { useGame } from "../state/store";

/** Key guide on the Moon (top centre, closable) so kids know what to press. */
export function MoonControls() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const [open, setOpen] = useState(true);
  const driving = useGame((s) => s.moonDriving);
  if (phase !== "moon" || driving) return null;
  const bn = lang === "bn";
  const keys: [string, string][] = [["W A S D", bn ? "হাঁটো" : "Walk"], ["SPACE", bn ? "লাফ" : "Jump"], ["E", bn ? "কথা বলো / দেখো" : "Talk / Inspect"], ["M", bn ? "বড় ম্যাপ" : "Big map"], ["ESC", bn ? "হাব" : "Hub"]];
  if (!open) return (
    <button onClick={() => setOpen(true)} title={bn ? "কন্ট্রোল দেখাও" : "Show controls"} className="kbd-bar hidden md:flex absolute z-30 top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 border border-white/15 px-3 py-1 text-sm pointer-events-auto">⌨️</button>
  );
  return (
    <div className="kbd-bar hidden md:flex absolute z-30 top-3 left-1/2 -translate-x-1/2 items-center gap-3 rounded-full bg-black/55 border border-white/15 pl-4 pr-1.5 py-1 text-[11px] text-white/85 pointer-events-auto">
      {keys.map(([k, l]) => (
        <span key={k} className="flex items-center gap-1.5"><kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#ffd97d]">{k}</kbd>{l}</span>
      ))}
      <button onClick={() => setOpen(false)} aria-label="Close" className="ml-1 w-6 h-6 rounded-full hover:bg-white/15 text-white/70">✕</button>
    </div>
  );
}
