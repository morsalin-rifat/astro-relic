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

export const FLAGS = [
  { id: "bd", label: "🇧🇩 Bangladesh" },
  { id: "ar", label: "🌕 Astro Relic" },
  { id: "earth", label: "🌍 Earth" },
  { id: "us", label: "🇺🇸 Apollo USA" },
] as const;

function drawFlag(g: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, custom: HTMLImageElement | null) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (id === "custom" && custom && ok(custom)) cover(g, custom, x, y, w, h);
  else if (id === "bd") { g.fillStyle = "#006a4e"; g.fillRect(x, y, w, h); g.fillStyle = "#f42a41"; g.beginPath(); g.arc(x + w * 0.45, y + h / 2, h * 0.3, 0, 7); g.fill(); }
  else if (id === "us") {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#fff" : "#b22234"; g.fillRect(x, y + (h / 13) * i, w, h / 13 + 1); }
    g.fillStyle = "#3c3b6e"; g.fillRect(x, y, w * 0.4, h * 7 / 13);
    g.fillStyle = "#fff"; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) g.fillRect(x + 8 + c * w * 0.075, y + 8 + r * h * 0.12, 4, 4);
  } else if (id === "earth") {
    g.fillStyle = "#4b92db"; g.fillRect(x, y, w, h);
    g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.32, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(x + w / 2, y + h / 2, h * 0.14, h * 0.32, 0, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(x + w / 2 - h * 0.32, y + h / 2); g.lineTo(x + w / 2 + h * 0.32, y + h / 2); g.stroke();
  } else {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#1a2140"); gr.addColorStop(1, "#3a2a08"); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = GOLD; g.font = `bold ${h * 0.32}px serif`; g.textAlign = "center"; g.fillText("★ AR ★", x + w / 2, y + h * 0.5);
    g.font = `bold ${h * 0.13}px sans-serif`; g.fillText("ASTRO RELIC", x + w / 2, y + h * 0.75);
  }
  g.restore();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.strokeRect(x, y, w, h);
}

/** Face-in-helmet poster: kid's face inside the astronaut visor, chosen flag planted beside them. */
async function makeSelfie(face: string, o: { zoom: number; dx: number; dy: number; flag: string; custom: string | null; name: string; mars?: boolean }): Promise<string> {
  const W = 1024, H = 1280;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const [bg, me, cu] = await Promise.all([loadImg("/images/selfie/astronaut.jpg"), loadImg(face), o.custom ? loadImg(o.custom) : Promise.resolve(null)]);
  cover(g, bg, 0, 0, W, H);
  if (o.mars) { // red-planet tint: dusty butterscotch sky and rusty ground
    g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = "#e8a070"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "soft-light"; const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#d9925a"); sky.addColorStop(1, "#8a3a1a"); g.fillStyle = sky; g.fillRect(0, 0, W, H); g.restore();
  }
  // face in visor
  const cx = 688, cy = 356, rx = 78, ry = 80;
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.clip();
  g.fillStyle = "#000"; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  const s = (ry * 2 * o.zoom);
  cover(g, me, cx - s / 2 + o.dx * rx, cy - s / 2 + o.dy * ry, s, s);
  const sh = g.createRadialGradient(cx - 35, cy - 45, 5, cx, cy, rx * 1.1);
  sh.addColorStop(0, "rgba(255,255,255,.4)"); sh.addColorStop(0.35, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(120,170,255,.25)");
  g.fillStyle = sh; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  g.restore();
  // flag on pole
  const px = 430, top = 300, base = 1050;
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(px + 30, base + 4, 40, 8, 0, 0, 7); g.fill();
  const pole = g.createLinearGradient(px - 5, 0, px + 5, 0); pole.addColorStop(0, "#999"); pole.addColorStop(0.5, "#fff"); pole.addColorStop(1, "#888");
  g.fillStyle = pole; g.fillRect(px - 5, top, 10, base - top);
  g.fillRect(px - 260, top + 4, 260, 6);
  drawFlag(g, o.flag, px - 260, top + 10, 255, 170, cu);
  // name strip
  g.fillStyle = "rgba(5,8,20,.75)"; g.fillRect(0, H - 150, W, 150);
  g.fillStyle = GOLD; g.textAlign = "center"; g.font = "bold 50px serif";
  g.fillText(`ASTRONAUT ${(o.name || "EXPLORER").toUpperCase()}`, W / 2, H - 88);
  g.fillStyle = SILVER; g.font = "italic 26px serif"; g.fillText("“Abandoned, but never forgotten.” · Astro Relic", W / 2, H - 40);
  return c.toDataURL("image/jpeg", 0.92);
}

async function drawCert(name: string, selfie: string | null): Promise<string> {
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
  return c.toDataURL("image/png");
}
const download = (url: string, n: string) => { const a = document.createElement("a"); a.download = n; a.href = url; a.click(); };

export function SelfieBooth({ tt, name, setName, onDone, onBack, mars }: { tt: (l: L) => string; name: string; setName: (n: string) => void; onDone: (url: string | null) => void; onBack: () => void; mars?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [face, setFace] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [flag, setFlag] = useState<string>("bd");
  const [custom, setCustom] = useState<string | null>(null);
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setLive(false); };
  useEffect(() => stop, []);
  useEffect(() => { makeSelfie(face ?? "", { zoom, dx, dy, flag, custom, name, mars }).then(setOut); }, [face, zoom, dx, dy, flag, custom, name, mars]);
  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      stream.current = s; setLive(true);
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
  const read = (f: File | undefined, set: (u: string) => void) => { if (!f) return; const r = new FileReader(); r.onload = () => set(r.result as string); r.readAsDataURL(f); };
  const btn = "min-h-11 px-4 py-2 rounded-full font-bold transition hover:scale-105 text-sm";
  const chip = (on: boolean) => ({ borderColor: on ? GOLD : "#ffffff30", background: on ? `${GOLD}33` : "transparent" });
  return (
    <div className="w-full max-w-4xl rounded-2xl border-2 p-4 md:p-6" style={{ borderColor: SILVER, background: "rgba(10,14,30,.94)" }}>
      <div className="text-center text-xs tracking-[0.3em] mb-3" style={{ color: GOLD }}>👨‍🚀 BE AN ASTRONAUT · MOON SELFIE</div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="relative w-full aspect-[1024/1280] rounded-lg overflow-hidden bg-black">
          {out && <img src={out} alt="Your astronaut poster" className="w-full h-full object-cover" />}
          {live && <video ref={video} playsInline muted className="absolute right-3 bottom-3 w-40 h-40 rounded-full object-cover -scale-x-100 border-4" style={{ borderColor: GOLD }} />}
        </div>
        <div className="flex flex-col gap-4 text-left">
          <div>
            <div className="text-sm mb-2" style={{ color: GOLD }}>1. {tt({ en: "Your face", bn: "তোমার মুখ" })}</div>
            <div className="flex flex-wrap gap-2">
              {live ? <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={snap}>{tt(TX.snap)}</button>
                : <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={startCam}>{tt(TX.cam)}</button>}
              <label className={btn + " border cursor-pointer"} style={{ borderColor: GOLD }}>
                {tt(TX.up)}<input type="file" accept="image/*" className="hidden" onChange={(e) => read(e.target.files?.[0], setFace)} />
              </label>
            </div>
          </div>
          {face && (
            <div className="grid gap-1 text-xs text-white/70">
              <div className="text-sm" style={{ color: GOLD }}>2. {tt({ en: "Fit your face in the helmet", bn: "হেলমেটে মুখ ঠিক করো" })}</div>
              <label>🔍 Zoom<input type="range" min={0.6} max={2.5} step={0.02} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="w-full" /></label>
              <label>↔<input type="range" min={-1} max={1} step={0.02} value={dx} onChange={(e) => setDx(+e.target.value)} className="w-full" /></label>
              <label>↕<input type="range" min={-1} max={1} step={0.02} value={dy} onChange={(e) => setDy(+e.target.value)} className="w-full" /></label>
            </div>
          )}
          <div>
            <div className="text-sm mb-2" style={{ color: GOLD }}>3. {tt({ en: "Pick your flag", bn: "তোমার পতাকা বাছো" })}</div>
            <div className="flex flex-wrap gap-2">
              {FLAGS.map((f) => <button key={f.id} className="px-3 py-2 rounded-full border text-sm" style={chip(flag === f.id)} onClick={() => setFlag(f.id)}>{f.label}</button>)}
              <label className="px-3 py-2 rounded-full border text-sm cursor-pointer" style={chip(flag === "custom")}>
                📁 {tt({ en: "My own flag", bn: "নিজের পতাকা" })}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => read(e.target.files?.[0], (u) => { setCustom(u); setFlag("custom"); })} />
              </label>
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: GOLD }}>4. {tt(TX.name)}</div>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder={tt(TX.name)}
              className="w-full bg-transparent border-b-2 outline-none py-1 text-lg" style={{ borderColor: GOLD }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button className={btn + " border"} style={{ borderColor: "#ffffff40" }} onClick={() => { stop(); onBack(); }}>← {tt({ en: "Back", bn: "পেছনে" })}</button>
            {out && face && <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => download(out, mars ? "astro-relic-mars-astronaut.jpg" : "astro-relic-moon-astronaut.jpg")}>{tt(TX.saveS)}</button>}
            {face && <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={() => { stop(); onDone(out); }}>{tt(TX.done)}</button>}
          </div>
        </div>
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
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (step !== "cert") return;
    let live = true;
    const id = window.setTimeout(() => drawCert(name, selfie).then((u) => { if (live) setPreview(u); }), 200);
    return () => { live = false; clearTimeout(id); };
  }, [step, name, selfie]);
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
      {step !== "ceremony" && (
        <button aria-label="Close" onClick={() => finish(false)} className="fixed top-4 right-4 z-[80] w-11 h-11 rounded-full border text-xl font-bold hover:scale-110 transition"
          style={{ borderColor: GOLD, background: "rgba(8,12,28,.9)", color: GOLD }}>✕</button>
      )}
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
          <SelfieBooth tt={tt} name={name} setName={setName} onBack={() => setStep("debrief")} onDone={(u) => { if (u) setSelfie(u); setStep("cert"); }} />
        </div>
      )}
      {step === "cert" && (
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl border-2 p-5 text-center" style={{ borderColor: SILVER, background: "rgba(8,12,28,.9)" }}>
            <div className="text-xs tracking-[0.3em] mb-3" style={{ color: GOLD }}>🎓 LUNAR RELIC GUARDIAN · CERTIFICATE</div>
            {preview ? <img src={preview} alt="Certificate preview" className="w-full rounded-lg shadow-2xl mb-4" /> : <div className="w-full aspect-[16/11] mb-4" />}
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder={tt(TX.name)}
              className="w-full max-w-md text-center text-2xl font-serif bg-transparent border-b-2 outline-none py-2 mb-4" style={{ borderColor: GOLD }} />
            <div className="flex gap-3 justify-center flex-wrap">
              <button className={btn} style={{ background: GOLD, color: "#1a1205" }} onClick={() => preview && download(preview, "lunar-relic-guardian-certificate.png")}>{tt(TX.dl)}</button>
              <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => setStep("selfie")}>{tt(TX.selfie)}</button>
              <button className={btn + " border"} style={{ borderColor: "#ffffff40" }} onClick={() => setStep("debrief")}>← {tt({ en: "Back", bn: "পেছনে" })}</button>
            </div>
            <div className="flex gap-3 justify-center flex-wrap mt-4">
              <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish(false)}>{tt(TX.keep)}</button>
              <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish("hub")}>{tt(TX.hub)}</button>
              <button className={btn + " border"} style={{ borderColor: GOLD }} onClick={() => finish("home")}>{tt(TX.home)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
