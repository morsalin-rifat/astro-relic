import { useEffect, useRef } from "react";
import { Map, ScanSearch, Compass, House, X, Check, Star, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { store, useGame } from "../state/store";
import { MARS_DISCOVERIES, MARS_REGIONS } from "../data/marsDiscoveries";
import { collectStar, zoneCount, zoneAward } from "../game/sim/marsStarRules";
import { voice } from "../game/voice";
import { audio } from "../game/audio";

function inspectNearby() {
  const s = store.get();
  if (!s.marsNear || s.marsCard || s.showEncounter || s.showSpirit || s.showOppy || s.showInsight) return;
  voice.stop(); store.clearDialogue();
  store.set({ marsCard: s.marsNear, bigMap: false });
}

export function MarsStarHunt() {
  const s = useGame(s => s);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const card = MARS_DISCOVERIES.find(d => d.id === s.marsCard);
  const bn = s.lang === "bn";
  const closeCard = () => store.set({ marsCard: null });
  useEffect(() => {
    if (!card) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => previousFocus.current?.focus();
  }, [card?.id]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const st = store.get();
      if (st.phase !== "explore" || e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["KeyE","KeyM","KeyC","Escape","Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") { store.set({ marsCard: null, bigMap: false }); return; }
      if (st.marsCard) return;
      if (e.code === "KeyE") inspectNearby();
      if (e.code === "KeyM") store.set({ bigMap: !st.bigMap });
      if (e.code === "KeyC") store.emit("mars:camera-reset");
    };
    window.addEventListener("keydown", key);
    const off = store.on("mars:inspect", inspectNearby);
    return () => { window.removeEventListener("keydown",key); off(); };
  }, []);
  if (s.phase !== "explore" || s.loading) return null;
  const busy = s.showEncounter || s.showSpirit || s.showOppy || s.showInsight;
  const near = MARS_DISCOVERIES.find(d=>d.id === s.marsNear);
  const take = () => {
    if (!card) return;
    const ids = collectStar(store.get().marsStars, card.id);
    const award = zoneAward(ids,card.zone);
    const badges = store.get().badges;
    store.set({ marsStars: ids, badges: award && !badges.includes(award) ? [...badges,award] : badges });
    audio.beep(1320);
  };
  return <>
    {!busy && !card && <aside className="mars-actions rounded-lg border border-expedition-line bg-expedition text-expedition-ink p-2 pointer-events-auto" aria-label={bn ? "ম্যাপের কাজ" : "Mars map actions"}>
      <div className="flex items-center justify-center gap-1 text-relic-gold text-sm font-bold pb-2"><Star size={14}/>{s.marsStars.length}/28</div>
      <div className="grid grid-cols-2 gap-1">
        <Button variant="ghost" title={bn ? "ম্যাপ (M)" : "Map (M)"} aria-label="Map (M)" onClick={()=>store.set({bigMap:!s.bigMap})}><Map/><kbd>M</kbd></Button>
        <Button variant="ghost" title={bn ? "কাছের তারা দেখো (E)" : "Inspect nearby star (E)"} aria-label="Inspect nearby star (E)" disabled={!near} onClick={inspectNearby}><ScanSearch/><kbd>E</kbd></Button>
        <Button variant="ghost" title={bn ? "ক্যামেরা সামনে (C)" : "Reset camera (C)"} aria-label="Reset camera (C)" onClick={()=>store.emit("mars:camera-reset")}><Compass/><kbd>C</kbd></Button>
        <Button variant="ghost" title={bn ? "হাবে যাও" : "Go to hub"} aria-label="Go to hub" onClick={()=>{store.set({bigMap:false,marsCard:null});store.emit("engine:goto","hub");}}><House/></Button>
      </div>
    </aside>}
    {s.bigMap && !card && <aside className="mars-map-summary rounded-lg border border-expedition-line bg-expedition text-expedition-ink p-3 pointer-events-auto">
      <h2 className="text-relic-gold font-bold flex items-center gap-2"><Star size={16}/>{bn ? "মঙ্গলের আবিষ্কার" : "Mars discoveries"}</h2>
      <p className="text-xs opacity-75 mt-1">{bn ? "★ বাকি · ✓ সংগ্রহ করা" : "★ Uncollected · ✓ Collected"}</p>
      {MARS_REGIONS.map((r,zone)=><div key={r.en} className="mt-3"><h3 className="text-sm font-bold">{r[s.lang]} <span className="text-relic-gold">{zoneCount(s.marsStars,zone)}/7</span></h3><div className="grid gap-1 mt-1">{MARS_DISCOVERIES.filter(d=>d.zone===zone).map(d=><span key={d.id} className="text-xs opacity-85">{s.marsStars.includes(d.id) ? "✓" : "★"} {d.name[s.lang]}</span>)}</div></div>)}
    </aside>}
    {near && !busy && !card && !s.bigMap && <Button className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] whitespace-normal bg-expedition text-relic-gold border border-expedition-line h-auto py-3 pointer-events-auto" onClick={inspectNearby}><Star/>{near.name[s.lang]} · {bn ? "দেখো" : "Inspect"} <kbd>E</kbd></Button>}
    {card && <div className="fixed inset-0 z-[54] mars-card-shade flex items-center justify-center p-4 pointer-events-auto" onClick={closeCard}>
      <section role="dialog" aria-modal="true" aria-labelledby="mars-card-title" className="w-full max-w-lg max-h-[85dvh] overflow-auto rounded-lg bg-expedition text-expedition-ink border border-expedition-line" onClick={e=>e.stopPropagation()} onKeyDown={e=>{ if(e.key!=="Tab") return; const buttons=e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"); const first=buttons[0], last=buttons[buttons.length-1]; if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}}}>
        <header className="flex items-center justify-between px-5 py-3"><span className="text-relic-gold text-sm font-bold">★ {MARS_REGIONS[card.zone]?.[s.lang]} · {zoneCount(s.marsStars,card.zone)}/7</span><Button ref={closeRef} size="icon" variant="ghost" aria-label={bn ? "বন্ধ করো" : "Close discovery"} onClick={closeCard}><X/></Button></header>
        <figure><img src={card.image} alt={card.caption} className="w-full h-56 object-contain"/><figcaption className="px-5 py-2 text-xs opacity-65">NASA/JPL · {card.caption}</figcaption></figure>
        <div className="px-5 pb-5"><h2 id="mars-card-title" className="text-2xl font-bold text-relic-gold">{card.name[s.lang]}</h2><p className="mt-3 text-base leading-relaxed">{card.fact[s.lang]}</p>
          {zoneAward(s.marsStars,card.zone) && <p role="status" className="text-relic-gold font-bold mt-4">🏅 {bn ? "নোভা: সাবাশ! এই অঞ্চলের সাতটি আবিষ্কারই তোমার!" : "Nova: Brilliant! You discovered all seven treasures in this region!"}</p>}
          <div className="flex gap-2 mt-5">{!s.marsStars.includes(card.id) ? <Button onClick={take} className="bg-relic-gold text-expedition"><Star/>{bn ? "তারা সংগ্রহ করো" : "Collect star"}</Button> : <span role="status" className="flex items-center gap-2 text-relic-gold"><Check size={18}/>{bn ? "সংগ্রহ করা হয়েছে" : "Star collected"}</span>}<Button variant="ghost" className="ml-auto" onClick={closeCard}>{bn ? "এগিয়ে চলো" : "Keep exploring"}<ArrowRight/></Button></div>
        </div>
      </section>
    </div>}
  </>;
}