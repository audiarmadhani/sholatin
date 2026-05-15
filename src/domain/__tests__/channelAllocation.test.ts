import { applySpendStep, costForNextStep } from '../channelAllocation';

describe('channelAllocation', () => {
  it('never spends with insufficient budget', () => {
    const r = applySpendStep({
      unspent: 1,
      channelProgress: 0,
      baseCost: 10,
      step: 0.05,
    });
    expect(r.spent).toBe(0);
    expect(r.channelProgress).toBe(0);
  });

  it('caps progress at 1', () => {
    const r = applySpendStep({
      unspent: 9999,
      channelProgress: 0.99,
      baseCost: 1,
      step: 0.05,
    });
    expect(r.channelProgress).toBe(1);
  });

  it('cost increases with progress', () => {
    const low = costForNextStep(0, 2);
    const high = costForNextStep(0.9, 2);
    expect(high).toBeGreaterThanOrEqual(low);
  });
});
