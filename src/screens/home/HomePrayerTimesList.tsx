import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bell, BellOff, Calculator, Mic, Sunrise } from 'lucide-react-native';
import { SazdaText } from '../../components/atoms/SazdaText/SazdaText';
import type { PrayerTimingsDay } from '../../services/prayerTimesApi';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import type { AppPalette } from '../../theme/useThemePalette';
import type { ResolvedScheme } from '../../theme/useThemePalette';
import { formatHhmmTo12h } from '../../utils/prayerTimesDisplay';
import type { DailyPrayerName } from '../../utils/prayerSchedule';

const FIVE: DailyPrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

type Props = {
  timings: PrayerTimingsDay;
  /** Current obligatory window from `computePrayerHeroState` — highlights that row. */
  activeSalah: DailyPrayerName | null;
  palette: AppPalette;
  scheme: ResolvedScheme;
};

function HomePrayerTimesListInner({ timings, activeSalah, palette: c, scheme }: Props) {
  const styles = createListStyles(c, scheme);

  return (
    <View style={styles.wrap}>
      <SazdaText variant="titleSm" color="primary" style={styles.sectionTitle}>
        Today&apos;s times
      </SazdaText>

      {/* Sunrise utility row — matches Stitch */}
      <View style={styles.sunRow}>
        <View style={styles.sunLeft}>
          <View style={styles.sunIcon}>
            <Sunrise size={20} color={c.secondary} strokeWidth={2} />
          </View>
          <View>
            <SazdaText variant="titleSm" color="primary">
              Sunrise
            </SazdaText>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.sunSub}>
              {formatHhmmTo12h(timings.Sunrise)}
            </SazdaText>
          </View>
        </View>
        <Pressable
          hitSlop={12}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel="Sunrise reminder (coming soon)">
          <BellOff size={22} color={c.outline} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.prayerBlock}>
        {FIVE.map(name => (
          <PrayerRow
            key={name}
            name={name}
            time={formatHhmmTo12h(timings[name])}
            active={activeSalah === name}
            styles={styles}
            colors={c}
          />
        ))}
      </View>

      <View style={styles.bentoRow}>
        <View style={styles.bentoCard}>
          <Mic size={22} color={c.secondary} strokeWidth={2} />
          <View style={styles.bentoText}>
            <SazdaText variant="label" color="onSurfaceVariant" style={styles.bentoKicker}>
              Adhan voice
            </SazdaText>
            <SazdaText variant="titleSm" color="primary" numberOfLines={1}>
              App default
            </SazdaText>
          </View>
        </View>
        <View style={styles.bentoCard}>
          <Calculator size={22} color={c.secondary} strokeWidth={2} />
          <View style={styles.bentoText}>
            <SazdaText variant="label" color="onSurfaceVariant" style={styles.bentoKicker}>
              Method
            </SazdaText>
            <SazdaText variant="titleSm" color="primary" numberOfLines={1}>
              ISNA
            </SazdaText>
          </View>
        </View>
      </View>
    </View>
  );
}

export const HomePrayerTimesList = memo(HomePrayerTimesListInner);

type RowStyles = ReturnType<typeof createListStyles>;

function PrayerRow({
  name,
  time,
  active,
  styles,
  colors: c,
}: {
  name: DailyPrayerName;
  time: string;
  active: boolean;
  styles: RowStyles;
  colors: AppPalette;
}) {
  const onCard = active ? 'onPrimaryContainer' : 'primary';
  const timeColor = active ? 'onPrimaryContainer' : 'onSurfaceVariant';
  return (
    <View style={[styles.prayerRow, active && styles.prayerRowActive]}>
      <View style={styles.prayerRowLeft}>
        <SazdaText variant="headlineMedium" color={onCard} style={styles.prayerName}>
          {name}
        </SazdaText>
        <SazdaText variant="bodyMedium" color={timeColor} style={[styles.prayerTime, active && styles.prayerTimeActive]}>
          {time}
        </SazdaText>
      </View>
      <View style={styles.prayerRowRight}>
        {active ? (
          <View style={[styles.activePill, { backgroundColor: c.secondaryContainer }]}>
            <SazdaText variant="label" color="onSecondaryContainer" style={styles.activePillText}>
              Active
            </SazdaText>
          </View>
        ) : null}
        <Pressable
          hitSlop={12}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityLabel={`Reminder for ${name} (coming soon)`}>
          <Bell
            size={22}
            color={active ? c.secondaryContainer : c.outline}
            strokeWidth={2}
          />
        </Pressable>
      </View>
    </View>
  );
}

function createListStyles(c: AppPalette, scheme: ResolvedScheme) {
  const activeBg = c.primaryContainer;
  const hairline = scheme === 'dark' ? 'rgba(142,207,178,0.12)' : 'rgba(0, 53, 39, 0.06)';
  return StyleSheet.create({
    wrap: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      marginBottom: spacing.xs,
      letterSpacing: -0.3,
    },
    sunRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.surfaceContainerLow,
      borderWidth: 1,
      borderColor: hairline,
    },
    sunLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sunIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerHighest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sunSub: { marginTop: 2, fontWeight: '600', letterSpacing: 0.5 },
    prayerBlock: { gap: spacing.sm + 2 },
    prayerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: c.surfaceContainerLow,
      borderWidth: 1,
      borderColor: hairline,
    },
    prayerRowActive: {
      backgroundColor: activeBg,
      borderColor: scheme === 'dark' ? 'rgba(142,207,178,0.25)' : 'rgba(6, 78, 59, 0.2)',
      transform: [{ scale: 1.02 }],
      shadowColor: scheme === 'dark' ? '#000' : 'rgba(6, 78, 59, 0.2)',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    prayerRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
      minWidth: 0,
    },
    prayerName: {
      fontSize: 20,
      fontWeight: '800',
      minWidth: 88,
    },
    prayerTime: { fontSize: 17 },
    prayerTimeActive: { fontWeight: '700', opacity: 0.95 },
    prayerRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    activePill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    activePillText: {
      fontSize: 9,
      letterSpacing: 1.2,
    },
    iconBtn: { padding: spacing.xs },
    pressed: { opacity: 0.75 },
    bentoRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    bentoCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.surfaceContainerHighest,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    bentoText: { gap: 4 },
    bentoKicker: { opacity: 0.85 },
  });
}
