import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  { id: "silent-listener", icon: "🎧", name: { en: "Silent Listener", bn: "নীরব শ্রোতা" }, rover: { en: "InSight · 2018", bn: "ইনসাইট · ২০১৮" } },
  { id: "eagle-guardian", icon: "🦅", name: { en: "Eagle Guardian", bn: "ঈগল গার্ডিয়ান" }, rover: { en: "Apollo 11 · 1969", bn: "অ্যাপোলো ১১ · ১৯৬৯" } },
  { id: "relic-recoverer", icon: "📷", name: { en: "Relic Recoverer", bn: "রিলিক রিকভারার" }, rover: { en: "Apollo 12 · 1969", bn: "অ্যাপোলো ১২ · ১৯৬৯" } },
  { id: "final-stargazer", icon: "🌌", name: { en: "Final Stargazer", bn: "ফাইনাল স্টারগেজার" }, rover: { en: "Apollo 17 · 1972", bn: "অ্যাপোলো ১৭ · ১৯৭২" } },
  { id: "buggy-driver", icon: "🏎️", name: { en: "Lunar Buggy Driver", bn: "লুনার বাগি ড্রাইভার" }, rover: { en: "Apollo 15 · 1971", bn: "অ্যাপোলো ১৫ · ১৯৭১" } },
  { id: "master-explorer", icon: "👑", name: { en: "Master Mars Explorer", bn: "মাস্টার মার্স এক্সপ্লোরার" }, rover: { en: "Grand Finale", bn: "গ্র্যান্ড ফিনালে" } },
  { id: "master-lunar", icon: "🌕", name: { en: "Master Lunar Explorer", bn: "মাস্টার লুনার এক্সপ্লোরার" }, rover: { en: "Lunar Grand Finale", bn: "চাঁদের গ্র্যান্ড ফিনালে" } },
];

const TOPICS: { id: string; icon: string; label: L; text: L }[] = [
  { id: "03_part_wheels", icon: "\ud83d\udede", label: { en: "How did I move?", bn: "আমি কীভাবে চলতাম?" }, text: { en: "Check out my six magic wheels! NASA called this the 'Rocker-Bogie' system. With no springs at all, I could climb over rocks bigger than myself without ever flipping over! My top speed was just one centimeter per second\u2014slow and steady wins the race!", bn: "আমার এই ৬টি চাকার জাদু দেখেছো? নাসা এটার নাম দিয়েছিল 'রকার-বগি' সিস্টেম। আমার কোনো স্প্রিং ছিল না, তবুও বড় বড় পাথরের ওপর দিয়ে আমি হেলেদুলে পার হতে পারতাম, কখনও উল্টে যাইনি! তবে আমি চলতাম খুব ধীরে—সেকেন্ডে মাত্র ১ সেন্টিমিটার!" } },
  { id: "03_part_eyes", icon: "\ud83d\udc40", label: { en: "What are my eyes?", bn: "আমার চোখ কোনগুলো?" }, text: { en: "See my two front eyes? These are NASA's stereo cameras! Just like human eyes, they allowed me to see in 3D and judge rock distances so I wouldn't crash! Through these lenses, I sent over 550 real color photos back to Earth!", bn: "আমার এই দুটো চোখ দেখেছো? এগুলো সাধারণ ক্যামেরা নয়, নাসার স্পেশাল 'Stereo Cameras'! মানুষের মতো দুই চোখ দিয়ে আমি সামনে থাকা পাথরের সঠিক দূরত্ব মাপতাম, যাতে কোনো পাথরে ধাক্কা না খাই! এগুলো দিয়ে আমি পৃথিবীতে ৫৫০টি আসল রঙিন ছবি পাঠিয়েছিলাম!" } },
  { id: "03_part_antenna", icon: "\ud83d\udce1", label: { en: "How did I talk to Earth?", bn: "পৃথিবীর সাথে কীভাবে কথা বলতাম?" }, text: { en: "Did you know? I couldn't talk to Earth all alone! This short antenna acted like a walkie-talkie to beam my findings to the Pathfinder lander behind me. Pathfinder had the giant dish to relay everything to NASA!", bn: "তুমি কি জানো? একা একা কোটি মাইল দূরের পৃথিবীতে কথা বলার মতো বড় অ্যান্টেনা আমার শরীরে ছিল না! এই ছোট অ্যান্টেনা দিয়ে আমি ওয়াকি-টকির মতো বার্তা পাঠাতাম পেছনে থাকা পাথফাইন্ডার ল্যান্ডারে। আর ল্যান্ডার সেটা পৃথিবীতে রিলে করত!" } },
  { id: "03_part_solar", icon: "\u2600\ufe0f", label: { en: "Where did my power come from?", bn: "আমার শক্তি কোথা থেকে আসত?" }, text: { en: "My shiny flat roof is my solar panel! It soaked up Martian sunlight to generate just 16 watts of power\u2014barely enough for a small night light! But when Martian dust blew over my roof, my power dropped fast.", bn: "আমার পিঠের এই কাঁচের মতো ছাদটিই ছিল আমার শক্তির উৎস! এটা সূর্যের আলো থেকে বিদ্যুৎ তৈরি করত—দিনে মাত্র ১৬ ওয়াট, যা তোমার টেবিল ল্যাম্পের সমান! কিন্তু মঙ্গলের লাল ধুলো জমে গেলে আমার সোলার প্যানেল ঢেকে যেত, আর তখনই আমার শক্তি কমে যেত।" } },
  { id: "03_part_nose_apxs", icon: "\ud83d\udd2c", label: { en: "My rock-sniffing nose", bn: "আমার পাথর-শোঁকা নাক" }, text: { en: "Look at this metal probe on my back\u2014it's my APXS Spectrometer! Think of it as my scientific nose. I pressed it against Martian rocks to shoot X-rays and instantly analyze what minerals and secrets they were hiding!", bn: "আমার পেছনের এই লম্বা রডটির নাম 'APXS স্পেকট্রোমিটার'! এটাকে আমার বৈজ্ঞানিক নাক বলতে পারো। আমি পাথরের গায়ে এই নাক ছুঁইয়ে এক্স-রে রশ্মি ফেলতাম, আর এক নিমেষেই বলে দিতাম ওই পাথরে কী কী খনিজ বা মার্সিয়ান কেমিক্যাল আছে!" } },
  { id: "04_photo_gallery", icon: "\ud83d\udcf8", label: { en: "Want to see my photos?", bn: "আমার তোলা ছবি দেখবে?" }, text: { en: "Take a look at my favorite Martian snapshots! That big rock is 'Yogi Rock'\u2014named after Yogi Bear! And see those distant 'Twin Peaks'? Those two hills proved to scientists that a vast river once rushed through this valley billions of years ago!", bn: "আমার তোলা কিছু বিখ্যাত ছবি দেখো! ওই যে মস্ত বড় পাথরটা দেখছো, ওটার নাম দিয়েছিলাম 'যোগী পাথর'—নাসার বিজ্ঞানীরা কার্টুনের যোগী বেয়ারের নামে নাম রেখেছিল! আর ওই দূরে 'যমজ পাহাড়'—ওগুলো দেখে আমরা নিশ্চিত হয়েছিলাম, কোটি কোটি বছর আগে মঙ্গলে বিশাল নদী বয়ে যেত!" } },
  { id: "07_sojourner_sources", icon: "\ud83d\ude80", label: { en: "Learn more about me", bn: "আমাকে নিয়ে আরও জানো" }, text: { en: "Want to see how humans built me and sent me soaring to Mars in a giant rocket? Look down below\u2014I've saved real NASA videos and mission archives just for you! Tap on them to see the magic from 1997!", bn: "জানতে চাও মানুষ কীভাবে আমাকে বানিয়েছিল? আর সেই ঐতিহাসিক দিনটিতে কীভাবে রকেটে করে মঙ্গলে পাঠিয়েছিল? নিচে দেখো নাসার আসল ভিডিও আর দারুণ সব ছবি রেখে দিয়েছি! তোমার চোখের সামনেই দেখতে পাবে ১৯৯৭ সালের সেই অবিস্মরণীয় মুহূর্তগুলো!" } },
];

const QUIZ = {
  q: { en: "You heard all my stories! Now let's see if you know my buddy. What was the name of that famous rock I spotted with my camera eyes? One—Yogi Rock, or Two—Dragon Rock?", bn: "তুমি তো আমার সব গল্প শুনলে! এবার দেখি আমার এই বন্ধুটিকে চেনো কি না? আমার ক্যামেরা চোখ দিয়ে খুঁজে পাওয়া ওই বিখ্যাত পাথরটির নাম কী ছিল? এক—যোগী পাথর, নাকি দুই—ড্রাগন পাথর?" },
  options: [{ id: "yogi", icon: "🪨", en: "Yogi Rock", bn: "যোগী পাথর" }, { id: "dragon", icon: "🐉", en: "Dragon Rock", bn: "ড্রাগন পাথর" }],
  answer: "yogi",
};

const SOURCES = [
  { icon: "🎬", en: "Pathfinder launch & landing (NASA video)", bn: "পাথফাইন্ডার লঞ্চ ও অবতরণ (নাসার ভিডিও)", url: "https://www.youtube.com/results?search_query=NASA+Mars+Pathfinder+Sojourner+1997" },
  { icon: "🛰️", en: "NASA Mars Pathfinder mission page", bn: "নাসার মার্স পাথফাইন্ডার মিশন পেজ", url: "https://science.nasa.gov/mission/mars-pathfinder/" },
  { icon: "🖼️", en: "Real Sojourner photos (NASA Photojournal)", bn: "সোজার্নারের আসল ছবি (নাসা ফটোজার্নাল)", url: "https://photojournal.jpl.nasa.gov/mission/Mars%20Pathfinder" },
];

/* ---------- 3D turntable inside the card ---------- */
export function RoverTurntable({ model = "/models/sojourner.glb", accent = "#ffd97d" }: { model?: string; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
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
    cam.position.set(0, 1.1, 3.4);
    cam.lookAt(0, 0.35, 0);
    let dead = false;
    const pivot = new THREE.Group();
    scene.add(pivot);
    MeshoptDecoder.ready.then(() => { if (!dead) new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(model, (g) => {
      const m = g.scene;
      const box = new THREE.Box3().setFromObject(m);
      const s = box.getSize(new THREE.Vector3());
      const k = 1.5 / Math.max(s.x, s.y, s.z, 0.001);
      const c = box.getCenter(new THREE.Vector3());
      m.scale.setScalar(k);
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      pivot.add(m);
      setReady(true);
    }, undefined, () => setReady(true)); });
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
      dead = true;
      cancelAnimationFrame(raf);
      r.dispose();
      r.domElement.remove();
    };
  }, [model]);
  return (
    <div className="relative w-full aspect-square">
      <div ref={ref} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: accent }} />
          <div className="mt-2 text-[10px] tracking-[0.3em] text-[#ffd97d]/80">WAKING UP…</div>
        </div>
      )}
    </div>
  );
}

const PHOTOS: { src: string; title: L; text: L }[] = [
  { src: "/images/sojourner/PIA00766.jpg", title: { en: "Me & Yogi Rock", bn: "আমি ও যোগী পাথর" }, text: { en: "I touched this big rock with my APXS 'nose' to learn what it was made of.", bn: "এই বড় পাথরটা আমার APXS 'নাক' দিয়ে ছুঁয়ে বুঝেছিলাম এটা কী দিয়ে তৈরি।" } },
  { src: "/images/sojourner/PIA00627.jpg", title: { en: "Down the ramp!", bn: "র‍্যাম্প বেয়ে নামা!" }, text: { en: "I rolled down this ramp from the lander — my first wheel tracks on Mars!", bn: "ল্যান্ডারের এই র‍্যাম্প বেয়ে নেমেছিলাম — মঙ্গলে আমার প্রথম চাকার দাগ!" } },
  { src: "/images/sojourner/PIA00621.jpg", title: { en: "Ares Vallis", bn: "অ্যারিস ভ্যালিস" }, text: { en: "An ancient flood once rushed through this valley and left rocks everywhere.", bn: "একসময় বিশাল বন্যা এই উপত্যকা দিয়ে বয়ে গিয়ে চারদিকে পাথর ছড়িয়ে গেছে।" } },
  { src: "/images/sojourner/PIA00611.jpg", title: { en: "Bouncy landing", bn: "লাফিয়ে নামা" }, text: { en: "Giant airbags bounced us onto Mars. You can see them around the lander!", bn: "বিশাল এয়ারব্যাগে লাফিয়ে আমরা মঙ্গলে নেমেছিলাম। ল্যান্ডারের চারপাশে দেখো!" } },
];

function PhotoGallery({ lang, onClose }: { lang: "en" | "bn"; onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PHOTOS[i] ?? PHOTOS[0]!;
  const go = (d: number) => { audio.beep(900); setI((x) => (x + d + PHOTOS.length) % PHOTOS.length); };
  return (
    <div className="absolute inset-0 z-[3] rounded-[28px] bg-[#0c0806]/97 p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.3em] text-[#ffd97d]">📸 NASA · 1997</div>
        <button onClick={onClose} className="text-xl opacity-70 hover:opacity-100" aria-label="Close photos">✕</button>
      </div>
      <div className="relative mt-2 rounded-2xl overflow-hidden border border-[#ffd97d]/40 bg-black aspect-[4/3]">
        <img key={p.src} src={p.src} alt={t(p.title, lang)} className="w-full h-full object-contain animate-[hubrise_0.4s_ease]" />
        <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-[#ffd97d] text-[#ffd97d] text-xl">‹</button>
        <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-[#ffd97d] text-[#ffd97d] text-xl">›</button>
        <div className="absolute bottom-2 right-3 text-[10px] bg-black/60 px-2 py-0.5 rounded-full">{i + 1}/{PHOTOS.length}</div>
      </div>
      <div className="mt-3 text-lg font-bold text-[#ffd97d]">{t(p.title, lang)}</div>
      <div className="mt-1 flex gap-2 items-start"><div className="w-9 h-9 flex-shrink-0 rounded-full border-2 border-[#ffd97d] bg-[#221a14] flex items-center justify-center">🤖</div><div className="flex-1 rounded-2xl rounded-tl-sm bg-black/55 border border-[#ffd97d]/40 px-3 py-2 text-sm leading-relaxed"><div className="text-[9px] font-bold tracking-[0.3em] text-[#ffd97d]">SOJOURNER</div>{t(p.text, lang)}</div></div>
      <div className="flex justify-center gap-2 mt-3">
        {PHOTOS.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-[#ffd97d]" : "w-2 bg-white/30"}`} />)}
      </div>
      <div className="mt-auto pt-2 text-[9px] opacity-50 text-center">Images: NASA/JPL</div>
    </div>
  );
}


/* ---------- Hub-style left holo bubble with typewriter ---------- */
const bubblePos = { x: 0, y: 0 };
let bubbleHidden = false;
export function HoloBubble({ speaker, text, speaking, onClick, hint }: { speaker: "nova" | "sojourner" | "spirit" | "oppy" | "insight" | "eagle" | "intrepid" | "falcon" | "challenger"; text: string; speaking?: boolean; onClick?: () => void; hint?: string }) {
  const [n, setN] = useState(0);
  const [pos, setPos] = useState({ ...bubblePos });
  const [hidden, setHidden] = useState(false);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  // a new line always brings the bubble back
  useEffect(() => { bubbleHidden = false; setHidden(false); }, [text]);
  useEffect(() => {
    setN(0);
    if (speaking) {
      const id = window.setInterval(() => {
        const r = voice.progress();
        setN((x) => (r == null ? Math.min(text.length, x + 1) : Math.max(x, Math.ceil(r * text.length))));
      }, 40);
      return () => window.clearInterval(id);
    }
    const step = Math.max(28, Math.min(60, Math.floor(9000 / Math.max(text.length, 1))));
    const id = window.setInterval(() => setN((x) => { if (x >= text.length) { window.clearInterval(id); return x; } return x + 1; }), step);
    return () => window.clearInterval(id);
  }, [text, speaking]);
  useEffect(() => { if (!speaking) setN((x) => (x > 0 ? text.length : x)); }, [speaking, text]);
  const done = n >= text.length;
  const nova = speaker === "nova";
  const acc = speaker === "spirit" ? "#ff8a5c" : speaker === "oppy" ? "#6cc6ff" : speaker === "insight" ? "#b58cff" : "#ffd97d";
  const skip = (e: React.MouseEvent) => { e.stopPropagation(); setN(text.length); if (speaking) voice.skip(); };
  const onDown = (e: React.PointerEvent) => { drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.stopPropagation(); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) { const np = { x: d.ox + dx, y: d.oy + dy }; bubblePos.x = np.x; bubblePos.y = np.y; setPos(np); }
  };
  const onUp = (e: React.PointerEvent) => { const d = drag.current; drag.current = null; e.stopPropagation(); if (d && !d.moved) { if (!done) setN(text.length); else onClick?.(); } };
  if (hidden || bubbleHidden) {
    return (
      <button onClick={() => { bubbleHidden = false; setHidden(false); }} title="Show Nova"
        className="fixed z-[56] left-3 bottom-24 md:bottom-auto md:top-[18%] w-14 h-14 rounded-full border-2 bg-black/60 flex items-center justify-center pointer-events-auto animate-float-gentle"
        style={{ borderColor: acc, boxShadow: `0 0 ${speaking ? 22 : 10}px ${acc}` }}>
        {nova ? <img src="/images/nova.png" alt="Nova" className="w-11 h-11 object-contain" draggable={false} /> : <span className="text-2xl">{speaker === "eagle" ? "🦅" : speaker === "intrepid" ? "🚀" : speaker === "falcon" ? "🦅" : speaker === "challenger" ? "🚀" : "🤖"}</span>}
        {speaking && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping" style={{ background: acc }} />}
      </button>
    );
  }
  return (
    <div className="fixed z-[56] left-2 right-2 bottom-2 md:right-auto md:bottom-auto md:top-[18%] md:left-6 flex items-end gap-2 sm:gap-3 pointer-events-auto select-none animate-[hubrise_0.45s_ease] touch-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, cursor: "grab" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
      <div className={`relative flex-shrink-0 ${speaking ? "animate-talking-glow" : "animate-float-gentle"}`}>
        {nova ? (
          <img src="/images/nova.png" alt="Nova" className="w-[72px] sm:w-[110px] md:w-[140px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)]" draggable={false} />
        ) : (
          <div className="w-[72px] h-[72px] sm:w-[104px] sm:h-[104px] rounded-full border-2 flex items-center justify-center text-4xl sm:text-6xl" style={{ borderColor: acc, background: `radial-gradient(circle, ${acc}33, #221a14)`, boxShadow: `0 0 ${speaking ? 26 : 14}px ${acc}${speaking ? "" : "66"}` }}>{speaker === "eagle" ? "🦅" : speaker === "intrepid" ? "🚀" : speaker === "falcon" ? "🦅" : speaker === "challenger" ? "🚀" : "🤖"}</div>
        )}
      </div>
      <div className="nova-bubble relative flex-1 md:flex-none md:w-[min(360px,calc(50vw-260px))] md:min-w-[260px] mb-3 cursor-pointer">
        <span className="nova-bubble-tail" aria-hidden />
        <div className={`nova-bubble-inner ${speaking ? "is-speaking" : ""}`} style={nova ? undefined : { borderColor: acc }}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="nova-nameplate" style={nova ? undefined : speaker === "oppy" || speaker === "insight" ? { color: "#04121c", background: acc } : { color: acc }}><span className="nova-dot" />{nova ? "NOVA" : speaker === "spirit" ? "SPIRIT · 2004" : speaker === "oppy" ? "OPPY · 2004" : speaker === "insight" ? "INSIGHT · 2018" : speaker === "eagle" ? "EAGLE · 1969" : speaker === "intrepid" ? "INTREPID · 1969" : speaker === "falcon" ? "FALCON · 1971" : speaker === "challenger" ? "CHALLENGER · 1972" : "SOJOURNER · 1997"}</div>
            <div className="flex items-center gap-1.5">
              {speaking && <div className="nova-wave" aria-hidden><i /><i /><i /><i /></div>}
              {(speaking || !done) && <button onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={skip} title="Skip" className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/30 bg-white/10 hover:bg-white/25">⏩</button>}
              <button onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); bubbleHidden = true; setHidden(true); }} title="Hide" className="text-[11px] font-bold w-6 h-6 rounded-full border border-white/30 bg-white/10 hover:bg-white/25">✕</button>
            </div>
          </div>
          <p className="nova-text min-h-[3.2rem]">{text.slice(0, n)}{!done && <span className="nova-caret" />}</p>
          {hint && done && <div className="text-[10px] tracking-[0.25em] text-white/50 mt-1">{hint} ▸</div>}
        </div>
      </div>
    </div>
  );
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
  const [gallery, setGallery] = useState(false);

  const say = (clip: string, then?: () => void) => {
    setSpeaking(true);
    voice.play(clip, () => { setSpeaking(false); then?.(); });
  };

  useEffect(() => {
    if (!show) return;
    setStep("welcome"); setSeen([]); setActive(null); setWrong(null); setGallery(false);
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
    store.set({ objective: { en: "Follow the orange beacon to Spirit in Gusev Crater", bn: "কমলা আলো ধরে গুসেভ ক্রেটারে স্পিরিটের কাছে যাও" } });
  };

  const topic = TOPICS.find((x) => x.id === active);
  const caption =
    step === "welcome" ? { en: "Hello, new friend! I'm Sojourner! Back in 1997, Earth sent me across the dark space to this red world. I'm only as small as a microwave oven—just 10.5 kilograms! But I was the very first rover to leave tire tracks on Mars. Spin my 3D body around and touch any part to uncover my secrets!", bn: "হ্যালো নতুন বন্ধু! আমি সোজার্নার। ১৯৯৭ সালে পৃথিবী থেকে আমাকে এই লাল গ্রহে পাঠানো হয়েছিল। দেখতে আমি তোমার পড়ার টেবিলের মতো ছোট্ট—মাত্র ১০.৫ কেজি! কিন্তু আমিই প্রথম রোভার যে মঙ্গলে চাকা ফেলেছিল। আমার ৩D শরীরটা ঘুরিয়ে দেখো, আর যেকোনো পার্টসে ছুঁয়ে আমার গোপন ইতিহাস জানো!" }
    : step === "quiz" ? QUIZ.q
    : step === "farewell" ? { en: "Scientists only expected me to survive seven days. But I worked for eighty-three heroic sols! On September 27, 1997, the extreme cold froze our batteries, and silence fell over Ares Vallis. I went to sleep, but I paved the way for every explorer that followed!", bn: "পৃথিবীর বিজ্ঞানীরা ভেবেছিলেন আমি মাত্র ৭ দিন টিকব। কিন্তু আমি বীরের মতো ৮৩ দিন কাজ করেছিলাম! ১৯৯৭ সালের ২৭ সেপ্টেম্বর আমার মাদার-শিপের ব্যাটারি মার্সিয়ান ঠান্ডায় জমে যায়... পৃথিবী থেকে আমার সিগন্যাল থেমে যায়। আমি ঘুমিয়ে গেলেও মানুষকে মঙ্গলের নতুন পথ দেখিয়ে গিয়েছি!" }
    : topic?.text ?? { en: "Tap a question to learn about me. Drag me to spin!", bn: "আমার সম্পর্কে জানতে একটি প্রশ্নে ট্যাপ করো। ঘোরাতে আমাকে টেনে দেখো!" };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:justify-end 2xl:justify-center p-3 pb-40 md:pr-8 bg-black/40 backdrop-blur-[2px]">
      <div className="relative w-[min(440px,96vw)] max-h-[calc(100vh-180px)] overflow-y-auto rounded-[28px] border border-[#ffd97d]/50 bg-[radial-gradient(circle_at_50%_20%,rgba(255,170,90,.18),rgba(12,8,6,.92)_65%)] shadow-[0_0_40px_rgba(255,180,90,.25)] p-4 text-[#ffe9c8]">
        <button onClick={() => { voice.stop(); store.set({ showEncounter: false }); }} className="absolute top-3 right-4 text-xl opacity-70 hover:opacity-100" aria-label="Close">✕</button>
        <div className="text-[10px] tracking-[0.35em] text-[#ffd97d]/80">ARES VALLIS · 1997</div>
        <div className="text-2xl font-bold tracking-wide">SOJOURNER</div>
        <div className="relative mx-auto w-[min(260px,70vw)] mt-1">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffd97d]/40 animate-[spin_30s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,.25),transparent_70%)]" />
          <RoverTurntable />
        </div>
        {gallery && <PhotoGallery lang={lang} onClose={() => setGallery(false)} />}
        {createPortal(<HoloBubble key={t(caption, lang)} speaker="sojourner" text={t(caption, lang)} speaking={speaking} />, document.body)}

        {step === "welcome" && (
          <button onClick={() => { voice.stop(); setStep("explore"); }} className="mt-3 w-full py-3 rounded-full bg-[#ffd97d] text-black font-bold tracking-widest">
            {lang === "bn" ? "চলো জানি! →" : "LET'S EXPLORE →"}
          </button>
        )}

        {step === "explore" && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {TOPICS.map((tp) => (
                <button key={tp.id} onClick={() => { setActive(tp.id); setSeen((s) => (s.includes(tp.id) ? s : [...s, tp.id])); say(tp.id); if (tp.id === "04_photo_gallery") setGallery(true); }}
                  className={`text-left text-xs rounded-2xl px-3 py-2 border transition-all ${active === tp.id ? "bg-[#ffd97d] text-black border-[#ffd97d]" : "bg-white/5 border-white/15 hover:border-[#ffd97d]/70"}`}>
                  <span className="text-lg mr-1">{tp.icon}</span>{t(tp.label, lang)}{seen.includes(tp.id) && active !== tp.id ? " ✓" : ""}
                </button>
              ))}
            </div>
            {active === "07_sojourner_sources" && (
              <div className="mt-3 space-y-2">
                {SOURCES.map((x) => (
                  <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs bg-white/5 border border-[#ffd97d]/40 hover:bg-[#ffd97d]/15">
                    <span className="text-lg">{x.icon}</span><span className="flex-1">{lang === "bn" ? x.bn : x.en}</span><span>↗</span>
                  </a>
                ))}
              </div>
            )}
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
              <button key={o.id} onClick={() => {
                if (o.id === QUIZ.answer) { audio.beep(1200); setStep("farewell"); say("05_sojourner_farewell"); }
                else { audio.beep(300); setWrong(o.id); }
              }} className={`flex-1 rounded-2xl py-3 px-2 font-bold border-2 transition-all ${wrong === o.id ? "border-red-400 text-red-300 animate-pulse" : "border-[#ffd97d] text-[#ffd97d] hover:bg-[#ffd97d] hover:text-black"}`}>
                <div className="text-3xl">{o.icon}</div><div className="text-sm mt-1">{lang === "bn" ? o.bn : o.en}</div>
              </button>
            ))}
          </div>
        )}
        {step === "quiz" && wrong && <div className="text-xs text-center mt-2 opacity-80">{lang === "bn" ? "প্রায় হয়েছে! আমার ছবিগুলোর কথা আবার মনে করো 📸" : "Close! Think about my famous photos again 📸"}</div>}

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
    const k = (e: KeyboardEvent) => { if (store.get().phase !== "explore" && e.code === "Escape" && store.get().bigMap) store.set({ bigMap: false }); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  if (!open) return null;
  return (
    <button onClick={() => store.set({ bigMap: false })} className="absolute top-5 left-5 z-[47] px-4 py-2 rounded-full bg-[#ffd97d] text-black font-bold text-sm shadow-lg">
      ← {lang === "bn" ? "ম্যাপ বন্ধ" : "BACK TO MARS"}
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
  const realLoading = useGame((s) => s.loading);
  const fading = useGame((s) => s.fading);
  const [longFade, setLongFade] = useState(false);
  useEffect(() => {
    if (!fading) { setLongFade(false); return; }
    const id = setTimeout(() => setLongFade(true), 600);
    return () => clearTimeout(id);
  }, [fading]);
  const loading = realLoading || longFade;
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
  const universe = useGame((s) => s.universe);
  if (!visible) return null;
  if (universe === "moon") return <MoonLoader loading={loading} lang={lang} fi={fi} />;
  return (
    <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-[linear-gradient(#1a0c07,#3a170b_70%,#5a2412)] transition-opacity duration-700" style={{ opacity: loading ? 1 : 0 }}>
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

/* ---------- Moon loading screen: Earthrise over a turning Moon ---------- */
const MOON_FACTS: L[] = [
  { en: "Footprints on the Moon can last millions of years — there is no wind!", bn: "চাঁদে পায়ের ছাপ লক্ষ লক্ষ বছর থাকে — সেখানে বাতাস নেই!" },
  { en: "On the Moon you weigh only 1/6 of your Earth weight.", bn: "চাঁদে তোমার ওজন পৃথিবীর মাত্র ছয় ভাগের এক ভাগ।" },
  { en: "12 astronauts walked on the Moon between 1969 and 1972.", bn: "১৯৬৯ থেকে ১৯৭২ সালের মধ্যে ১২ জন নভোচারী চাঁদে হেঁটেছেন।" },
  { en: "Apollo 15 dropped a hammer and a feather — they landed together!", bn: "অ্যাপোলো ১৫ একটা হাতুড়ি আর পালক ফেলেছিল — দুটো একসাথে মাটিতে পড়ে!" },
  { en: "Apollo 17 found orange soil made of tiny volcanic glass beads.", bn: "অ্যাপোলো ১৭ ছোট্ট আগ্নেয় কাচের দানায় তৈরি কমলা মাটি খুঁজে পেয়েছিল।" },
];
function MoonLoader({ loading, lang, fi }: { loading: boolean; lang: "en" | "bn"; fi: number }) {
  return (
    <div className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#1a2233,#05070c_70%)] transition-opacity duration-700" style={{ opacity: loading ? 1 : 0 }}>
      <div className="relative w-56 h-56 rounded-full moon-spin shadow-[0_0_80px_rgba(200,215,255,.3),inset_-40px_-25px_60px_rgba(0,0,0,.8)]"
        style={{ background: "radial-gradient(circle at 30% 30%, #8a8d93 0 6%, transparent 7%), radial-gradient(circle at 65% 55%, #6f7278 0 10%, transparent 11%), radial-gradient(circle at 45% 75%, #7a7d83 0 5%, transparent 6%), radial-gradient(circle at 75% 25%, #85888e 0 4%, transparent 5%), radial-gradient(circle at 40% 40%, #d4d6da, #9a9da3 60%, #5d6066)", backgroundSize: "200% 100%" }} />
      <div className="mt-3 h-1 w-56 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 moon-bar rounded-full bg-gradient-to-r from-[#cfd8e8] to-[#ffd97d]" /></div>
      <div className="text-[#dfe7f5] tracking-[0.4em] text-xs mt-3 animate-pulse">{lang === "bn" ? "চাঁদে অবতরণ করছি…" : "DESCENDING TO THE MOON…"}</div>
      <div className="text-[#cfe0ff] text-sm mt-4 max-w-[340px] text-center px-4 min-h-[40px]">🌕 {t(MOON_FACTS[fi % MOON_FACTS.length]!, lang)}</div>
    </div>
  );
}
