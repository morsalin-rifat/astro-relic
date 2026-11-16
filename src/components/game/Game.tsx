import { useEffect, useRef, useState } from "react";
import { Engine } from "@/game/engine";
import { Overlays } from "@/components/Overlays";

export default function Game() {
  const ref = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let engine: Engine | null = null;
    try {
      engine = new Engine(ref.current);
    } catch (err) {
      console.error("Failed to start 3D engine:", err);
      setWebglFailed(true);
      return;
    }
    return () => engine?.dispose();
  }, []);

  if (webglFailed) {
    return (
      <div
        className="relative flex h-[100dvh] w-screen select-none items-center justify-center overflow-hidden px-6"
        style={{ backgroundColor: "#030308" }}
      >
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
          <div className="mb-3 text-4xl">🛰️</div>
          <h1 className="mb-2 text-xl font-bold text-white">
            3D graphics unavailable
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-white/70">
            Astro Relic needs WebGL to render its 3D worlds, but your browser
            or device couldn't start it. This usually happens when hardware
            acceleration is turned off, the graphics driver is blocked, or the
            device is low on memory.
          </p>
          <ul className="mb-5 space-y-1 text-left text-xs text-white/60">
            <li>• Enable hardware acceleration in your browser settings</li>
            <li>• Update your browser or graphics drivers</li>
            <li>• Try a different browser or device</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-screen select-none overflow-hidden"
      style={{ backgroundColor: "#030308" }}
    >
      <div ref={ref} className="absolute inset-0" />
      <div className="game-ui absolute inset-0 pointer-events-none">
        <Overlays />
      </div>
    </div>
  );
}
