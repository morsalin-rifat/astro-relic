import * as THREE from "three";
import { store } from "../../state/store";
import { voice } from "../voice";
import { audio } from "../audio";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { makeStarfield, fbm, type Scene } from "../utils";
import { buildExplorer, buildNova, buildSojourner } from "../models/builders";
import { NOVA_WELCOME_MARS, NOVA_NEAR_SITE, UI } from "../../data/content";

const SITE = new THREE.Vector3(42, 0, -30);
const SPIRIT = new THREE.Vector3(-20, 0, -340);
const OPPY = new THREE.Vector3(12, 0, -690);
const INSIGHT = new THREE.Vector3(-6, 0, -1040);
const WORLD = 320;
const ZONE = 350; // metres per real NASA site
const ZONES = [
  { url: "/models/zone1_ares.glb", name: "ZONE 1 · ARES VALLIS — SOJOURNER 1997", grade: [1.25, 0.82, 0.6] },
  { url: "/models/zone2_gusev.glb", name: "ZONE 2 · GUSEV CRATER — SPIRIT 2004", grade: [1.2, 0.75, 0.55] },
  { url: "/models/zone3_meridiani.glb", name: "ZONE 3 · MERIDIANI PLANUM — OPPORTUNITY 2004", grade: [1.05, 0.8, 0.7] },
  { url: "/models/zone4_elysium.glb", name: "ZONE 4 · ELYSIUM PLANITIA — INSIGHT 2018", grade: [1.15, 0.85, 0.68] },
];
const loader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const MAP_DEPTH = 70; // vertical relief (exaggerated for drama)

// ---------- Procedural Mars relief, shaped after NASA traverse maps ----------
type Crater = { x: number; z: number; r: number; d: number; scal?: number };
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
/** Named, real landmarks (scaled so kids can walk them). zone = 0 Ares · 1 Gusev · 2 Meridiani · 3 Elysium */
export const MARS_SITES = [
  { id: "twinpeaks", zone: 0, x: -82, z: -105, en: "Twin Peaks", bn: "টুইন পিকস" },
  { id: "yogi", zone: 0, x: 52, z: -24, en: "Yogi Rock", bn: "যোগী পাথর" },
  { id: "barnacle", zone: 0, x: 36, z: -38, en: "Barnacle Bill", bn: "বার্নাকল বিল" },
  { id: "aresflood", zone: 0, x: 95, z: 60, en: "Ancient flood channel", bn: "প্রাচীন বন্যার নদীপথ" },
  { id: "bonneville", zone: 1, x: 62, z: -300, en: "Bonneville Crater", bn: "বনভিল ক্রেটার" },
  { id: "husband", zone: 1, x: -78, z: -455, en: "Husband Hill · Columbia Hills", bn: "হাসব্যান্ড হিল · কলম্বিয়া হিলস" },
  { id: "homeplate", zone: 1, x: -18, z: -478, en: "Home Plate", bn: "হোম প্লেট" },
  { id: "eagle", zone: 2, x: 0, z: -640, en: "Eagle Crater (hole-in-one)", bn: "ঈগল ক্রেটার (হোল-ইন-ওয়ান)" },
  { id: "endurance", zone: 2, x: -78, z: -705, en: "Endurance Crater", bn: "এনডিউরেন্স ক্রেটার" },
  { id: "victoria", zone: 2, x: 72, z: -780, en: "Victoria Crater", bn: "ভিক্টোরিয়া ক্রেটার" },
  { id: "homestead", zone: 3, x: -6, z: -1040, en: "Homestead Hollow", bn: "হোমস্টেড হলো" },
  { id: "heatshield", zone: 3, x: 70, z: -1000, en: "Heat-shield scar", bn: "হিট-শিল্ডের দাগ" },
  { id: "elysiummons", zone: 3, x: -110, z: -1150, en: "Lava plains · Elysium", bn: "লাভা সমভূমি · এলিসিয়াম" },
] as const;
const BIG_CRATERS: Crater[] = [
  { x: 62, z: -300, r: 36, d: 9 },            // Bonneville
  { x: 0, z: -640, r: 11, d: 2.6 },           // Eagle
  { x: -78, z: -705, r: 30, d: 8 },           // Endurance
  { x: 72, z: -780, r: 48, d: 13, scal: 1 },  // Victoria (scalloped bays)
  { x: -6, z: -1058, r: 14, d: 1.2 },         // Homestead hollow (filled)
  { x: 70, z: -1000, r: 7, d: 1.4 },          // heat-shield impact
];
function extraCraters(): Crater[] {
  const r = rng(1997), out: Crater[] = [];
  const dens = [26, 30, 22, 60]; // Elysium is pocked with small hollows
  for (let zi = 0; zi < 4; zi++) for (let k = 0; k < dens[zi]!; k++) {
    const x = (r() - 0.5) * (ZONE - 30), z = -zi * ZONE + (r() - 0.5) * (ZONE - 40);
    const rad = 2 + Math.pow(r(), 2.2) * (zi === 3 ? 9 : 14);
    out.push({ x, z, r: rad, d: rad * (zi === 3 ? 0.1 : 0.18) });
  }
  return out;
}
const gauss = (x: number, z: number, cx: number, cz: number, sx: number, sz = sx) =>
  Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
function craterH(x: number, z: number, c: Crater) {
  const dx = x - c.x, dz = z - c.z, dist = Math.hypot(dx, dz);
  let rr = c.r;
  if (c.scal) rr *= 1 + 0.07 * Math.sin(Math.atan2(dz, dx) * 9) + 0.03 * Math.sin(Math.atan2(dz, dx) * 23);
  const d = dist / rr;
  if (d > 1.8) return { h: 0, bowl: 0 };
  const rim = c.d * 0.38 * Math.exp(-(((d - 1) / 0.22) ** 2));
  if (d >= 1) return { h: rim, bowl: 0 };
  // flat-ish floor with steeper walls + terraced layers for Victoria/Endurance
  let bowl = -c.d * (1 - Math.pow(d, 2.6));
  if (c.r > 25) bowl += Math.sin(d * 18) * 0.35 * d;
  return { h: bowl + rim, bowl: 1 - d };
}
const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function marsRelief(x: number, z: number, extra: Crater[]) {
  const zt = Math.min(3, Math.max(0, -z / ZONE));
  const w = [0, 1, 2, 3].map((i) => smooth(1 - Math.abs(zt - i)));
  let river = 0;
  let h = (fbm(x * 0.008 + 7, z * 0.008 + 3, 4) - 0.5) * 10; // broad swells
  h += (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 1.2;            // small bumps
  // Zone 1 · Ares Vallis: streamlined flood grooves (flow toward NE) + Twin Peaks + far channel walls
  if (w[0]! > 0) {
    const flow = (x * 0.55 + z * 0.83);
    let a = Math.sin(flow * 0.09 + fbm(x * 0.02, z * 0.02) * 4) * 0.9 + Math.sin(flow * 0.31) * 0.25;
    a += 52 * gauss(x, z, -82, -100, 15, 12) + 40 * gauss(x, z, -52, -122, 12, 10);  // Twin Peaks (taller)
    a += 26 * gauss(x, z, -140, 30, 22, 70) + 22 * gauss(x, z, 150, -40, 20, 80);       // channel banks
    a -= 3 * gauss(x, z, 95, 60, 30, 70);                                             // flood trough
    // dry meandering riverbed of the ancient Ares flood
    const cx = 70 + Math.sin(z * 0.022) * 28 + Math.sin(z * 0.061) * 9;
    const rd = Math.abs(x - cx);
    const rv = 1 - smooth((rd - 7) / 6);
    a -= 5.5 * rv; a += 1.2 * Math.exp(-(((rd - 2) / 2) ** 2)) * rv; // channel + sandbar
    river = Math.max(river, rv * w[0]!);
    h += a * w[0]!;
  }
  // Zone 2 · Gusev: flat crater floor rising into the Columbia Hills; Home Plate plateau
  if (w[1]! > 0) {
    let a = -1.5;
    a += 62 * gauss(x, z, -78, -455, 26, 20) + 38 * gauss(x, z, -125, -430, 20, 28) + 28 * gauss(x, z, -40, -505, 18, 13);
    a += (fbm(x * 0.03 + 4, z * 0.03, 4) - 0.5) * 10 * smooth((Math.hypot(x + 85, z + 455) < 90 ? 1 : 0));
    // ancient Gusev lakebed: flattened silt floor in the east
    const lk = 1 - smooth((Math.hypot((x - 70) / 1.4, z + 380) - 45) / 15);
    a = a * (1 - lk) - 1.2 * lk; river = Math.max(river, lk * 0.7 * w[1]!);
    const hp = Math.hypot(x + 18, z + 478); a += 2.2 * (1 - smooth((hp - 9) / 3));
    h += a * w[1]!;
  }
  // Zone 3 · Meridiani: smooth plains striped with sand ripples (Opportunity's "blueberry" fields)
  if (w[2]! > 0) {
    h = h * (1 - 0.6 * w[2]!) + (Math.sin(x * 0.9 + Math.sin(z * 0.05) * 3) * 0.18 + Math.sin(z * 0.23 + x * 0.1) * 0.35) * w[2]!;
  }
  // Zone 4 · Elysium: very flat lava plain, far volcanic rise on the horizon
  if (w[3]! > 0) {
    h = h * (1 - 0.75 * w[3]!) + (38 * gauss(x, z, -150, -1180, 45, 55) + 16 * gauss(x, z, 150, -1120, 36, 45)) * w[3]!;
  }
  let bowl = 0;
  for (const c of BIG_CRATERS) { if (Math.abs(z - c.z) > c.r * 1.9) continue; const r = craterH(x, z, c); h += r.h; bowl = Math.max(bowl, r.bowl); }
  for (const c of extra) { if (Math.abs(z - c.z) > c.r * 1.9 || Math.abs(x - c.x) > c.r * 1.9) continue; const r = craterH(x, z, c); h += r.h; bowl = Math.max(bowl, r.bowl * 0.6); }
  // ridges between zones with a central pass (like the Moon corridor)
  for (let s = 1; s < 4; s++) {
    const zr = -s * ZONE + ZONE / 2;
    const ridge = Math.exp(-(((z - zr) / 14) ** 2)) * (28 + fbm(x * 0.04, s * 9) * 22);
    h += ridge * (1 - Math.exp(-((x / 24) ** 2)));
  }
  return { h, zt, bowl, river };
}
/** [dust low, dust high, rock] per zone */
const MARS_PALETTE = [
  [0x8a4a2a, 0xb66a40, 0x5e3a2a], // Ares: rocky rust
  [0x9a5a36, 0xc0835a, 0x6a4632], // Gusev: lighter dust
  [0x6e3c28, 0x9a5a3e, 0xc9a27a], // Meridiani: dark sand, pale outcrops
  [0xa8683f, 0xcf9466, 0x7a4a30], // Elysium: bright fine dust
];
function makeGrainTexture(bump = false) {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!, img = g.createImageData(S, S), r = rng(bump ? 77 : 42);
  for (let i = 0; i < S * S; i++) {
    const v = bump ? 110 + r() * 110 : 205 + r() * 50;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v * (bump ? 1 : 0.97); img.data[i * 4 + 2] = v * (bump ? 1 : 0.93); img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let k = 0; k < 140; k++) { // pebbles
    g.fillStyle = bump ? `rgba(255,255,255,${0.3 + r() * 0.5})` : `rgba(90,50,30,${0.15 + r() * 0.25})`;
    g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 2.2, 0, 6.29); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (!bump) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class MarsWorldScene implements Scene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private player: THREE.Group;
  private nova = buildNova();
  private rover: THREE.Group;
  private beacon: THREE.Group;
  private sun: THREE.DirectionalLight;
  private stars = makeStarfield(3000, 600);
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private camYaw = 0.6;
  private camPitch = 0.32;
  private camDist = 7;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private velocity = new THREE.Vector3();
  private nearSiteSaid = false;
  private meeting = false;
  private spirit = new THREE.Group();
  private spiritBeacon = new THREE.Group();
  private spiritMeeting = false;
  private spiritNear = false;
  private spiritLeave = false;
  private spiritLockSaid = false;
  private zoneWraps: THREE.Group[] = [];
  private snapNext = false;
  private fallV = 0;
  private oppy = new THREE.Group();
  private oppyBeacon = new THREE.Group();
  private oppyMeeting = false;
  private oppyNear = false;
  private oppyLeave = false;
  private oppyLockSaid = false;
  private insight = new THREE.Group();
  private insightBeacon = new THREE.Group();
  private insightMeeting = false;
  private insightNear = false;
  private insightLeave = false;
  private insightLockSaid = false;
  private needLeave = false;
  private disposers: (() => void)[] = [];
  private metAtStart: boolean;
  private hf: { data: Float32Array; nx: number; nz: number; minX: number; minZ: number; sx: number; sz: number } | null = null;
  private terrain!: THREE.Mesh;
  private rocks!: THREE.InstancedMesh;
  private rockData: { x: number; z: number; s: number; r: THREE.Euler }[] = [];
  private lander!: THREE.Group;
  private disposed = false;
  private mixer: THREE.AnimationMixer | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private mini!: HTMLCanvasElement;
  private miniBg: HTMLCanvasElement | null = null;
  private big: HTMLCanvasElement | null = null;
  private sectorName = "";
  private sectorTimer = 0;

  private welcomeT = 0;
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.metAtStart = store.get().metSojourner;
    store.set({ loading: true, bigMap: false });
    const loadGuard = window.setTimeout(() => store.set({ loading: false }), 20000);
    this.disposers.push(() => window.clearTimeout(loadGuard));
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1500);
    this.scene.background = this.makeSky();
    this.scene.fog = new THREE.Fog(0xc98a5e, 90, 480);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(new THREE.HemisphereLight(0xffd2a8, 0x5a2a14, 0.7));

    // lighting: low warm sun
    this.sun = new THREE.DirectionalLight(0xffc9a0, 2.6);
    this.sun.position.set(60, 40, -30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.camera.far = 320;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.AmbientLight(0x4a2418, 0.55));
    const rim = new THREE.DirectionalLight(0x6f86b8, 0.5);
    rim.position.set(-40, 20, 40);
    this.scene.add(rim);

    // terrain
    const geo = new THREE.PlaneGeometry(WORLD, WORLD, 180, 180);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(0x773a20);
    const light = new THREE.Color(0xa85c38);
    const dark = new THREE.Color(0x502413);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.groundHeight(x, z);
      pos.setY(i, y);
      const c = base.clone().lerp(light, fbm(x * 0.05, z * 0.05));
      c.lerp(dark, Math.max(0, -y) * 0.15);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
    );
    terrain.receiveShadow = true;
    this.terrain = terrain;
    this.scene.add(terrain);

    // rocks
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.95 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 260);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 260; i++) {
      const x = (Math.random() - 0.5) * (WORLD - 30);
      const z = (Math.random() - 0.5) * (WORLD - 30);
      const s = 0.2 + Math.pow(Math.random(), 2.4) * 2.2;
      const r = new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.rockData.push({ x, z, s, r });
      dummy.position.set(x, this.groundHeight(x, z) + s * 0.25, z);
      dummy.rotation.copy(r);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.rocks = rocks;
    this.scene.add(rocks);

    // Pathfinder lander at site
    const lander = this.buildLander();
    lander.position.set(SITE.x, this.groundHeight(SITE.x, SITE.z), SITE.z);
    lander.rotation.y = 0.7;
    this.lander = lander;
    this.scene.add(lander);

    // Sojourner rover near lander
    const roverBuilt = buildSojourner();
    this.rover = roverBuilt.group;
    const rx = SITE.x + 3.4;
    const rz = SITE.z + 2.4;
    this.rover.position.set(rx, this.groundHeight(rx, rz), rz);
    this.rover.rotation.y = -0.9;
    this.rover.traverse((o: THREE.Object3D) => {
      o.castShadow = true;
    });
    this.scene.add(this.rover);
    loader().load("/models/sojourner.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = 1.5 / Math.max(size.x, size.z, 0.001);
      m.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      this.rover.children.forEach((ch) => (ch.visible = false));
      this.rover.add(m);
    });

    // Spirit rover in Gusev Crater (zone 2)
    this.spirit.position.set(SPIRIT.x, this.groundHeight(SPIRIT.x, SPIRIT.z), SPIRIT.z);
    this.spirit.rotation.y = 0.6;
    this.scene.add(this.spirit);
    loader().load("/models/spirit.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = 1.9 / Math.max(size.x, size.z, 0.001);
      m.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      this.spirit.add(m);
    });
    {
      const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 30, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      sb.position.y = 15;
      this.spiritBeacon.add(sb);
      const sr = new THREE.Mesh(new THREE.RingGeometry(1.6, 2, 40),
        new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      sr.rotation.x = -Math.PI / 2; sr.position.y = 0.15; sr.name = "beaconRing";
      this.spiritBeacon.add(sr);
      const sl = new THREE.PointLight(0xff8a5c, 12, 25); sl.position.y = 3;
      this.spiritBeacon.add(sl);
      this.spiritBeacon.position.copy(this.spirit.position);
      this.scene.add(this.spiritBeacon);
    }

    // Opportunity in Meridiani Planum (zone 3)
    this.oppy.position.set(OPPY.x, this.groundHeight(OPPY.x, OPPY.z), OPPY.z);
    this.oppy.rotation.y = -0.9;
    this.scene.add(this.oppy);
    loader().load("/models/spirit.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = 1.9 / Math.max(size.x, size.z, 0.001);
      m.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      this.oppy.add(m);
    });
    {
      const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 30, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x6cc6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      sb.position.y = 15;
      this.oppyBeacon.add(sb);
      const sr = new THREE.Mesh(new THREE.RingGeometry(1.6, 2, 40),
        new THREE.MeshBasicMaterial({ color: 0x6cc6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      sr.rotation.x = -Math.PI / 2; sr.position.y = 0.15; sr.name = "beaconRing";
      this.oppyBeacon.add(sr);
      const sl = new THREE.PointLight(0x6cc6ff, 12, 25); sl.position.y = 3;
      this.oppyBeacon.add(sl);
      this.oppyBeacon.position.copy(this.oppy.position);
      this.scene.add(this.oppyBeacon);
    }
    // InSight lander in Elysium Planitia (zone 4)
    this.insight.position.set(INSIGHT.x, this.groundHeight(INSIGHT.x, INSIGHT.z), INSIGHT.z);
    this.insight.rotation.y = 0.6;
    this.scene.add(this.insight);
    loader().load("/models/insight.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = 5.5 / Math.max(size.x, size.z, 0.001);
      m.scale.setScalar(k);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      this.insight.add(m);
    });
    {
      const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 30, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xb58cff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      sb.position.y = 15;
      this.insightBeacon.add(sb);
      const sr = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.9, 48),
        new THREE.MeshBasicMaterial({ color: 0xb58cff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      sr.rotation.x = -Math.PI / 2; sr.position.y = 0.15; sr.name = "beaconRing";
      this.insightBeacon.add(sr);
      const sl = new THREE.PointLight(0xb58cff, 12, 25); sl.position.y = 3;
      this.insightBeacon.add(sl);
      this.insightBeacon.position.copy(this.insight.position);
      this.scene.add(this.insightBeacon);
    }
    this.buildLivingMars();

    // beacon
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.6, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd97d,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    beam.position.y = 15;
    this.beacon.add(beam);
    const ringGeo = new THREE.RingGeometry(1.2, 1.6, 40);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffd97d,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    ring.name = "beaconRing";
    this.beacon.add(ring);
    this.beacon.position.set(SITE.x + 1, this.groundHeight(SITE.x + 1, SITE.z + 1), SITE.z + 1);
    this.scene.add(this.beacon);
    const beaconLight = new THREE.PointLight(0xffd97d, 12, 25);
    beaconLight.position.y = 3;
    this.beacon.add(beaconLight);

    // player
    this.player = buildExplorer();
    const mz = store.get().marsZone;
    const ZSPAWN = [null, SPIRIT, OPPY, INSIGHT][mz] ?? null;
    if (mz > 0) this.metAtStart = false;
    const startPos = ZSPAWN
      ? new THREE.Vector3(ZSPAWN.x + 4, 0, ZSPAWN.z + 26)
      : this.metAtStart
        ? new THREE.Vector3(SITE.x + 7, 0, SITE.z + 7)
        : new THREE.Vector3(0, 0, 0);
    this.player.position.set(startPos.x, this.groundHeight(startPos.x, startPos.z), startPos.z);
    this.scene.add(this.player);

    // Nova follows the player
    this.nova.group.position.copy(this.player.position).add(new THREE.Vector3(1.4, 2.4, 1));
    this.scene.add(this.nova.group);

    this.loadNasaMap();
    this.loadHero();
    this.buildMinimap();
    audio.play("mars");
    store.set({ hint: UI.moveHint });
    (window as any).__marsDebug = () => ({
      p: this.player.position.toArray().map((n: number) => n.toFixed(1)),
      distBeacon: this.player.position.distanceTo(this.beacon.position).toFixed(1),
      distRover: this.player.position.distanceTo(this.rover.position).toFixed(1),
      said: this.nearSiteSaid,
      meeting: this.meeting,
      yaw: this.camYaw.toFixed(2),
    });
    (window as any).__marsProbe = (x: number, z: number) => {
      const rc = new THREE.Raycaster(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
      const hits = rc.intersectObjects(this.zoneWraps, true).map((h) => [+h.point.y.toFixed(1), h.object.name]);
      return { ground: +this.groundHeight(x, z).toFixed(1), hits: hits.slice(0, 4) };
    };
    (window as any).__marsTeleport = (x: number, z: number) => {
      this.player.position.set(x, this.groundHeight(x, z), z);
      this.snapNext = true;
    };

    this.disposers.push(
      store.on("joystick", (d) => {
        const v = d as { x: number; y: number };
        this.joy = v;
      }),
    );

    // welcome dialogue
    const welcome = () => {
      if (store.get().loading || store.get().fading) { this.welcomeT = window.setTimeout(welcome, 300); return; }
      const mzw = store.get().marsZone;
      if (mzw > 0) {
        const zn = ZONES[mzw]!.name;
        store.say([{ speaker: "nova", en: `Welcome to ${zn}! Follow the gold beacon to meet the rover — tap the minimap or press M for the big map.`, bn: `${zn}-এ স্বাগতম! সোনালি আলো ধরে রোভারের কাছে যাও — বড় ম্যাপ দেখতে মিনি-ম্যাপে চাপো বা M চাপো।` }]);
      } else if (this.metAtStart) {
        this.startMeeting(true);
      } else {
        store.say(NOVA_WELCOME_MARS);
        store.set({ objective: UI.objectiveExplore });
      }
    };
    this.welcomeT = window.setTimeout(welcome, 900);
    this.disposers.push(() => window.clearTimeout(this.welcomeT));
  }

  /** Procedural "Mars Heritage Corridor": 4 real landing regions along -Z (like the Moon),
   *  shaped after NASA traverse maps — one continuous heightfield, so visible ground == walkable ground. */
  private loadNasaMap() {
    const N = ZONES.length, STEP = 2;
    const minX = -ZONE / 2, minZ = -ZONE * (N - 0.5);
    const NX = Math.round(ZONE / STEP) + 1, NZ = Math.round((ZONE * N) / STEP) + 1;
    const sx = ZONE / (NX - 1), sz = (ZONE * N) / (NZ - 1);
    const data = new Float32Array(NX * NZ);
    const zoneT = new Float32Array(NX * NZ); // continuous zone index for colouring
    const craterK = new Float32Array(NX * NZ); // 0..1 inside bowls (darker)
    const riverK = new Float32Array(NX * NZ);
    const extra = extraCraters();
    for (let gz = 0; gz < NZ; gz++) for (let gx = 0; gx < NX; gx++) {
      const x = minX + gx * sx, z = minZ + gz * sz, i = gz * NX + gx;
      const r = marsRelief(x, z, extra);
      data[i] = r.h; zoneT[i] = r.zt; craterK[i] = r.bowl; riverK[i] = r.river;
    }
    this.hf = { data, nx: NX, nz: NZ, minX, minZ, sx, sz };

    // ground mesh straight from the heightfield
    const verts = new Float32Array(NX * NZ * 3), cols = new Float32Array(NX * NZ * 3), uvs = new Float32Array(NX * NZ * 2);
    const pal = MARS_PALETTE.map((p) => p.map((c) => new THREE.Color(c)));
    const ca = new THREE.Color(), cb = new THREE.Color(), cc = new THREE.Color(), silt = new THREE.Color();
    for (let gz = 0; gz < NZ; gz++) for (let gx = 0; gx < NX; gx++) {
      const i = gz * NX + gx, x = minX + gx * sx, z = minZ + gz * sz, y = data[i]!;
      verts[i * 3] = x; verts[i * 3 + 1] = y; verts[i * 3 + 2] = z;
      uvs[i * 2] = x / 6; uvs[i * 2 + 1] = z / 6;
      const hx = data[gz * NX + Math.min(NX - 1, gx + 1)]! - data[gz * NX + Math.max(0, gx - 1)]!;
      const hz = data[Math.min(NZ - 1, gz + 1) * NX + gx]! - data[Math.max(0, gz - 1) * NX + gx]!;
      const slope = Math.min(1, Math.hypot(hx, hz) / (4 * STEP) * 1.6);
      const zt = zoneT[i]!, z0 = Math.floor(zt), z1 = Math.min(N - 1, z0 + 1), k = zt - z0;
      const A = pal[z0]!, B = pal[z1]!;
      const n = fbm(x * 0.07, z * 0.07, 4);
      ca.copy(A[0]!).lerp(A[1]!, n); cb.copy(B[0]!).lerp(B[1]!, n); ca.lerp(cb, k);
      cc.copy(A[2]!).lerp(B[2]!, k); // rock / bedrock tone on slopes
      ca.lerp(cc, slope * 0.85);
      ca.multiplyScalar(1 - craterK[i]! * 0.22 + (fbm(x * 0.4 + 9, z * 0.4, 2) - 0.5) * 0.12);
      if (riverK[i]! > 0) ca.lerp(silt.setRGB(0.62, 0.42, 0.3).multiplyScalar(0.85 + fbm(x * 0.3, z * 0.3) * 0.3), riverK[i]! * 0.55);
      cols[i * 3] = ca.r; cols[i * 3 + 1] = ca.g; cols[i * 3 + 2] = ca.b;
    }
    const ind = new Uint32Array((NX - 1) * (NZ - 1) * 6);
    let q = 0;
    for (let gz = 0; gz < NZ - 1; gz++) for (let gx = 0; gx < NX - 1; gx++) {
      const p0 = gz * NX + gx, p1 = p0 + 1, p2 = p0 + NX, p3 = p2 + 1;
      ind[q++] = p0; ind[q++] = p2; ind[q++] = p1; ind[q++] = p1; ind[q++] = p2; ind[q++] = p3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    g.setIndex(new THREE.BufferAttribute(ind, 1));
    g.computeVertexNormals();
    if ((g.attributes["normal"] as THREE.BufferAttribute).getY(Math.floor(NX * NZ / 2)) < 0) {
      for (let t = 0; t < ind.length; t += 3) { const s = ind[t]!; ind[t] = ind[t + 2]!; ind[t + 2] = s; }
      g.index!.needsUpdate = true; g.computeVertexNormals();
    }
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.97, metalness: 0, map: makeGrainTexture(), bumpMap: makeGrainTexture(true), bumpScale: 1.4,
    }));
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.remove(this.terrain);
    this.terrain.geometry.dispose();
    this.terrain = ground;
    this.buildMapEdges();
    this.resnap();
    this.bakeMinimap();
    store.set({ loading: false });
    if (store.get().marsZone === 0) window.setTimeout(() => { if (!this.disposed) voice.play("01_nova_landing"); }, 900);
    this.buildNaturalRocks();
    this.buildTracks();
  }

  /** wind-sculpted boulders: noisy icosahedrons, per-instance tint, clustered + scatter along the whole corridor */
  private buildNaturalRocks() {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const pa = geo.attributes["position"] as THREE.BufferAttribute; const v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      const n = 0.72 + fbm(v.x * 1.7 + 3, v.z * 1.7 + v.y * 1.3, 3) * 0.55;
      v.multiplyScalar(n); if (v.y < -0.1) v.y *= 0.35; // flat buried bottoms
      v.x *= 1.15; pa.setXYZ(i, v.x, v.y * 0.7, v.z);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0, map: makeGrainTexture(), bumpMap: makeGrainTexture(true), bumpScale: 2, flatShading: true });
    const count = 2400, rnd = rng(4242);
    const rocks = new THREE.InstancedMesh(geo, mat, count);
    rocks.castShadow = rocks.receiveShadow = true;
    const col = new THREE.Color(); const pal = MARS_PALETTE.map((p) => new THREE.Color(p[2]!));
    this.scene.remove(this.rocks); this.rocks = rocks; this.rockData = [];
    const clusters = MARS_SITES.map((m) => [m.x, m.z] as const);
    const total = ZONE * ZONES.length;
    for (let i = 0; i < count; i++) {
      let x: number, z: number;
      if (i < 700) { const c = clusters[i % clusters.length]!; const a = rnd() * 6.28, r = 6 + rnd() * 40; x = c[0] + Math.cos(a) * r; z = c[1] + Math.sin(a) * r; }
      else { x = (rnd() - 0.5) * (ZONE - 30); z = ZONE / 2 - 15 - rnd() * (total - 30); }
      if ([SITE, SPIRIT, OPPY, INSIGHT].some((q) => Math.hypot(x - q.x, z - q.z) < 9)) { x += 20; }
      const big = rnd() < 0.08;
      const s = big ? 1.4 + rnd() * 2.6 : 0.12 + Math.pow(rnd(), 3) * 1.1;
      this.rockData.push({ x, z, s, r: new THREE.Euler(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4) });
      const zi = Math.min(3, Math.max(0, Math.round(-z / ZONE)));
      col.copy(pal[zi]!).lerp(new THREE.Color(0xa8623c), rnd() * 0.5).multiplyScalar(0.75 + rnd() * 0.45);
      rocks.setColorAt(i, col);
    }
    this.scene.add(rocks);
    this.resnap();
  }

  /** old rover tyre trails around each landing site + live boot prints buffer */
  private buildTracks() {
    const tex = (draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = c.height = 64; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const tyre = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, map: tex((g) => { g.fillStyle = "rgba(45,18,8,.4)"; for (const x of [4, 48]) for (let y = 0; y < 64; y += 8) g.fillRect(x, y, 12, 5); }) });
    const trail = (cx: number, cz: number, seed: number) => {
      const r = rng(seed), n = 220; const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 0.75), tyre, n); const o = new THREE.Object3D();
      let x = cx, z = cz, a = r() * 6.28;
      for (let k = 0; k < n; k++) { a += (r() - 0.5) * 0.25; x += Math.sin(a) * 0.7; z += Math.cos(a) * 0.7; o.position.set(x, this.groundHeight(x, z) + 0.03, z); o.rotation.set(-Math.PI / 2, 0, a); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }
      this.scene.add(im);
    };
    trail(SITE.x, SITE.z, 11); trail(SPIRIT.x, SPIRIT.z, 22); trail(OPPY.x, OPPY.z, 33); trail(OPPY.x, OPPY.z, 34);
    const boot = tex((g) => { g.fillStyle = "rgba(50,20,8,.55)"; g.beginPath(); g.ellipse(32, 20, 14, 17, 0, 0, 6.3); g.ellipse(32, 48, 11, 13, 0, 0, 6.3); g.fill(); g.fillStyle = "rgba(25,10,4,.35)"; for (let y = 8; y < 60; y += 6) g.fillRect(20, y, 24, 2); });
    this.prints = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.42), new THREE.MeshBasicMaterial({ map: boot, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 400);
    this.prints.count = 0; this.prints.frustumCulled = false; this.scene.add(this.prints);
  }
  private prints: THREE.InstancedMesh | null = null;
  private printI = 0; private printN = 0; private printDist = 0; private printSide = 1;
  private dropPrint() {
    if (!this.prints) return;
    const p = this.player.position, a = this.player.rotation.y, side = (this.printSide = -this.printSide) * 0.14;
    const x = p.x + Math.cos(a) * side, z = p.z - Math.sin(a) * side;
    const o = new THREE.Object3D(); o.position.set(x, this.groundHeight(x, z) + 0.03, z); o.rotation.set(-Math.PI / 2, 0, a); o.updateMatrix();
    this.prints.setMatrixAt(this.printI, o.matrix); this.printI = (this.printI + 1) % 400; this.printN = Math.min(400, this.printN + 1);
    this.prints.count = this.printN; this.prints.instanceMatrix.needsUpdate = true;
  }

  private makeSky() {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#5a3524");
    gr.addColorStop(0.45, "#b9784f");
    gr.addColorStop(0.62, "#e0a77a");
    gr.addColorStop(1, "#c98a5e");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /** Your rigged astronaut replaces the placeholder explorer. */
  private loadHero() {
    loader().load("/models/astronaut.glb", (gltf) => {
      if (this.disposed) return;
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = 1.8 / Math.max(size.y, 0.001);
      m.scale.setScalar(k);
      m.position.set(0, -box.min.y * k, 0);
      m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.player.children.forEach((c) => (c.visible = false));
      delete this.player.userData["limbs"];
      this.player.add(m);
      if (gltf.animations[0]) {
        this.mixer = new THREE.AnimationMixer(m);
        this.walkAction = this.mixer.clipAction(gltf.animations[0]);
        this.walkAction.play();
      }
    });
  }

  private buildMinimap() {
    const c = document.createElement("canvas");
    c.width = c.height = 180;
    c.style.cssText = "position:fixed;top:72px;right:16px;width:150px;height:150px;border-radius:50%;border:2px solid rgba(255,210,150,.7);box-shadow:0 0 18px rgba(0,0,0,.5);z-index:40;pointer-events:auto;cursor:pointer;background:#2a140a";
    c.title = "Open map";
    c.addEventListener("click", () => store.set({ bigMap: true }));
    document.body.appendChild(c);
    this.mini = c;
  }

  private bakeMinimap() {
    const h = this.hf; if (!h) return;
    let lo = Infinity, hi = -Infinity;
    for (const v of h.data) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const c = document.createElement("canvas");
    c.width = h.nx; c.height = h.nz;
    const g = c.getContext("2d")!;
    const img = g.createImageData(h.nx, h.nz);
    for (let i = 0; i < h.data.length; i++) {
      const t = ((h.data[i] ?? lo) - lo) / (hi - lo || 1);
      img.data[i * 4] = 90 + t * 160; img.data[i * 4 + 1] = 40 + t * 110; img.data[i * 4 + 2] = 20 + t * 70; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.miniBg = c;
  }

  private sectorAt(x: number, z: number) {
    if (Math.hypot(x - SITE.x, z - SITE.z) < 30) return "ARES VALLIS · CARL SAGAN MEMORIAL STATION";
    for (const m of MARS_SITES) if (Math.hypot(x - m.x, z - m.z) < 22) return `${m.en.toUpperCase()} · ${m.bn}`;
    const i = THREE.MathUtils.clamp(Math.floor((ZONE / 2 - z) / ZONE), 0, ZONES.length - 1);
    return ZONES[i]!.name;
  }

  /** Full-screen tactical map (opened by tapping the minimap). */
  private drawBigMap() {
    const open = store.get().bigMap;
    if (!open) { if (this.big) this.big.style.display = "none"; return; }
    if (!this.big) {
      const c = document.createElement("canvas");
      c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:45;background:rgba(10,5,3,.92)";
      c.addEventListener("click", () => store.set({ bigMap: false }));
      document.body.appendChild(c);
      this.big = c;
    }
    const c = this.big; c.style.display = "block";
    const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const g = c.getContext("2d")!;
    const minX = -ZONE / 2, maxZ = ZONE / 2, depth = ZONE * ZONES.length;
    const sc = Math.min((W * 0.8) / ZONE, (H * 0.86) / depth);
    const ox = W / 2 - (ZONE * sc) / 2, oy = H * 0.07;
    const toX = (x: number) => ox + (x - minX) * sc, toY = (z: number) => oy + (maxZ - z) * sc;
    g.clearRect(0, 0, W, H);
    if (this.miniBg && this.hf) {
      const h = this.hf;
      g.save(); g.translate(toX(h.minX), toY(h.minZ)); g.scale(1, -1);
      g.drawImage(this.miniBg, 0, 0, h.sx * (h.nx - 1) * sc, h.sz * (h.nz - 1) * sc);
      g.restore();
    }
    const badges = store.get().badges;
    ZONES.forEach((zn, i) => {
      const y0 = toY(ZONE / 2 - i * ZONE);
      g.strokeStyle = "rgba(255,217,125,.5)"; g.setLineDash([6, 6]);
      g.strokeRect(ox, y0, ZONE * sc, ZONE * sc); g.setLineDash([]);
      const unlocked = i === 0 || badges.length >= i;
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(ox + 6, y0 + 6, Math.min(ZONE * sc - 12, 330), 24);
      g.fillStyle = unlocked ? "#ffd97d" : "#9a8a80"; g.font = "bold 12px sans-serif"; g.textAlign = "left";
      g.fillText((unlocked ? "" : "🔒 ") + zn.name, ox + 12, y0 + 22);
    });
    const pin = (x: number, z: number, col: string, label: string) => {
      g.fillStyle = col; g.strokeStyle = "#000"; g.lineWidth = 2;
      g.beginPath(); g.arc(toX(x), toY(z), 7, 0, 6.29); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 12px sans-serif"; g.textAlign = "center";
      g.fillText(label, toX(x), toY(z) - 12);
    };
    g.font = "11px sans-serif"; g.textAlign = "center";
    for (const m of MARS_SITES) {
      g.fillStyle = "rgba(255,240,220,.85)"; g.beginPath(); g.arc(toX(m.x), toY(m.z), 3, 0, 6.29); g.fill();
      g.fillStyle = "rgba(0,0,0,.55)"; const tw = g.measureText(m.en).width; g.fillRect(toX(m.x) - tw / 2 - 3, toY(m.z) + 5, tw + 6, 14);
      g.fillStyle = "#ffe9cf"; g.fillText(m.en, toX(m.x), toY(m.z) + 16);
    }
    g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(W / 2 - 200, H - 34, 400, 24);
    g.fillStyle = "#ffd97d"; g.font = "bold 12px sans-serif";
    g.fillText("WASD walk · SPACE jump · E talk · M / tap = close map", W / 2, H - 18);
    pin(this.rover.position.x, this.rover.position.z, "#ffd97d", "SOJOURNER");
    pin(this.spirit.position.x, this.spirit.position.z, "#ff8a5c", "SPIRIT");
    pin(this.oppy.position.x, this.oppy.position.z, "#6cc6ff", "OPPY");
    pin(this.insight.position.x, this.insight.position.z, "#b58cff", "INSIGHT");
    const p = this.player.position;
    pin(p.x, p.z, "#4fd1ff", "YOU");
  }

  private drawMinimap(dt: number) {
    this.drawBigMap();
    const c = this.mini; if (!c) return;
    const g = c.getContext("2d")!;
    const W = c.width, R = W / 2, range = 120; // metres shown from centre
    const p = this.player.position;
    g.save();
    g.clearRect(0, 0, W, W);
    g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();
    g.translate(R, R);
    g.rotate(this.camYaw);
    const sc = R / range;
    const h = this.hf;
    if (this.miniBg && h) {
      g.drawImage(this.miniBg, (h.minX - p.x) * sc, (h.minZ - p.z) * sc, h.sx * (h.nx - 1) * sc, h.sz * (h.nz - 1) * sc);
    } else { g.fillStyle = "#5a2e18"; g.fillRect(-R * 2, -R * 2, W * 2, W * 2); }
    // rover pin
    const sojDone = store.get().flags.includes("sojourner");
    const spDone = store.get().flags.includes("spirit");
    const opDone = store.get().flags.includes("oppy");
    const tgt = opDone ? this.insight.position : spDone ? this.oppy.position : sojDone ? this.spirit.position : this.rover.position;
    const rx = (tgt.x - p.x) * sc, rz = (tgt.z - p.z) * sc;
    const rd = Math.hypot(rx, rz), lim = R - 10;
    const k = rd > lim ? lim / rd : 1;
    g.fillStyle = opDone ? "#b58cff" : spDone ? "#6cc6ff" : sojDone ? "#ff8a5c" : "#ffd97d"; g.strokeStyle = "#000"; g.lineWidth = 2;
    g.beginPath(); g.arc(rx * k, rz * k, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
    // player arrow (camera-forward = up)
    g.save(); g.translate(R, R);
    g.rotate(this.camYaw - this.player.rotation.y + Math.PI);
    g.fillStyle = "#7fe3ff"; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, W - 30, W, 30);
    g.fillStyle = "#ffe2b8"; g.font = "bold 15px sans-serif"; g.textAlign = "center";
    g.fillText(`${opDone ? "INSIGHT" : spDone ? "OPPY" : sojDone ? "SPIRIT" : "SOJOURNER"} · ${Math.round(p.distanceTo(tgt))}m`, R, W - 10);
    // sector banner
    this.sectorTimer -= dt;
    const name = this.sectorAt(p.x, p.z);
    if (name !== this.sectorName) {
      this.sectorName = name;
      store.set({ hint: { en: "📍 " + name, bn: "📍 " + name } });
    }
  }

  private resnap() {
    const dummy = new THREE.Object3D();
    this.rockData.forEach((r, i) => {
      dummy.position.set(r.x, this.groundHeight(r.x, r.z) + r.s * 0.25, r.z);
      dummy.rotation.copy(r.r);
      dummy.scale.setScalar(r.s * 0.6);
      dummy.updateMatrix();
      this.rocks.setMatrixAt(i, dummy.matrix);
    });
    this.rocks.instanceMatrix.needsUpdate = true;
    for (const o of [this.lander, this.rover, this.beacon, this.player, this.spirit, this.spiritBeacon, this.oppy, this.oppyBeacon, this.insight, this.insightBeacon]) {
      o.position.y = this.groundHeight(o.position.x, o.position.z);
    }
  }

  /** red bedrock under everything + rising dunes around the outer edge: no black void anywhere */
  private buildMapEdges() {
    const h = this.hf!;
    const maxX = h.minX + h.sx * (h.nx - 1), maxZ = h.minZ + h.sz * (h.nz - 1);
    let lo = Infinity;
    for (let i = 0; i < h.data.length; i += 7) lo = Math.min(lo, h.data[i]!);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    const W = 70, M = 10, step = 4;
    const sandA = new THREE.Color(0x8a5236), sandB = new THREE.Color(0xb27a58);
    const skirt = (x0: number, z0: number, x1: number, z1: number, ox: number, oz: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / step) + 1;
      const verts: number[] = [], cols: number[] = [], ind: number[] = [];
      for (let r = 0; r <= M; r++) {
        const t = r / M;
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1);
          const ex = x0 + (x1 - x0) * u, ez = z0 + (z1 - z0) * u;
          const base = this.sampleHf(THREE.MathUtils.clamp(ex, h.minX, maxX), THREE.MathUtils.clamp(ez, h.minZ, maxZ));
          const px = ex + ox * t * W, pz = ez + oz * t * W;
          const rise = t * t * (3 - 2 * t) * (16 + fbm(px * 0.03, pz * 0.03) * 10);
          verts.push(px, base + rise - (r === 0 ? 0.3 : 0), pz);
          const c = sandA.clone().lerp(sandB, fbm(px * 0.06 + 3, pz * 0.06));
          cols.push(c.r, c.g, c.b);
        }
      }
      for (let r = 0; r < M; r++) for (let i = 0; i < n - 1; i++) {
        const p0 = r * n + i, p1 = p0 + 1, p2 = p0 + n, p3 = p2 + 1;
        ind.push(p0, p2, p1, p1, p2, p3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      g.setIndex(ind);
      g.computeVertexNormals();
      const ny = (g.attributes["normal"] as THREE.BufferAttribute).getY(Math.floor(n / 2));
      if (ny < 0) { ind.reverse(); g.setIndex(ind); g.computeVertexNormals(); }
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    skirt(h.minX, maxZ + W, h.minX, h.minZ - W, -1, 0);
    skirt(maxX, maxZ + W, maxX, h.minZ - W, 1, 0);
    skirt(h.minX - W, maxZ, maxX + W, maxZ, 0, 1);
    skirt(h.minX - W, h.minZ, maxX + W, h.minZ, 0, -1);
    const bed = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - h.minX + W * 4, maxZ - h.minZ + W * 4),
      new THREE.MeshStandardMaterial({ color: 0x6a3018, roughness: 1, metalness: 0 }),
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.set((h.minX + maxX) / 2, lo - 4, (h.minZ + maxZ) / 2);
    this.scene.add(bed);
  }

  private sampleHf(x: number, z: number): number {
    const h = this.hf!;
    const fx = THREE.MathUtils.clamp((x - h.minX) / h.sx, 0, h.nx - 1.001);
    const fz = THREE.MathUtils.clamp((z - h.minZ) / h.sz, 0, h.nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const g = (u: number, v: number) => h.data[v * h.nx + u] ?? 0;
    const top = g(ix, iz) * (1 - tx) + g(ix + 1, iz) * tx;
    const bot = g(ix, iz + 1) * (1 - tx) + g(ix + 1, iz + 1) * tx;
    return top * (1 - tz) + bot * tz;
  }

  private groundHeight(x: number, z: number): number {
    if (this.hf) {
      let h = this.sampleHf(x, z);
      // flatten pads at landing site and start
      for (const [fx, fz, fr] of [
        [SITE.x, SITE.z, 14],
        [SPIRIT.x, SPIRIT.z, 12],
        [OPPY.x, OPPY.z, 12],
        [INSIGHT.x, INSIGHT.z, 14],
        [0, 0, 10],
      ] as const) {
        const dd = Math.hypot(x - fx, z - fz);
        if (dd < fr) h = THREE.MathUtils.lerp(this.sampleHf(fx, fz), h, dd / fr);
      }
      return h;
    }
    let h = fbm(x * 0.012 + 7, z * 0.012 + 3, 4) * 7 - 3.5;
    // craters
    const craters: [number, number, number][] = [
      [-40, 30, 16],
      [20, 55, 11],
      [-15, -60, 13],
      [70, 20, 9],
      [-70, -25, 18],
    ];
    for (const [cx, cz, r] of craters) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < r) {
        const k = d / r;
        h -= Math.cos(k * Math.PI * 0.5) * r * 0.12;
      } else if (d < r * 1.25) {
        h += (1 - (d - r) / (r * 0.25)) * r * 0.05; // rim
      }
    }
    // flatten near site and start
    for (const [fx, fz, fr] of [
      [SITE.x, SITE.z, 14],
      [SPIRIT.x, SPIRIT.z, 12],
      [OPPY.x, OPPY.z, 12],
      [0, 0, 10],
    ] as const) {
      const d = Math.hypot(x - fx, z - fz);
      if (d < fr) h *= d / fr;
    }
    return h;
  }

  private buildLander(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcfc9ba,
      roughness: 0.55,
      metalness: 0.35,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd8a545,
      roughness: 0.4,
      metalness: 0.7,
    });
    // tetrahedral body
    const body = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 4), goldMat);
    body.position.y = 0.9;
    body.rotation.y = Math.PI / 4;
    g.add(body);
    // petals (open)
    for (let i = 0; i < 3; i++) {
      const petal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), mat);
      const a = (i / 3) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 1.5, 0.35, Math.sin(a) * 1.5);
      petal.rotation.set(0, -a, 0.5);
      g.add(petal);
    }
    // mast + camera
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), mat);
    mast.position.y = 2.1;
    g.add(mast);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.18), mat);
    cam.position.y = 2.8;
    g.add(cam);
    // dish
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 16, 1, true), mat);
    dish.position.set(-0.8, 1.9, 0.4);
    dish.rotation.z = 0.9;
    g.add(dish);
    g.traverse((o: THREE.Object3D) => {
      o.castShadow = true;
    });
    return g;
  }

  private startMeeting(skipCamera = false) {
    if (this.meeting) return;
    this.meeting = true;
    store.set({ objective: null, hint: null });
    store.set({ metSojourner: true, showEncounter: true });
    if (store.get().current) window.setTimeout(() => store.clearDialogue(), 2500); else store.clearDialogue();
    if (!skipCamera) {
      // gently pull camera toward the rover
      this.camDist = 5;
    }
  }

  onPointerDown(x: number, y: number) {
    this.dragging = true;
    this.lastPointer = { x, y };
  }

  onPointerMove(x: number, y: number) {
    if (!this.dragging) return;
    this.camYaw -= (x - this.lastPointer.x) * 2.4;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + (y - this.lastPointer.y) * 1.6,
      0.05,
      1.1,
    );
    this.lastPointer = { x, y };
  }

  onPointerUp() {
    this.dragging = false;
  }

  onWheel(d: number) {
    this.camDist = THREE.MathUtils.clamp(this.camDist + d * 0.01, 3.5, 14);
  }

  onKey(code: string, down: boolean) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private devils: { g: THREE.Points; x: number; z: number; a: number }[] = [];
  private berries: THREE.InstancedMesh | null = null;
  private berryPos: [number, number][] = [];
  private prints: THREE.InstancedMesh | null = null;
  private printIdx = 0;
  private lastPrint = new THREE.Vector3(1e9, 0, 0);
  private buildLivingMars() {
    // Martian blueberries (hematite spherules) around Oppy
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x4a5a78, roughness: 0.35, metalness: 0.4 }), 260);
    for (let i = 0; i < 260; i++) {
      const r = 3 + Math.random() * 26, a = Math.random() * 6.28;
      this.berryPos.push([OPPY.x + Math.cos(a) * r, OPPY.z + Math.sin(a) * r]);
    }
    this.berries = bm; this.scene.add(bm);
    // dust devils
    for (let k = 0; k < 4; k++) {
      const n = 400, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const h = Math.random(), a = Math.random() * 6.28, r = 0.4 + h * 3.5;
        arr.set([Math.cos(a) * r, h * 22, Math.sin(a) * r], i * 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const g = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd9a377, size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }));
      const x = (Math.random() - 0.5) * 260, z = 60 - k * 340 - Math.random() * 120;
      this.devils.push({ g, x, z, a: Math.random() * 6.28 }); this.scene.add(g);
    }
    // boot prints
    const pm = new THREE.InstancedMesh(new THREE.CircleGeometry(0.12, 8),
      new THREE.MeshBasicMaterial({ color: 0x4a2414, transparent: true, opacity: 0.45, depthWrite: false }), 120);
    pm.count = 0; this.prints = pm; this.scene.add(pm);
  }
  private updateLivingMars(dt: number) {
    const d = new THREE.Object3D();
    if (this.berries && this.hf && !this.berries.userData["snapped"]) {
      this.berryPos.forEach(([x, z], i) => { d.position.set(x, this.groundHeight(x, z) + 0.04, z); d.rotation.set(0, 0, 0); d.updateMatrix(); this.berries!.setMatrixAt(i, d.matrix); });
      this.berries.instanceMatrix.needsUpdate = true; this.berries.userData["snapped"] = true;
    }
    for (const v of this.devils) {
      v.a += dt * 0.15; v.x += Math.cos(v.a) * dt * 2.5; v.z += Math.sin(v.a) * dt * 2.5;
      v.g.position.set(v.x, this.groundHeight(v.x, v.z), v.z); v.g.rotation.y += dt * 3;
    }
    const p = this.player.position;
    if (this.prints && p.distanceTo(this.lastPrint) > 0.7) {
      this.lastPrint.copy(p);
      const side = this.printIdx % 2 ? 0.15 : -0.15;
      d.position.set(p.x + Math.cos(this.player.rotation.y) * side, this.groundHeight(p.x, p.z) + 0.03, p.z - Math.sin(this.player.rotation.y) * side);
      d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1.8, 1); d.updateMatrix();
      this.prints.setMatrixAt(this.printIdx % 120, d.matrix); this.printIdx++;
      this.prints.count = Math.min(this.printIdx, 120); this.prints.instanceMatrix.needsUpdate = true;
    }
  }

  update(dt: number, t: number) {
    this.updateLivingMars(dt);
    // movement input
    const input = new THREE.Vector2(
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) +
        this.joy.x,
      (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) +
        this.joy.y,
    );
    const moving = !this.meeting && !this.spiritMeeting && !this.oppyMeeting && !this.insightMeeting && input.lengthSq() > 0.001;
    if (moving) {
      input.normalize();
      const speed = 6.5;
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      const dir = new THREE.Vector3(
        input.x * cos - input.y * sin,
        0,
        -input.y * cos - input.x * sin,
      );
      this.velocity.lerp(dir.multiplyScalar(speed), dt * 8);
      this.player.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    } else {
      this.velocity.lerp(new THREE.Vector3(), dt * 10);
    }
    const prevX = this.player.position.x, prevZ = this.player.position.z, prevY = this.player.position.y;
    this.player.position.addScaledVector(this.velocity, dt);
    // world bounds
    const h = this.hf;
    const bx0 = h ? h.minX + 15 : -WORLD / 2 + 10, bx1 = h ? h.minX + h.sx * (h.nx - 1) - 15 : WORLD / 2 - 10;
    const bz0 = h ? h.minZ + 15 : -WORLD / 2 + 10, bz1 = h ? h.minZ + h.sz * (h.nz - 1) - 15 : WORLD / 2 - 10;
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, bx0, bx1);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, bz0, bz1);
    // no teleporting up cliffs: block steps steeper than ~55°, fall smoothly down drops
    let gy = this.groundHeight(this.player.position.x, this.player.position.z);
    const run = Math.hypot(this.player.position.x - prevX, this.player.position.z - prevZ);
    if (run > 1e-4 && gy - prevY > Math.max(0.35, run * 1.5) && !this.snapNext) {
      this.player.position.x = prevX; this.player.position.z = prevZ;
      this.velocity.multiplyScalar(0.2);
      gy = this.groundHeight(prevX, prevZ);
    }
    this.fallV = gy < prevY - 0.05 && !this.snapNext ? this.fallV + 25 * dt : 0;
    this.player.position.y = this.fallV > 0 ? Math.max(gy, prevY - this.fallV * dt) : gy;
    this.printDist += Math.hypot(this.player.position.x - prevX, this.player.position.z - prevZ);
    if (this.printDist > 0.75) { this.printDist = 0; this.dropPrint(); }

    // walk animation
    const limbs = this.player.userData["limbs"];
    if (limbs) {
      const speedK = Math.min(this.velocity.length() / 6.5, 1);
      const sw = Math.sin(t * 9) * 0.55 * speedK;
      limbs.legL.rotation.x = sw;
      limbs.legR.rotation.x = -sw;
      limbs.armL.rotation.x = -sw * 0.7;
      limbs.armR.rotation.x = sw * 0.7;
      this.player.position.y += Math.abs(Math.sin(t * 9)) * 0.05 * speedK;
    }

    if (this.mixer && this.walkAction) {
      const sk = Math.min(this.velocity.length() / 6.5, 1);
      this.walkAction.setEffectiveWeight(1);
      this.walkAction.timeScale = sk < 0.05 ? 0 : 0.6 + sk * 0.8;
      this.mixer.update(dt);
    }
    this.drawMinimap(dt);

    // Nova hover-follow
    this.nova.update(dt, t);
    const novaTarget = this.player.position
      .clone()
      .add(
        new THREE.Vector3(
          Math.sin(t * 0.4) * 1.6,
          2.3 + Math.sin(t * 1.5) * 0.18,
          Math.cos(t * 0.4) * 1.6,
        ),
      );
    this.nova.group.position.lerp(novaTarget, dt * 2.2);
    this.nova.group.lookAt(this.meeting ? this.rover.position : this.player.position);

    // beacon pulse
    const ring = this.beacon.getObjectByName("beaconRing") as THREE.Mesh;
    if (ring) {
      const k = 1 + Math.sin(t * 2.4) * 0.25;
      ring.scale.set(k, k, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 2.4) * 0.25;
    }

    // triggers
    if (this.meeting && !store.get().showEncounter) {
      this.meeting = false;
      this.needLeave = true;
      this.camDist = Math.max(this.camDist, 8);
    }
    if (this.needLeave && this.player.position.distanceTo(this.rover.position) > 8) this.needLeave = false;
    if (!this.meeting) {
      const distSite = this.player.position.distanceTo(this.beacon.position);
      if (!this.nearSiteSaid && distSite < 26) {
        this.nearSiteSaid = true;
        store.say(NOVA_NEAR_SITE);
        store.set({ objective: UI.walkToRover });
      }
      if (!this.needLeave && this.player.position.distanceTo(this.rover.position) < 4.2) {
        this.startMeeting();
      }
    } else {
      // slow orbit toward rover while meeting
      const toRover = this.rover.position.clone().sub(this.player.position);
      this.camYaw = THREE.MathUtils.lerp(
        this.camYaw,
        Math.atan2(-toRover.x, -toRover.z) + Math.PI,
        dt * 1.5,
      );
    }

    // Spirit (zone 2) triggers — open only after Sojourner's mission
    {
      const st = store.get();
      const sojDone = st.flags.includes("sojourner");
      const dS = this.player.position.distanceTo(this.spirit.position);
      const sr = this.spiritBeacon.getObjectByName("beaconRing") as THREE.Mesh | undefined;
      if (sr) { const k = 1 + Math.sin(t * 2.4) * 0.25; sr.scale.set(k, k, 1); }
      this.spiritBeacon.visible = !st.flags.includes("spirit");
      if (this.spiritMeeting && !st.showSpirit) {
        this.spiritMeeting = false; this.spiritLeave = true; this.camDist = Math.max(this.camDist, 8);
      }
      if (this.spiritLeave && dS > 8) this.spiritLeave = false;
      if (!sojDone) {
        if (dS < 14 && !this.spiritLockSaid) {
          this.spiritLockSaid = true;
          store.say([{ speaker: "nova", en: "Spirit is resting here. First finish Sojourner's mission in Ares Vallis!", bn: "স্পিরিট এখানে বিশ্রাম নিচ্ছে। আগে অ্যারিস ভ্যালিসে সোজার্নারের মিশন শেষ করো!" }]);
        }
        if (dS > 30) this.spiritLockSaid = false;
      } else if (!this.spiritMeeting && !this.meeting) {
        if (!this.spiritNear && dS < 28) {
          this.spiritNear = true;
          voice.play("spirit/01_spirit_arrival");
          store.say([{ speaker: "nova", en: "Awesome job, Explorer! We've reached Gusev Crater. Look ahead—there stands our brave fighter rover, Spirit!", bn: "সাবাশ এক্সপ্লোরার! আমরা গুসেভ ক্রেটারে এসে গেছি। ওই দেখো সামনে দাঁড়িয়ে আছে আমাদের লড়াকু রোভার স্পিরিট!" }]);
          store.set({ objective: { en: "Walk up to Spirit", bn: "স্পিরিটের কাছে হেঁটে যাও" } });
        }
        if (!this.spiritLeave && dS < 4.6) {
          this.spiritMeeting = true;
          voice.stop();
          store.clearDialogue();
          store.set({ objective: null, hint: null, showSpirit: true });
          this.camDist = 5;
        }
      }
      if (this.spiritMeeting) {
        const to = this.spirit.position.clone().sub(this.player.position);
        this.camYaw = THREE.MathUtils.lerp(this.camYaw, Math.atan2(-to.x, -to.z) + Math.PI, dt * 1.5);
      }
    }

    // Opportunity (zone 3) triggers — open only after Spirit's mission
    {
      const st = store.get();
      const sojDone = st.flags.includes("spirit");
      const dS = this.player.position.distanceTo(this.oppy.position);
      const sr = this.oppyBeacon.getObjectByName("beaconRing") as THREE.Mesh | undefined;
      if (sr) { const k = 1 + Math.sin(t * 2.4) * 0.25; sr.scale.set(k, k, 1); }
      this.oppyBeacon.visible = !st.flags.includes("oppy");
      if (this.oppyMeeting && !st.showOppy) {
        this.oppyMeeting = false; this.oppyLeave = true; this.camDist = Math.max(this.camDist, 8);
      }
      if (this.oppyLeave && dS > 8) this.oppyLeave = false;
      if (!sojDone) {
        if (dS < 14 && !this.oppyLockSaid) {
          this.oppyLockSaid = true;
          store.say([{ speaker: "nova", en: "Oppy is sleeping here. First finish Spirit's mission in Gusev Crater!", bn: "ওপি এখানে ঘুমিয়ে আছে। আগে গুসেভ ক্রেটারে স্পিরিটের মিশন শেষ করো!" }]);
        }
        if (dS > 30) this.oppyLockSaid = false;
      } else if (!this.oppyMeeting && !this.meeting && !this.spiritMeeting) {
        if (!this.oppyNear && dS < 28) {
          this.oppyNear = true;
          voice.play("oppy/01_oppy_arrival");
          store.say([{ speaker: "nova", en: "We've arrived at Meridiani Planum! Look ahead—it's the legendary Oppy, the rover that ran an Olympic marathon on Mars!", bn: "আমরা এখন মেরিডিয়ানি প্লেনামে! দেখো সামনে সেই কিংবদন্তি রোভার—আমাদের প্রিয় ওপি, যে মঙ্গলে ম্যারাথন দৌড়েছিল!" }]);
          store.set({ objective: { en: "Walk up to Oppy", bn: "ওপির কাছে হেঁটে যাও" } });
        }
        if (!this.oppyLeave && dS < 4.6) {
          this.oppyMeeting = true;
          voice.stop();
          store.clearDialogue();
          store.set({ objective: null, hint: null, showOppy: true });
          this.camDist = 5;
        }
      }
      if (this.oppyMeeting) {
        const to = this.oppy.position.clone().sub(this.player.position);
        this.camYaw = THREE.MathUtils.lerp(this.camYaw, Math.atan2(-to.x, -to.z) + Math.PI, dt * 1.5);
      }
    }

    // InSight (zone 4) triggers — open only after Oppy's mission
    {
      const st = store.get();
      const ready = st.flags.includes("oppy");
      const dS = this.player.position.distanceTo(this.insight.position);
      const sr = this.insightBeacon.getObjectByName("beaconRing") as THREE.Mesh | undefined;
      if (sr) { const k = 1 + Math.sin(t * 2.4) * 0.25; sr.scale.set(k, k, 1); }
      this.insightBeacon.visible = !st.flags.includes("insight");
      if (this.insightMeeting && !st.showInsight) {
        this.insightMeeting = false; this.insightLeave = true; this.camDist = Math.max(this.camDist, 9);
      }
      if (this.insightLeave && dS > 10) this.insightLeave = false;
      if (!ready) {
        if (dS < 16 && !this.insightLockSaid) {
          this.insightLockSaid = true;
          store.say([{ speaker: "nova", en: "InSight is resting here. First finish Oppy's mission in Meridiani Planum!", bn: "ইনসাইট এখানে বিশ্রাম নিচ্ছে। আগে মেরিডিয়ানি প্লেনামে ওপির মিশন শেষ করো!" }]);
        }
        if (dS > 32) this.insightLockSaid = false;
      } else if (!this.insightMeeting && !this.oppyMeeting && !this.meeting && !this.spiritMeeting) {
        if (!this.insightNear && dS < 30) {
          this.insightNear = true;
          voice.play("insight/01_insight_arrival");
          store.say([{ speaker: "nova", en: "Explorer, we've arrived at Elysium Planitia! There's no mountain-climbing rover here. Instead, we're meeting a special friend who came to listen to the secrets beneath Mars. Meet InSight!", bn: "এক্সপ্লোরার, আমরা এসে গেছি এলিসিয়াম প্লেনিশিয়ায়! এখানে কোনো পাহাড়ে ওঠার রোভার নেই। এখানে অপেক্ষা করছে এমন এক বন্ধু, যে মঙ্গলের মাটির নিচের রহস্য শুনতে এসেছিল। তার নাম InSight!" }]);
          store.set({ objective: { en: "Walk up to InSight", bn: "ইনসাইটের কাছে হেঁটে যাও" } });
        }
        if (!this.insightLeave && dS < 6.5) {
          this.insightMeeting = true;
          voice.stop();
          store.clearDialogue();
          store.set({ objective: null, hint: null, showInsight: true });
          this.camDist = 7;
        }
      }
      if (this.insightMeeting) {
        const to = this.insight.position.clone().sub(this.player.position);
        this.camYaw = THREE.MathUtils.lerp(this.camYaw, Math.atan2(-to.x, -to.z) + Math.PI, dt * 1.5);
      }
    }

    // third-person camera
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const camOffset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).multiplyScalar(this.camDist);
    const camPos = target.clone().add(camOffset);
    camPos.y = Math.max(camPos.y, this.groundHeight(camPos.x, camPos.z) + 1.5);
    if (this.snapNext) { this.camera.position.copy(camPos); this.snapNext = false; }
    else this.camera.position.lerp(camPos, dt * 5);
    this.camera.lookAt(target);

    // sun follows player for tight shadows
    const sxp = Math.round(this.player.position.x / 8) * 8, szp = Math.round(this.player.position.z / 8) * 8;
    this.sun.target.position.set(sxp, this.player.position.y, szp);
    this.sun.position.set(sxp + 80, this.player.position.y + 34, szp - 45);
    this.sun.target.updateMatrixWorld();

    this.stars.rotation.y += dt * 0.002;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.mini?.remove();
    this.big?.remove();
    voice.stop();
    store.set({ loading: false, bigMap: false, showEncounter: false });
    store.set({ objective: null, hint: null });
    this.disposers.forEach((d) => d());
    this.scene.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as any).material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
  }
}
