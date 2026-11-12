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
const WORLD = 320;
const ZONE = 350; // metres per real NASA site
const ZONES = [
  { url: "/models/zone1_ares.glb", name: "ZONE 1 · ARES VALLIS — SOJOURNER 1997", grade: [1.25, 0.82, 0.6] },
  { url: "/models/zone2_gusev.glb", name: "ZONE 2 · GUSEV CRATER — SPIRIT 2004", grade: [1.2, 0.75, 0.55] },
  { url: "/models/zone3_meridiani.glb", name: "ZONE 3 · PERSEVERANCE VALLEY ANALOGUE — OPPORTUNITY", grade: [1.05, 0.8, 0.7] },
  { url: "/models/zone4_elysium.glb", name: "ZONE 4 · ELYSIUM PLANITIA — INSIGHT 2018", grade: [1.15, 0.85, 0.68] },
];
const loader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const MAP_DEPTH = 70; // vertical relief (exaggerated for drama)

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
  private oppy = new THREE.Group();
  private oppyBeacon = new THREE.Group();
  private oppyMeeting = false;
  private oppyNear = false;
  private oppyLeave = false;
  private oppyLockSaid = false;
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
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x4a2418, 0.85));
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
    const startPos = this.metAtStart
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
    (window as any).__marsTeleport = (x: number, z: number) => {
      this.player.position.set(x, this.groundHeight(x, z), z);
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
      if (this.metAtStart) {
        this.startMeeting(true);
      } else {
        store.say(NOVA_WELCOME_MARS);
        store.set({ objective: UI.objectiveExplore });
      }
    };
    this.welcomeT = window.setTimeout(welcome, 900);
    this.disposers.push(() => window.clearTimeout(this.welcomeT));
  }

  /** 4 real NASA sites laid end-to-end along -Z, each cropped to the same ZONE x ZONE square
   *  with the same relief; seams get offset-matched heights + a visible sand ramp. */
  private loadNasaMap() {
    const NX = 256, NZ = 1024, N = ZONES.length, B = 15; // B = seam half-width (m)
    const minX = -ZONE / 2, minZ = -ZONE * (N - 0.5);
    const sx = ZONE / (NX - 1), sz = (ZONE * N) / (NZ - 1);
    const data = new Float32Array(NX * NZ).fill(-1e9);
    const wraps: THREE.Group[] = new Array(N);
    this.renderer.localClippingEnabled = true;
    let left = N;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const rowOf = (z: number) => Math.round((z - minZ) / sz);
    ZONES.forEach((zone, zi) => loader().load(zone.url, (gltf) => {
      if (this.disposed) return;
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const k = ZONE / Math.max(Math.min(size.x, size.z), 0.001); // crop to centred square
      const kv = MAP_DEPTH / Math.max(size.y, 0.001);
      const c = box.getCenter(new THREE.Vector3());
      const wrap = new THREE.Group();
      wrap.add(root);
      root.position.set(-c.x, -c.y, -c.z);
      wrap.scale.set(k, kv, k);
      const zc = -zi * ZONE;
      wrap.position.z = zc;
      wrap.updateMatrixWorld(true);
      const zTop = zc + ZONE / 2 - (zi > 0 ? B : 0), zBot = zc - ZONE / 2 + (zi < N - 1 ? B : 0);
      const planes = [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), ZONE / 2),
        new THREE.Plane(new THREE.Vector3(1, 0, 0), ZONE / 2),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), zTop),
        new THREE.Plane(new THREE.Vector3(0, 0, 1), -zBot),
      ];
      const r0 = Math.max(0, rowOf(zc - ZONE / 2)), r1 = Math.min(NZ - 1, rowOf(zc + ZONE / 2));
      wrap.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.color = new THREE.Color(...(zone.grade as [number, number, number]));
        mat.roughness = 0.95;
        mat.metalness = 0;
        mat.clippingPlanes = planes;
        if (mat.map) mat.map.anisotropy = 8;
        const g = m.geometry;
        const pos = g.attributes["position"] as THREE.BufferAttribute;
        const idx = g.index;
        const tri = idx ? idx.count / 3 : pos.count / 3;
        for (let t = 0; t < tri; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3;
          const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
          const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
          b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
          d.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
          const x0 = Math.max(0, Math.floor((Math.min(a.x, b.x, d.x) - minX) / sx));
          const x1 = Math.min(NX - 1, Math.ceil((Math.max(a.x, b.x, d.x) - minX) / sx));
          const z0 = Math.max(r0, Math.floor((Math.min(a.z, b.z, d.z) - minZ) / sz));
          const z1 = Math.min(r1, Math.ceil((Math.max(a.z, b.z, d.z) - minZ) / sz));
          if (z0 > z1 || x0 > x1) continue;
          const den = (b.z - d.z) * (a.x - d.x) + (d.x - b.x) * (a.z - d.z);
          if (Math.abs(den) < 1e-9) continue;
          for (let gz = z0; gz <= z1; gz++) {
            for (let gx = x0; gx <= x1; gx++) {
              const px = minX + gx * sx, pz = minZ + gz * sz;
              const w0 = ((b.z - d.z) * (px - d.x) + (d.x - b.x) * (pz - d.z)) / den;
              const w1 = ((d.z - a.z) * (px - d.x) + (a.x - d.x) * (pz - d.z)) / den;
              const w2 = 1 - w0 - w1;
              if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
              const h = w0 * a.y + w1 * b.y + w2 * d.y;
              const ii = gz * NX + gx;
              if (h > (data[ii] ?? -Infinity)) data[ii] = h;
            }
          }
        }
      });
      wraps[zi] = wrap;
      this.scene.add(wrap);
      this.zoneWraps.push(wrap);
      if (--left > 0) return;

      // 1) fill holes from neighbours along each row (then whole-row fallback)
      for (let gz = 0; gz < NZ; gz++) {
        let last = NaN;
        for (let gx = 0; gx < NX; gx++) { const v = data[gz * NX + gx]!; if (v > -1e8) last = v; else if (!isNaN(last)) data[gz * NX + gx] = last; }
        last = NaN;
        for (let gx = NX - 1; gx >= 0; gx--) { const v = data[gz * NX + gx]!; if (v > -1e8) last = v; else if (!isNaN(last)) data[gz * NX + gx] = last; }
      }
      for (let gz = 1; gz < NZ; gz++) if (data[gz * NX]! < -1e8) for (let gx = 0; gx < NX; gx++) data[gz * NX + gx] = data[(gz - 1) * NX + gx]!;
      for (let gz = NZ - 2; gz >= 0; gz--) if (data[gz * NX]! < -1e8) for (let gx = 0; gx < NX; gx++) data[gz * NX + gx] = data[(gz + 1) * NX + gx]!;
      for (let i = 0; i < data.length; i++) if (data[i]! < -1e8) data[i] = 0;

      // 2) vertical offsets so neighbouring sites meet at the same mean height
      const w = Math.round(B / sz);
      const rowAvg = (r: number) => { let s = 0; for (let gx = 0; gx < NX; gx++) s += data[r * NX + gx]!; return s / NX; };
      const off = new Array(N).fill(0);
      for (let s = 1; s < N; s++) {
        const zr = rowOf(-s * ZONE + ZONE / 2);
        off[s] = off[s - 1] + rowAvg(zr + w) - rowAvg(zr - w); // zr+w is in zone s-1 (higher z)
      }
      for (let zi2 = 0; zi2 < N; zi2++) {
        wraps[zi2]!.position.y = off[zi2];
        const zc2 = -zi2 * ZONE;
        const ra = Math.max(0, rowOf(zc2 - ZONE / 2)), rb = Math.min(NZ - 1, rowOf(zc2 + ZONE / 2));
        for (let gz = ra; gz <= rb; gz++) {
          const zr = minZ + gz * sz; if (Math.abs(zr - zc2) > ZONE / 2 + 1e-3) continue;
          for (let gx = 0; gx < NX; gx++) data[gz * NX + gx]! += off[zi2];
        }
      }
      // 3) smooth sand ramp across each seam (visible mesh == walkable height)
      const sandA = new THREE.Color(0x8a4a2c), sandB = new THREE.Color(0xa86240);
      for (let s = 1; s < N; s++) {
        const zr = rowOf(-s * ZONE + ZONE / 2);
        for (let gx = 0; gx < NX; gx++) {
          const lo = data[(zr - w) * NX + gx]!, hi = data[(zr + w) * NX + gx]!;
          for (let o = -w + 1; o < w; o++) {
            const t = (o + w) / (2 * w);
            data[(zr + o) * NX + gx] = THREE.MathUtils.lerp(lo, hi, t * t * (3 - 2 * t));
          }
        }
        const rows = 2 * w + 1, verts = new Float32Array(NX * rows * 3), cols = new Float32Array(NX * rows * 3);
        const ga = new THREE.Color(...(ZONES[s]!.grade as [number, number, number]));
        const gb = new THREE.Color(...(ZONES[s - 1]!.grade as [number, number, number]));
        for (let r = 0; r < rows; r++) for (let gx = 0; gx < NX; gx++) {
          const gz = zr - w + r, i = r * NX + gx;
          const px = minX + gx * sx, pz = minZ + gz * sz;
          verts[i * 3] = px; verts[i * 3 + 1] = data[gz * NX + gx]! + 0.05; verts[i * 3 + 2] = pz;
          const col = sandA.clone().lerp(sandB, fbm(px * 0.08, pz * 0.08)).multiply(ga.clone().lerp(gb, r / (rows - 1)));
          cols[i * 3] = col.r * 0.8; cols[i * 3 + 1] = col.g * 0.8; cols[i * 3 + 2] = col.b * 0.8;
        }
        const ind: number[] = [];
        for (let r = 0; r < rows - 1; r++) for (let gx = 0; gx < NX - 1; gx++) {
          const p0 = r * NX + gx, p1 = p0 + 1, p2 = p0 + NX, p3 = p2 + 1;
          ind.push(p0, p2, p1, p1, p2, p3);
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        sg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
        sg.setIndex(ind);
        sg.computeVertexNormals();
        if ((sg.attributes["normal"] as THREE.BufferAttribute).getY(0) < 0) { ind.reverse(); sg.setIndex(ind); sg.computeVertexNormals(); }
        const strip = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
        strip.receiveShadow = true;
        this.scene.add(strip);
      }
      this.hf = { data, nx: NX, nz: NZ, minX, minZ, sx, sz };
      this.buildMapEdges();
      this.scene.remove(this.terrain);
      this.terrain.geometry.dispose();
      this.resnap();
      this.bakeMinimap();
      store.set({ loading: false });
      window.setTimeout(() => { if (!this.disposed) voice.play("01_nova_landing"); }, 900);
    }));
    // real Mars rock model replaces the procedural dodecahedrons
    loader().load("/models/rock.glb", (gltf) => {
      if (this.disposed) return;
      let mesh: THREE.Mesh | null = null;
      gltf.scene.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
      if (!mesh) return;
      const src = mesh as THREE.Mesh;
      const geo = src.geometry.clone();
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const sc = 1 / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z, 1e-3);
      geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      geo.scale(sc * 2, sc * 2, sc * 2);
      this.scene.remove(this.rocks);
      const count = 700;
      const rocks = new THREE.InstancedMesh(geo, src.material as THREE.Material, count);
      rocks.castShadow = rocks.receiveShadow = true;
      this.rocks = rocks;
      this.rockData = [];
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * (ZONE - 30);
        const z = ZONE / 2 - 15 - Math.random() * (ZONE * ZONES.length - 30);
        const s = 0.3 + Math.pow(Math.random(), 2.6) * 3;
        this.rockData.push({ x, z, s, r: new THREE.Euler(0, Math.random() * 6.28, 0) });
      }
      this.scene.add(rocks);
      this.resnap();
    });
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
    pin(this.rover.position.x, this.rover.position.z, "#ffd97d", "SOJOURNER");
    pin(this.spirit.position.x, this.spirit.position.z, "#ff8a5c", "SPIRIT");
    pin(this.oppy.position.x, this.oppy.position.z, "#6cc6ff", "OPPY");
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
    const tgt = spDone ? this.oppy.position : sojDone ? this.spirit.position : this.rover.position;
    const rx = (tgt.x - p.x) * sc, rz = (tgt.z - p.z) * sc;
    const rd = Math.hypot(rx, rz), lim = R - 10;
    const k = rd > lim ? lim / rd : 1;
    g.fillStyle = spDone ? "#6cc6ff" : sojDone ? "#ff8a5c" : "#ffd97d"; g.strokeStyle = "#000"; g.lineWidth = 2;
    g.beginPath(); g.arc(rx * k, rz * k, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
    // player arrow (camera-forward = up)
    g.save(); g.translate(R, R);
    g.rotate(this.camYaw - this.player.rotation.y + Math.PI);
    g.fillStyle = "#7fe3ff"; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, W - 30, W, 30);
    g.fillStyle = "#ffe2b8"; g.font = "bold 15px sans-serif"; g.textAlign = "center";
    g.fillText(`${spDone ? "OPPY" : sojDone ? "SPIRIT" : "SOJOURNER"} · ${Math.round(p.distanceTo(tgt))}m`, R, W - 10);
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
    for (const o of [this.lander, this.rover, this.beacon, this.player, this.spirit, this.spiritBeacon, this.oppy, this.oppyBeacon]) {
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
    const sandA = new THREE.Color(0x7a3c22), sandB = new THREE.Color(0xa45a36);
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
    const moving = !this.meeting && !this.spiritMeeting && !this.oppyMeeting && input.lengthSq() > 0.001;
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
    this.player.position.addScaledVector(this.velocity, dt);
    // world bounds
    const h = this.hf;
    const bx0 = h ? h.minX + 15 : -WORLD / 2 + 10, bx1 = h ? h.minX + h.sx * (h.nx - 1) - 15 : WORLD / 2 - 10;
    const bz0 = h ? h.minZ + 15 : -WORLD / 2 + 10, bz1 = h ? h.minZ + h.sz * (h.nz - 1) - 15 : WORLD / 2 - 10;
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, bx0, bx1);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, bz0, bz1);
    this.player.position.y = this.groundHeight(this.player.position.x, this.player.position.z);

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

    // third-person camera
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const camOffset = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).multiplyScalar(this.camDist);
    const camPos = target.clone().add(camOffset);
    camPos.y = Math.max(camPos.y, this.groundHeight(camPos.x, camPos.z) + 1.5);
    this.camera.position.lerp(camPos, dt * 5);
    this.camera.lookAt(target);

    // sun follows player for tight shadows
    const sxp = Math.round(this.player.position.x / 8) * 8, szp = Math.round(this.player.position.z / 8) * 8;
    this.sun.target.position.set(sxp, this.player.position.y, szp);
    this.sun.position.set(sxp + 60, this.player.position.y + 40, szp - 30);
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
