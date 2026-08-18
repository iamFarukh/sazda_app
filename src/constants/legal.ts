/**
 * Legal / policy links shown in the app (Sign-In screen + Settings) and required by
 * the Google Play listing.
 *
 * IMPORTANT: Publish the actual Privacy Policy and Terms content at these public HTTPS
 * URLs before submitting to Play. The Privacy Policy must cover: location, Google
 * account data, Firestore sync, Crashlytics, and third-party APIs (Aladhan, AlQuran.cloud),
 * and the in-app account-deletion path. Update the constants here if you host elsewhere.
 */
export const PRIVACY_POLICY_URL = 'https://sazda.app/privacy-policy';
export const TERMS_OF_SERVICE_URL = 'https://sazda.app/terms-of-service';

/** Publicly visible support contact (also used in the Play Console listing). */
export const SUPPORT_EMAIL = 'support@sazda.app';

/** Quran text, translation and tafsir data sources — credited in the app (attribution). */
export const DATA_SOURCES = [
  'Prayer times: Aladhan API (aladhan.com)',
  'Quran text, translation & tafsir: AlQuran.cloud',
] as const;
