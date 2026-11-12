import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble, RoverTurntable } from "./MissionUI";

type L = { en: string; bn: string };
type Who = "oppy" | "nova";
const ACC = "#6cc6ff";
const GOLD = "#ffd97d";
const V = (c: string) => `oppy/${c}`;

const LINES: Record<string, L> = {
  "02_oppy_welcome": { en: "Hi little explorer! Everyone calls me Oppy. I'm the biggest traveler on Mars—I drove over 45 kilometers across this red desert!", bn: "হাই লিটল এক্সপ্লোরার! সবাই আমাকে ভালোবেসে ওপি বলে ডাকে। আমি মঙ্গলে সবচেয়ে বেশি পথ হেঁটেছি—পুরো ৪৫ কিলোমিটার!" },
  "05_oppy_farewell": { en: "In 2018, a giant planet-wide dust storm blacked out the sun. As my power faded, my message was: My battery is low and it's getting dark. I miss you all!", bn: "২০১৮ সালের বিশাল এক ধূলিঝড়ে মঙ্গলের আকাশ কালো হয়ে গিয়েছিল। আমার সোলার প্যানেলের শক্তি ফুরিয়ে আসছিল। আমি বলেছিলাম: আমার ব্যাটারি কম, অন্ধকার নেমে আসছে। তোমাদের সবাইকে মিস করি!" },
  "06_oppy_quiz": { en: "Quiz time! What sweet nickname did scientists give to the tiny round spheres I found in the Martian soil? Chocochips, Blueberries, or Apples?", bn: "কুইজ টাইম! আমি মাটিতে যেসব গোল মার্বেল পাথর পেয়েছিলাম, বিজ্ঞানীরা সেগুলোর কী নাম দিয়েছিলেন? চকোচিপস, ব্লুবেরি, নাকি আপেল?" },
  "07_oppy_zone_unlock": { en: "Brilliant answer! Oppy smiles with joy. Zone 4 is now unlocked—ahead lies InSight lander on the plains of Elysium!", bn: "অসাধারণ উত্তর! ওপি তোমার হাত ধরেছে। এবার চতুর্থ জোন খুলে গেল—এলিসিয়াম সমতলে ইনসাইট ল্যান্ডারের রোমাঞ্চকর রহস্য!" },
  "08_oppy_badge": { en: "Spectacular achievement! You've unlocked the golden 'Meridiani Marathoner' medal!", bn: "দারুণ জয়! তুমি আনলক করেছ 'Meridiani Marathoner' সোনালী মেডেল!" },
};

const TOPICS: { id: string; icon: string; label: L; text: L; who?: Who }[] = [
  { id: "03_oppy_part_blueberries", icon: "🫐", label: { en: "Martian blueberries", bn: "মার্সিয়ান ব্লুবেরি" }, text: { en: "With my microscopic imager, I found tiny round spheres like marbles on the ground! We named them 'Martian Blueberries'!", bn: "আমার বিশেষ মাইক্রোস্কোপিক ক্যামেরায় আমি মাটির ওপর গোল গোল মার্বেল পাথর খুঁজে পেয়েছিলাম! আমরা ওগুলোর নাম দিয়েছিলাম 'মার্সিয়ান ব্লুবেরি'!" } },
  { id: "03_oppy_part_hole_in_one", icon: "⛳", label: { en: "Hole-in-one landing", bn: "হোল-ইন-ওয়ান ল্যান্ডিং" }, text: { en: "When I landed, my airbags bounced across the plain and rolled right into the middle of a crater! NASA called it a hole-in-one!", bn: "মঙ্গলে নামার সময় আমার বড় বড় এয়ারব্যাগগুলো মাটিতে লাফাতে লাফাতে সোজা একটা গর্তের ভেতরে গিয়ে থামে! যেন গল্ফ খেলায় এক শটেই গোল!" } },
  { id: "03_oppy_part_rock_drill", icon: "🛠️", label: { en: "My rock drill (RAT)", bn: "আমার পাথর ড্রিল (RAT)" }, text: { en: "On my robotic arm, I carried a special rock grinder called RAT. I drilled into solid Martian rocks to peek inside their history!", bn: "আমার রোবোটিক হাতে ছিল রক অ্যাব্রেশন টুল (RAT)। আমি শক্ত মার্সিয়ান পাথরের ভেতর ড্রিল করে দেখতাম ভেতরের রহস্য!" } },
  { id: "03_oppy_part_marathon_wheels", icon: "🏃", label: { en: "Marathon wheels", bn: "ম্যারাথন চাকা" }, text: { en: "My six trusty wheels climbed giant craters and drove all the way across a full Olympic marathon on alien soil!", bn: "আমার ছয়টি চাকা পাহাড় বেয়ে উঠেছে, গভীর গর্তে নেমেছে, আর মঙ্গলের বুকে এক পূর্ণাঙ্গ অলিম্পিক ম্যারাথনের সমান পথ পাড়ি দিয়েছে!" } },
  { id: "04_oppy_photo_gallery", icon: "🖼️", label: { en: "My photo album", bn: "আমার ছবির অ্যালবাম" }, text: { en: "Want to see Victoria and Endurance craters through my eyes? I beamed home more than 217,000 photos of Mars!", bn: "আমার ক্যামেরার চোখে মঙ্গলের বিশাল এন্ডুরেন্স আর ভিক্টোরিয়া ক্রেটার দেখবে? ২ লক্ষেরও বেশি ছবি পাঠিয়েছি আমি!" } },
  { id: "09_nasa_data_source", icon: "🚀", who: "nova", label: { en: "NASA facts", bn: "নাসার তথ্য" }, text: { en: "NASA's Opportunity rover operated for 5,350 Martian Sols from 2004 to 2018, setting the off-world driving record of 45.16 km.", bn: "নাসার অপরচুনিটি রোভার ২০০৪ থেকে ২০১৮ পর্যন্ত মোট ৫,৩৫০ সল সক্রিয় ছিল এবং পৃথিবীর বাইরের গ্রহে সর্বোচ্চ দূরত্বের রেকর্ড গড়েছে।" } },
];

const QUIZ = [
  { id: "choc", icon: "🍫", en: "Chocochips", bn: "চকোচিপস" },
  { id: "blue", icon: "🫐", en: "Blueberries", bn: "ব্লুবেরি" },
  { id: "apple", icon: "🍎", en: "Apples", bn: "আপেল" },
];

const PHOTOS: { src: string; title: L; text: L }[] = [
  { src: "/images/oppy/PIA21494.jpg", title: { en: "Hole-in-one at Eagle Crater", bn: "ঈগল ক্রেটারে হোল-ইন-ওয়ান" }, text: { en: "Seen from orbit: the tiny crater where I rolled in, with my landing hardware nearby.", bn: "মহাকাশ থেকে দেখা: এই ছোট গর্তেই আমি গড়িয়ে ঢুকেছিলাম, পাশে আমার ল্যান্ডিংয়ের যন্ত্রাংশ।" } },
  { src: "/images/oppy/PIA06779.jpg", title: { en: "Blueberries in a rock", bn: "পাথরের ভেতর ব্লুবেরি" }, text: { en: "Round little spheres stuck in rock—they could only form with water!", bn: "পাথরে আটকে থাকা ছোট গোল দানা—এগুলো শুধু পানি থাকলেই তৈরি হয়!" } },
  { src: "/images/oppy/PIA09104.jpg", title: { en: "Inside Victoria Crater", bn: "ভিক্টোরিয়া ক্রেটারের ভেতর" }, text: { en: "The cliffs of Cape Verde—layers of Mars history like pages of a book.", bn: "কেপ ভার্দের খাড়া দেয়াল—বইয়ের পাতার মতো মঙ্গলের ইতিহাসের স্তর।" } },
  { src: "/images/oppy/PIA16923.jpg", title: { en: "My shadow at Endeavour", bn: "এন্ডেভারে আমার ছায়া" }, text: { en: "That's my own shadow, looking across giant Endeavour Crater.", bn: "ওটা আমারই ছায়া, বিশাল এন্ডেভার ক্রেটারের দিকে তাকিয়ে।" } },
];

const SOURCES = [
  { icon: "🛰️", en: "NASA Opportunity mission page", bn: "নাসার অপরচুনিটি মিশন পেজ", url: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/" },
  { icon: "🖼️", en: "Real Opportunity photos (NASA Photojournal)", bn: "অপরচুনিটির আসল ছবি (নাসা ফটোজার্নাল)", url: "https://photojournal.jpl.nasa.gov/mission/MER" },
];

const BERRIES = [{ x: 22, y: 68 }, { x: 71, y: 30 }, { x: 58, y: 80 }];

function Panel({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="absolute inset-0 z-[3] rounded-[28px] bg-[#05101a]/97 p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.3em]" style={{ color: ACC }}>{title}</div>
        <button onClick={onClose} className="text-xl opacity-70 hover:opacity-100" aria-label="Close panel">✕</button>
      </div>
      {children}
    </div>
  );
}

function Gallery({ lang, onClose }: { lang: "en" | "bn"; onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PHOTOS[i] ?? PHOTOS[0]!;
  const go = (d: number) => { audio.beep(900); setI((x) => (x + d + PHOTOS.length) % PHOTOS.length); };
  return (
    <Panel onClose={onClose} title="📸 NASA · OPPORTUNITY">
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

function BerryHunt({ lang, onClose }: { lang: "en" | "bn"; onClose: () => void }) {
  const [found, setFound] = useState<number[]>([]);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const done = found.length === BERRIES.length;
  return (
    <Panel onClose={onClose} title="🔍 BLUEBERRY HUNT">
      <div className="text-sm mt-1 opacity-90">{lang === "bn" ? "আতশকাচ ঘুরিয়ে লাল মাটিতে লুকানো ৩টি নীল ব্লুবেরি খুঁজে ট্যাপ করো!" : "Move the magnifier and tap the 3 hidden blueberries in the red soil!"}</div>
      <div className="relative mt-3 rounded-2xl overflow-hidden aspect-[4/3] cursor-none border" style={{ borderColor: `${ACC}66`, background: "radial-gradient(circle at 30% 40%,#b8613a,#7a3a20 60%,#4e2414)" }}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setLens({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onPointerLeave={() => setLens(null)}>
        {Array.from({ length: 40 }, (_, k) => <span key={k} className="absolute rounded-full" style={{ left: `${(k * 37) % 97}%`, top: `${(k * 53) % 93}%`, width: 4 + (k % 5) * 3, height: 4 + (k % 5) * 3, background: "rgba(60,25,12,.55)" }} />)}
        {BERRIES.map((b, k) => {
          const near = lens ? Math.hypot(lens.x - b.x, lens.y - b.y) < 16 : false;
          const got = found.includes(k);
          return (
            <button key={k} aria-label={`Blueberry ${k + 1}`} onClick={() => { if (got) return; audio.beep(1000 + k * 200); setFound((f) => [...f, k]); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: got ? 30 : 18, height: got ? 30 : 18, opacity: got || near ? 1 : 0.22,
                background: "radial-gradient(circle at 35% 30%,#bfe6ff,#3a6fa8 55%,#1c3256)", boxShadow: got ? `0 0 18px ${ACC}` : "none" }} />
          );
        })}
        {lens && <div className="pointer-events-none absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 shadow-[0_0_20px_rgba(108,198,255,.5)]" style={{ left: `${lens.x}%`, top: `${lens.y}%`, borderColor: ACC, background: "rgba(180,230,255,.08)" }} />}
      </div>
      <div className="mt-3 text-center font-bold" style={{ color: done ? GOLD : ACC }}>
        {done ? (lang === "bn" ? "🎉 দারুণ! তুমি সব ব্লুবেরি খুঁজে পেয়েছো—এগুলো পানির প্রমাণ!" : "🎉 Great! You found them all—proof of ancient water!") : `🫐 ${found.length} / 3`}
      </div>
    </Panel>
  );
}

function Marathon({ lang }: { lang: "en" | "bn" }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = window.setTimeout(() => setW(100), 50); return () => window.clearTimeout(id); }, []);
  return (
    <div className="mt-3 rounded-2xl border p-3 bg-white/5" style={{ borderColor: `${ACC}55` }}>
      <div className="flex justify-between text-[10px] opacity-75"><span>🚀 2004</span><span>🏁 42.2 km {lang === "bn" ? "ম্যারাথন" : "marathon"}</span><span>45.16 km</span></div>
      <div className="relative h-3 mt-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-[4000ms] ease-out" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${ACC}, ${GOLD})` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: "93.4%" }} />
      </div>
      <div className="text-[11px] mt-1 opacity-80">{lang === "bn" ? "ওপি একটা পুরো ম্যারাথনের চেয়েও বেশি পথ চলেছে! 🏅" : "Oppy drove farther than a full marathon! 🏅"}</div>
    </div>
  );
}

export function OppyEncounter() {
  const show = useGame((s) => s.showOppy);
  const lang = useGame((s) => s.lang);
  const [step, setStep] = useState<"welcome" | "explore" | "quiz" | "farewell" | "memory" | "done">("welcome");
  const [seen, setSeen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [line, setLine] = useState<{ who: Who; text: L }>({ who: "oppy", text: LINES["02_oppy_welcome"]! });
  const [wrong, setWrong] = useState<string | null>(null);
  const [panel, setPanel] = useState<"gallery" | "berries" | null>(null);

  const say = (clip: string, text: L, who: Who = "oppy", then?: () => void) => {
    setLine({ who, text });
    setSpeaking(true);
    voice.play(V(clip), () => { setSpeaking(false); then?.(); });
  };

  useEffect(() => {
    if (!show) return;
    setStep("welcome"); setSeen([]); setActive(null); setWrong(null); setPanel(null);
    say("02_oppy_welcome", LINES["02_oppy_welcome"]!);
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const close = () => { voice.stop(); setSpeaking(false); store.set({ showOppy: false }); };
  const holdHand = () => {
    audio.beep(660); setStep("memory");
    window.setTimeout(() => collect(), 1800);
  };
  const collect = () => {
    setStep("done");
    audio.beep(1320);
    store.set({ flags: Array.from(new Set([...store.get().flags, "oppy"])) });
    store.awardBadge("meridiani-marathoner");
    say("08_oppy_badge", LINES["08_oppy_badge"]!, "nova", () =>
      say("07_oppy_zone_unlock", LINES["07_oppy_zone_unlock"]!, "nova"));
  };
  const dim = step === "farewell" || step === "memory";

  return (
    <div className={`absolute inset-0 z-50 flex items-start justify-center md:justify-end 2xl:justify-center p-3 pb-40 md:pr-8 transition-colors duration-1000 ${dim ? "bg-black/75" : "bg-black/40"} backdrop-blur-[2px]`}>
      {step === "memory" && <div className="pointer-events-none absolute inset-0 animate-[hubrise_1.2s_ease]" style={{ background: `radial-gradient(circle at 70% 35%, ${GOLD}aa, transparent 45%)` }} />}
      {step === "done" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }, (_, k) => (
            <span key={k} className="absolute w-2 h-3 rounded-sm animate-[ping_1.6s_ease-out_infinite]" style={{ left: `${(k * 37) % 100}%`, top: `${(k * 23) % 70}%`, background: k % 2 ? GOLD : ACC, animationDelay: `${(k % 7) * 0.2}s` }} />
          ))}
        </div>
      )}
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-180px)] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_20%,rgba(108,198,255,.22),rgba(5,12,20,.94)_65%)] shadow-[0_0_40px_rgba(108,198,255,.3)] p-4 text-[#e6f4ff]" style={{ borderColor: `${ACC}88` }}>
        <button onClick={close} className="absolute top-3 right-4 text-xl opacity-70 hover:opacity-100" aria-label="Close">✕</button>
        <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>MERIDIANI PLANUM · 2004–2018</div>
        <div className="text-2xl font-bold tracking-wide">OPPY <span className="text-xs align-middle opacity-70 tracking-[0.25em]">· THE MARATHON CHAMPION</span></div>
        <div className="relative mx-auto w-[min(260px,70vw)] mt-1">
          <div className="absolute inset-0 rounded-full border-2 border-dashed animate-[spin_30s_linear_infinite]" style={{ borderColor: `${ACC}55` }} />
          <div className="absolute inset-4 rounded-full" style={{ background: `radial-gradient(circle, ${step === "memory" || step === "done" ? GOLD + "66" : "rgba(108,198,255,.25)"}, transparent 70%)` }} />
          <RoverTurntable model="/models/spirit.glb" accent={ACC} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1">
          {[["90 → 5352", lang === "bn" ? "সল কাজ" : "sols worked"], ["45.16 km", lang === "bn" ? "রেকর্ড পথ" : "record drive"], ["217k+", lang === "bn" ? "ছবি" : "photos"]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>
          ))}
        </div>
        {panel === "gallery" && <Gallery lang={lang} onClose={() => setPanel(null)} />}
        {panel === "berries" && <BerryHunt lang={lang} onClose={() => setPanel(null)} />}
        {createPortal(<HoloBubble key={line.who + t(line.text, lang)} speaker={line.who} text={t(line.text, lang)} speaking={speaking} />, document.body)}

        {step === "welcome" && (
          <button onClick={() => { voice.stop(); setSpeaking(false); setStep("explore"); }} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest" style={{ background: ACC }}>
            {lang === "bn" ? "চলো জানি! →" : "LET'S EXPLORE →"}
          </button>
        )}

        {step === "explore" && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {TOPICS.map((tp) => (
                <button key={tp.id} onClick={() => {
                  setActive(tp.id); setSeen((s) => (s.includes(tp.id) ? s : [...s, tp.id])); say(tp.id, tp.text, tp.who ?? "oppy");
                  setPanel(tp.id === "04_oppy_photo_gallery" ? "gallery" : tp.id === "03_oppy_part_blueberries" ? "berries" : null);
                }}
                  className="text-left text-xs rounded-2xl px-3 py-2 border transition-all"
                  style={active === tp.id ? { background: ACC, color: "#000", borderColor: ACC } : { background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.15)" }}>
                  <span className="text-lg mr-1">{tp.icon}</span>{t(tp.label, lang)}{seen.includes(tp.id) && active !== tp.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            {active === "03_oppy_part_marathon_wheels" && <Marathon lang={lang} />}
            {active === "09_nasa_data_source" && (
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
              <button disabled={seen.length < 4} onClick={() => { setPanel(null); setActive(null); setWrong(null); setStep("quiz"); say("06_oppy_quiz", LINES["06_oppy_quiz"]!); }}
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
                  if (o.id === "blue") { audio.beep(1200); setStep("farewell"); say("05_oppy_farewell", LINES["05_oppy_farewell"]!); }
                  else { audio.beep(300); setWrong(o.id); }
                }} className={`rounded-2xl py-3 px-1 font-bold border-2 transition-all hover:scale-105 ${wrong === o.id ? "border-red-400 text-red-300 animate-pulse" : ""}`} style={wrong === o.id ? undefined : { borderColor: ACC, color: ACC }}>
                  <div className="text-3xl">{o.icon}</div><div className="text-xs mt-1">{lang === "bn" ? o.bn : o.en}</div>
                </button>
              ))}
            </div>
            {wrong && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "প্রায় হয়েছে! ছোট্ট গোল নীলচে দানা—কোন ফলের মতো দেখতে? 🫐" : "Close! Tiny round bluish spheres—which fruit do they look like? 🫐"}</div>}
          </>
        )}

        {step === "farewell" && (
          <>
            <div className="mt-3 text-center text-sm italic opacity-90">🔋 “My battery is low and it's getting dark.”</div>
            <button onClick={holdHand} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest animate-pulse" style={{ background: GOLD }}>
              🤝 {lang === "bn" ? "ওপির হাত ধরো" : "HOLD OPPY'S HAND"}
            </button>
          </>
        )}

        {step === "memory" && (
          <div className="mt-3 text-center font-bold" style={{ color: GOLD }}>✨ {lang === "bn" ? "ওপি হারিয়ে যায়নি—বিজ্ঞানের ইতিহাসে অমর হয়ে আছে!" : "Oppy isn't lost—she lives forever in science history!"}</div>
        )}

        {step === "done" && (
          <>
            <div className="mt-3 rounded-2xl border-2 p-3 text-center" style={{ borderColor: GOLD }}>
              <div className="text-4xl">🏅</div>
              <div className="font-bold tracking-widest" style={{ color: GOLD }}>MERIDIANI MARATHONER</div>
            </div>
            <button onClick={() => { close(); store.set({ objective: { en: "InSight awaits on Elysium Planitia", bn: "এলিসিয়াম সমতলে ইনসাইট অপেক্ষা করছে" } }); }} className="mt-3 w-full py-3 rounded-full border-2 font-bold tracking-widest" style={{ borderColor: ACC, color: ACC }}>
              {lang === "bn" ? "অভিযান চালিয়ে যাও →" : "CONTINUE EXPEDITION →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
