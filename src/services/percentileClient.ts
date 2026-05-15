import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { percentileApiUrl?: string } | undefined;
const BASE = extra?.percentileApiUrl ?? process.env.EXPO_PUBLIC_PERCENTILE_API_URL;

export type PercentileResult = { topPercent: number; weekXpSubmitted?: number };

/**
 * Optional Phase B: POST weekly XP + install id; GET percentile band.
 * If EXPO_PUBLIC_PERCENTILE_API_URL is unset, returns null (UI hidden).
 */
export async function fetchPercentileSnapshot(params: {
  installId: string;
  weeklyXpTotal: number;
}): Promise<PercentileResult | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE.replace(/\/$/, '')}/percentile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installId: params.installId,
        weeklyXpTotal: params.weeklyXpTotal,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { topPercent?: number };
    if (typeof j.topPercent !== 'number') return null;
    return { topPercent: j.topPercent, weekXpSubmitted: params.weeklyXpTotal };
  } catch {
    return null;
  }
}
