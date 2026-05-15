export type GeocodeHit = {
  lat: number;
  lon: number;
  /** Human-readable line from the geocoder. */
  label: string;
};

/**
 * Forward geocode (place name → coordinates) via OpenStreetMap Nominatim.
 * Keep queries short and low-frequency (fair-use policy).
 */
export async function searchPlaces(query: string, limit = 6): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 18_000);
  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: String(limit),
      addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Sholatin/1.0 (place search; private use)',
      },
    });
    if (!res.ok) {
      throw new Error('Search could not complete. Try again in a moment.');
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => ({
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        label: row.display_name,
      }))
      .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.label);
  } finally {
    clearTimeout(t);
  }
}
