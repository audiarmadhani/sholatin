import * as Location from 'expo-location';
import { Platform } from 'react-native';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

function fromExpoHit(hit: Location.LocationGeocodedAddress): string | null {
  const city =
    hit.city ?? hit.subregion ?? hit.district ?? hit.region ?? hit.name ?? hit.street ?? null;
  const country = hit.country ?? null;
  if (city && country) return `${city}, ${country}`;
  if (country) return country;
  if (city) return city;
  return null;
}

async function fromNominatim(lat: number, lon: number): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const q = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Sholatin/1.0 (prayer times; private use)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: NominatimAddress };
    const a = data.address;
    if (!a) return null;
    const place =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? null;
    const country = a.country ?? null;
    if (place && country) return `${place}, ${country}`;
    if (country) return country;
    if (place) return place;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Human-readable "City, Country" for coordinates. Web uses Nominatim (Expo geocode is not on web).
 * Native tries Expo first, then Nominatim as fallback.
 */
export async function reverseGeocodeLabel(lat: number, lon: number): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const hits = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const hit = hits[0];
      if (hit) {
        const label = fromExpoHit(hit);
        if (label) return label;
      }
    } catch {
      // continue to nominatim
    }
  }
  return fromNominatim(lat, lon);
}
