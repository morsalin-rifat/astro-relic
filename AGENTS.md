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
- Mars explore terrain is the NASA Ma'adim Vallis GLB (Lovable asset); `groundHeight` samples a heightfield rasterized from it on load, falling back to the procedural formula until loaded. Dev-only `?phase=<phase>` deep-links into a game phase for testing.
