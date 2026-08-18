/**
 * Android notification channel IDs — stable across app versions.
 *
 * RULE: Bundled/custom Adhan audio uses {@link ANDROID_CHANNEL_ADHAN_PREFIX} channels.
 * System-default prayer alerts use {@link ANDROID_CHANNEL_PRAYER_SYSTEM_PREFIX}.
 * General & seasonal reminders use default system sound on their own channels.
 */

/** Prefix for dynamic per-sound adhan channels (`sazda2-adhan-…`). */
export const ANDROID_CHANNEL_ADHAN_PREFIX = 'sazda2-adhan' as const;

/** Prayer alerts with system default sound — high importance (`sazda2-prayer-system-…`). */
export const ANDROID_CHANNEL_PRAYER_SYSTEM_PREFIX = 'sazda2-prayer-system' as const;

/** System default sound, normal importance — streak, Quran, welcome context, etc. */
export const ANDROID_CHANNEL_GENERAL_ID = 'sazda-default-general-v1';

/** System default sound — Ramadan suhoor/iftar/last nights (distinct label in system settings). */
export const ANDROID_CHANNEL_RAMADAN_ID = 'sazda-seasonal-ramadan-v1';
