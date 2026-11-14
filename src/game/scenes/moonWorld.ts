import * as THREE from "three";
import { store } from "../../state/store";
import { voice } from "../voice";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { makeStarfield, type Scene } from "../utils";

/**
 * Apollo 11 — Tranquility Base (Mare Tranquillitatis, 0.674°N 23.473°E).
 * Layout follows the real EVA traverse map (scaled ~1.6x so kids can walk it):
 * LM at origin, flag/TV camera west, LRRR + PSEP south, Little West Crater east.
 */
const WORLD = 420; // corridor width (x)
const ZMAX = 210, ZMIN = -1470; // corridor runs along -Z through 4 landing sites
const LEN = ZMAX - ZMIN;
const SEGX = 200, SEGZ = 800;
/** Zone centres along Z: 0 Apollo 11 · 1 Apollo 12/Surveyor 3 · 2 Apollo 15 · 3 Apollo 17 */
export const ZONE_Z = [0, -420, -840, -1260];
export const MOON_ZONES = [
  { en: "TRANQUILITY BASE · APOLLO 11", bn: "ট্রাঙ্কুইলিটি বেস · অ্যাপোলো ১১", coord: "MARE TRANQUILLITATIS · 0.674°N 23.473°E", year: "20 JUL 1969",
    nova: { en: "Welcome to Tranquility Base! Apollo 11 landed here on 20 July 1969. Jump with SPACE — gravity is only one sixth of Earth's!", bn: "ট্রাঙ্কুইলিটি বেসে স্বাগতম! ১৯৬৯ সালের ২০ জুলাই অ্যাপোলো ১১ এখানে নেমেছিল। SPACE চেপে লাফ দাও — এখানে মাধ্যাকর্ষণ পৃথিবীর ছয় ভাগের এক ভাগ!" } },
  { en: "OCEAN OF STORMS · APOLLO 12 + SURVEYOR 3", bn: "ঝড়ের মহাসাগর · অ্যাপোলো ১২ + সার্ভেয়ার ৩", coord: "OCEANUS PROCELLARUM · 3.01°S 23.42°W", year: "19 NOV 1969",
    nova: { en: "This is the Ocean of Storms! In 1969 Apollo 12 landed right next to Surveyor 3, a robot that had been sitting here since 1967. Walk down into Surveyor Crater to find it!", bn: "এটা ঝড়ের মহাসাগর! ১৯৬৯ সালে অ্যাপোলো ১২ নেমেছিল ১৯৬৭ সাল থেকে পড়ে থাকা রোবট সার্ভেয়ার ৩-এর ঠিক পাশে। সার্ভেয়ার ক্রেটারে নেমে ওকে খুঁজে বের করো!" } },
  { en: "HADLEY RILLE · APOLLO 15", bn: "হ্যাডলি রিল · অ্যাপোলো ১৫", coord: "HADLEY–APENNINE · 26.13°N 3.63°E", year: "30 JUL 1971",
    nova: { en: "Hadley Rille! Look at that giant canyon and Mount Hadley behind it. Apollo 15 brought the first Moon buggy here in 1971 — it is still parked by the lander!", bn: "হ্যাডলি রিল! ওই বিশাল গিরিখাত আর পেছনের মাউন্ট হ্যাডলি দেখো। ১৯৭১ সালে অ্যাপোলো ১৫ এখানে প্রথম চাঁদের গাড়ি এনেছিল — সেটা এখনো ল্যান্ডারের পাশে দাঁড়িয়ে আছে!" } },
  { en: "TAURUS–LITTROW · APOLLO 17", bn: "টরাস–লিট্রো · অ্যাপোলো ১৭", coord: "TAURUS–LITTROW VALLEY · 20.19°N 30.77°E", year: "11 DEC 1972",
    nova: { en: "Taurus–Littrow valley, between giant mountains. Apollo 17 was the last time humans walked on the Moon, in December 1972. Find the orange soil at Shorty Crater!", bn: "টরাস–লিট্রো উপত্যকা, বিশাল পাহাড়ের মাঝে। ১৯৭২ সালের ডিসেম্বরে অ্যাপোলো ১৭-ই ছিল চাঁদে মানুষের শেষ হাঁটা। শর্টি ক্রেটারে কমলা মাটি খুঁজে বের করো!" } },
];
const zoneOf = (z: number) => THREE.MathUtils.clamp(Math.round(-z / 420), 0, 3);
const win = (z: number, zc: number, half = 190) => { const d = Math.abs(z - zc) / half; return d >= 1 ? 0 : 1 - d * d * (3 - 2 * d); };
const rilleX = (z: number) => -60 + Math.sin((z + 840) * 0.018) * 14;
const LM_SPOTS: [number, number][] = [[0, 0], [30, -398], [0, -830], [0, -1255]];
const A11_SPOTS = ["lm", "plaque", "flag", "boot", "lrrr", "psep", "memorial"];
const A12_SPOTS = ["intrepid", "surveyor", "tvcam", "scoop", "rtg", "alsep12", "head"];
const A15_SPOTS = ["falcon", "lrv15", "feather", "fallen", "genesis", "alsep15", "overlook"];
const A17_SPOTS = ["challenger", "lrv17", "orange", "tdc", "lastStep", "plaque17", "alsep17"];
const ZONE_SPOTS: Record<number, string[]> = { 0: A11_SPOTS, 1: A12_SPOTS, 2: A15_SPOTS, 3: A17_SPOTS };
const GRAVITY = 2.6; // gentle "1/6 g" feel
const JUMP_V = 3.4;
const SPEED = 4.2;
// Lunar Rover feel (real LRV top speed ≈ 3.6 m/s; sped up so kids feel it)
const ROVER_MAX = 11, ROVER_REV = 3.5, ROVER_ACCEL = 5, ROVER_BRAKE = 12, ROVER_DRAG = 0.6, ROVER_TURN = 1.6;

type Site = { id: string; x: number; z: number; en: string; bn: string; info: string; r: number; zone?: number };
export const MOON_SITES: Site[] = [
  { id: "lm", x: 0, z: 0, en: "EAGLE · Lunar Module", bn: "ঈগল · লুনার মডিউল", info: "Descent stage left behind · 20 Jul 1969", r: 9 },
  { id: "plaque", x: 1.2, z: 3.3, en: "Plaque · \"We came in peace\"", bn: "ফলক · \"আমরা শান্তির জন্য এসেছি\"", info: "Front leg ladder", r: 3 },
  { id: "flag", x: -9, z: 6, en: "US Flag Site", bn: "পতাকার স্থান", info: "Knocked over by engine blast at liftoff", r: 4 },
  { id: "tv", x: -22, z: 16, en: "TV Camera", bn: "টিভি ক্যামেরা", info: "Broadcast to 650 million people", r: 4 },
  { id: "boot", x: -5, z: 13, en: "Aldrin's Bootprint", bn: "অলড্রিনের পদচিহ্ন", info: "Photo AS11-40-5878", r: 3 },
  { id: "lrrr", x: 6, z: 26, en: "Laser Reflector (LRRR)", bn: "লেজার প্রতিফলক (LRRR)", info: "100 mirrors · still used today", r: 4 },
  { id: "psep", x: -4, z: 30, en: "Seismometer (PSEP)", bn: "ভূকম্পন যন্ত্র (PSEP)", info: "First moonquake listener", r: 4 },
  { id: "memorial", x: 4.5, z: -4, en: "Memorial Bag · Goodwill Disc", bn: "স্মৃতির থলে · শুভেচ্ছা চাকতি", info: "Olive branch · 73 nations' messages", r: 2 },
  { id: "lwc", x: 96, z: 4, en: "Little West Crater", bn: "লিটল ওয়েস্ট ক্রেটার", info: "Armstrong's surprise run · 33 m wide", r: 22 },
  { id: "wc", x: -150, z: -40, en: "West Crater", bn: "ওয়েস্ট ক্রেটার", info: "Boulders Armstrong flew over to land", r: 55 },
  { id: "dbl", x: 40, z: -70, en: "Double Crater", bn: "ডাবল ক্রেটার", info: "Twin impact pits", r: 26 },
  // --- Zone 2: Apollo 12 + Surveyor 3, Ocean of Storms ---
  { id: "intrepid", x: 30, z: -398, en: "INTREPID · Apollo 12 LM", bn: "ইনট্রেপিড · অ্যাপোলো ১২", info: "Pinpoint landing · 19 Nov 1969", r: 9, zone: 1 },
  { id: "surveyor", x: -8, z: -430, en: "Surveyor 3 Robot", bn: "সার্ভেয়ার ৩ রোবট", info: "Waiting here since April 1967", r: 4, zone: 1 },
  { id: "svc", x: 10, z: -430, en: "Surveyor Crater", bn: "সার্ভেয়ার ক্রেটার", info: "200 m wide · robot on its slope", r: 34, zone: 1 },
  { id: "tvcam", x: -5, z: -427, en: "Camera mount (cut)", bn: "ক্যামেরার জায়গা (কাটা)", info: "TV camera taken home by Apollo 12", r: 1.5, zone: 1 },
  { id: "scoop", x: -11, z: -433, en: "Surveyor soil scoop", bn: "সার্ভেয়ারের মাটির চামচ", info: "First robot digger on the Moon", r: 1.5, zone: 1 },
  { id: "rtg", x: 56, z: -407, en: "SNAP-27 power battery", bn: "SNAP-27 ব্যাটারি", info: "Heat-powered electricity", r: 2, zone: 1 },
  { id: "alsep12", x: 62, z: -412, en: "ALSEP Science Station", bn: "ALSEP বিজ্ঞান কেন্দ্র", info: "Apollo 12 experiments", r: 4, zone: 1 },
  { id: "head", x: -45, z: -395, en: "Head Crater", bn: "হেড ক্রেটার", info: "Named after the 'head' of the snowman", r: 15, zone: 1 },
  { id: "bench", x: 55, z: -370, en: "Bench Crater", bn: "বেঞ্চ ক্রেটার", info: "Bench-shaped floor", r: 12, zone: 1 },
  // --- Zone 3: Apollo 15, Hadley Rille ---
  { id: "falcon", x: 0, z: -830, en: "FALCON · Apollo 15 LM", bn: "ফ্যালকন · অ্যাপোলো ১৫", info: "Landed 30 Jul 1971", r: 9, zone: 2 },
  { id: "lrv15", x: -14, z: -846, en: "Lunar Rover LRV-1", bn: "লুনার রোভার LRV-1", info: "First car on the Moon · 27.8 km driven", r: 4, zone: 2 },
  { id: "fallen", x: -7, z: -818, en: "Fallen Astronaut", bn: "ফলেন অ্যাস্ট্রোনট", info: "Memorial to 14 lost space explorers", r: 3, zone: 2 },
  { id: "feather", x: 8, z: -842, en: "Hammer & Feather Drop", bn: "হাতুড়ি ও পালক পরীক্ষা", info: "Both hit the ground together!", r: 3, zone: 2 },
  { id: "genesis", x: 22, z: -858, en: "Genesis Rock spot", bn: "জেনেসিস পাথরের জায়গা", info: "4.1 billion-year-old white rock", r: 2, zone: 2 },
  { id: "alsep15", x: 24, z: -816, en: "ALSEP-15 Science Station", bn: "ALSEP-15 বিজ্ঞান কেন্দ্র", info: "Measured the Moon's inner heat", r: 3, zone: 2 },
  { id: "overlook", x: -34, z: -840, en: "Hadley Rille Overlook", bn: "হ্যাডলি রিলের কিনারা", info: "1 km wide lava canyon", r: 3, zone: 2 },
  { id: "rille", x: -60, z: -860, en: "Hadley Rille", bn: "হ্যাডলি রিল", info: "Ancient lava canyon · 300 m deep (real)", r: 40, zone: 2 },
  { id: "mhadley", x: 165, z: -800, en: "Mount Hadley", bn: "মাউন্ট হ্যাডলি", info: "4.5 km high", r: 60, zone: 2 },
  { id: "delta", x: 40, z: -985, en: "Hadley Delta", bn: "হ্যাডলি ডেল্টা", info: "Where the Genesis Rock was found", r: 40, zone: 2 },
  // --- Zone 4: Apollo 17, Taurus-Littrow ---
  { id: "challenger", x: 0, z: -1255, en: "CHALLENGER · Apollo 17 LM", bn: "চ্যালেঞ্জার · অ্যাপোলো ১৭", info: "Last crewed landing · Dec 1972", r: 9, zone: 3 },
  { id: "lrv17", x: 12, z: -1268, en: "Lunar Rover LRV-3", bn: "লুনার রোভার LRV-3", info: "Fender fixed with a map & tape!", r: 4, zone: 3 },
  { id: "tdc", x: -8, z: -1270, en: "\"TDC\" in the dust", bn: "ধুলোয় লেখা \"TDC\"", info: "Cernan's daughter's initials", r: 3, zone: 3 },
  { id: "lastStep", x: 5, z: -1243, en: "The Last Footprint", bn: "শেষ পদচিহ্ন", info: "Gene Cernan · 14 Dec 1972", r: 3, zone: 3 },
  { id: "orange", x: 22, z: -1278, en: "Orange Soil sample", bn: "কমলা মাটির নমুনা", info: "Found at Shorty Crater", r: 2, zone: 3 },
  { id: "plaque17", x: 2, z: -1251, en: "Farewell Plaque", bn: "বিদায়ী ফলক", info: "On Challenger's ladder", r: 1.5, zone: 3 },
  { id: "alsep17", x: -26, z: -1240, en: "ALSEP-17 Science Station", bn: "ALSEP-17 বিজ্ঞান কেন্দ্র", info: "Quakes, meteors & heat", r: 3, zone: 3 },
  { id: "shorty", x: 45, z: -1300, en: "Shorty Crater · Orange Soil", bn: "শর্টি ক্রেটার · কমলা মাটি", info: "Volcanic glass beads, 3.6 billion yrs", r: 12, zone: 3 },
  { id: "camelot", x: -55, z: -1215, en: "Camelot Crater", bn: "ক্যামেলট ক্রেটার", info: "Boulder field", r: 18, zone: 3 },
  { id: "smassif", x: -165, z: -1300, en: "South Massif", bn: "দক্ষিণ ম্যাসিফ", info: "2.3 km mountain wall", r: 60, zone: 3 },
  { id: "nmassif", x: 165, z: -1220, en: "North Massif", bn: "উত্তর ম্যাসিফ", info: "Station 6 split boulder", r: 60, zone: 3 },
];
const NAMED_CRATERS = [
  { x: 96, z: 4, R: 26, D: 7 },
  { x: -150, z: -40, R: 60, D: 16 },
  { x: 32, z: -70, R: 16, D: 4 },
  { x: 52, z: -72, R: 14, D: 3.5 },
  { x: 10, z: -430, R: 36, D: 9 },
  { x: -45, z: -395, R: 15, D: 4 },
  { x: 55, z: -370, R: 12, D: 3 },
  { x: 45, z: -1300, R: 11, D: 2.6 },
  { x: -55, z: -1215, R: 18, D: 4.5 },
];

const loader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// ---------- seeded helpers ----------
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function phash(x: number, y: number, p: number) {
  x = ((x % p) + p) % p; y = ((y % p) + p) % p;
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function pnoise(x: number, y: number, p: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = phash(xi, yi, p), b = phash(xi + 1, yi, p), c = phash(xi, yi + 1, p), d = phash(xi + 1, yi + 1, p);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function pfbm(x: number, y: number, p: number, oct = 5) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * pnoise(x * f, y * f, p * f); a *= 0.5; f *= 2; }
  return v;
}
function crater(d: number, D: number) {
  // d = dist / R
  if (d > 2.2) return 0;
  const bowl = d < 1 ? -D * (1 - d * d) * 0.9 : 0;
  const rim = D * 0.32 * Math.exp(-(((d - 1) / 0.22) ** 2));
  const ejecta = d > 1 ? D * 0.08 * Math.exp(-(d - 1) * 2.2) : 0;
  return bowl + rim + ejecta;
}

/** Tileable regolith albedo + normal map, baked once (1024²). */
function makeRegolithMaps() {
  const N = 1024, P = 16;
  const h = new Float32Array(N * N);
  const rnd = mulberry(7);
  const micro: { x: number; y: number; r: number; d: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const r = 2 + Math.pow(rnd(), 4) * 22;
    micro.push({ x: rnd() * N, y: rnd() * N, r, d: 0.25 + rnd() * 0.5 });
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x / N) * P, v = (y / N) * P;
    h[y * N + x] = pfbm(u, v, P, 6) * 0.9 + pnoise(u * 8, v * 8, P * 8) * 0.18;
  }
  for (const c of micro) {
    const R = Math.ceil(c.r * 2);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy) / c.r; if (d > 2) continue;
      const xx = (((Math.round(c.x) + dx) % N) + N) % N, yy = (((Math.round(c.y) + dy) % N) + N) % N;
      h[yy * N + xx]! += crater(d, c.d);
    }
  }
  const col = document.createElement("canvas"); col.width = col.height = N;
  const nor = document.createElement("canvas"); nor.width = nor.height = N;
  const ci = col.getContext("2d")!.createImageData(N, N);
  const ni = nor.getContext("2d")!.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const hx = h[y * N + ((x + 1) % N)]! - h[y * N + ((x - 1 + N) % N)]!;
    const hy = h[((y + 1) % N) * N + x]! - h[((y - 1 + N) % N) * N + x]!;
    const s = 6;
    let nx = -hx * s, ny = -hy * s, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    ni.data[i * 4] = (nx * 0.5 + 0.5) * 255; ni.data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; ni.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; ni.data[i * 4 + 3] = 255;
    const grain = (phash(x, y, N) - 0.5) * 34;
    const sparkle = phash(x * 3 + 1, y * 7, N) > 0.993 ? 40 : 0; // glassy beads
    const base = 112 + (h[i]! - 0.5) * 60 + grain + sparkle - Math.max(0, -hx * 400);
    ci.data[i * 4] = base; ci.data[i * 4 + 1] = base * 0.985; ci.data[i * 4 + 2] = base * 0.96; ci.data[i * 4 + 3] = 255;
  }
  col.getContext("2d")!.putImageData(ci, 0, 0);
  nor.getContext("2d")!.putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace;
  const nmap = new THREE.CanvasTexture(nor);
  for (const t of [map, nmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, nmap };
}

function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  paint(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function goldFoil() {
  return canvasTex(512, 512, (g) => {
    const r = mulberry(3);
    g.fillStyle = "#b8862a"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      const x = r() * 512, y = r() * 512, s = 6 + r() * 40, l = 35 + r() * 40;
      g.fillStyle = `hsla(${38 + r() * 10},80%,${l}%,${0.25 + r() * 0.4})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + r() * s - s / 2); g.lineTo(x + r() * s, y + s); g.fill();
    }
  });
}
function flagTex() {
  return canvasTex(256, 160, (g) => {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : "#b3202e"; g.fillRect(0, (i * 160) / 13, 256, 160 / 13 + 1); }
    g.fillStyle = "#1f2f6b"; g.fillRect(0, 0, 110, 86);
    g.fillStyle = "#f4f1ea";
    for (let y = 0; y < 9; y++) for (let x = 0; x < (y % 2 ? 5 : 6); x++) { g.beginPath(); g.arc(9 + x * 18 + (y % 2) * 9, 7 + y * 9, 2.2, 0, 7); g.fill(); }
  });
}
function bootTex() {
  return canvasTex(64, 128, (g) => {
    g.clearRect(0, 0, 64, 128);
    g.fillStyle = "rgba(20,20,22,0.75)";
    g.beginPath(); g.ellipse(32, 64, 22, 58, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(200,200,200,0.35)";
    for (let y = 14; y < 118; y += 9) g.fillRect(12, y, 40, 3); // Apollo tread bars
  });
}
function earthTex() {
  return canvasTex(512, 256, (g) => {
    const r = mulberry(11);
    g.fillStyle = "#1b4fa8"; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = r() > 0.5 ? "#5f8a3c" : "#b59a62";
      g.beginPath(); g.ellipse(r() * 512, 50 + r() * 160, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`;
      g.beginPath(); g.ellipse(r() * 512, r() * 256, 10 + r() * 40, 2 + r() * 6, r() * 0.5, 0, 7); g.fill();
    }
    g.fillStyle = "#f5f7fb"; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
  });
}
function labelSprite(title: string, sub: string) {
  const t = canvasTex(512, 128, (g) => {
    g.fillStyle = "rgba(8,12,22,0.72)"; g.beginPath(); g.roundRect(8, 8, 496, 112, 18); g.fill();
    g.strokeStyle = "rgba(200,220,255,0.7)"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#ffd97d"; g.font = "bold 36px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(title, 256, 56);
    g.fillStyle = "#c9d6ea"; g.font = "24px system-ui, sans-serif"; g.fillText(sub, 256, 96);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(6, 1.5, 1); s.renderOrder = 10;
  return s;
}

export class MoonWorldScene implements Scene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
  private player = new THREE.Group();
  private sun!: THREE.DirectionalLight;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private camYaw = 2.5;
  private camPitch = 0.3;
  private camDist = 7;
  private dragging = false;
  private last = { x: 0, y: 0 };
  private vel = new THREE.Vector3();
  private vy = 0;
  private grounded = true;
  private heights!: Float32Array;
  private labels: { s: THREE.Sprite; site: Site }[] = [];
  private prints!: THREE.InstancedMesh;
  private printIdx = 0;
  private lastPrint = new THREE.Vector3(1e9, 0, 0);
  private dust!: THREE.Points;
  private dustLife = 0;
  private mixer: THREE.AnimationMixer | null = null;
  private walk: THREE.AnimationAction | null = null;
  private bones: Record<string, THREE.Object3D> = {};
  private sitK = 0;
  private hud!: HTMLDivElement;
  private mini!: HTMLCanvasElement;
  private miniBg!: HTMLCanvasElement;
  private big: HTMLCanvasElement | null = null;
  private bigOpen = false;
  private nearSite = "";
  private disposers: (() => void)[] = [];
  private disposed = false;
  private earth!: THREE.Mesh;
  private zone = 0;
  private rovers: { id: string; g: THREE.Group; wheels: THREE.Object3D[] }[] = [];
  private driving: { id: string; g: THREE.Group; wheels: THREE.Object3D[] } | null = null;
  private rSpeed = 0; private rHead = 0; private drive = { gas: false, brake: false };
  private rDust!: THREE.Points; private rDustI = 0; private rTracks!: THREE.InstancedMesh; private rTrackI = 0; private rLastTrack = new THREE.Vector3(1e9, 0, 0);

  private bannerEl?: HTMLDivElement; private bannerT = 0; private beacons: THREE.Object3D[] = [];
  private stars = new Map<string, THREE.Sprite>();
  private buildStars() {
    const tex = canvasTex(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(255,230,150,.9)"); r.addColorStop(1, "rgba(255,217,125,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#ffd23f"; g.strokeStyle = "#fff6c8"; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 18 : 42; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke();
    });
    for (const id of [...A11_SPOTS, ...A12_SPOTS, ...A15_SPOTS, ...A17_SPOTS]) {
      const site = MOON_SITES.find((x) => x.id === id); if (!site) continue;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.setScalar(1.3); sp.visible = false;
      sp.position.set(site.x, this.groundHeight(site.x, site.z) + (id === "lm" || id === "intrepid" || id === "falcon" || id === "challenger" ? 5.2 : id === "head" ? 4 : 2.4), site.z);
      sp.userData["y"] = sp.position.y; this.scene.add(sp); this.stars.set(id, sp);
    }
    for (const [ev, set] of [["a11:stars", A11_SPOTS], ["a12:stars", A12_SPOTS], ["a15:stars", A15_SPOTS], ["a17:stars", A17_SPOTS]] as const)
      this.disposers.push(store.on(ev, (d) => { const ids = (d as string[]) || []; this.stars.forEach((sp, id) => { if (set.includes(id)) sp.visible = ids.includes(id); }); }));
  }
  private buildPassBeacons() {
    const passes = [-210, -630, -1050];
    passes.forEach((zb, i) => {
      for (const sx of [-18, 18]) {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.6, roughness: 0.4 }));
        pole.position.y = 2.25; pole.castShadow = true; g.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd97d }));
        lamp.position.y = 4.7; lamp.name = "lamp"; g.add(lamp);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, "rgba(255,217,125,.9)"); r.addColorStop(1, "rgba(255,217,125,0)"); c.fillStyle = r; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
        glow.scale.setScalar(4); glow.position.y = 4.7; glow.name = "glow"; g.add(glow);
        g.position.set(sx, this.groundHeight(sx, zb + 14), zb + 14);
        this.scene.add(g); this.beacons.push(g);
      }
      void i;
    });
  }
  private showBanner(z: number) {
    const Z = MOON_ZONES[z]!;
    if (!this.bannerEl) {
      const d = document.createElement("div");
      d.style.cssText = "position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:40;pointer-events:none;text-align:center;padding:14px 28px;border-radius:14px;background:linear-gradient(180deg,rgba(10,14,28,.85),rgba(10,14,28,.6));border:1px solid rgba(255,217,125,.6);box-shadow:0 0 30px rgba(120,170,255,.25);color:#e8eeff;font-family:system-ui;transition:opacity .8s,transform .8s;opacity:0";
      document.body.appendChild(d); this.bannerEl = d;
    }
    const d = this.bannerEl;
    d.innerHTML = `<div style="font-size:12px;letter-spacing:.3em;color:#9fd0ff">ENTERING ZONE ${z + 1} OF 4</div><div style="font-size:24px;font-weight:800;color:#ffd97d;margin:4px 0">${Z.en}</div><div style="font-size:14px">${Z.bn} · ${Z.year}</div>`;
    d.style.opacity = "1"; d.style.transform = "translateX(-50%) translateY(0)";
    window.clearTimeout(this.bannerT);
    this.bannerT = window.setTimeout(() => { d.style.opacity = "0"; d.style.transform = "translateX(-50%) translateY(-10px)"; }, 4000);
    try { // Apollo-style Quindar beep
      const ac = new AudioContext(); const o = ac.createOscillator(), gn = ac.createGain();
      o.frequency.value = 2525; gn.gain.value = 0.08; o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.25);
      o.onended = () => ac.close();
    } catch { /* audio blocked */ }
  }

  private enterZone(z: number) {
    this.showBanner(z);
    this.zone = z; const Z = MOON_ZONES[z]!;
    const next = z < 3 ? MOON_ZONES[z + 1]! : null;
    store.set({ objective: next
      ? { en: `Explore ${Z.en.split(" · ")[0]} — then walk south through the pass to ${next.en.split(" · ")[0]}`, bn: `${Z.bn.split(" · ")[0]} ঘুরে দেখো — তারপর দক্ষিণের গিরিপথ দিয়ে ${next.bn.split(" · ")[0]}-এ যাও` }
      : { en: `Explore ${Z.en.split(" · ")[0]} — the last place humans walked on the Moon`, bn: `${Z.bn.split(" · ")[0]} ঘুরে দেখো — চাঁদে মানুষের শেষ হাঁটার জায়গা` } });
    const fl = store.get().flags;
    if (z === 0 && !fl.includes("apollo11")) store.emit("a11:arrive");
    else if (z === 1 && !fl.includes("apollo12")) store.emit("a12:arrive");
    else if (z === 2 && !fl.includes("apollo15")) store.emit("a15:arrive");
    else if (z === 3 && !fl.includes("apollo17")) store.emit("a17:arrive");
    else { if (z === 0) store.emit("a11:revisit"); if (z === 1) store.emit("a12:revisit"); if (z === 2) store.emit("a15:revisit"); if (z === 3) store.emit("a17:revisit"); store.say([{ speaker: "nova", ...Z.nova }]); }
    if (this.hud) (this.hud.querySelector("[data-coord]") as HTMLElement).textContent = `${Z.coord} · ${Z.year}`;
    this.nearSite = "-";
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    store.set({ loading: true, universe: "moon" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    this.scene.background = new THREE.Color(0x000000);
    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildRocks();
    this.buildArtifacts();
    this.buildPrints();
    this.buildLabels();
    this.buildPlayer();
    this.buildHud();

    this.zone = THREE.MathUtils.clamp(store.get().moonZone ?? 0, 0, 3);
    const sp = LM_SPOTS[this.zone]!; const sx = sp[0] + 7, sz = sp[1] + 10;
    this.player.position.set(sx, this.groundHeight(sx, sz), sz);
    this.camYaw = 0; this.player.rotation.y = Math.PI; // face south, toward the next site
    this.buildPassBeacons();
    this.buildStars();
    this.disposers.push(store.on("joystick", (d) => { this.joy = d as { x: number; y: number }; }));
    this.disposers.push(store.on("drive", (d) => { this.drive = { ...this.drive, ...(d as object) }; }));
    this.disposers.push(store.on("rover:toggle", () => this.toggleRover()));
    const onKey = (e: KeyboardEvent) => { if (e.code === "KeyF" && !e.repeat) this.toggleRover(); if (e.code === "Escape") store.emit("engine:goto", "hub"); if (e.code === "KeyM") this.bigOpen = !this.bigOpen; };
    window.addEventListener("keydown", onKey);
    this.disposers.push(() => window.removeEventListener("keydown", onKey));
    if (import.meta.env.DEV) (window as any).__moonZone = (z: number) => { const [x, zz] = LM_SPOTS[z]!; this.player.position.set(x + 7, this.groundHeight(x + 7, zz + 10), zz + 10); };
    if (import.meta.env.DEV) (window as any).__moonTeleport = (x: number, z: number) => this.player.position.set(x, this.groundHeight(x, z), z);

    window.setTimeout(() => {
      if (this.disposed) return;
      store.set({ loading: false });
      this.enterZone(this.zone);
    }, 600);
  }

  // ---------- world ----------
  private buildSky() {
    const stars = makeStarfield(6000, 1400);
    (stars.material as THREE.PointsMaterial).size = 1.6;
    this.scene.add(stars);
    // Earth hanging in the black sky
    const earth = new THREE.Mesh(new THREE.SphereGeometry(38, 48, 32), new THREE.MeshStandardMaterial({ map: earthTex(), roughness: 0.6, emissive: 0x0b1e44, emissiveIntensity: 0.25 }));
    earth.position.set(-500, 420, -900);
    this.scene.add(earth); this.earth = earth;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 30, 64, 64, 64); r.addColorStop(0, "rgba(120,170,255,0.45)"); r.addColorStop(1, "rgba(120,170,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
    halo.scale.setScalar(110); halo.position.copy(earth.position); this.scene.add(halo);
    // the Sun: blinding disc low on the horizon (Apollo 11 landed in early lunar morning)
    const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,250,235,0.9)"); r.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
    sunS.scale.setScalar(160); sunS.position.set(1100, 260, 500); this.scene.add(sunS);
  }

  private buildLights() {
    this.sun = new THREE.DirectionalLight(0xfffaf0, 3.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera; c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 1; c.far = 300;
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    // earthshine + faint bounce from the regolith — no sky, so shadows stay nearly black
    this.scene.add(new THREE.HemisphereLight(0x8fa6c9, 0x3a3836, 0.22));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  }

  private rawHeight(x: number, z: number, craters: { x: number; z: number; R: number; D: number }[]) {
    let h = (pfbm(x * 0.006 + 50, z * 0.006 + 50, 1e6, 4) - 0.5) * 9; // gentle mare swells
    h += (pfbm(x * 0.05, z * 0.05, 1e6, 3) - 0.5) * 0.9;
    const ridgeN = pfbm(x * 0.02, z * 0.02, 1e6, 4);
    const ex = Math.abs(x) / (WORLD / 2);
    h += Math.max(0, ex - 0.78) ** 2 * (180 + ridgeN * 520); // highland walls hide corridor edge
    const ez = Math.max(z - (ZMAX - 50), (ZMIN + 50) - z); if (ez > 0) h += (ez / 50) ** 2 * (40 + ridgeN * 120);
    // low ridges between landing sites with a walkable pass in the middle
    for (const zb of [-210, -630, -1050]) {
      const r = Math.exp(-(((z - zb) / 16) ** 2)); if (r < 0.01) continue;
      const gap = THREE.MathUtils.smoothstep(Math.abs(x), 14, 40);
      h += r * gap * (7 + ridgeN * 14);
    }
    // Apollo 15: sinuous Hadley Rille + Mount Hadley + Hadley Delta
    const w15 = win(z, -840, 210);
    if (w15 > 0) {
      const dx = (x - rilleX(z)) / 15; h -= w15 * 20 * Math.exp(-(dx ** 4));
      h += w15 * Math.max(0, x - 95) ** 1.5 * (0.35 + ridgeN * 0.3);
      h += Math.exp(-(((x - 40) / 70) ** 2) - (((z + 985) / 35) ** 2)) * 18;
    }
    // Apollo 17: narrow valley between the North & South Massifs
    const w17 = win(z, -1260, 220);
    if (w17 > 0) h += w17 * Math.max(0, Math.abs(x) - 75) ** 1.45 * (0.5 + ridgeN * 0.35);
    for (const c of craters) { const d = Math.hypot(x - c.x, z - c.z) / c.R; if (d < 2.2) h += crater(d, c.D); }
    return h;
  }

  private buildTerrain() {
    const rnd = mulberry(42);
    const craters = [...NAMED_CRATERS];
    for (let i = 0; i < 640; i++) {
      const R = 1.2 + Math.pow(rnd(), 2.6) * 14;
      const x = (rnd() - 0.5) * WORLD * 0.85, z = ZMIN + 40 + rnd() * (LEN - 80);
      if (LM_SPOTS.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 34 + R * 2)) continue; // keep landing sites flat
      craters.push({ x, z, R, D: R * (0.18 + rnd() * 0.1) });
    }
    craters.sort((a, b) => a.z - b.z);
    const geo = new THREE.PlaneGeometry(WORLD, LEN, SEGX, SEGZ); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, (ZMAX + ZMIN) / 2);
    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    this.heights = new Float32Array(pos.count);
    let rowZ = NaN, sub: typeof craters = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (z !== rowZ) { rowZ = z; sub = craters.filter((c) => Math.abs(c.z - z) < c.R * 2.2); }
      const h = this.rawHeight(x, z, sub); pos.setY(i, h); this.heights[i] = h;
      // albedo: fresh crater rims brighter, highlands brighter, mare darker
      let a = 0.82 + (pfbm(x * 0.02, z * 0.02, 1e6, 3) - 0.5) * 0.25;
      for (const c of sub) { const d = Math.hypot(x - c.x, z - c.z) / c.R; if (d > 0.8 && d < 1.8) a += 0.12 * (1.8 - d) * (c.R > 10 ? 1 : 0.6); }
      for (const [lx, lz] of LM_SPOTS) { const b = Math.hypot(x - lx, z - lz); if (b < 14) a += 0.18 * (1 - b / 14); } // engine-scoured halo
      a += THREE.MathUtils.clamp(h / 120, 0, 0.18); // highland anorthosite is lighter
      const zn = zoneOf(z); if (zn === 3) a *= 0.9; // dark mantle deposits of Taurus–Littrow
      let r = a, gg = a * 0.99, bb = a * 0.97;
      const sh = Math.hypot(x - 45, z + 1300) / 11; // Shorty Crater orange volcanic soil
      if (sh < 1.4) { const k = (1 - sh / 1.4) * (0.6 + pnoise(x * 0.8, z * 0.8, 1e6) * 0.4); r += k * 0.45; gg += k * 0.12; bb -= k * 0.25; }
      col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = bb;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const { map, nmap } = makeRegolithMaps();
    map.repeat.set(WORLD / 6, LEN / 6); nmap.repeat.copy(map.repeat);
    const mat = new THREE.MeshStandardMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: 0.97, metalness: 0 });
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; this.scene.add(m);
    this.bakeMinimap(craters);
  }

  groundHeight(x: number, z: number) {
    const sx = WORLD / SEGX, sz = LEN / SEGZ, n = SEGX + 1;
    const fx = THREE.MathUtils.clamp((x + WORLD / 2) / sx, 0, SEGX - 0.001), fz = THREE.MathUtils.clamp((z - ZMIN) / sz, 0, SEGZ - 0.001);
    // after rotateX(-PI/2) PlaneGeometry row 0 sits at the most negative Z
    const ix = Math.floor(fx), tx = fx - ix, iz = Math.floor(fz), tz = fz - iz;
    const h = this.heights;
    const a = h[iz * n + ix]!, b = h[iz * n + ix + 1]!, c = h[(iz + 1) * n + ix]!, d = h[(iz + 1) * n + ix + 1]!;
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  private buildRocks() {
    const rnd = mulberry(9);
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      v.multiplyScalar(0.75 + pnoise(v.x * 2.3 + 3, v.y * 2.3 + v.z * 1.7, 1e6) * 0.5); v.y *= 0.7;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const { map, nmap } = makeRegolithMaps();
    const mat = new THREE.MeshStandardMaterial({ color: 0x8e8b86, map, normalMap: nmap, roughness: 0.92, flatShading: true });
    const COUNT = 2600;
    const rocks = new THREE.InstancedMesh(g, mat, COUNT);
    const o = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      // clusters near West Crater (the boulder field Armstrong avoided) + scatter
      let x: number, z: number;
      if (i < 220) { const a = rnd() * 6.28, r = 55 + rnd() * 50; x = -150 + Math.cos(a) * r; z = -40 + Math.sin(a) * r; }
      else if (i < 420) { const a = rnd() * 6.28, r = 14 + rnd() * 26; x = -55 + Math.cos(a) * r; z = -1215 + Math.sin(a) * r; } // Camelot boulders
      else if (i < 560) { const zz = -700 - rnd() * 280; x = rilleX(zz) + (rnd() < 0.5 ? -1 : 1) * (12 + rnd() * 10); z = zz; } // rille rim blocks
      else { x = (rnd() - 0.5) * WORLD * 0.9; z = ZMIN + 30 + rnd() * (LEN - 60); }
      if (LM_SPOTS.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 12)) continue;
      const s = (i < 560 ? 0.4 + rnd() * 1.6 : 0.06 + Math.pow(rnd(), 4) * 0.9);
      o.position.set(x, this.groundHeight(x, z) + s * 0.15, z);
      o.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3); o.scale.set(s, s * (0.6 + rnd() * 0.5), s * (0.8 + rnd() * 0.4)); o.updateMatrix();
      rocks.setMatrixAt(i, o.matrix);
      if (s > 0.45) this.addRock(x, z, s * 0.85);
    }
    rocks.castShadow = rocks.receiveShadow = true;
    this.scene.add(rocks);
  }

  private rockGrid = new Map<string, [number, number, number][]>();
  private addRock(x: number, z: number, r: number) { const key = `${Math.floor(x / 8)},${Math.floor(z / 8)}`; (this.rockGrid.get(key) ?? this.rockGrid.set(key, []).get(key)!).push([x, z, r]); }
  /** push a circle of radius `pr` out of big boulders; returns true on hit */
  private pushOutRocks(p: THREE.Vector3, pr: number) {
    let hit = false; const gx = Math.floor(p.x / 8), gz = Math.floor(p.z / 8);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [x, z, r] of this.rockGrid.get(`${gx + a},${gz + b}`) ?? []) {
      const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), m = r + pr;
      if (d < m && d > 1e-4) { p.x = x + dx / d * m; p.z = z + dz / d * m; hit = true; }
    }
    return hit;
  }

  private place(obj: THREE.Object3D, x: number, z: number, ry = 0) {
    obj.position.set(x, this.groundHeight(x, z), z); obj.rotation.y = ry;
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(obj); return obj;
  }

  private buildArtifacts() {
    const foil = new THREE.MeshStandardMaterial({ map: goldFoil(), metalness: 0.85, roughness: 0.35, color: 0xffd27a });
    const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.8, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2b30, metalness: 0.4, roughness: 0.6 });
    const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.8 });

    // --- Eagle descent stage (octagonal, gold foil, 4 legs + footpads) ---
    const makeLM = (plaqueText: string[]) => {
    const lm = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.7, 8), foil); body.position.y = 2.1; body.rotation.y = Math.PI / 8; lm.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.12, 8), silver); top.position.y = 3.0; top.rotation.y = Math.PI / 8; lm.add(top);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 0.9, 20, 1, true), dark); bell.position.y = 0.9; lm.add(bell);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2), foil);
      leg.position.set(cx * 2.7, 1.4, cz * 2.7); leg.lookAt(cx * 1.6, 2.6, cz * 1.6); leg.rotateX(Math.PI / 2); lm.add(leg);
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), silver);
      strut.position.set(cx * 2.4, 0.9, cz * 2.4); strut.lookAt(cx * 1.6, 1.4, cz * 1.6); strut.rotateX(Math.PI / 2); lm.add(strut);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.14, 20), silver); pad.position.set(cx * 3.4, 0.07, cz * 3.4); lm.add(pad);
    }
    // ladder on the front (+z) leg
    for (let r = 0; r < 9; r++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), silver); rung.position.set(0, 0.35 + r * 0.28, 2.65 - r * 0.06); lm.add(rung); }
    // the plaque
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.25, map: canvasTex(256, 180, (g) => { g.fillStyle = "#c8ccd4"; g.fillRect(0, 0, 256, 180); g.fillStyle = "#222"; g.font = "bold 13px serif"; g.textAlign = "center"; plaqueText.forEach((l, i) => g.fillText(l, 128, 60 + i * 22)); g.beginPath(); g.arc(70, 26, 16, 0, 7); g.arc(186, 26, 16, 0, 7); g.stroke(); }) }));
    plaque.position.set(0, 1.55, 2.32); lm.add(plaque);
    // scattered leftover gear (jettisoned PLSS backpacks, bags)
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.8 })); bag.position.set(-3.2, 0.18, -2.6); bag.rotation.set(0.3, 0.8, 0.2); lm.add(bag);
    return lm; };
    this.place(makeLM(["HERE MEN FROM THE PLANET EARTH", "FIRST SET FOOT UPON THE MOON", "JULY 1969, A.D.", "WE CAME IN PEACE FOR", "ALL MANKIND"]), 0, 0);
    this.place(makeLM(["APOLLO 12", "INTREPID", "NOVEMBER 1969", "OCEAN OF STORMS", ""]), 30, -398, 0.4);
    this.place(makeLM(["APOLLO 15", "FALCON", "JULY 1971", "HADLEY-APENNINE", ""]), 0, -830, -0.3);
    this.place(makeLM(["HERE MAN COMPLETED HIS FIRST", "EXPLORATIONS OF THE MOON", "DECEMBER 1972, A.D.", "MAY THE SPIRIT OF PEACE", "BE REFLECTED IN THE LIVES OF ALL MANKIND"]), 0, -1255, 0.2);
    this.buildLaterSites(foil, silver, dark, black);

    // --- Flag ---
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6), silver); pole.position.y = 1.3; flag.add(pole);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5), silver); bar.rotation.z = Math.PI / 2; bar.position.set(0.75, 2.5, 0); flag.add(bar);
    const cloth = new THREE.PlaneGeometry(1.5, 0.95, 16, 4);
    const cp = cloth.attributes["position"] as THREE.BufferAttribute; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 6) * 0.04); // permanent wrinkles
    cloth.computeVertexNormals();
    const fm = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.85 })); fm.position.set(0.75, 2.02, 0); flag.add(fm);
    this.place(flag, -9, 6, 0.9);

    // --- TV camera on tripod ---
    const tv = new THREE.Group();
    for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), silver); const a = k * 2.09; l.position.set(Math.cos(a) * 0.25, 0.65, Math.sin(a) * 0.25); l.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); tv.add(l); }
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.42), black); cam.position.y = 1.4; tv.add(cam);
    this.place(tv, -22, 16, 0.6);

    // --- LRRR laser retroreflector: tilted panel with 100 prism cells ---
    const lr = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.6), silver); base.position.y = 0.06; lr.add(base);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.15, map: canvasTex(200, 200, (g) => { g.fillStyle = "#999ea8"; g.fillRect(0, 0, 200, 200); for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { const r = g.createRadialGradient(10 + x * 20, 10 + y * 20, 1, 10 + x * 20, 10 + y * 20, 9); r.addColorStop(0, "#e8f2ff"); r.addColorStop(1, "#1a2335"); g.fillStyle = r; g.beginPath(); g.arc(10 + x * 20, 10 + y * 20, 8.5, 0, 7); g.fill(); } }) }));
    panel.position.set(0, 0.42, 0.05); panel.rotation.x = -0.45; lr.add(panel);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), silver); stand.position.set(0, 0.25, -0.18); lr.add(stand);
    this.place(lr, 6, 26, 0.2);

    // --- PSEP seismometer with two solar wings ---
    const ps = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.5, 12), foil); core.position.y = 0.3; ps.add(core);
    const solar = new THREE.MeshStandardMaterial({ color: 0x1b2850, metalness: 0.6, roughness: 0.25, map: canvasTex(128, 64, (g) => { g.fillStyle = "#14203f"; g.fillRect(0, 0, 128, 64); g.strokeStyle = "#7f8db0"; for (let x = 0; x < 128; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); } for (let y = 0; y < 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } }) });
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.55), solar); w.position.set(s * 0.82, 0.45, 0); w.rotation.z = s * 0.12; ps.add(w); }
    this.place(ps, -4, 30, -0.3);

    // --- Aldrin's famous bootprint (raised rim, big decal) + EVA trails ---
    const bootM = new THREE.MeshBasicMaterial({ map: bootTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const big = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), bootM); big.rotation.x = -Math.PI / 2; big.position.set(-5, this.groundHeight(-5, 13) + 0.03, 13); this.scene.add(big);
    const trail = (pts: [number, number][], n: number) => {
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.34), bootM, n);
      const o = new THREE.Object3D(); let k = 0;
      for (let s = 0; s < pts.length - 1 && k < n; s++) {
        const [ax, az] = pts[s]!, [bx, bz] = pts[s + 1]!; const L = Math.hypot(bx - ax, bz - az); const ang = Math.atan2(bx - ax, bz - az);
        for (let d = 0; d < L && k < n; d += 0.55, k++) {
          const t = d / L, side = k % 2 ? 0.14 : -0.14, x = ax + (bx - ax) * t + Math.cos(ang) * side, z = az + (bz - az) * t - Math.sin(ang) * side;
          o.position.set(x, this.groundHeight(x, z) + 0.025, z); o.rotation.set(-Math.PI / 2, 0, ang + Math.PI); o.updateMatrix(); im.setMatrixAt(k, o.matrix);
        }
      }
      im.count = k; this.scene.add(im);
    };
    trail([[0, 3], [-9, 6], [-22, 16], [-5, 13], [6, 26], [-4, 30], [0, 3]], 260);
    trail([[2, 2], [40, 3], [72, 4]], 150); // Armstrong's run to Little West Crater
  }


  private buildLaterSites(foil: THREE.Material, silver: THREE.Material, dark: THREE.Material, black: THREE.Material) {
    const dusty = new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.75, metalness: 0.3 }); // Surveyor's paint browned by 31 months of sun
    // --- Surveyor 3: tripod robot lander on the crater slope ---
    const sv = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 3), dusty); frame.position.y = 1.0; sv.add(frame);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2), silver); mast.position.y = 2.0; sv.add(mast);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094, cx = Math.cos(a), cz = Math.sin(a);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), dusty); leg.position.set(cx * 1.15, 0.55, cz * 1.15); leg.lookAt(cx * 0.6, 1.1, cz * 0.6); leg.rotateX(Math.PI / 2); sv.add(leg);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.08, 14), dusty); pad.position.set(cx * 1.6, 0.04, cz * 1.6); sv.add(pad);
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), silver); tank.position.set(cx * 0.45, 0.8, cz * 0.45); sv.add(tank);
    }
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.6), new THREE.MeshStandardMaterial({ color: 0x1b2850, metalness: 0.6, roughness: 0.3 })); sp.position.set(0, 3.1, 0.25); sp.rotation.x = -0.6; sv.add(sp);
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.5), silver); ant.position.set(0, 2.9, -0.3); ant.rotation.x = 0.7; sv.add(ant);
    const tvc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.55, 12), dusty); tvc.position.set(0.5, 1.45, 0.2); tvc.rotation.z = 0.5; sv.add(tvc); // the camera Apollo 12 brought home
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), silver); scoop.position.set(-0.4, 0.9, 0.7); scoop.rotation.x = 0.4; sv.add(scoop);
    const svp = this.place(sv, -8, -430, 0.8); svp.rotation.x = 0.12; // sits tilted on the slope
    // ALSEP station
    const al = new THREE.Group();
    const cs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.45), foil); cs.position.y = 0.2; al.add(cs);
    const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), dark); rtg.position.set(1.4, 0.25, 0.3); al.add(rtg);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.15, 16, 1, true), silver); dish.position.set(0, 0.7, 0); dish.rotation.x = Math.PI; al.add(dish);
    this.place(al, 62, -412);

    // --- Lunar Roving Vehicle factory ---
    const makeLRV = () => {
      const g = new THREE.Group();
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 3.0), silver); ch.position.y = 0.55; g.add(ch);
      const wheel = new THREE.TorusGeometry(0.4, 0.1, 8, 20); const wm = new THREE.MeshStandardMaterial({ color: 0x8c8a84, metalness: 0.7, roughness: 0.5, wireframe: false });
      for (const [x, z] of [[-0.8, 1.1], [0.8, 1.1], [-0.8, -1.1], [0.8, -1.1]] as const) {
        const w = new THREE.Mesh(wheel, wm); w.rotation.y = Math.PI / 2; w.position.set(x, 0.42, z); w.name = "wheel"; g.add(w);
        for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), dark); sp.rotation.x = k * Math.PI / 3; w.add(sp); } // spokes show the spin
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.9), dark); f.position.set(x, 0.92, z); g.add(f); // fenders
      }
      for (const x of [-0.3, 0.3]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.8 })); seat.position.set(x, 0.85, -0.1); seat.rotation.x = -0.2; g.add(seat); }
      const con = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.12), black); con.position.set(0, 1.05, 0.55); g.add(con);
      const um = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.18, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8e8e2, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }));
      um.position.set(0.35, 1.9, 1.15); um.rotation.x = -2.4; g.add(um); // high-gain "umbrella" antenna
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), silver); pole.position.set(0.35, 1.3, 1.1); g.add(pole);
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), foil); cam.position.set(-0.3, 1.4, 1.2); g.add(cam);
      return g;
    };
    for (const [id, x, z, ry] of [["lrv15", -14, -846, 1.1], ["lrv17", 12, -1268, -0.7]] as const) {
      const g = this.place(makeLRV(), x, z, ry) as THREE.Group; const wheels: THREE.Object3D[] = []; g.traverse((o) => { if (o.name === "wheel") wheels.push(o); });
      this.rovers.push({ id, g, wheels });
      loader().load("/models/lrv.glb", (gl) => {
        if (this.disposed) return;
        const m = gl.scene; const box = new THREE.Box3().setFromObject(m); const sz = box.getSize(new THREE.Vector3());
        const k = 3.1 / Math.max(sz.x, sz.z, 0.001); m.scale.setScalar(k); m.rotation.y = -Math.PI / 2;
        const c = box.getCenter(new THREE.Vector3()); m.position.set(c.z * k, -box.min.y * k, -c.x * k);
        m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        for (const ch of [...g.children]) ch.visible = false;
        g.add(m);
      });
    }

    // --- Fallen Astronaut figurine + plaque (shown big enough for kids to spot) ---
    const fa = new THREE.Group();
    const fig = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: 0.9, roughness: 0.2 })); fig.rotation.z = Math.PI / 2; fig.position.y = 0.06; fa.add(fig);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.3, map: canvasTex(256, 150, (g) => { g.fillStyle = "#cfd3da"; g.fillRect(0, 0, 256, 150); g.fillStyle = "#222"; g.font = "bold 14px serif"; g.textAlign = "center"; g.fillText("IN MEMORY OF", 128, 30); g.font = "10px serif"; ["GAGARIN · KOMAROV · GRISSOM", "WHITE · CHAFFEE · BASSETT", "SEE · FREEMAN · WILLIAMS", "DOBROVOLSKY · PATSAYEV · VOLKOV", "BELYAYEV · BONDARENKO"].forEach((l, i) => g.fillText(l, 128, 56 + i * 18)); }) }));
    pl.rotation.x = -Math.PI / 2; pl.position.set(0.45, 0.02, 0); fa.add(pl);
    this.place(fa, -7, -818);
    // --- Hammer & falcon feather lying side by side ---
    const hf = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), dark); handle.rotation.z = Math.PI / 2; handle.position.y = 0.03; hf.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), silver); head.position.set(0.2, 0.04, 0); hf.add(head);
    const feather = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.28), new THREE.MeshStandardMaterial({ color: 0x8a6a48, side: THREE.DoubleSide })); feather.rotation.x = -Math.PI / 2; feather.position.set(0, 0.015, 0.2); hf.add(feather);
    this.place(hf, 8, -842);

    // --- "TDC" initials + Cernan's last footprints ---
    const tdc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: canvasTex(256, 112, (g) => { g.font = "bold 90px system-ui"; g.textAlign = "center"; g.fillStyle = "rgba(40,38,36,.55)"; g.fillText("TDC", 128, 92); }) }));
    tdc.rotation.x = -Math.PI / 2; tdc.position.set(-8, this.groundHeight(-8, -1270) + 0.03, -1270); this.scene.add(tdc);
    const bootM = new THREE.MeshBasicMaterial({ map: bootTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const last = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), bootM); last.rotation.x = -Math.PI / 2; last.position.set(3, this.groundHeight(3, -1247) + 0.03, -1247); this.scene.add(last);
    // old EVA trails + LRV tyre tracks at the later sites
    const tracks = (pts: [number, number][], w: number, step: number, n: number, mat: THREE.Material) => {
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, step * 0.9), mat, n); const o = new THREE.Object3D(); let k = 0;
      for (let s = 0; s < pts.length - 1 && k < n; s++) {
        const [ax, az] = pts[s]!, [bx, bz] = pts[s + 1]!; const L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
        for (let d = 0; d < L && k < n; d += step, k++) { const x = ax + (bx - ax) * d / L, z = az + (bz - az) * d / L; o.position.set(x, this.groundHeight(x, z) + 0.025, z); o.rotation.set(-Math.PI / 2, 0, ang); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }
      }
      im.count = k; this.scene.add(im);
    };
    const tyre = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: canvasTex(64, 64, (g) => { g.fillStyle = "rgba(30,28,26,.35)"; for (const x of [4, 50]) { for (let y = 0; y < 64; y += 8) g.fillRect(x, y, 10, 5); } }) });
    tracks([[-14, -846], [-30, -870], [-42, -900], [-20, -960], [30, -975], [20, -900], [-14, -846]], 1.8, 0.8, 600, tyre);
    tracks([[12, -1268], [35, -1292], [40, -1305], [-30, -1240], [-50, -1225], [12, -1268]], 1.8, 0.8, 600, tyre);
    tracks([[30, -398], [10, -414], [-6, -428]], 0.4, 0.55, 120, bootM); // Conrad & Bean's walk to Surveyor
  }

  private buildPrints() {
    this.prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.34), new THREE.MeshBasicMaterial({ map: bootTex(), transparent: true, depthWrite: false }), 500);
    this.prints.count = 0; this.scene.add(this.prints);
    const n = 60, arr = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb8b4ac, size: 0.06, transparent: true, opacity: 0 }));
    this.dust.userData["v"] = new Float32Array(n * 3);
    this.scene.add(this.dust);
    const rn = 260, rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(rn * 3).fill(-9999), 3));
    this.rDust = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xc4beb2, size: 0.14, transparent: true, opacity: 0.75, depthWrite: false }));
    this.rDust.userData["v"] = new Float32Array(rn * 3); this.rDust.frustumCulled = false; this.scene.add(this.rDust);
    const tyre = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: canvasTex(64, 64, (g) => { g.fillStyle = "rgba(30,28,26,.4)"; for (const x of [2, 52]) for (let y = 0; y < 64; y += 8) g.fillRect(x, y, 10, 5); }) });
    this.rTracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8, 0.75), tyre, 900); this.rTracks.count = 0; this.rTracks.frustumCulled = false; this.scene.add(this.rTracks);
  }

  private toggleRover() {
    if (this.driving) {
      const g = this.driving.g, side = new THREE.Vector3(Math.cos(this.rHead), 0, -Math.sin(this.rHead)).multiplyScalar(-1.8);
      const px = g.position.x + side.x, pz = g.position.z + side.z; this.player.position.set(px, this.groundHeight(px, pz), pz);
      g.rotation.set(0, this.rHead, 0); this.driving = null; this.rSpeed = 0; this.camDist = 7; this.vel.set(0, 0, 0);
      store.set({ moonDriving: false, moonSpeed: 0 }); return;
    }
    if (store.get().moonFreeze) return;
    const p = this.player.position; const r = this.rovers.find((v) => Math.hypot(v.g.position.x - p.x, v.g.position.z - p.z) < 4.5);
    if (!r) return;
    this.driving = r; this.rHead = r.g.rotation.y; this.rSpeed = 0; this.camDist = 10; this.camYaw = this.rHead + Math.PI;
    store.set({ moonDriving: true, moonRover: null });
  }

  /** Seated driving pose: blend hips/knees/arms toward a sitting posture (bones are in the model's rest frame, forward = +Z). */
  private applySeat(dt: number) {
    this.sitK = THREE.MathUtils.damp(this.sitK, this.driving ? 1 : 0, 8, dt);
    const k = this.sitK; if (k < 0.002) return;
    const B = this.bones, e = new THREE.Euler(), q = new THREE.Quaternion();
    const pose: [string, number, number, number][] = [
      ["L_Hip", -1.55, 0, -0.12], ["R_Hip", -1.55, 0, 0.12],
      ["L_Knee", 1.6, 0, 0], ["R_Knee", 1.6, 0, 0],
      ["L_Ankle", -0.2, 0, 0], ["R_Ankle", -0.2, 0, 0],
      ["Spine1", 0.12, 0, 0],
      ["L_Shoulder", -0.9, 0, 0.35], ["R_Shoulder", -0.9, 0, -0.35],
      ["L_Elbow", -0.7, 0, 0], ["R_Elbow", -0.7, 0, 0],
    ];
    for (const [n, x, y, z] of pose) { const b = B[n]; if (!b) continue; q.setFromEuler(e.set(x * k, y * k, z * k)); b.quaternion.multiply(q); }
  }

  private updateRover(dt: number, k: Set<string>) {
    const R = this.driving!; const g = R.g; const frozen = store.get().moonFreeze;
    const steer = frozen ? 0 : THREE.MathUtils.clamp((k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + this.joy.x, -1, 1);
    const gas = !frozen && (k.has("KeyW") || k.has("ArrowUp") || this.drive.gas || this.joy.y > 0.4);
    const brake = !frozen && (k.has("KeyS") || k.has("ArrowDown") || k.has("Space") || this.drive.brake || this.joy.y < -0.4);
    if (gas) this.rSpeed += ROVER_ACCEL * dt;
    else if (brake) this.rSpeed = this.rSpeed > 0.2 ? Math.max(0, this.rSpeed - ROVER_BRAKE * dt) : Math.max(-ROVER_REV, this.rSpeed - ROVER_ACCEL * 0.5 * dt);
    else this.rSpeed *= Math.exp(-ROVER_DRAG * dt);
    this.rSpeed = THREE.MathUtils.clamp(this.rSpeed, -ROVER_REV, ROVER_MAX); if (Math.abs(this.rSpeed) < 0.02 && !gas && !brake) this.rSpeed = 0;
    this.rHead -= steer * ROVER_TURN * dt * THREE.MathUtils.clamp(0.45 + Math.abs(this.rSpeed) / 3, 0, 1) * Math.sign(this.rSpeed || 1);
    const p = g.position; p.x += Math.sin(this.rHead) * this.rSpeed * dt; p.z += Math.cos(this.rHead) * this.rSpeed * dt;
    const lim = WORLD / 2 - 40; p.x = THREE.MathUtils.clamp(p.x, -lim, lim); p.z = THREE.MathUtils.clamp(p.z, ZMIN + 60, ZMAX - 40);
    for (const [lx, lz] of LM_SPOTS) { const dx = p.x - lx, dz = p.z - lz, r = Math.hypot(dx, dz); if (r < 4 && r > 0) { p.x = lx + dx * 4 / r; p.z = lz + dz * 4 / r; this.rSpeed *= 0.5; } }
    if (this.pushOutRocks(p, 1.4)) this.rSpeed *= Math.exp(-8 * dt);
    // follow the ground: pitch/roll from height samples + a small low-g bounce
    const fx = Math.sin(this.rHead), fz = Math.cos(this.rHead);
    const hF = this.groundHeight(p.x + fx * 1.3, p.z + fz * 1.3), hB = this.groundHeight(p.x - fx * 1.3, p.z - fz * 1.3);
    const hL = this.groundHeight(p.x + fz * 0.8, p.z - fx * 0.8), hR = this.groundHeight(p.x - fz * 0.8, p.z + fx * 0.8);
    const bounce = Math.abs(this.rSpeed) > 4 ? Math.abs(Math.sin(performance.now() * 0.006)) * 0.05 * (Math.abs(this.rSpeed) / ROVER_MAX) : 0;
    p.y = THREE.MathUtils.lerp(p.y, (hF + hB + hL + hR) / 4 + bounce, Math.min(1, dt * 12));
    g.rotation.set(0, 0, 0); g.rotateY(this.rHead); g.rotateX(-Math.atan2(hF - hB, 2.6)); g.rotateZ(Math.atan2(hL - hR, 1.6));
    for (const w of R.wheels) w.rotateX(this.rSpeed * dt / 0.45);
    // driver sits on the seat
    const seat = new THREE.Vector3(-0.3, -0.32 * this.sitK, -0.1).applyQuaternion(g.quaternion).add(g.position);
    this.player.position.copy(seat); this.player.rotation.set(0, this.rHead, 0); this.vel.set(0, 0, 0); this.grounded = true;
    // camera chases behind the rover
    this.camYaw = THREE.MathUtils.lerp(this.camYaw, this.rHead + Math.PI, Math.min(1, dt * 2.5 * (Math.abs(this.rSpeed) > 0.5 ? 1 : 0)));
    // rooster-tail dust from the rear wheels
    const sp = Math.abs(this.rSpeed), pos = this.rDust.geometry.attributes["position"] as THREE.BufferAttribute, v = this.rDust.userData["v"] as Float32Array;
    const emit = sp > 0.8 ? Math.ceil(sp * 1.4) : 0;
    for (let e = 0; e < emit; e++) {
      const i = this.rDustI++ % pos.count, side = e % 2 ? 0.8 : -0.8, back = this.rSpeed > 0 ? -1.2 : 1.2;
      pos.setXYZ(i, p.x + fz * side + fx * back + (Math.random() - 0.5) * 0.3, p.y + 0.15, p.z - fx * side + fz * back + (Math.random() - 0.5) * 0.3);
      const k2 = 0.25 + Math.random() * 0.35; v[i * 3] = -fx * this.rSpeed * k2 + (Math.random() - 0.5) * 1.2; v[i * 3 + 1] = 0.8 + Math.random() * sp * 0.25; v[i * 3 + 2] = -fz * this.rSpeed * k2 + (Math.random() - 0.5) * 1.2;
    }
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); if (y < -9000) continue;
      v[i * 3 + 1]! -= GRAVITY * dt; const nx = pos.getX(i) + v[i * 3]! * dt, nz = pos.getZ(i) + v[i * 3 + 2]! * dt, ny = y + v[i * 3 + 1]! * dt;
      if (ny < this.groundHeight(nx, nz) - 0.05) pos.setXYZ(i, 0, -9999, 0); else pos.setXYZ(i, nx, ny, nz); // no air: dust falls straight back in an arc
    }
    pos.needsUpdate = true;
    // fresh tyre tracks behind the wheels
    if (sp > 0.3 && p.distanceTo(this.rLastTrack) > 0.7) {
      this.rLastTrack.copy(p); const o = new THREE.Object3D(); o.position.set(p.x, this.groundHeight(p.x, p.z) + 0.03, p.z); o.rotation.set(-Math.PI / 2, 0, this.rHead); o.updateMatrix();
      this.rTracks.setMatrixAt(this.rTrackI % 900, o.matrix); this.rTrackI++; this.rTracks.count = Math.min(this.rTrackI, 900); this.rTracks.instanceMatrix.needsUpdate = true;
    }
    const kmh = Math.round(sp * 3.6); if (kmh !== store.get().moonSpeed) store.set({ moonSpeed: kmh });
  }

  private buildLabels() {
    for (const site of MOON_SITES) {
      const s = labelSprite(site.en, site.info);
      const big = site.r > 15;
      if (big) s.scale.set(16, 4, 1);
      s.position.set(site.x, this.groundHeight(site.x, site.z) + (big ? 14 : site.r === 9 ? 6 : 2.6), site.z);
      this.scene.add(s); this.labels.push({ s, site });
    }
  }

  private buildPlayer() {
    // placeholder until the astronaut model loads
    const suit = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.7 }));
    suit.position.y = 0.9; suit.castShadow = true; this.player.add(suit);
    this.scene.add(this.player);
    loader().load("/models/astronaut.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene; const box = new THREE.Box3().setFromObject(m); const k = 1.8 / Math.max(box.getSize(new THREE.Vector3()).y, 0.001);
      m.scale.setScalar(k); m.position.y = -box.min.y * k;
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      suit.visible = false; this.player.add(m);
      m.traverse((o) => { if (o.name) this.bones[o.name] = o; });
      if (gltf.animations[0]) { this.mixer = new THREE.AnimationMixer(m); this.walk = this.mixer.clipAction(gltf.animations[0]); this.walk.play(); }
    });
  }

  // ---------- HUD + minimap ----------
  private buildHud() {
    const hud = document.createElement("div");
    hud.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;pointer-events:none;text-align:center;font-family:system-ui,sans-serif;color:#dfe7f5;text-shadow:0 1px 4px #000";
    hud.innerHTML = `<div data-coord style="font-size:10px;letter-spacing:.4em;opacity:.6">MARE TRANQUILLITATIS · 0.674°N 23.473°E</div><div data-site style="font-size:15px;letter-spacing:.18em;color:#ffd97d;margin-top:4px">TRANQUILITY BASE · APOLLO 11</div>`;
    document.body.appendChild(hud); this.hud = hud;
    const back = document.createElement("button");
    back.textContent = "🏛️ HUB";
    back.style.cssText = "position:fixed;left:16px;bottom:150px;z-index:41;padding:8px 14px;border-radius:999px;border:1px solid rgba(200,220,255,.5);background:rgba(8,12,22,.6);color:#dfe7f5;font:600 12px system-ui;letter-spacing:.15em;cursor:pointer";
    back.onclick = () => store.emit("engine:goto", "hub");
    document.body.appendChild(back); this.disposers.push(() => back.remove());
    const c = document.createElement("canvas"); c.width = c.height = 220;
    c.className = "game-minimap"; c.style.cssText = "position:fixed;top:72px;right:16px;width:180px;height:180px;border-radius:50%;border:2px solid rgba(200,220,255,.7);box-shadow:0 0 20px rgba(0,0,0,.6);z-index:40;background:#111;cursor:pointer;pointer-events:auto";
    c.title = "Open map";
    const stop = (e: Event) => e.stopPropagation();
    c.addEventListener("pointerdown", stop);
    c.addEventListener("click", (e) => { e.stopPropagation(); this.bigOpen = true; });
    document.body.appendChild(c); this.mini = c;
    this.disposers.push(() => { c.remove(); this.big?.remove(); });
  }

  private bakeMinimap(craters: { x: number; z: number; R: number }[]) {
    const W = WORLD / 2, H = LEN / 2; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wx = x * 2 - WORLD / 2, wz = ZMIN + y * 2;
      const h0 = this.groundHeight(wx, wz), sl = (this.groundHeight(wx + 2, wz) - h0) * 22;
      const v = THREE.MathUtils.clamp(95 + h0 * 2.2 + sl, 20, 235);
      const orange = Math.hypot(wx - 45, wz + 1300) < 13;
      const p = (y * W + x) * 4; img.data[p] = orange ? v * 1.35 : v; img.data[p + 1] = v; img.data[p + 2] = orange ? v * 0.7 : v * 1.05; img.data[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(255,255,255,.15)"; for (const k of craters) if (k.R > 8) { g.beginPath(); g.arc((k.x + WORLD / 2) / 2, (k.z - ZMIN) / 2, k.R / 2, 0, 7); g.stroke(); }
    this.miniBg = c;
  }

  private drawBigMap() {
    if (!this.bigOpen) { if (this.big) this.big.style.display = "none"; return; }
    if (!this.big) {
      const c = document.createElement("canvas");
      c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:45;background:rgba(4,6,12,.94);cursor:pointer";
      c.addEventListener("pointerdown", (e) => e.stopPropagation());
      c.addEventListener("click", (e) => { e.stopPropagation(); this.bigOpen = false; });
      document.body.appendChild(c); this.big = c;
    }
    const c = this.big; c.style.display = "block";
    const W = (c.width = innerWidth), H = (c.height = innerHeight), g = c.getContext("2d")!;
    // whole corridor, zone 1 at top -> zone 4 at bottom (like Mars)
    const top = ZONE_Z[0]! + 210, bot = ZONE_Z[3]! - 210, depth = top - bot, wid = 300;
    const sc = Math.min((W * 0.8) / wid, (H * 0.84) / depth), ox = W / 2, oy = H * 0.08;
    const toX = (x: number) => ox + x * sc, toY = (z: number) => oy + (top - z) * sc;
    g.save(); g.beginPath(); g.rect(toX(-wid / 2), oy, wid * sc, depth * sc); g.clip();
    g.translate(toX(-WORLD / 2), toY(ZMIN)); g.scale(1, -1); g.drawImage(this.miniBg, 0, 0, WORLD * sc, LEN * sc); g.restore();
    g.textAlign = "left";
    MOON_ZONES.forEach((zn, i) => {
      const y0 = toY(ZONE_Z[i]! + 210), h = 420 * sc;
      g.strokeStyle = i === this.zone ? "rgba(255,217,125,.95)" : "rgba(200,220,255,.45)"; g.lineWidth = i === this.zone ? 3 : 1.5; g.setLineDash([6, 6]);
      g.strokeRect(toX(-wid / 2), y0, wid * sc, h); g.setLineDash([]);
      g.fillStyle = "rgba(0,0,0,.65)"; g.fillRect(toX(-wid / 2) + 6, y0 + 6, Math.min(wid * sc - 12, 340), 22);
      g.fillStyle = i === this.zone ? "#ffd97d" : "#cfe0ff"; g.font = "bold 12px system-ui";
      g.fillText(`${i + 1}. ${zn.en} · ${zn.year}`, toX(-wid / 2) + 12, y0 + 21);
    });
    // passes between zones
    g.fillStyle = "#ffd97d"; g.textAlign = "center"; g.font = "bold 11px system-ui";
    for (const zb of [-210, -630, -1050]) { g.beginPath(); g.arc(toX(0), toY(zb), 5, 0, 7); g.fill(); g.fillText("▼ PASS", toX(0) + 34, toY(zb) + 4); }
    // landers only (keeps it readable)
    MOON_SITES.forEach((s) => { if (s.r !== 9) return; const x = toX(s.x), y = toY(s.z);
      g.fillStyle = "#ffd97d"; g.strokeStyle = "#000"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 11px system-ui"; g.fillText(s.en.split(" (")[0]!.split(" ·")[0]!, x, y - 10); });
    const p = this.player.position;
    g.fillStyle = "#4fd1ff"; g.strokeStyle = "#000"; g.beginPath(); g.arc(toX(p.x), toY(p.z), 7, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 12px system-ui"; g.fillText("YOU", toX(p.x), toY(p.z) - 12);
    g.fillStyle = "#ffd97d"; g.font = "bold 18px system-ui"; g.fillText("LUNAR HERITAGE CORRIDOR", W / 2, 30);
    g.fillStyle = "#cfe0ff"; g.font = "12px system-ui"; g.fillText("Tap anywhere to close · মানচিত্র বন্ধ করতে চাপো", W / 2, H - 16);
  }

  private drawMinimap() {
    this.drawBigMap();
    const g = this.mini.getContext("2d")!, S = 220, scale = 1.4; // px per metre
    const p = this.player.position;
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip();
    g.translate(S / 2, S / 2); g.rotate(this.camYaw); g.scale(scale, scale); g.translate(-p.x, -p.z);
    g.drawImage(this.miniBg, -WORLD / 2, ZMIN, WORLD, LEN);
    // EVA traverse line
    g.strokeStyle = "rgba(255,217,125,.7)"; g.lineWidth = 0.6; g.setLineDash([2, 2]); g.beginPath();
    [[0, 3], [-9, 6], [-22, 16], [-5, 13], [6, 26], [-4, 30], [0, 3]].forEach(([x, z], i) => (i ? g.lineTo(x!, z!) : g.moveTo(x!, z!))); g.stroke(); g.setLineDash([]);
    g.restore();
    // markers drawn upright
    const toScreen = (x: number, z: number) => { const dx = (x - p.x) * scale, dz = (z - p.z) * scale; const c = Math.cos(this.camYaw), s = Math.sin(this.camYaw); return [S / 2 + dx * c - dz * s, S / 2 + dx * s + dz * c] as const; };
    g.font = "bold 10px system-ui"; g.textAlign = "center";
    for (const site of MOON_SITES) {
      if ((site.zone ?? 0) !== this.zone) continue;
      let [x, y] = toScreen(site.x, site.z); const d = Math.hypot(x - S / 2, y - S / 2); const edge = d > S / 2 - 12;
      if (edge) { x = S / 2 + ((x - S / 2) / d) * (S / 2 - 12); y = S / 2 + ((y - S / 2) / d) * (S / 2 - 12); }
      if (this.stars.get(site.id)?.visible) { g.fillStyle = "#ffd23f"; g.font = `bold ${14 + Math.sin(performance.now() / 200) * 2}px system-ui`; g.fillText("★", x, y + 5); g.font = "bold 10px system-ui"; }
      else { g.fillStyle = site.r === 9 ? "#ffd97d" : "#9fd0ff"; g.beginPath(); g.arc(x, y, site.r === 9 ? 5 : 3.5, 0, 7); g.fill(); }
      const near = Math.hypot(site.x - p.x, site.z - p.z) < 18 || site.r > 15;
      if (!edge && near) { g.fillStyle = "rgba(0,0,0,.6)"; const w = g.measureText(site.en.split(" ·")[0]!).width; g.fillRect(x - w / 2 - 2, y - 17, w + 4, 12); g.fillStyle = "#fff"; g.fillText(site.en.split(" ·")[0]!.split(" (")[0]!, x, y - 8); }
    }
    if (this.zone < 3) { const pz = [-210, -630, -1050][this.zone]!; const [ax, ay] = toScreen(0, pz); const d = Math.hypot(ax - S / 2, ay - S / 2) || 1, k2 = Math.min(1, (S / 2 - 14) / d);
      g.fillStyle = "#ffd97d"; g.beginPath(); g.arc(S / 2 + (ax - S / 2) * k2, S / 2 + (ay - S / 2) * k2, 5, 0, 7); g.fill();
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(40, S - 30, S - 80, 16); g.fillStyle = "#ffd97d"; g.fillText(`NEXT ZONE · ${Math.round(Math.abs(p.z - pz))}m`, S / 2, S - 18); }
    // player arrow
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 - 5, S / 2 + 6); g.lineTo(S / 2 + 5, S / 2 + 6); g.fill();
    g.fillStyle = "#cfe0ff"; g.font = "bold 11px system-ui"; g.fillText("N", S / 2 + Math.sin(-this.camYaw + Math.PI) * -95, S / 2 + Math.cos(-this.camYaw + Math.PI) * 95);
  }

  // ---------- input ----------
  onPointerDown(x: number, y: number) { this.dragging = true; this.last = { x, y }; }
  onPointerMove(x: number, y: number) {
    if (!this.dragging) return;
    const sens = store.get().camSens * (matchMedia("(pointer: coarse)").matches ? 0.7 : 1);
    this.camYaw -= (x - this.last.x) * 2.4 * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + (y - this.last.y) * 1.6 * sens, 0.05, 1.1);
    this.last = { x, y };
  }
  onPointerUp() { this.dragging = false; }
  onWheel(d: number) { this.camDist = THREE.MathUtils.clamp(this.camDist + d * 0.01, 3.5, 16); }
  onKey(code: string, down: boolean) {
    if (down) this.keys.add(code); else this.keys.delete(code);
    if (down && code === "Space" && this.grounded && !this.driving) { this.vy = JUMP_V; this.grounded = false; }
  }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  private kickDust() {
    const pos = this.dust.geometry.attributes["position"] as THREE.BufferAttribute; const v = this.dust.userData["v"] as Float32Array;
    const p = this.player.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, p.x, p.y + 0.05, p.z);
      const a = Math.random() * 6.28, s = 0.6 + Math.random() * 1.4; v[i * 3] = Math.cos(a) * s; v[i * 3 + 1] = 0.6 + Math.random() * 1.2; v[i * 3 + 2] = Math.sin(a) * s;
    }
    pos.needsUpdate = true; this.dustLife = 1.6;
  }

  update(dt: number, t: number) {
    const k = store.get().moonFreeze ? new Set<string>() : this.keys;
    const ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + (store.get().moonFreeze ? 0 : this.joy.x);
    const iy = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + (store.get().moonFreeze ? 0 : this.joy.y);
    const p = this.player.position;
    if (this.driving) this.updateRover(dt, this.keys);
    else if (ix * ix + iy * iy > 0.001) {
      const l = Math.hypot(ix, iy), x = ix / l, y = iy / l, s = Math.sin(this.camYaw), c = Math.cos(this.camYaw);
      const dir = new THREE.Vector3(x * c - y * s, 0, -y * c - x * s).multiplyScalar(k.has("ShiftLeft") ? SPEED * 1.6 : SPEED);
      this.vel.lerp(dir, dt * (this.grounded ? 5 : 1.2)); // little air control: momentum carries in low g
      this.player.rotation.y = Math.atan2(this.vel.x, this.vel.z);
    } else if (this.grounded) this.vel.multiplyScalar(Math.exp(-6 * dt));
    if (!this.driving) {
    p.addScaledVector(this.vel, dt);
    const lim = WORLD / 2 - 40; p.x = THREE.MathUtils.clamp(p.x, -lim, lim); p.z = THREE.MathUtils.clamp(p.z, ZMIN + 60, ZMAX - 40);
    this.pushOutRocks(p, 0.35);
    // keep out of the lander bodies
    for (const [lx, lz] of LM_SPOTS) { const dx = p.x - lx, dz = p.z - lz, r = Math.hypot(dx, dz); if (r < 2.4 && r > 0) { p.x = lx + dx * 2.4 / r; p.z = lz + dz * 2.4 / r; } }
    const zn = zoneOf(p.z); if (zn !== this.zone) this.enterZone(zn);
    // low-gravity vertical motion + bunny hop while walking
    const gy = this.groundHeight(p.x, p.z);
    const moving = this.vel.length() > 0.5;
    if (this.grounded && moving && Math.sin(t * 5.5) > 0.97) { this.vy = 1.1; this.grounded = false; }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt; p.y += this.vy * dt;
      if (p.y <= gy) { p.y = gy; this.grounded = true; if (this.vy < -2) this.kickDust(); this.vy = 0; }
    } else p.y = gy;
    }
    const gyNow = this.groundHeight(p.x, p.z);
    const zn2 = zoneOf(p.z); if (zn2 !== this.zone) this.enterZone(zn2);
    if (!this.driving) { const rv = this.rovers.find((v) => Math.hypot(v.g.position.x - p.x, v.g.position.z - p.z) < 4.5); const id = rv ? rv.id : null; if (id !== store.get().moonRover) store.set({ moonRover: id }); }
    { const zr = this.zone === 2 ? this.rovers[0] : this.zone === 3 ? this.rovers[1] : null; const d = zr && !this.driving ? Math.round(Math.hypot(zr.g.position.x - p.x, zr.g.position.z - p.z)) : -1; if (d !== store.get().moonRoverDist) store.set({ moonRoverDist: d }); }

    // persistent bootprints — no wind on the Moon, they stay forever
    if (!this.driving && this.grounded && p.distanceTo(this.lastPrint) > 0.55) {
      this.lastPrint.copy(p); const o = new THREE.Object3D(); const side = this.printIdx % 2 ? 0.14 : -0.14, a = this.player.rotation.y;
      o.position.set(p.x + Math.cos(a) * side, gyNow + 0.025, p.z - Math.sin(a) * side); o.rotation.set(-Math.PI / 2, 0, a + Math.PI); o.updateMatrix();
      this.prints.setMatrixAt(this.printIdx % 500, o.matrix); this.printIdx++; this.prints.count = Math.min(this.printIdx, 500); this.prints.instanceMatrix.needsUpdate = true;
    }
    if (this.dustLife > 0) {
      this.dustLife -= dt; const pos = this.dust.geometry.attributes["position"] as THREE.BufferAttribute; const v = this.dust.userData["v"] as Float32Array;
      for (let i = 0; i < pos.count; i++) { v[i * 3 + 1]! -= GRAVITY * dt; pos.setXYZ(i, pos.getX(i) + v[i * 3]! * dt, Math.max(gyNow, pos.getY(i) + v[i * 3 + 1]! * dt), pos.getZ(i) + v[i * 3 + 2]! * dt); }
      pos.needsUpdate = true; (this.dust.material as THREE.PointsMaterial).opacity = Math.max(0, this.dustLife / 1.6) * 0.8;
    }
    if (this.mixer && this.walk) { this.walk.timeScale = this.driving ? 0 : this.grounded ? Math.min(this.vel.length() / SPEED, 1) * 0.8 : 0.1; this.mixer.update(dt); }
    this.applySeat(dt);

    this.stars.forEach((sp, id) => { if (!sp.visible) return; sp.position.y = sp.userData["y"] + Math.sin(t * 2 + id.length) * 0.25; (sp.material as THREE.SpriteMaterial).rotation = Math.sin(t * 1.5 + id.length) * 0.3; });
    // labels: fade by distance, nearest site name in HUD
    let best = "", bestD = Infinity, nearId: string | null = null, nearD = Infinity;
    for (const { s, site } of this.labels) {
      const d = Math.hypot(site.x - p.x, site.z - p.z);
      (s.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(1.3 - d / (site.r > 15 ? 260 : 60), 0, 1);
      if ((ZONE_SPOTS[this.zone] ?? []).includes(site.id) && d < (site.r === 9 ? 8 : site.r + 2.5) && d - Math.min(site.r, 3) < nearD) { nearD = d - Math.min(site.r, 3); nearId = site.id; }
      if (d < site.r + 4 && d - site.r < bestD) { bestD = d - site.r; best = `${site.en} — ${site.bn}`; }
    }
    if (nearId !== store.get().moonNear) store.set({ moonNear: nearId });
    if (best !== this.nearSite) { this.nearSite = best; (this.hud.querySelector("[data-site]") as HTMLElement).textContent = best || MOON_ZONES[this.zone]!.en; }

    // camera
    const target = p.clone().add(new THREE.Vector3(0, 1.4, 0));
    const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)).multiplyScalar(this.camDist);
    const cp = target.clone().add(off); cp.y = Math.max(cp.y, this.groundHeight(cp.x, cp.z) + 0.8);
    this.camera.position.lerp(cp, Math.min(1, dt * 6)); this.camera.lookAt(target);

    const sx = Math.round(p.x / 8) * 8, sz = Math.round(p.z / 8) * 8;
    this.sun.target.position.set(sx, p.y, sz); this.sun.position.set(sx + 110, p.y + 26, sz + 50); this.sun.target.updateMatrixWorld();
    this.earth.rotation.y += dt * 0.01;
    for (const b of this.beacons) { const gl = b.getObjectByName("glow"); if (gl) gl.scale.setScalar(3.5 + Math.sin(t * 3) * 1.2); }
    this.drawMinimap();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.hud?.remove(); this.mini?.remove(); this.big?.remove(); this.bannerEl?.remove(); window.clearTimeout(this.bannerT);
    voice.stop();
    store.set({ objective: null, hint: null, loading: false, moonNear: null, moonFreeze: false, moonRover: null, moonDriving: false, moonSpeed: 0, moonRoverDist: -1 });
    this.disposers.forEach((d) => d());
    this.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = (m as any).material; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.(); });
  }
}
