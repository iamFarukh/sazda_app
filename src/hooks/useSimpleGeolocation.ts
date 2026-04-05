import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePrayerLocationStore } from '../store/prayerLocationStore';
import { fetchAndPersistPrayerLocation } from '../services/prayerLocationGps';

export type SimpleGeoCoords = { lat: number; lon: number };

export function useSimpleGeolocation() {
  const saved = usePrayerLocationStore(s => s.saved);
  const coords = saved ? { lat: saved.latitude, lon: saved.longitude } : null;

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(() =>
    usePrayerLocationStore.persist.hasHydrated(),
  );

  useEffect(() => {
    return usePrayerLocationStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLocationError(null);
    setPermissionDenied(false);
    const r = await fetchAndPersistPrayerLocation();
    if (r === 'permission_denied') {
      setPermissionDenied(true);
      return;
    }
    if (typeof r === 'object') {
      setLocationError(r.error);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!usePrayerLocationStore.getState().saved) {
      void refresh();
    }
  }, [hydrated, refresh]);

  const gateRef = useRef({
    coords: null as SimpleGeoCoords | null,
    permissionDenied: false,
    locationError: null as string | null,
  });
  gateRef.current = { coords, permissionDenied, locationError };

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const g = gateRef.current;
      if (!g.coords || g.permissionDenied || g.locationError) {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  return {
    coords,
    permissionDenied,
    locationError,
    refresh,
  };
}
