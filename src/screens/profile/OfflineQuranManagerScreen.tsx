import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  ChevronLeft,
  CloudDownload,
  CloudOff,
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
import { elevation } from '../../theme/elevation';
import { motionDurations, motionEasing } from '../../theme/motion';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { hapticLight, hapticMedium } from '../../utils/appHaptics';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import { PressableScale } from '../../components/atoms/PressableScale/PressableScale';
import { Skeleton } from '../../components/atoms/Skeleton/Skeleton';
import { EmptyState } from '../../components/molecules/EmptyState/EmptyState';
import { AppAlert } from '../../components/organisms/AppAlert/AppAlert';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'OfflineQuran'>;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

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

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

/** Circular overall-progress indicator with a smooth, reduce-motion-aware sweep. */
function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  reduced,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  reduced: boolean;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const p = useSharedValue(clamp01(progress));

  useEffect(() => {
    const next = clamp01(progress);
    p.value = reduced
      ? next
      : withTiming(next, { duration: motionDurations.slow, easing: motionEasing.standardOut });
  }, [progress, reduced, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - p.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.ringRotate}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

/** Linear download progress with a smooth width animation (reduce-motion aware). */
function AnimatedProgressBar({
  progress,
  trackColor,
  fillColor,
  reduced,
}: {
  progress: number;
  trackColor: string;
  fillColor: string;
  reduced: boolean;
}) {
  const p = useSharedValue(clamp01(progress));

  useEffect(() => {
    const next = clamp01(progress);
    p.value = reduced
      ? next
      : withTiming(next, { duration: motionDurations.base, easing: motionEasing.standardOut });
  }, [progress, reduced, p]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}

/** Calm breathing dot marking the live download section (static under Reduce Motion). */
function PulseDot({ color, reduced }: { color: string; reduced: boolean }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.35, {
        duration: motionDurations.skeletonPulseMs,
        easing: motionEasing.inOutSine,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

export function OfflineQuranManagerScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: c, scheme } = useThemePalette();
  const reduced = useReduceMotion();
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

  const {
    data: surahList,
    isError: surahListError,
    refetch: refetchSurahs,
  } = useQuery({
    queryKey: ['quran', 'surahs'],
    queryFn: fetchAllSurahs,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const shadow = useMemo(
    () => ({
      hero: elevation('md', scheme),
      card: elevation('sm', scheme),
    }),
    [scheme],
  );

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

  const globalPctSurahs = Math.round(clamp01(progress01) * 100);
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
        badge: job === 'running' ? '1 active' : 'Paused',
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
    hapticMedium();
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
    hapticMedium();
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
              <PulseDot color={c.secondary} reduced={reduced} />
            ) : (
              <View style={styles.pulseSpacer} />
            )}
            <SazdaText variant="titleLarge" color="primary">
              {item.title}
            </SazdaText>
          </View>
          <SazdaText variant="label" color="secondary">
            {item.badge}
          </SazdaText>
        </View>
      );
    }

    if (item.kind === 'active') {
      const pct = Math.round(clamp01(item.progress01) * 100);
      return (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(motionDurations.base)}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Downloading ${item.surah.englishName}`}
          accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct} percent complete` }}
          style={[styles.activeCard, { backgroundColor: c.primaryContainer }, shadow.hero]}>
          <View style={[styles.numBox, { backgroundColor: c.primary }]}>
            <SazdaText variant="titleLarge" color="onPrimary">
              {item.surah.number}
            </SazdaText>
          </View>
          <View style={styles.cardMid}>
            <View style={styles.cardTitleRow}>
              <SazdaText
                variant="titleLarge"
                color="onPrimaryContainer"
                numberOfLines={1}
                style={styles.surahNameFlex}>
                {item.surah.englishName}
              </SazdaText>
              <SazdaText variant="label" color="onPrimaryContainer">
                {pct}%
              </SazdaText>
            </View>
            <AnimatedProgressBar
              progress={item.progress01}
              trackColor={`${c.onPrimaryContainer}2E`}
              fillColor={c.onPrimaryContainer}
              reduced={reduced}
            />
          </View>
          <PressableScale
            onPress={() => {
              hapticLight();
              cancelActiveSurah();
            }}
            hitSlop={12}
            to={0.88}
            pressedOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Cancel download of ${item.surah.englishName}`}
            style={styles.iconBtnSm}>
            <X size={22} color={c.onPrimaryContainer} strokeWidth={2.25} />
          </PressableScale>
        </Animated.View>
      );
    }

    if (item.kind === 'queued') {
      return (
        <View style={[styles.doneCard, { backgroundColor: c.surfaceContainerLow }, shadow.card]}>
          <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerHighest }]}>
            <SazdaText variant="titleLarge" color="onSurfaceVariant">
              {item.surah.number}
            </SazdaText>
          </View>
          <View style={styles.cardMid}>
            <SazdaText variant="titleLarge" color="onSurface" numberOfLines={1}>
              {item.surah.englishName}
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.subLine}>
              Waiting in queue
            </SazdaText>
          </View>
          <PressableScale
            onPress={() => {
              hapticLight();
              removeQueuedSurah(item.surah.number);
            }}
            hitSlop={12}
            to={0.88}
            pressedOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.surah.englishName} from queue`}
            style={styles.iconBtnSm}>
            <X size={20} color={c.onSurfaceVariant} strokeWidth={2} />
          </PressableScale>
        </View>
      );
    }

    if (item.kind === 'completed') {
      return (
        <View
          accessible
          accessibilityLabel={`${item.surah.englishName}, downloaded, ${item.sizeLabel}`}
          style={[
            styles.doneCard,
            styles.completedBorder,
            { backgroundColor: c.surfaceContainerLowest, borderColor: c.outlineVariant },
            shadow.card,
          ]}>
          <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerLow }]}>
            <SazdaText variant="titleLarge" color="primary">
              {item.surah.number}
            </SazdaText>
          </View>
          <View style={styles.cardMid}>
            <SazdaText variant="titleLarge" color="primary" numberOfLines={1}>
              {item.surah.englishName}
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.subLine}>
              {item.sizeLabel}
            </SazdaText>
          </View>
          <CheckCircle2 size={24} color={c.primary} strokeWidth={2.25} />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.pendingCard,
          {
            borderColor: c.outlineVariant,
            backgroundColor: `${c.surfaceContainerLow}99`,
          },
        ]}>
        <View style={[styles.numBoxMuted, { backgroundColor: c.surfaceContainerHighest }]}>
          <SazdaText variant="titleLarge" color="onSurfaceVariant">
            {item.surah.number}
          </SazdaText>
        </View>
        <View style={styles.cardMid}>
          <SazdaText
            variant="titleLarge"
            color="primary"
            numberOfLines={1}
            style={styles.nameFaint}>
            {item.surah.englishName}
          </SazdaText>
          <SazdaText
            variant="caption"
            color="onSurfaceVariant"
            style={[styles.subLine, styles.subFaint]}>
            {item.estLabel}
          </SazdaText>
        </View>
        <PressableScale
          onPress={() => {
            hapticLight();
            enqueueSurah(item.surah.number);
          }}
          hitSlop={12}
          to={0.88}
          pressedOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Download ${item.surah.englishName}`}
          style={styles.iconBtnSm}>
          <CloudDownload size={22} color={c.primary} strokeWidth={2} />
        </PressableScale>
      </View>
    );
  };

  const listHeader = (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(motionDurations.slow).easing(motionEasing.standardOut)}
      style={styles.headerBlock}>
      <View style={[styles.heroCard, { backgroundColor: c.surfaceContainerLowest }, shadow.hero]}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <SazdaText variant="label" color="onSurfaceVariant">
              Saved offline
            </SazdaText>
            <View style={styles.pctRow}>
              <SazdaText variant="headlineLarge" color="primary">
                {globalPctSurahs}%
              </SazdaText>
              <SazdaText variant="bodyMedium" color="secondary">
                saved
              </SazdaText>
            </View>
            <View style={styles.storageRow}>
              <Database size={14} color={c.onSurfaceVariant} strokeWidth={2} />
              <SazdaText variant="caption" color="onSurfaceVariant">
                {formatBytes(storageBytes)} / {formatBytes(ESTIMATED_FULL_OFFLINE_BYTES)}
              </SazdaText>
            </View>
          </View>
          <View
            style={styles.ringWrap}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Overall offline library progress"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(clamp01(ringProgress) * 100),
              text: `${Math.round(clamp01(ringProgress) * 100)} percent saved, ${formatBytes(storageBytes)} used`,
            }}>
            <ProgressRing
              size={96}
              strokeWidth={6}
              progress={ringProgress}
              color={c.primary}
              trackColor={c.surfaceContainerHighest}
              reduced={reduced}
            />
            <View style={styles.ringIcon}>
              <CloudDownload size={28} color={c.primary} strokeWidth={2} />
            </View>
          </View>
        </View>

        {lastError ? (
          <View accessible accessibilityRole="alert" accessibilityLabel={`Error: ${lastError}`}>
            <SazdaText variant="bodySmall" color="error">
              {lastError}
            </SazdaText>
          </View>
        ) : (
          <SazdaText variant="bodySmall" color="onSurfaceVariant">
            {statusLine}
          </SazdaText>
        )}

        <View style={styles.dualActions}>
          <PressableScale
            onPress={() => {
              hapticLight();
              pauseDownload();
            }}
            disabled={job !== 'running'}
            to={0.97}
            pressedOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Pause all downloads"
            accessibilityState={{ disabled: job !== 'running' }}
            style={[
              styles.dualBtn,
              { backgroundColor: c.primaryContainer },
              job !== 'running' && styles.disabledBtn,
            ]}>
            <Pause size={20} color={c.onPrimaryContainer} strokeWidth={2.25} />
            <SazdaText variant="titleSm" color="onPrimaryContainer">
              Pause all
            </SazdaText>
          </PressableScale>
          <PressableScale
            onPress={() => {
              hapticMedium();
              if (job === 'error') retryAfterError();
              else resumeDownload();
            }}
            disabled={!canResume}
            to={0.97}
            pressedOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={job === 'error' ? 'Retry downloads' : 'Resume all downloads'}
            accessibilityState={{ disabled: !canResume }}
            style={[
              styles.dualBtn,
              { backgroundColor: c.secondaryContainer },
              !canResume && styles.disabledBtn,
            ]}>
            <Play size={20} color={c.onSecondaryContainer} strokeWidth={2.25} />
            <SazdaText variant="titleSm" color="onSecondaryContainer">
              Resume all
            </SazdaText>
          </PressableScale>
        </View>

        <PressableScale
          onPress={onQueueAllMissing}
          disabled={runnerBusy}
          to={0.98}
          pressedOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Queue all missing surahs for download"
          accessibilityState={{ disabled: runnerBusy }}
          style={[
            styles.queueAllBtn,
            { borderColor: c.outline },
            runnerBusy && styles.disabledQueueAll,
          ]}>
          <SazdaText variant="titleSm" color="primary">
            Queue all missing surahs (optional)
          </SazdaText>
        </PressableScale>

        <SazdaText variant="caption" color="onSurfaceVariant">
          Cache v{OFFLINE_QURAN_VERSION} · Pick individual surahs below, or use the bulk queue.
        </SazdaText>
      </View>
    </Animated.View>
  );

  const listFooter = (
    <View style={styles.footer}>
      <PressableScale
        onPress={confirmDelete}
        to={0.98}
        pressedOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Delete all offline data"
        accessibilityHint="Removes downloaded text, translation, audio URLs, and the download queue from this device"
        style={[
          styles.dangerCard,
          { borderColor: c.outlineVariant, backgroundColor: c.surfaceContainerLowest },
          shadow.card,
        ]}>
        <Trash2 size={22} color={c.error} strokeWidth={2} />
        <View style={styles.dangerTextCol}>
          <SazdaText variant="titleLarge" color="onSurface">
            Delete all offline data
          </SazdaText>
          <SazdaText variant="bodySmall" color="onSurfaceVariant" style={styles.subLine}>
            Removes text, translation, audio URLs, and your download queue from this device.
          </SazdaText>
        </View>
      </PressableScale>
      <SazdaText variant="caption" color="onSurfaceVariant" style={styles.footnote}>
        Downloads may pause if the system suspends the app; open this screen and tap Resume to
        continue. Saved surahs open instantly; audio streams when online.
      </SazdaText>
    </View>
  );

  const topBar = (
    <View style={styles.topBar}>
      <PressableScale
        onPress={() => navigation.goBack()}
        to={0.9}
        pressedOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.topIcon}>
        <ChevronLeft size={28} color={c.primary} strokeWidth={2.25} />
      </PressableScale>
      <SazdaText variant="headlineMedium" color="primary">
        Offline Sanctuary
      </SazdaText>
      <View style={styles.topIcon} importantForAccessibility="no-hide-descendants">
        <CloudDownload size={24} color={c.primary} strokeWidth={2.25} />
      </View>
    </View>
  );

  if (!surahList?.length) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
        {topBar}
        {surahListError ? (
          <EmptyState
            icon={<CloudOff size={40} color={c.onSurfaceVariant} strokeWidth={1.75} />}
            title="Couldn't load the surah list"
            message="Check your connection and try again — downloads need the surah index first."
            actionLabel="Try again"
            onAction={() => {
              hapticLight();
              void refetchSurahs();
            }}
          />
        ) : (
          <View style={styles.skeletonWrap}>
            <View style={[styles.heroCard, { backgroundColor: c.surfaceContainerLowest }, shadow.hero]}>
              <View style={styles.heroTop}>
                <View style={styles.skeletonHeroLeft}>
                  <Skeleton width={110} height={12} />
                  <Skeleton width={96} height={30} />
                  <Skeleton width={148} height={12} />
                </View>
                <Skeleton width={96} height={96} circle />
              </View>
              <Skeleton height={48} radius={radius.xl} />
            </View>
            {[0, 1, 2, 3].map(i => (
              <Skeleton key={i} height={76} radius={radius.sm} style={styles.skeletonRow} />
            ))}
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]} edges={['top']}>
      {topBar}
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={RowSeparator}
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
    paddingVertical: spacing.xs,
  },
  topIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.x3xl,
  },
  rowSeparator: { height: spacing.sm },
  headerBlock: { marginBottom: spacing.lg },
  heroCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLeft: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    marginTop: spacing.sm,
  },
  ringWrap: { width: 96, height: 96, position: 'relative' as const },
  ringRotate: { transform: [{ rotate: '-90deg' }] },
  ringIcon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  dualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.full,
  },
  disabledBtn: { opacity: 0.45 },
  queueAllBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  disabledQueueAll: { opacity: 0.5 },
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
  pulseSpacer: { width: 8 },
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
  completedBorder: { borderWidth: StyleSheet.hairlineWidth },
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
  cardMid: { flex: 1, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  surahNameFlex: { flex: 1 },
  nameFaint: { opacity: 0.65 },
  barTrack: { height: 6, borderRadius: 3, marginTop: spacing.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  subLine: { marginTop: spacing.xxs },
  subFaint: { opacity: 0.7 },
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
  dangerTextCol: { flex: 1, minWidth: 0 },
  footnote: { lineHeight: 18 },
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxs,
  },
  skeletonHeroLeft: { flex: 1, gap: spacing.sm, paddingRight: spacing.md },
  skeletonRow: { marginTop: spacing.sm },
});
