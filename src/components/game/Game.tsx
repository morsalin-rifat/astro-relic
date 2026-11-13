import { useEffect, useRef } from "react";
import { Engine } from "@/game/engine";
import { Overlays } from "@/components/Overlays";

export default function Game() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const engine = new Engine(ref.current);
    return () => engine.dispose();
  }, []);

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
