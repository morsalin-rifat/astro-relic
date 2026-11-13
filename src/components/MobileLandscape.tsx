import { useEffect, useRef, useState } from "react";
import { useGame } from "@/state/store";

/** Phones/tablets only (coarse pointer). Desktop never renders or reacts. */
function useTouchDevice() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const f = () => setTouch(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return touch;
}

function usePortrait() {
  const [p, setP] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const f = () => setP(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return p;
}

async function goLandscape() {
  try {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else await el.webkitRequestFullscreen?.();
    }
  } catch { /* iOS Safari: no fullscreen API, rotate prompt handles it */ }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.("landscape");
  } catch { /* unsupported or locked by user — prompt handles it */ }
}

export function MobileLandscape() {
  const touch = useTouchDevice();
  const portrait = usePortrait();
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.lang);
  const tried = useRef(false);

  // Leaving home (tap "Play" → hub) is a user gesture; lock on that tap or the next one.
  useEffect(() => {
    if (!touch) return;
    if (phase === "home") { tried.current = false; return; }
    if (tried.current) return;
    tried.current = true;
    void goLandscape();
    const once = () => { void goLandscape(); };
    window.addEventListener("pointerup", once, { once: true });
    return () => window.removeEventListener("pointerup", once);
  }, [touch, phase]);

  if (!touch || !portrait || phase === "home") return null;
  return (
    <div className="rotate-prompt fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 p-8 text-center pointer-events-auto"
      onPointerUp={() => void goLandscape()} role="dialog" aria-label="Rotate device">
      <div className="text-6xl animate-[rotatehint_2.2s_ease-in-out_infinite]">📱</div>
      <p className="text-lg font-semibold text-relic-gold">
        {lang === "bn" ? "সেরা অভিজ্ঞতার জন্য ফোনটি আড়াআড়ি ঘুরিয়ে নাও" : "Turn your phone sideways for the best adventure"}
      </p>
      <p className="text-sm text-expedition-ink">{lang === "bn" ? "ঘোরালেই খেলা চালু হবে 🔄" : "The game continues as soon as you rotate 🔄"}</p>
    </div>
  );
}
