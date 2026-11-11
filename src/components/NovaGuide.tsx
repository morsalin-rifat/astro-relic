import { useEffect, useRef, useState, useCallback } from "react";
import { store, useGame } from "@/state/store";
import { audio as ambient } from "@/game/audio";
import voiceEn from "@/assets/hub_voice_en.mp3.asset.json";
import voiceBn from "@/assets/hub_voice_bn.mp3.asset.json";

interface NovaGuideProps {
  onComplete?: () => void;
  targetActive?: boolean;
}

const DIALOGUES = {
  en: {
    audio: voiceEn.url,
    fallbackAudio: "/assets/aistudio/hub_voice_en_4754a8a1.mp3",
    text: "Bip-boop! Hello Explorer! I'm Nova, your mission co-pilot. Look! The Red Planet Mars is calling us. Ready to uncover its secrets? Tap that glowing golden button on the right!",
    tapToPlay: "🔊 Tap to Listen",
    badge: "NOVA // MISSION CO-PILOT",
    skip: "✕ Skip",
    tapHere: "TAP HERE!",
  },
  bn: {
    audio: voiceBn.url,
    fallbackAudio: "/assets/aistudio/hub_voice_bn_a707abac.mp3",
    text: "বিপ-বুপ! হ্যালো এক্সপ্লোরার! আমি নোভা, তোমার মিশন কো-পাইলট। দেখো, লাল গ্রহ মঙ্গল আমাদের ডাকছে! চলো এর রহস্যগুলো খুঁজে দেখি! ডানের সোনালী বাটনটিতে ট্যাপ করো!",
    tapToPlay: "🔊 শুনতে ট্যাপ করো",
    badge: "নোভা // মিশন কো-পাইলট",
    skip: "✕ বাদ দাও",
    tapHere: "এখানে ট্যাপ করো!",
  },
} as const;

export function NovaGuide({ onComplete }: NovaGuideProps) {
  const lang = useGame((s) => s.lang);
  const muted = useGame((s) => s.muted);
  const phase = useGame((s) => s.phase);
  const hasSeenHubIntro = useGame((s) => s.hasSeenHubIntro);

  const visible = !hasSeenHubIntro;
  const [typeKey, setTypeKey] = useState(0);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const currentDialogue = DIALOGUES[lang] ?? DIALOGUES.en;
  const fullText = currentDialogue.text;

  // Stop audio helper
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      const a = audioRef.current;
      a.onerror = a.onplay = a.onended = a.onpause = null;
      a.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    ambient.duck(false);
    setIsPlaying(false);
  }, []);

  // Finish / dismiss onboarding guide
  const handleDismiss = useCallback(() => {
    stopAudio();
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    store.set({ tutorialDone: true, hasSeenHubIntro: true });
    onComplete?.();
  }, [stopAudio, onComplete]);

  // Handle Playback & Autoplay policy
  const playAudio = useCallback(() => {
    stopAudio();

    if (muted) {
      setIsPlaying(false);
      setAutoplayBlocked(false);
      return;
    }

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = currentDialogue.audio;

    // Fallback if copied path has any issue
    audio.onerror = () => {
      if (audio.src !== currentDialogue.fallbackAudio) {
        audio.src = currentDialogue.fallbackAudio;
        audio.play().catch(() => setAutoplayBlocked(true));
      }
    };

    audio.onplay = () => {
      ambient.duck(true);
      setIsPlaying(true);
      setAutoplayBlocked(false);
    };

    audio.onended = () => {
      ambient.duck(false);
      setIsPlaying(false);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked((was) => {
            if (was) setTypeKey((k) => k + 1); // re-sync typing with voice
            return false;
          });
        })
        .catch(() => {
          // Autoplay blocked by browser policy without user gesture
          setIsPlaying(false);
          setAutoplayBlocked(true);
        });
    }
  }, [currentDialogue, muted, stopAudio]);

  // Trigger typewriter effect synced to audio length (~12.5 seconds total)
  useEffect(() => {
    if (!visible) return;

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    setDisplayedText("");
    setIsTyping(true);

    let charIndex = 0;
    const totalChars = fullText.length;
    // Calculate typing speed to pace cleanly over ~11.5 - 12.5 seconds
    const intervalMs = Math.max(38, Math.min(85, Math.floor(11800 / totalChars)));

    const typeNextChar = () => {
      charIndex += 1;
      setDisplayedText(fullText.slice(0, charIndex));
      if (charIndex < totalChars) {
        typingTimerRef.current = window.setTimeout(typeNextChar, intervalMs);
      } else {
        setIsTyping(false);
      }
    };

    typingTimerRef.current = window.setTimeout(typeNextChar, 120);

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, [fullText, visible, typeKey]);

  // Audio start & language change reaction
  useEffect(() => {
    if (phase !== "hub" || !visible) {
      stopAudio();
      return;
    }

    playAudio();

    return () => {
      stopAudio();
    };
  }, [phase, lang, muted, visible, playAudio, stopAudio]);

  // Listen to game events (e.g. if player presses NEW GAME before finish or calls Nova)
  useEffect(() => {
    const unsub1 = store.on("hub:newgame", () => {
      handleDismiss();
    });
    const unsub2 = store.on("hub:callNova", () => {
      store.set({ hasSeenHubIntro: false });
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [handleDismiss, playAudio]);

  // Measure a guide line from the bubble to the NEW GAME button
  useEffect(() => {
    if (!visible || phase !== "hub") return;
    const measure = () => {
      const b = bubbleRef.current?.getBoundingClientRect();
      const t = document.getElementById("hub-newgame-btn")?.getBoundingClientRect();
      if (!b || !t || window.innerWidth < 768 || t.left - b.right < 40) return setLine(null);
      setLine({ x1: b.right + 6, y1: b.top + b.height / 2, x2: t.left - 10, y2: t.top + t.height / 2 });
    };
    measure();
    const id = window.setInterval(measure, 300);
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [visible, phase]);

  if (!visible || phase !== "hub") return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {line && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none" aria-hidden>
          <defs>
            <marker id="nova-arrow" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#ffd97d" />
            </marker>
          </defs>
          <path
            d={`M${line.x1},${line.y1} C${(line.x1 + line.x2) / 2},${line.y1} ${(line.x1 + line.x2) / 2},${line.y2} ${line.x2},${line.y2}`}
            className="nova-guide-line"
            markerEnd="url(#nova-arrow)"
          />
        </svg>
      )}
      {/* ── Nova Mascot + bubble: bottom on phones, raised mid-left on larger screens ── */}
      <div className="fixed bottom-2 left-2 right-2 md:right-auto md:bottom-auto md:top-[16%] md:left-8 pointer-events-auto flex items-end gap-2 sm:gap-4 z-40">
        <div
          className={`relative cursor-pointer transition-all duration-300 ${
            isPlaying ? "animate-talking-glow" : "animate-float-gentle"
          }`}
          onClick={() => {
            if (autoplayBlocked) {
              playAudio();
            } else if (isPlaying) {
              stopAudio();
            } else {
              playAudio();
            }
          }}
          title="Nova Co-Pilot"
        >
          {/* Subtle cyan thruster particle / glow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-8 bg-cyan-400/30 blur-lg rounded-full animate-pulse" />

          {/* Nova Sprite Image (Uploaded high-res transparent mascot) */}
          <img
            src="/images/nova.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/assets/aistudio/chact__2__4eb39933.png";
            }}
            alt="Nova Co-Pilot"
            className="w-[78px] sm:w-[120px] md:w-[150px] lg:w-[170px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)] filter"
            draggable={false}
          />

          {/* Visor Eye Blink Subtle Hologram Overlay */}
          <div
            className="absolute top-[28%] left-[42%] w-[26%] h-[14%] bg-cyan-300/60 rounded-full blur-[2px] pointer-events-none animate-visor-blink"
            aria-hidden
          />

          {/* Speaking Audio Waveform Indicator */}
          {isPlaying && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              <span className="w-1 h-2 bg-cyan-400 animate-pulse rounded-full" />
              <span className="w-1 h-3 bg-cyan-400 animate-pulse rounded-full [animation-delay:150ms]" />
              <span className="w-1 h-1.5 bg-cyan-400 animate-pulse rounded-full [animation-delay:300ms]" />
            </div>
          )}
        </div>

        {/* ── Speech Bubble: kid-friendly holo comms ── */}
        <div ref={bubbleRef} className="nova-bubble pointer-events-auto relative flex-1 md:flex-none md:w-[min(400px,calc(100vw-620px))] md:min-w-[300px] mb-4 sm:mb-8 animate-[hubrise_0.45s_ease]">
          <span className="nova-bubble-tail" aria-hidden />
          <div className={`nova-bubble-inner ${isPlaying ? "is-speaking" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="nova-nameplate">
                <span className="nova-dot" />
                {currentDialogue.badge}
              </div>
              <div className="flex items-center gap-1.5">
                {isPlaying && (
                  <div className="nova-wave" aria-hidden>
                    <i /><i /><i /><i />
                  </div>
                )}
                <button
                  onClick={() => (isPlaying ? stopAudio() : playAudio())}
                  className="nova-icon-btn"
                  title={isPlaying ? "Stop voice" : "Play voice"}
                >
                  {isPlaying ? "🔊" : "🔈"}
                </button>
                <button onClick={handleDismiss} className="nova-icon-btn text-[11px] px-2 w-auto" title="Skip">
                  {currentDialogue.skip}
                </button>
              </div>
            </div>

            <p className="nova-text min-h-[4.2rem]">
              {displayedText}
              {isTyping && <span className="nova-caret" />}
            </p>

            <div className="mt-3 flex items-center justify-between gap-2">
              {autoplayBlocked ? (
                <button onClick={playAudio} className="nova-listen-btn">{currentDialogue.tapToPlay}</button>
              ) : (
                <span className="text-[11px] font-semibold text-[#ffd97d] flex items-center gap-1">
                  <span className="nova-point">👉</span>
                  {lang === "bn" ? "ডানের সোনালী বাটন" : "Golden button on the right"}
                </span>
              )}
              <div className="flex gap-1" aria-hidden>
                <span className="nova-star">★</span><span className="nova-star [animation-delay:.3s]">★</span><span className="nova-star [animation-delay:.6s]">★</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
