import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Bookmark,
  ChevronRight,
  Heart,
  Moon,
  Settings,
  Share2,
  Sun,
  BookOpen,
  HardDriveDownload,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { fetchAllSurahs } from '../../services/quranApi';
import type { MainTabParamList, ProfileStackParamList } from '../../navigation/types';
import { useNavigateMainTab } from '../../navigation/useNavigateMainTab';
import { useProfileStore } from '../../store/profileStore';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { useOfflineQuranDownloadStore } from '../../store/offlineQuranDownloadStore';
import { usePrayerStreak } from '../../hooks/usePrayerStreak';
import type { AppPalette, ResolvedScheme } from '../../theme/useThemePalette';
import { useThemePalette } from '../../theme/useThemePalette';
import { elevation } from '../../theme/elevation';
import { motionDurations, motionEasing } from '../../theme/motion';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { hapticLight, hapticMedium } from '../../utils/appHaptics';

dayjs.extend(relativeTime);

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

type Styles = ReturnType<typeof createStyles>;

/** Staggered section entrance — calm FadeInDown, skipped entirely under Reduce Motion. */
function Section({
  index,
  reduced,
  children,
}: {
  index: number;
  reduced: boolean;
  children: ReactNode;
}) {
  if (reduced) {
    return <View>{children}</View>;
  }
  return (
    <Animated.View
      entering={FadeInDown.duration(motionDurations.slow)
        .delay(index * 50)
        .easing(motionEasing.standardOut)}>
      {children}
    </Animated.View>
  );
}

/** One tappable activity/link row: icon chip + title/subtitle + chevron. */
function ActivityRow({
  styles,
  icon,
  iconVariant = 'primary',
  title,
  subtitle,
  accessibilityLabel,
  onPress,
}: {
  styles: Styles;
  icon: ReactNode;
  iconVariant?: 'primary' | 'secondary';
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors: c } = useThemePalette();
  return (
    <PressableScale
      to={0.98}
      pressedOpacity={0.92}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.activityCard}>
      <View
        style={[
          styles.activityIcon,
          iconVariant === 'secondary' ? styles.activityIconSec : null,
        ]}>
        {icon}
      </View>
      <View style={styles.activityTextCol}>
        <SazdaText variant="titleLarge" color="onSurface" numberOfLines={1}>
          {title}
        </SazdaText>
        <SazdaText
          variant="caption"
          color="onSurfaceVariant"
          numberOfLines={2}
          style={styles.activitySub}>
          {subtitle}
        </SazdaText>
      </View>
      <ChevronRight size={20} color={c.onSurfaceVariant} style={styles.chevron} />
    </PressableScale>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const goTab = useNavigateMainTab();
  const { colors: c, scheme } = useThemePalette();
  const reduceMotion = useReduceMotion();
  const styles = useMemo(() => createStyles(c, scheme), [c, scheme]);

  const displayName = useProfileStore(s => s.displayName);
  const photoURL = useProfileStore(s => s.photoURL);
  const tagline = useProfileStore(s => s.tagline);
  const duasShared = useProfileStore(s => s.duasShared);
  const featuredDua = useProfileStore(s => s.featuredDua);
  const bumpDuasShared = useProfileStore(s => s.bumpDuasShared);

  const bookmarks = useQuranProgressStore(s => s.bookmarks);
  const recentSurahs = useQuranProgressStore(s => s.recentSurahs);
  const streak = usePrayerStreak();

  const offlineBootstrap = useOfflineQuranDownloadStore(s => s.bootstrap);
  const offlineJob = useOfflineQuranDownloadStore(s => s.job);
  const offlineProgress = useOfflineQuranDownloadStore(s => s.progress01);
  const offlineStorage = useOfflineQuranDownloadStore(s => s.storageBytes);
  const offlineQueueLen = useOfflineQuranDownloadStore(s => s.queue.length);

  useFocusEffect(
    useCallback(() => {
      offlineBootstrap().catch(() => {
        /* retried on next focus */
      });
    }, [offlineBootstrap]),
  );

  const { data: surahs } = useQuery({
    queryKey: ['quran', 'surahs'],
    queryFn: fetchAllSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const surahName = useMemo(() => {
    const m = new Map<number, string>();
    surahs?.forEach(s => m.set(s.number, s.englishName));
    return (n: number) => m.get(n) ?? `Surah ${n}`;
  }, [surahs]);

  const topBookmark = bookmarks[0];
  const surahsReadCount = useMemo(() => new Set(recentSurahs).size, [recentSurahs]);

  const offlineSubtitle = useMemo(() => {
    if (offlineJob === 'running') {
      return `${Math.round(Math.min(1, offlineProgress) * 100)}% · tap for details`;
    }
    if (offlineJob === 'completed') {
      const mb = offlineStorage / (1024 * 1024);
      return mb >= 0.1 ? `${mb.toFixed(0)} MB saved · read anywhere` : 'Ready offline';
    }
    if (offlineJob === 'paused') {
      return 'Paused — tap to resume';
    }
    if (offlineJob === 'error') {
      return 'Needs attention — tap to retry';
    }
    if (offlineQueueLen > 0) {
      return `${offlineQueueLen} in queue · pick surahs in Offline Sanctuary`;
    }
    return 'Pick surahs to save offline (Arabic, English & audio)';
  }, [offlineJob, offlineProgress, offlineQueueLen, offlineStorage]);

  const openQuranReader = (surahNumber: number, ayahNumber: number) => {
    const tabNav = navigation.getParent() as NavigationProp<MainTabParamList> | undefined;
    tabNav?.navigate('QuranTab', {
      screen: 'SurahReader',
      params: { surahNumber, ayahNumber },
    });
  };

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  const bookmarkNamesLoading = Boolean(topBookmark) && !surahs;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerPad}>
        <TabLandingHeader
          rightAccessory={
            <Pressable
              onPress={() => {
                hapticLight();
                navigation.navigate('ProfileSettings');
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.settingsHit, pressed && styles.pressedDim]}>
              <Settings size={22} color={c.primary} strokeWidth={2.25} />
            </Pressable>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Hero — identity block */}
        <Section index={0} reduced={reduceMotion}>
          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {photoURL ? (
                  <Image
                    source={{ uri: photoURL }}
                    style={styles.avatarImage}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <SazdaText variant="displayLg" color="primary" style={styles.avatarLetter}>
                    {initial}
                  </SazdaText>
                )}
              </View>
              <View style={styles.badge}>
                <SazdaText
                  variant="label"
                  color="onSecondaryContainer"
                  style={styles.badgeText}>
                  Gold Member
                </SazdaText>
              </View>
            </View>
            <SazdaText variant="headlineLarge" color="primary" align="center" style={styles.name}>
              {displayName}
            </SazdaText>
            <SazdaText
              variant="bodySmall"
              color="onSurfaceVariant"
              align="center"
              style={styles.tagline}>
              {tagline}
            </SazdaText>
          </View>
        </Section>

        {/* Stats */}
        <Section index={1} reduced={reduceMotion}>
          <View style={styles.statsRow}>
            <View style={styles.statTile} accessible accessibilityLabel={`${streak} day streak`}>
              <SazdaText variant="headlineMedium" color="primary">
                {streak}
              </SazdaText>
              <SazdaText
                variant="label"
                color="onSurfaceVariant"
                align="center"
                style={styles.statLabel}>
                Day Streak
              </SazdaText>
            </View>
            <View
              style={[styles.statTile, styles.statTileAccent]}
              accessible
              accessibilityLabel={`${surahsReadCount} surahs read`}>
              <SazdaText variant="headlineMedium" color="secondaryContainer">
                {surahsReadCount}
              </SazdaText>
              <SazdaText
                variant="label"
                color="onPrimary"
                align="center"
                style={styles.statLabelOnAccent}>
                Surahs Read
              </SazdaText>
            </View>
            <View style={styles.statTile} accessible accessibilityLabel={`${duasShared} duas shared`}>
              <SazdaText variant="headlineMedium" color="primary">
                {duasShared}
              </SazdaText>
              <SazdaText
                variant="label"
                color="onSurfaceVariant"
                align="center"
                style={styles.statLabel}>
                Duas Shared
              </SazdaText>
            </View>
          </View>
        </Section>

        {/* Offline Quran */}
        <Section index={2} reduced={reduceMotion}>
          <View style={styles.sectionHead}>
            <SazdaText variant="headlineMedium" color="primary">
              Offline Quran
            </SazdaText>
          </View>
          <ActivityRow
            styles={styles}
            icon={<HardDriveDownload size={22} color={c.primary} strokeWidth={2.25} />}
            title="Manage offline library"
            subtitle={offlineSubtitle}
            accessibilityLabel={`Manage offline library. ${offlineSubtitle}`}
            onPress={() => navigation.navigate('OfflineQuran')}
          />
        </Section>

        {/* Activity */}
        <Section index={3} reduced={reduceMotion}>
          <View style={styles.sectionHead}>
            <SazdaText variant="headlineMedium" color="primary">
              My Activity
            </SazdaText>
            <PressableScale
              onPress={() => {
                hapticLight();
                goTab('QuranTab');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View all activity in the Quran tab"
              style={styles.sectionLinkHit}>
              <SazdaText variant="label" color="secondary">
                View All
              </SazdaText>
            </PressableScale>
          </View>

          <View style={styles.rowsGroup}>
            {bookmarkNamesLoading ? (
              <View style={styles.activityCard}>
                <Skeleton width={48} height={48} circle style={styles.skeletonIconGap} />
                <View style={styles.activityTextCol}>
                  <Skeleton width="58%" height={15} radius={6} />
                  <Skeleton width="40%" height={11} radius={6} style={styles.skeletonLineGap} />
                </View>
              </View>
            ) : topBookmark ? (
              <ActivityRow
                styles={styles}
                icon={<Bookmark size={22} color={c.primary} strokeWidth={2.25} />}
                title={`${surahName(topBookmark.surahNumber)} (${topBookmark.ayahNumber})`}
                subtitle={`Bookmarked ${dayjs(topBookmark.createdAt).fromNow()}`}
                accessibilityLabel={`Open bookmark: ${surahName(topBookmark.surahNumber)}, ayah ${topBookmark.ayahNumber}`}
                onPress={() => openQuranReader(topBookmark.surahNumber, topBookmark.ayahNumber)}
              />
            ) : (
              <ActivityRow
                styles={styles}
                icon={<BookOpen size={22} color={c.primary} strokeWidth={2.25} />}
                title="Open Quran"
                subtitle="Save a bookmark to see it here"
                accessibilityLabel="Open Quran. Save a bookmark to see it here"
                onPress={() => goTab('QuranTab')}
              />
            )}

            <ActivityRow
              styles={styles}
              icon={<Sun size={22} color={c.secondary} strokeWidth={2.25} />}
              iconVariant="secondary"
              title="Sunnah of Dhikr"
              subtitle="Open Tasbeeh in Tools"
              accessibilityLabel="Sunnah of Dhikr. Open Tasbeeh in Tools"
              onPress={() => goTab('ToolsTab', 'Tasbeeh')}
            />
          </View>
        </Section>

        {/* Achievements */}
        <Section index={4} reduced={reduceMotion}>
          <View style={styles.sectionHead}>
            <SazdaText variant="headlineMedium" color="primary">
              Achievements
            </SazdaText>
          </View>
          <View style={styles.achieveGrid}>
            <View
              style={styles.achieveCard}
              accessible
              accessibilityLabel="Achievement: Early Bird. Prayed Fajr 30 days in a row">
              <View style={styles.achieveIcon}>
                <Moon size={28} color={c.secondary} strokeWidth={2} />
              </View>
              <SazdaText variant="titleSm" color="onSurface" align="center">
                Early Bird
              </SazdaText>
              <SazdaText
                variant="caption"
                color="onSurfaceVariant"
                align="center"
                style={styles.achieveSub}>
                Prayed Fajr 30 days in a row
              </SazdaText>
            </View>
            <View
              style={styles.achieveCard}
              accessible
              accessibilityLabel="Achievement: Quran Explorer">
              <View style={styles.achieveIcon}>
                <BookOpen size={28} color={c.primary} strokeWidth={2.25} />
              </View>
              <SazdaText variant="titleSm" color="onSurface" align="center">
                Quran Explorer
              </SazdaText>
              <SazdaText
                variant="caption"
                color="onSurfaceVariant"
                align="center"
                style={styles.achieveSub}>
                Read from {Math.min(surahsReadCount, 5) || 'several'} different Surahs
              </SazdaText>
            </View>
          </View>
        </Section>

        {/* My Duas */}
        <Section index={5} reduced={reduceMotion}>
          <View style={styles.sectionHead}>
            <SazdaText variant="headlineMedium" color="primary">
              My Duas
            </SazdaText>
            <PressableScale
              onPress={() => {
                hapticMedium();
                bumpDuasShared();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Post a new dua"
              style={styles.sectionLinkHit}>
              <SazdaText variant="label" color="secondary">
                Post New
              </SazdaText>
            </PressableScale>
          </View>
          <View style={styles.duaCard}>
            <View
              style={styles.quoteMarkWrap}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <SazdaText variant="displayLg" color="primary" style={styles.quoteMark}>
                "
              </SazdaText>
            </View>
            <SazdaText
              variant="bodyMedium"
              color={scheme === 'dark' ? 'primary' : 'primaryContainer'}
              align="center"
              style={styles.duaText}>
              {featuredDua}
            </SazdaText>
            <View style={styles.duaMeta}>
              <View style={styles.duaMetaItem}>
                <Heart size={14} color={c.onSurfaceVariant} />
                <SazdaText variant="label" color="onSurfaceVariant" style={styles.duaMetaText}>
                  {12 + duasShared} Likes
                </SazdaText>
              </View>
              <View style={styles.duaMetaItem}>
                <Share2 size={14} color={c.onSurfaceVariant} />
                <SazdaText variant="label" color="onSurfaceVariant" style={styles.duaMetaText}>
                  {Math.max(1, duasShared)} Shares
                </SazdaText>
              </View>
            </View>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: AppPalette, scheme: ResolvedScheme) {
  const hairline = scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0,53,39,0.08)';
  const primaryTint = scheme === 'dark' ? 'rgba(142,207,178,0.14)' : 'rgba(6,78,59,0.08)';
  const secondaryTint = scheme === 'dark' ? 'rgba(233,200,74,0.16)' : 'rgba(254,214,91,0.35)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    headerPad: { paddingHorizontal: spacing.lg },
    settingsHit: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressedDim: { opacity: 0.7 },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.x3xl,
      gap: spacing.lg,
    },
    hero: { alignItems: 'center', paddingTop: spacing.xs },
    avatarWrap: { marginBottom: spacing.md },
    avatar: {
      width: 116,
      height: 116,
      borderRadius: radius.md + 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceContainer,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      overflow: 'hidden',
      ...elevation('lg', scheme),
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarLetter: { fontSize: 44, lineHeight: 52 },
    badge: {
      position: 'absolute',
      right: -6,
      bottom: -4,
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: spacing.xxs,
      borderRadius: radius.full,
      borderWidth: 2,
      backgroundColor: c.secondaryContainer,
      borderColor: c.surface,
      ...elevation('sm', scheme),
    },
    badgeText: { fontSize: 9, letterSpacing: 1.1 },
    name: { fontSize: 28, lineHeight: 34 },
    tagline: { marginTop: spacing.xxs, opacity: 0.85 },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statTile: {
      flex: 1,
      borderRadius: radius.md - 6,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      gap: spacing.xxs,
      backgroundColor: c.surfaceContainerLow,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      ...elevation('sm', scheme),
    },
    statTileAccent: {
      backgroundColor: c.primaryContainer,
      borderColor: 'transparent',
      ...elevation('md', scheme),
    },
    statLabel: { fontSize: 9, letterSpacing: 0.8, opacity: 0.7 },
    statLabelOnAccent: { fontSize: 9, letterSpacing: 0.8, opacity: 0.75 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionLinkHit: {
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xxs,
    },
    rowsGroup: { gap: spacing.sm },
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md - 4,
      backgroundColor: c.surfaceContainerLowest,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      ...elevation('sm', scheme),
    },
    activityIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    activityIconSec: { backgroundColor: secondaryTint },
    activityTextCol: { flex: 1, minWidth: 0 },
    activitySub: { marginTop: 2, opacity: 0.75 },
    chevron: { opacity: 0.4, marginLeft: spacing.xs },
    skeletonIconGap: { marginRight: spacing.md },
    skeletonLineGap: { marginTop: spacing.xs },
    achieveGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    achieveCard: {
      flex: 1,
      borderRadius: radius.md - 4,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surfaceContainerLow,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
      ...elevation('sm', scheme),
    },
    achieveIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation('sm', scheme),
    },
    achieveSub: { fontSize: 11, lineHeight: 15, opacity: 0.7 },
    duaCard: {
      borderRadius: radius.md,
      padding: spacing.xl,
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: c.surfaceContainerHighest,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hairline,
    },
    quoteMarkWrap: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.md,
    },
    quoteMark: { fontSize: 72, lineHeight: 76, opacity: 0.08 },
    duaText: {
      fontStyle: 'italic',
      fontSize: 17,
      lineHeight: 26,
      zIndex: 1,
    },
    duaMeta: {
      flexDirection: 'row',
      gap: spacing.xl,
      marginTop: spacing.lg,
      zIndex: 1,
    },
    duaMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
    duaMetaText: { opacity: 0.6 },
  });
}
