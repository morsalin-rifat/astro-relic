import { useEffect, useRef, useState, useCallback } from "react";
import { store, useGame } from "@/state/store";

interface NovaGuideProps {
  onComplete?: () => void;
  targetActive?: boolean;
}

const DIALOGUES = {
  en: {
    audio: "/audio/nova_hub_en.mp3",
    fallbackAudio: "/assets/aistudio/hub_voice_en_4754a8a1.mp3",
    text: "Bip-boop! Hello Explorer! I'm Nova, your mission co-pilot. Look! The Red Planet Mars is calling us. Ready to uncover its secrets? Tap that glowing golden button on the right!",
    tapToPlay: "🔊 Tap to Listen",
    badge: "NOVA // MISSION CO-PILOT",
    skip: "✕ Skip",
    tapHere: "TAP HERE!",
  },
  bn: {
    audio: "/audio/nova_hub_bn.mp3",
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

  const [visible, setVisible] = useState(!hasSeenHubIntro);
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
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Finish / dismiss onboarding guide
  const handleDismiss = useCallback(() => {
    stopAudio();
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    setVisible(false);
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
      setIsPlaying(true);
      setAutoplayBlocked(false);
    };

    audio.onended = () => {
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
          setAutoplayBlocked(false);
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
  }, [fullText, visible]);

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
      setVisible(true);
      playAudio();
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [handleDismiss, playAudio]);

  if (!visible || phase !== "hub") return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {/* ── Nova Mascot Sprite Container ── */}
      <div className="fixed bottom-3 left-3 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 pointer-events-auto flex items-end gap-3 sm:gap-4 z-40">
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
            src="/images/nova_sprite.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/assets/aistudio/chact__2__4eb39933.png";
            }}
            alt="Nova Co-Pilot"
            className="w-[125px] sm:w-[155px] md:w-[195px] lg:w-[215px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.65)] filter"
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

        {/* ── Speech Bubble (Desktop beside Nova, Mobile anchored clean) ── */}
        <div
          className="pointer-events-auto relative max-w-[min(440px,88vw)] md:max-w-[420px] mb-2 sm:mb-4 bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-[0_0_24px_rgba(6,182,212,0.25)] transition-all animate-[hubrise_0.4s_ease]"
          style={{
            boxShadow: isPlaying
              ? "0 0 30px rgba(6, 182, 212, 0.35), inset 0 0 15px rgba(6, 182, 212, 0.12)"
              : "0 0 20px rgba(6, 182, 212, 0.2)",
          }}
        >
          {/* Cybernetic Accent Corners */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400 rounded-br" />

          {/* Header Row: Badge, Autoplay Alert, Skip button */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-cyan-500/20">
            <div className="inline-flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 font-mono text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-cyan-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>{currentDialogue.badge}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* If browser blocked autoplay, show pulse button to easily tap */}
              {autoplayBlocked && (
                <button
                  onClick={playAudio}
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse transition-transform hover:scale-105"
                >
                  {currentDialogue.tapToPlay}
                </button>
              )}

              {/* Mute/Sound toggle */}
              <button
                onClick={() => {
                  if (isPlaying) stopAudio();
                  else playAudio();
                }}
                className="text-white/50 hover:text-cyan-300 text-xs px-1.5 py-0.5 rounded transition-colors"
                title={isPlaying ? "Mute Voice" : "Play Voice"}
              >
                {isPlaying ? "🔊" : "🔇"}
              </button>

              {/* Skip / Dismiss button */}
              <button
                onClick={handleDismiss}
                className="text-white/40 hover:text-amber-400 text-xs font-mono px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                title="Dismiss Guide"
              >
                {currentDialogue.skip}
              </button>
            </div>
          </div>

          {/* Dialogue Body Text */}
          <div className="text-xs sm:text-sm md:text-[15px] font-sans leading-relaxed text-slate-100/95 min-h-[3.8rem]">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
            )}
          </div>

          {/* Bottom Hint */}
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-cyan-300/70">
            <span className="flex items-center gap-1">
              <span className="text-amber-400 animate-bounce">👉</span>
              <span>{lang === "bn" ? "ডানের বোতামটি দেখো" : "Look at the menu button"}</span>
            </span>
            <span className="text-white/40 text-[9px] uppercase tracking-wider">
              {isPlaying
                ? lang === "bn"
                  ? "কথা বলছে..."
                  : "Speaking..."
                : lang === "bn"
                  ? "প্রস্তুত"
                  : "Ready"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
