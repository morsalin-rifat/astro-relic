import { useEffect, useRef, useState } from "react";
import { store, useGame } from "../state/store";

type L = { en: string; bn: string };
const GOLD = "#ffd97d";
const ROVERS: { id: string; name: string; years: string; badge: string; icon: string; legacy: L }[] = [
  { id: "ares-pioneer", name: "Sojourner", years: "1997", badge: "Ares Pioneer", icon: "🛞", legacy: { en: "First wheels on Mars", bn: "মঙ্গলে প্রথম চাকা" } },
  { id: "gusev-fighter", name: "Spirit", years: "2004–2010", badge: "Gusev Fighter", icon: "💪", legacy: { en: "Found silica with a broken wheel", bn: "ভাঙা চাকায় সিলিকা আবিষ্কার" } },
  { id: "meridiani-marathoner", name: "Opportunity", years: "2004–2018", badge: "Meridiani Marathoner", icon: "🏃", legacy: { en: "45 km in 15 years", bn: "১৫ বছরে ৪৫ কিমি" } },
  { id: "silent-listener", name: "InSight", years: "2018–2022", badge: "Silent Listener", icon: "📡", legacy: { en: "Heard 1,300+ marsquakes", bn: "১৩০০+ মঙ্গলকম্পন শুনেছে" } },
];
const TX = {
  ready: { en: "One last task, explorer. Plant the flag for the rovers who never came home.", bn: "শেষ একটা কাজ, অভিযাত্রী। যারা আর ফেরেনি, সেই রোভারদের জন্য পতাকা ওড়াও।" },
  plant: { en: "🚩 Plant the Flag", bn: "🚩 পতাকা ওড়াও" },
  later: { en: "Later", bn: "পরে" },
  next: { en: "Continue ▸", bn: "এগিয়ে চলো ▸" },
  debrief: { en: "MISSION DEBRIEF", bn: "মিশন রিপোর্ট" },
  closing: { en: "They were abandoned, but never forgotten. Because of you, their stories live on. Welcome to the Hall of Mars Legends.", bn: "ওরা পরিত্যক্ত হয়েছিল, কিন্তু কখনো ভুলে যাওয়া হয়নি। তোমার কারণেই ওদের গল্প বেঁচে থাকবে। মঙ্গল কিংবদন্তিদের হলে স্বাগতম।" },
  cert: { en: "🎓 Get My Certificate", bn: "🎓 আমার সনদ নাও" },
  name: { en: "Your name", bn: "তোমার নাম" },
  dl: { en: "⬇ Download Certificate", bn: "⬇ সনদ ডাউনলোড" },
  keep: { en: "Keep Exploring", bn: "ঘুরতে থাকো" },
  hub: { en: "🏛️ Back to Hub", bn: "🏛️ হাবে ফেরো" },
  home: { en: "🏠 Go to Home", bn: "🏠 হোমে যাও" },
};

function drawCert(name: string) {
  const c = document.createElement("canvas");
  c.width = 1600; c.height = 1100;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, 1100);
  bg.addColorStop(0, "#1a0d14"); bg.addColorStop(1, "#4a1d12");
  g.fillStyle = bg; g.fillRect(0, 0, 1600, 1100);
  g.strokeStyle = GOLD; g.lineWidth = 10; g.strokeRect(40, 40, 1520, 1020);
  g.lineWidth = 2; g.strokeRect(64, 64, 1472, 972);
  g.textAlign = "center"; g.fillStyle = GOLD;
  g.font = "bold 40px sans-serif"; g.fillText("ASTRO RELIC · MARS", 800, 170);
  g.font = "bold 84px serif"; g.fillText("Junior Mars Historian", 800, 290);
  g.fillStyle = "#f5e6d3"; g.font = "32px sans-serif"; g.fillText("This certifies that", 800, 380);
  g.font = "bold 72px serif"; g.fillStyle = "#ffffff"; g.fillText(name || "Explorer", 800, 480);
  g.fillStyle = "#f5e6d3"; g.font = "30px sans-serif";
  g.fillText("honored the four abandoned explorers of Mars", 800, 550);
  ROVERS.forEach((r, i) => {
    const x = 320 + i * 320, y = 720;
    g.beginPath(); g.arc(x, y, 90, 0, Math.PI * 2); g.fillStyle = "#2a1410"; g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 6; g.stroke();
    g.font = "70px sans-serif"; g.fillText(r.icon, x, y + 25);
    g.fillStyle = GOLD; g.font = "bold 26px sans-serif"; g.fillText(r.name, x, y + 140);
    g.fillStyle = "#f5e6d3"; g.font = "20px sans-serif"; g.fillText(r.badge, x, y + 172);
  });
  g.fillStyle = "#c9a88a"; g.font = "24px sans-serif";
  g.fillText(new Date().toLocaleDateString(), 800, 990);
  const a = document.createElement("a");
  a.download = "mars-historian-certificate.png"; a.href = c.toDataURL("image/png"); a.click();
}

export function FinaleUI() {
  const phase = useGame((s) => s.phase);
  const badges = useGame((s) => s.badges);
  const flags = useGame((s) => s.flags);
  const lang = useGame((s) => s.lang);
  const showInsight = useGame((s) => s.showInsight);
  const [step, setStep] = useState<"idle" | "ready" | "ceremony" | "debrief" | "cert">("idle");
  const [lit, setLit] = useState(0);
  const [typed, setTyped] = useState(0);
  const [name, setName] = useState("");
  const tt = (l: L) => l[lang as "en" | "bn"] ?? l.en;
  const all = ROVERS.every((r) => badges.includes(r.id));
  const done = flags.includes("finale");
  const timer = useRef<number[]>([]);

  useEffect(() => {
    if (phase === "explore" && all && !done && !showInsight && step === "idle") {
      const id = window.setTimeout(() => setStep("ready"), 2500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [phase, all, done, showInsight, step]);

  useEffect(() => {
    if (step !== "ceremony") return;
    setLit(0);
    timer.current = [1, 2, 3, 4].map((n) => window.setTimeout(() => setLit(n), 1400 + n * 900));
    timer.current.push(window.setTimeout(() => setStep("debrief"), 7500));
    return () => timer.current.forEach(clearTimeout);
  }, [step]);

  useEffect(() => {
    if (step !== "debrief") return;
    setTyped(0);
    const full = tt(TX.closing).length;
    const id = window.setInterval(() => setTyped((v) => (v >= full ? (clearInterval(id), v) : v + 1)), 35);
    return () => clearInterval(id);
  }, [step, lang]);

  if (phase !== "explore" || step === "idle") return null;

  const finish = (hub: boolean | "home") => {
    store.set({ flags: Array.from(new Set([...store.get().flags, "finale"])) });
    store.awardBadge("master-explorer");
    setStep("idle");
    if (hub) store.emit("engine:goto", hub === "home" ? "home" : "hub");
  };
  const btn = "min-h-12 px-6 py-3 rounded-full font-bold tracking-wider transition hover:scale-105 active:scale-95";

  if (step === "ready")
    return (
      <div className="fixed left-1/2 bottom-28 -translate-x-1/2 z-[60] w-[min(92vw,560px)] rounded-2xl border p-5 text-center backdrop-blur-md animate-in fade-in slide-in-from-bottom-4"
        style={{ borderColor: GOLD, background: "rgba(30,12,8,.85)", boxShadow: `0 0 40px ${GOLD}55` }}>
        <div className="text-xs tracking-[0.3em] mb-2" style={{ color: GOLD }}>★ NOVA · FINAL MISSION ★</div>
        <p className="text-white/90 mb-4">{tt(TX.ready)}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button className={btn} style={{ background: GOLD, color: "#2a1205" }} onClick={() => setStep("ceremony")}>{tt(TX.plant)}</button>
          <button className={btn + " border text-white/70"} style={{ borderColor: "#ffffff40" }} onClick={() => finish(false)}>{tt(TX.later)}</button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto text-white"
      style={{ background: "radial-gradient(ellipse at 50% 85%, #6fa8dc55 0%, #2a3a6a 30%, #140a14 75%)" }}>
      <style>{`@keyframes fr-wave{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(-6deg) scaleX(.94)}}
@keyframes fr-rise{from{transform:translateY(120%)}to{transform:translateY(0)}}
@keyframes fr-burst{0%{transform:scale(.2);opacity:1}100%{transform:scale(3);opacity:0}}
@keyframes fr-fall{to{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {step === "ceremony" && (
        <div className="min-h-full flex flex-col items-center justify-end pb-[12vh] relative">
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="absolute top-[-5vh] w-2 h-3 rounded-sm"
              style={{ left: `${(i * 37) % 100}%`, background: i % 3 ? GOLD : "#e0603f", animation: `fr-fall ${3 + (i % 5)}s linear ${1 + (i % 7) * 0.3}s forwards` }} />
          ))}
          <div className="absolute bottom-[22vh] w-40 h-40 rounded-full" style={{ background: `radial-gradient(${GOLD}, transparent 70%)`, animation: "fr-burst 2s ease-out 1s both" }} />
          <div className="relative h-[42vh] flex items-end overflow-hidden mb-6">
            <div style={{ animation: "fr-rise 1.4s cubic-bezier(.2,.8,.2,1) both" }} className="flex items-start">
              <div className="w-1.5 h-[40vh] rounded" style={{ background: "linear-gradient(#fff,#999)" }} />
              <div className="w-36 h-24 origin-left rounded-r flex items-center justify-center text-3xl font-black"
                style={{ background: `linear-gradient(135deg,#e0603f,${GOLD})`, animation: "fr-wave 1.6s ease-in-out infinite", color: "#2a1205" }}>★ AR</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 w-full max-w-4xl">
            {ROVERS.map((r, i) => (
              <div key={r.id} className="rounded-xl border p-4 text-center transition-all duration-700"
                style={{ borderColor: lit > i ? GOLD : "#ffffff20", background: lit > i ? "rgba(255,217,125,.12)" : "rgba(255,255,255,.03)", boxShadow: lit > i ? `0 0 30px ${GOLD}66` : "none", opacity: lit > i ? 1 : 0.25, transform: lit > i ? "translateY(0)" : "translateY(20px)" }}>
                <div className="text-4xl mb-1">{r.icon}</div>
                <div className="font-bold" style={{ color: GOLD }}>{r.name}</div>
                <div className="text-xs text-white/60">{r.years}</div>
                <div className="text-sm mt-1 text-white/85">{tt(r.legacy)}</div>
              </div>
            ))}
          </div>
          <button className="mt-6 text-white/50 text-sm underline" onClick={() => setStep("debrief")}>Skip ▸</button>
        </div>
      )}
      {step === "debrief" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border p-6 md:p-10 backdrop-blur-md" style={{ borderColor: GOLD, background: "rgba(20,10,10,.75)" }}>
            <div className="text-center tracking-[0.4em] text-sm mb-6" style={{ color: GOLD }}>{tt(TX.debrief)}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {ROVERS.map((r) => (
                <div key={r.id} className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-full border-4 flex items-center justify-center text-4xl" style={{ borderColor: GOLD, boxShadow: `0 0 20px ${GOLD}88` }}>{r.icon}</div>
                  <div className="mt-2 text-sm font-bold">{r.badge}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-8 mb-6 text-center">
              <div><div className="text-3xl font-black" style={{ color: GOLD }}>4/4</div><div className="text-xs text-white/60">MISSIONS</div></div>
              <div><div className="text-3xl font-black" style={{ color: GOLD }}>4</div><div className="text-xs text-white/60">QUIZZES</div></div>
              <div><div className="text-3xl font-black" style={{ color: GOLD }}>25</div><div className="text-xs text-white/60">YEARS OF HISTORY</div></div>
            </div>
            <div className="flex gap-3 items-start rounded-xl p-4 mb-6" style={{ background: "rgba(111,168,220,.12)" }}>
              <div className="text-3xl">🤖</div>
              <p className="text-white/90 min-h-[4.5em]">{tt(TX.closing).slice(0, typed)}<span className="animate-pulse">▌</span></p>
            </div>
            <div className="text-center"><button className={btn} style={{ background: GOLD, color: "#2a1205" }} onClick={() => setStep("cert")}>{tt(TX.cert)}</button></div>
          </div>
        </div>
      )}
      {step === "cert" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border-4 p-8 text-center" style={{ borderColor: GOLD, background: "linear-gradient(#1a0d14,#4a1d12)" }}>
            <div className="text-xs tracking-[0.3em]" style={{ color: GOLD }}>ASTRO RELIC · MARS</div>
            <div className="text-3xl font-serif font-bold my-3" style={{ color: GOLD }}>Junior Mars Historian</div>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder={tt(TX.name)}
              className="w-full text-center text-2xl font-serif bg-transparent border-b-2 outline-none py-2 mb-4" style={{ borderColor: GOLD }} />
            <div className="flex justify-center gap-2 text-3xl mb-6">{ROVERS.map((r) => <span key={r.id}>{r.icon}</span>)}</div>
            <div className="flex flex-col gap-3">
              <button className={btn} style={{ background: GOLD, color: "#2a1205" }} onClick={() => drawCert(name)}>{tt(TX.dl)}</button>
              <div className="flex gap-3 justify-center flex-wrap">
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish(false)}>{tt(TX.keep)}</button>
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish(true)}>{tt(TX.hub)}</button>
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish("home")}>{tt(TX.home)}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
