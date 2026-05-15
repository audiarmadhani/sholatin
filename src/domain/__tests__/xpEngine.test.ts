import { classifyAndScoreXp, BONUS_WINDOW_MS } from '../xpEngine';

describe('xpEngine', () => {
  const T = Date.parse('2026-05-13T05:00:00.000Z');

  it('grants bonus in [T, T+30m]', () => {
    const r = classifyAndScoreXp({ recordedAtMs: T + 29 * 60 * 1000, officialTimeMs: T });
    expect(r.status).toBe('on_time');
    expect(r.total).toBeGreaterThan(r.base);
  });

  it('no bonus 1ms after window', () => {
    const r = classifyAndScoreXp({
      recordedAtMs: T + BONUS_WINDOW_MS + 1,
      officialTimeMs: T,
    });
    expect(r.status).toBe('late');
    expect(r.bonus).toBe(0);
  });
});
