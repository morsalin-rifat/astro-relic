import { store, useGame } from "../state/store";
import { audio } from "../game/audio";

/** Game settings: language, music/voice volume, camera drag speed. Opened from hub menu or in-game ⚙️. */
export function SettingsButton() {
  const phase = useGame((s) => s.phase);
  if (phase === "hub") return null;
  return (
    <button
      aria-label="Settings"
      onClick={() => { audio.beep(); store.set({ showSettings: true }); }}
      className="px-3 py-1.5 border border-white/20 text-[13px] text-white/80 hover:border-[#ffd97d] hover:text-[#ffd97d] transition-colors pointer-events-auto"
    >⚙️</button>
  );
}

export function SettingsPanel() {
  const s = useGame((g) => g);
  if (!s.showSettings) return null;
  const bn = s.lang === "bn";
  const B = (en: string, b: string) => (bn ? b : en);
  const close = () => store.set({ showSettings: false });
  const row = "flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-3";
  const pill = (on: boolean) => `flex-1 rounded-full px-3 py-2 text-sm font-semibold border transition-colors ${on ? "bg-[#ffd97d] text-black border-[#ffd97d]" : "border-white/25 text-white/80"}`;
  const sens = [{ v: 0.6, en: "Slow", bn: "ধীর" }, { v: 1, en: "Normal", bn: "স্বাভাবিক" }, { v: 1.5, en: "Fast", bn: "দ্রুত" }];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 pointer-events-auto" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="hub-console-panel w-[min(440px,94vw)] max-h-[92vh] overflow-y-auto p-5 flex flex-col gap-3 text-[#ece7db] animate-[hubrise_0.35s_ease]">
        <div className="flex items-center justify-between">
          <h2 className="font-display tracking-[0.2em] text-lg text-[#ffd97d]">⚙️ {B("SETTINGS", "সেটিংস")}</h2>
          <button onClick={close} aria-label="Close" className="w-9 h-9 rounded-full border border-white/20 hover:border-[#ffd97d]">✕</button>
        </div>

        <div className={row}>
          <span className="text-sm">🌐 {B("Language", "ভাষা")}</span>
          <div className="flex gap-2">
            <button className={pill(!bn)} onClick={() => store.set({ lang: "en" })}>English</button>
            <button className={pill(bn)} onClick={() => store.set({ lang: "bn" })}>বাংলা</button>
          </div>
        </div>

        <div className={row}>
          <div className="flex justify-between text-sm"><span>🎵 {B("Music", "মিউজিক")}</span><span>{Math.round(s.musicVol * 100)}%</span></div>
          <input type="range" min={0} max={1} step={0.05} value={s.musicVol} className="w-full accent-[#ffd97d]"
            onChange={(e) => { store.set({ musicVol: +e.target.value }); audio.refreshVolume(); }} />
        </div>

        <div className={row}>
          <div className="flex justify-between text-sm"><span>🗣️ {B("Voice", "ভয়েস")}</span><span>{Math.round(s.voiceVol * 100)}%</span></div>
          <input type="range" min={0} max={1} step={0.05} value={s.voiceVol} className="w-full accent-[#ffd97d]"
            onChange={(e) => store.set({ voiceVol: +e.target.value })} />
        </div>

        <div className={row}>
          <span className="text-sm">🔇 {B("All sound", "সব শব্দ")}</span>
          <div className="flex gap-2">
            <button className={pill(!s.muted)} onClick={() => { store.set({ muted: false }); audio.setMuted(false); }}>{B("On", "চালু")}</button>
            <button className={pill(s.muted)} onClick={() => { store.set({ muted: true }); audio.setMuted(true); }}>{B("Off", "বন্ধ")}</button>
          </div>
        </div>

        <div className={row}>
          <span className="text-sm">👆 {B("Camera turn speed (swipe)", "ক্যামেরা ঘোরানোর গতি (সোয়াইপ)")}</span>
          <div className="flex gap-2">
            {sens.map((o) => <button key={o.v} className={pill(s.camSens === o.v)} onClick={() => store.set({ camSens: o.v })}>{bn ? o.bn : o.en}</button>)}
          </div>
        </div>

        <button onClick={close} className="hub-btn-gold w-full mt-1">{B("DONE", "ঠিক আছে")}</button>
      </div>
    </div>
  );
}
