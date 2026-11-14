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
  newGameSub: { en: "Land and start exploring!", bn: "নেমে পড়ো, ঘুরে দেখো!" },
  chapters: { en: "CHAPTERS", bn: "অধ্যায়" },
  chaptersSub: { en: "Jump to any place", bn: "যেকোনো জায়গায় চলে যাও" },
  howToPlay: { en: "HOW TO PLAY", bn: "কীভাবে খেলবে" },
  howtoSub: { en: "Learn the game step by step", bn: "খেলাটা সহজে শিখে নাও" },
  resetGame: { en: "RESET GAME", bn: "গেম রিসেট" },
  resetSub: { en: "Start everything again", bn: "সব আবার নতুন করে শুরু" },
  home: { en: "HOME", bn: "হোম" },
  homeSub: { en: "Go back to the start", bn: "শুরুর পাতায় ফিরে যাও" },
  cmdConsole: { en: "COMMAND CONSOLE", bn: "কমান্ড কনসোল" },
  selectDirective: { en: "WHAT DO YOU WANT TO DO?", bn: "কী করতে চাও বেছে নাও" },
  onlineStatus: { en: "ONLINE", bn: "সক্রিয়" },
  metricsTitle: { en: "TARGET TELEMETRY", bn: "টার্গেট টেলিমেট্রি" },
  gravity: { en: "GRAVITY", bn: "অভিকর্ষ" },
  temp: { en: "SURFACE TEMP", bn: "পৃষ্ঠ তাপমাত্রা" },
  atmosphere: { en: "ATMOSPHERE", bn: "বায়ুমণ্ডল" },
  chapterTrail: { en: "EXPEDITION TRAIL", bn: "অভিযানের পথ" },
  launch: { en: "LAUNCH", bn: "শুরু করো" },
  done: { en: "COMPLETE", bn: "সম্পন্ন" },
  soon: { en: "SOON", bn: "শীঘ্রই" },
  moonSoon: { en: "MOON UNIVERSE — COMING SOON", bn: "চাঁদ ইউনিভার্স — শীঘ্রই আসছে" },
  inProduction: {
    en: "This chapter is still being built — finish Chapter 01 first!",
    bn: "এই অধ্যায়টা এখনো বন্ধ — আগের মিশনটা শেষ করো!",
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
  close: { en: "GOT IT, LET'S PLAY!", bn: "বুঝেছি, চলো খেলি!" },
};

export const HOWTO = [
  {
    icon: "🚀",
    title: { en: "1. Pick a planet", bn: "১. গ্রহ বেছে নাও" },
    body: {
      en: "Tap the Mars or Moon button at the top. Then press NEW GAME to land, or CHAPTERS to jump to any place you like.",
      bn: "উপরের মঙ্গল বা চাঁদ বোতাম চাপো। তারপর নামতে চাপো নতুন গেম, আর যেকোনো জায়গায় সরাসরি যেতে চাপো অধ্যায়।",
    },
  },
  {
    icon: "🚶",
    title: { en: "2. Walk around", bn: "২. হাঁটাহাঁটি করো" },
    body: {
      en: "On a computer, use W A S D (or the arrow keys) to walk and Space to jump. On a phone, push the round joystick at the bottom left.",
      bn: "কম্পিউটারে W A S D (বা তীর চিহ্ন) চেপে হাঁটো, আর Space চেপে লাফ দাও। ফোনে নিচের বাম কোণের গোল জয়স্টিকটা আঙুল দিয়ে ঠেলো।",
    },
  },
  {
    icon: "👀",
    title: { en: "3. Look around", bn: "৩. চারপাশে তাকাও" },
    body: {
      en: "Drag with your mouse or finger on the screen to turn your head and see everything around you.",
      bn: "মাউস বা আঙুল দিয়ে স্ক্রিন টেনে মাথা ঘোরাও, চারপাশের সবকিছু দেখো।",
    },
  },
  {
    icon: "🎯",
    title: { en: "4. Read the mission line", bn: "৪. উপরের নির্দেশ পড়ো" },
    body: {
      en: "Look at the top of the screen. Nova always tells you what to do next, like 'Walk south to meet Spirit'. Just follow it!",
      bn: "স্ক্রিনের একদম উপরে দেখো। নোভা সবসময় বলে দেয় এরপর কী করতে হবে, যেমন 'দক্ষিণে হেঁটে স্পিরিটের কাছে যাও'। শুধু সেটা মেনে চলো!",
    },
  },
  {
    icon: "🗺️",
    title: { en: "5. Use the map", bn: "৫. ম্যাপ দেখো" },
    body: {
      en: "The small map in the corner shows where you are. Press M (or the map button) to open the big map and see where to go.",
      bn: "কোণের ছোট ম্যাপে দেখা যায় তুমি কোথায় আছো। M চাপো (বা ম্যাপ বোতাম) — বড় ম্যাপ খুলবে, কোথায় যেতে হবে দেখতে পাবে।",
    },
  },
  {
    icon: "🤖",
    title: { en: "6. Meet the sleeping robots", bn: "৬. ঘুমন্ত রোবটদের সাথে দেখা করো" },
    body: {
      en: "Old rovers and landers were left behind long ago. Walk close and press E (or the glowing 'Look' button). They will wake up and tell you their real NASA story!",
      bn: "অনেক আগে কিছু রোভার আর ল্যান্ডার একা পড়ে আছে। কাছে গিয়ে E চাপো (বা জ্বলজ্বলে 'দেখো' বোতাম)। ওরা জেগে উঠে নিজের আসল নাসা গল্প শোনাবে!",
    },
  },
  {
    icon: "🔄",
    title: { en: "7. Spin the rover", bn: "৭. রোভার ঘুরিয়ে দেখো" },
    body: {
      en: "When a rover card opens, drag it to spin it all the way around. Tap the little dots to learn what each part does.",
      bn: "রোভারের কার্ড খুললে টেনে পুরোটা ঘুরিয়ে দেখো। ছোট ছোট বিন্দুতে চাপলে জানবে কোন অংশ কী কাজ করে।",
    },
  },
  {
    icon: "⭐",
    title: { en: "8. Collect golden stars", bn: "৮. সোনালি তারা জমাও" },
    body: {
      en: "Shiny stars hide near rocks and craters. Walk into one to collect it and learn a fun fact. Mars has 28 stars — can you find them all?",
      bn: "পাথর আর গর্তের পাশে ঝকঝকে তারা লুকিয়ে আছে। তারার কাছে হেঁটে গেলেই সেটা তোমার হবে, সাথে একটা মজার তথ্যও জানবে। মঙ্গলে আছে ২৮টা তারা — সবগুলো খুঁজে পাবে তো?",
    },
  },
  {
    icon: "🧠",
    title: { en: "9. Answer the quiz", bn: "৯. কুইজের উত্তর দাও" },
    body: {
      en: "After a story, Nova asks easy questions. Don't worry if you get one wrong — you can try again!",
      bn: "গল্প শেষে নোভা কিছু সহজ প্রশ্ন করবে। ভুল হলে ভয় নেই — আবার চেষ্টা করতে পারবে!",
    },
  },
  {
    icon: "🏅",
    title: { en: "10. Win badges and your certificate", bn: "১০. ব্যাজ আর সনদ জেতো" },
    body: {
      en: "Every mission gives you a badge. Finish all four and take a selfie in a spacesuit, then download your own explorer certificate!",
      bn: "প্রতিটা মিশন শেষে একটা ব্যাজ পাবে। চারটা মিশন শেষ করলে স্পেসস্যুটে সেলফি তুলে নিজের অভিযাত্রী সনদ ডাউনলোড করো!",
    },
  },
  {
    icon: "💡",
    title: { en: "Stuck? No problem!", bn: "আটকে গেছো? চিন্তা নেই!" },
    body: {
      en: "Read Nova's message, open the big map, or press ⏩ to skip a long talk. You can also switch English / বাংলা anytime.",
      bn: "নোভার কথা পড়ো, বড় ম্যাপ খোলো, বা লম্বা কথা টপকাতে ⏩ চাপো। যেকোনো সময় English / বাংলা বদলাতেও পারো।",
    },
  },
];

export const CHAPTERS = [
  {
    universe: "mars" as const,
    id: "ch1",
    ready: true,
    name: { en: "ARES VALLIS · THE FIRST ROVER", bn: "এরিস ভ্যালিস · প্রথম রোভার" },
    tag: { en: "1997 · PATHFINDER & SOJOURNER", bn: "১৯৯৭ · পাথফাইন্ডার ও সোজার্নার" },
  },
  {
    universe: "mars" as const,
    id: "ch2",
    ready: true,
    name: { en: "GUSEV CRATER · COLUMBIA HILLS", bn: "গুসেভ ক্রেটার · কলম্বিয়া হিলস" },
    tag: { en: "2004 · SPIRIT", bn: "২০০৪ · স্পিরিট" },
  },
  {
    universe: "mars" as const,
    id: "ch3",
    ready: true,
    name: { en: "MERIDIANI · THE MARATHON ROVER", bn: "মেরিডিয়ানি · ম্যারাথন রোভার" },
    tag: { en: "2004 · OPPORTUNITY", bn: "২০০৪ · অপরচুনিটি" },
  },
  {
    universe: "mars" as const,
    id: "ch8",
    ready: true,
    name: { en: "ELYSIUM · LISTEN TO MARSQUAKES", bn: "এলিসিয়াম · মঙ্গলের ভূমিকম্প শোনো" },
    tag: { en: "2018 · INSIGHT", bn: "২০১৮ · ইনসাইট" },
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
    ready: true,
    name: { en: "SURVEYOR 3 REUNION", bn: "সার্ভেয়ার ৩ পুনর্মিলন" },
    tag: { en: "1967/1969 · APOLLO 12", bn: "১৯৬৭/১৯৬৯ · অ্যাপোলো ১২" },
  },
  {
    universe: "moon" as const,
    id: "ch6",
    ready: true,
    name: { en: "RIDE THE LUNAR ROVER", bn: "লুনার রোভার চালাও" },
    tag: { en: "1971 · APOLLO 15 · FIRST MOON CAR", bn: "১৯৭১ · অ্যাপোলো ১৫ · চাঁদের প্রথম গাড়ি" },
  },
  {
    universe: "moon" as const,
    id: "ch7",
    ready: true,
    name: { en: "THE LAST ROVER RIDE", bn: "শেষ রোভার অভিযান" },
    tag: { en: "1972 · APOLLO 17 · THE LAST GOODBYE", bn: "১৯৭২ · অ্যাপোলো ১৭ · শেষ বিদায়" },
  },
];
