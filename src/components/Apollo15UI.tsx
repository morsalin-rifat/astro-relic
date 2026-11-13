import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble } from "./MissionUI";
import LINES from "../data/apollo15Lines.json";

/** Apollo 15 mission (moon zone 2, Hadley Rille). Same flow as Apollo12UI. Clips: public/audio/apollo15/<clip>_<en|bn>.mp3 */
type L = { en: string; bn: string };
type Who = "nova" | "falcon";
const IMG = (n: string) => `/images/apollo15/${n}.jpg`;
const SPOT_IMG: Record<string, string> = { falcon: "falcon", lrv15: "lrv", feather: "feather", fallen: "fallen", genesis: "genesis", alsep15: "alsep", overlook: "canyon" };
const STORY_IMG = ["canyon", "unfold", "lrv", "falcon", "genesis", "fallen"];
const LN = LINES as Record<string, L>;
const ACC = "#ffc46b";
const V = (c: string) => `apollo15/${c}`;
const LANDER = ["falcon"];

const STORY: { clip: string; icon: string; year: string; title: L }[] = [
  { clip: "canyon_mountain", icon: "⛰️", year: "30 Jul 1971", title: { en: "The Mountain & the Canyon", bn: "পাহাড় আর গিরিখাত" } },
  { clip: "unfolding_buggy", icon: "📦", year: "Origami car", title: { en: "The Folding Car", bn: "ভাঁজ করা গাড়ি" } },
  { clip: "wire_wheels", icon: "🛞", year: "No rubber!", title: { en: "Wire Mesh Wheels", bn: "তারের জালের চাকা" } },
  { clip: "driving_joy", icon: "🕹️", year: "≈28 km", title: { en: "Driving with a Joystick", bn: "জয়স্টিক দিয়ে ড্রাইভ" } },
  { clip: "genesis_rock", icon: "🪨", year: "≈4 billion yrs", title: { en: "The Genesis Rock", bn: "জেনেসিস পাথর" } },
  { clip: "fallen_astronaut", icon: "🕊️", year: "14 heroes", title: { en: "Fallen Astronaut", bn: "ফলেন অ্যাস্ট্রোনট" } },
];

type Spot = { id: string; clip: string; icon: string; name: L; fact: L };
const SPOTS: Spot[] = [
  { id: "falcon", clip: "spot_falcon", icon: "🦅", name: { en: "Falcon's Base", bn: "ফ্যালকনের ভিত্তি" }, fact: { en: "Standing here for 50+ years", bn: "৫০ বছরেরও বেশি এখানে দাঁড়িয়ে" } },
  { id: "lrv15", clip: "spot_lrv", icon: "🏎️", name: { en: "Moon Buggy LRV-1", bn: "চাঁদের গাড়ি LRV-1" }, fact: { en: "The first car on the Moon!", bn: "চাঁদের প্রথম গাড়ি!" } },
  { id: "feather", clip: "spot_galileo", icon: "🪶", name: { en: "Hammer & Feather", bn: "হাতুড়ি আর পালক" }, fact: { en: "No air = they fall together", bn: "বাতাস নেই = একসাথে পড়ে" } },
  { id: "fallen", clip: "spot_memorial", icon: "🕊️", name: { en: "Fallen Astronaut", bn: "ফলেন অ্যাস্ট্রোনট" }, fact: { en: "The only memorial on the Moon", bn: "চাঁদের একমাত্র স্মৃতিফলক" } },
  { id: "genesis", clip: "spot_genesis", icon: "🪨", name: { en: "Genesis Rock Spot", bn: "জেনেসিস পাথরের জায়গা" }, fact: { en: "A rock as old as the young Moon", bn: "ছোট্ট চাঁদের সমান পুরোনো পাথর" } },
  { id: "alsep15", clip: "spot_alsep15", icon: "📡", name: { en: "Science Station", bn: "বিজ্ঞান কেন্দ্র" }, fact: { en: "The Moon's inside is still warm", bn: "চাঁদের ভেতরটা এখনো গরম" } },
  { id: "overlook", clip: "spot_rille_look", icon: "🏞️", name: { en: "Canyon Edge", bn: "গিরিখাতের কিনারা" }, fact: { en: "300 m deep lava canyon", bn: "৩০০ মিটার গভীর লাভার খাদ" } },
];
const SPOT_IDS = SPOTS.map((s) => s.id);

const QUIZ: { clip: string; opts: { icon: string; t: L; ok?: boolean }[]; hint: L }[] = [
  { clip: "quiz_1", hint: { en: "Rubber would burst!", bn: "রবার ফেটে যেত!" }, opts: [{ icon: "🛞", t: { en: "Rubber", bn: "রবার" } }, { icon: "🕸️", t: { en: "Steel wire mesh", bn: "স্টিলের তারের জাল" }, ok: true }, { icon: "🪵", t: { en: "Wood", bn: "কাঠ" } }] },
  { clip: "quiz_2", hint: { en: "He lived 400 years ago in Italy!", bn: "উনি ৪০০ বছর আগে ইতালিতে ছিলেন!" }, opts: [{ icon: "🍎", t: { en: "Newton", bn: "নিউটন" } }, { icon: "🔭", t: { en: "Galileo", bn: "গ্যালিলিও" }, ok: true }, { icon: "💡", t: { en: "Einstein", bn: "আইনস্টাইন" } }] },
  { clip: "quiz_3", hint: { en: "More than 10, less than 20!", bn: "১০-এর বেশি, ২০-এর কম!" }, opts: [{ icon: "3️⃣", t: { en: "3", bn: "৩ জন" } }, { icon: "🕊️", t: { en: "14", bn: "১৪ জন" }, ok: true }, { icon: "💯", t: { en: "100", bn: "১০০ জন" } }] },
];

type Stage = "idle" | "go" | "welcome" | "story" | "hunt" | "spot" | "return" | "memory" | "log" | "pledge" | "quiz" | "badge" | "done";

export function Apollo15Mission() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const near = useGame((s) => s.moonNear);
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
  const meet = () => { museum.current = false; reset(); freeze(true); setStage("welcome"); sayC("welcome", "falcon"); };

  useEffect(() => store.on("a15:arrive", () => {
    reset(); setStage("go");
    objective({ en: "🦅 Walk to the lander Falcon", bn: "🦅 ল্যান্ডার ফ্যালকনের কাছে হেঁটে যাও" });
    window.setTimeout(() => sayC("arrival"), 600);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => store.on("a15:revisit", () => { setStage("done"); museum.current = true; }), []);
  useEffect(() => { const off = ["a11:arrive", "a11:revisit", "a12:arrive", "a12:revisit"].map((ev) => store.on(ev, () => { setLine(null); setStage((st) => (st === "go" ? "idle" : st)); })); return () => off.forEach((o) => o()); }, []); // other zone entered
  useEffect(() => { if (phase !== "moon") { setStage("idle"); setLine(null); hush(); } }, [phase]);

  const action: { label: L; run: () => void } | null = (() => {
    if (phase !== "moon" || !near || !SPOT_IDS.includes(near)) return null;
    const atLander = LANDER.includes(near);
    if (stage === "go" && atLander) return { label: { en: "Meet Falcon", bn: "ফ্যালকনের সাথে কথা বলো" }, run: meet };
    if (stage === "hunt" && !seen.includes(near)) { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Inspect: ${s.name.en}`, bn: `দেখো: ${s.name.bn}` }, run: () => openSpot(s) }; }
    if (stage === "return" && atLander) return { label: { en: "Hear Falcon's last message", bn: "ফ্যালকনের শেষ বার্তা শোনো" }, run: () => { freeze(true); setStage("memory"); audio.beep(520); sayC("reactivate", "nova", () => setStage((s) => (s === "memory" ? "log" : s))); } };
    if (stage === "done" && atLander) return { label: { en: "🔄 Replay with Falcon", bn: "🔄 ফ্যালকনের সাথে আবার খেলো" }, run: meet };
    if (stage === "done") { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Look again: ${s.name.en}`, bn: `আবার দেখো: ${s.name.bn}` }, run: () => { museum.current = true; openSpot(s); } }; }
    return null;
  })();
  const actRef = useRef(action); actRef.current = action;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "KeyE" && actRef.current) { e.preventDefault(); actRef.current.run(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const openSpot = (s: Spot) => { freeze(true); setSpot(s); setCut(false); setStage("spot"); audio.beep(1100); sayC(s.clip, s.id === "falcon" ? "falcon" : "nova", s.id === "feather" ? () => sayC("galileo_intro") : undefined); };
  const huntObjective = (n: number) => objective({ en: `🔍 Find the ${7 - n} golden stars around Falcon (${n}/7)`, bn: `🔍 ফ্যালকনের চারপাশে ${7 - n}টি সোনালি তারা খোঁজো (${n}/7)` });
  const closeSpot = () => {
    if (!spot) return;
    if (museum.current) { setSpot(null); hush(); freeze(false); setLine(null); setStage("done"); return; }
    const n = seen.includes(spot.id) ? seen : [...seen, spot.id];
    setSeen(n); setSpot(null); hush(); freeze(false);
    if (n.length >= 7) {
      setStage("return");
      objective({ en: "✨ All found! Go back to Falcon for its last message", bn: "✨ সব পেয়েছো! ফ্যালকনের কাছে ফিরে গিয়ে ওর শেষ বার্তা শোনো" });
      say(null, { en: "You found everything! Now go back to the lander Falcon.", bn: "তুমি সব খুঁজে পেয়েছো! এবার ল্যান্ডার ফ্যালকনের কাছে ফিরে যাও।" });
      return;
    }
    setStage("hunt"); huntObjective(n.length); setLine(null);
  };
  const startHunt = () => { hush(); setStage("hunt"); freeze(false); huntObjective(seen.length); say(null, { en: "Look for the golden stars on your mini-map. Walk close and press the big button!", bn: "মিনি-ম্যাপে সোনালি তারাগুলো দেখো। কাছে গিয়ে বড় বাটনটা চাপো!" }); };
  const nextSlide = () => { audio.beep(900); if (slide + 1 >= STORY.length) { startHunt(); return; } const n = slide + 1; setSlide(n); sayC(STORY[n]!.clip); };
  const answer = (i: number) => {
    const q = QUIZ[qi]!; if (right) return;
    if (q.opts[i]!.ok) {
      audio.beep(1320); setRight(true); setWrong(null); sayC("correct");
      window.setTimeout(() => { setRight(false); if (qi + 1 < QUIZ.length) { setQi(qi + 1); sayC(QUIZ[qi + 1]!.clip); } else win(); }, 1800);
    } else { audio.beep(260); setWrong(i); sayC("wrong"); }
  };
  const win = () => {
    setStage("badge"); audio.beep(1500);
    store.set({ flags: Array.from(new Set([...store.get().flags, "apollo15"])) });
    store.awardBadge("buggy-driver");
    sayC("badge", "nova", () => sayC("outro"));
  };
  const finish = (hub: boolean) => {
    hush(); setStage("done"); museum.current = true; setLine(null); freeze(false);
    if (hub) { store.emit("engine:goto", "hub"); return; }
    objective({ en: "🚶 Walk south through the glowing pass to Apollo 17 · Taurus–Littrow", bn: "🚶 আলো জ্বলা দক্ষিণের গিরিপথ দিয়ে অ্যাপোলো ১৭ · টরাস–লিট্রোতে যাও" });
  };

  useEffect(() => { store.emit("a15:stars", stage === "hunt" || stage === "spot" ? SPOT_IDS.filter((id) => !seen.includes(id)) : []); }, [stage, seen]);

  if (phase !== "moon" || stage === "idle") return null;

  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const btn = "w-full py-3 rounded-full text-black font-bold tracking-widest text-sm active:scale-95 transition-transform";
  const card = (children: React.ReactNode) => (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:items-center md:justify-end p-3 pt-16 pb-44 md:pb-3 md:pr-8 bg-black/45 backdrop-blur-[2px] pointer-events-auto">
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-240px)] md:max-h-[88vh] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_0%,rgba(255,196,107,.18),rgba(8,10,16,.95)_60%)] shadow-[0_0_40px_rgba(255,196,107,.25)] p-4 text-[#eaf2ff] animate-[hubrise_0.4s_ease]" style={{ borderColor: `${ACC}88` }}>{children}</div>
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
    <div className="relative rounded-2xl aspect-[4/3] border flex items-center justify-center bg-[radial-gradient(circle,rgba(255,196,107,.22),rgba(0,0,0,.6)_70%)] overflow-hidden" style={{ borderColor: `${ACC}55` }}>
      <div key={icon} className="text-8xl animate-float-gentle">{icon}</div>{extra}
    </div>
  );

  return (
    <>
      {line && createPortal(<HoloBubble key={line.who + t(line.text, lang)} speaker={line.who} text={t(line.text, lang)} speaking={speaking} />, document.body)}

      {(stage === "hunt" || stage === "spot") && (
        <div className="absolute z-40 top-[118px] left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/55 border border-white/15 px-3 py-1.5 pointer-events-none">
          {SPOTS.map((s) => <span key={s.id} title={t(s.name, lang)} className={`text-base sm:text-lg ${seen.includes(s.id) ? "" : "grayscale opacity-35"}`}>{seen.includes(s.id) ? s.icon : "⭐"}</span>)}
        </div>
      )}
      {stage === "hunt" && (
        <div className="absolute z-40 top-[160px] left-1/2 -translate-x-1/2 rounded-2xl bg-black/65 border px-4 py-2 text-xs sm:text-sm text-center text-white/90 pointer-events-none max-w-[92vw]" style={{ borderColor: `${ACC}66` }}>
          {B("⭐ Walk to a golden star → 🗺️ stars glow ★ on your mini-map → press [E] to explore!", "⭐ সোনালি তারার কাছে হাঁটো → 🗺️ মিনি-ম্যাপে ★ দেখো → কাছে গিয়ে [E] চাপো!")}
          <span className="ml-2 font-bold" style={{ color: ACC }}>{seen.length}/7</span>
        </div>
      )}

      {action && !["welcome", "story", "spot", "memory", "log", "pledge", "quiz", "badge"].includes(stage) && (
        <button onClick={action.run} className="absolute z-[57] left-1/2 -translate-x-1/2 bottom-28 md:bottom-16 flex items-center gap-2 rounded-full px-6 py-3.5 text-black font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(255,196,107,.7)] animate-bounce pointer-events-auto" style={{ background: ACC }}>
          <span className="hidden md:inline-flex w-7 h-7 rounded-md bg-black/80 items-center justify-center text-xs" style={{ color: ACC }}>E</span>
          {t(action.label, lang)} 👆
        </button>
      )}

      {stage === "welcome" && card(<>
        {head("HADLEY RILLE · 1971", B("FALCON & THE MOON BUGGY", "ফ্যালকন ও চাঁদের গাড়ি"))}
        {photo(IMG("falcon"))}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-3">
          {[["1st", B("Moon car", "চাঁদের গাড়ি")], ["≈28 km", B("driven", "চালানো")], ["3", B("days on the Moon", "দিন চাঁদে")]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>))}
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("story"); setSlide(0); sayC(STORY[0]!.clip); }}>📜 {B("YES! TELL ME THE STORY", "হ্যাঁ! গল্পটা বলো")}</button>
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
        {spot.id === "feather"
          ? <GalileoDrop lang={lang} done={cut} onDone={() => { setCut(true); audio.beep(1600); sayC("galileo_success"); }} />
          : photo(IMG(SPOT_IMG[spot.id]!))}
        <div className="mt-3 rounded-2xl px-3 py-2 text-sm font-bold text-center" style={{ background: `${ACC}22`, color: ACC }}>💡 {t(spot.fact, lang)}</div>
        <button disabled={spot.id === "feather" && !cut} className={`${btn} mt-3 disabled:opacity-30`} style={{ background: ACC }} onClick={closeSpot}>
          {spot.id === "feather" && !cut ? B("Drop them first! 👆", "আগে ফেলে দাও! 👆") : `✅ ${B("GOT IT!", "বুঝেছি!")}`}
        </button>
      </>)}

      {(stage === "memory" || stage === "log") && card(<>
        {head("FALCON · RELIC LOG", B("Falcon's last message", "ফ্যালকনের শেষ বার্তা"))}
        {photo(IMG("falcon"), <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,196,107,.45),transparent_60%)] animate-pulse mix-blend-screen" />)}
        {stage === "log"
          ? <div className="mt-3 rounded-xl bg-black/70 border border-[#7dffb0]/40 p-3 font-mono text-[12px] leading-relaxed text-[#9dffc4]"><TypeLog key={lang} text={t(LN["final_log"]!, lang)} onStart={() => sayC("final_log")} /></div>
          : <div className="mt-3 text-center text-xs tracking-[0.3em] animate-pulse" style={{ color: ACC }}>📻 ··· BEEP ··· KSHHH ··· 📻</div>}
        {stage === "log" && <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("pledge"); sayC("heritage"); }}>🛡️ {B("NEXT", "পরেরটা")} →</button>}
      </>)}

      {stage === "pledge" && card(<>
        {head("NASA HERITAGE · " + B("PROTECT THE PAST", "ইতিহাস রক্ষা"), B("Will you protect them?", "তুমি কি এদের রক্ষা করবে?"))}
        <ul className="mt-1 space-y-1.5 text-sm">
          {[["👀", B("Watch from far away", "দূর থেকে দেখবো")], ["🤖", B("Never touch the memorial", "স্মৃতিফলক ছোঁবো না")], ["🤝", B("These belong to everyone", "এগুলো সবার")]].map(([i, x]) => <li key={x} className="flex gap-2 rounded-xl bg-white/5 px-3 py-2"><span>{i}</span>{x}</li>)}
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
          <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>MISSION 03 · {B("COMPLETE", "সম্পন্ন")}</div>
          <div className="mx-auto mt-3 w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 animate-float-gentle" style={{ borderColor: ACC, background: "radial-gradient(circle,#5c3a17,#120a04)" }}>🏎️</div>
          <div className="text-2xl font-bold mt-3" style={{ color: ACC }}>{B("LUNAR BUGGY DRIVER", "লুনার বাগি ড্রাইভার")}</div>
          <div className="text-xs opacity-75 mt-1">{B("Drove history at Hadley Rille", "হ্যাডলি রিলে ইতিহাসের চালক")}</div>
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => finish(false)}>🚶 {B("WALK TO ZONE 4 · APOLLO 17", "জোন ৪-এ চলো · অ্যাপোলো ১৭")}</button>
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

function GalileoDrop({ lang, done, onDone }: { lang: "en" | "bn"; done: boolean; onDone: () => void }) {
  const [fall, setFall] = useState(done);
  const go = () => { if (fall) return; setFall(true); window.setTimeout(onDone, 1300); };
  const item = (icon: string, label: string) => (
    <div className="flex flex-col items-center w-24">
      <div className="text-5xl transition-transform ease-in" style={{ transform: `translateY(${fall ? 150 : 0}px)`, transitionDuration: "1.2s" }}>{icon}</div>
      <div className="text-[10px] mt-1 opacity-70" style={{ transform: `translateY(${fall ? 150 : 0}px)`, transition: "transform 1.2s ease-in" }}>{label}</div>
    </div>
  );
  return (
    <div className="relative rounded-2xl aspect-[4/3] border overflow-hidden bg-[url('/images/apollo15/feather.jpg')] bg-cover bg-center" style={{ borderColor: "#ffc46b55" }}>
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative flex justify-center gap-6 pt-4">{item("🔨", lang === "bn" ? "হাতুড়ি ১.৩ কেজি" : "Hammer 1.3 kg")}{item("🪶", lang === "bn" ? "পালক ৩০ গ্রাম" : "Feather 30 g")}</div>
      <div className="absolute inset-x-0 bottom-3 text-center">{done
        ? <div className="mx-auto w-fit rounded-xl bg-black/70 px-3 py-1.5 font-bold text-xs text-green-300">✅ {lang === "bn" ? "দুটোই একসাথে পড়লো!" : "They landed together!"}</div>
        : <button onClick={go} className="px-5 py-2.5 rounded-full bg-yellow-400 text-black font-bold text-sm animate-bounce">👆 {lang === "bn" ? "ফেলে দাও!" : "DROP THEM!"}</button>}</div>
    </div>
  );
}
