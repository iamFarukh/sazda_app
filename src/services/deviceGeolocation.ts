import { InteractionManager, Platform } from 'react-native';
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
 * Android: try fast approximate / cached fix first, then high-accuracy (GPS / fused).
 * iOS: single high-accuracy request (existing behavior).
 */
function runAfterInteractions(fn: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(fn, Platform.OS === 'android' ? 120 : 0);
  });
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
            runAfterInteractions(() => {
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

    runAfterInteractions(() => tryLowThenHigh(true));
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
