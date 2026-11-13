import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useGame } from "../state/store";

/** A tappable part on the model. `at` = position inside the model's bounding box, each axis 0..1 (x left→right, y bottom→top, z back→front). `topic` = the script line it opens. */
export type Spot = { topic: string; icon: string; en: string; bn: string; at: [number, number, number] };

/** Hotspots matched to each rover's voice-script part topics. */
export const SPOTS: Record<"sojourner" | "spirit" | "oppy" | "insight", Spot[]> = {
  sojourner: [
    { topic: "03_part_wheels", icon: "🛞", en: "Wheels", bn: "চাকা", at: [0.05, 0.12, 0.85] },
    { topic: "03_part_eyes", icon: "👀", en: "Stereo eyes", bn: "স্টেরিও চোখ", at: [0.5, 0.55, 0.98] },
    { topic: "03_part_antenna", icon: "📡", en: "Antenna", bn: "অ্যান্টেনা", at: [0.9, 0.98, 0.3] },
    { topic: "03_part_solar", icon: "☀️", en: "Solar panel", bn: "সোলার প্যানেল", at: [0.5, 0.8, 0.5] },
    { topic: "03_part_nose_apxs", icon: "🔬", en: "APXS nose", bn: "APXS নাক", at: [0.5, 0.35, 0.02] },
  ],
  spirit: [
    { topic: "03_spirit_part_broken_wheel", icon: "🛞", en: "Broken wheel", bn: "ভাঙা চাকা", at: [0.95, 0.12, 0.85] },
    { topic: "03_spirit_part_silica_secret", icon: "✨", en: "Silica track", bn: "সিলিকার দাগ", at: [0.95, 0.03, 0.15] },
    { topic: "03_spirit_part_dust_devils", icon: "🌪️", en: "Solar panels", bn: "সোলার প্যানেল", at: [0.3, 0.6, 0.4] },
    { topic: "03_spirit_part_pancam_eyes", icon: "📷", en: "Pancam eyes", bn: "প্যানক্যাম চোখ", at: [0.5, 0.98, 0.8] },
  ],
  oppy: [
    { topic: "03_oppy_part_blueberries", icon: "🫐", en: "Microscope", bn: "মাইক্রোস্কোপ", at: [0.35, 0.3, 0.98] },
    { topic: "03_oppy_part_hole_in_one", icon: "⛳", en: "Landing story", bn: "নামার গল্প", at: [0.5, 0.6, 0.2] },
    { topic: "03_oppy_part_rock_drill", icon: "🛠️", en: "RAT drill arm", bn: "RAT ড্রিল হাত", at: [0.65, 0.3, 0.98] },
    { topic: "03_oppy_part_marathon_wheels", icon: "🏃", en: "Marathon wheels", bn: "ম্যারাথন চাকা", at: [0.05, 0.12, 0.5] },
  ],
  insight: [
    { topic: "03_insight_part_heartbeat", icon: "💓", en: "SEIS", bn: "SEIS", at: [0.5, 0.25, 0.95] },
    { topic: "03_insight_part_little_mole", icon: "🦫", en: "HP³ Mole", bn: "HP³ মোল", at: [0.7, 0.25, 0.9] },
    { topic: "03_insight_part_mars_wind", icon: "🌬️", en: "Weather sensors", bn: "আবহাওয়া সেন্সর", at: [0.5, 0.75, 0.5] },
    { topic: "03_insight_part_inner_secret", icon: "🌍", en: "Inside Mars", bn: "মঙ্গলের ভেতর", at: [0.1, 0.55, 0.5] },
  ],
};

const DIST = 3.4, MIN_D = 1.7, MAX_D = 6;

/** 360° viewer: drag to orbit (all sides + up/down), wheel/pinch to zoom, tap glowing pins to hear that part's story. */
export function RoverTurntable({ model = "/models/sojourner.glb", accent = "#ffd97d", spots }: { model?: string; accent?: string; spots?: Spot[] | undefined }) {
  const lang = useGame((s) => s.lang);
  const [big, setBig] = useState(false);
  const [auto, setAuto] = useState(true);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const hold = useRef(false);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const api = useRef({ auto: true, reset: () => {}, zoom: (_k: number) => {} });
  api.current.auto = auto;
  const list = spots ?? [];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    r.setPixelRatio(Math.min(devicePixelRatio, big ? 1.75 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(r.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffeedd, 0x6a3a22, 1.3));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    sun.position.set(3, 4, 2);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9ec8ff, 0.9);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    scene.add(shadow);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    const target = new THREE.Vector3(0, 0.45, 0);
    const pivot = new THREE.Group();
    scene.add(pivot);
    const local: THREE.Vector3[] = [];
    let dead = false;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight || w;
      r.setSize(w, h, false);
      r.domElement.style.width = "100%";
      r.domElement.style.height = "100%";
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    MeshoptDecoder.ready.then(() => {
      if (dead) return;
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(model, (g) => {
        if (dead) return;
        const m = g.scene;
        const box = new THREE.Box3().setFromObject(m);
        const s = box.getSize(new THREE.Vector3());
        const k = 1.5 / Math.max(s.x, s.y, s.z, 0.001);
        const c = box.getCenter(new THREE.Vector3());
        m.scale.setScalar(k);
        m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
        pivot.add(m);
        target.y = (s.y * k) / 2;
        for (const sp of list) local.push(new THREE.Vector3((sp.at[0] - 0.5) * s.x * k, sp.at[1] * s.y * k, (sp.at[2] - 0.5) * s.z * k));
        setReady(true);
      }, undefined, () => setReady(true));
    });

    let yaw = 0.6, pitch = 0.32, dist = DIST, vel = 0.35, raf = 0, last = performance.now();
    let goal = { yaw, pitch, dist };
    api.current.reset = () => { goal = { yaw: 0.6, pitch: 0.32, dist: DIST }; };
    api.current.zoom = (f) => { goal.dist = THREE.MathUtils.clamp(goal.dist * f, MIN_D, MAX_D); };
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0, lx = 0, ly = 0;
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      lx = e.clientX; ly = e.clientY; vel = 0;
      setHint(false);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y); }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch) api.current.zoom(pinch / d);
        pinch = d;
        return;
      }
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      goal.yaw -= dx * 0.011;
      goal.pitch = THREE.MathUtils.clamp(goal.pitch + dy * 0.008, -0.15, 1.35);
      vel = -dx * 0.6;
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); api.current.zoom(e.deltaY > 0 ? 1.1 : 0.9); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });

    const v = new THREE.Vector3(), camDir = new THREE.Vector3(), n = new THREE.Vector3();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!pts.size && api.current.auto && !hold.current) { goal.yaw += vel * dt * 0.02 + 0.35 * dt; }
      vel *= Math.exp(-3 * dt);
      const e = 1 - Math.exp(-10 * dt);
      yaw += (goal.yaw - yaw) * e; pitch += (goal.pitch - pitch) * e; dist += (goal.dist - dist) * e;
      cam.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(target);
      r.render(scene, cam);
      camDir.subVectors(cam.position, target).normalize();
      const w = el.clientWidth, h = el.clientHeight;
      local.forEach((p, i) => {
        const b = pins.current[i];
        if (!b) return;
        v.copy(p).project(cam);
        n.set(p.x, 0, p.z).normalize();
        const facing = p.x === 0 && p.z === 0 ? 1 : n.dot(camDir);
        b.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${facing < -0.2 ? 0.7 : 1})`;
        b.style.opacity = facing < -0.2 ? "0.35" : "1";
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("wheel", wheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        mats.forEach((mt) => { Object.values(mt).forEach((x) => { if (x instanceof THREE.Texture) x.dispose(); }); mt.dispose(); });
      });
      r.dispose();
      r.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, big, list.length]);

  useEffect(() => {
    if (!big) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setBig(false); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [big]);

  const pick = (topic: string) => {
    const b = document.querySelector<HTMLButtonElement>(`[data-topic="${topic}"]`);
    if (b) { b.click(); if (big) setBig(false); }
  };
  const B = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const tool = "h-9 min-w-9 px-2 rounded-full border bg-black/55 text-sm backdrop-blur hover:bg-black/75 transition";

  const view = (
    <div className={big ? "relative w-[min(92vw,92vh)] aspect-square" : "relative w-full aspect-square"}>
      <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none select-none" aria-label={B("3D rover model, drag to turn", "৩D রোভার, ঘোরাতে টানো")} />
      {ready && list.map((s, i) => (
        <button key={s.topic} ref={(b) => { pins.current[i] = b; }} onClick={() => pick(s.topic)} onPointerEnter={() => { hold.current = true; }} onPointerLeave={() => { hold.current = false; }}
          className="group absolute left-0 top-0 flex items-center gap-1 rounded-full border-2 bg-black/70 pl-1 pr-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(0,0,0,.5)] transition-opacity"
          style={{ borderColor: accent, willChange: "transform" }} title={B(s.en, s.bn)}>
          <span className="relative grid h-5 w-5 place-items-center rounded-full text-xs" style={{ background: `${accent}44` }}>
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${accent}55` }} />{s.icon}
          </span>
          <span className={big ? "" : "hidden sm:inline"}>{B(s.en, s.bn)}</span>
        </button>
      ))}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full border-4 border-white/10 animate-spin" style={{ borderTopColor: accent }} />
          <div className="mt-2 text-[10px] tracking-[0.3em]" style={{ color: accent }}>WAKING UP…</div>
        </div>
      )}
      {ready && hint && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/90">
          👆 {B("Drag to spin 360° · tap a glowing pin", "টেনে ৩৬০° ঘোরাও · জ্বলা পিনে চাপো")}
        </div>
      )}
      <div className="absolute right-1 top-1 flex flex-col gap-1 text-white" style={{ ["--tw-border-opacity" as string]: 1 }}>
        <button className={tool} style={{ borderColor: `${accent}88` }} onClick={() => setBig((x) => !x)} aria-label={big ? B("Close big view", "বড় ভিউ বন্ধ") : B("Open 360° big view", "বড় ৩৬০° ভিউ")}>{big ? "✕" : "⛶"}</button>
        <button className={tool} style={{ borderColor: `${accent}88`, background: auto ? `${accent}55` : undefined }} onClick={() => setAuto((x) => !x)} aria-label={B("Auto spin", "নিজে ঘোরা")} aria-pressed={auto}>⟳</button>
        <button className={tool} style={{ borderColor: `${accent}88` }} onClick={() => api.current.zoom(0.8)} aria-label={B("Zoom in", "কাছে")}>＋</button>
        <button className={tool} style={{ borderColor: `${accent}88` }} onClick={() => api.current.zoom(1.25)} aria-label={B("Zoom out", "দূরে")}>－</button>
        <button className={tool} style={{ borderColor: `${accent}88` }} onClick={() => api.current.reset()} aria-label={B("Reset view", "আগের মতো")}>⌂</button>
      </div>
    </div>
  );

  if (!big) return view;
  return (
    <>
      <div className="relative w-full aspect-square" />
      {createPortal(
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[radial-gradient(circle_at_50%_40%,rgba(255,150,90,.22),rgba(5,3,2,.98)_70%)] backdrop-blur-md p-3" onClick={(e) => { if (e.target === e.currentTarget) setBig(false); }}>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center text-[11px] tracking-[0.3em] text-white/80">360° · {B("TAP A PIN TO HEAR ITS STORY", "পিনে চাপো, গল্প শোনো")}</div>
          {view}
        </div>,
        document.body,
      )}
    </>
  );
}
