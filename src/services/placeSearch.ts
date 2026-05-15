export type PlaceSearchHit = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

type NominatimSearchRow = {
  place_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
};

/**
 * Forward geocode (city / address → coordinates) via OpenStreetMap Nominatim.
 * Use sparingly; respect https://operations.osmfoundation.org/policies/nominatim/
 */
export async function searchPlaces(query: string): Promise<PlaceSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 18_000);
  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '8',
      addressdetails: '0',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Sholatin/1.0 (place search; private low-volume use)',
      },
    });
    if (!res.ok) {
      throw new Error(`Search failed (${res.status}). Try again in a moment.`);
    }
    const data = (await res.json()) as NominatimSearchRow[];
    if (!Array.isArray(data)) return [];
    return data
      .map((row, i) => ({
        id: String(row.place_id ?? `${row.lat},${row.lon},${i}`),
        displayName: row.display_name,
        latitude: Number.parseFloat(row.lat),
        longitude: Number.parseFloat(row.lon),
      }))
      .filter((h) => Number.isFinite(h.latitude) && Number.isFinite(h.longitude));
  } finally {
    clearTimeout(t);
  }
}
