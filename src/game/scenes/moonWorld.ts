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
const WORLD = 420;
const SEG = 300;
const GRAVITY = 2.6; // gentle "1/6 g" feel
const JUMP_V = 3.4;
const SPEED = 4.2;

type Site = { id: string; x: number; z: number; en: string; bn: string; info: string; r: number };
export const MOON_SITES: Site[] = [
  { id: "lm", x: 0, z: 0, en: "EAGLE · Lunar Module", bn: "ঈগল · লুনার মডিউল", info: "Descent stage left behind · 20 Jul 1969", r: 9 },
  { id: "plaque", x: 1.2, z: 3.3, en: "Plaque · \"We came in peace\"", bn: "ফলক · \"আমরা শান্তির জন্য এসেছি\"", info: "Front leg ladder", r: 3 },
  { id: "flag", x: -9, z: 6, en: "US Flag Site", bn: "পতাকার স্থান", info: "Knocked over by engine blast at liftoff", r: 4 },
  { id: "tv", x: -22, z: 16, en: "TV Camera", bn: "টিভি ক্যামেরা", info: "Broadcast to 650 million people", r: 4 },
  { id: "boot", x: -5, z: 13, en: "Aldrin's Bootprint", bn: "অলড্রিনের পদচিহ্ন", info: "Photo AS11-40-5878", r: 3 },
  { id: "lrrr", x: 6, z: 26, en: "Laser Reflector (LRRR)", bn: "লেজার প্রতিফলক (LRRR)", info: "100 mirrors · still used today", r: 4 },
  { id: "psep", x: -4, z: 30, en: "Seismometer (PSEP)", bn: "ভূকম্পন যন্ত্র (PSEP)", info: "First moonquake listener", r: 4 },
  { id: "lwc", x: 96, z: 4, en: "Little West Crater", bn: "লিটল ওয়েস্ট ক্রেটার", info: "Armstrong's surprise run · 33 m wide", r: 22 },
  { id: "wc", x: -150, z: -40, en: "West Crater", bn: "ওয়েস্ট ক্রেটার", info: "Boulders Armstrong flew over to land", r: 55 },
  { id: "dbl", x: 40, z: -70, en: "Double Crater", bn: "ডাবল ক্রেটার", info: "Twin impact pits", r: 26 },
];
const NAMED_CRATERS = [
  { x: 96, z: 4, R: 26, D: 7 },
  { x: -150, z: -40, R: 60, D: 16 },
  { x: 32, z: -70, R: 16, D: 4 },
  { x: 52, z: -72, R: 14, D: 3.5 },
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
  private hud!: HTMLDivElement;
  private mini!: HTMLCanvasElement;
  private miniBg!: HTMLCanvasElement;
  private big: HTMLCanvasElement | null = null;
  private bigOpen = false;
  private nearSite = "";
  private disposers: (() => void)[] = [];
  private disposed = false;
  private earth!: THREE.Mesh;

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

    this.player.position.set(7, 0, 10);
    this.player.position.y = this.groundHeight(7, 10);
    this.disposers.push(store.on("joystick", (d) => { this.joy = d as { x: number; y: number }; }));
    const onKey = (e: KeyboardEvent) => { if (e.code === "Escape") store.emit("engine:goto", "hub"); };
    window.addEventListener("keydown", onKey);
    this.disposers.push(() => window.removeEventListener("keydown", onKey));
    if (import.meta.env.DEV) (window as any).__moonTeleport = (x: number, z: number) => this.player.position.set(x, this.groundHeight(x, z), z);

    window.setTimeout(() => {
      if (this.disposed) return;
      store.set({ loading: false, objective: { en: "Explore Tranquility Base — visit every named site", bn: "ট্রাঙ্কুইলিটি বেস ঘুরে দেখো — প্রতিটি নামাঙ্কিত স্থানে যাও" } });
      store.say([{ speaker: "nova", en: "Welcome to Tranquility Base! This is where Apollo 11 landed on 20 July 1969. Jump with SPACE — gravity here is only one sixth of Earth's!", bn: "ট্রাঙ্কুইলিটি বেসে স্বাগতম! ১৯৬৯ সালের ২০ জুলাই অ্যাপোলো ১১ ঠিক এখানে নেমেছিল। SPACE চেপে লাফ দাও — এখানে মাধ্যাকর্ষণ পৃথিবীর মাত্র ছয় ভাগের এক ভাগ!" }]);
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
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (WORLD / 2);
    h += Math.max(0, edge - 0.78) ** 2 * (180 + pfbm(x * 0.02, z * 0.02, 1e6, 4) * 520); // distant highland ridge hides world edge
    for (const c of craters) { const d = Math.hypot(x - c.x, z - c.z) / c.R; if (d < 2.2) h += crater(d, c.D); }
    return h;
  }

  private buildTerrain() {
    const rnd = mulberry(42);
    const craters = [...NAMED_CRATERS];
    for (let i = 0; i < 170; i++) {
      const R = 1.2 + Math.pow(rnd(), 2.6) * 14;
      const x = (rnd() - 0.5) * WORLD * 0.85, z = (rnd() - 0.5) * WORLD * 0.85;
      if (Math.hypot(x, z) < 34 + R * 2) continue; // keep the landing site flat
      craters.push({ x, z, R, D: R * (0.18 + rnd() * 0.1) });
    }
    const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    this.heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.rawHeight(x, z, craters); pos.setY(i, h); this.heights[i] = h;
      // albedo: fresh crater rims & ray ejecta brighter, mare darker
      let a = 0.82 + (pfbm(x * 0.02, z * 0.02, 1e6, 3) - 0.5) * 0.25;
      for (const c of craters) { const d = Math.hypot(x - c.x, z - c.z) / c.R; if (d > 0.8 && d < 1.8) a += 0.12 * (1.8 - d) * (c.R > 10 ? 1 : 0.6); }
      const blast = Math.hypot(x, z); if (blast < 14) a += 0.18 * (1 - blast / 14); // engine-scoured bright halo
      col[i * 3] = a; col[i * 3 + 1] = a * 0.99; col[i * 3 + 2] = a * 0.97;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const { map, nmap } = makeRegolithMaps();
    map.repeat.set(WORLD / 6, WORLD / 6); nmap.repeat.copy(map.repeat);
    const mat = new THREE.MeshStandardMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: 0.97, metalness: 0 });
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; this.scene.add(m);
    this.bakeMinimap(craters);
  }

  groundHeight(x: number, z: number) {
    const s = WORLD / SEG, n = SEG + 1;
    const fx = THREE.MathUtils.clamp((x + WORLD / 2) / s, 0, SEG - 0.001), fz = THREE.MathUtils.clamp((z + WORLD / 2) / s, 0, SEG - 0.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
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
    const COUNT = 900;
    const rocks = new THREE.InstancedMesh(g, mat, COUNT);
    const o = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      // clusters near West Crater (the boulder field Armstrong avoided) + scatter
      let x: number, z: number;
      if (i < 220) { const a = rnd() * 6.28, r = 55 + rnd() * 50; x = -150 + Math.cos(a) * r; z = -40 + Math.sin(a) * r; }
      else { x = (rnd() - 0.5) * WORLD * 0.9; z = (rnd() - 0.5) * WORLD * 0.9; }
      if (Math.hypot(x, z) < 12) continue;
      const s = (i < 220 ? 0.4 + rnd() * 1.6 : 0.06 + Math.pow(rnd(), 4) * 0.9);
      o.position.set(x, this.groundHeight(x, z) + s * 0.15, z);
      o.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3); o.scale.set(s, s * (0.6 + rnd() * 0.5), s * (0.8 + rnd() * 0.4)); o.updateMatrix();
      rocks.setMatrixAt(i, o.matrix);
    }
    rocks.castShadow = rocks.receiveShadow = true;
    this.scene.add(rocks);
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
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.25, map: canvasTex(256, 180, (g) => { g.fillStyle = "#c8ccd4"; g.fillRect(0, 0, 256, 180); g.fillStyle = "#222"; g.font = "bold 13px serif"; g.textAlign = "center"; ["HERE MEN FROM THE PLANET EARTH", "FIRST SET FOOT UPON THE MOON", "JULY 1969, A.D.", "WE CAME IN PEACE FOR", "ALL MANKIND"].forEach((l, i) => g.fillText(l, 128, 60 + i * 22)); g.beginPath(); g.arc(70, 26, 16, 0, 7); g.arc(186, 26, 16, 0, 7); g.stroke(); }) }));
    plaque.position.set(0, 1.55, 2.32); lm.add(plaque);
    // scattered leftover gear (jettisoned PLSS backpacks, bags)
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.8 })); bag.position.set(-3.2, 0.18, -2.6); bag.rotation.set(0.3, 0.8, 0.2); lm.add(bag);
    this.place(lm, 0, 0);

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

  private buildPrints() {
    this.prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.34), new THREE.MeshBasicMaterial({ map: bootTex(), transparent: true, depthWrite: false }), 500);
    this.prints.count = 0; this.scene.add(this.prints);
    const n = 60, arr = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xb8b4ac, size: 0.06, transparent: true, opacity: 0 }));
    this.dust.userData["v"] = new Float32Array(n * 3);
    this.scene.add(this.dust);
  }

  private buildLabels() {
    for (const site of MOON_SITES) {
      const s = labelSprite(site.en, site.info);
      const big = site.r > 15;
      if (big) s.scale.set(16, 4, 1);
      s.position.set(site.x, this.groundHeight(site.x, site.z) + (big ? 14 : site.id === "lm" ? 6 : 2.6), site.z);
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
      if (gltf.animations[0]) { this.mixer = new THREE.AnimationMixer(m); this.walk = this.mixer.clipAction(gltf.animations[0]); this.walk.play(); }
    });
  }

  // ---------- HUD + minimap ----------
  private buildHud() {
    const hud = document.createElement("div");
    hud.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:40;pointer-events:none;text-align:center;font-family:system-ui,sans-serif;color:#dfe7f5;text-shadow:0 1px 4px #000";
    hud.innerHTML = `<div style="font-size:10px;letter-spacing:.4em;opacity:.6">MARE TRANQUILLITATIS · 0.674°N 23.473°E</div><div data-site style="font-size:15px;letter-spacing:.18em;color:#ffd97d;margin-top:4px">TRANQUILITY BASE · APOLLO 11</div>`;
    document.body.appendChild(hud); this.hud = hud;
    const back = document.createElement("button");
    back.textContent = "🏛️ HUB";
    back.style.cssText = "position:fixed;left:16px;bottom:150px;z-index:41;padding:8px 14px;border-radius:999px;border:1px solid rgba(200,220,255,.5);background:rgba(8,12,22,.6);color:#dfe7f5;font:600 12px system-ui;letter-spacing:.15em;cursor:pointer";
    back.onclick = () => store.emit("engine:goto", "hub");
    document.body.appendChild(back); this.disposers.push(() => back.remove());
    const c = document.createElement("canvas"); c.width = c.height = 220;
    c.style.cssText = "position:fixed;top:72px;right:16px;width:180px;height:180px;border-radius:50%;border:2px solid rgba(200,220,255,.7);box-shadow:0 0 20px rgba(0,0,0,.6);z-index:40;background:#111;cursor:pointer;pointer-events:auto";
    c.title = "Open map";
    const stop = (e: Event) => e.stopPropagation();
    c.addEventListener("pointerdown", stop);
    c.addEventListener("click", (e) => { e.stopPropagation(); this.bigOpen = true; });
    document.body.appendChild(c); this.mini = c;
    this.disposers.push(() => { c.remove(); this.big?.remove(); });
  }

  private bakeMinimap(craters: { x: number; z: number; R: number }[]) {
    const N = 420; const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d")!;
    const img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const wx = x - WORLD / 2, wz = y - WORLD / 2;
      const i = Math.min(SEG, Math.round(((wz + WORLD / 2) / WORLD) * SEG)) * (SEG + 1) + Math.min(SEG, Math.round(((wx + WORLD / 2) / WORLD) * SEG));
      const ix = Math.min(SEG, Math.round(((wx + 1 + WORLD / 2) / WORLD) * SEG)) + Math.min(SEG, Math.round(((wz + WORLD / 2) / WORLD) * SEG)) * (SEG + 1);
      const sl = (this.heights[ix]! - this.heights[i]!) * 40;
      const v = THREE.MathUtils.clamp(95 + this.heights[i]! * 4 + sl, 20, 230);
      const p = (y * N + x) * 4; img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v * 1.05; img.data[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(255,255,255,.15)"; for (const k of craters) if (k.R > 8) { g.beginPath(); g.arc(k.x + N / 2, k.z + N / 2, k.R, 0, 7); g.stroke(); }
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
    const R = 180; // metres shown around base
    const sc = Math.min(W, H) * 0.86 / (2 * R), cx = W / 2, cy = H / 2 + 10;
    const toX = (x: number) => cx + x * sc, toY = (z: number) => cy + z * sc;
    g.save(); g.beginPath(); g.rect(cx - R * sc, cy - R * sc, 2 * R * sc, 2 * R * sc); g.clip();
    g.drawImage(this.miniBg, toX(-WORLD / 2), toY(-WORLD / 2), WORLD * sc, WORLD * sc); g.restore();
    g.strokeStyle = "rgba(200,220,255,.6)"; g.lineWidth = 2; g.strokeRect(cx - R * sc, cy - R * sc, 2 * R * sc, 2 * R * sc);
    g.strokeStyle = "rgba(255,217,125,.8)"; g.setLineDash([5, 5]); g.beginPath();
    [[0, 3], [-9, 6], [-22, 16], [-5, 13], [6, 26], [-4, 30], [0, 3]].forEach(([x, z], i) => (i ? g.lineTo(toX(x!), toY(z!)) : g.moveTo(toX(x!), toY(z!)))); g.stroke(); g.setLineDash([]);
    g.textAlign = "center";
    MOON_SITES.forEach((s, i) => {
      const x = toX(s.x), y = toY(s.z);
      g.fillStyle = s.id === "lm" ? "#ffd97d" : "#9fd0ff"; g.strokeStyle = "#000"; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, s.id === "lm" ? 7 : 5, 0, 7); g.fill(); g.stroke();
      const near = s.r < 10; const off = near ? (i % 2 ? 16 : -10) : -12;
      g.font = `bold ${near ? 11 : 13}px system-ui`; g.fillStyle = "#fff";
      g.fillText(s.en.split(" (")[0]!, x + (near ? (i % 2 ? 60 : -60) : 0), y + off);
    });
    const p = this.player.position;
    g.fillStyle = "#4fd1ff"; g.beginPath(); g.arc(toX(p.x), toY(p.z), 7, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 12px system-ui"; g.fillText("YOU", toX(p.x), toY(p.z) - 12);
    g.fillStyle = "#ffd97d"; g.font = "bold 18px system-ui"; g.fillText("TRANQUILITY BASE · APOLLO 11", W / 2, 34);
    g.fillStyle = "#cfe0ff"; g.font = "12px system-ui"; g.fillText("Tap anywhere to close · মানচিত্র বন্ধ করতে চাপো", W / 2, H - 16);
  }

  private drawMinimap() {
    this.drawBigMap();
    const g = this.mini.getContext("2d")!, S = 220, scale = 1.4; // px per metre
    const p = this.player.position;
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip();
    g.translate(S / 2, S / 2); g.rotate(this.camYaw); g.scale(scale, scale); g.translate(-p.x, -p.z);
    g.drawImage(this.miniBg, -WORLD / 2, -WORLD / 2);
    // EVA traverse line
    g.strokeStyle = "rgba(255,217,125,.7)"; g.lineWidth = 0.6; g.setLineDash([2, 2]); g.beginPath();
    [[0, 3], [-9, 6], [-22, 16], [-5, 13], [6, 26], [-4, 30], [0, 3]].forEach(([x, z], i) => (i ? g.lineTo(x!, z!) : g.moveTo(x!, z!))); g.stroke(); g.setLineDash([]);
    g.restore();
    // markers drawn upright
    const toScreen = (x: number, z: number) => { const dx = (x - p.x) * scale, dz = (z - p.z) * scale; const c = Math.cos(this.camYaw), s = Math.sin(this.camYaw); return [S / 2 + dx * c - dz * s, S / 2 + dx * s + dz * c] as const; };
    g.font = "bold 10px system-ui"; g.textAlign = "center";
    for (const site of MOON_SITES) {
      let [x, y] = toScreen(site.x, site.z); const d = Math.hypot(x - S / 2, y - S / 2); const edge = d > S / 2 - 12;
      if (edge) { x = S / 2 + ((x - S / 2) / d) * (S / 2 - 12); y = S / 2 + ((y - S / 2) / d) * (S / 2 - 12); }
      g.fillStyle = site.id === "lm" ? "#ffd97d" : "#9fd0ff"; g.beginPath(); g.arc(x, y, site.id === "lm" ? 5 : 3.5, 0, 7); g.fill();
      const near = Math.hypot(site.x - p.x, site.z - p.z) < 18 || site.r > 15;
      if (!edge && near) { g.fillStyle = "rgba(0,0,0,.6)"; const w = g.measureText(site.en.split(" ·")[0]!).width; g.fillRect(x - w / 2 - 2, y - 17, w + 4, 12); g.fillStyle = "#fff"; g.fillText(site.en.split(" ·")[0]!.split(" (")[0]!, x, y - 8); }
    }
    // player arrow
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 - 5, S / 2 + 6); g.lineTo(S / 2 + 5, S / 2 + 6); g.fill();
    g.fillStyle = "#cfe0ff"; g.font = "bold 11px system-ui"; g.fillText("N", S / 2 + Math.sin(-this.camYaw + Math.PI) * -95, S / 2 + Math.cos(-this.camYaw + Math.PI) * 95);
  }

  // ---------- input ----------
  onPointerDown(x: number, y: number) { this.dragging = true; this.last = { x, y }; }
  onPointerMove(x: number, y: number) {
    if (!this.dragging) return;
    this.camYaw -= (x - this.last.x) * 2.4;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + (y - this.last.y) * 1.6, 0.05, 1.1);
    this.last = { x, y };
  }
  onPointerUp() { this.dragging = false; }
  onWheel(d: number) { this.camDist = THREE.MathUtils.clamp(this.camDist + d * 0.01, 3.5, 16); }
  onKey(code: string, down: boolean) {
    if (down) this.keys.add(code); else this.keys.delete(code);
    if (down && code === "Space" && this.grounded) { this.vy = JUMP_V; this.grounded = false; }
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
    const k = this.keys;
    const ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) + this.joy.x;
    const iy = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) + this.joy.y;
    const p = this.player.position;
    if (ix * ix + iy * iy > 0.001) {
      const l = Math.hypot(ix, iy), x = ix / l, y = iy / l, s = Math.sin(this.camYaw), c = Math.cos(this.camYaw);
      const dir = new THREE.Vector3(x * c - y * s, 0, -y * c - x * s).multiplyScalar(k.has("ShiftLeft") ? SPEED * 1.6 : SPEED);
      this.vel.lerp(dir, dt * (this.grounded ? 5 : 1.2)); // little air control: momentum carries in low g
      this.player.rotation.y = Math.atan2(this.vel.x, this.vel.z);
    } else if (this.grounded) this.vel.multiplyScalar(Math.exp(-6 * dt));
    p.addScaledVector(this.vel, dt);
    const lim = WORLD / 2 - 40; p.x = THREE.MathUtils.clamp(p.x, -lim, lim); p.z = THREE.MathUtils.clamp(p.z, -lim, lim);
    // keep out of the lander body
    const r = Math.hypot(p.x, p.z); if (r < 2.4) { p.x *= 2.4 / r; p.z *= 2.4 / r; }
    // low-gravity vertical motion + bunny hop while walking
    const gy = this.groundHeight(p.x, p.z);
    const moving = this.vel.length() > 0.5;
    if (this.grounded && moving && Math.sin(t * 5.5) > 0.97) { this.vy = 1.1; this.grounded = false; }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt; p.y += this.vy * dt;
      if (p.y <= gy) { p.y = gy; this.grounded = true; if (this.vy < -2) this.kickDust(); this.vy = 0; }
    } else p.y = gy;

    // persistent bootprints — no wind on the Moon, they stay forever
    if (this.grounded && p.distanceTo(this.lastPrint) > 0.55) {
      this.lastPrint.copy(p); const o = new THREE.Object3D(); const side = this.printIdx % 2 ? 0.14 : -0.14, a = this.player.rotation.y;
      o.position.set(p.x + Math.cos(a) * side, gy + 0.025, p.z - Math.sin(a) * side); o.rotation.set(-Math.PI / 2, 0, a + Math.PI); o.updateMatrix();
      this.prints.setMatrixAt(this.printIdx % 500, o.matrix); this.printIdx++; this.prints.count = Math.min(this.printIdx, 500); this.prints.instanceMatrix.needsUpdate = true;
    }
    if (this.dustLife > 0) {
      this.dustLife -= dt; const pos = this.dust.geometry.attributes["position"] as THREE.BufferAttribute; const v = this.dust.userData["v"] as Float32Array;
      for (let i = 0; i < pos.count; i++) { v[i * 3 + 1]! -= GRAVITY * dt; pos.setXYZ(i, pos.getX(i) + v[i * 3]! * dt, Math.max(gy, pos.getY(i) + v[i * 3 + 1]! * dt), pos.getZ(i) + v[i * 3 + 2]! * dt); }
      pos.needsUpdate = true; (this.dust.material as THREE.PointsMaterial).opacity = Math.max(0, this.dustLife / 1.6) * 0.8;
    }
    if (this.mixer && this.walk) { this.walk.timeScale = this.grounded ? Math.min(this.vel.length() / SPEED, 1) * 0.8 : 0.1; this.mixer.update(dt); }

    // labels: fade by distance, nearest site name in HUD
    let best = "", bestD = Infinity;
    for (const { s, site } of this.labels) {
      const d = Math.hypot(site.x - p.x, site.z - p.z);
      (s.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(1.3 - d / (site.r > 15 ? 260 : 60), 0, 1);
      if (d < site.r + 4 && d - site.r < bestD) { bestD = d - site.r; best = `${site.en} — ${site.bn}`; }
    }
    if (best !== this.nearSite) { this.nearSite = best; (this.hud.querySelector("[data-site]") as HTMLElement).textContent = best || "TRANQUILITY BASE · APOLLO 11"; }

    // camera
    const target = p.clone().add(new THREE.Vector3(0, 1.4, 0));
    const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)).multiplyScalar(this.camDist);
    const cp = target.clone().add(off); cp.y = Math.max(cp.y, this.groundHeight(cp.x, cp.z) + 0.8);
    this.camera.position.lerp(cp, Math.min(1, dt * 6)); this.camera.lookAt(target);

    const sx = Math.round(p.x / 8) * 8, sz = Math.round(p.z / 8) * 8;
    this.sun.target.position.set(sx, p.y, sz); this.sun.position.set(sx + 110, p.y + 26, sz + 50); this.sun.target.updateMatrixWorld();
    this.earth.rotation.y += dt * 0.01;
    this.drawMinimap();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.hud?.remove(); this.mini?.remove();
    voice.stop();
    store.set({ objective: null, hint: null, loading: false });
    this.disposers.forEach((d) => d());
    this.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); const mat = (m as any).material; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.(); });
  }
}
