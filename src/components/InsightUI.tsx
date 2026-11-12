import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble, RoverTurntable } from "./MissionUI";

type L = { en: string; bn: string };
type Who = "insight" | "nova";
type Lang = "en" | "bn";
const ACC = "#b58cff";
const GOLD = "#ffd97d";
const V = (c: string) => `insight/${c}`;

// Scripts from the team's InSight voice-script PDF (matched to the audio clips).
const LINES: Record<string, L> = {
  "02_insight_welcome": { en: "Hello, little friend! I'm InSight. In 2018, I travelled all the way from Earth to this distant red planet. Unlike other rovers, I didn't travel around. I stayed in one place and listened to the secrets hidden deep inside Mars!", bn: "হ্যালো ছোট্ট বন্ধু! আমি InSight। ২০১৮ সালে পৃথিবী থেকে প্রায় ২২ কোটি কিলোমিটার দূরের এই লাল গ্রহে এসেছিলাম। অন্য রোভারদের মতো আমি ঘুরে বেড়াইনি। আমি একই জায়গায় থেকে মঙ্গলের গভীরের গল্প শুনেছি!" },
  "05_insight_farewell": { en: "As time passed, Martian dust slowly covered my solar panels. Collecting enough sunlight became harder and harder. In December 2022, I stopped communicating with Earth. But my friend, was my journey really over? The discoveries I sent home continue to help scientists unlock the secrets of Mars!", bn: "সময় গড়িয়ে যাচ্ছিল, আর আমার সোলার প্যানেলে জমছিল মঙ্গলের ধুলো। সূর্যের আলো থেকে শক্তি পাওয়া ক্রমেই কঠিন হয়ে উঠছিল। ২০২২ সালের ডিসেম্বরে পৃথিবীর সঙ্গে আমার যোগাযোগ থেমে যায়। কিন্তু বন্ধু, আমার অভিযান কি সত্যিই শেষ? আমি যে তথ্য পাঠিয়েছি, সেগুলো দিয়েই বিজ্ঞানীরা এখনো মঙ্গলের রহস্য উন্মোচন করছেন!" },
  "06_insight_quiz": { en: "Now, here's a little challenge for you! What did my SEIS instrument listen for? Martian birds singing, vibrations from Mars, or ocean waves?", bn: "এবার তোমার জন্য একটি ছোট্ট চ্যালেঞ্জ! আমার SEIS যন্ত্র দিয়ে আমি কী শুনতাম? মঙ্গলের পাখির গান, মঙ্গলের কম্পন, নাকি সমুদ্রের ঢেউ?" },
  "07_insight_zone_unlock": { en: "Amazing, Explorer! You didn't just listen to InSight's story; you uncovered the secrets hidden inside Mars! Remember, a true scientist doesn't just observe with their eyes. They also listen carefully. Your next adventure awaits!", bn: "অসাধারণ, এক্সপ্লোরার! তুমি শুধু ইনসাইটের গল্প শোনোনি, তুমি মঙ্গলের ভেতরের রহস্যও বুঝতে পেরেছ! মনে রেখো, একজন সত্যিকারের বিজ্ঞানী শুধু চোখ দিয়ে দেখে না, মন দিয়ে শোনেও। এবার তোমার পরবর্তী অভিযান অপেক্ষা করছে!" },
  "08_insight_badge": { en: "Congratulations! You've earned the 'Silent Listener' explorer badge! Today, you've discovered that even silence can hide some of the universe's greatest secrets!", bn: "অভিনন্দন! তুমি অর্জন করেছ 'Silent Listener' সম্মাননা ব্যাজ! আজ তুমি প্রমাণ করেছ, নীরবতার মধ্যেও লুকিয়ে থাকতে পারে মহাবিশ্বের সবচেয়ে বড় রহস্য!" },
};

const TOPICS: { id: string; icon: string; label: L; text: L; who?: Who; panel?: "seis" | "mole" | "gallery" }[] = [
  { id: "03_insight_part_heartbeat", icon: "💓", panel: "seis", label: { en: "Heartbeat of Mars", bn: "মঙ্গলের হৃদস্পন্দন" }, text: { en: "Did you know Mars has its own kind of heartbeat? With my special instrument called SEIS, I listened to vibrations travelling through the planet. In April 2019, I detected my first confirmed Marsquake! Those tiny vibrations helped scientists discover what lies inside Mars!", bn: "তুমি কি জানো, মঙ্গলেরও এক ধরনের হৃদস্পন্দন আছে? আমার SEIS নামের বিশেষ যন্ত্র দিয়ে আমি মঙ্গলের কম্পন শুনতাম। ২০১৯ সালে আমি প্রথম নিশ্চিত Marsquake রেকর্ড করেছিলাম! সেই কম্পনের মধ্যেই লুকিয়ে ছিল মঙ্গলের ভেতরের রহস্য!" } },
  { id: "03_insight_part_little_mole", icon: "🦫", panel: "mole", label: { en: "The little Mole", bn: "ছোট্ট মোল" }, text: { en: "I had another little helper named Mole! Its job was to dig beneath the Martian soil and measure the planet's inner heat. But Mars had a surprise waiting for us. The soil made digging much harder than expected. Mole couldn't reach its target depth, but its journey still taught scientists valuable lessons!", bn: "আমার আরেকজন ছোট্ট সহকারী ছিল। তার নাম ছিল Mole! তার কাজ ছিল মঙ্গলের মাটির গভীরে ঢুকে গ্রহটির ভেতরের তাপ মাপা। কিন্তু মঙ্গলের মাটি ছিল আমাদের ধারণার চেয়ে অনেক বেশি কঠিন। সে বেশি গভীরে যেতে পারেনি। তবুও তার চেষ্টা আমাদের অনেক কিছু শিখিয়েছে!" } },
  { id: "03_insight_part_mars_wind", icon: "🌬️", label: { en: "Wind of Mars", bn: "মঙ্গলের বাতাস" }, text: { en: "One day, my sensors even captured vibrations caused by the Martian wind! Can you imagine? So far away from Earth, I was sensing the whispers of another planet's atmosphere!", bn: "একদিন আমার সেন্সরগুলো মঙ্গলের বাতাসের কম্পনও ধরেছিল! ভাবতে পারো? পৃথিবী থেকে এত দূরে বসে আমি অন্য একটি গ্রহের বাতাসের শব্দের মতো কম্পন অনুভব করছিলাম!" } },
  { id: "03_insight_part_inner_secret", icon: "🌍", label: { en: "Inside Mars", bn: "মঙ্গলের ভেতরে" }, text: { en: "I didn't just listen to Marsquakes. My discoveries helped scientists understand the crust, mantle, and core of Mars. It was as if I had opened a hidden science book buried inside the Red Planet!", bn: "আমি শুধু ভূমিকম্প শুনিনি। আমার তথ্য দিয়ে বিজ্ঞানীরা মঙ্গলের ভূত্বক, ম্যান্টল এবং কেন্দ্র সম্পর্কেও অনেক কিছু জানতে পেরেছেন। আমি যেন মঙ্গলের শরীরের ভেতরে লুকানো একটি বিজ্ঞান-গল্পের বই খুলে দিয়েছিলাম!" } },
  { id: "04_insight_photo_gallery", icon: "🖼️", panel: "gallery", label: { en: "My photo album", bn: "আমার ছবির অ্যালবাম" }, text: { en: "Would you like to see my photo album? It contains pictures of my robotic arm, solar panels, and the vast red plains around me. Every picture holds a memory from my journey!", bn: "আমার ক্যামেরার অ্যালবাম দেখবে? আমার রোবোটিক হাত, সোলার প্যানেল আর চারপাশের বিশাল লাল সমতলের ছবি রয়েছে সেখানে। প্রতিটি ছবিতে লুকিয়ে আছে আমার অভিযানের স্মৃতি!" } },
  { id: "09_insight_nasa_data_source", icon: "🚀", who: "nova", label: { en: "NASA facts", bn: "নাসার তথ্য" }, text: { en: "According to NASA's InSight mission records, the lander touched down on Mars on November 26, 2018. It detected its first confirmed Marsquake in 2019, and its mission ended in December 2022. Its scientific discoveries continue to help us understand the inside of Mars!", bn: "NASA-এর InSight মিশন ২৬ নভেম্বর ২০১৮ সালে মঙ্গলে অবতরণ করে। এটি ২০১৯ সালে প্রথম নিশ্চিত Marsquake শনাক্ত করে এবং ২০২২ সালের ডিসেম্বরে মিশন শেষ হয়। এর বৈজ্ঞানিক তথ্য আজও মঙ্গলের অভ্যন্তরীণ গঠন বুঝতে সাহায্য করছে!" } },
];

const QUIZ = [
  { id: "birds", icon: "🐦", en: "Martian birds singing", bn: "মঙ্গলের পাখির গান" },
  { id: "quake", icon: "📳", en: "Vibrations from Mars", bn: "মঙ্গলের কম্পন" },
  { id: "ocean", icon: "🌊", en: "Ocean waves", bn: "সমুদ্রের ঢেউ" },
];

const PHOTOS: { src: string; title: L; text: L }[] = [
  { src: "/images/insight/PIA22876.jpg", title: { en: "My first selfie (2018)", bn: "আমার প্রথম সেলফি (২০১৮)" }, text: { en: "Fresh and shiny! My robotic arm snapped this right after landing—see my two round solar panels?", bn: "একদম ঝকঝকে! নামার পরপরই আমার রোবোটিক হাত এই ছবি তুলেছিল—আমার দুটো গোল সোলার প্যানেল দেখছো?" } },
  { src: "/images/insight/PIA22957.jpg", title: { en: "SEIS on the ground", bn: "মাটিতে আমার SEIS" }, text: { en: "That little dome is my SEIS seismometer, gently placed on Mars to listen for quakes.", bn: "ওই ছোট গম্বুজটাই আমার SEIS ভূকম্পন-যন্ত্র, মঙ্গলের কম্পন শুনতে আলতো করে মাটিতে বসানো।" } },
  { src: "/images/insight/PIA23203.jpg", title: { en: "A little dusty (2019)", bn: "একটু ধুলোমাখা (২০১৯)" }, text: { en: "A few months later, red dust began settling on my panels.", bn: "কয়েক মাস পর আমার প্যানেলে লাল ধুলো জমতে শুরু করল।" } },
  { src: "/images/insight/PIA25287.jpg", title: { en: "My final selfie (2022)", bn: "আমার শেষ সেলফি (২০২২)" }, text: { en: "Covered in dust, I said goodbye—but my data still helps scientists today.", bn: "ধুলোয় ঢাকা অবস্থায় বিদায় নিয়েছিলাম—কিন্তু আমার তথ্য আজও বিজ্ঞানীদের সাহায্য করছে।" } },
];

const SOURCES = [
  { icon: "🛰️", en: "NASA InSight mission page", bn: "নাসার ইনসাইট মিশন পেজ", url: "https://science.nasa.gov/mission/insight/" },
  { icon: "🖼️", en: "Real InSight photos (NASA Photojournal)", bn: "ইনসাইটের আসল ছবি (নাসা ফটোজার্নাল)", url: "https://photojournal.jpl.nasa.gov/mission/InSight" },
];

function Panel({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="absolute inset-0 z-[3] rounded-[28px] bg-[#0c0718]/97 p-4 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.3em]" style={{ color: ACC }}>{title}</div>
        <button onClick={onClose} className="text-xl opacity-70 hover:opacity-100" aria-label="Close panel">✕</button>
      </div>
      {children}
    </div>
  );
}

function Gallery({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PHOTOS[i] ?? PHOTOS[0]!;
  const go = (d: number) => { audio.beep(900); setI((x) => (x + d + PHOTOS.length) % PHOTOS.length); };
  return (
    <Panel onClose={onClose} title="📸 NASA · INSIGHT">
      <div className="relative mt-2 rounded-2xl overflow-hidden border bg-black aspect-[4/3]" style={{ borderColor: `${ACC}66` }}>
        <img key={p.src} src={p.src} alt={t(p.title, lang)} className="w-full h-full object-contain animate-[hubrise_0.4s_ease]" />
        {[-1, 1].map((d) => (
          <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Previous" : "Next"} className={`absolute ${d < 0 ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border text-xl`} style={{ borderColor: ACC, color: ACC }}>{d < 0 ? "‹" : "›"}</button>
        ))}
      </div>
      <div className="mt-3 font-bold" style={{ color: ACC }}>{t(p.title, lang)}</div>
      <div className="text-sm opacity-85 mt-1">{t(p.text, lang)}</div>
      <div className="flex justify-center gap-1.5 mt-3">{PHOTOS.map((_, k) => <span key={k} className="w-2 h-2 rounded-full" style={{ background: k === i ? ACC : "rgba(255,255,255,.2)" }} />)}</div>
    </Panel>
  );
}

// wave path helper: amp array → svg path
const wave = (fn: (x: number) => number) => Array.from({ length: 101 }, (_, k) => `${k ? "L" : "M"}${k * 3},${30 - fn(k)}`).join(" ");
const WAVES = [
  { id: "wind", en: "Gentle wind hum", bn: "মৃদু বাতাসের গুঞ্জন", d: wave((k) => Math.sin(k * 0.9) * 3) },
  { id: "quake", en: "Sudden big shake", bn: "হঠাৎ বড় কম্পন", d: wave((k) => (k > 35 ? Math.sin(k * 1.3) * 24 * Math.exp(-(k - 35) / 18) : Math.sin(k) * 1.5)) },
  { id: "flat", en: "Total silence", bn: "পুরো নীরবতা", d: wave(() => 0) },
];
const LAYERS = [
  { r: 100, c: "#c46a3c", en: "Crust", bn: "ভূত্বক" },
  { r: 78, c: "#8a3d2a", en: "Mantle", bn: "ম্যান্টল" },
  { r: 42, c: "#e8a33c", en: "Core", bn: "কেন্দ্র" },
];

function SeisLab({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [placed, setPlaced] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const ok = pick === "quake";
  return (
    <Panel onClose={onClose} title="📳 SEIS · LISTEN TO MARS">
      {!placed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-6xl animate-bounce">🛎️</div>
          <div className="text-sm opacity-85">{lang === "bn" ? "SEIS যন্ত্রটা মাটিতে বসাও, তারপর মঙ্গলের কম্পন শোনো!" : "Place the SEIS on the ground, then listen to Mars!"}</div>
          <button onClick={() => { audio.beep(500); setPlaced(true); }} className="px-6 py-3 rounded-full text-black font-bold tracking-widest" style={{ background: ACC }}>
            {lang === "bn" ? "⬇ SEIS বসাও" : "⬇ PLACE SEIS"}
          </button>
        </div>
      ) : (
        <>
          <div className="text-xs opacity-80 mt-2">{lang === "bn" ? "কোন সংকেতটা Marsquake? সঠিকটা বেছে নাও:" : "Which signal is a Marsquake? Pick the right one:"}</div>
          <div className="space-y-2 mt-2">
            {WAVES.map((w) => (
              <button key={w.id} onClick={() => { setPick(w.id); audio.beep(w.id === "quake" ? 1200 : 300); }}
                className={`w-full rounded-xl border p-2 text-left transition-all ${pick === w.id && !ok ? "border-red-400 animate-pulse" : ""}`}
                style={pick === w.id && ok ? { borderColor: GOLD, background: "rgba(255,217,125,.1)" } : pick === w.id ? undefined : { borderColor: "rgba(255,255,255,.15)" }}>
                <svg viewBox="0 0 300 60" className="w-full h-10"><path d={w.d} fill="none" stroke={ACC} strokeWidth="2" /></svg>
                <div className="text-[11px] opacity-80">{lang === "bn" ? w.bn : w.en}</div>
              </button>
            ))}
          </div>
          {pick && !ok && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "আবার দেখো! ভূমিকম্প হলে তরঙ্গ হঠাৎ বড় হয়ে যায় 📈" : "Look again! A quake makes the wave suddenly grow big 📈"}</div>}
          {ok && (
            <div className="flex items-center gap-3 mt-3">
              <svg viewBox="-105 -105 210 210" className="w-28 h-28 shrink-0">
                {LAYERS.map((l, k) => <circle key={l.en} r={l.r} fill={l.c} className="animate-[hubrise_0.8s_ease]" style={{ animationDelay: `${k * 0.4}s`, animationFillMode: "both" }} />)}
                <circle r="100" fill="none" stroke={ACC} strokeDasharray="6 6" className="animate-[spin_12s_linear_infinite]" />
              </svg>
              <div className="text-xs space-y-1">
                {LAYERS.map((l) => <div key={l.en}><span className="inline-block w-3 h-3 rounded-full mr-1 align-middle" style={{ background: l.c }} />{lang === "bn" ? l.bn : l.en}</div>)}
                <div className="font-bold mt-1" style={{ color: GOLD }}>{lang === "bn" ? "🎉 দারুণ! কম্পনের তরঙ্গ মঙ্গলের ভেতর দিয়ে গিয়ে স্তরগুলো দেখিয়ে দেয়!" : "🎉 Great! Quake waves travel through Mars and reveal its layers!"}</div>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

const CAUSES = [
  { id: "soil", icon: "🧱", en: "The soil clumped together and gave no grip", bn: "মাটি জমাট বেঁধে ছিল, মোল কোনো গ্রিপ পায়নি" },
  { id: "tired", icon: "😴", en: "Mole got sleepy", bn: "মোলের ঘুম পেয়েছিল" },
  { id: "water", icon: "💧", en: "It hit an underground ocean", bn: "মাটির নিচে সমুদ্র পেয়েছিল" },
];

function MoleDig({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [hits, setHits] = useState(0);
  const [cause, setCause] = useState<string | null>(null);
  const depth = Math.min(hits, 4) * 9; // stalls near ~35 cm in the drawing (real mole: about 40 cm of 5 m target)
  const stuck = hits >= 5;
  return (
    <Panel onClose={onClose} title="🦫 HP³ · HELP THE MOLE">
      <div className="relative mt-2 h-48 rounded-2xl overflow-hidden border" style={{ borderColor: `${ACC}66`, background: "linear-gradient(#e0a070 0 18%, #b5643a 18% 45%, #8a4426 45% 75%, #5a2a18 75%)" }}>
        <div className="absolute left-2 top-[20%] text-[10px] opacity-80">{lang === "bn" ? "আলগা ধুলো" : "Loose dust"}</div>
        <div className="absolute left-2 top-[48%] text-[10px] opacity-80">{lang === "bn" ? "জমাট মাটি (ডুরিক্রাস্ট)" : "Cemented soil (duricrust)"}</div>
        <div className="absolute left-2 top-[78%] text-[10px] opacity-80">{lang === "bn" ? "লক্ষ্য: ৫ মিটার গভীরে" : "Target: 5 m deep"}</div>
        <div className={`absolute left-1/2 -translate-x-1/2 w-5 h-14 rounded-b-full transition-all duration-500 ${stuck ? "animate-[ping_1s_ease-in-out_3]" : ""}`} style={{ top: `calc(8% + ${depth}%)`, background: "linear-gradient(#ddd,#888)", boxShadow: `0 0 10px ${ACC}` }} />
        {stuck && <div className="absolute right-3 top-3 text-xs font-bold px-2 py-1 rounded-full bg-black/60 text-red-300">⚠ {lang === "bn" ? "মোল আটকে গেছে!" : "Mole is stuck!"}</div>}
      </div>
      {!stuck ? (
        <button onClick={() => { audio.beep(200 + hits * 60); setHits((h) => h + 1); }} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest" style={{ background: ACC }}>
          🔨 {lang === "bn" ? `হাতুড়ি মারো! (${hits}/5)` : `HAMMER! (${hits}/5)`}
        </button>
      ) : (
        <>
          <div className="text-xs mt-3 opacity-85">{lang === "bn" ? "বিজ্ঞানীর মতো ভাবো: মোল কেন আটকে গেল?" : "Think like a scientist: why did Mole get stuck?"}</div>
          <div className="space-y-2 mt-2">
            {CAUSES.map((c) => (
              <button key={c.id} onClick={() => { setCause(c.id); audio.beep(c.id === "soil" ? 1200 : 300); }}
                className={`w-full text-left text-xs rounded-xl border px-3 py-2 ${cause === c.id && c.id !== "soil" ? "border-red-400 animate-pulse" : ""}`}
                style={cause === c.id && c.id === "soil" ? { borderColor: GOLD, background: "rgba(255,217,125,.1)" } : cause === c.id ? undefined : { borderColor: "rgba(255,255,255,.15)" }}>
                <span className="text-lg mr-1">{c.icon}</span>{lang === "bn" ? c.bn : c.en}
              </button>
            ))}
          </div>
          {cause === "soil" && <div className="mt-2 text-xs font-bold" style={{ color: GOLD }}>{lang === "bn" ? "ঠিক! মঙ্গলের মাটি অপ্রত্যাশিতভাবে জমাট ছিল, তাই মোল মাত্র প্রায় ৪০ সেমি যেতে পেরেছিল। ব্যর্থতাও বিজ্ঞানের শিক্ষা!" : "Right! The Martian soil was unexpectedly cemented, so Mole only got about 40 cm down. Even setbacks teach science!"}</div>}
          {cause && cause !== "soil" && <div className="mt-2 text-xs opacity-80">{lang === "bn" ? "উঁহু! মাটির স্তরগুলো আবার দেখো 🧱" : "Not quite! Look at the soil layers again 🧱"}</div>}
        </>
      )}
    </Panel>
  );
}

export function InsightEncounter() {
  const show = useGame((s) => s.showInsight);
  const lang = useGame((s) => s.lang);
  const [step, setStep] = useState<"welcome" | "explore" | "quiz" | "farewell" | "memory" | "done">("welcome");
  const [seen, setSeen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [line, setLine] = useState<{ who: Who; text: L }>({ who: "insight", text: LINES["02_insight_welcome"]! });
  const [wrong, setWrong] = useState<string | null>(null);
  const [panel, setPanel] = useState<"gallery" | "seis" | "mole" | null>(null);
  const [dust, setDust] = useState(0);

  const say = (clip: string, text: L, who: Who = "insight", then?: () => void) => {
    setLine({ who, text });
    setSpeaking(true);
    voice.play(V(clip), () => { setSpeaking(false); then?.(); });
  };

  useEffect(() => {
    if (!show) return;
    setStep("welcome"); setSeen([]); setActive(null); setWrong(null); setPanel(null); setDust(0);
    say("02_insight_welcome", LINES["02_insight_welcome"]!);
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // dust slowly covers the panels during the farewell
  useEffect(() => {
    if (step !== "farewell") return;
    const id = window.setInterval(() => setDust((d) => Math.min(1, d + 0.02)), 300);
    return () => window.clearInterval(id);
  }, [step]);

  if (!show) return null;

  const close = () => { voice.stop(); setSpeaking(false); store.set({ showInsight: false }); };
  const preserve = () => {
    audio.beep(660); setStep("memory");
    window.setTimeout(() => {
      setStep("done");
      audio.beep(1320);
      store.set({ flags: Array.from(new Set([...store.get().flags, "insight"])) });
      store.awardBadge("silent-listener");
      say("08_insight_badge", LINES["08_insight_badge"]!, "nova", () =>
        say("07_insight_zone_unlock", LINES["07_insight_zone_unlock"]!, "nova"));
    }, 2200);
  };
  const dim = step === "farewell" || step === "memory";

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:justify-end 2xl:justify-center p-3 pb-40 md:pr-8 transition-colors duration-1000 backdrop-blur-[2px]" style={{ background: `rgba(0,0,0,${dim ? 0.45 + dust * 0.4 : 0.4})` }}>
      {step === "memory" && <div className="pointer-events-none absolute inset-0 animate-[hubrise_1.2s_ease]" style={{ background: `radial-gradient(circle at 70% 35%, ${GOLD}aa, transparent 45%)` }} />}
      {step === "done" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }, (_, k) => (
            <span key={k} className="absolute w-2 h-3 rounded-sm animate-[ping_1.6s_ease-out_infinite]" style={{ left: `${(k * 37) % 100}%`, top: `${(k * 23) % 70}%`, background: k % 2 ? GOLD : ACC, animationDelay: `${(k % 7) * 0.2}s` }} />
          ))}
        </div>
      )}
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-180px)] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_20%,rgba(181,140,255,.22),rgba(10,6,20,.94)_65%)] shadow-[0_0_40px_rgba(181,140,255,.3)] p-4 text-[#efe8ff]" style={{ borderColor: `${ACC}88` }}>
        <button onClick={close} className="absolute top-3 right-4 text-xl opacity-70 hover:opacity-100" aria-label="Close">✕</button>
        <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>ELYSIUM PLANITIA · 2018–2022</div>
        <div className="text-2xl font-bold tracking-wide">INSIGHT <span className="text-xs align-middle opacity-70 tracking-[0.25em]">· THE SILENT LISTENER</span></div>
        <div className="relative mx-auto w-[min(260px,70vw)] mt-1">
          <div className="absolute inset-0 rounded-full border-2 border-dashed animate-[spin_30s_linear_infinite]" style={{ borderColor: `${ACC}55` }} />
          <div className="absolute inset-4 rounded-full" style={{ background: `radial-gradient(circle, ${step === "memory" || step === "done" ? GOLD + "66" : "rgba(181,140,255,.25)"}, transparent 70%)` }} />
          {speaking && line.who === "insight" && [0, 1, 2].map((k) => (
            <div key={k} className="pointer-events-none absolute inset-8 rounded-full border animate-[ping_2.4s_ease-out_infinite]" style={{ borderColor: `${ACC}88`, animationDelay: `${k * 0.8}s` }} />
          ))}
          <div style={{ filter: step === "farewell" ? `sepia(${dust}) brightness(${1 - dust * 0.55})` : undefined, transition: "filter .3s" }}>
            <RoverTurntable model="/models/insight.glb" accent={ACC} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1">
          {[["1,319", lang === "bn" ? "মার্সকোয়েক" : "marsquakes"], ["4 yrs", lang === "bn" ? "শুনেছে" : "listening"], ["0 m", lang === "bn" ? "ঘুরেছে (স্থির!)" : "driven (stayed!)"]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>
          ))}
        </div>
        {panel === "gallery" && <Gallery lang={lang} onClose={() => setPanel(null)} />}
        {panel === "seis" && <SeisLab lang={lang} onClose={() => setPanel(null)} />}
        {panel === "mole" && <MoleDig lang={lang} onClose={() => setPanel(null)} />}
        {createPortal(<HoloBubble key={line.who + t(line.text, lang)} speaker={line.who} text={t(line.text, lang)} speaking={speaking} />, document.body)}

        {step === "welcome" && (
          <button onClick={() => { voice.stop(); setSpeaking(false); setStep("explore"); }} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest" style={{ background: ACC }}>
            {lang === "bn" ? "চলো শুনি! →" : "LET'S LISTEN →"}
          </button>
        )}

        {step === "explore" && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {TOPICS.map((tp) => (
                <button key={tp.id} onClick={() => {
                  setActive(tp.id); setSeen((s) => (s.includes(tp.id) ? s : [...s, tp.id])); say(tp.id, tp.text, tp.who ?? "insight");
                  setPanel(tp.panel ?? null);
                }}
                  className="text-left text-xs rounded-2xl px-3 py-2 border transition-all"
                  style={active === tp.id ? { background: ACC, color: "#000", borderColor: ACC } : { background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.15)" }}>
                  <span className="text-lg mr-1">{tp.icon}</span>{t(tp.label, lang)}{seen.includes(tp.id) && active !== tp.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            {active === "03_insight_part_mars_wind" && (
              <div className="mt-3 rounded-2xl border p-2 bg-white/5" style={{ borderColor: `${ACC}55` }}>
                <svg viewBox="0 0 300 40" className="w-full h-8"><path d={wave((k) => Math.sin(k * 0.5 + Math.sin(k * 0.13) * 3) * 6)} transform="translate(0,-10)" fill="none" stroke={ACC} strokeWidth="2" className="animate-pulse" /></svg>
                <div className="text-[11px] opacity-80">🌬️ {lang === "bn" ? "মঙ্গলের বাতাসের ফিসফিস—ইনসাইটের সেন্সরে ধরা পড়া কম্পন" : "Whispers of Martian wind—vibrations caught by InSight's sensors"}</div>
              </div>
            )}
            {active === "03_insight_part_inner_secret" && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border p-2 bg-white/5" style={{ borderColor: `${ACC}55` }}>
                <svg viewBox="-105 -105 210 210" className="w-20 h-20 shrink-0">{LAYERS.map((l) => <circle key={l.en} r={l.r} fill={l.c} />)}</svg>
                <div className="text-[11px] space-y-0.5">{LAYERS.map((l) => <div key={l.en}><b style={{ color: l.c }}>●</b> {lang === "bn" ? l.bn : l.en}</div>)}</div>
              </div>
            )}
            {active === "09_insight_nasa_data_source" && (
              <div className="mt-3 space-y-2">
                {SOURCES.map((x) => (
                  <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs bg-white/5 border hover:bg-white/10" style={{ borderColor: `${ACC}66` }}>
                    <span className="text-lg">{x.icon}</span><span className="flex-1">{lang === "bn" ? x.bn : x.en}</span><span>↗</span>
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full transition-all" style={{ background: ACC, width: `${(Math.min(seen.length, 4) / 4) * 100}%` }} /></div>
              <button disabled={seen.length < 4} onClick={() => { setPanel(null); setActive(null); setWrong(null); setStep("quiz"); say("06_insight_quiz", LINES["06_insight_quiz"]!); }}
                className="px-4 py-2 rounded-full text-xs font-bold tracking-widest text-black disabled:opacity-30" style={{ background: ACC }}>
                {lang === "bn" ? "কুইজ →" : "QUIZ →"}
              </button>
            </div>
            <div className="text-[10px] mt-1 opacity-60">{lang === "bn" ? "কুইজ খুলতে অন্তত ৪টি বিষয় দেখো" : "Explore at least 4 topics to unlock the quiz"}</div>
          </>
        )}

        {step === "quiz" && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {QUIZ.map((o) => (
                <button key={o.id} onClick={() => {
                  if (o.id === "quake") { audio.beep(1200); setStep("farewell"); say("05_insight_farewell", LINES["05_insight_farewell"]!); }
                  else { audio.beep(300); setWrong(o.id); }
                }} className={`rounded-2xl py-3 px-1 font-bold border-2 transition-all hover:scale-105 ${wrong === o.id ? "border-red-400 text-red-300 animate-pulse" : ""}`} style={wrong === o.id ? undefined : { borderColor: ACC, color: ACC }}>
                  <div className="text-3xl">{o.icon}</div><div className="text-xs mt-1">{lang === "bn" ? o.bn : o.en}</div>
                </button>
              ))}
            </div>
            {wrong && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "প্রায় হয়েছে! মঙ্গলে পাখি বা সমুদ্র নেই—SEIS মাটির কাঁপুনি শোনে 📳" : "Close! Mars has no birds or oceans—SEIS listens to the ground shaking 📳"}</div>}
          </>
        )}

        {step === "farewell" && (
          <>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] opacity-75"><span>☀️ {lang === "bn" ? "সোলার শক্তি" : "Solar power"}</span><span>{Math.round((1 - dust * 0.95) * 100)}%</span></div>
              <div className="h-2.5 mt-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(1 - dust * 0.95) * 100}%`, background: dust > 0.7 ? "#ff6b5c" : `linear-gradient(90deg, ${ACC}, ${GOLD})` }} /></div>
            </div>
            <div className="mt-3 text-center text-sm italic opacity-90">{lang === "bn" ? "“এক্সপ্লোরার, ইনসাইট আর কথা বলতে পারছে না। কিন্তু তার পাঠানো তথ্য হারিয়ে যায়নি।”" : "“Explorer, InSight can't talk to us anymore. But the data it sent is never lost.”"}</div>
            <button onClick={preserve} disabled={speaking} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest animate-pulse disabled:opacity-30 disabled:animate-none" style={{ background: GOLD }}>
              💾 {lang === "bn" ? "ইনসাইটের স্মৃতি সংরক্ষণ করো" : "PRESERVE INSIGHT'S LEGACY"}
            </button>
          </>
        )}

        {step === "memory" && (
          <div className="mt-3 text-center font-bold" style={{ color: GOLD }}>✨ {lang === "bn" ? "ইনসাইটের ছবি ও আবিষ্কার Astro Relic স্মৃতি-গ্যালারিতে সংরক্ষিত হলো!" : "InSight's photos and discoveries are saved in the Astro Relic Memory Gallery!"}</div>
        )}

        {step === "done" && (
          <>
            <div className="mt-3 rounded-2xl border-2 p-3 text-center" style={{ borderColor: GOLD }}>
              <div className="text-4xl">🎧</div>
              <div className="font-bold tracking-widest" style={{ color: GOLD }}>SILENT LISTENER</div>
              <div className="text-[11px] opacity-80 mt-1">{lang === "bn" ? "চারটি মিশনই সম্পন্ন! 🚀" : "All four missions complete! 🚀"}</div>
            </div>
            <button onClick={() => { close(); store.set({ objective: { en: "All 4 missions complete — you are a true Astro Relic explorer!", bn: "চারটি মিশনই শেষ — তুমি সত্যিকারের অ্যাস্ট্রো রেলিক এক্সপ্লোরার!" } }); }} className="mt-3 w-full py-3 rounded-full border-2 font-bold tracking-widest" style={{ borderColor: ACC, color: ACC }}>
              {lang === "bn" ? "অভিযান চালিয়ে যাও →" : "CONTINUE EXPEDITION →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
