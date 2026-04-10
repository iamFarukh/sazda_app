import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  SignIn: undefined;
  SignInSuccess: { displayName: string };
};

export type HomeStackParamList = {
  HomeMain: undefined;
};

export type QuranStackParamList = {
  QuranHome: undefined;
  SurahList:
    | {
        initialTab?: 'surah' | 'juz' | 'bookmarks';
        initialQuery?: string;
      }
    | undefined;
  SurahReader: { surahNumber: number; ayahNumber?: number };
  /** Madinah Mushaf page mode (604 pages). */
  MushafReader: { initialPage?: number; surahNumber?: number; ayahNumber?: number } | undefined;
  Tafsir: { surahNumber: number; ayahNumber: number };
};

export type ToolsStackParamList = {
  ToolsMain: undefined;
  Qibla: undefined;
  QiblaAR: undefined;
  Tasbeeh: undefined;
  /** Zakat hub — cycles, progress, links to calculator & payments. */
  ZakatHome: undefined;
  ZakatCalculator: undefined;
  ZakatAddPayment: { cycleId?: string } | undefined;
  ZakatPaymentHistory: { cycleId?: string } | undefined;
  ZakatInsights: { cycleId?: string } | undefined;
  ZakatCycleManage: undefined;
  PrayerTracker: undefined;
  DailyDuas: undefined;
  HijriCalendar: undefined;
};

export type QiblaStackParamList = {
  QiblaMain: undefined;
  QiblaAR: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileSettings: undefined;
  /** Streak, Quran, Ramadan — system default sound only (never Adhan). */
  NotificationPreferences: undefined;
  AdhanSettings: undefined;
  SoundSelection: { prayer: string };
  CustomSoundUpload: undefined;
  OfflineQuran: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  QuranTab: NavigatorScreenParams<QuranStackParamList>;
  ToolsTab: NavigatorScreenParams<ToolsStackParamList>;
  QiblaTab: NavigatorScreenParams<QiblaStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type MainDrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};
