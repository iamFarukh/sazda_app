/**
 * Android notification channel IDs — stable across app versions.
 *
 * RULE: Adhan/custom prayer audio lives ONLY on {@link ANDROID_CHANNEL_ADHAN_PREFIX} channels
 * (created dynamically in `prayerReminders.ts`). General & seasonal use default system sound.
 */

/** Prefix for dynamic per-sound adhan channels (`sazda2-adhan-…`). */
export const ANDROID_CHANNEL_ADHAN_PREFIX = 'sazda2-adhan' as const;

/** System default sound, normal importance — streak, Quran, welcome context, etc. */
export const ANDROID_CHANNEL_GENERAL_ID = 'sazda-default-general-v1';

/** System default sound — Ramadan suhoor/iftar/last nights (distinct label in system settings). */
export const ANDROID_CHANNEL_RAMADAN_ID = 'sazda-seasonal-ramadan-v1';
