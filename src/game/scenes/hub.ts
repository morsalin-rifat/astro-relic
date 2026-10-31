import * as THREE from "three";
import { makeGlowTexture, makeCanvasTexture, fbm, makeStarfield, type Scene } from "../utils";
import { store } from "../../state/store";

type Universe = "mars" | "moon";

/* ---------- textures ---------- */

function marsTerrainTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = fbm(x * 0.045, y * 0.045, 5);
        const n2 = fbm(x * 0.18 + 40, y * 0.18 + 40, 3);
        const k = Math.min(1.25, 0.35 + n * 1.05 + (n2 - 0.5) * 0.25);
        const i = (y * s + x) * 4;
        img.data[i] = 158 * k;
        img.data[i + 1] = 84 * k;
        img.data[i + 2] = 50 * k;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // dark rocks scattered in the dust
    for (let c = 0; c < 36; c++) {
      ctx.fillStyle = `rgba(40,16,8,${0.12 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createRealisticMoonTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, (ctx, s) => {
    // 1. Base lunar regolith tone (fine silvery dust with subtle tonal shifts)
    ctx.fillStyle = "#84878e";
    ctx.fillRect(0, 0, s, s);

    const img = ctx.getImageData(0, 0, s, s);
    const d = img.data;

    for (let y = 0; y < s; y++) {
      const v = y / s;
      for (let x = 0; x < s; x++) {
        const u = x / s;
        // Multi-octave FBM for regolith grain and basalt patches
        const n1 = fbm(u * 7.0, v * 7.0, 5);
        const n2 = fbm(u * 22.0, v * 22.0, 3);
        const grit = (Math.random() - 0.5) * 12;

        // Dark volcanic basalt maria (lunar seas)
        const mare = fbm(u * 2.5 + 1.2, v * 2.5 + 1.2, 4);
        const mareFactor = Math.min(1, Math.max(0, (mare - 0.48) / 0.27)) * 0.45;

        // Base lightness
        const val = Math.min(
          255,
          Math.max(0, 138 + (n1 - 0.5) * 60 + (n2 - 0.5) * 25 - mareFactor * 80 + grit),
        );

        const idx = (y * s + x) * 4;
        d[idx] = Math.floor(val);
        d[idx + 1] = Math.floor(val * 1.01);
        d[idx + 2] = Math.floor(val * 1.03);
      }
    }
    ctx.putImageData(img, 0, 0);

    // 2. High-contrast impact crater rays and ejecta sprays (like Copernicus/Tycho)
    for (let i = 0; i < 9; i++) {
      const cx = (0.15 + Math.random() * 0.7) * s;
      const cy = (0.15 + Math.random() * 0.7) * s;
      const numRays = 18 + Math.floor(Math.random() * 24);
      const maxLen = 80 + Math.random() * 160;

      for (let r = 0; r < numRays; r++) {
        const angle = (r / numRays) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const len = maxLen * (0.6 + Math.random() * 0.8);
        const grad = ctx.createLinearGradient(
          cx,
          cy,
          cx + Math.cos(angle) * len,
          cy + Math.sin(angle) * len,
        );
        grad.addColorStop(0, "rgba(240, 243, 250, 0.35)");
        grad.addColorStop(0.3, "rgba(225, 230, 240, 0.2)");
        grad.addColorStop(1, "rgba(180, 185, 195, 0)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.stroke();
      }
    }

    // 3. Hundreds of distinct micro-craters with bright sun-facing rims and shadowed bowls
    for (let c = 0; c < 120; c++) {
      const cx = Math.random() * s;
      const cy = Math.random() * s;
      const r = 2.5 + Math.random() * 14;

      // Dark shadow bowl
      const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
      g.addColorStop(0, "rgba(25, 26, 30, 0.75)");
      g.addColorStop(0.7, "rgba(45, 47, 52, 0.5)");
      g.addColorStop(0.9, "rgba(120, 125, 135, 0.2)");
      g.addColorStop(1, "rgba(140, 145, 155, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Sharp bright rim highlight on sunward edge
      ctx.strokeStyle = "rgba(235, 240, 250, 0.55)";
      ctx.lineWidth = 1.0 + r * 0.08;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.6, Math.PI * 1.6);
      ctx.stroke();
    }
  });
}

function createRealisticMoonBumpMap(): THREE.CanvasTexture {
  return makeCanvasTexture(512, (ctx, s) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, s, s);

    const img = ctx.createImageData(s, s);
    const d = img.data;

    for (let y = 0; y < s; y++) {
      const v = y / s;
      for (let x = 0; x < s; x++) {
        const u = x / s;
        const n1 = fbm(u * 16.0, v * 16.0, 4);
        const n2 = fbm(u * 40.0, v * 40.0, 2);
        const val = Math.min(255, Math.max(0, Math.floor(128 + (n1 - 0.5) * 80 + (n2 - 0.5) * 40)));
        const idx = (y * s + x) * 4;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Craters in bump map (depression + raised rim)
    for (let c = 0; c < 70; c++) {
      const cx = Math.random() * s;
      const cy = Math.random() * s;
      const r = 3 + Math.random() * 16;

      // Rim (white = high)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2 + r * 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Bowl (black = low)
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.85);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
      grad.addColorStop(1, "rgba(128, 128, 128, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function createRealisticEarthTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, (ctx, s) => {
    // 1. Deep Ocean Base with realistic marine depth gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, s);
    oceanGrad.addColorStop(0, "#081b3a");
    oceanGrad.addColorStop(0.25, "#0c2b5c");
    oceanGrad.addColorStop(0.5, "#103875");
    oceanGrad.addColorStop(0.75, "#0d2c5e");
    oceanGrad.addColorStop(1, "#071733");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, s, s);

    const imgData = ctx.getImageData(0, 0, s, s);
    const d = imgData.data;

    for (let y = 0; y < s; y++) {
      const v = y / s;
      const lat = (v - 0.5) * 2; // -1 (North) to +1 (South)
      const absLat = Math.abs(lat);

      for (let x = 0; x < s; x++) {
        const u = x / s;
        const idx = (y * s + x) * 4;

        // Continents noise - multi-octave fbm for realistic coastlines
        const n1 = fbm(u * 4.2, v * 4.2, 5);
        const n2 = fbm(u * 12.0, v * 12.0, 3);
        const n3 = fbm(u * 28.0, v * 28.0, 2);
        const landVal = n1 * 0.72 + n2 * 0.22 + n3 * 0.06;

        // Polar ice sheets
        if (absLat > 0.82) {
          const iceFringe = fbm(u * 14.0, v * 14.0, 3) * 0.08;
          if (absLat + iceFringe > 0.84) {
            d[idx] = 238;
            d[idx + 1] = 246;
            d[idx + 2] = 255;
            continue;
          }
        }

        // Coastline threshold
        const isLand = landVal > 0.49;
        const isShallow = landVal > 0.44 && !isLand;

        if (isLand) {
          const elev = (landVal - 0.49) / 0.51; // 0 to 1 elevation
          const moisture = fbm((u + 0.3) * 6.0, (v + 0.2) * 6.0, 3);

          if (absLat > 0.72 || (elev > 0.65 && absLat > 0.4)) {
            // Tundra / mountain snow caps
            d[idx] = 220;
            d[idx + 1] = 228;
            d[idx + 2] = 238;
          } else if (absLat < 0.38 && moisture < 0.46) {
            // Arid deserts (Sahara / Middle East / Australian Outback)
            const sand = fbm(u * 20.0, v * 20.0, 2) * 22;
            d[idx] = Math.min(255, 196 + Math.floor(sand));
            d[idx + 1] = Math.min(255, 165 + Math.floor(sand * 0.8));
            d[idx + 2] = Math.min(255, 115 + Math.floor(sand * 0.6));
          } else if (elev > 0.52) {
            // Mountain ranges (Rockies, Andes, Himalayas)
            const rock = Math.floor(elev * 40);
            d[idx] = 110 + rock;
            d[idx + 1] = 98 + rock;
            d[idx + 2] = 82 + rock;
          } else if (moisture > 0.52) {
            // Dense rainforest & lush temperate zones
            const veg = Math.floor(moisture * 48);
            d[idx] = 34 + veg;
            d[idx + 1] = 96 + veg;
            d[idx + 2] = 38 + Math.floor(veg * 0.4);
          } else {
            // Grasslands / savannah
            d[idx] = 88 + Math.floor(moisture * 38);
            d[idx + 1] = 126 + Math.floor(moisture * 28);
            d[idx + 2] = 52;
          }
        } else if (isShallow) {
          // Turquoise continental shelf / coral reefs
          const shallowFactor = (landVal - 0.44) / 0.05;
          d[idx] = Math.floor(14 + 18 * shallowFactor);
          d[idx + 1] = Math.floor(65 + 75 * shallowFactor);
          d[idx + 2] = Math.floor(125 + 65 * shallowFactor);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });
}

function createRealisticEarthRoughnessMap(): THREE.CanvasTexture {
  return makeCanvasTexture(512, (ctx, s) => {
    // Water is glossy (roughness ~0.08)
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, s, s);

    const imgData = ctx.getImageData(0, 0, s, s);
    const d = imgData.data;

    for (let y = 0; y < s; y++) {
      const v = y / s;
      const lat = (v - 0.5) * 2;
      const absLat = Math.abs(lat);

      for (let x = 0; x < s; x++) {
        const u = x / s;
        const n1 = fbm(u * 4.2, v * 4.2, 5);
        const n2 = fbm(u * 12.0, v * 12.0, 3);
        const landVal = n1 * 0.72 + n2 * 0.28;
        const idx = (y * s + x) * 4;

        if (absLat > 0.82) {
          // Ice: moderate sheen ~0.38 roughness
          d[idx] = 95;
          d[idx + 1] = 95;
          d[idx + 2] = 95;
        } else if (landVal > 0.49) {
          // Land: matte ~0.85-0.95 roughness
          const r = Math.min(255, 215 + Math.floor(n2 * 40));
          d[idx] = r;
          d[idx + 1] = r;
          d[idx + 2] = r;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });
}

function createRealisticCloudsTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(1024, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const imgData = ctx.createImageData(s, s);
    const d = imgData.data;

    for (let y = 0; y < s; y++) {
      const v = y / s;
      const lat = (v - 0.5) * 2;
      const absLat = Math.abs(lat);

      for (let x = 0; x < s; x++) {
        const u = x / s;

        // Trade winds: stretch horizontally with Coriolis swirl
        const windX = u * 6.5 + Math.sin(v * Math.PI * 4) * 0.25;
        const windY = v * 7.5;

        const c1 = fbm(windX, windY, 5);
        const c2 = fbm(u * 18.0, v * 18.0, 3);
        const cloudVal = c1 * 0.76 + c2 * 0.24;

        // ITCZ tropical band near equator + mid-latitude cyclone storm belts
        const stormBelt = Math.exp(-Math.pow(absLat - 0.48, 2) * 18) * 0.16;
        const itcz = Math.exp(-Math.pow(lat, 2) * 36) * 0.18;
        const density = cloudVal + stormBelt + itcz;

        const idx = (y * s + x) * 4;
        if (density > 0.47) {
          const alpha = Math.min(245, Math.floor((density - 0.47) * 560));
          d[idx] = 255;
          d[idx + 1] = 255;
          d[idx + 2] = 255;
          d[idx + 3] = alpha;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  });
}

/* ---------- terrain height ---------- */

function marsTerrainHeight(x: number, z: number): number {
  return fbm(x * 0.03, z * 0.03, 4) * 3.4 + fbm(x * 0.1, z * 0.1, 3) * 0.8 - 2.2;
}

function displaceMarsTerrain(geo: THREE.PlaneGeometry) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, marsTerrainHeight(x, z));
  }
  geo.computeVertexNormals();
}

interface LunarCrater {
  x: number;
  z: number;
  r: number;
  d: number;
  rim: number;
}

const MOON_CRATERS: LunarCrater[] = [
  // Foreground prominent crater right in camera vista (matching reference screenshot)
  { x: -6, z: -16, r: 15, d: 3.4, rim: 1.25 },
  { x: 18, z: -22, r: 9, d: 2.2, rim: 0.8 },
  { x: -32, z: -25, r: 11, d: 2.6, rim: 0.9 },
  // Midground iconic impact basins
  { x: 26, z: -38, r: 24, d: 4.8, rim: 1.6 },
  { x: -48, z: -45, r: 20, d: 4.2, rim: 1.5 },
  { x: 2, z: -46, r: 14, d: 3.0, rim: 1.1 },
  { x: -18, z: -58, r: 26, d: 5.2, rim: 1.8 },
  { x: 42, z: -62, r: 18, d: 3.8, rim: 1.4 },
  { x: -68, z: -72, r: 28, d: 5.5, rim: 1.9 },
  { x: 8, z: -78, r: 22, d: 4.4, rim: 1.5 },
  // Smaller scattered impact craters
  { x: -14, z: -32, r: 6.5, d: 1.5, rim: 0.6 },
  { x: 12, z: -30, r: 5.5, d: 1.3, rim: 0.5 },
  { x: 38, z: -28, r: 7.0, d: 1.6, rim: 0.6 },
  { x: -42, z: -34, r: 8.0, d: 1.8, rim: 0.7 },
  { x: 54, z: -46, r: 10.0, d: 2.2, rim: 0.8 },
  { x: -28, z: -48, r: 7.5, d: 1.7, rim: 0.65 },
  { x: -4, z: -64, r: 8.5, d: 1.9, rim: 0.7 },
  { x: 24, z: -70, r: 9.0, d: 2.0, rim: 0.75 },
  { x: -55, z: -60, r: 11.0, d: 2.4, rim: 0.85 },
];

function getMoonHeight(x: number, z: number): number {
  // Spherical lunar curvature: horizon dips toward the left and right like in real Apollo footage
  const curvature = x * x * 0.0016 + Math.pow(z + 14, 2) * 0.0007;
  let h = -curvature;

  // Gentle lunar regolith rolling terrain
  h += fbm(x * 0.025 + 5.0, z * 0.025 + 5.0, 4) * 1.6 + fbm(x * 0.08, z * 0.08, 3) * 0.45;

  // Real 3D impact crater geometry: bowl depression + raised rim crest + outer ejecta blanket
  for (const c of MOON_CRATERS) {
    const dist = Math.hypot(x - c.x, z - c.z);
    if (dist < c.r * 1.7) {
      const t = dist / c.r;
      if (t < 1.0) {
        // Bowl depression
        h -= c.d * (1.0 - Math.pow(t, 2.2));
      }
      // Sharp raised rim uplift
      h += c.rim * Math.exp(-Math.pow(t - 1.0, 2) * 38);
      // Ejecta blanket taper
      if (t >= 1.0 && t < 1.7) {
        const ejecta = (1.7 - t) / 0.7;
        h += c.rim * 0.28 * Math.pow(ejecta, 1.8);
      }
    }
  }

  return h;
}

function displaceMoonTerrain(geo: THREE.PlaneGeometry) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getMoonHeight(x, z));
  }
  geo.computeVertexNormals();
}

/* ---------- 1. Interactive Near Stars with Depth Parallax ---------- */
class NearStarSystem {
  private count = 160;
  private geo = new THREE.BufferGeometry();
  private mat: THREE.PointsMaterial;
  private points: THREE.Points;
  private homePos: Float32Array;
  private currPos: Float32Array;

  constructor(scene: THREE.Scene, disposables: { dispose(): void }[]) {
    this.homePos = new Float32Array(this.count * 3);
    this.currPos = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const x = (Math.random() - 0.5) * 140;
      const y = -10 + Math.random() * 60;
      const z = -20 - Math.random() * 90;
      this.homePos[i * 3] = x;
      this.homePos[i * 3 + 1] = y;
      this.homePos[i * 3 + 2] = z;

      this.currPos[i * 3] = x;
      this.currPos[i * 3 + 1] = y;
      this.currPos[i * 3 + 2] = z;
    }

    this.geo.setAttribute("position", new THREE.BufferAttribute(this.currPos, 3));
    const tex = makeGlowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)");
    this.mat = new THREE.PointsMaterial({
      size: 1.25,
      map: tex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    scene.add(this.points);
    disposables.push(this.geo, this.mat, tex);
  }

  update(dt: number, mouse: { x: number; y: number }) {
    const posAttr = this.geo.attributes["position"] as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const hX = this.homePos[i * 3]!;
      const hY = this.homePos[i * 3 + 1]!;
      const hZ = this.homePos[i * 3 + 2]!;

      // Depth parallax: closer stars move slightly faster with cursor
      const depth = (110 + hZ) / 90;
      const targetX = hX - mouse.x * 5.0 * depth;
      const targetY = hY - mouse.y * 3.0 * depth;

      arr[i * 3] = arr[i * 3]! + (targetX - arr[i * 3]!) * (dt * 3.5);
      arr[i * 3 + 1] = arr[i * 3 + 1]! + (targetY - arr[i * 3 + 1]!) * (dt * 3.5);
    }
    posAttr.needsUpdate = true;
  }
}

/* ---------- 2. Shooting Stars & Comets with Neon Trails ---------- */
class CometSystem {
  private active = false;
  private headSprite: THREE.Sprite;
  private tailLine: THREE.Line;
  private lineGeo = new THREE.BufferGeometry();
  private headMat: THREE.SpriteMaterial;
  private tailMat: THREE.LineBasicMaterial;
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private tailLength = 16;
  private timer = 2.0;
  private life = 0;
  private maxLife = 1.0;

  constructor(scene: THREE.Scene, disposables: { dispose(): void }[]) {
    const headTex = makeGlowTexture("rgba(200,245,255,1)", "rgba(0,200,255,0)");
    this.headMat = new THREE.SpriteMaterial({
      map: headTex,
      color: 0x88e5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.headSprite = new THREE.Sprite(this.headMat);
    this.headSprite.scale.set(3.5, 3.5, 1);

    const positions = new Float32Array(6);
    this.lineGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.tailMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.tailLine = new THREE.Line(this.lineGeo, this.tailMat);

    scene.add(this.headSprite, this.tailLine);
    disposables.push(headTex, this.headMat, this.lineGeo, this.tailMat);
  }

  update(dt: number) {
    if (!this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawn();
      }
      return;
    }

    this.life += dt;
    if (this.life >= this.maxLife) {
      this.active = false;
      this.headMat.opacity = 0;
      this.tailMat.opacity = 0;
      this.timer = 2.5 + Math.random() * 4.0;
      return;
    }

    this.pos.addScaledVector(this.vel, dt);
    this.headSprite.position.copy(this.pos);

    const tailPos = this.pos
      .clone()
      .sub(this.vel.clone().normalize().multiplyScalar(this.tailLength));
    const lineAttr = this.lineGeo.attributes["position"] as THREE.BufferAttribute;
    const arr = lineAttr.array as Float32Array;
    arr[0] = this.pos.x;
    arr[1] = this.pos.y;
    arr[2] = this.pos.z;
    arr[3] = tailPos.x;
    arr[4] = tailPos.y;
    arr[5] = tailPos.z;
    lineAttr.needsUpdate = true;

    const progress = this.life / this.maxLife;
    const fade = Math.sin(progress * Math.PI);
    this.headMat.opacity = fade * 0.95;
    this.tailMat.opacity = fade * 0.8;
  }

  private spawn() {
    this.active = true;
    this.life = 0;
    this.maxLife = 0.8 + Math.random() * 0.6;
    this.pos.set(-55 + Math.random() * 35, 18 + Math.random() * 20, -80 - Math.random() * 35);
    const speed = 70 + Math.random() * 45;
    const angle = -0.35 - Math.random() * 0.3;
    this.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() * 8);
  }
}

/* ---------- 3. Distant Horizon Meteor Impacts & Shockwave Ring ---------- */
class HorizonImpactSystem {
  private timer = 5.0;
  private meteorActive = false;
  private meteorPos = new THREE.Vector3();
  private meteorVel = new THREE.Vector3();
  private meteorSprite: THREE.Sprite;
  private meteorMat: THREE.SpriteMaterial;

  private impactFlashSprite: THREE.Sprite;
  private impactFlashMat: THREE.SpriteMaterial;
  private flashLife = -1;

  private shockwaveMesh: THREE.Mesh;
  private shockwaveMat: THREE.MeshBasicMaterial;
  private ringGeo: THREE.RingGeometry;
  private shockwaveLife = -1;

  constructor(scene: THREE.Scene, disposables: { dispose(): void }[]) {
    const mTex = makeGlowTexture("rgba(255,220,150,1)", "rgba(255,100,0,0)");
    this.meteorMat = new THREE.SpriteMaterial({
      map: mTex,
      color: 0xffaa55,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.meteorSprite = new THREE.Sprite(this.meteorMat);
    this.meteorSprite.scale.set(3, 3, 1);

    const fTex = makeGlowTexture("rgba(255,200,120,0.9)", "rgba(255,100,30,0)");
    this.impactFlashMat = new THREE.SpriteMaterial({
      map: fTex,
      color: 0xffb066,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.impactFlashSprite = new THREE.Sprite(this.impactFlashMat);
    this.impactFlashSprite.scale.set(35, 18, 1);

    this.ringGeo = new THREE.RingGeometry(0.5, 2.0, 32);
    this.ringGeo.rotateX(-Math.PI / 2);
    const rTex = makeGlowTexture("rgba(255,180,100,0.8)", "rgba(255,100,30,0)");
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      map: rTex,
      color: 0xffaa55,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shockwaveMesh = new THREE.Mesh(this.ringGeo, this.shockwaveMat);

    scene.add(this.meteorSprite, this.impactFlashSprite, this.shockwaveMesh);
    disposables.push(
      mTex,
      fTex,
      rTex,
      this.meteorMat,
      this.impactFlashMat,
      this.ringGeo,
      this.shockwaveMat,
    );
  }

  update(dt: number) {
    if (!this.meteorActive) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.spawnMeteor();
      }
    } else {
      this.meteorPos.addScaledVector(this.meteorVel, dt);
      this.meteorSprite.position.copy(this.meteorPos);
      this.meteorMat.opacity = Math.min(1, this.meteorMat.opacity + dt * 4);

      if (this.meteorPos.y <= 1.2) {
        this.triggerImpact(this.meteorPos.x, this.meteorPos.z);
        this.meteorActive = false;
        this.meteorMat.opacity = 0;
        this.timer = 10.0 + Math.random() * 8.0;
      }
    }

    if (this.flashLife >= 0) {
      this.flashLife += dt * 3.5;
      if (this.flashLife >= 1.0) {
        this.flashLife = -1;
        this.impactFlashMat.opacity = 0;
      } else {
        const opacity = (1.0 - this.flashLife) * 0.85;
        this.impactFlashMat.opacity = opacity;
      }
    }

    if (this.shockwaveLife >= 0) {
      this.shockwaveLife += dt * 1.2;
      if (this.shockwaveLife >= 1.0) {
        this.shockwaveLife = -1;
        this.shockwaveMat.opacity = 0;
      } else {
        const scale = 2.0 + this.shockwaveLife * 28.0;
        this.shockwaveMesh.scale.set(scale, scale, scale);
        this.shockwaveMat.opacity = (1.0 - this.shockwaveLife) * 0.65;
      }
    }
  }

  private spawnMeteor() {
    this.meteorActive = true;
    this.meteorMat.opacity = 0.1;
    const targetX = -45 + Math.random() * 90;
    const targetZ = -70 - Math.random() * 30;
    this.meteorPos.set(targetX + (Math.random() - 0.5) * 15, 32 + Math.random() * 10, targetZ);

    const dest = new THREE.Vector3(targetX, 1.2, targetZ);
    const dir = dest.clone().sub(this.meteorPos).normalize();
    const speed = 40 + Math.random() * 20;
    this.meteorVel.copy(dir.multiplyScalar(speed));
  }

  private triggerImpact(x: number, z: number) {
    this.impactFlashSprite.position.set(x, 2.0, z);
    this.impactFlashSprite.scale.set(38, 20, 1);
    this.impactFlashMat.opacity = 0.9;
    this.flashLife = 0;

    this.shockwaveMesh.position.set(x, 0.2, z);
    this.shockwaveMesh.scale.set(2, 2, 2);
    this.shockwaveMat.opacity = 0.7;
    this.shockwaveLife = 0;
  }
}

/* ---------- 4. Orbital Satellite Crossing ---------- */
class SatelliteSystem {
  private satSprite: THREE.Sprite;
  private satMat: THREE.SpriteMaterial;
  private pos = new THREE.Vector3();
  private speed = 0.035;
  private progress = 0;

  constructor(scene: THREE.Scene, disposables: { dispose(): void }[]) {
    const sTex = makeGlowTexture("rgba(255,255,255,1)", "rgba(100,200,255,0)");
    this.satMat = new THREE.SpriteMaterial({
      map: sTex,
      color: 0xddf0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.satSprite = new THREE.Sprite(this.satMat);
    this.satSprite.scale.set(1.5, 1.5, 1);
    scene.add(this.satSprite);
    disposables.push(sTex, this.satMat);
  }

  update(dt: number) {
    this.progress += dt * this.speed;
    if (this.progress > 1.0) this.progress = 0;

    const angle = this.progress * Math.PI * 1.2 - 0.3;
    const r = 90;
    this.pos.set(Math.cos(angle) * r, 25 + Math.sin(angle) * 15, -110);
    this.satSprite.position.copy(this.pos);
  }
}

/**
 * Mission Command hub — the screen after the home starfield.
 * Pragmata-style cinematic horizon: the selected universe's terrain in the
 * foreground, a glowing Earth in the sky, twinkling stars, and gentle mouse
 * parallax. The universe toggle swaps terrain, light and mood live.
 */
export class HubScene implements Scene {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mouse = { x: 0, y: 0 };
  private universe: Universe = "mars";
  private disposables: { dispose(): void }[] = [];

  private stars: THREE.Points;
  private nearStarsSys: NearStarSystem;
  private cometSys: CometSystem;
  private impactSys: HorizonImpactSystem;
  private satSys: SatelliteSystem;

  private earthGroup = new THREE.Group();
  private earth: THREE.Mesh;
  private clouds: THREE.Mesh;
  private atmo: THREE.Mesh;
  private haze: THREE.Sprite;
  private marsTerrain: THREE.Mesh;
  private moonTerrain: THREE.Mesh;
  private marsRocks = new THREE.Group();
  private moonRocks = new THREE.Group();
  private hemi: THREE.HemisphereLight;
  private dir: THREE.DirectionalLight;
  private hazeBase = 0.5;
  private marsBgMesh?: THREE.Mesh;
  private moonBgMesh?: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);
    this.camera.position.set(0, 2.4, 12);
    this.camera.lookAt(0, 2.8, -40);
    this.scene.background = new THREE.Color(0x0a0508);
    this.scene.fog = new THREE.Fog(0x140a08, 55, 190);

    const textureLoader = new THREE.TextureLoader();

    // ---------- load user uploaded image as Mars background plane ----------
    textureLoader.load(
      "/assets/aistudio/daniele-colucci-OtXJhYjbKeg-unsplash__1__b9d9b85e.jpg",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const bgGeo = new THREE.PlaneGeometry(420, 240);
        const bgMat = new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false });
        this.marsBgMesh = new THREE.Mesh(bgGeo, bgMat);
        this.marsBgMesh.position.set(0, 2.8, -130);
        this.marsBgMesh.renderOrder = -100;
        this.marsBgMesh.visible = this.universe === "mars";
        this.scene.add(this.marsBgMesh);
        this.disposables.push(tex, bgGeo, bgMat);
      },
    );

    // ---------- load new high-res image as Moon background plane ----------
    textureLoader.load(
      "/assets/aistudio/High_Resolution_Planet_Earth_view_f__by_Vadim_Sadovski_on__creativemarket_d82d8335.jpg",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const bgGeo = new THREE.PlaneGeometry(420, 240);
        const bgMat = new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false });
        this.moonBgMesh = new THREE.Mesh(bgGeo, bgMat);
        this.moonBgMesh.position.set(0, 2.8, -130);
        this.moonBgMesh.renderOrder = -100;
        this.moonBgMesh.visible = this.universe === "moon";
        this.scene.add(this.moonBgMesh);
        this.disposables.push(tex, bgGeo, bgMat);
      },
    );

    // ---------- stars ----------
    this.stars = makeStarfield(2400, 700);
    this.scene.add(this.stars);

    this.nearStarsSys = new NearStarSystem(this.scene, this.disposables);
    this.cometSys = new CometSystem(this.scene, this.disposables);
    this.impactSys = new HorizonImpactSystem(this.scene, this.disposables);
    this.satSys = new SatelliteSystem(this.scene, this.disposables);

    // ---------- Photorealistic 3D Earth ----------
    const earthGeo = new THREE.SphereGeometry(5.2, 64, 64);
    const earthTex = createRealisticEarthTexture();
    const earthRoughness = createRealisticEarthRoughnessMap();

    // 1. Earth Surface (continents, glossy oceans, ice caps)
    this.earth = new THREE.Mesh(
      earthGeo,
      new THREE.MeshStandardMaterial({
        map: earthTex,
        roughnessMap: earthRoughness,
        roughness: 0.65,
        metalness: 0.08,
      }),
    );

    // 2. Real 3D Clouds Sphere (rotates independently for authentic 3D parallax)
    const cloudGeo = new THREE.SphereGeometry(5.27, 64, 64);
    const cloudTex = createRealisticCloudsTexture();
    this.clouds = new THREE.Mesh(
      cloudGeo,
      new THREE.MeshStandardMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.88,
        roughness: 0.95,
        depthWrite: false,
      }),
    );

    // 3. Crisp Rayleigh Atmospheric Limb (no giant blurry 2D billboard sprite)
    const atmoGeo = new THREE.SphereGeometry(5.42, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x5ca9ff) },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.7, -0.3).normalize() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vViewPos = - (viewMatrix * wp).xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uSunDir;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNormal;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.4);
          float sunDot = dot(vWorldNormal, normalize(uSunDir));
          float sunLight = clamp(sunDot * 0.65 + 0.35, 0.05, 1.0);
          vec3 twilight = vec3(1.0, 0.65, 0.38);
          float tFactor = smoothstep(-0.25, 0.2, sunDot) * smoothstep(0.45, 0.05, sunDot);
          vec3 atmoCol = mix(uColor, twilight, tFactor * 0.55);
          gl_FragColor = vec4(atmoCol, rim * sunLight * 0.88);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.atmo = new THREE.Mesh(atmoGeo, atmoMat);

    // Earth natural axial tilt (23.4° / ~0.41 radians)
    this.earthGroup.rotation.z = 0.41;
    this.earthGroup.add(this.earth, this.clouds, this.atmo);
    this.scene.add(this.earthGroup);
    this.disposables.push(earthGeo, earthTex, earthRoughness, cloudGeo, cloudTex, atmoGeo, atmoMat);

    // ---------- horizon haze (smooth atmospheric gradient, no fake particle icons) ----------
    const hazeTex = makeGlowTexture("rgba(255,255,255,0.65)", "rgba(255,255,255,0)");
    this.haze = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: hazeTex,
        color: 0xff8244,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    this.haze.scale.set(110, 36, 1);
    this.haze.position.set(0, 1.2, -70);
    this.scene.add(this.haze);
    this.disposables.push(hazeTex);

    // ---------- terrains ----------
    const marsGeo = new THREE.PlaneGeometry(240, 100, 150, 60);
    marsGeo.rotateX(-Math.PI / 2);
    displaceMarsTerrain(marsGeo);
    const marsTex = marsTerrainTexture();
    this.marsTerrain = new THREE.Mesh(
      marsGeo,
      new THREE.MeshStandardMaterial({ map: marsTex, roughness: 1 }),
    );
    this.marsTerrain.position.set(0, -3.6, -40);
    this.scene.add(this.marsTerrain);

    // Realistic curved 3D Moon terrain with prominent impact craters and regolith bump map
    const moonGeo = new THREE.PlaneGeometry(280, 160, 240, 140);
    moonGeo.rotateX(-Math.PI / 2);
    displaceMoonTerrain(moonGeo);
    const moonTex = createRealisticMoonTexture();
    const moonBump = createRealisticMoonBumpMap();
    this.moonTerrain = new THREE.Mesh(
      moonGeo,
      new THREE.MeshStandardMaterial({
        map: moonTex,
        bumpMap: moonBump,
        bumpScale: 0.28,
        roughness: 0.95,
        metalness: 0.02,
      }),
    );
    this.moonTerrain.position.set(0, -3.2, -40);
    this.scene.add(this.moonTerrain);
    this.disposables.push(marsGeo, marsTex, moonGeo, moonTex, moonBump);

    // ---------- rocks / boulders ----------
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    // Perturb rock vertices for sharp impact ejecta facets
    const rPos = rockGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i);
      const ry = rPos.getY(i);
      const rz = rPos.getZ(i);
      const f = 0.85 + ((i * 7) % 11) * 0.03;
      rPos.setXYZ(i, rx * f, ry * f, rz * f);
    }
    rockGeo.computeVertexNormals();

    const rustMat = new THREE.MeshStandardMaterial({ color: 0x4a2013, roughness: 0.95 });
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(rockGeo, rustMat);
      const x = (Math.random() - 0.5) * 120;
      const z = -8 - Math.random() * 55;
      m.position.set(x, -3.6 + marsTerrainHeight(x, z), z);
      m.scale.setScalar(0.15 + Math.random() * 0.6);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.marsRocks.add(m);
    }

    // Realistic Moon boulders scattered along the terrain and crater rims
    const moonRockMat = new THREE.MeshStandardMaterial({
      color: 0x868992,
      bumpMap: moonBump,
      bumpScale: 0.16,
      roughness: 0.96,
      metalness: 0.02,
    });
    for (let i = 0; i < 55; i++) {
      const m = new THREE.Mesh(rockGeo, moonRockMat);
      const x = (Math.random() - 0.5) * 150;
      const z = -6 - Math.random() * 80;
      const s = 0.18 + Math.pow(Math.random(), 2.2) * 1.5;
      m.position.set(x, -3.2 + getMoonHeight(x, z) + s * 0.42, z);
      m.scale.set(
        s * (0.85 + Math.random() * 0.35),
        s * (0.7 + Math.random() * 0.4),
        s * (0.85 + Math.random() * 0.35),
      );
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.moonRocks.add(m);
    }
    this.scene.add(this.marsRocks, this.moonRocks);
    this.disposables.push(rockGeo, rustMat, moonRockMat);

    // ---------- lights ----------
    this.hemi = new THREE.HemisphereLight(0xff9a66, 0x351408, 0.55);
    this.dir = new THREE.DirectionalLight(0xffd0a8, 1.25);
    this.dir.position.set(-18, 22, -8);
    this.scene.add(this.hemi, this.dir);

    this.applyUniverse(store.get().universe);
  }

  private applyUniverse(u: Universe) {
    this.universe = u;
    const mars = u === "mars";
    // Hide procedural meshes that clash with high-res background art
    this.marsTerrain.visible = false;
    this.marsRocks.visible = false;
    this.moonTerrain.visible = false;
    this.moonRocks.visible = false;
    this.earthGroup.visible = false;
    this.haze.visible = false;

    if (this.marsBgMesh) {
      this.marsBgMesh.visible = mars;
    }
    if (this.moonBgMesh) {
      this.moonBgMesh.visible = !mars;
    }

    const bg = this.scene.background as THREE.Color;
    const fog = this.scene.fog as THREE.Fog;
    if (mars) {
      bg.set(0x0a0508);
      fog.color.set(0x140a08);
      fog.near = 500;
      fog.far = 3000;
      this.hemi.color.set(0xff9a66);
      this.hemi.groundColor.set(0x351408);
      this.hemi.intensity = 0.55;
      this.dir.color.set(0xffd0a8);
      this.dir.intensity = 1.25;
      this.dir.position.set(-18, 22, -8);
    } else {
      // Moon: airless deep space using user uploaded high-res Earth view
      bg.set(0x000003);
      fog.color.set(0x000003);
      fog.near = 500;
      fog.far = 3000;
      this.hemi.color.set(0x9aa4ba);
      this.hemi.groundColor.set(0x0a0c10);
      this.hemi.intensity = 0.35;
      this.dir.color.set(0xf5f8ff);
      this.dir.intensity = 2.0;
      this.dir.position.set(-35, 24, -14);
    }
  }

  update(dt: number, elapsed: number) {
    const u = store.get().universe;
    if (u !== this.universe) this.applyUniverse(u);

    this.stars.rotation.y += dt * 0.003;
    this.nearStarsSys.update(dt, this.mouse);
    this.cometSys.update(dt);
    this.impactSys.update(dt);
    this.satSys.update(dt);

    // Independent 3D Earth and cloud rotation for realistic planetary depth
    this.earth.rotation.y += dt * 0.015;
    this.clouds.rotation.y += dt * 0.024;

    // Camera animation & smooth mouse parallax
    let targetCamX = this.mouse.x * 2.6;
    let targetCamY = 2.4 + this.mouse.y * 1.2;
    let targetCamZ = 12;

    if (this.universe === "moon") {
      // Cinematic slow lunar surface drift across the craters (smooth animated flyover)
      const driftX = Math.sin(elapsed * 0.12) * 4.2;
      const driftY = Math.sin(elapsed * 0.16) * 0.35;
      const driftZ = Math.cos(elapsed * 0.08) * 1.8;
      targetCamX += driftX;
      targetCamY += driftY;
      targetCamZ += driftZ;
    }

    const k = 1 - Math.exp(-3.5 * dt);
    this.camera.position.x += (targetCamX - this.camera.position.x) * k;
    this.camera.position.y += (targetCamY - this.camera.position.y) * k;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * k;
    this.camera.lookAt(0, 2.7, -40);

    // haze breathing
    if (this.haze.visible) {
      (this.haze.material as THREE.SpriteMaterial).opacity =
        this.hazeBase + Math.sin(elapsed * 0.6) * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

  onPointerMove(x: number, y: number) {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    this.scene.clear();
  }
}
