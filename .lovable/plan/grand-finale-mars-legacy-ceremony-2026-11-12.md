# Grand Finale — "Mars Legacy" ceremony

Inspired by: Journey (emotional wordless ending), Mass Effect (mission debrief), Zelda (item-get fanfare), Outer Wilds (memorial reflection).

## What the player sees
1. **Trigger** — after InSight's "Silent Listener" badge, when all 4 medals are owned, Nova says: "One last task, explorer." A golden beacon appears at a hilltop near the map center ("Legacy Point").
2. **Flag Planting** — walk to the beacon, press/tap "Plant the Flag". Camera does a slow cinematic orbit; a flag rises with cloth wave, golden light burst + confetti dust.
3. **Memorial wall** — 4 glowing holo-pillars rise around the flag (Sojourner, Spirit, Opportunity, InSight), each with rover name, years, one-line legacy ("Oppy: 45 km, 15 years"). Pillars light up one-by-one with a chime (Zelda-style reveal).
4. **Debrief screen** (Mass Effect style) — full-screen holo panel: 4 medals in a row, stats (missions, quizzes correct, blueberries found), Nova's closing line (typewriter, BN/EN by language toggle).
5. **Certificate** — "Junior Mars Historian" certificate with player name input, date, 4 medal stamps; **Download as PNG** button (canvas, no server).
6. **Credits / end** — slow sky pan to blue sunset, buttons: "Keep Exploring" (free roam) and "Back to Hub". Hub trophy wall shows all 4 badges gold + "Master Explorer" title.

## Also included (small)
- Blue sunset sky tint during the finale (reuses Living Mars).
- Mobile: all finale buttons large and tap-friendly; checked at phone size.
- Dev-only `?phase=finale` shortcut for testing.

## Not included
- Nova closing voice audio (no clip exists) — text only; can add later if you give a voice file.

## Technical
- New `src/components/FinaleUI.tsx` (overlay, debrief, certificate canvas), gated on `badges.length===4`; wired in `Overlays.tsx`.
- Store: `finaleDone` flag, persisted.
- `marsWorld.ts`: Legacy Point beacon, flag mesh (vertex wave), 4 pillar meshes, camera orbit tween.
- Verify with Playwright: force 4 badges, run plant → pillars → debrief → certificate download, check no errors, desktop + mobile screenshots.
