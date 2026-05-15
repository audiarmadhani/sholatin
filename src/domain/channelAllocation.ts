/**
 * Deterministic cost: increases as channel approaches 1 (diminishing returns on progress per budget).
 */
export function costForNextStep(channelProgress: number, baseCost: number): number {
  const p = Math.min(1, Math.max(0, channelProgress));
  return Math.max(1, Math.floor(baseCost * (1 + p * 3)));
}

export function applySpendStep(params: {
  unspent: number;
  channelProgress: number;
  baseCost: number;
  step: number; // delta progress e.g. 0.05
}): { unspent: number; channelProgress: number; spent: number } {
  const { baseCost, step } = params;
  let { unspent, channelProgress } = params;
  if (channelProgress >= 1 || unspent <= 0) {
    return { unspent, channelProgress, spent: 0 };
  }
  const nextP = Math.min(1, channelProgress + step);
  const avgP = (channelProgress + nextP) / 2;
  const cost = costForNextStep(avgP, baseCost);
  if (unspent < cost) {
    return { unspent, channelProgress, spent: 0 };
  }
  return { unspent: unspent - cost, channelProgress: nextP, spent: cost };
}

export function meanHarmony(progress: Record<string, number>): number {
  const vals = Object.values(progress);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
