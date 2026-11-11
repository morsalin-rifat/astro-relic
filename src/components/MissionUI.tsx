import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";

type L = { en: string; bn: string };

export const BADGES: { id: string; icon: string; name: L; rover: L }[] = [
  { id: "ares-pioneer", icon: "🎖️", name: { en: "Ares Vallis Pioneer", bn: "অ্যারিস ভ্যালিস অগ্রদূত" }, rover: { en: "Sojourner · 1997", bn: "সোজার্নার · ১৯৯৭" } },
  { id: "gusev-fighter", icon: "🛡️", name: { en: "Gusev Fighter", bn: "গুসেভ যোদ্ধা" }, rover: { en: "Spirit · 2004", bn: "স্পিরিট · ২০০৪" } },
  { id: "meridiani-marathoner", icon: "🏃", name: { en: "Meridiani Marathoner", bn: "মেরিডিয়ানি ম্যারাথনার" }, rover: { en: "Opportunity · 2004", bn: "অপরচুনিটি · ২০০৪" } },
  { id: "elysium-heartbeat", icon: "💓", name: { en: "Elysium Heartbeat", bn: "এলিসিয়াম হৃদস্পন্দন" }, rover: { en: "InSight · 2018", bn: "ইনসাইট · ২০১৮" } },
];

const TOPICS: { id: string; icon: string; label: L; text: L }[] = [
  { id: "03_part_wheels", icon: "🛞", label: { en: "How did I move?", bn: "আমি কীভাবে চলতাম?" }, text: { en: "Six wheels on a rocker-bogie suspension let me climb over rocks without tipping.", bn: "রকার-বগি সাসপেনশনে ছয়টি চাকা আমাকে না উল্টে পাথরের ওপর দিয়ে চলতে দিত।" } },
  { id: "03_part_eyes", icon: "👀", label: { en: "What are my eyes?", bn: "আমার চোখ কোনগুলো?" }, text: { en: "Two front cameras and one rear camera helped me see and avoid hazards.", bn: "সামনের দুটি ও পেছনের একটি ক্যামেরা দিয়ে আমি দেখতাম ও বিপদ এড়াতাম।" } },
  { id: "03_part_antenna", icon: "📡", label: { en: "How did I talk to Earth?", bn: "পৃথিবীর সাথে কীভাবে কথা বলতাম?" }, text: { en: "I radioed the Pathfinder lander, and the lander sent my messages to Earth.", bn: "আমি পাথফাইন্ডার ল্যান্ডারকে রেডিও করতাম, আর ল্যান্ডার পৃথিবীতে বার্তা পাঠাত।" } },
  { id: "03_part_solar", icon: "☀️", label: { en: "Where did my power come from?", bn: "আমার শক্তি কোথা থেকে আসত?" }, text: { en: "A small solar panel on my back turned sunlight into electricity.", bn: "পিঠের ছোট সোলার প্যানেল সূর্যের আলোকে বিদ্যুতে পরিণত করত।" } },
  { id: "03_part_nose_apxs", icon: "🔬", label: { en: "My rock-sniffing nose", bn: "আমার পাথর-শোঁকা নাক" }, text: { en: "My APXS tool touched rocks like Yogi and Barnacle Bill to learn what they're made of.", bn: "আমার APXS যন্ত্র যোগী ও বার্নাকল বিল পাথর ছুঁয়ে বুঝত সেগুলো কী দিয়ে তৈরি।" } },
  { id: "04_photo_gallery", icon: "📸", label: { en: "Want to see my photos?", bn: "আমার তোলা ছবি দেখবে?" }, text: { en: "Together with the lander we sent back over 16,500 pictures of Mars!", bn: "ল্যান্ডারের সাথে মিলে আমরা মঙ্গলের ১৬,৫০০-এর বেশি ছবি পাঠিয়েছিলাম!" } },
];

const QUIZ = {
  q: { en: "How many wheels did I have?", bn: "আমার কয়টি চাকা ছিল?" },
  options: ["4", "6", "8"],
  answer: "6",
};

/* ---------- 3D turntable inside the card ---------- */
function RoverTurntable() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    const size = el.clientWidth;
    r.setSize(size, size);
    r.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(r.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff0e0, 0x553322, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(3, 4, 2);
    scene.add(d);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    cam.position.set(0, 0.9, 2.6);
    cam.lookAt(0, 0.25, 0);
    const pivot = new THREE.Group();
    scene.add(pivot);
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load("/models/sojourner.glb", (g) => {
      const m = g.scene;
      const box = new THREE.Box3().setFromObject(m);
      const s = box.getSize(new THREE.Vector3());
      const k = 1.5 / Math.max(s.x, s.y, s.z, 0.001);
      const c = box.getCenter(new THREE.Vector3());
      m.scale.setScalar(k);
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      pivot.add(m);
    });
    let yaw = 0.6, vel = 0.4, drag = false, lx = 0, raf = 0, last = performance.now();
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drag) return; vel = (e.clientX - lx) * 0.6; yaw += (e.clientX - lx) * 0.012; lx = e.clientX; };
    const up = () => { drag = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!drag) { yaw += vel * dt; vel += (0.4 - vel) * Math.min(1, dt * 1.5); }
      pivot.rotation.y = yaw;
      r.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      r.dispose();
      r.domElement.remove();
    };
  }, []);
  return <div ref={ref} className="w-full aspect-square cursor-grab active:cursor-grabbing touch-none" />;
}

/* ---------- Sojourner encounter card ---------- */
export function SojournerEncounter() {
  const show = useGame((s) => s.showEncounter);
  const lang = useGame((s) => s.lang);
  const [step, setStep] = useState<"welcome" | "explore" | "quiz" | "farewell">("welcome");
  const [seen, setSeen] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);

  const say = (clip: string, then?: () => void) => {
    setSpeaking(true);
    voice.play(clip, () => { setSpeaking(false); then?.(); });
  };

  useEffect(() => {
    if (!show) return;
    setStep("welcome"); setSeen([]); setActive(null); setWrong(null);
    say("02_sojourner_welcome");
    return () => voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const finish = () => {
    voice.stop();
    store.set({ showEncounter: false, storyDone: true, flags: Array.from(new Set([...store.get().flags, "sojourner"])) });
    store.awardBadge("ares-pioneer");
    audio.beep(1320);
    voice.play("07_zone_unlock");
    store.say([{ speaker: "nova", en: "Mission complete! The path to Spirit in Gusev Crater is now open.", bn: "মিশন সফল! গুসেভ ক্রেটারে স্পিরিটের দিকে যাওয়ার পথ এখন খোলা।" }]);
  };

  const topic = TOPICS.find((x) => x.id === active);
  const caption =
    step === "welcome" ? { en: "Hi! I'm Sojourner — the first rover ever to drive on another planet. I landed here on July 4, 1997!", bn: "হাই! আমি সোজার্নার — অন্য গ্রহে চলা প্রথম রোভার। ১৯৯৭ সালের ৪ জুলাই আমি এখানে নেমেছিলাম!" }
    : step === "quiz" ? QUIZ.q
    : step === "farewell" ? { en: "Planned for 7 days, I worked for 83! My last signal came on Sept 27, 1997. Keep exploring for me!", bn: "৭ দিনের জন্য পরিকল্পনা ছিল, আমি কাজ করেছি ৮৩ দিন! শেষ সিগন্যাল ২৭ সেপ্টেম্বর ১৯৯৭। আমার হয়ে খোঁজ চালিয়ে যেও!" }
    : topic?.text ?? { en: "Tap a question to learn about me. Drag me to spin!", bn: "আমার সম্পর্কে জানতে একটি প্রশ্নে ট্যাপ করো। ঘোরাতে আমাকে টেনে দেখো!" };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-[2px]">
      <div className="relative w-[min(440px,96vw)] max-h-[94vh] overflow-y-auto rounded-[28px] border border-[#ffd97d]/50 bg-[radial-gradient(circle_at_50%_20%,rgba(255,170,90,.18),rgba(12,8,6,.92)_65%)] shadow-[0_0_40px_rgba(255,180,90,.25)] p-4 text-[#ffe9c8]">
        <button onClick={() => { voice.stop(); store.set({ showEncounter: false }); }} className="absolute top-3 right-4 text-xl opacity-70 hover:opacity-100" aria-label="Close">✕</button>
        <div className="text-[10px] tracking-[0.35em] text-[#ffd97d]/80">ARES VALLIS · 1997</div>
        <div className="text-2xl font-bold tracking-wide">SOJOURNER</div>
        <div className="relative mx-auto w-[min(260px,70vw)] mt-1">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffd97d]/40 animate-[spin_30s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,.25),transparent_70%)]" />
          <RoverTurntable />
        </div>
        <div className="min-h-[64px] rounded-2xl bg-black/50 border border-white/10 px-4 py-3 text-sm leading-relaxed flex gap-2">
          <span className={speaking ? "animate-pulse" : "opacity-40"}>🔊</span>
          <span>{t(caption, lang)}</span>
        </div>

        {step === "welcome" && (
          <button onClick={() => { voice.stop(); setStep("explore"); }} className="mt-3 w-full py-3 rounded-full bg-[#ffd97d] text-black font-bold tracking-widest">
            {lang === "bn" ? "চলো জানি! →" : "LET'S EXPLORE →"}
          </button>
        )}

        {step === "explore" && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {TOPICS.map((tp) => (
                <button key={tp.id} onClick={() => { setActive(tp.id); setSeen((s) => (s.includes(tp.id) ? s : [...s, tp.id])); say(tp.id); }}
                  className={`text-left text-xs rounded-2xl px-3 py-2 border transition-all ${active === tp.id ? "bg-[#ffd97d] text-black border-[#ffd97d]" : "bg-white/5 border-white/15 hover:border-[#ffd97d]/70"}`}>
                  <span className="text-lg mr-1">{tp.icon}</span>{t(tp.label, lang)}{seen.includes(tp.id) && active !== tp.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#ffd97d] transition-all" style={{ width: `${(Math.min(seen.length, 4) / 4) * 100}%` }} /></div>
              <button disabled={seen.length < 4} onClick={() => { setStep("quiz"); say("06_sojourner_quiz"); }}
                className="px-4 py-2 rounded-full text-xs font-bold tracking-widest bg-[#ffd97d] text-black disabled:opacity-30">
                {lang === "bn" ? "চ্যালেঞ্জ →" : "CHALLENGE →"}
              </button>
            </div>
            <div className="text-[10px] mt-1 opacity-60">{lang === "bn" ? "চ্যালেঞ্জ খুলতে অন্তত ৪টি প্রশ্ন দেখো" : "Explore at least 4 questions to unlock the challenge"}</div>
          </>
        )}

        {step === "quiz" && (
          <div className="flex gap-3 mt-3 justify-center">
            {QUIZ.options.map((o) => (
              <button key={o} onClick={() => {
                if (o === QUIZ.answer) { audio.beep(1200); setStep("farewell"); say("05_sojourner_farewell"); }
                else { audio.beep(300); setWrong(o); }
              }} className={`w-16 h-16 rounded-full text-2xl font-bold border-2 ${wrong === o ? "border-red-400 text-red-300 animate-pulse" : "border-[#ffd97d] text-[#ffd97d] hover:bg-[#ffd97d] hover:text-black"}`}>{o}</button>
            ))}
          </div>
        )}
        {step === "quiz" && wrong && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "প্রায় হয়েছে! আমার চাকাগুলো আবার গুনে দেখো 🛞" : "Close! Spin me and count my wheels again 🛞"}</div>}

        {step === "farewell" && (
          <button onClick={finish} className="mt-3 w-full py-3 rounded-full bg-[#ffd97d] text-black font-bold tracking-widest">
            🎖️ {lang === "bn" ? "ব্যাজ সংগ্রহ করো" : "COLLECT BADGE"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Badge popup + badge cabinet ---------- */
export function Badges() {
  const phase = useGame((s) => s.phase);
  const badges = useGame((s) => s.badges);
  const fresh = useGame((s) => s.newBadge);
  const lang = useGame((s) => s.lang);
  const [open, setOpen] = useState(false);
  const b = BADGES.find((x) => x.id === fresh);
  const showButton = phase === "explore" || phase === "hub";
  return (
    <>
      {showButton && (
        <button onClick={() => setOpen(true)} className="absolute top-[232px] right-4 z-40 w-[150px] rounded-full bg-black/60 border border-[#ffd97d]/60 text-[#ffd97d] text-xs py-1.5 tracking-widest">
          🎖️ {badges.length}/{BADGES.length} {lang === "bn" ? "ব্যাজ" : "BADGES"}
        </button>
      )}
      {open && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-[min(420px,94vw)] rounded-3xl border border-[#ffd97d]/50 bg-[#140c08]/95 p-5 text-[#ffe9c8]" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold tracking-widest mb-3">{lang === "bn" ? "আমার ব্যাজ" : "MY BADGES"}</div>
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((x) => {
                const got = badges.includes(x.id);
                return (
                  <div key={x.id} className={`rounded-2xl p-3 text-center border ${got ? "border-[#ffd97d] bg-[#ffd97d]/10" : "border-white/10 opacity-50"}`}>
                    <div className={`text-4xl ${got ? "" : "grayscale"}`}>{got ? x.icon : "🔒"}</div>
                    <div className="text-xs font-bold mt-1">{t(x.name, lang)}</div>
                    <div className="text-[10px] opacity-70">{t(x.rover, lang)}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 rounded-full border border-[#ffd97d] text-[#ffd97d] text-sm">OK</button>
          </div>
        </div>
      )}
      {b && (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-black/60" onClick={() => store.set({ newBadge: null })}>
          <div className="text-center animate-[badgepop_0.9s_cubic-bezier(.2,1.6,.4,1)]">
            <div className="text-[110px] drop-shadow-[0_0_30px_rgba(255,210,120,.9)] animate-[spin_3s_ease-out_1]">{b.icon}</div>
            <div className="text-[#ffd97d] text-xs tracking-[0.4em]">{lang === "bn" ? "নতুন ব্যাজ!" : "NEW BADGE UNLOCKED"}</div>
            <div className="text-[#ffe9c8] text-2xl font-bold mt-1">{t(b.name, lang)}</div>
            <div className="text-[#ffe9c8]/70 text-sm">{t(b.rover, lang)}</div>
            <div className="text-[#ffe9c8]/50 text-xs mt-4">{lang === "bn" ? "চালিয়ে যেতে ট্যাপ করো" : "Tap to continue"}</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Full-screen map close button (map itself is drawn by the scene) ---------- */
export function BigMapClose() {
  const open = useGame((s) => s.bigMap);
  const lang = useGame((s) => s.lang);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && store.get().bigMap) { store.set({ bigMap: false }); return; } if (e.key.toLowerCase() === "m" && store.get().phase === "explore") store.set({ bigMap: !store.get().bigMap }); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  if (!open) return null;
  return (
    <button onClick={() => store.set({ bigMap: false })} className="absolute top-4 right-4 z-[47] px-4 py-2 rounded-full bg-[#ffd97d] text-black font-bold text-sm">
      ✕ {lang === "bn" ? "ম্যাপ বন্ধ" : "CLOSE MAP"}
    </button>
  );
}

/* ---------- Rolling rover loading screen ---------- */
const FACTS: L[] = [
  { en: "Sojourner was about the size of a microwave oven!", bn: "সোজার্নার ছিল প্রায় একটা মাইক্রোওয়েভ ওভেনের সমান!" },
  { en: "A day on Mars is called a 'sol' — it's 24 hours 39 minutes.", bn: "মঙ্গলের একদিনকে বলে 'সল' — ২৪ ঘণ্টা ৩৯ মিনিট।" },
  { en: "Mars sunsets are blue!", bn: "মঙ্গলের সূর্যাস্ত নীল রঙের!" },
  { en: "Opportunity drove more than a marathon: 45 km!", bn: "অপরচুনিটি ম্যারাথনের চেয়েও বেশি — ৪৫ কিমি চলেছিল!" },
  { en: "You would weigh only 38% of your Earth weight on Mars.", bn: "মঙ্গলে তোমার ওজন হবে পৃথিবীর মাত্র ৩৮%।" },
];

export function RoverLoader() {
  const loading = useGame((s) => s.loading);
  const lang = useGame((s) => s.lang);
  const [fi, setFi] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (loading) { setVisible(true); setFi(Math.floor(Math.random() * FACTS.length)); return; }
    const id = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(id);
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setFi((i) => (i + 1) % FACTS.length), 3200);
    return () => clearInterval(id);
  }, [loading]);
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-[58] flex flex-col items-center justify-center bg-[linear-gradient(#1a0c07,#3a170b_70%,#5a2412)] transition-opacity duration-700" style={{ opacity: loading ? 1 : 0 }}>
      <div className="relative w-[min(420px,90vw)] h-40 overflow-hidden">
        <div className="absolute bottom-6 left-0 w-[200%] h-10 rover-dunes" />
        <div className="absolute bottom-[38px] left-1/2 -translate-x-1/2 rover-bob">
          <svg width="120" height="70" viewBox="0 0 120 70">
            <rect x="22" y="14" width="76" height="8" rx="2" fill="#3b4a6b" stroke="#9fb3d9" />
            <rect x="28" y="22" width="64" height="16" rx="3" fill="#c9c3b5" />
            <rect x="86" y="26" width="10" height="7" fill="#222" /><circle cx="93" cy="29" r="2" fill="#4fd1ff" />
            <line x1="34" y1="14" x2="30" y2="2" stroke="#ddd" strokeWidth="2" /><circle cx="30" cy="2" r="2" fill="#ffd97d" />
            <path d="M30 38 L22 50 M60 38 L60 50 M90 38 L98 50 M40 38 L46 50" stroke="#aaa" strokeWidth="2.5" fill="none" />
            {[22, 60, 98].map((x) => (
              <g key={x} className="rover-wheel" style={{ transformOrigin: `${x}px 56px` }}>
                <circle cx={x} cy="56" r="9" fill="#333" stroke="#888" strokeWidth="2" />
                <line x1={x - 8} y1="56" x2={x + 8} y2="56" stroke="#aaa" strokeWidth="2" />
                <line x1={x} y1="48" x2={x} y2="64" stroke="#aaa" strokeWidth="2" />
              </g>
            ))}
          </svg>
          {[0, 1, 2].map((i) => <span key={i} className="rover-dust" style={{ animationDelay: `${i * 0.35}s` }} />)}
        </div>
      </div>
      <div className="text-[#ffd97d] tracking-[0.4em] text-xs mt-2 animate-pulse">{lang === "bn" ? "মঙ্গলে নামছি…" : "ROLLING ACROSS MARS…"}</div>
      <div className="text-[#ffe9c8] text-sm mt-4 max-w-[340px] text-center px-4 min-h-[40px]">💡 {t(FACTS[fi]!, lang)}</div>
    </div>
  );
}
