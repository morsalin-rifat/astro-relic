import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble, RoverTurntable } from "./MissionUI";

type L = { en: string; bn: string };
const ACC = "#ff8a5c";
const V = (c: string) => `spirit/${c}`;

const LINES: Record<string, L> = {
  "02_spirit_welcome": { en: "Hello friend! I'm Spirit. I only came for 90 days in 2004, but I kept fighting and exploring for over 6 whole years!", bn: "হ্যালো ফ্রেন্ড! আমি স্পিরিট। ২০০৪ সালে মাত্র ৯০ দিনের জন্য এসেছিলাম, কিন্তু আমি লড়াই করেছি টানা ৬ বছর!" },
  "04_spirit_photo_gallery": { en: "Want to see my memory album? From climbing Husband Hill to the blue sunset—I captured it all for you!", bn: "আমার অ্যালবাম দেখবে? কলম্বিয়া পাহাড়ের চূড়া থেকে শুরু করে লাল গ্রহের নীল সূর্যাস্ত—সব ছবি তোমাদের জন্য তুলেছি!" },
  "05_spirit_farewell": { en: "In 2010, my wheels got stuck in soft sand at 'Troy'. But I conquered nearly 8 kilometers! Never give up on your journey!", bn: "২০১০ সালে 'ট্রয়' নামের নরম বালিতে আমার চাকা আটকে যায়। কিন্তু আমি মোট ৭.৭ কিলোমিটার পথ জয় করেছি। হার মেনো না কখনো!" },
  "06_spirit_quiz": { en: "Challenge time! What did my dragging broken wheel uncover in the soil? Chocolate, hot-spring silica, or ice cubes?", bn: "চ্যালেঞ্জের সময়! আমার ভাঙা চাকা মাটি খুঁড়ে কী আবিষ্কার করেছিল? চকলেট, গরম পানির সিলিকা, নাকি বরফ?" },
  "08_spirit_badge": { en: "Congratulations! You've earned the 'Gusev Fighter' explorer badge!", bn: "অভিনন্দন! তুমি অর্জন করেছ 'Gusev Fighter' সম্মাননা ব্যাজ!" },
  "07_spirit_zone_unlock": { en: "Brilliant! Spirit salutes you! The trail to Meridiani Planum is now unlocked—where our marathon rover Opportunity awaits!", bn: "চমৎকার! স্পিরিট তোমাকে স্যালুট জানাচ্ছে! এবার খুলে গেল মেরিডিয়ানি প্লেনাম—যেখানে অপেক্ষা করছে ম্যারাথন রোভার অপরচুনিটি!" },
};

const TOPICS: { id: string; icon: string; label: L; text: L }[] = [
  { id: "03_spirit_part_broken_wheel", icon: "🛞", label: { en: "My broken wheel", bn: "আমার ভাঙা চাকা" }, text: { en: "Wonder what happened to my front-right wheel? When it got stuck, I dragged it backward like a plow—and that led to a magical discovery!", bn: "জানতে চাও আমার এই ডান চাকাটার কী হয়েছিল? এটা অকেজো হয়ে গেলে আমি পেছনের চাকা দিয়ে টেনে টেনে চলতাম। আর তাতেই ঘটেছিল এক অলৌকিক ঘটনা!" } },
  { id: "03_spirit_part_silica_secret", icon: "✨", label: { en: "The silica secret", bn: "সিলিকার রহস্য" }, text: { en: "My dragging wheel scraped off the red soil, revealing bright white silica! It proved ancient Mars had bubbly hot springs!", bn: "আমার ভাঙা চাকার দাগে লাল ধুলোর নিচে চকচকে সাদা সিলিকা পাথর বের হয়ে পড়ে! বিজ্ঞানীরা বুঝলেন, এখানে একসময় গরম পানির ঝর্ণা ছিল!" } },
  { id: "03_spirit_part_dust_devils", icon: "🌪️", label: { en: "My dust devil friends", bn: "ধূলিঝড় বন্ধু" }, text: { en: "Martian dust devils were my secret friends! Whenever dust covered my solar panels, mini whirlwinds blew them squeaky clean!", bn: "মঙ্গলের ধূলিঝড় বা ডাস্ট ডেভিল আমার বন্ধু ছিল! যখনই আমার সোলার প্যানেলে ধুলো জমত, ছোট লাল টর্নেডো এসে ফুঁ দিয়ে প্যানেল পরিষ্কার করে দিত!" } },
  { id: "03_spirit_part_pancam_eyes", icon: "📷", label: { en: "My Pancam eyes", bn: "আমার প্যানক্যাম চোখ" }, text: { en: "With my tall Pancam eyes, I took humanity's first picture of a Martian blue sunset and sent it all the way home to Earth.", bn: "আমার মাথার প্যানক্যাম (Pancam) ক্যামেরা দিয়ে আমি প্রথমবারের মতো মঙ্গলের আকাশে নীল সূর্যাস্তের অপূর্ব ছবি তুলে পৃথিবীতে পাঠিয়েছিলাম।" } },
  { id: "04_spirit_photo_gallery", icon: "🖼️", label: { en: "My photo album", bn: "আমার ছবির অ্যালবাম" }, text: LINES["04_spirit_photo_gallery"]! },
  { id: "09_spirit_nasa_data_source", icon: "🚀", label: { en: "NASA facts", bn: "নাসার তথ্য" }, text: { en: "According to NASA's MER mission data, Spirit operated on Mars from 2004 to 2010, traveling 7.73 kilometers.", bn: "নাসার মার্স এক্সপ্লোরেশন রোভার (MER) মিশন অনুযায়ী স্পিরিট ২০০৪ থেকে ২০১০ পর্যন্ত মঙ্গলে বৈজ্ঞানিক অভিযান চালায়।" } },
];

const QUIZ = [
  { id: "choc", icon: "🍫", en: "Chocolate", bn: "চকলেট" },
  { id: "silica", icon: "♨️", en: "Hot-spring silica", bn: "গরম পানির সিলিকা" },
  { id: "ice", icon: "🧊", en: "Ice cubes", bn: "বরফ" },
];

const PHOTOS: { src: string; title: L; text: L }[] = [
  { src: "/images/spirit/PIA07997.jpg", title: { en: "Blue sunset on Mars", bn: "মঙ্গলের নীল সূর্যাস্ত" }, text: { en: "On Mars, sunsets glow blue! I took this from Gusev Crater in 2005.", bn: "মঙ্গলে সূর্যাস্ত নীল দেখায়! ২০০৫ সালে গুসেভ ক্রেটার থেকে এই ছবি তুলেছিলাম।" } },
  { src: "/images/spirit/PIA17760.jpg", title: { en: "View from Husband Hill", bn: "হাজব্যান্ড হিলের চূড়া থেকে" }, text: { en: "I climbed a hill in the Columbia Hills and looked out over Gusev.", bn: "কলম্বিয়া পাহাড়ের এক চূড়ায় উঠে পুরো গুসেভ দেখেছিলাম।" } },
  { src: "/images/spirit/PIA11990.jpg", title: { en: "My bright wheel track", bn: "আমার চাকার সাদা দাগ" }, text: { en: "See the white stripe? My dragging wheel dug up bright soil near Home Plate.", bn: "সাদা দাগটা দেখছো? আমার টেনে চলা চাকা হোম প্লেটের কাছে উজ্জ্বল মাটি বের করেছিল।" } },
  { src: "/images/spirit/PIA12007.jpg", title: { en: "Stuck at Troy", bn: "ট্রয়ে আটকে যাওয়া" }, text: { en: "In 2009 my wheels sank into soft sand here. This was my last home.", bn: "২০০৯ সালে এখানে নরম বালিতে আমার চাকা ডুবে যায়। এটাই ছিল আমার শেষ ঠিকানা।" } },
];

const SOURCES = [
  { icon: "🛰️", en: "NASA Spirit & Opportunity mission page", bn: "নাসার স্পিরিট ও অপরচুনিটি মিশন পেজ", url: "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/" },
  { icon: "🖼️", en: "Real Spirit photos (NASA Photojournal)", bn: "স্পিরিটের আসল ছবি (নাসা ফটোজার্নাল)", url: "https://photojournal.jpl.nasa.gov/mission/MER" },
];

function Gallery({ lang, onClose }: { lang: "en" | "bn"; onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PHOTOS[i] ?? PHOTOS[0]!;
  const go = (d: number) => { audio.beep(900); setI((x) => (x + d + PHOTOS.length) % PHOTOS.length); };
  return (
    <div className="absolute inset-0 z-[3] rounded-[28px] bg-[#0c0806]/97 p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.3em]" style={{ color: ACC }}>📸 NASA · SPIRIT</div>
        <button onClick={onClose} className="text-xl opacity-70 hover:opacity-100" aria-label="Close photos">✕</button>
      </div>
      <div className="relative mt-2 rounded-2xl overflow-hidden border bg-black aspect-[4/3]" style={{ borderColor: `${ACC}66` }}>
        <img key={p.src} src={p.src} alt={t(p.title, lang)} className="w-full h-full object-contain animate-[hubrise_0.4s_ease]" />
        {[-1, 1].map((d) => (
          <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Previous" : "Next"} className={`absolute ${d < 0 ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border text-xl`} style={{ borderColor: ACC, color: ACC }}>{d < 0 ? "‹" : "›"}</button>
        ))}
        <div className="absolute bottom-2 right-3 text-[10px] bg-black/60 px-2 py-0.5 rounded-full">{i + 1}/{PHOTOS.length}</div>
      </div>
      <div className="mt-3 text-lg font-bold" style={{ color: ACC }}>{t(p.title, lang)}</div>
      <div className="mt-1 text-sm leading-relaxed opacity-90">{t(p.text, lang)}</div>
      <div className="flex justify-center gap-2 mt-3">
        {PHOTOS.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className="h-2 rounded-full transition-all" style={{ width: k === i ? 24 : 8, background: k === i ? ACC : "rgba(255,255,255,.3)" }} />)}
      </div>
      <div className="mt-auto pt-2 text-[9px] opacity-50 text-center">Images: NASA/JPL-Caltech</div>
    </div>
  );
}

export function SpiritEncounter() {
  const show = useGame((s) => s.showSpirit);
  const lang = useGame((s) => s.lang);
  const [step, setStep] = useState<"welcome" | "explore" | "quiz" | "farewell" | "done">("welcome");
  const [seen, setSeen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [line, setLine] = useState<{ who: "spirit" | "nova"; text: L }>({ who: "spirit", text: LINES["02_spirit_welcome"]! });
  const [wrong, setWrong] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false);

  const say = (clip: string, text: L, who: "spirit" | "nova" = "spirit", then?: () => void) => {
    setLine({ who, text });
    setSpeaking(true);
    voice.play(V(clip), () => { setSpeaking(false); then?.(); });
  };

  useEffect(() => {
    if (!show) return;
    setStep("welcome"); setSeen([]); setActive(null); setWrong(null); setGallery(false);
    say("02_spirit_welcome", LINES["02_spirit_welcome"]!);
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const close = () => { voice.stop(); setSpeaking(false); store.set({ showSpirit: false }); };
  const collect = () => {
    setStep("done");
    audio.beep(1320);
    store.set({ flags: Array.from(new Set([...store.get().flags, "spirit"])) });
    store.awardBadge("gusev-fighter");
    say("08_spirit_badge", LINES["08_spirit_badge"]!, "nova", () =>
      say("07_spirit_zone_unlock", LINES["07_spirit_zone_unlock"]!, "nova"));
  };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:justify-end 2xl:justify-center p-3 pb-40 md:pr-8 bg-black/40 backdrop-blur-[2px]">
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-180px)] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_20%,rgba(255,120,80,.2),rgba(12,8,6,.93)_65%)] shadow-[0_0_40px_rgba(255,120,80,.28)] p-4 text-[#ffe9c8]" style={{ borderColor: `${ACC}88` }}>
        <button onClick={close} className="absolute top-3 right-4 text-xl opacity-70 hover:opacity-100" aria-label="Close">✕</button>
        <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>GUSEV CRATER · 2004–2010</div>
        <div className="text-2xl font-bold tracking-wide">SPIRIT <span className="text-xs align-middle opacity-70 tracking-[0.25em]">· THE BRAVE FIGHTER</span></div>
        <div className="relative mx-auto w-[min(260px,70vw)] mt-1">
          <div className="absolute inset-0 rounded-full border-2 border-dashed animate-[spin_30s_linear_infinite]" style={{ borderColor: `${ACC}55` }} />
          <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,130,90,.25),transparent_70%)]" />
          <RoverTurntable model="/models/spirit.glb" accent={ACC} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-1">
          {[["90 → 2208", lang === "bn" ? "সল কাজ" : "sols worked"], ["7.73 km", lang === "bn" ? "পথ চলা" : "driven"], ["6", lang === "bn" ? "চাকা" : "wheels"]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>
          ))}
        </div>
        {gallery && <Gallery lang={lang} onClose={() => setGallery(false)} />}
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
                <button key={tp.id} onClick={() => { setActive(tp.id); setSeen((s) => (s.includes(tp.id) ? s : [...s, tp.id])); say(tp.id, tp.text, tp.id.startsWith("09") ? "nova" : "spirit"); setGallery(tp.id === "04_spirit_photo_gallery"); }}
                  className="text-left text-xs rounded-2xl px-3 py-2 border transition-all"
                  style={active === tp.id ? { background: ACC, color: "#000", borderColor: ACC } : { background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.15)" }}>
                  <span className="text-lg mr-1">{tp.icon}</span>{t(tp.label, lang)}{seen.includes(tp.id) && active !== tp.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            {active === "09_spirit_nasa_data_source" && (
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
              <button disabled={seen.length < 4} onClick={() => { setGallery(false); setActive(null); setWrong(null); setStep("quiz"); say("06_spirit_quiz", LINES["06_spirit_quiz"]!); }}
                className="px-4 py-2 rounded-full text-xs font-bold tracking-widest text-black disabled:opacity-30" style={{ background: ACC }}>
                {lang === "bn" ? "চ্যালেঞ্জ →" : "CHALLENGE →"}
              </button>
            </div>
            <div className="text-[10px] mt-1 opacity-60">{lang === "bn" ? "চ্যালেঞ্জ খুলতে অন্তত ৪টি বিষয় দেখো" : "Explore at least 4 topics to unlock the challenge"}</div>
          </>
        )}

        {step === "quiz" && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {QUIZ.map((o) => (
                <button key={o.id} onClick={() => {
                  if (o.id === "silica") { audio.beep(1200); setStep("farewell"); say("05_spirit_farewell", LINES["05_spirit_farewell"]!); }
                  else { audio.beep(300); setWrong(o.id); }
                }} className={`rounded-2xl py-3 px-1 font-bold border-2 transition-all hover:scale-105 ${wrong === o.id ? "border-red-400 text-red-300 animate-pulse" : ""}`} style={wrong === o.id ? undefined : { borderColor: ACC, color: ACC }}>
                  <div className="text-3xl">{o.icon}</div><div className="text-xs mt-1">{lang === "bn" ? o.bn : o.en}</div>
                </button>
              ))}
            </div>
            {wrong && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "প্রায় হয়েছে! আমার ভাঙা চাকার দাগে সাদা কী দেখা গিয়েছিল? ✨" : "Close! What white stuff did my dragging wheel reveal? ✨"}</div>}
          </>
        )}

        {step === "farewell" && (
          <button onClick={collect} className="mt-3 w-full py-3 rounded-full text-black font-bold tracking-widest" style={{ background: ACC }}>
            🛡️ {lang === "bn" ? "ব্যাজ সংগ্রহ করো" : "COLLECT BADGE"}
          </button>
        )}

        {step === "done" && (
          <button onClick={() => { close(); store.set({ objective: { en: "Opportunity awaits in Meridiani Planum", bn: "মেরিডিয়ানি প্লেনামে অপরচুনিটি অপেক্ষা করছে" } }); }} className="mt-3 w-full py-3 rounded-full border-2 font-bold tracking-widest" style={{ borderColor: ACC, color: ACC }}>
            {lang === "bn" ? "অভিযান চালিয়ে যাও →" : "CONTINUE EXPEDITION →"}
          </button>
        )}
      </div>
    </div>
  );
}
