import { MARS_DISCOVERIES } from "../../data/marsDiscoveries";
export const STAR_REACH = 10;
export function zoneCount(ids: readonly string[], zone: number) {
  return MARS_DISCOVERIES.filter(s => s.zone === zone && ids.includes(s.id)).length;
}
export function collectStar(ids: readonly string[], id: string) {
  if (!MARS_DISCOVERIES.some(s => s.id === id) || ids.includes(id)) return [...ids];
  return [...ids, id];
}
export function nearestStar(x: number, z: number, ids: readonly string[]) {
  return MARS_DISCOVERIES.filter(s => !ids.includes(s.id))
    .map(s => ({ spot: s, distance: Math.hypot(s.x-x, s.z-z) }))
    .filter(s => s.distance <= STAR_REACH).sort((a,b) => a.distance-b.distance)[0]?.spot ?? null;
}
export function zoneAward(ids: readonly string[], zone: number) {
  return zoneCount(ids, zone) === 7 ? `mars-stars-${zone}` : null;
}