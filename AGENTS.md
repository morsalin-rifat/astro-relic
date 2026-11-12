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
- Mars explore world = 4 real NASA site GLBs, each cropped (clipping planes) to the same ZONE x ZONE square with the same relief, laid along -Z, plus rock/astronaut; meshopt+webp in `public/models/`, loaded by `/models/...` URL with MeshoptDecoder (Lovable asset proxy URLs 404 off-platform); Draco GLBs must be re-encoded to meshopt since no Draco decoder is set up. One combined heightfield drives walking; zones are y-offset to meet, seams get a visible sand-ramp mesh built from that heightfield, and edge dunes + bedrock hide the void, so visible ground == walkable ground. Dev-only `?phase=<phase>`, `__marsTeleport`, `__marsProbe`.
- Rover voice clips live in `public/audio/<rover>/<clip>_<en|bn>.mp3`; `voice.play("spirit/<clip>")` picks a folder (bare names default to sojourner). Each later rover mission gets its own encounter component (like `SpiritUI.tsx`) gated by the previous rover's flag, so missions unlock in order.
- Moon explore = `phase: "moon"` → `src/game/scenes/moonWorld.ts`: fully procedural (seeded heightfield + baked tileable regolith albedo/normal canvases, procedural Apollo hardware), named sites in `MOON_SITES` drive 3D labels, HUD and minimap; positions follow the real Apollo 11 traverse map. Dev: `?phase=moon`, `__moonTeleport`.
