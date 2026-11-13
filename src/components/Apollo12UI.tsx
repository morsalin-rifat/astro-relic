import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble } from "./MissionUI";
import LINES from "../data/apollo12Lines.json";

/** Apollo 12 + Surveyor 3 mission (moon zone 1). Same flow as Apollo11UI. Clips: public/audio/apollo12/<clip>_<en|bn>.mp3 */
type L = { en: string; bn: string };
type Who = "nova" | "eagle";
const LN = LINES as Record<string, L>;
const ACC = "#9fd0ff";
const V = (c: string) => `apollo12/${c}`;
const LANDER = ["intrepid"];

const STORY: { clip: string; icon: string; year: string; title: L }[] = [
  { clip: "lightning", icon: "⚡", year: "14 Nov 1969", title: { en: "Lightning Strikes!", bn: "রকেটে বাজ পড়ল!" } },
  { clip: "pinpoint", icon: "⛄", year: "19 Nov 1969", title: { en: "The Pinpoint Landing", bn: "নিখুঁত অবতরণ" } },
  { clip: "whoopee", icon: "🤸", year: "\"Whoopee!\"", title: { en: "Pete's Happy Jump", bn: "পেটের আনন্দ-লাফ" } },
  { clip: "walk_to_robot", icon: "🤖", year: "31 months alone", title: { en: "Meeting the Robot", bn: "রোবটের সাথে দেখা" } },
  { clip: "camera_cut", icon: "✂️", year: "EVA 2", title: { en: "Robot Souvenirs", bn: "রোবটের স্মারক" } },
  { clip: "bacteria_mystery", icon: "🦠", year: "Lab · Earth", title: { en: "The Germ Mystery", bn: "জীবাণুর রহস্য" } },
];

type Spot = { id: string; clip: string; icon: string; name: L; fact: L };
const SPOTS: Spot[] = [
  { id: "intrepid", clip: "spot_intrepid", icon: "🚀", name: { en: "Intrepid's Base", bn: "ইনট্রেপিডের ভিত্তি" }, fact: { en: "Still exactly where it landed", bn: "যেখানে নেমেছিল, আজও সেখানেই" } },
  { id: "surveyor", clip: "spot_surveyor", icon: "🤖", name: { en: "Surveyor 3 Robot", bn: "সার্ভেয়ার ৩ রোবট" }, fact: { en: "Landed April 1967", bn: "নেমেছিল এপ্রিল ১৯৬৭-তে" } },
  { id: "tvcam", clip: "spot_tv_camera", icon: "📷", name: { en: "The Missing Camera", bn: "হারানো ক্যামেরা" }, fact: { en: "Now in a museum on Earth!", bn: "এখন পৃথিবীর জাদুঘরে!" } },
  { id: "scoop", clip: "spot_scoop", icon: "🥄", name: { en: "The Robot Scoop", bn: "রোবটের চামচ" }, fact: { en: "Proved the ground was firm", bn: "প্রমাণ করেছিল মাটি শক্ত" } },
  { id: "rtg", clip: "spot_rtg", icon: "🔋", name: { en: "SNAP-27 Power Battery", bn: "SNAP-27 শক্তির ব্যাটারি" }, fact: { en: "Electricity made from heat", bn: "তাপ থেকে বিদ্যুৎ" } },
  { id: "alsep12", clip: "spot_alsep", icon: "📡", name: { en: "Science Station", bn: "বিজ্ঞান কেন্দ্র" }, fact: { en: "Listened for moonquakes for years", bn: "বছরের পর বছর কম্পন শুনেছে" } },
  { id: "head", clip: "spot_snowman", icon: "⛄", name: { en: "The Snowman Craters", bn: "তুষারমানব ক্রেটার" }, fact: { en: "A map made of craters!", bn: "ক্রেটার দিয়ে বানানো ম্যাপ!" } },
];
const SPOT_IDS = SPOTS.map((s) => s.id);

const QUIZ: { clip: string; opts: { icon: string; t: L; ok?: boolean }[]; hint: L }[] = [
  { clip: "quiz_1", hint: { en: "It came from the clouds!", bn: "মেঘ থেকে এসেছিল!" }, opts: [{ icon: "☄️", t: { en: "A meteor", bn: "উল্কা" } }, { icon: "⚡", t: { en: "Lightning", bn: "বাজ" }, ok: true }, { icon: "🐦", t: { en: "A bird", bn: "পাখি" } }] },
  { clip: "quiz_2", hint: { en: "It had three legs!", bn: "ওর তিনটা পা ছিল!" }, opts: [{ icon: "🚙", t: { en: "Sojourner", bn: "সোজার্নার" } }, { icon: "🦅", t: { en: "Eagle", bn: "ঈগল" } }, { icon: "🤖", t: { en: "Surveyor 3", bn: "সার্ভেয়ার ৩" }, ok: true }] },
  { clip: "quiz_3", hint: { en: "Its eye!", bn: "ওর চোখ!" }, opts: [{ icon: "📷", t: { en: "Its TV camera", bn: "টিভি ক্যামেরা" }, ok: true }, { icon: "🛞", t: { en: "Its wheels", bn: "চাকা" } }, { icon: "🚩", t: { en: "A flag", bn: "পতাকা" } }] },
];

type Stage = "idle" | "go" | "welcome" | "story" | "hunt" | "spot" | "return" | "memory" | "log" | "pledge" | "quiz" | "badge" | "done";

export function Apollo12Mission() {
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
  const meet = () => { museum.current = false; reset(); freeze(true); setStage("welcome"); sayC("welcome", "eagle"); };

  useEffect(() => store.on("a12:arrive", () => {
    reset(); setStage("go");
    objective({ en: "🚀 Walk to the lander Intrepid", bn: "🚀 ল্যান্ডার ইনট্রেপিডের কাছে হেঁটে যাও" });
    window.setTimeout(() => sayC("arrival"), 600);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => store.on("a12:revisit", () => { setStage("done"); museum.current = true; }), []);
  useEffect(() => { if (phase !== "moon") { setStage("idle"); setLine(null); hush(); } }, [phase]);

  const action: { label: L; run: () => void } | null = (() => {
    if (phase !== "moon" || !near || !SPOT_IDS.includes(near)) return null;
    const atLander = LANDER.includes(near);
    if (stage === "go" && atLander) return { label: { en: "Meet Intrepid", bn: "ইনট্রেপিডের সাথে কথা বলো" }, run: meet };
    if (stage === "hunt" && !seen.includes(near)) { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Inspect: ${s.name.en}`, bn: `দেখো: ${s.name.bn}` }, run: () => openSpot(s) }; }
    if (stage === "return" && near === "surveyor") return { label: { en: "Wake up Surveyor's memory", bn: "সার্ভেয়ারের স্মৃতি জাগাও" }, run: () => { freeze(true); setStage("memory"); audio.beep(520); sayC("reactivate", "nova", () => setStage((s) => (s === "memory" ? "log" : s))); } };
    if (stage === "done" && atLander) return { label: { en: "🔄 Replay with Intrepid", bn: "🔄 ইনট্রেপিডের সাথে আবার খেলো" }, run: meet };
    if (stage === "done") { const s = SPOTS.find((x) => x.id === near)!; return { label: { en: `Look again: ${s.name.en}`, bn: `আবার দেখো: ${s.name.bn}` }, run: () => { museum.current = true; openSpot(s); } }; }
    return null;
  })();
  const actRef = useRef(action); actRef.current = action;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "KeyE" && actRef.current) { e.preventDefault(); actRef.current.run(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const openSpot = (s: Spot) => { freeze(true); setSpot(s); setCut(false); setStage("spot"); audio.beep(1100); sayC(s.clip, s.id === "intrepid" ? "eagle" : "nova"); };
  const huntObjective = (n: number) => objective({ en: `🔍 Find the ${7 - n} golden stars around Surveyor Crater (${n}/7)`, bn: `🔍 সার্ভেয়ার ক্রেটারের চারপাশে ${7 - n}টি সোনালি তারা খোঁজো (${n}/7)` });
  const closeSpot = () => {
    if (!spot) return;
    if (museum.current) { setSpot(null); hush(); freeze(false); setLine(null); setStage("done"); return; }
    const n = seen.includes(spot.id) ? seen : [...seen, spot.id];
    setSeen(n); setSpot(null); hush(); freeze(false);
    if (n.length >= 7) {
      setStage("return");
      objective({ en: "✨ All found! Go back to Surveyor 3 and wake its memory", bn: "✨ সব পেয়েছো! সার্ভেয়ার ৩-এর কাছে গিয়ে ওর স্মৃতি জাগাও" });
      say(null, { en: "You found everything! Now go back to the robot Surveyor 3.", bn: "তুমি সব খুঁজে পেয়েছো! এবার রোবট সার্ভেয়ার ৩-এর কাছে ফিরে যাও।" });
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
    store.set({ flags: Array.from(new Set([...store.get().flags, "apollo12"])) });
    store.awardBadge("relic-recoverer");
    sayC("badge", "nova", () => sayC("outro"));
  };
  const finish = (hub: boolean) => {
    hush(); setStage("done"); museum.current = true; setLine(null); freeze(false);
    if (hub) { store.emit("engine:goto", "hub"); return; }
    objective({ en: "🚶 Walk south through the glowing pass to Apollo 15 · Hadley Rille", bn: "🚶 আলো জ্বলা দক্ষিণের গিরিপথ দিয়ে অ্যাপোলো ১৫ · হ্যাডলি রিলে যাও" });
  };

  useEffect(() => { store.emit("a12:stars", stage === "hunt" || stage === "spot" ? SPOT_IDS.filter((id) => !seen.includes(id)) : []); }, [stage, seen]);

  if (phase !== "moon" || stage === "idle") return null;

  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const btn = "w-full py-3 rounded-full text-black font-bold tracking-widest text-sm active:scale-95 transition-transform";
  const card = (children: React.ReactNode) => (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:items-center md:justify-end p-3 pt-16 pb-44 md:pb-3 md:pr-8 bg-black/45 backdrop-blur-[2px] pointer-events-auto">
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-240px)] md:max-h-[88vh] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_0%,rgba(159,208,255,.18),rgba(8,10,16,.95)_60%)] shadow-[0_0_40px_rgba(159,208,255,.25)] p-4 text-[#eaf2ff] animate-[hubrise_0.4s_ease]" style={{ borderColor: `${ACC}88` }}>{children}</div>
    </div>
  );
  const head = (top: string, title: string) => (<><div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>{top}</div><div className="text-xl sm:text-2xl font-bold tracking-wide mb-2">{title}</div></>);
  const art = (icon: string, extra?: React.ReactNode) => (
    <div className="relative rounded-2xl aspect-[4/3] border flex items-center justify-center bg-[radial-gradient(circle,rgba(159,208,255,.22),rgba(0,0,0,.6)_70%)] overflow-hidden" style={{ borderColor: `${ACC}55` }}>
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

      {action && !["welcome", "story", "spot", "memory", "log", "pledge", "quiz", "badge"].includes(stage) && (
        <button onClick={action.run} className="absolute z-[57] left-1/2 -translate-x-1/2 bottom-28 md:bottom-16 flex items-center gap-2 rounded-full px-6 py-3.5 text-black font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(159,208,255,.7)] animate-bounce pointer-events-auto" style={{ background: ACC }}>
          <span className="hidden md:inline-flex w-7 h-7 rounded-md bg-black/80 items-center justify-center text-xs" style={{ color: ACC }}>E</span>
          {t(action.label, lang)} 👆
        </button>
      )}

      {stage === "welcome" && card(<>
        {head("OCEAN OF STORMS · 1969", B("INTREPID meets SURVEYOR 3", "ইনট্রেপিড ও সার্ভেয়ার ৩"))}
        {art("🚀", <div className="absolute bottom-3 right-4 text-5xl">🤖</div>)}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-3">
          {[["180 m", B("from the robot", "রোবট থেকে দূরে")], ["31", B("months alone", "মাস একা")], ["2", B("moonwalks", "বার হাঁটা")]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>))}
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("story"); setSlide(0); sayC(STORY[0]!.clip); }}>📜 {B("YES! TELL ME THE STORY", "হ্যাঁ! গল্পটা বলো")}</button>
      </>)}

      {stage === "story" && card(<>
        {head(`${B("CHAPTER", "পর্ব")} ${slide + 1}/${STORY.length} · ${STORY[slide]!.year}`, `${STORY[slide]!.icon} ${t(STORY[slide]!.title, lang)}`)}
        {art(STORY[slide]!.icon, slide === 0 ? <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-yellow-400 text-black text-xs font-mono font-bold animate-pulse">SCE → AUX</div> : null)}
        <div className="mt-3 text-sm leading-relaxed opacity-90">{t(LN[STORY[slide]!.clip]!, lang)}</div>
        <div className="flex justify-center gap-1.5 mt-3">{STORY.map((_, k) => <span key={k} className="h-2 rounded-full transition-all" style={{ width: k === slide ? 22 : 8, background: k <= slide ? ACC : "rgba(255,255,255,.25)" }} />)}</div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={nextSlide}>{slide + 1 >= STORY.length ? `🔍 ${B("LET'S EXPLORE!", "চলো ঘুরে দেখি!")}` : `${B("NEXT", "পরেরটা")} →`}</button>
      </>)}

      {stage === "spot" && spot && card(<>
        {head(museum.current ? B("RELIC", "নিদর্শন") : `${B("TREASURE", "গুপ্তধন")} ${seen.length + 1}/7`, `${spot.icon} ${t(spot.name, lang)}`)}
        {spot.id === "tvcam"
          ? art(cut ? "📦" : "📷", <div className="absolute inset-x-0 bottom-3 text-center">{cut
              ? <div className="mx-auto w-fit rounded-xl bg-black/70 px-3 py-1.5 font-mono text-xs text-green-300">✅ {B("Camera packed for Earth!", "ক্যামেরা পৃথিবীর জন্য ব্যাগে!")}</div>
              : <button onClick={() => { setCut(true); audio.beep(1600); }} className="px-5 py-2.5 rounded-full bg-yellow-400 text-black font-bold text-sm animate-bounce">✂️ {B("CUT THE CAMERA!", "ক্যামেরা কাটো!")}</button>}</div>)
          : art(spot.icon)}
        <div className="mt-3 rounded-2xl px-3 py-2 text-sm font-bold text-center" style={{ background: `${ACC}22`, color: ACC }}>💡 {t(spot.fact, lang)}</div>
        <button disabled={spot.id === "tvcam" && !cut} className={`${btn} mt-3 disabled:opacity-30`} style={{ background: ACC }} onClick={closeSpot}>
          {spot.id === "tvcam" && !cut ? B("Cut the camera first! ✂️", "আগে ক্যামেরা কাটো! ✂️") : `✅ ${B("GOT IT!", "বুঝেছি!")}`}
        </button>
      </>)}

      {(stage === "memory" || stage === "log") && card(<>
        {head("SURVEYOR 3 · RELIC LOG", B("Waking up the robot's memory", "রোবটের স্মৃতি জাগানো"))}
        {art("🤖", <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(159,208,255,.45),transparent_60%)] animate-pulse mix-blend-screen" />)}
        {stage === "log"
          ? <div className="mt-3 rounded-xl bg-black/70 border border-[#7dffb0]/40 p-3 font-mono text-[12px] leading-relaxed text-[#9dffc4]"><TypeLog key={lang} text={t(LN["final_log"]!, lang)} onStart={() => sayC("final_log")} /></div>
          : <div className="mt-3 text-center text-xs tracking-[0.3em] animate-pulse" style={{ color: ACC }}>📻 ··· BEEP ··· KSHHH ··· 📻</div>}
        {stage === "log" && <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("pledge"); sayC("heritage"); }}>🛡️ {B("NEXT", "পরেরটা")} →</button>}
      </>)}

      {stage === "pledge" && card(<>
        {head("NASA HERITAGE · " + B("PROTECT THE PAST", "ইতিহাস রক্ষা"), B("Will you protect them?", "তুমি কি এদের রক্ষা করবে?"))}
        <ul className="mt-1 space-y-1.5 text-sm">
          {[["👀", B("Watch from far away", "দূর থেকে দেখবো")], ["🤖", B("Never break old robots", "পুরনো রোবট ভাঙবো না")], ["🤝", B("These belong to everyone", "এগুলো সবার")]].map(([i, x]) => <li key={x} className="flex gap-2 rounded-xl bg-white/5 px-3 py-2"><span>{i}</span>{x}</li>)}
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
          <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>MISSION 02 · {B("COMPLETE", "সম্পন্ন")}</div>
          <div className="mx-auto mt-3 w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 animate-float-gentle" style={{ borderColor: ACC, background: "radial-gradient(circle,#173a5c,#040a12)" }}>📷</div>
          <div className="text-2xl font-bold mt-3" style={{ color: ACC }}>{B("RELIC RECOVERER", "রিলিক রিকভারার")}</div>
          <div className="text-xs opacity-75 mt-1">{B("Best friend of lost space robots", "হারানো মহাকাশ রোবটদের সেরা বন্ধু")}</div>
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => finish(false)}>🚶 {B("WALK TO ZONE 3 · APOLLO 15", "জোন ৩-এ চলো · অ্যাপোলো ১৫")}</button>
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
