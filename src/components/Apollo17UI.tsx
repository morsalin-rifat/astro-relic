import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble } from "./MissionUI";
import LINES from "../data/apollo17Lines.json";

/** Apollo 17 mission (moon zone 3, Taurus-Littrow). Same flow as Apollo15UI. Clips: public/audio/apollo17/<clip>_<en|bn>.mp3 */
type L = { en: string; bn: string };
type Who = "nova" | "challenger";
const IMG = (n: string) => `/images/apollo17/${n}.jpg`;
const SPOT_IMG: Record<string, string> = { challenger: "challenger", lrv17: "rover_fix", orange: "orange", tdc: "tdc", lastStep: "last_step", plaque17: "plaque", alsep17: "alsep" };
const STORY_IMG = ["valley", "rover_fix", "orange", "tracy", "last_step", "farewell"];
const LN = LINES as Record<string, L>;
const ACC = "#ff9d5c";
const V = (c: string) => `apollo17/${c}`;
const LANDER = ["challenger"];
const CH_SPEAK = ["story_orange_soil", "story_last_step", "story_farewell"];

const STORY: { clip: string; icon: string; year: string; title: L }[] = [
  { clip: "story_valley", icon: "⛰️", year: "11 Dec 1972", title: { en: "The Giant Valley", bn: "বিশাল উপত্যকা" } },
  { clip: "story_rover_fix", icon: "🗺️", year: "Maps + tape!", title: { en: "The Duct-Tape Fender", bn: "ম্যাপ আর টেপের মাডগার্ড" } },
  { clip: "story_orange_soil", icon: "🟠", year: "Shorty Crater", title: { en: "Orange Soil Surprise", bn: "কমলা মাটির বিস্ময়" } },
  { clip: "story_tracy_rock", icon: "💝", year: "For Tracy", title: { en: "A Dad's Gift: TDC", bn: "বাবার উপহার: TDC" } },
  { clip: "story_last_step", icon: "👣", year: "14 Dec 1972", title: { en: "The Last Footstep", bn: "শেষ পদচিহ্ন" } },
  { clip: "story_farewell", icon: "🌌", year: "50+ years", title: { en: "50 Years of Silence", bn: "৫০ বছরের নীরবতা" } },
];

type Spot = { id: string; clip: string; icon: string; name: L; fact: L };
const SPOTS: Spot[] = [
  { id: "challenger", clip: "spot_challenger", icon: "🚀", name: { en: "Challenger's Base", bn: "চ্যালেঞ্জারের ভিত্তি" }, fact: { en: "The last crewed lander on the Moon", bn: "চাঁদে মানুষ নিয়ে আসা শেষ ল্যান্ডার" } },
  { id: "lrv17", clip: "spot_lrv17", icon: "🏎️", name: { en: "Moon Buggy LRV-3", bn: "চাঁদের গাড়ি LRV-3" }, fact: { en: "Fender fixed with 4 maps + tape!", bn: "৪টা ম্যাপ + টেপ দিয়ে মাডগার্ড!" } },
  { id: "orange", clip: "spot_shorty", icon: "🟠", name: { en: "Orange Soil · Shorty", bn: "কমলা মাটি · শর্টি" }, fact: { en: "Volcanic glass ≈3.6 billion years old", bn: "≈৩৬০ কোটি বছরের আগ্নেয় কাঁচ" } },
  { id: "tdc", clip: "spot_tracy", icon: "💝", name: { en: "\"TDC\" in the dust", bn: "ধুলোয় লেখা \"TDC\"" }, fact: { en: "No wind = marks stay for ages", bn: "বাতাস নেই = দাগ মুছে না" } },
  { id: "lastStep", clip: "spot_last_step", icon: "👣", name: { en: "The Last Footprint", bn: "শেষ পদচিহ্ন" }, fact: { en: "Gene Cernan · 14 Dec 1972", bn: "জিন সারনান · ১৪ ডিসেম্বর ১৯৭২" } },
  { id: "plaque17", clip: "spot_plaque17", icon: "📜", name: { en: "Farewell Plaque", bn: "বিদায়ী ফলক" }, fact: { en: "\"May the spirit of peace...\"", bn: "\"শান্তির মন ছড়িয়ে পড়ুক...\"" } },
  { id: "alsep17", clip: "spot_alsep17", icon: "📡", name: { en: "Science Station", bn: "বিজ্ঞান কেন্দ্র" }, fact: { en: "Measured quakes, meteors & heat", bn: "কম্পন, উল্কা আর তাপ মাপত" } },
];
const SPOT_IDS = SPOTS.map((s) => s.id);

const QUIZ: { clip: string; opts: { icon: string; t: L; ok?: boolean }[]; hint: L }[] = [
  { clip: "quiz_1", hint: { en: "Something you read to find the way!", bn: "পথ খুঁজতে যা দেখে!" }, opts: [{ icon: "🗺️", t: { en: "Maps & duct tape", bn: "ম্যাপ আর টেপ" }, ok: true }, { icon: "🧴", t: { en: "Glue", bn: "আঠা" } }, { icon: "🪢", t: { en: "Rope", bn: "দড়ি" } }] },
  { clip: "quiz_2", hint: { en: "The color of an orange fruit!", bn: "কমলালেবুর রং!" }, opts: [{ icon: "🔵", t: { en: "Blue", bn: "নীল" } }, { icon: "🟠", t: { en: "Orange", bn: "কমলা" }, ok: true }, { icon: "🟢", t: { en: "Green", bn: "সবুজ" } }] },
  { clip: "quiz_3", hint: { en: "Her initials — 3 letters!", bn: "নামের আদ্যক্ষর — ৩টা অক্ষর!" }, opts: [{ icon: "🎂", t: { en: "Happy Birthday", bn: "শুভ জন্মদিন" } }, { icon: "💝", t: { en: "TDC", bn: "TDC" }, ok: true }, { icon: "❤️", t: { en: "Love", bn: "ভালোবাসা" } }] },
];

type Stage = "idle" | "go" | "welcome" | "story" | "hunt" | "spot" | "return" | "memory" | "log" | "pledge" | "quiz" | "badge" | "done";

export function Apollo17Mission() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const near = useGame((s) => s.moonNear);
  const driving = useGame((s) => s.moonDriving);
  const [stage, setStage] = useState<Stage>("idle");
  const [line, setLine] = useState<{ who: Who; text: L } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [slide, setSlide] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [cut, setCut] = useState(false);
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState(false);
  const museum = useRef(false);

  const say = (clip: string | null, text: L, who: Who = "nova", then?: () => void) => {
    setLine({ who, text });
    if (!clip) { setSpeaking(false); voice.stop(); then?.(); return; }
    setSpeaking(true);
    voice.play(V(clip), () => { setSpeaking(false); then?.(); });
  };
  const sayC = (clip: string, who: Who = "nova", then?: () => void) => say(clip, LN[clip]!, who, then);
  const hush = () => { voice.stop(); setSpeaking(false); };
  const freeze = (f: boolean) => store.set({ moonFreeze: f });
  const objective = (o: L) => store.set({ objective: o });
  const reset = () => { setSeen([]); setSlide(0); setQi(0); setSpot(null); setCut(false); };
  const meet = () => { museum.current = false; reset(); freeze(true); setStage("welcome"); sayC("welcome", "challenger"); };

  useEffect(() => store.on("a17:arrive", () => {
    reset(); setStage("go");
    objective({ en: "🚀 Walk to the lander Challenger", bn: "🚀 ল্যান্ডার চ্যালেঞ্জারের কাছে হেঁটে যাও" });
    window.setTimeout(() => sayC("arrival"), 600);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => store.on("a17:revisit", () => { setStage("done"); museum.current = true; }), []);
  useEffect(() => { const off = ["a11:arrive", "a11:revisit", "a12:arrive", "a12:revisit", "a15:arrive", "a15:revisit"].map((ev) => store.on(ev, () => { setLine(null); setStage((st) => (st === "go" ? "idle" : st)); })); return () => off.forEach((o) => o()); }, []); // other zone entered
  useEffect(() => { if (phase !== "moon") { setStage("idle"); setLine(null); hush(); } }, [phase]);

  const action: { label: L; run: () => void } | null = (() => {
    if (phase !== "moon" || !near || !SPOT_IDS.includes(near)) return null;
    const atLander = LANDER.includes(near);
    if (stage === "go" && atLander) return { label: { en: "Meet Challenger", bn: "চ্যালেঞ্জারের সাথে কথা বলো" }, run: meet };
    if (stage === "hunt" && !seen.includes(near)) { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Inspect: ${s.name.en}`, bn: `দেখো: ${s.name.bn}` }, run: () => openSpot(s) }; }
    if (stage === "return" && atLander) return { label: { en: "Hear Challenger's last message", bn: "চ্যালেঞ্জারের শেষ বার্তা শোনো" }, run: () => { freeze(true); setStage("memory"); audio.beep(520); sayC("reactivate", "nova", () => setStage((s) => (s === "memory" ? "log" : s))); } };
    if (stage === "done" && atLander) return { label: { en: "🔄 Replay with Challenger", bn: "🔄 চ্যালেঞ্জারের সাথে আবার খেলো" }, run: meet };
    if (stage === "done") { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Look again: ${s.name.en}`, bn: `আবার দেখো: ${s.name.bn}` }, run: () => { museum.current = true; openSpot(s); } }; }
    return null;
  })();
  const actRef = useRef(action); actRef.current = action;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "KeyE" && actRef.current) { e.preventDefault(); actRef.current.run(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const openSpot = (s: Spot) => { freeze(true); setSpot(s); setCut(false); setStage("spot"); audio.beep(1100); sayC(s.clip, s.id === "challenger" || s.id === "plaque17" ? "challenger" : "nova"); };
  const huntObjective = (n: number) => objective({ en: `🔍 Find the ${7 - n} golden stars around Challenger (${n}/7)`, bn: `🔍 চ্যালেঞ্জারের চারপাশে ${7 - n}টি সোনালি তারা খোঁজো (${n}/7)` });
  const closeSpot = () => {
    if (!spot) return;
    if (museum.current) { setSpot(null); hush(); freeze(false); setLine(null); setStage("done"); return; }
    const n = seen.includes(spot.id) ? seen : [...seen, spot.id];
    setSeen(n); setSpot(null); hush(); freeze(false);
    if (n.length >= 7) {
      setStage("return");
      objective({ en: "✨ All found! Go back to Challenger for its last message", bn: "✨ সব পেয়েছো! চ্যালেঞ্জারের কাছে ফিরে গিয়ে ওর শেষ বার্তা শোনো" });
      say(null, { en: "You found everything! Now go back to the lander Challenger.", bn: "তুমি সব খুঁজে পেয়েছো! এবার ল্যান্ডার চ্যালেঞ্জারের কাছে ফিরে যাও।" });
      return;
    }
    setStage("hunt"); huntObjective(n.length); setLine(null);
  };
  const startHunt = () => { hush(); setStage("hunt"); freeze(false); huntObjective(seen.length); say(null, { en: "Look for the golden stars on your mini-map. Walk close and press the big button!", bn: "মিনি-ম্যাপে সোনালি তারাগুলো দেখো। কাছে গিয়ে বড় বাটনটা চাপো!" }); };
  const nextSlide = () => { audio.beep(900); if (slide + 1 >= STORY.length) { startHunt(); return; } const n = slide + 1; setSlide(n); sayC(STORY[n]!.clip, CH_SPEAK.includes(STORY[n]!.clip) ? "challenger" : "nova"); };
  const answer = (i: number) => {
    const q = QUIZ[qi]!; if (right) return;
    if (q.opts[i]!.ok) {
      audio.beep(1320); setRight(true); setWrong(null); sayC("correct");
      window.setTimeout(() => { setRight(false); if (qi + 1 < QUIZ.length) { setQi(qi + 1); sayC(QUIZ[qi + 1]!.clip); } else win(); }, 1800);
    } else { audio.beep(260); setWrong(i); sayC("wrong"); }
  };
  const win = () => {
    setStage("badge"); audio.beep(1500);
    store.set({ flags: Array.from(new Set([...store.get().flags, "apollo17"])) });
    store.awardBadge("final-stargazer");
    sayC("badge", "nova", () => sayC("outro"));
  };
  const finish = (hub: boolean) => {
    hush(); setStage("done"); museum.current = true; setLine(null); freeze(false);
    if (hub) { store.emit("engine:goto", "hub"); return; }
    objective({ en: "🌕 All 4 Moon zones explored! Visit the Hall of Fame in the Hub", bn: "🌕 চাঁদের ৪টি জোনই দেখা শেষ! হাবের হল অফ ফেম দেখো" });
  };

  useEffect(() => { store.emit("a17:stars", stage === "hunt" || stage === "spot" ? SPOT_IDS.filter((id) => !seen.includes(id)) : []); }, [stage, seen]);

  if (phase !== "moon" || stage === "idle") return null;

  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const btn = "w-full py-3 rounded-full text-black font-bold tracking-widest text-sm active:scale-95 transition-transform";
  const card = (children: React.ReactNode) => (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:items-center md:justify-end p-3 pt-16 pb-44 md:pb-3 md:pr-8 bg-black/45 backdrop-blur-[2px] pointer-events-auto">
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-240px)] md:max-h-[88vh] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_0%,rgba(255,157,92,.18),rgba(8,10,16,.95)_60%)] shadow-[0_0_40px_rgba(255,157,92,.25)] p-4 text-[#eaf2ff] animate-[hubrise_0.4s_ease]" style={{ borderColor: `${ACC}88` }}>{children}</div>
    </div>
  );
  const head = (top: string, title: string) => (<><div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>{top}</div><div className="text-xl sm:text-2xl font-bold tracking-wide mb-2">{title}</div></>);
  const photo = (src: string, extra?: React.ReactNode) => (
    <div className="relative rounded-2xl aspect-[4/3] border overflow-hidden bg-black" style={{ borderColor: `${ACC}55` }}>
      <img key={src} src={src} alt="" className="w-full h-full object-cover animate-[hubrise_0.5s_ease]" />
      <div className="absolute bottom-1 right-2 text-[9px] text-white/60">NASA</div>{extra}
    </div>
  );
  const art = (icon: string, extra?: React.ReactNode) => (
    <div className="relative rounded-2xl aspect-[4/3] border flex items-center justify-center bg-[radial-gradient(circle,rgba(255,157,92,.22),rgba(0,0,0,.6)_70%)] overflow-hidden" style={{ borderColor: `${ACC}55` }}>
      <div key={icon} className="text-8xl animate-float-gentle">{icon}</div>{extra}
    </div>
  );

  return (
    <>
      {line && createPortal(<HoloBubble key={line.who + t(line.text, lang)} speaker={line.who} text={t(line.text, lang)} speaking={speaking} />, document.body)}

      {(stage === "hunt" || stage === "spot") && !driving && (
        <div className="absolute z-40 top-[118px] left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/55 border border-white/15 px-3 py-1.5 pointer-events-none">
          {SPOTS.map((s) => <span key={s.id} title={t(s.name, lang)} className={`text-base sm:text-lg ${seen.includes(s.id) ? "" : "grayscale opacity-35"}`}>{seen.includes(s.id) ? s.icon : "⭐"}</span>)}
        </div>
      )}
      {stage === "hunt" && !driving && (
        <div className="absolute z-40 top-[160px] left-1/2 -translate-x-1/2 rounded-2xl bg-black/65 border px-4 py-2 text-xs sm:text-sm text-center text-white/90 pointer-events-none max-w-[92vw]" style={{ borderColor: `${ACC}66` }}>
          {B("⭐ Walk to a golden star → 🗺️ stars glow ★ on your mini-map → press [E] to explore!", "⭐ সোনালি তারার কাছে হাঁটো → 🗺️ মিনি-ম্যাপে ★ দেখো → কাছে গিয়ে [E] চাপো!")}
          <span className="ml-2 font-bold" style={{ color: ACC }}>{seen.length}/7</span>
        </div>
      )}

      {action && !["welcome", "story", "spot", "memory", "log", "pledge", "quiz", "badge"].includes(stage) && (
        <button onClick={action.run} className="absolute z-[57] left-1/2 -translate-x-1/2 bottom-28 md:bottom-16 flex items-center gap-2 rounded-full px-6 py-3.5 text-black font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(255,157,92,.7)] animate-bounce pointer-events-auto" style={{ background: ACC }}>
          <span className="hidden md:inline-flex w-7 h-7 rounded-md bg-black/80 items-center justify-center text-xs" style={{ color: ACC }}>E</span>
          {t(action.label, lang)} 👆
        </button>
      )}

      {stage === "welcome" && card(<>
        {head("TAURUS–LITTROW · 1972", B("CHALLENGER & THE LAST FOOTPRINTS", "চ্যালেঞ্জার ও শেষ পদচিহ্ন"))}
        {photo(IMG("challenger"))}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-3">
          {[["Last", B("crewed landing", "মানুষের অবতরণ")], ["≈75 hrs", B("on the Moon", "চাঁদে ছিল")], ["50+", B("silent years", "নীরব বছর")]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>))}
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("story"); setSlide(0); sayC(STORY[0]!.clip, "nova"); }}>📜 {B("YES! TELL ME THE STORY", "হ্যাঁ! গল্পটা বলো")}</button>
      </>)}

      {stage === "story" && card(<>
        {head(`${B("CHAPTER", "পর্ব")} ${slide + 1}/${STORY.length} · ${STORY[slide]!.year}`, `${STORY[slide]!.icon} ${t(STORY[slide]!.title, lang)}`)}
        {photo(IMG(STORY_IMG[slide]!), null)}
        <div className="mt-3 text-sm leading-relaxed opacity-90">{t(LN[STORY[slide]!.clip]!, lang)}</div>
        <div className="flex justify-center gap-1.5 mt-3">{STORY.map((_, k) => <span key={k} className="h-2 rounded-full transition-all" style={{ width: k === slide ? 22 : 8, background: k <= slide ? ACC : "rgba(255,255,255,.25)" }} />)}</div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={nextSlide}>{slide + 1 >= STORY.length ? `🔍 ${B("LET'S EXPLORE!", "চলো ঘুরে দেখি!")}` : `${B("NEXT", "পরেরটা")} →`}</button>
      </>)}

      {stage === "spot" && spot && card(<>
        {head(museum.current ? B("RELIC", "নিদর্শন") : `${B("TREASURE", "গুপ্তধন")} ${seen.length + 1}/7`, `${spot.icon} ${t(spot.name, lang)}`)}
        {spot.id === "orange"
          ? <OrangeScoop lang={lang} done={cut} onDone={() => { setCut(true); audio.beep(1600); sayC("orange_success", "nova"); }} />
          : photo(IMG(SPOT_IMG[spot.id]!))}
        <div className="mt-3 rounded-2xl px-3 py-2 text-sm font-bold text-center" style={{ background: `${ACC}22`, color: ACC }}>💡 {t(spot.fact, lang)}</div>
        <button disabled={spot.id === "orange" && !cut} className={`${btn} mt-3 disabled:opacity-30`} style={{ background: ACC }} onClick={closeSpot}>
          {spot.id === "orange" && !cut ? B("Dig first! 👆", "আগে খুঁড়ে দেখো! 👆") : `✅ ${B("GOT IT!", "বুঝেছি!")}`}
        </button>
      </>)}

      {(stage === "memory" || stage === "log") && card(<>
        {head("CHALLENGER · RELIC LOG", B("Challenger's last message", "চ্যালেঞ্জারের শেষ বার্তা"))}
        {photo(IMG("farewell"), <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,157,92,.45),transparent_60%)] animate-pulse mix-blend-screen" />)}
        {stage === "log"
          ? <div className="mt-3 rounded-xl bg-black/70 border border-[#7dffb0]/40 p-3 font-mono text-[12px] leading-relaxed text-[#9dffc4]"><TypeLog key={lang} text={t(LN["final_log"]!, lang)} onStart={() => sayC("final_log")} /></div>
          : <div className="mt-3 text-center text-xs tracking-[0.3em] animate-pulse" style={{ color: ACC }}>📻 ··· BEEP ··· KSHHH ··· 📻</div>}
        {stage === "log" && <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("pledge"); sayC("heritage"); }}>🛡️ {B("NEXT", "পরেরটা")} →</button>}
      </>)}

      {stage === "pledge" && card(<>
        {head("NASA HERITAGE · " + B("PROTECT THE PAST", "ইতিহাস রক্ষা"), B("Will you protect them?", "তুমি কি এদের রক্ষা করবে?"))}
        <ul className="mt-1 space-y-1.5 text-sm">
          {[["👣", B("Never step on the last footprints", "শেষ পদচিহ্নে পা দেবো না")], ["💝", B("Keep TDC safe for Tracy", "ট্রেসির TDC রক্ষা করবো")], ["🤝", B("These belong to everyone", "এগুলো সবার")]].map(([i, x]) => <li key={x} className="flex gap-2 rounded-xl bg-white/5 px-3 py-2"><span>{i}</span>{x}</li>)}
        </ul>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { audio.beep(1300); setStage("quiz"); setQi(0); setWrong(null); sayC(QUIZ[0]!.clip); }}>✋ {B("I PROMISE! START THE QUIZ", "আমি কথা দিচ্ছি! কুইজ শুরু")}</button>
      </>)}

      {stage === "quiz" && card(<>
        {head(`${B("QUIZ", "কুইজ")} ${qi + 1}/3`, t(LN[QUIZ[qi]!.clip]!, lang))}
        <div className="grid gap-2 mt-1">
          {QUIZ[qi]!.opts.map((o, i) => (
            <button key={i + "" + qi} onClick={() => answer(i)} className={`flex items-center gap-3 text-left rounded-2xl px-4 py-3 border-2 font-bold text-sm transition-all hover:scale-[1.02] ${wrong === i ? "border-red-400 text-red-300 animate-pulse" : right && o.ok ? "border-green-400 bg-green-500/20 text-green-200" : ""}`} style={wrong === i || (right && o.ok) ? undefined : { borderColor: `${ACC}88` }}>
              <span className="text-2xl">{right && o.ok ? "✅" : wrong === i ? "❌" : o.icon}</span>{t(o.t, lang)}
            </button>))}
        </div>
        {wrong != null && <div className="text-xs text-center mt-2 opacity-85">💡 {t(QUIZ[qi]!.hint, lang)}</div>}
      </>)}

      {stage === "badge" && card(<>
        <div className="text-center py-2">
          <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>MISSION 04 · {B("COMPLETE", "সম্পন্ন")}</div>
          <div className="mx-auto mt-3 w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 animate-float-gentle" style={{ borderColor: ACC, background: "radial-gradient(circle,#2a1f5c,#07051a)" }}>🌌</div>
          <div className="text-2xl font-bold mt-3" style={{ color: ACC }}>{B("FINAL STARGAZER", "ফাইনাল স্টারগেজার")}</div>
          <div className="text-xs opacity-75 mt-1">{B("Guardian of the last footprints", "শেষ পদচিহ্নের অভিভাবক")}</div>
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => finish(false)}>🌕 {B("KEEP EXPLORING THE VALLEY", "উপত্যকায় আরও ঘুরে দেখো")}</button>
        <button className="w-full mt-2 py-2.5 rounded-full border text-sm font-bold" style={{ borderColor: `${ACC}88`, color: ACC }} onClick={() => finish(true)}>🏛️ {B("Back to Hub", "হাবে ফিরে যাও")}</button>
      </>)}
    </>
  );
}

function TypeLog({ text, onStart }: { text: string; onStart: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => { onStart(); const id = window.setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 45); return () => window.clearInterval(id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <>{"> "}{text.slice(0, n)}<span className="animate-pulse">▌</span></>;
}

function OrangeScoop({ lang, done, onDone }: { lang: "en" | "bn"; done: boolean; onDone: () => void }) {
  const [dig, setDig] = useState(done ? 3 : 0);
  const go = () => { if (dig >= 3) return; const n = dig + 1; setDig(n); if (n >= 3) window.setTimeout(onDone, 500); };
  return (
    <div className="relative rounded-2xl aspect-[4/3] border overflow-hidden bg-[url('/images/apollo17/orange.jpg')] bg-cover bg-center" style={{ borderColor: "#ff9d5c55" }}>
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: 1 - dig / 3, background: "radial-gradient(circle at 50% 60%, #8a8580, #5a5652)" }} />
      <div className="absolute top-3 inset-x-0 text-center text-5xl">{dig >= 3 ? "🟠✨" : "🥄"}</div>
      <div className="absolute inset-x-0 bottom-3 text-center">{dig >= 3
        ? <div className="mx-auto w-fit rounded-xl bg-black/70 px-3 py-1.5 font-bold text-xs text-orange-300">✅ {lang === "bn" ? "কমলা মাটি পাওয়া গেছে!" : "Orange soil found!"}</div>
        : <button onClick={go} className="px-5 py-2.5 rounded-full bg-orange-400 text-black font-bold text-sm animate-bounce">🥄 {lang === "bn" ? `মাটি খুঁড়ো! (${dig}/3)` : `DIG! (${dig}/3)`}</button>}</div>
    </div>
  );
}
