import { requestDevicePosition } from './deviceGeolocation';
import { ensureFineLocationPermission } from './locationPermission';
import { reverseGeocodeCity } from './reverseGeocode';
import { usePrayerLocationStore } from '../store/prayerLocationStore';

export type FetchPrayerLocationResult =
  | 'ok'
  | 'permission_denied'
  | { error: string };

/**
 * Read GPS, persist lat/lng immediately, then resolve city via reverse geocoding and update storage.
 */
export function fetchAndPersistPrayerLocation(): Promise<FetchPrayerLocationResult> {
  return (async () => {
    const permitted = await ensureFineLocationPermission();
    if (!permitted) {
      return 'permission_denied';
    }

    return new Promise<FetchPrayerLocationResult>(resolve => {
      requestDevicePosition(
        async (lat, lon) => {
          const now = Date.now();
          usePrayerLocationStore.getState().setSaved({
            latitude: lat,
            longitude: lon,
            city: '…',
            updatedAt: now,
          });

          try {
            const city = await reverseGeocodeCity(lat, lon);
            usePrayerLocationStore.getState().setSaved({
              latitude: lat,
              longitude: lon,
              city,
              updatedAt: Date.now(),
            });
          } catch {
            usePrayerLocationStore.getState().setSaved({
              latitude: lat,
              longitude: lon,
              city: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
              updatedAt: Date.now(),
            });
          }

          resolve('ok');
        },
        message => {
          resolve({ error: message });
        },
      );
    });
  })();
}
