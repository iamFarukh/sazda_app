import { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { TabLandingHeader } from '../../components/organisms/TabLandingHeader';
import { fetchAllSurahs } from '../../services/quranApi';
import type { MainTabParamList, ProfileStackParamList } from '../../navigation/types';
import { useNavigateMainTab } from '../../navigation/useNavigateMainTab';
import { useProfileStore } from '../../store/profileStore';
import { useQuranProgressStore } from '../../store/quranProgressStore';
import { useOfflineQuranDownloadStore } from '../../store/offlineQuranDownloadStore';
import { usePrayerStreak } from '../../hooks/usePrayerStreak';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';

dayjs.extend(relativeTime);

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const goTab = useNavigateMainTab();
  const { colors: c, scheme } = useThemePalette();

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
      void offlineBootstrap();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.headerPad}>
        <TabLandingHeader
          rightAccessory={
            <Pressable
              onPress={() => navigation.navigate('ProfileSettings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.settingsHit, pressed && { opacity: 0.7 }]}>
              <Settings size={22} color={c.primary} strokeWidth={2.25} />
            </Pressable>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: c.surfaceContainer }]}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
              ) : (
                <Text style={[styles.avatarLetter, { color: c.primary }]}>{initial}</Text>
              )}
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: c.secondaryContainer,
                  borderColor: c.surface,
                },
              ]}>
              <Text style={[styles.badgeText, { color: c.onSecondaryContainer }]}>Gold Member</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: c.primary }]}>{displayName}</Text>
          <Text style={[styles.tagline, { color: c.onSurfaceVariant }]}>{tagline}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: c.surfaceContainerLow }]}>
            <Text style={[styles.statNum, { color: c.primary }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: c.onSurfaceVariant }]}>Day Streak</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: c.primaryContainer }]}>
            <Text style={[styles.statNum, { color: c.secondaryContainer }]}>{surahsReadCount}</Text>
            <Text style={[styles.statLabelMuted, { color: c.onPrimary, opacity: 0.7 }]}>
              Surahs Read
            </Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: c.surfaceContainerLow }]}>
            <Text style={[styles.statNum, { color: c.primary }]}>{duasShared}</Text>
            <Text style={[styles.statLabel, { color: c.onSurfaceVariant }]}>Duas Shared</Text>
          </View>
        </View>

        {/* Offline Quran */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>Offline Quran</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('OfflineQuran')}
          style={({ pressed }) => [
            styles.activityCard,
            {
              backgroundColor: c.surfaceContainerLowest,
              shadowColor: c.primary,
            },
            pressed && { opacity: 0.95 },
          ]}>
          <View style={[styles.activityIcon, { backgroundColor: c.primary + '14' }]}>
            <HardDriveDownload size={22} color={c.primary} strokeWidth={2.25} />
          </View>
          <View style={styles.activityTextCol}>
            <Text style={[styles.activityTitle, { color: c.onSurface }]}>Manage offline library</Text>
            <Text style={[styles.activitySub, { color: c.onSurfaceVariant }]}>{offlineSubtitle}</Text>
          </View>
          <ChevronRight size={22} color={c.onSurfaceVariant} style={{ opacity: 0.35 }} />
        </Pressable>

        {/* Activity */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>My Activity</Text>
          <Pressable onPress={() => goTab('QuranTab')}>
            <Text style={[styles.sectionLink, { color: c.secondary }]}>View All</Text>
          </Pressable>
        </View>

        {topBookmark ? (
          <Pressable
            onPress={() => openQuranReader(topBookmark.surahNumber, topBookmark.ayahNumber)}
            style={({ pressed }) => [
              styles.activityCard,
              {
                backgroundColor: c.surfaceContainerLowest,
                shadowColor: c.primary,
              },
              pressed && { opacity: 0.95 },
            ]}>
            <View style={[styles.activityIcon, { backgroundColor: c.primary + '14' }]}>
              <Bookmark size={22} color={c.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.activityTextCol}>
              <Text style={[styles.activityTitle, { color: c.onSurface }]}>
                {surahName(topBookmark.surahNumber)} ({topBookmark.ayahNumber})
              </Text>
              <Text style={[styles.activitySub, { color: c.onSurfaceVariant }]}>
                Bookmarked {dayjs(topBookmark.createdAt).fromNow()}
              </Text>
            </View>
            <ChevronRight size={22} color={c.onSurfaceVariant} style={{ opacity: 0.35 }} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => goTab('QuranTab')}
            style={({ pressed }) => [
              styles.activityCard,
              {
                backgroundColor: c.surfaceContainerLowest,
                shadowColor: c.primary,
              },
              pressed && { opacity: 0.95 },
            ]}>
            <View style={[styles.activityIcon, { backgroundColor: c.primary + '14' }]}>
              <BookOpen size={22} color={c.primary} strokeWidth={2.25} />
            </View>
            <View style={styles.activityTextCol}>
              <Text style={[styles.activityTitle, { color: c.onSurface }]}>Open Quran</Text>
              <Text style={[styles.activitySub, { color: c.onSurfaceVariant }]}>
                Save a bookmark to see it here
              </Text>
            </View>
            <ChevronRight size={22} color={c.onSurfaceVariant} style={{ opacity: 0.35 }} />
          </Pressable>
        )}

        <Pressable
          onPress={() => goTab('ToolsTab', 'Tasbeeh')}
          style={({ pressed }) => [
            styles.activityCard,
            {
              backgroundColor: c.surfaceContainerLowest,
              shadowColor: c.primary,
            },
            pressed && { opacity: 0.95 },
          ]}>
          <View style={[styles.activityIcon, { backgroundColor: c.secondaryContainer + '33' }]}>
            <Sun size={22} color={c.secondary} strokeWidth={2.25} />
          </View>
          <View style={styles.activityTextCol}>
            <Text style={[styles.activityTitle, { color: c.onSurface }]}>Sunnah of Dhikr</Text>
            <Text style={[styles.activitySub, { color: c.onSurfaceVariant }]}>
              Open Tasbeeh in Tools
            </Text>
          </View>
          <ChevronRight size={22} color={c.onSurfaceVariant} style={{ opacity: 0.35 }} />
        </Pressable>

        {/* Achievements */}
        <Text style={[styles.sectionTitleSolo, { color: c.primary }]}>Achievements</Text>
        <View style={styles.achieveGrid}>
          <View style={[styles.achieveCard, { backgroundColor: c.surfaceContainerLow }]}>
            <View style={[styles.achieveIcon, { backgroundColor: c.surfaceContainerLowest }]}>
              <Moon size={28} color={c.secondary} strokeWidth={2} />
            </View>
            <Text style={[styles.achieveTitle, { color: c.onSurface }]}>Early Bird</Text>
            <Text style={[styles.achieveSub, { color: c.onSurfaceVariant }]}>
              Prayed Fajr 30 days in a row
            </Text>
          </View>
          <View style={[styles.achieveCard, { backgroundColor: c.surfaceContainerLow }]}>
            <View style={[styles.achieveIcon, { backgroundColor: c.surfaceContainerLowest }]}>
              <BookOpen size={28} color={c.primary} strokeWidth={2.25} />
            </View>
            <Text style={[styles.achieveTitle, { color: c.onSurface }]}>Quran Explorer</Text>
            <Text style={[styles.achieveSub, { color: c.onSurfaceVariant }]}>
              Read from {Math.min(surahsReadCount, 5) || 'several'} different Surahs
            </Text>
          </View>
        </View>

        {/* My Duas */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>My Duas</Text>
          <Pressable onPress={bumpDuasShared}>
            <Text style={[styles.sectionLink, { color: c.secondary }]}>Post New</Text>
          </Pressable>
        </View>
        <View style={[styles.duaCard, { backgroundColor: c.surfaceContainerHighest }]}>
          <Text style={[styles.quoteMark, { color: c.primary }]}>"</Text>
          <Text
            style={[
              styles.duaText,
              { color: scheme === 'dark' ? c.primary : c.primaryContainer },
            ]}>
            {featuredDua}
          </Text>
          <View style={styles.duaMeta}>
            <View style={styles.duaMetaItem}>
              <Heart size={14} color={c.onSurfaceVariant} />
              <Text style={[styles.duaMetaText, { color: c.onSurfaceVariant }]}>
                {12 + duasShared} Likes
              </Text>
            </View>
            <View style={styles.duaMetaItem}>
              <Share2 size={14} color={c.onSurfaceVariant} />
              <Text style={[styles.duaMetaText, { color: c.onSurfaceVariant }]}>
                {Math.max(1, duasShared)} Shares
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.x3xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg },
  settingsHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  avatarWrap: { marginBottom: spacing.md },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003527',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  avatarLetter: {
    fontFamily: fontFamilies.headline,
    fontSize: 48,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  name: {
    fontFamily: fontFamilies.headline,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statTile: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.65,
  },
  statLabelMuted: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.55,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitleSolo: {
    fontFamily: fontFamilies.headline,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionLink: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '800',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityTextCol: { flex: 1 },
  activityTitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: '700',
  },
  activitySub: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.65,
  },
  achieveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  achieveCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.sm,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  achieveIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  achieveTitle: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  achieveSub: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.65,
    lineHeight: 14,
  },
  duaCard: {
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  quoteMark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    fontSize: 72,
    fontFamily: fontFamilies.headline,
    opacity: 0.08,
  },
  duaText: {
    fontFamily: fontFamilies.body,
    fontSize: 17,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
    zIndex: 1,
  },
  duaMeta: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
    zIndex: 1,
  },
  duaMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  duaMetaText: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.55,
  },
});
