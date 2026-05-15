import { getLandscapeLevelSegment, getUnlockTiers } from '../unlockCatalog';

describe('getLandscapeLevelSegment', () => {
  const tiers = getUnlockTiers();
  const maxXp = 1000;
  const firstThresholdXp = (1 / (tiers.length - 1)) * maxXp;

  it('first segment spans from 0 to first threshold', () => {
    const s = getLandscapeLevelSegment(0, maxXp, tiers);
    expect(s.level).toBe(1);
    expect(s.highestTierIndex).toBe(0);
    expect(s.segmentStartXp).toBe(0);
    expect(s.segmentSpanXp).toBe(Math.round(firstThresholdXp));
    expect(s.withinSegmentXp).toBe(0);
    expect(s.segmentFill).toBe(0);
  });

  it('mid first segment', () => {
    const s = getLandscapeLevelSegment(firstThresholdXp * 0.4, maxXp, tiers);
    expect(s.level).toBe(1);
    expect(s.segmentFill).toBeCloseTo(0.4, 5);
  });

  it('after first threshold is level 2', () => {
    const s = getLandscapeLevelSegment(firstThresholdXp + 1, maxXp, tiers);
    expect(s.level).toBe(2);
    expect(s.highestTierIndex).toBe(1);
  });

  it('final segment ends at max month XP', () => {
    const s = getLandscapeLevelSegment(maxXp, maxXp, tiers);
    expect(s.highestTierIndex).toBe(tiers.length - 1);
    expect(s.level).toBe(tiers.length);
    expect(s.segmentFill).toBe(1);
    expect(s.withinSegmentXp).toBe(s.segmentSpanXp);
  });
});
