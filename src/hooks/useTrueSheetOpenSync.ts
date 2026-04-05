import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';

/**
 * Present / dismiss a TrueSheet from boolean state, and avoid double-dismiss when the user
 * swipes away (same pattern as LocationSettingsSheet).
 */
export function useTrueSheetOpenSync(
  sheetRef: RefObject<TrueSheet | null>,
  open: boolean,
  onDismiss: () => void,
): () => void {
  const prevOpen = useRef(open);
  const dismissedByNativeRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (open) {
      dismissedByNativeRef.current = false;
      void sheet.present();
    } else if (prevOpen.current) {
      if (dismissedByNativeRef.current) {
        dismissedByNativeRef.current = false;
      } else {
        void sheet.dismiss();
      }
    }
    prevOpen.current = open;
  }, [open, sheetRef]);

  return useCallback(() => {
    dismissedByNativeRef.current = true;
    onDismissRef.current();
  }, []);
}
