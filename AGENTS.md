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
- Mars explore world = 4 real NASA site GLBs (350 m each, laid along -Z) plus rock/astronaut, all meshopt+webp optimized in `public/models/` and loaded by `/models/...` URL with MeshoptDecoder, so GitHub/Vercel serve them (Lovable asset proxy URLs 404 off-platform). `groundHeight` samples one combined heightfield rasterized on load with seams blended. Dev-only `?phase=<phase>` deep-links into a phase.
- Rover voice clips live in `public/audio/<rover>/<clip>_<en|bn>.mp3`; `voice.play("spirit/<clip>")` picks a folder (bare names default to sojourner). Each later rover mission gets its own encounter component (like `SpiritUI.tsx`) gated by the previous rover's flag, so missions unlock in order.
