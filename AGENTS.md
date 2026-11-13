<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Architecture decisions

- The Astro Relic game (three.js + `src/game`, `src/state`, `src/data`, `src/components/Overlays|SolarHUD`) touches browser APIs at module load (localStorage in the store, WebGL). Keep it behind the lazy client-only mount in `src/routes/index.tsx` / `src/components/game/Game.tsx`; never import `src/game/*` or `src/state/store` from an SSR-evaluated module.
- Migrated from https://github.com/morsalin-rifat/astro-relic.git (Vite SPA, source of truth for behavior); game assets live in `public/images/` (referenced by absolute URL, not imports).
- Mars explore world = one procedural heightfield corridor (`marsRelief` + `MARS_SITES` in `marsWorld.ts`), 4 zones along -Z shaped after NASA traverse maps with ridge passes between them, like the Moon; no imported terrain GLBs (they caused seam glitches). `store.marsZone` picks the spawn zone for chapter jumps. Dev-only `?phase=<phase>`, `__marsTeleport`, `__marsProbe`.
- Rover voice clips live in `public/audio/<rover>/<clip>_<en|bn>.mp3`; `voice.play("spirit/<clip>")` picks a folder (bare names default to sojourner). Each later rover mission gets its own encounter component (like `SpiritUI.tsx`) gated by the previous rover's flag, so missions unlock in order.
- Moon explore = `phase: "moon"` → `src/game/scenes/moonWorld.ts`: one procedural corridor along -Z with 4 landing sites (`ZONE_Z`/`MOON_ZONES`: Apollo 11, 12+Surveyor 3, 15, 17) separated by ridges with a central pass; chapter cards set `store.moonZone` to pick the spawn site. Named sites in `MOON_SITES` (with `zone`) drive labels, HUD and minimap. Dev: `?phase=moon`, `__moonZone(n)`, `__moonTeleport`.
- Moon missions: each landing site gets its own mission component (Apollo 11 = `src/components/Apollo11UI.tsx`). `moonWorld` publishes the nearest mission spot as `store.moonNear`, pauses walking via `store.moonFreeze`, and emits `a11:arrive` on first entry to zone 0; the component owns the story/hunt/quiz flow. Clips live in `public/audio/apollo11/<clip>_<en|bn>.mp3`, photos in `public/images/apollo11/`.
