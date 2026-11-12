import type { DialogueLine } from "../state/store";

export const UI = {
  tagline1: { en: "Abandoned but Not Forgotten", bn: "পরিত্যক্ত, কিন্তু ভোলা হয়নি" },
  tagline2: { en: "Every machine has a mission.", bn: "প্রতিটি যন্ত্রের একটি মিশন আছে।" },
  tagline3: { en: "Every mission leaves a story.", bn: "প্রতিটি মিশন রেখে যায় একটি গল্প।" },
  cta: { en: "START ADVENTURE", bn: "মহাকাশ যাত্রা শুরু" },
  ctaSub: { en: "Explore • Discover • Remember", bn: "অন্বেষণ • আবিষ্কার • স্মরণ" },
  badge: {
    en: "A NASA SPACE APPS STORY ADVENTURE",
    bn: "একটি নাসা স্পেস অ্যাপস গল্প-অ্যাডভেঞ্চার",
  },
  starHint: { en: "Move your mouse — the stars will play!", bn: "মাউস নাড়াও — তারাগুলো খেলবে!" },
  loading: { en: "CALIBRATING DEEP SPACE ARRAY…", bn: "মহাশূন্য যন্ত্রপাতি প্রস্তুত হচ্ছে…" },
  langBtn: { en: "বাংলা", bn: "EN" },
  objectiveExplore: {
    en: "Follow the beacon. Find the old machine.",
    bn: "বিকনের আলো অনুসরণ করুন। পুরনো যন্ত্রটিকে খুঁজে বের করুন।",
  },
  hearStory: { en: "HEAR MY STORY", bn: "আমার গল্প শুনুন" },
  inspectBtn: { en: "INSPECT MY HARDWARE", bn: "আমার যন্ত্রাংশ দেখুন" },
  continueBtn: { en: "CONTINUE", bn: "এগিয়ে যান" },
  chapterComplete: { en: "CHAPTER COMPLETE", bn: "অধ্যায় সম্পন্ন" },
  nextChapter: { en: "NEXT CHAPTER", bn: "পরের অধ্যায়" },
  marsJourney: { en: "MARS JOURNEY", bn: "মঙ্গল যাত্রা" },
  backToSolar: { en: "RETURN TO SOLAR SYSTEM", bn: "সৌরজগতে ফিরে যান" },
  replay: { en: "REPLAY CHAPTER", bn: "আবার খেলুন" },
  locked: { en: "LOCKED", bn: "বন্ধ" },
  comingSoon: { en: "Unlocks after the Mars journey", bn: "মঙ্গল যাত্রার পর খুলবে" },
  completeFirst: { en: "Complete the previous mission first", bn: "আগে আগের মিশনটি সম্পন্ন করুন" },
  mars: { en: "MARS", bn: "মঙ্গল" },
  marsDesc: {
    en: "Lost explorers. Forgotten missions. Stories that survived.",
    bn: "হারিয়ে যাওয়া অভিযাত্রী। ভুলে যাওয়া মিশন। টিকে থাকা গল্প।",
  },
  moon: { en: "MOON", bn: "চাঁদ" },
  moonDesc: {
    en: "Machines, instruments, and forgotten hardware.",
    bn: "যন্ত্র, উপকরণ, আর ভোলা যন্ত্রাংশ।",
  },
  twoWorlds: { en: "Two worlds are waiting for us.", bn: "দুটি জগৎ আমাদের জন্য অপেক্ষা করছে।" },
  chooseJourney: { en: "CHOOSE YOUR JOURNEY", bn: "আপনার যাত্রা বেছে নিন" },
  moveHint: {
    en: "WASD / Arrow keys to walk • Drag to look around",
    bn: "হাঁটতে WASD / তীর কী • চারপাশ দেখতে টেনে ঘোরান",
  },
  walkToRover: { en: "Approach the rover", bn: "রোভারের কাছে যান" },
  clickContinue: { en: "click to continue", bn: "এগিয়ে যেতে ক্লিক করুন" },
  storyMode: { en: "STORY MODE", bn: "গল্পের মোড" },
  myHardware: { en: "MY HARDWARE", bn: "আমার যন্ত্রাংশ" },
  whatItDid: { en: "WHAT IT DID", bn: "এটি কী করত" },
  whyItMattered: { en: "WHY IT MATTERED", bn: "কেন গুরুত্বপূর্ণ ছিল" },
  missionEvent: { en: "MISSION EVENT", bn: "মিশনের ঘটনা" },
  hotspotHint: {
    en: "Rotate the rover. Click the glowing parts.",
    bn: "রোভারটি ঘোরান। জ্বলজ্বলে অংশগুলোতে ক্লিক করুন।",
  },
  allVisited: { en: "You know how I worked now.", bn: "এখন আপনি জানেন আমি কীভাবে কাজ করতাম।" },
  finishInspect: { en: "FINISH INSPECTION", bn: "পরিদর্শন শেষ করুন" },
  mute: { en: "SOUND", bn: "শব্দ" },
};

// ---------- Nova tutorial (solar system) ----------
export const NOVA_INTRO: DialogueLine[] = [
  { speaker: "nova", en: "Hi! I'm Nova.", bn: "হাই! আমি নোভা।" },
  { speaker: "nova", en: "I'll be your guide out here.", bn: "এখানে আমি আপনার গাইড।" },
  { speaker: "nova", en: "Try moving your mouse.", bn: "মাউসটি একটু নাড়িয়ে দেখুন।" },
];

export const NOVA_AFTER_MOVE: DialogueLine[] = [
  {
    speaker: "nova",
    en: "Great! Now drag to rotate the Solar System.",
    bn: "দারুণ! এবার টেনে সৌরজগৎটাকে ঘোরান।",
  },
];

export const NOVA_AFTER_ROTATE: DialogueLine[] = [
  {
    speaker: "nova",
    en: "Nicely done. Scroll to zoom in and out.",
    bn: "চমৎকার। এবার স্ক্রল করে জুম ইন-আউট করুন।",
  },
];

export const NOVA_POINT_MARS: DialogueLine[] = [
  { speaker: "nova", en: "See that red planet?", bn: "ওই লাল গ্রহটা দেখছেন?" },
  { speaker: "nova", en: "That's Mars.", bn: "ওটা মঙ্গল।" },
  {
    speaker: "nova",
    en: "And the small grey one beside Earth — that's the Moon.",
    bn: "আর পৃথিবীর পাশের ছোট্ট ধূসরটা — সেটা চাঁদ।",
  },
  {
    speaker: "nova",
    en: "Click on Mars when you are ready.",
    bn: "প্রস্তুত হলে মঙ্গলের ওপর ক্লিক করুন।",
  },
];

export const NOVA_TWO_WORLDS: DialogueLine[] = [
  {
    speaker: "nova",
    en: "Two worlds are waiting for us.",
    bn: "দুটি জগৎ আমাদের জন্য অপেক্ষা করছে।",
  },
  { speaker: "nova", en: "Where do we begin?", bn: "কোথা থেকে শুরু করব?" },
];

export const NOVA_WELCOME_MARS: DialogueLine[] = [
  { speaker: "nova", en: "Welcome to Mars.", bn: "মঙ্গলে স্বাগতম।" },
  {
    speaker: "nova",
    en: "We're not here just to explore Mars.",
    bn: "আমরা শুধু মঙ্গল ঘুরতে আসিনি।",
  },
  {
    speaker: "nova",
    en: "We're here to remember the machines that explored it for us.",
    bn: "আমরা এসেছি সেই যন্ত্রগুলোকে মনে করতে, যারা আমাদের হয়ে এই গ্রহ ঘুরেছিল।",
  },
  { speaker: "nova", en: "Come on. Follow the beacon.", bn: "চলুন। বিকনের আলো অনুসরণ করুন।" },
];

export const NOVA_NEAR_SITE: DialogueLine[] = [
  {
    speaker: "nova",
    en: "Before the explorers you know today…",
    bn: "আজকের পরিচিত অভিযাত্রীদের আগে…",
  },
  {
    speaker: "nova",
    en: "…a little rover was already exploring Mars.",
    bn: "…একটি ছোট্ট রোভার তখনই মঙ্গল ঘুরে বেড়াচ্ছিল।",
  },
];

export const SOJOURNER_WAKE: DialogueLine[] = [
  { speaker: "sojourner", en: "Hi… I'm Sojourner.", bn: "হাই… আমি সোজার্নার।" },
  {
    speaker: "sojourner",
    en: "Nobody has visited me in a very long time.",
    bn: "অনেক দিন কেউ আমার কাছে আসেনি।",
  },
  { speaker: "sojourner", en: "Would you like to know my story?", bn: "আমার গল্পটা জানতে চান?" },
];

export const SOJOURNER_AFTER_STORY: DialogueLine[] = [
  { speaker: "sojourner", en: "You know my story now.", bn: "এখন আপনি আমার গল্প জানেন।" },
  {
    speaker: "sojourner",
    en: "But Mars still has more stories.",
    bn: "কিন্তু মঙ্গলের আরও অনেক গল্প আছে।",
  },
];

export const NOVA_AFTER_FLAGS: DialogueLine[] = [
  {
    speaker: "nova",
    en: "Mars has told us many stories.",
    bn: "মঙ্গল আমাদের অনেক গল্প শুনিয়েছে।",
  },
  { speaker: "nova", en: "But another world is waiting.", bn: "কিন্তু আরেকটি জগৎ অপেক্ষা করছে।" },
];

// ---------- Cinematic captions ----------
export const CINEMATIC_BEATS = [
  {
    en: "MARS APPROACH · 480M KM TRAJECTORY",
    bn: "মঙ্গলের নৈকট্য · ৪৮ কোটি কিমি পথ অতিক্রম",
    at: 0.5,
  },
  { en: "CRUISE STAGE SEPARATION", bn: "ক্রুজ স্টেজ পৃথকীকরণ সম্পন্ন", at: 3.2 },
  {
    en: "ATMOSPHERIC ENTRY · 7.3 KM/S PLASMA SHEATH",
    bn: "বায়ুমণ্ডলে প্রবেশ · সেকেন্ডে ৭.৩ কিমি গতি",
    at: 6.2,
  },
  {
    en: "SUPERSONIC PARACHUTE & HEAT SHIELD RELEASE",
    bn: "শব্দাতীত প্যারাস্যুট ও হিট শিল্ড উন্মুক্ত",
    at: 9.2,
  },
  {
    en: "VECTRAN AIRBAG INFLATION & RETRO-ROCKET FIRE",
    bn: "ভেকট্রান এয়ারব্যাগ স্ফীতি ও রেট্রো-রকেট ফায়ার",
    at: 12.0,
  },
  {
    en: "TOUCHDOWN & BOUNCE · ARES VALLIS, JULY 4, 1997",
    bn: "অবতরণ ও বাউন্স · এরিস ভ্যালিস, ৪ জুলাই ১৯৯৭",
    at: 14.5,
  },
];

// ---------- Homepage telemetry bar ----------
export const TELEMETRY = {
  dsn: { en: "DSN: ONLINE", bn: "ডিএসএন: সক্রিয়" },
  freq: { en: "FREQ: 8.4 GHz", bn: "ফ্রিকোয়েন্সি: ৮.৪ গিগাহার্জ" },
  protocol: { en: "RELIC PROTOCOL: V2.4", bn: "রিলিক প্রোটোকল: V2.4" },
  sol: { en: "SOL 001", bn: "সল ০০১" },
  vector: { en: "ARES VALLIS VECTOR", bn: "এরিস ভ্যালিস ভেক্টর" },
};

// ---------- Journey map missions ----------
export const MISSIONS = [
  { id: "pathfinder", name: "MARS PATHFINDER / SOJOURNER", bn: "মার্স পাথফাইন্ডার / সোজার্নার" },
  { id: "opportunity", name: "OPPORTUNITY", bn: "অপরচুনিটি" },
  { id: "spirit", name: "SPIRIT", bn: "স্পিরিট" },
  { id: "phoenix", name: "PHOENIX", bn: "ফিনিক্স" },
  { id: "insight", name: "INSIGHT", bn: "ইনসাইট" },
];

// ---------- Game hub (mission command menu) ----------
export const HUB = {
  novaGreet: { en: "Hi! I'm Nova. What shall we do?", bn: "হাই! আমি নোভা। এবার কী করব?" },
  marsExp: { en: "MARS EXPEDITION", bn: "মঙ্গল অভিযান" },
  moonExp: { en: "MOON EXPEDITION", bn: "চাঁদ অভিযান" },
  newGame: { en: "NEW GAME", bn: "নতুন গেম" },
  newGameSub: { en: "Begin surface expedition", bn: "গ্রহ অভিযান শুরু করুন" },
  chapters: { en: "CHAPTERS", bn: "অধ্যায়" },
  chaptersSub: { en: "View sites & relics", bn: "মিশন ও ঐতিহাসিক স্মৃতি" },
  howToPlay: { en: "HOW TO PLAY", bn: "কীভাবে খেলবেন" },
  howtoSub: { en: "Controls & exploration", bn: "কন্ট্রোল ও নেভিগেশন" },
  resetGame: { en: "RESET GAME", bn: "গেম রিসেট" },
  resetSub: { en: "Clear mission save", bn: "মিশন প্রগ্রেস রিসেট" },
  home: { en: "HOME", bn: "হোম" },
  homeSub: { en: "Return to star map", bn: "প্রধান মেনুতে প্রস্থান" },
  cmdConsole: { en: "COMMAND CONSOLE", bn: "কমান্ড কনসোল" },
  selectDirective: { en: "SELECT DIRECTIVE", bn: "অপারেশন নির্ধারণ করুন" },
  onlineStatus: { en: "ONLINE", bn: "সক্রিয়" },
  metricsTitle: { en: "TARGET TELEMETRY", bn: "টার্গেট টেলিমেট্রি" },
  gravity: { en: "GRAVITY", bn: "অভিকর্ষ" },
  temp: { en: "SURFACE TEMP", bn: "পৃষ্ঠ তাপমাত্রা" },
  atmosphere: { en: "ATMOSPHERE", bn: "বায়ুমণ্ডল" },
  chapterTrail: { en: "EXPEDITION TRAIL", bn: "অভিযানের পথ" },
  launch: { en: "LAUNCH", bn: "শুরু করুন" },
  done: { en: "COMPLETE", bn: "সম্পন্ন" },
  soon: { en: "SOON", bn: "শীঘ্রই" },
  moonSoon: { en: "MOON UNIVERSE — COMING SOON", bn: "চাঁদ ইউনিভার্স — শীঘ্রই আসছে" },
  inProduction: {
    en: "This chapter is still being built — finish Chapter 01 first!",
    bn: "এই অধ্যায়টি এখনো তৈরি হচ্ছে — আগে অধ্যায় ০১ শেষ করুন!",
  },
  resetConfirm: { en: "Erase all mission progress?", bn: "সব মিশন প্রগ্রেস মুছে যাবে?" },
  resetWarn: {
    en: "Flags and tutorial progress will be lost forever.",
    bn: "পতাকা ও টিউটোরিয়াল প্রগ্রেস চিরতরে মুছে যাবে।",
  },
  yes: { en: "YES, ERASE", bn: "হ্যাঁ, মুছে দাও" },
  no: { en: "CANCEL", bn: "বাতিল" },
  resetDone: {
    en: "All progress erased. A fresh journey awaits!",
    bn: "সব প্রগ্রেস মুছে গেছে। নতুন করে যাত্রা শুরু!",
  },
  close: { en: "GOT IT", bn: "বুঝেছি" },
};

export const HOWTO = [
  {
    icon: "🚶",
    title: { en: "Explore the surface", bn: "পৃষ্ঠ ঘোরাঘুরি" },
    body: {
      en: "Walk with WASD or the on-screen joystick. Drag to look around.",
      bn: "WASD বা স্ক্রিনের জয়স্টিক দিয়ে হাঁটুন। টেনে চারপাশ দেখুন।",
    },
  },
  {
    icon: "🤖",
    title: { en: "Meet the old machines", bn: "পুরনো যন্ত্রদের সাথে পরিচয়" },
    body: {
      en: "Follow the beacon to find forgotten rovers and landers. They remember everything.",
      bn: "বিকনের আলো অনুসরণ করে ভুলে যাওয়া রোভার-ল্যান্ডার খুঁজুন। তারা সব মনে রাখে।",
    },
  },
  {
    icon: "🔊",
    title: { en: "Hear their true stories", bn: "তাদের আসল গল্প শুনুন" },
    body: {
      en: "Click a machine to hear its real NASA story — in English or Bangla.",
      bn: "যন্ত্রে ক্লিক করলেই তার আসল নাসা গল্প — ইংরেজি বা বাংলায়।",
    },
  },
  {
    icon: "🚩",
    title: { en: "Raise the flag", bn: "পতাকা উড়াও" },
    body: {
      en: "Finish a chapter to raise its flag and unlock the next mission.",
      bn: "একটি অধ্যায় শেষ করলেই পতাকা উড়বে ও পরের মিশন খুলবে।",
    },
  },
];

export const CHAPTERS = [
  {
    universe: "mars" as const,
    id: "ch1",
    ready: true,
    name: { en: "ARES VALLIS DESCENT", bn: "এরিস ভ্যালিস অবতরণ" },
    tag: { en: "1997 · PATHFINDER & SOJOURNER", bn: "১৯৯৭ · পাথফাইন্ডার ও সোজার্নার" },
  },
  {
    universe: "mars" as const,
    id: "ch2",
    ready: false,
    name: { en: "AWAKENING OF SOJOURNER", bn: "সোজার্নারের জাগরণ" },
    tag: { en: "FIRST WHEELS ON ANOTHER PLANET", bn: "অন্য গ্রহে প্রথম চাকা" },
  },
  {
    universe: "mars" as const,
    id: "ch3",
    ready: false,
    name: { en: "CARL SAGAN MEMORIAL STATION", bn: "কার্ল সেগান মেমোরিয়াল স্টেশন" },
    tag: { en: "THE LAST SIGNAL · SEPT 1997", bn: "শেষ সংকেত · সেপ্টেম্বর ১৯৯৭" },
  },
  {
    universe: "moon" as const,
    id: "ch4",
    ready: true,
    name: { en: "TRANQUILITY BASE", bn: "ট্রানকুইলিটি বেস" },
    tag: { en: "1969 · APOLLO 11", bn: "১৯৬৯ · অ্যাপোলো ১১" },
  },
  {
    universe: "moon" as const,
    id: "ch5",
    ready: false,
    name: { en: "SURVEYOR 3 REUNION", bn: "সার্ভেয়ার ৩ পুনর্মিলন" },
    tag: { en: "1967/1969 · APOLLO 12", bn: "১৯৬৭/১৯৬৯ · অ্যাপোলো ১২" },
  },
  {
    universe: "moon" as const,
    id: "ch6",
    ready: false,
    name: { en: "THE FIRST MOON BUGGY", bn: "প্রথম চাঁদের গাড়ি" },
    tag: { en: "1971 · APOLLO 15", bn: "১৯৭১ · অ্যাপোলো ১৫" },
  },
  {
    universe: "moon" as const,
    id: "ch7",
    ready: false,
    name: { en: "THE LAST GOODBYE", bn: "শেষ বিদায়" },
    tag: { en: "1972 · APOLLO 17", bn: "১৯৭২ · অ্যাপোলো ১৭" },
  },
];
