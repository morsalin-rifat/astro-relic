import { useEffect, useRef, useState } from "react";
import { store, useGame } from "../state/store";

type L = { en: string; bn: string };
const GOLD = "#ffd97d";
const SILVER = "#c9d2e6";
export const MOON_PATCHES = [
  { id: "eagle-guardian", name: "Apollo 11", lander: "Eagle", year: "1969", img: "/images/patches/a11.png", badge: "Eagle Guardian", legacy: { en: "First human footprints", bn: "মানুষের প্রথম পদচিহ্ন" } },
  { id: "relic-recoverer", name: "Apollo 12", lander: "Intrepid", year: "1969", img: "/images/patches/a12.webp", badge: "Relic Recoverer", legacy: { en: "Visited the robot Surveyor 3", bn: "রোবট সার্ভেয়ার ৩-এর কাছে গিয়েছিল" } },
  { id: "buggy-driver", name: "Apollo 15", lander: "Falcon", year: "1971", img: "/images/patches/a15.png", badge: "Lunar Buggy Driver", legacy: { en: "First car on the Moon", bn: "চাঁদে প্রথম গাড়ি" } },
  { id: "final-stargazer", name: "Apollo 17", lander: "Challenger", year: "1972", img: "/images/patches/a17.png", badge: "Final Stargazer", legacy: { en: "The last footprints", bn: "শেষ পদচিহ্ন" } },
];
const QUOTES: L[] = [
  { en: "Abandoned, but never forgotten.", bn: "পরিত্যক্ত, কিন্তু কখনো ভুলে যাওয়া নয়।" },
  { en: "They waited 50 silent years — and you came to listen.", bn: "৫০ বছর ওরা নীরবে অপেক্ষা করেছে — আর তুমি শুনতে এসেছো।" },
  { en: "Footprints fade on Earth. On the Moon, they wait for you.", bn: "পৃথিবীতে পদচিহ্ন মুছে যায়, চাঁদে ওরা তোমার অপেক্ষায় থাকে।" },
];
const TX = {
  ready: { en: "Explorer, all 4 Apollo landers are remembered! Let's raise one last flag for the silent guardians of the Moon.", bn: "অভিযাত্রী, ৪টি অ্যাপোলো ল্যান্ডারকেই তুমি মনে রেখেছো! চলো চাঁদের নীরব প্রহরীদের জন্য শেষ পতাকাটা ওড়াই।" },
  plant: { en: "🚩 Raise the Flag", bn: "🚩 পতাকা ওড়াও" },
  later: { en: "Later", bn: "পরে" },
  closing: { en: "Eagle, Intrepid, Falcon and Challenger were left behind on the Moon. Nobody visits them. But today, you did. As long as someone remembers, a relic is never truly abandoned.", bn: "ঈগল, ইনট্রেপিড, ফ্যালকন আর চ্যালেঞ্জার চাঁদে একা পড়ে আছে। কেউ ওদের দেখতে যায় না। কিন্তু আজ তুমি গিয়েছো। যতদিন কেউ মনে রাখে, কোনো নিদর্শন সত্যিই হারিয়ে যায় না।" },
  selfie: { en: "📸 Selfie on the Moon", bn: "📸 চাঁদে সেলফি তোলো" },
  cert: { en: "🎓 Get My Certificate", bn: "🎓 আমার সনদ নাও" },
  name: { en: "Your name", bn: "তোমার নাম" },
  dl: { en: "⬇ Download Certificate", bn: "⬇ সনদ ডাউনলোড" },
  hub: { en: "🏛️ Back to Hub", bn: "🏛️ হাবে ফেরো" },
  home: { en: "🏠 Go to Home", bn: "🏠 হোমে যাও" },
  keep: { en: "Keep Exploring", bn: "ঘুরতে থাকো" },
  cam: { en: "📷 Use Camera", bn: "📷 ক্যামেরা চালু করো" },
  snap: { en: "📸 Snap!", bn: "📸 ক্লিক!" },
  up: { en: "📁 Upload Photo", bn: "📁 ছবি আপলোড" },
  saveS: { en: "⬇ Save Selfie", bn: "⬇ সেলফি সেভ" },
  done: { en: "✓ Use on Certificate", bn: "✓ সনদে বসাও" },
};

const loadImg = (src: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
const ok = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  if (!ok(img)) return;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** Polaroid: real Apollo 11 photo + the kid's face in a helmet-style circle. */
async function makeSelfie(face: string): Promise<string> {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1300;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 1080, 1300);
  const [bg, me, p11] = await Promise.all([loadImg("/images/apollo11/aldrin.jpg"), loadImg(face), loadImg("/images/patches/a11.png")]);
  g.save(); g.beginPath(); g.rect(60, 60, 960, 960); g.clip();
  cover(g, bg, 60, 60, 960, 960);
  const cx = 780, cy = 640, r = 200;
  g.beginPath(); g.arc(cx, cy, r + 22, 0, Math.PI * 2); g.fillStyle = "#e8e8ee"; g.fill();
  g.lineWidth = 10; g.strokeStyle = GOLD; g.stroke();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip(); cover(g, me, cx - r, cy - r, r * 2, r * 2);
  const sh = g.createRadialGradient(cx - 70, cy - 90, 10, cx, cy, r); sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(0.4, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore(); g.restore();
  if (ok(p11)) g.drawImage(p11, 80, 80, 170, 170);
  g.fillStyle = "#1a1f33"; g.textAlign = "center";
  g.font = "bold 46px serif"; g.fillText("I walked on the Moon with Apollo 11!", 540, 1110);
  g.font = "28px sans-serif"; g.fillStyle = "#555"; g.fillText("Tranquility Base · 20 July 1969 · Astro Relic", 540, 1170);
  g.font = "italic 26px serif"; g.fillText("“Abandoned, but never forgotten.”", 540, 1225);
  return c.toDataURL("image/jpeg", 0.92);
}

async function drawCert(name: string, selfie: string | null) {
  const W = 1600, H = 1100;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#070b19"); bg.addColorStop(1, "#1a2140");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 60) / 100})`; g.fillRect((i * 733) % W, (i * 389) % H, 2, 2); }
  const earth = g.createRadialGradient(1380, 150, 10, 1380, 150, 110); earth.addColorStop(0, "#7fd0ff"); earth.addColorStop(0.7, "#2a6db0"); earth.addColorStop(1, "rgba(42,109,176,0)");
  g.fillStyle = earth; g.beginPath(); g.arc(1380, 150, 110, 0, Math.PI * 2); g.fill();
  g.strokeStyle = SILVER; g.lineWidth = 12; g.strokeRect(36, 36, W - 72, H - 72);
  g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(62, 62, W - 124, H - 124);
  g.textAlign = "center";
  // logos
  g.beginPath(); g.arc(170, 170, 70, 0, Math.PI * 2); g.fillStyle = "#0b3d91"; g.fill();
  g.fillStyle = "#fff"; g.font = "bold 40px sans-serif"; g.fillText("NASA", 170, 184);
  g.font = "16px sans-serif"; g.fillStyle = SILVER; g.fillText("Data & images: NASA", 170, 270);
  g.beginPath(); g.arc(1430, 930, 70, 0, Math.PI * 2); g.fillStyle = "#2a1d08"; g.fill(); g.strokeStyle = GOLD; g.lineWidth = 5; g.stroke();
  g.fillStyle = GOLD; g.font = "bold 30px serif"; g.fillText("★AR★", 1430, 925); g.font = "14px sans-serif"; g.fillText("ASTRO RELIC", 1430, 950);
  g.fillStyle = GOLD; g.font = "bold 30px sans-serif"; g.fillText("ASTRO RELIC · LUNAR HERITAGE ARCHIVE", 800, 140);
  g.font = "bold 74px serif"; g.fillText("Lunar Relic Guardian", 800, 240);
  g.fillStyle = SILVER; g.font = "28px sans-serif"; g.fillText("This certificate is proudly presented to", 800, 315);
  const nx = selfie ? 720 : 800;
  g.fillStyle = "#fff"; g.font = "bold 70px serif"; g.fillText(name || "Moon Explorer", nx, 405);
  g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(nx - 330, 430); g.lineTo(nx + 330, 430); g.stroke();
  g.fillStyle = SILVER; g.font = "26px sans-serif";
  g.fillText("for visiting the four silent Apollo landers and keeping their stories alive.", 800, 480);
  g.fillStyle = GOLD; g.font = "italic 32px serif"; g.fillText("“Abandoned, but never forgotten.”", 800, 535);
  if (selfie) {
    const me = await loadImg(selfie);
    g.save(); g.beginPath(); g.arc(1300, 395, 90, 0, Math.PI * 2); g.clip(); cover(g, me, 1210, 305, 180, 180); g.restore();
    g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.arc(1300, 395, 90, 0, Math.PI * 2); g.stroke();
    g.fillStyle = SILVER; g.font = "14px sans-serif"; g.fillText("EXPLORER PHOTO ID", 1300, 508);
  }
  const imgs = await Promise.all(MOON_PATCHES.map((p) => loadImg(p.img)));
  MOON_PATCHES.forEach((p, i) => {
    const x = 380 + i * 280, y = 700;
    const im = imgs[i]; if (im && ok(im)) g.drawImage(im, x - 95, y - 95, 190, 190);
    g.fillStyle = GOLD; g.font = "bold 24px sans-serif"; g.fillText(`${p.name} · ${p.year}`, x, y + 130);
    g.fillStyle = SILVER; g.font = "18px sans-serif"; g.fillText(p.badge, x, y + 158);
  });
  g.fillStyle = "#8f9ab8"; g.font = "20px sans-serif";
  g.fillText(`Signed by Nova, AI Mission Guide  ·  ${new Date().toLocaleDateString()}`, 800, 1000);
  const a = document.createElement("a"); a.download = "lunar-relic-guardian-certificate.png"; a.href = c.toDataURL("image/png"); a.click();
}

function SelfieBooth({ tt, onDone }: { tt: (l: L) => string; onDone: (url: string | null) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [face, setFace] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setLive(false); };
  useEffect(() => stop, []);
  useEffect(() => { if (face) makeSelfie(face).then(setOut); }, [face]);
  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      stream.current = s; setLive(true); setOut(null);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play(); } });
    } catch { alert("Camera not available — try Upload Photo"); }
  };
  const snap = () => {
    const v = video.current; if (!v) return;
    const c = document.createElement("canvas"); const s = Math.min(v.videoWidth, v.videoHeight);
    c.width = c.height = s; const g = c.getContext("2d")!;
    g.translate(s, 0); g.scale(-1, 1);
    g.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, s, s);
    setFace(c.toDataURL("image/jpeg")); stop();
  };
  const btn = "min-h-11 px-5 py-2 rounded-full font-bold transition hover:scale-105";
  return (
    <div className="w-full max-w-md rounded-2xl border-2 p-5 text-center" style={{ borderColor: SILVER, background: "rgba(10,14,30,.92)" }}>
      <div className="text-xs tracking-[0.3em] mb-3" style={{ color: GOLD }}>📸 MOON SELFIE BOOTH</div>
      <div className="relative mx-auto w-full aspect-[1080/1300] rounded-lg overflow-hidden bg-black/50 mb-4">
        {live ? <video ref={video} playsInline muted className="w-full h-full object-cover -scale-x-100" />
          : out ? <img src={out} alt="Moon selfie" className="w-full h-full object-cover" />
          : <img src="/images/apollo11/aldrin.jpg" alt="Apollo 11 on the Moon" className="w-full h-full object-cover opacity-70" />}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {live ? <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={snap}>{tt(TX.snap)}</button>
          : <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={startCam}>{tt(TX.cam)}</button>}
        <label className={btn + " border cursor-pointer"} style={{ borderColor: GOLD }}>
          {tt(TX.up)}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setFace(r.result as string); r.readAsDataURL(f); }} />
        </label>
        {out && <a className={btn + " border"} style={{ borderColor: GOLD }} href={out} download="moon-selfie.jpg">{tt(TX.saveS)}</a>}
        <button className={btn} style={{ background: out ? GOLD : "#ffffff22", color: out ? "#1a1205" : "#fff" }} onClick={() => { stop(); onDone(out); }}>{out ? tt(TX.done) : "✕"}</button>
      </div>
    </div>
  );
}

export function MoonFinaleUI() {
  const phase = useGame((s) => s.phase);
  const badges = useGame((s) => s.badges);
  const flags = useGame((s) => s.flags);
  const lang = useGame((s) => s.lang);
  const [step, setStep] = useState<"idle" | "ready" | "ceremony" | "debrief" | "selfie" | "cert">("idle");
  const [lit, setLit] = useState(0);
  const [name, setName] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [q] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const tt = (l: L) => l[lang as "en" | "bn"] ?? l.en;
  const all = MOON_PATCHES.every((p) => badges.includes(p.id));
  const done = flags.includes("moon-finale");

  useEffect(() => store.on("moonfinale:open", () => setStep("debrief")), []);
  useEffect(() => {
    if (phase === "moon" && all && !done && step === "idle") {
      const id = window.setTimeout(() => setStep("ready"), 9000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [phase, all, done, step]);
  useEffect(() => {
    if (step !== "ceremony") return;
    setLit(0);
    const t = [1, 2, 3, 4].map((n) => window.setTimeout(() => setLit(n), 1200 + n * 900));
    t.push(window.setTimeout(() => setStep("debrief"), 7200));
    return () => t.forEach(clearTimeout);
  }, [step]);

  if (step === "idle") return null;
  const finish = (go: false | "hub" | "home") => {
    store.set({ flags: Array.from(new Set([...store.get().flags, "moon-finale"])) });
    store.awardBadge("master-lunar");
    setStep("idle");
    if (go) store.emit("engine:goto", go);
  };
  const btn = "min-h-12 px-6 py-3 rounded-full font-bold tracking-wider transition hover:scale-105 active:scale-95";

  if (step === "ready")
    return (
      <div className="fixed left-1/2 bottom-28 -translate-x-1/2 z-[60] w-[min(92vw,560px)] rounded-2xl border p-5 text-center backdrop-blur-md"
        style={{ borderColor: SILVER, background: "rgba(8,12,28,.88)", boxShadow: `0 0 40px ${SILVER}55` }}>
        <div className="text-xs tracking-[0.3em] mb-2" style={{ color: GOLD }}>★ NOVA · LUNAR GRAND FINALE ★</div>
        <p className="text-white/90 mb-4">{tt(TX.ready)}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={() => setStep("ceremony")}>{tt(TX.plant)}</button>
          <button className={btn + " border text-white/70"} style={{ borderColor: "#ffffff40" }} onClick={() => finish(false)}>{tt(TX.later)}</button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto text-white" style={{ background: "radial-gradient(ellipse at 50% 90%, #9aa6c255 0%, #1a2140 35%, #05070f 80%)" }}>
      <style>{`@keyframes mf-rise{from{transform:translateY(120%)}to{transform:translateY(0)}}@keyframes mf-wave{0%,100%{transform:skewY(0)}50%{transform:skewY(-6deg) scaleX(.94)}}@keyframes mf-fall{to{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {step === "ceremony" && (
        <div className="min-h-full flex flex-col items-center justify-end pb-[10vh] relative">
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="absolute top-[-5vh] w-2 h-2 rounded-full" style={{ left: `${(i * 37) % 100}%`, background: i % 2 ? GOLD : SILVER, animation: `mf-fall ${3 + (i % 5)}s linear ${1 + (i % 7) * 0.3}s forwards` }} />
          ))}
          <div className="relative h-[38vh] flex items-end overflow-hidden mb-6">
            <div style={{ animation: "mf-rise 1.4s cubic-bezier(.2,.8,.2,1) both" }} className="flex items-start">
              <div className="w-1.5 h-[36vh] rounded" style={{ background: "linear-gradient(#fff,#999)" }} />
              <div className="w-36 h-24 origin-left rounded-r flex items-center justify-center text-2xl font-black" style={{ background: `linear-gradient(135deg,${SILVER},${GOLD})`, animation: "mf-wave 1.6s ease-in-out infinite", color: "#10142a" }}>🌕 AR</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 w-full max-w-4xl">
            {MOON_PATCHES.map((p, i) => (
              <div key={p.id} className="rounded-xl border p-3 text-center transition-all duration-700"
                style={{ borderColor: lit > i ? GOLD : "#ffffff20", opacity: lit > i ? 1 : 0.25, boxShadow: lit > i ? `0 0 30px ${GOLD}66` : "none", filter: lit > i ? "none" : "grayscale(1)" }}>
                <img src={p.img} alt={`${p.name} patch`} className="w-20 h-20 mx-auto object-contain" />
                <div className="font-bold mt-1" style={{ color: GOLD }}>{p.lander}</div>
                <div className="text-xs text-white/60">{p.name} · {p.year}</div>
                <div className="text-sm text-white/85">{tt(p.legacy)}</div>
              </div>
            ))}
          </div>
          <button className="mt-6 text-white/50 text-sm underline" onClick={() => setStep("debrief")}>Skip ▸</button>
        </div>
      )}
      {step === "debrief" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border p-6 md:p-10 backdrop-blur-md" style={{ borderColor: SILVER, background: "rgba(8,12,28,.8)" }}>
            <div className="text-center tracking-[0.4em] text-sm mb-2" style={{ color: GOLD }}>LUNAR MISSION DEBRIEF</div>
            <div className="text-center font-serif italic text-xl mb-6" style={{ color: SILVER }}>“{tt(QUOTES[q]!)}”</div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {MOON_PATCHES.map((p) => <img key={p.id} src={p.img} alt={`${p.name} patch`} className="w-full max-w-24 mx-auto drop-shadow-[0_0_12px_rgba(255,217,125,.5)]" />)}
            </div>
            <div className="flex gap-3 items-start rounded-xl p-4 mb-6" style={{ background: "rgba(154,166,194,.12)" }}>
              <div className="text-3xl">🤖</div><p className="text-white/90">{tt(TX.closing)}</p>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => setStep("selfie")}>{tt(TX.selfie)}</button>
              <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={() => setStep("cert")}>{tt(TX.cert)}</button>
            </div>
          </div>
        </div>
      )}
      {step === "selfie" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <SelfieBooth tt={tt} onDone={(u) => { if (u) setSelfie(u); setStep("cert"); }} />
        </div>
      )}
      {step === "cert" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border-4 p-8 text-center" style={{ borderColor: SILVER, background: "linear-gradient(#070b19,#1a2140)" }}>
            <div className="text-xs tracking-[0.3em]" style={{ color: GOLD }}>NASA · ASTRO RELIC · LUNAR ARCHIVE</div>
            <div className="text-3xl font-serif font-bold my-3" style={{ color: GOLD }}>Lunar Relic Guardian</div>
            {selfie && <img src={selfie} alt="Your moon selfie" className="w-24 h-24 rounded-full object-cover mx-auto border-4 mb-3" style={{ borderColor: GOLD }} />}
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder={tt(TX.name)}
              className="w-full text-center text-2xl font-serif bg-transparent border-b-2 outline-none py-2 mb-2" style={{ borderColor: GOLD }} />
            <div className="italic text-sm mb-4" style={{ color: SILVER }}>“{tt(QUOTES[0]!)}”</div>
            <div className="flex justify-center gap-2 mb-6">{MOON_PATCHES.map((p) => <img key={p.id} src={p.img} alt={`${p.name} patch`} className="w-14 h-14 object-contain" />)}</div>
            <div className="flex flex-col gap-3">
              <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={() => drawCert(name, selfie)}>{tt(TX.dl)}</button>
              {!selfie && <button className="text-sm underline text-white/70" onClick={() => setStep("selfie")}>{tt(TX.selfie)}</button>}
              <div className="flex gap-3 justify-center flex-wrap">
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish(false)}>{tt(TX.keep)}</button>
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish("hub")}>{tt(TX.hub)}</button>
                <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish("home")}>{tt(TX.home)}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
