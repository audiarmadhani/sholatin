/**
 * Browser Geolocation API — used on web because expo-location’s permission + position
 * flow is inconsistent in browsers (static export / Metro dev / permission mapping).
 */
export function getWebGeolocationPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser does not support geolocation.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (err) => {
        const code =
          err.code === 1
            ? 'Permission denied — allow location for this site.'
            : err.code === 2
              ? 'Position unavailable.'
              : err.code === 3
                ? 'Timed out — try again outdoors or with better signal.'
                : err.message || 'Location request failed';
        reject(new Error(code));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 25_000,
      },
    );
  });
}
