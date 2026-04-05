import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import CompassHeading from 'react-native-compass-heading';

/**
 * Streams device heading (° from magnetic north, adjusted for UI orientation) while the screen is focused.
 */
export function useCompassHeadingWhileFocused(updateRate = 5) {
  const [heading, setHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setCompassError(false);
      setHeading(null);

      (async () => {
        try {
          await CompassHeading.start(updateRate, (data: { heading: number; accuracy: number }) => {
            if (!cancelled) setHeading(data.heading);
          });
        } catch {
          if (!cancelled) {
            setCompassError(true);
            setHeading(null);
          }
        }
      })();

      return () => {
        cancelled = true;
        CompassHeading.stop().catch(() => {
          /* native stop may reject if sensor already off */
        });
      };
    }, [updateRate]),
  );

  return { heading, compassError };
}
