import { daysInMonthForMonthKey, maxMonthXp, monthXpProgress } from '@/src/domain/monthXp';

describe('daysInMonthForMonthKey', () => {
  it('returns 28 for Feb 2025', () => {
    expect(daysInMonthForMonthKey('2025-02')).toBe(28);
  });
  it('returns 29 for Feb 2024 (leap)', () => {
    expect(daysInMonthForMonthKey('2024-02')).toBe(29);
  });
  it('returns 31 for May 2026', () => {
    expect(daysInMonthForMonthKey('2026-05')).toBe(31);
  });
  it('returns 0 for invalid key', () => {
    expect(daysInMonthForMonthKey('bad')).toBe(0);
    expect(daysInMonthForMonthKey('2026-13')).toBe(0);
  });
});

describe('maxMonthXp', () => {
  it('Feb 2025: 28 * 5 * 12', () => {
    expect(maxMonthXp('2025-02')).toBe(28 * 5 * 12);
  });
  it('Feb 2024 leap: 29 * 5 * 12', () => {
    expect(maxMonthXp('2024-02')).toBe(29 * 5 * 12);
  });
  it('May 2026: 31 * 5 * 12', () => {
    expect(maxMonthXp('2026-05')).toBe(31 * 5 * 12);
  });
});

describe('monthXpProgress', () => {
  it('clamps to 1 when over max', () => {
    expect(monthXpProgress(99999, '2025-02')).toBe(1);
  });
  it('is 0 when earned is 0', () => {
    expect(monthXpProgress(0, '2026-05')).toBe(0);
  });
  it('is 0.5 at half of max for 30-day month', () => {
    const max = maxMonthXp('2026-04'); // April 30
    expect(monthXpProgress(max / 2, '2026-04')).toBeCloseTo(0.5, 5);
  });
});
