import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle } from 'react-native-svg';
import {
  CheckCircle2,
  ChevronLeft,
  CloudDownload,
  Database,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react-native';
import type { ProfileStackParamList } from '../../navigation/types';
import {
  ESTIMATED_FULL_OFFLINE_BYTES,
  OFFLINE_QURAN_VERSION,
  estimateSurahOfflineBytes,
} from '../../services/offlineQuran/constants';
import { getOfflineQuranHealth } from '../../services/offlineQuran/reader';
import { isSurahFullyOffline, readManifest } from '../../services/offlineQuran/manifest';
import { fetchAllSurahs, type QuranApiSurah } from '../../services/quranApi';
import { useOfflineQuranDownloadStore } from '../../store/offlineQuranDownloadStore';
import { useThemePalette } from '../../theme/useThemePalette';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { fontFamilies } from '../../theme/typography';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'OfflineQuran'>;

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 MB';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Row =
  | { kind: 'section'; key: string; title: string; badge: string; pulse?: boolean }
  | { kind: 'active'; key: string; surah: QuranApiSurah; progress01: number }
  | { kind: 'queued'; key: string; surah: QuranApiSurah }
  | { kind: 'completed'; key: string; surah: QuranApiSurah; sizeLabel: string }
  | { kind: 'pending'; key: string; surah: QuranApiSurah; estLabel: string };

function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const dash = c * p;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function OfflineQuranManagerScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c } = useThemePalette();
  const qc = useQueryClient();

  const queue = useOfflineQuranDownloadStore(s => s.queue);
  const job = useOfflineQuranDownloadStore(s => s.job);
  const runnerBusy = useOfflineQuranDownloadStore(s => s.runnerBusy);
  const progress01 = useOfflineQuranDownloadStore(s => s.progress01);
  const activeSurahProgress01 = useOfflineQuranDownloadStore(s => s.activeSurahProgress01);
  const storageBytes = useOfflineQuranDownloadStore(s => s.storageBytes);
  const statusLine = useOfflineQuranDownloadStore(s => s.statusLine);
  const lastError = useOfflineQuranDownloadStore(s => s.lastError);
  const surahsCompleted = useOfflineQuranDownloadStore(s => s.surahsCompleted);

  const bootstrap = useOfflineQuranDownloadStore(s => s.bootstrap);
  const enqueueSurah = useOfflineQuranDownloadStore(s => s.enqueueSurah);
  const removeQueuedSurah = useOfflineQuranDownloadStore(s => s.removeQueuedSurah);
  const cancelActiveSurah = useOfflineQuranDownloadStore(s => s.cancelActiveSurah);
  const pauseDownload = useOfflineQuranDownloadStore(s => s.pauseDownload);
  const resumeDownload = useOfflineQuranDownloadStore(s => s.resumeDownload);
  const downloadAllMissingSurahs = useOfflineQuranDownloadStore(s => s.downloadAllMissingSurahs);
  const deleteAllData = useOfflineQuranDownloadStore(s => s.deleteAllData);
  const retryAfterError = useOfflineQuranDownloadStore(s => s.retryAfterError);
  const refreshStorage = useOfflineQuranDownloadStore(s => s.refreshStorage);

  const { data: manifest, refetch: refetchManifest } = useQuery({
    queryKey: ['offlineQuran', 'manifest'],
    queryFn: readManifest,
    staleTime: 3_000,
  });

  const { data: surahList } = useQuery({
    queryKey: ['quran', 'surahs'],
    queryFn: fetchAllSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const byNum = useMemo(() => {
    const m = new Map<number, QuranApiSurah>();
    surahList?.forEach(s => m.set(s.number, s));
    return m;
  }, [surahList]);

  useFocusEffect(
    useCallback(() => {
      void bootstrap();
      void refreshStorage();
      void refetchManifest();
    }, [bootstrap, refreshStorage, refetchManifest]),
  );

  useEffect(() => {
    if (job === 'completed' || job === 'idle') {
      void refetchManifest();
      void qc.invalidateQueries({ queryKey: ['quran', 'reader'] });
    }
  }, [job, qc, refetchManifest]);

  const globalPctSurahs = Math.round(Math.min(1, Math.max(0, progress01)) * 100);
  const bytesProgress = Math.min(1, storageBytes / ESTIMATED_FULL_OFFLINE_BYTES);
  const ringProgress = Math.max(bytesProgress, surahsCompleted > 0 ? progress01 : 0);
  const canResume =
    queue.length > 0 &&
    !runnerBusy &&
    (job === 'paused' || job === 'error' || job === 'idle');

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const head = queue[0];
    const tail = queue.slice(1);

    const active =
      job === 'running' && head !== undefined
        ? byNum.get(head)
        : job === 'paused' && head !== undefined
          ? byNum.get(head)
          : undefined;

    if (active) {
      out.push({
        kind: 'section',
        key: 'h-downloading',
        title: 'Downloading',
        badge: '1 active',
        pulse: job === 'running',
      });
      out.push({
        kind: 'active',
        key: `a-${head}`,
        surah: active,
        progress01: activeSurahProgress01,
      });
    }

    if (tail.length > 0) {
      out.push({
        kind: 'section',
        key: 'h-queued',
        title: 'Queued',
        badge: `${tail.length} surah${tail.length === 1 ? '' : 's'}`,
      });
      tail.forEach(n => {
        const s = byNum.get(n);
        if (s) out.push({ kind: 'queued', key: `q-${n}`, surah: s });
      });
    }

    const completedNums: number[] = [];
    const pendingNums: number[] = [];
    for (let n = 1; n <= 114; n++) {
      const done = isSurahFullyOffline(manifest ?? null, n);
      if (done) completedNums.push(n);
      else if (!queue.includes(n)) pendingNums.push(n);
    }

    if (completedNums.length > 0) {
      out.push({
        kind: 'section',
        key: 'h-done',
        title: 'Completed',
        badge: `${completedNums.length} surahs`,
      });
      completedNums.forEach(n => {
        const s = byNum.get(n);
        if (s) {
          const est = estimateSurahOfflineBytes(s.numberOfAyahs);
          out.push({
            kind: 'completed',
            key: `c-${n}`,
            surah: s,
            sizeLabel: `~${formatBytes(est)} · Audio & translation`,
          });
        }
      });
    }

    if (pendingNums.length > 0) {
      out.push({
        kind: 'section',
        key: 'h-pending',
        title: 'Not downloaded',
        badge: `${pendingNums.length} surahs`,
      });
      pendingNums.forEach(n => {
        const s = byNum.get(n);
        if (s) {
          const est = estimateSurahOfflineBytes(s.numberOfAyahs);
          out.push({
            kind: 'pending',
            key: `p-${n}`,
            surah: s,
            estLabel: `Estimated ~${formatBytes(est)}`,
          });
        }
      });
    }

    return out;
  }, [
    byNum,
    manifest,
    queue,
    job,
    activeSurahProgress01,
  ]);

  const confirmDelete = () => {
    if (runnerBusy || job === 'running') {
      AppAlert.show('Download active', 'Pause the download, then try deleting again.', undefined, { variant: 'info' });
      return;
    }
    AppAlert.show(
      'Delete offline Quran?',
      'Removes every downloaded surah (text, translation, audio URLs) and metadata from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void deleteAllData().then(() => {
              void refetchManifest();
              void qc.invalidateQueries({ queryKey: ['quran', 'reader'] });
            }),
        },
      ],
      { variant: 'destructive' }
    );
  };

  const onQueueAllMissing = () => {
    void (async () => {
      const health = await getOfflineQuranHealth();
      if (health.needsUpdate) {
        AppAlert.show(
          'Update required',
          'Your saved copy uses an older format. This clears old files. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () =>
                void deleteAllData().then(() => {
                  void downloadAllMissingSurahs();
                  void refetchManifest();
                  void qc.invalidateQueries({ queryKey: ['quran', 'reader'] });
                }),
            },
          ],
          { variant: 'confirmation' }
        );
        return;
      }
      void downloadAllMissingSurahs();
    })();
  };

  const renderItem: ListRenderItem<Row> = ({ item }) => {
    if (item.kind === 'section') {
      return (
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            {item.pulse ? (
              <View style={[styles.pulseDot, { backgroundColor: c.secondary }]} />
            ) : (
              <View style={{ width: 8 }} />
            )}
            <Text style={[styles.sectionTitle, { color: c.primary }]}>{item.title}</Text>
          </View>
          <Text style={[styles.sectionBadge, { color: c.secondary }]}>{item.badge}</Text>
        </View>
      );
    }

    if (item.kind === 'active') {
      const pct = Math.round(Math.min(1, Math.max(0, item.progress01)) * 100);
      return (
        <View style={[styles.activeCard, { backgroundColor: c.primaryContainer }]}>
          <View style={[styles.numBox, { backgroundColor: c.primary }]}>
            <Text style={[styles.numText, { color: c.onPrimary }]}>{item.surah.number}</Text>
          </View>
          <View style={styles.cardMid}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.surahName, { color: c.onPrimary }]} numberOfLines={1}>
                {item.surah.englishName}
              </Text>
              <Text style={[styles.pctSmall, { color: c.secondaryContainer }]}>{pct}%</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: c.onPrimary }]} />
            </View>
          </View>
          <Pressable
            onPress={cancelActiveSurah}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtnSm, pressed && { opacity: 0.7 }]}>
            <X size={22} color={c.onPrimary} strokeWidth={2.25} />
          </Pressable>
        </View>
      );
    }

    if (item.kind === 'queued') {
      return (
        <View style={[styles.doneCard, { backgroundColor: c.surfaceContainerLow }]}>
          <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerHighest }]}>
            <Text style={[styles.numText, { color: c.onSurfaceVariant }]}>{item.surah.number}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={[styles.surahNameMuted, { color: c.onSurface }]} numberOfLines={1}>
              {item.surah.englishName}
            </Text>
            <Text style={[styles.subMuted, { color: c.onSurfaceVariant }]}>Waiting in queue</Text>
          </View>
          <Pressable
            onPress={() => removeQueuedSurah(item.surah.number)}
            hitSlop={12}
            style={({ pressed }) => [styles.iconBtnSm, pressed && { opacity: 0.7 }]}>
            <X size={20} color={c.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        </View>
      );
    }

    if (item.kind === 'completed') {
      return (
        <View
          style={[
            styles.doneCard,
            {
              backgroundColor: c.surfaceContainerLowest,
              borderColor: 'rgba(0,53,39,0.08)',
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerLow }]}>
            <Text style={[styles.numText, { color: c.primary }]}>{item.surah.number}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={[styles.surahNameMuted, { color: c.primary }]} numberOfLines={1}>
              {item.surah.englishName}
            </Text>
            <Text style={[styles.subMuted, { color: c.onSurfaceVariant }]}>{item.sizeLabel}</Text>
          </View>
          <CheckCircle2 size={24} color={c.primaryContainer} strokeWidth={2.25} />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.pendingCard,
          {
            borderColor: c.outlineVariant,
            backgroundColor: c.surfaceContainerLow + '99',
          },
        ]}>
        <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerHighest }]}>
          <Text style={[styles.numText, { color: c.onSurfaceVariant }]}>{item.surah.number}</Text>
        </View>
        <View style={styles.cardMid}>
          <Text style={[styles.surahNameFaint, { color: c.primary }]} numberOfLines={1}>
            {item.surah.englishName}
          </Text>
          <Text style={[styles.subFaint, { color: c.onSurfaceVariant }]}>{item.estLabel}</Text>
        </View>
        <Pressable
          onPress={() => enqueueSurah(item.surah.number)}
          hitSlop={12}
          style={({ pressed }) => [styles.iconBtnSm, pressed && { opacity: 0.7 }]}>
          <CloudDownload size={22} color={c.primary} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={[styles.heroCard, { backgroundColor: c.surfaceContainerLowest }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Text style={[styles.globalLabel, { color: c.onSurfaceVariant }]}>Global progress</Text>
            <Text style={[styles.globalPct, { color: c.primary }]}>
              {globalPctSurahs}%{' '}
              <Text style={[styles.globalPctSoft, { color: c.secondary }]}>saved</Text>
            </Text>
            <View style={styles.storageRow}>
              <Database size={14} color={c.onSurfaceVariant} strokeWidth={2} />
              <Text style={[styles.storageText, { color: c.onSurfaceVariant }]}>
                {formatBytes(storageBytes)} / {formatBytes(ESTIMATED_FULL_OFFLINE_BYTES)}
              </Text>
            </View>
          </View>
          <View style={styles.ringWrap}>
            <ProgressRing
              size={96}
              strokeWidth={6}
              progress={ringProgress}
              color={c.primary}
              trackColor={c.surfaceContainerHighest}
            />
            <View style={styles.ringIcon}>
              <CloudDownload size={28} color={c.primary} strokeWidth={2} />
            </View>
          </View>
        </View>

        {lastError ? (
          <Text style={[styles.errorBanner, { color: c.error }]}>{lastError}</Text>
        ) : (
          <Text style={[styles.statusHint, { color: c.onSurfaceVariant }]}>{statusLine}</Text>
        )}

        <View style={styles.dualActions}>
          <Pressable
            onPress={pauseDownload}
            disabled={job !== 'running'}
            style={({ pressed }) => [
              styles.pauseBtn,
              { backgroundColor: c.primaryContainer },
              (pressed && job === 'running') && { opacity: 0.9 },
              job !== 'running' && { opacity: 0.45 },
            ]}>
            <Pause size={20} color={c.onPrimary} strokeWidth={2.25} />
            <Text style={[styles.dualBtnText, { color: c.onPrimary }]}>Pause all</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (job === 'error') retryAfterError();
              else resumeDownload();
            }}
            disabled={!canResume}
            style={({ pressed }) => [
              styles.resumeBtn,
              { backgroundColor: c.secondaryContainer },
              pressed && { opacity: 0.9 },
              !canResume && { opacity: 0.45 },
            ]}>
            <Play size={20} color={c.onSecondaryContainer} strokeWidth={2.25} />
            <Text style={[styles.dualBtnText, { color: c.onSecondaryContainer }]}>Resume all</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onQueueAllMissing}
          disabled={runnerBusy}
          style={({ pressed }) => [
            styles.queueAllBtn,
            { borderColor: c.outline },
            pressed && { opacity: 0.88 },
            runnerBusy && { opacity: 0.5 },
          ]}>
          <Text style={[styles.queueAllText, { color: c.primary }]}>
            Queue all missing surahs (optional)
          </Text>
        </Pressable>

        <Text style={[styles.cacheHint, { color: c.onSurfaceVariant }]}>
          Cache v{OFFLINE_QURAN_VERSION} · Pick individual surahs below, or use the bulk queue.
        </Text>
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.footer}>
      <Pressable
        onPress={confirmDelete}
        style={({ pressed }) => [
          styles.dangerCard,
          {
            borderColor: c.outlineVariant,
            backgroundColor: c.surfaceContainerLowest,
          },
          pressed && { opacity: 0.92 },
        ]}>
        <Trash2 size={22} color={c.error} strokeWidth={2} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.dangerTitle, { color: c.onSurface }]}>Delete all offline data</Text>
          <Text style={[styles.dangerHint, { color: c.onSurfaceVariant }]}>
            Removes text, translation, audio URLs, and your download queue from this device.
          </Text>
        </View>
      </Pressable>
      <Text style={[styles.footnote, { color: c.onSurfaceVariant }]}>
        Downloads may pause if the system suspends the app; open this screen and tap Resume to
        continue. Saved surahs open instantly; audio streams when online.
      </Text>
    </View>
  );

  if (!surahList?.length) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.topIcon}>
            <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: c.primary }]}>Offline Sanctuary</Text>
          <View style={styles.topIcon} />
        </View>
        <ActivityIndicator style={{ marginTop: spacing.x3xl }} color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topIcon}>
          <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: c.primary }]}>Offline Sanctuary</Text>
        <View style={styles.topIcon}>
          <CloudDownload size={24} color={c.primary} strokeWidth={2.25} />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    fontFamily: fontFamilies.headline,
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.x3xl,
  },
  headerBlock: { marginBottom: spacing.lg },
  heroCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#003527',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  globalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  globalPct: {
    fontFamily: fontFamilies.headline,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  globalPctSoft: { fontSize: 16, fontWeight: '600' },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  storageText: { fontSize: 12, fontWeight: '600' },
  ringWrap: { width: 96, height: 96, position: 'relative' as const },
  ringIcon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: { fontSize: 14, fontWeight: '600' },
  statusHint: { fontSize: 13, lineHeight: 18 },
  dualActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radius.full,
  },
  resumeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radius.full,
  },
  dualBtnText: { fontSize: 15, fontWeight: '800' },
  queueAllBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  queueAllText: { fontSize: 14, fontWeight: '700' },
  cacheHint: { fontSize: 11, lineHeight: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontFamily: fontFamilies.headline, fontSize: 17, fontWeight: '800' },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  numBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBoxMuted: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fontFamilies.headline, fontSize: 18, fontWeight: '800' },
  cardMid: { flex: 1, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  surahName: { fontSize: 16, fontWeight: '800', flex: 1 },
  surahNameMuted: { fontSize: 16, fontWeight: '800' },
  surahNameFaint: { fontSize: 16, fontWeight: '800', opacity: 0.65 },
  pctSmall: { fontSize: 11, fontWeight: '800' },
  barTrack: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  subMuted: { fontSize: 12, marginTop: 4 },
  subFaint: { fontSize: 12, marginTop: 4, opacity: 0.7 },
  iconBtnSm: { padding: spacing.xs },
  footer: { marginTop: spacing.xl, gap: spacing.md },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerTitle: { fontSize: 16, fontWeight: '800' },
  dangerHint: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  footnote: { fontSize: 12, lineHeight: 18 },
});
