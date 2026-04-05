import { NativeModules, Platform } from 'react-native';

export type SazdaNotificationVariant = 'prayer' | 'reminder' | 'silent';

export type SazdaCustomNotificationParams = {
  id: string;
  channelId: string;
  meta: string;
  headline: string;
  body: string;
  variant: SazdaNotificationVariant;
};

type NativeModule =
  | {
      showPrayerStyleNotification: (p: SazdaCustomNotificationParams) => Promise<void>;
    }
  | undefined;

const native =
  typeof NativeModules !== 'undefined'
    ? (NativeModules.SazdaCustomNotification as NativeModule)
    : undefined;

/**
 * Shows the Stitch-style custom [RemoteViews] notification on Android.
 * Returns true if the native path ran; false on iOS or when the module is missing.
 */
export async function showAndroidCustomPrayerNotification(
  params: SazdaCustomNotificationParams,
): Promise<boolean> {
  if (Platform.OS !== 'android' || !native?.showPrayerStyleNotification) {
    return false;
  }
  await native.showPrayerStyleNotification(params);
  return true;
}
