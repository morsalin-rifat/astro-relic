import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { store, useGame, t } from "../state/store";
import { voice } from "../game/voice";
import { audio } from "../game/audio";
import { HoloBubble } from "./MissionUI";

type L = { en: string; bn: string };
type Who = "nova" | "eagle";
const ACC = "#ffd97d";
const IMG = (n: string) => `/images/apollo11/${n}.jpg`;
const V = (c: string) => `apollo11/${c}`;

/* ---------- lines (match the recorded clips word for word) ---------- */
const LINE = {
  arrival: { en: "Bip-boop! We're at the Sea of Tranquility! It's called a sea, but there's not a drop of water, just flat dark ground. See that golden thing far away? Let's go closer!", bn: "বিপ-বুপ! আমরা এখন সি অব ট্র্যাংকুইলিটিতে, মানে শান্তির সাগরে! নাম সাগর হলেও এখানে একফোঁটা পানি নেই, আছে শুধু সমতল কালচে মাটি। দূরে ওই সোনালি জিনিসটা দেখছ? চলো, কাছে যাই!" },
  welcome: { en: "Hello, friend! I'm Eagle, Apollo 11's lunar lander. In 1969, I brought two astronauts to the Moon. Neil and Buzz took their first steps here with my help. Now I stand here alone. Would you like to hear my story?", bn: "হ্যালো বন্ধু! আমি ঈগল, অ্যাপোলো ১১-এর চাঁদের ল্যান্ডার। ১৯৬৯ সালে আমি দুই নভোচারীকে নিয়ে এসেছিলাম এই চাঁদে। নিল আর বাজ আমার সাহায্যেই চাঁদের মাটিতে প্রথম পা রেখেছিলেন। এখন আমি এখানেই একা দাঁড়িয়ে আছি। তুমি কি আমার গল্প জানতে চাও?" },
  reactivate: { en: "Shhh... can you hear it? For fifty-five years, Eagle has stood here alone. No visitors, no sound. But today, you came. It's like Eagle is saying: 'Finally, someone remembered me!'", bn: "শশশ... শুনতে পাচ্ছ? পঞ্চান্ন বছর ধরে এই ঈগল এখানে একা দাঁড়িয়ে আছে। কেউ আসেনি, কোনো শব্দ নেই। কিন্তু আজ তুমি এসেছ। মনে হচ্ছে ঈগল বলছে: 'অবশেষে কেউ আমাকে মনে রেখেছে!'" },
  final_log: { en: "Final log: July twenty-first, nineteen sixty-nine. Humans spent about twenty-one hours on the Moon and walked for two and a half. Eagle's top half flew back to Columbia. Left behind: the descent stage, a flag, footprints, and over a hundred objects. Since then, silence.", bn: "শেষ বার্তা: একুশে জুলাই, উনিশশো উনসত্তর। মানুষ চাঁদে কাটাল প্রায় একুশ ঘণ্টা, হাঁটল আড়াই ঘণ্টা। ঈগলের ওপরের অংশ উড়ে গেল কলাম্বিয়ার কাছে। পেছনে রয়ে গেল ঈগলের নিচের অংশ, একটা পতাকা, পায়ের ছাপ আর একশোর বেশি জিনিস। সেই থেকে, নীরবতা।" },
  heritage: { en: "This place belongs to all humanity! NASA guidelines say future visitors should watch from a distance, so not a single footprint is ruined. Will you be a guardian of this history?", bn: "এই জায়গাটা পুরো মানবজাতির সম্পদ! নাসার নির্দেশিকা বলে, ভবিষ্যতে কেউ এখানে এলে দূর থেকে দেখবে, যাতে একটা পায়ের ছাপও নষ্ট না হয়। তুমি কি এই ইতিহাসের রক্ষী হবে?" },
  correct: { en: "Awesome! That's exactly right, you're a real space scientist!", bn: "দারুণ! একদম ঠিক উত্তর, তুমি তো সত্যিকারের মহাকাশ বিজ্ঞানী!" },
  wrong: { en: "Oops, so close! Think again.", bn: "উঁহু, প্রায় হয়ে গিয়েছিল! আরেকবার ভেবে দেখো।" },
  badge: { en: "Congratulations! You earned the 'Eagle Guardian' badge! You are now the guardian of humanity's first footsteps!", bn: "অভিনন্দন! তুমি পেয়েছ 'ঈগল গার্ডিয়ান' ব্যাজ! মানবজাতির প্রথম পায়ের ছাপের রক্ষী এখন তুমি!" },
  outro: { en: "Goodbye, Eagle! We'll remember you. Next, we'll visit a robot that astronauts actually walked to see! Let's go, Surveyor Three is waiting!", bn: "বিদায়, ঈগল! আমরা তোমাকে মনে রাখব। পরের মিশনে আমরা যাব একটা রোবটের কাছে, যাকে নভোচারীরা নিজেরা হেঁটে দেখতে গিয়েছিলেন! চলো, সার্ভেয়ার থ্রি অপেক্ষা করছে!" },
};

const STORY: { clip: string; img: string; icon: string; year: string; title: L; text: L }[] = [
  { clip: "space_race", img: "kennedy", icon: "🏁", year: "1961", title: { en: "The Space Race", bn: "মহাকাশ দৌড়" }, text: { en: "Long ago, America and the Soviet Union were in a big race: who would reach the Moon first? In nineteen sixty-one, President Kennedy promised to land a human on the Moon before the decade ended!", bn: "অনেক বছর আগে আমেরিকা আর সোভিয়েত ইউনিয়নের মধ্যে একটা বড় প্রতিযোগিতা চলছিল: কে আগে চাঁদে পৌঁছাবে! উনিশশো একষট্টি সালে প্রেসিডেন্ট কেনেডি বললেন, এই দশকের মধ্যেই আমরা মানুষকে চাঁদে পাঠাব!" } },
  { clip: "crew", img: "crew", icon: "👨‍🚀", year: "1969", title: { en: "Three Heroes", bn: "তিন নভোচারী" }, text: { en: "The crew had three heroes. Neil Armstrong was the commander. Buzz Aldrin flew the lander called Eagle. And Michael Collins circled the Moon in the ship called Columbia, keeping watch.", bn: "দলে ছিলেন তিনজন বীর। নিল আর্মস্ট্রং ছিলেন দলের নেতা। বাজ অলড্রিন চালাতেন ঈগল নামের ল্যান্ডার। আর মাইকেল কলিন্স কলাম্বিয়া নামের যানে চাঁদের চারপাশে ঘুরে পাহারা দিতেন।" } },
  { clip: "launch", img: "launch", icon: "🚀", year: "16 Jul 1969", title: { en: "Blast Off!", bn: "উৎক্ষেপণ" }, text: { en: "On July sixteenth, nineteen sixty-nine, the giant Saturn Five rocket blasted off! It was as tall as a thirty-six-story building, and its roar shook the ground for miles!", bn: "উনিশশো উনসত্তরের ষোলোই জুলাই, বিশাল স্যাটার্ন ফাইভ রকেট আকাশে উঠল! এটা ছিল ছত্রিশতলা বিল্ডিংয়ের সমান উঁচু, আর এর গর্জনে মাইলের পর মাইল মাটি কেঁপে উঠেছিল!" } },
  { clip: "journey", img: "journey", icon: "🌍", year: "3 days", title: { en: "The Journey", bn: "যাত্রা" }, text: { en: "It took three days to reach the Moon, almost four hundred thousand kilometers! Through the window, Earth shrank into a small blue ball.", bn: "চাঁদে পৌঁছাতে তাঁদের লেগেছিল তিন দিন। পাড়ি দিতে হয়েছিল প্রায় চার লাখ কিলোমিটার! জানালা দিয়ে পৃথিবীটা ছোট হতে হতে একসময় একটা নীল বলের মতো হয়ে গেল।" } },
  { clip: "landing", img: "descent", icon: "🚨", year: "1202!", title: { en: "A Scary Landing", bn: "রোমাঞ্চকর অবতরণ" }, text: { en: "During landing, the computer alarm went off: one-two-zero-two! And below were giant boulders! Neil took control by hand and found a safe spot, with fuel almost gone!", bn: "নামার সময় হঠাৎ কম্পিউটারে অ্যালার্ম বাজল, ওয়ান-টু-জিরো-টু! তার ওপর নিচে বড় বড় পাথর! নিল নিজের হাতে ঈগলকে চালিয়ে একটা নিরাপদ জায়গা খুঁজে বের করলেন। ততক্ষণে জ্বালানি প্রায় শেষ হয়ে এসেছিল!" } },
  { clip: "eagle_landed", img: "aldrin", icon: "🦅", year: "20 Jul 1969", title: { en: "The Eagle Has Landed", bn: "ঈগল নেমেছে!" }, text: { en: "Then Neil radioed: 'Houston, Tranquility Base here. The Eagle has landed!' Everyone on Earth cheered!", bn: "তারপর নিল রেডিওতে বললেন: 'হিউস্টন, ট্র্যাংকুইলিটি বেস হিয়ার। দ্য ঈগল হ্যাজ ল্যান্ডেড!' পৃথিবীতে সবাই আনন্দে লাফিয়ে উঠল!" } },
];

type Spot = { id: string; clip: string; img?: string; icon: string; name: L; text: L; fact: L };
const SPOTS: Spot[] = [
  { id: "lm", clip: "spot_descent_stage", img: "descent", icon: "✨", name: { en: "Eagle's Golden Cradle", bn: "ঈগলের সোনালি দোলনা" }, fact: { en: "Not real gold: special foil!", bn: "আসল সোনা নয়, বিশেষ ফয়েল!" }, text: { en: "This is Eagle's lower half, the four-legged golden cradle! The shiny wrap isn't real gold, it's special foil that protects against burning sun and freezing cold. When leaving, the top half used it as a launch pad and flew away. So this part stayed behind.", bn: "এটাই ঈগলের নিচের অংশ, চারপেয়ে সোনালি দোলনা! চকচকে মোড়কটা আসলে সোনা নয়, বিশেষ এক ফয়েল, যা প্রচণ্ড রোদ আর ঠান্ডা থেকে বাঁচায়। ফেরার সময় ঈগলের ওপরের অংশ এটাকে লঞ্চপ্যাড বানিয়ে উড়ে গিয়েছিল। তাই নিচের অংশটা এখানেই রয়ে গেছে।" } },
  { id: "plaque", clip: "spot_plaque", img: "plaque", icon: "🪧", name: { en: "The Peace Plaque", bn: "শান্তির ফলক" }, fact: { en: "\"We came in peace for all mankind\"", bn: "\"আমরা এসেছিলাম শান্তি নিয়ে\"" }, text: { en: "A plaque is attached to one leg. It says: 'Here men from the planet Earth first set foot upon the Moon, July nineteen sixty-nine. We came in peace for all mankind.'", bn: "এক পায়ে একটা ফলক লাগানো আছে। তাতে লেখা: 'এখানে পৃথিবী গ্রহের মানুষ প্রথম চাঁদে পা রেখেছিল, জুলাই উনিশশো উনসত্তর। আমরা এসেছিলাম পুরো মানবজাতির জন্য, শান্তি নিয়ে।'" } },
  { id: "flag", clip: "spot_flag", img: "flag", icon: "🚩", name: { en: "The Flag", bn: "পতাকা" }, fact: { en: "No wind, so a rod holds it open", bn: "বাতাস নেই, তাই লাঠি দিয়ে খোলা" }, text: { en: "There's no wind on the Moon, so a rod was added on top to keep the flag spread out! But when Eagle took off, the rocket blast knocked it over. Buzz Aldrin saw it fall.", bn: "চাঁদে বাতাস নেই, তাই পতাকা উড়বে না। এজন্য ওপরে একটা লাঠি লাগানো হয়েছিল, যাতে পতাকাটা খোলা থাকে! কিন্তু ঈগল উড়ে যাওয়ার সময় রকেটের ধাক্কায় পতাকাটা পড়ে যায়, বাজ অলড্রিন নিজের চোখে দেখেছিলেন।" } },
  { id: "boot", clip: "spot_footprin", img: "bootprint", icon: "👣", name: { en: "The Famous Bootprint", bn: "বিখ্যাত পায়ের ছাপ" }, fact: { en: "Could last millions of years!", bn: "লাখ লাখ বছর টিকে থাকবে!" }, text: { en: "This is Buzz Aldrin's famous bootprint! Moon dust is sharp like crushed glass, so prints stay crisp. With no wind or rain, it could last millions of years!", bn: "এটা বাজ অলড্রিনের বুটের বিখ্যাত ছাপ! চাঁদের ধুলো গুঁড়ো কাঁচের মতো খসখসে, তাই ছাপটা খুব স্পষ্ট বসে গেছে। আর বাতাস বা বৃষ্টি নেই বলে এই ছাপ লাখ লাখ বছর থেকে যাবে!" } },
  { id: "lrrr", clip: "spot_laser_reflector", img: "laser", icon: "🔦", name: { en: "The Laser Mirror", bn: "লেজার আয়না" }, fact: { en: "Moon moves ~4 cm away every year", bn: "চাঁদ প্রতি বছর ~৪ সেমি দূরে সরে" }, text: { en: "This little box holds one hundred special mirrors! Scientists on Earth shoot lasers at it, and the light returns in about two and a half seconds. That's how we learned the Moon drifts about four centimeters away every year! It still works today!", bn: "এই ছোট্ট বাক্সে একশোটা বিশেষ আয়না আছে! পৃথিবী থেকে বিজ্ঞানীরা এর দিকে লেজার ছোড়েন, আর আলো ফিরে আসতে আড়াই সেকেন্ডের মতো লাগে। এভাবেই জানা গেছে, চাঁদ প্রতি বছর প্রায় চার সেন্টিমিটার করে আমাদের থেকে দূরে সরে যাচ্ছে! এই আয়না আজও কাজ করে!" } },
  { id: "psep", clip: "spot_seismomete", img: "seismo", icon: "📈", name: { en: "The Moonquake Meter", bn: "কম্পন মাপার যন্ত্র" }, fact: { en: "It heard the astronauts' footsteps!", bn: "নভোচারীদের পায়ের শব্দও শুনেছিল!" }, text: { en: "This measured moonquakes, powered by sunlight! It even picked up the astronauts' footsteps! After a few weeks it went silent, and now it stands alone.", bn: "এটা চাঁদের কম্পন মাপার যন্ত্র, চলত সূর্যের আলোয়! এটা নভোচারীদের পায়ের ধুপধাপ শব্দও ধরে ফেলেছিল! কয়েক সপ্তাহ পর এটা চুপ হয়ে যায়, এখন শুধু একা দাঁড়িয়ে আছে।" } },
  { id: "memorial", clip: "spot_memorial", icon: "🕊️", name: { en: "The Secret Memorial", bn: "গোপন স্মৃতিচিহ্ন" }, fact: { en: "Messages from 73 nations", bn: "৭৩ দেশের শুভেচ্ছা বার্তা" }, text: { en: "In a small bag here: a golden olive branch, the symbol of peace, memorials for fallen space explorers, and a tiny silicon disc with goodwill messages from seventy-three nations!", bn: "এখানে ছোট্ট একটা থলেতে রাখা আছে সোনার জলপাই পাতা, শান্তির প্রতীক। আছে মারা যাওয়া মহাকাশচারীদের স্মৃতিচিহ্ন, আর একটা ছোট্ট সিলিকন চাকতি। চাকতিতে তিয়াত্তরটা দেশের নেতাদের শুভেচ্ছা বার্তা লেখা!" } },
];

const TECH: { clip: string; icon: string; img?: string; title: L; text: L }[] = [
  { clip: "tech_computer", icon: "💻", title: { en: "Fun fact: the computer", bn: "মজার তথ্য: কম্পিউটার" }, text: { en: "Imagine! Apollo's computer was hundreds of thousands of times weaker than your phone! Its memory was hand-woven from copper wire. And Margaret Hamilton led the team that wrote its software!", bn: "ভাবো তো! অ্যাপোলোর কম্পিউটারের শক্তি তোমার হাতের মোবাইলের চেয়ে লাখো গুণ কম ছিল! মেমোরিটা তামার তার দিয়ে হাতে বুনে বানানো হয়েছিল। আর এর প্রোগ্রাম লেখার দলের নেতা ছিলেন মার্গারেট হ্যামিল্টন!" } },
  { clip: "tech_spacesuit", icon: "🧑‍🚀", img: "aldrin", title: { en: "Fun fact: the spacesuit", bn: "মজার তথ্য: স্পেসস্যুট" }, text: { en: "The spacesuit had twenty-one layers, like a tiny spaceship! The backpack carried oxygen and cooling water. On the Moon, sunlight is over a hundred degrees hot, and shadow is colder than minus one hundred!", bn: "নভোচারীদের স্যুট ছিল একুশ স্তরের, যেন একটা ছোট্ট মহাকাশযান! পিঠের ব্যাগে ছিল অক্সিজেন আর ঠান্ডা পানি। চাঁদে রোদে একশো ডিগ্রির বেশি গরম, আর ছায়ায় মাইনাস একশো ডিগ্রির বেশি ঠান্ডা!" } },
  { clip: "tech_moon_rocks", icon: "🪨", img: "rocks", title: { en: "Fun fact: Moon rocks", bn: "মজার তথ্য: চাঁদের পাথর" }, text: { en: "The astronauts brought back about twenty-one kilograms of Moon rocks and dust. They taught us the Moon formed about four and a half billion years ago!", bn: "নভোচারীরা প্রায় একুশ কেজি চাঁদের পাথর আর ধুলো পৃথিবীতে নিয়ে গিয়েছিলেন। সেগুলো থেকে জানা গেছে, চাঁদ তৈরি হয়েছে প্রায় সাড়ে চারশো কোটি বছর আগে!" } },
];

const QUIZ: { clip: string; q: L; opts: { icon: string; t: L; ok?: boolean }[]; hint: L }[] = [
  { clip: "quiz_1", q: { en: "Who first stepped on the Moon?", bn: "চাঁদে প্রথম পা রেখেছিলেন কে?" }, hint: { en: "He was the commander!", bn: "উনি ছিলেন দলের নেতা!" },
    opts: [{ icon: "🧑‍🚀", t: { en: "Buzz Aldrin", bn: "বাজ অলড্রিন" } }, { icon: "👨‍🚀", t: { en: "Neil Armstrong", bn: "নিল আর্মস্ট্রং" }, ok: true }, { icon: "🛰️", t: { en: "Michael Collins", bn: "মাইকেল কলিন্স" } }] },
  { clip: "quiz_2", q: { en: "What did the laser mirror teach us?", bn: "চাঁদে রাখা লেজার আয়না আমাদের কী শিখিয়েছে?" }, hint: { en: "Remember the 4 centimeters!", bn: "৪ সেন্টিমিটারের কথা মনে করো!" },
    opts: [{ icon: "💧", t: { en: "There is water on the Moon", bn: "চাঁদে পানি আছে" } }, { icon: "🛑", t: { en: "The Moon doesn't spin", bn: "চাঁদ ঘোরে না" } }, { icon: "↔️", t: { en: "The Moon moves a little farther away each year", bn: "চাঁদ প্রতি বছর একটু একটু করে দূরে সরছে" }, ok: true }] },
  { clip: "quiz_3", q: { en: "Why do footprints last on the Moon?", bn: "চাঁদে পায়ের ছাপ এত বছর টিকে থাকে কেন?" }, hint: { en: "What's missing on the Moon's sky?", bn: "চাঁদের আকাশে কী নেই?" },
    opts: [{ icon: "🌬️", t: { en: "No wind and no rain", bn: "বাতাস আর বৃষ্টি নেই" }, ok: true }, { icon: "🧱", t: { en: "The ground is very hard", bn: "মাটি খুব শক্ত" } }, { icon: "🧴", t: { en: "Astronauts used glue", bn: "নভোচারীরা আঠা দিয়েছিলেন" } }] },
];

type Stage = "idle" | "go" | "welcome" | "story" | "hunt" | "spot" | "return" | "memory" | "log" | "pledge" | "quiz" | "badge" | "done";
const SPOT_IDS = SPOTS.map((s) => s.id);

export function Apollo11Mission() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const near = useGame((s) => s.moonNear);
  const [stage, setStage] = useState<Stage>("idle");
  const [line, setLine] = useState<{ who: Who; text: L } | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [slide, setSlide] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [tech, setTech] = useState<(typeof TECH)[number] | null>(null);
  const [laser, setLaser] = useState<"ready" | "fire" | "done">("ready");
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [right, setRight] = useState(false);
  const techIdx = useRef(0);
  const museum = useRef(false);
  const stageRef = useRef(stage); stageRef.current = stage;

  const say = (clip: string | null, text: L, who: Who = "nova", then?: () => void) => {
    setLine({ who, text });
    if (!clip) { setSpeaking(false); voice.stop(); then?.(); return; }
    setSpeaking(true);
    voice.play(V(clip), () => { setSpeaking(false); then?.(); });
  };
  const hush = () => { voice.stop(); setSpeaking(false); };
  const freeze = (f: boolean) => store.set({ moonFreeze: f });
  const objective = (o: L) => store.set({ objective: o });

  // arrival at Tranquility Base
  useEffect(() => store.on("a11:arrive", () => {
    setSeen([]); setSlide(0); setQi(0); setSpot(null); setTech(null); setLaser("ready");
    setStage("go");
    objective({ en: "🦅 Walk to the shiny golden lander — Eagle!", bn: "🦅 চকচকে সোনালি ল্যান্ডার — ঈগলের কাছে হেঁটে যাও!" });
    window.setTimeout(() => say("arrival", LINE.arrival), 600);
  }), []);
  // already finished: open "museum" mode so Eagle & relics stay explorable / replayable
  useEffect(() => store.on("a11:revisit", () => { setStage("done"); museum.current = true; }), []);
  useEffect(() => { if (phase !== "moon") { setStage("idle"); setLine(null); hush(); freeze(false); } }, [phase]);

  // what the [E] button would do right now
  const action: { label: L; run: () => void } | null = (() => {
    if (phase !== "moon" || !near) return null;
    if (stage === "go" && (near === "lm" || near === "plaque")) return { label: { en: "Meet Eagle", bn: "ঈগলের সাথে কথা বলো" }, run: () => { freeze(true); setStage("welcome"); say("welcome", LINE.welcome, "eagle"); } };
    if (stage === "hunt" && !seen.includes(near)) {
      const s = SPOTS.find((x) => x.id === near); if (!s) return null;
      return { label: { en: `Inspect: ${s.name.en}`, bn: `দেখো: ${s.name.bn}` }, run: () => openSpot(s) };
    }
    if (stage === "done" && (near === "lm" || near === "plaque")) return { label: { en: "🔄 Replay with Eagle", bn: "🔄 ঈগলের সাথে আবার খেলো" }, run: () => {
      museum.current = false; setSeen([]); setSlide(0); setQi(0); setSpot(null); setTech(null); setLaser("ready"); techIdx.current = 0;
      freeze(true); setStage("welcome"); say("welcome", LINE.welcome, "eagle"); } };
    if (stage === "done") { const s = SPOTS.find((x) => x.id === near); if (s) return { label: { en: `Look again: ${s.name.en}`, bn: `আবার দেখো: ${s.name.bn}` }, run: () => { museum.current = true; openSpot(s); } }; }
    if (stage === "return" && (near === "lm" || near === "plaque")) return { label: { en: "Touch the plaque", bn: "ফলকটা ছুঁয়ে দেখো" }, run: () => { freeze(true); setStage("memory"); audio.beep(520); say("reactivate", LINE.reactivate, "nova", () => setStage((s) => (s === "memory" ? "log" : s))); } };
    return null;
  })();
  const actRef = useRef(action); actRef.current = action;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "KeyE" && actRef.current) { e.preventDefault(); actRef.current.run(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const openSpot = (s: Spot) => {
    freeze(true); setSpot(s); setStage("spot"); setLaser("ready"); setTech(null); audio.beep(1100);
    say(s.clip, s.text, s.id === "lm" ? "eagle" : "nova");
  };
  const huntObjective = (n: number) => objective({ en: `🔍 Find the ${7 - n} golden stars around Eagle (${n}/7)`, bn: `🔍 ঈগলের চারপাশে ${7 - n}টি সোনালি তারা খোঁজো (${n}/7)` });
  const closeSpot = () => {
    if (!spot) return;
    if (museum.current) { setSpot(null); hush(); freeze(false); setLine(null); setStage("done"); return; }
    const n = seen.includes(spot.id) ? seen : [...seen, spot.id];
    setSeen(n); setSpot(null); hush(); freeze(false);
    if (n.length >= 7) {
      setStage("return");
      objective({ en: "✨ All found! Go back to Eagle and touch the plaque", bn: "✨ সব পেয়েছো! ঈগলের কাছে ফিরে ফলকটা ছুঁয়ে দেখো" });
      say(null, { en: "You found every treasure! Now go back to Eagle and touch the plaque on its leg.", bn: "তুমি সব গুপ্তধন খুঁজে পেয়েছো! এবার ঈগলের কাছে ফিরে ওর পায়ের ফলকটা ছুঁয়ে দেখো।" });
      return;
    }
    setStage("hunt"); huntObjective(n.length);
    if (n.length % 2 === 0 && techIdx.current < TECH.length) { // Nova pops a fun fact while you walk
      const f = TECH[techIdx.current++]!; setTech(f); say(f.clip, f.text, "nova", () => window.setTimeout(() => setTech((x) => (x === f ? null : x)), 2500));
    } else setLine(null);
  };

  const startHunt = () => { hush(); setStage("hunt"); freeze(false); huntObjective(seen.length); say(null, { en: "Look for the glowing golden stars on your mini-map. Walk close and press the big button!", bn: "মিনি-ম্যাপে সোনালি তারাগুলো দেখো। কাছে গিয়ে বড় বাটনটা চাপো!" }); };
  const nextSlide = () => {
    audio.beep(900);
    if (slide + 1 >= STORY.length) { startHunt(); return; }
    const n = slide + 1; setSlide(n); say(STORY[n]!.clip, STORY[n]!.text);
  };
  const answer = (i: number) => {
    const q = QUIZ[qi]!; if (right) return;
    if (q.opts[i]!.ok) {
      audio.beep(1320); setRight(true); setWrong(null); say(null, LINE.correct);
      window.setTimeout(() => {
        setRight(false);
        if (qi + 1 < QUIZ.length) { setQi(qi + 1); say(QUIZ[qi + 1]!.clip, QUIZ[qi + 1]!.q); }
        else win();
      }, 1600);
    } else { audio.beep(260); setWrong(i); say(null, LINE.wrong); }
  };
  const win = () => {
    setStage("badge"); audio.beep(1500);
    store.set({ flags: Array.from(new Set([...store.get().flags, "apollo11"])) });
    store.awardBadge("eagle-guardian");
    say("badge", LINE.badge, "nova", () => say("outro", LINE.outro));
  };
  const finish = (hub: boolean) => {
    hush(); setStage("done"); museum.current = true; setLine(null); freeze(false);
    if (hub) { store.emit("engine:goto", "hub"); return; }
    objective({ en: "🚶 Walk south through the glowing pass to Apollo 12 & Surveyor 3", bn: "🚶 আলো জ্বলা দক্ষিণের গিরিপথ দিয়ে অ্যাপোলো ১২ ও সার্ভেয়ার ৩-এ যাও" });
  };

  useEffect(() => { store.emit("a11:stars", stage === "hunt" || stage === "spot" ? SPOT_IDS.filter((id) => !seen.includes(id)) : []); }, [stage, seen]);

  if (phase !== "moon" || stage === "idle") return null;

  const btn = "w-full py-3 rounded-full text-black font-bold tracking-widest text-sm active:scale-95 transition-transform";
  const card = (children: React.ReactNode, wide = false) => (
    <div className="absolute inset-0 z-50 flex items-start justify-center md:items-center md:justify-end p-3 pt-16 pb-44 md:pb-3 md:pr-8 bg-black/45 backdrop-blur-[2px] pointer-events-auto">
      <div className={`relative ${wide ? "w-[min(520px,96vw)]" : "w-[min(440px,96vw)]"} max-h-[calc(100vh-240px)] md:max-h-[88vh] overflow-y-auto rounded-[28px] border bg-[radial-gradient(circle_at_50%_0%,rgba(255,217,125,.18),rgba(8,10,16,.95)_60%)] shadow-[0_0_40px_rgba(255,217,125,.25)] p-4 text-[#f3ecda] animate-[hubrise_0.4s_ease]`} style={{ borderColor: `${ACC}88` }}>
        {children}
      </div>
    </div>
  );
  const head = (top: string, title: string) => (<><div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>{top}</div><div className="text-xl sm:text-2xl font-bold tracking-wide mb-2">{title}</div></>);
  const photo = (src: string, alt: string, extra?: React.ReactNode) => (
    <div className="relative rounded-2xl overflow-hidden border bg-black aspect-[4/3]" style={{ borderColor: `${ACC}55` }}>
      <img key={src} src={src} alt={alt} className="w-full h-full object-cover animate-[hubrise_0.5s_ease]" />
      <div className="absolute bottom-1.5 right-2 text-[9px] bg-black/60 px-2 py-0.5 rounded-full opacity-80">NASA</div>
      {extra}
    </div>
  );
  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);

  return (
    <>
      {line && createPortal(<HoloBubble key={line.who + t(line.text, lang)} speaker={line.who} text={t(line.text, lang)} speaking={speaking} />, document.body)}

      {/* hunt checklist */}
      {(stage === "hunt" || stage === "spot") && (
        <div className="absolute z-40 top-[118px] left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/55 border border-white/15 px-3 py-1.5 pointer-events-none">
          {SPOTS.map((s) => <span key={s.id} title={t(s.name, lang)} className={`text-base sm:text-lg transition-all ${seen.includes(s.id) ? "" : "grayscale opacity-35"}`}>{seen.includes(s.id) ? s.icon : "⭐"}</span>)}
        </div>
      )}

      {/* fun-fact picture while walking */}
      {tech && stage === "hunt" && (
        <div className="absolute z-40 right-3 bottom-48 md:bottom-auto md:top-[40%] w-[min(220px,45vw)] rounded-2xl border bg-black/80 p-2 pointer-events-auto animate-[hubrise_0.4s_ease]" style={{ borderColor: `${ACC}88` }} onClick={() => { hush(); setTech(null); }}>
          {tech.img ? <img src={IMG(tech.img)} alt="" className="w-full aspect-[4/3] object-cover rounded-xl" /> : <div className="w-full aspect-[4/3] rounded-xl flex items-center justify-center text-6xl bg-[#ffd97d]/10">{tech.icon}</div>}
          <div className="text-xs font-bold mt-1.5" style={{ color: ACC }}>{tech.icon} {t(tech.title, lang)}</div>
        </div>
      )}

      {/* big action button */}
      {action && !["welcome", "story", "spot", "memory", "log", "pledge", "quiz", "badge"].includes(stage) && (
        <button onClick={action.run} className="absolute z-[57] left-1/2 -translate-x-1/2 bottom-28 md:bottom-16 flex items-center gap-2 rounded-full px-6 py-3.5 text-black font-bold text-sm sm:text-base shadow-[0_0_30px_rgba(255,217,125,.7)] animate-bounce pointer-events-auto" style={{ background: ACC }}>
          <span className="hidden md:inline-flex w-7 h-7 rounded-md bg-black/80 text-[#ffd97d] items-center justify-center text-xs">E</span>
          {t(action.label, lang)} 👆
        </button>
      )}

      {stage === "welcome" && card(<>
        {head("TRANQUILITY BASE · 1969", B("EAGLE · The Golden Cradle", "ঈগল · সোনালি দোলনা"))}
        {photo(IMG("descent"), "Eagle lunar module")}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] mt-3">
          {[["2", B("astronauts landed", "নভোচারী নেমেছিলেন")], ["21.5 h", B("on the Moon", "চাঁদে ছিলেন")], ["55+", B("years alone", "বছর একা")]].map(([a, b]) => (
            <div key={a} className="rounded-xl bg-white/5 border border-white/10 py-1.5"><div className="font-bold text-sm" style={{ color: ACC }}>{a}</div><div className="opacity-70">{b}</div></div>))}
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("story"); setSlide(0); say(STORY[0]!.clip, STORY[0]!.text); }}>📜 {B("YES! TELL ME YOUR STORY", "হ্যাঁ! তোমার গল্প বলো")}</button>
      </>)}

      {stage === "story" && card(<>
        {head(`${B("CHAPTER", "পর্ব")} ${slide + 1}/${STORY.length} · ${STORY[slide]!.year}`, `${STORY[slide]!.icon} ${t(STORY[slide]!.title, lang)}`)}
        {photo(IMG(STORY[slide]!.img), t(STORY[slide]!.title, lang), slide === 4 ? <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-mono font-bold animate-pulse">⚠ PROG ALARM 1202</div> : null)}
        <div className="flex justify-center gap-1.5 mt-3">{STORY.map((_, k) => <span key={k} className="h-2 rounded-full transition-all" style={{ width: k === slide ? 22 : 8, background: k <= slide ? ACC : "rgba(255,255,255,.25)" }} />)}</div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={nextSlide}>{slide + 1 >= STORY.length ? `🔍 ${B("LET'S EXPLORE!", "চলো ঘুরে দেখি!")}` : `${B("NEXT", "পরেরটা")} →`}</button>
      </>)}

      {stage === "spot" && spot && card(<>
        {head(`${B("TREASURE", "গুপ্তধন")} ${seen.length + 1}/7`, `${spot.icon} ${t(spot.name, lang)}`)}
        {spot.id === "lrrr" ? <LaserGame lang={lang} state={laser} onFire={() => { setLaser("fire"); audio.beep(1800); window.setTimeout(() => { setLaser("done"); audio.beep(1200); }, 2600); }} />
          : spot.img ? photo(IMG(spot.img), t(spot.name, lang))
          : <div className="rounded-2xl aspect-[4/3] border flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle,rgba(255,217,125,.25),transparent_70%)]" style={{ borderColor: `${ACC}55` }}><div className="text-7xl animate-float-gentle">🕊️</div><div className="text-[11px] opacity-80">🫒 · 🏅 · 💿</div></div>}
        <div className="mt-3 rounded-2xl px-3 py-2 text-sm font-bold text-center" style={{ background: `${ACC}22`, color: ACC }}>💡 {t(spot.fact, lang)}</div>
        <button disabled={spot.id === "lrrr" && laser !== "done"} className={`${btn} mt-3 disabled:opacity-30`} style={{ background: ACC }} onClick={closeSpot}>
          {spot.id === "lrrr" && laser !== "done" ? B("Fire the laser first! 🔴", "আগে লেজার ছোড়ো! 🔴") : `✅ ${B("GOT IT!", "বুঝেছি!")}`}
        </button>
      </>)}

      {(stage === "memory" || stage === "log") && card(<>
        {head("FINAL TRANSMISSION · 21 JUL 1969", B("Waking up Eagle's memory", "ঈগলের স্মৃতি জাগানো"))}
        {photo(IMG(stage === "log" ? "landing" : "plaque"), "", <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,217,125,.45),transparent_60%)] animate-pulse mix-blend-screen" />)}
        {stage === "log"
          ? <div className="mt-3 rounded-xl bg-black/70 border border-[#7dffb0]/40 p-3 font-mono text-[12px] leading-relaxed text-[#9dffc4]"><TypeLog key={lang} text={t(LINE.final_log, lang)} onStart={() => say("final_log", LINE.final_log)} /></div>
          : <div className="mt-3 text-center text-xs tracking-[0.3em] animate-pulse" style={{ color: ACC }}>📻 ··· KSHHH ··· 📻</div>}
        {stage === "log" && <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { setStage("pledge"); say(null, LINE.heritage); }}>🛡️ {B("NEXT", "পরেরটা")} →</button>}
      </>)}

      {stage === "pledge" && card(<>
        {head("NASA HERITAGE · " + B("PROTECT THE PAST", "ইতিহাস রক্ষা"), B("Will you be a guardian?", "তুমি কি রক্ষী হবে?"))}
        {photo(IMG("bootprint"), "Bootprint")}
        <ul className="mt-3 space-y-1.5 text-sm">
          {[["👀", B("Watch from far away", "দূর থেকে দেখবো")], ["👣", B("Never step on the old footprints", "পুরনো পায়ের ছাপে পা দেবো না")], ["🤝", B("This place belongs to everyone", "এই জায়গা সবার")]].map(([i, x]) => <li key={x} className="flex gap-2 rounded-xl bg-white/5 px-3 py-2"><span>{i}</span>{x}</li>)}
        </ul>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => { audio.beep(1300); setStage("quiz"); setQi(0); setWrong(null); say(QUIZ[0]!.clip, QUIZ[0]!.q); }}>✋ {B("I PROMISE! START THE QUIZ", "আমি কথা দিচ্ছি! কুইজ শুরু")}</button>
      </>)}

      {stage === "quiz" && card(<>
        {head(`${B("QUIZ", "কুইজ")} ${qi + 1}/3`, t(QUIZ[qi]!.q, lang))}
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
          <div className="text-[10px] tracking-[0.35em]" style={{ color: `${ACC}cc` }}>MISSION 01 · {B("COMPLETE", "সম্পন্ন")}</div>
          <div className="mx-auto mt-3 w-32 h-32 rounded-full flex items-center justify-center text-7xl border-4 shadow-[0_0_50px_rgba(255,217,125,.6)] animate-float-gentle" style={{ borderColor: ACC, background: "radial-gradient(circle,#5a4310,#120d03)" }}>🦅</div>
          <div className="text-2xl font-bold mt-3" style={{ color: ACC }}>{B("EAGLE GUARDIAN", "ঈগল গার্ডিয়ান")}</div>
          <div className="text-xs opacity-75 mt-1">{B("Guardian of humanity's first footsteps", "মানবজাতির প্রথম পায়ের ছাপের রক্ষী")}</div>
        </div>
        <button className={`${btn} mt-3`} style={{ background: ACC }} onClick={() => finish(false)}>🚶 {B("WALK TO ZONE 2 · SURVEYOR 3", "জোন ২-এ চলো · সার্ভেয়ার ৩")}</button>
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

function LaserGame({ lang, state, onFire }: { lang: "en" | "bn"; state: "ready" | "fire" | "done"; onFire: () => void }) {
  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);
  return (
    <div className="relative rounded-2xl overflow-hidden border aspect-[4/3] bg-[radial-gradient(circle_at_50%_120%,#3a3a3a,#000_60%)]" style={{ borderColor: `${ACC}55` }}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-5xl">🌍</div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-4xl">🪞</div>
      {state === "fire" && <div className="absolute left-1/2 top-16 bottom-14 w-1 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_14px_4px_rgba(255,40,40,.8)] animate-pulse" />}
      <div className="absolute inset-x-0 bottom-16 text-center">
        {state === "ready" && <button onClick={onFire} className="px-5 py-2.5 rounded-full bg-red-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(255,60,60,.8)] animate-bounce">🔴 {B("FIRE THE LASER!", "লেজার ছোড়ো!")}</button>}
        {state === "fire" && <div className="text-red-300 font-mono text-sm animate-pulse">⏱ {B("light travelling...", "আলো যাচ্ছে-আসছে...")}</div>}
        {state === "done" && <div className="mx-auto w-fit rounded-xl bg-black/70 px-3 py-1.5 font-mono text-xs text-green-300">✅ 2.5 s {B("round trip · ~384,400 km away", "ঘুরে এলো · দূরত্ব ~৩,৮৪,৪০০ কিমি")}</div>}
      </div>
    </div>
  );
}
