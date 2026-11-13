import { describe, expect, it } from "vitest";
import { MARS_DISCOVERIES } from "../../data/marsDiscoveries";
import { collectStar, nearestStar, zoneAward, zoneCount } from "./marsStarRules";
describe("Mars discoveries", () => {
  it("has 28 unique stars, seven in each of four zones", () => {
    expect(new Set(MARS_DISCOVERIES.map(s=>s.id)).size).toBe(28);
    for (let zone=0; zone<4; zone++) expect(MARS_DISCOVERIES.filter(s=>s.zone===zone)).toHaveLength(7);
  });
  it("collects a real star only once and rejects unknown stars", () => {
    expect(collectStar([], "yogi-rock")).toEqual(["yogi-rock"]);
    expect(collectStar(["yogi-rock"], "yogi-rock")).toEqual(["yogi-rock"]);
    expect(collectStar([], "fake")).toEqual([]);
  });
  it("allows inspection within 10 metres, never outside it or after collection", () => {
    expect(nearestStar(105,60,[])?.id).toBe("flood-channel");
    expect(nearestStar(105.1,60,[])).toBeNull();
    expect(nearestStar(95,60,["flood-channel"])).toBeNull();
  });
  it("awards each region only at seven unique discoveries", () => {
    for (let zone=0; zone<4; zone++) {
      const ids=MARS_DISCOVERIES.filter(s=>s.zone===zone).map(s=>s.id);
      expect(zoneAward(ids.slice(0,6),zone)).toBeNull();
      expect(zoneAward(ids,zone)).toBe(`mars-stars-${zone}`);
      expect(zoneCount([...ids,ids[0] ?? ""],zone)).toBe(7);
    }
  });
});