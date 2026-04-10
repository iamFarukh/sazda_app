import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

/**
 * We request runtime permission with PermissionsAndroid first.
 * Letting the native geolocation module also prompt can race or confuse Android.
 */
Geolocation.setRNConfiguration({
  skipPermissionRequests: Platform.OS === 'android',
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type GeoErr = { code?: number; message?: string };

function formatGeolocationError(err: GeoErr): string {
  const code = typeof err.code === 'number' ? err.code : undefined;
  const msg = err.message?.trim();
  if (code === 1) return 'Location permission denied.';
  if (code === 2)
    return 'Location is off or unavailable. Turn on Location in device settings and try again.';
  if (code === 3)
    return 'Location timed out. Turn on Location, try Wi‑Fi or move outdoors, then try again.';
  return msg || 'Could not get location';
}

/**
 * Schedule work after the current JS frame is idle.
 * Uses `requestIdleCallback` where available (newer RN), falls back to `setTimeout`.
 */
function runWhenIdle(fn: () => void): void {
  const delay = Platform.OS === 'android' ? 120 : 0;
  const scheduled = () => setTimeout(fn, delay);

  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(scheduled);
  } else {
    setTimeout(scheduled, 0);
  }
}

export function requestDevicePosition(
  onSuccess: (lat: number, lon: number) => void,
  onError: (message: string) => void,
): void {
  if (Platform.OS === 'android') {
    const fail = (err: GeoErr) => onError(formatGeolocationError(err));

    const tryLowThenHigh = (allowPermissionRetry: boolean) => {
      Geolocation.getCurrentPosition(
        pos => onSuccess(pos.coords.latitude, pos.coords.longitude),
        err => {
          if (err.code === 1 && allowPermissionRetry) {
            // Right after Allow, native stack sometimes still returns PERMISSION_DENIED once.
            runWhenIdle(() => {
              tryLowThenHigh(false);
            });
            return;
          }
          if (err.code === 1) {
            fail(err);
            return;
          }
          Geolocation.getCurrentPosition(
            pos => onSuccess(pos.coords.latitude, pos.coords.longitude),
            err2 => fail(err2),
            {
              enableHighAccuracy: true,
              timeout: 22_000,
              maximumAge: 60_000,
            },
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 300_000,
        },
      );
    };

    runWhenIdle(() => tryLowThenHigh(true));
    return;
  }

  Geolocation.getCurrentPosition(
    pos => onSuccess(pos.coords.latitude, pos.coords.longitude),
    err => onError(formatGeolocationError(err)),
    {
      enableHighAccuracy: true,
      timeout: 28_000,
      maximumAge: 60_000,
    },
  );
}
