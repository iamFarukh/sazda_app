import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, Sparkles } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { pushPrayerWidgetSnapshotToNative, type PrayerWidgetSnapshot } from '../../../features/prayerWidget';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { fontFamilies, platformFontWeight } from '../../../theme/typography';
import type { AppPalette } from '../../../theme/useThemePalette';
import type { ResolvedScheme } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  snapshot: PrayerWidgetSnapshot | null;
};

function createStyles(c: AppPalette, scheme: ResolvedScheme, muted: boolean) {
  const border = scheme === 'dark' ? 'rgba(142,207,178,0.2)' : 'rgba(6, 78, 59, 0.1)';
  const cardBg = muted
    ? scheme === 'dark'
      ? 'rgba(19, 29, 26, 0.95)'
      : c.surfaceContainer
    : c.surfaceContainerLow;
  return StyleSheet.create({
    section: { marginTop: spacing.lg, gap: spacing.sm },
    sectionLabel: {
      fontFamily: fontFamilies.body,
      fontSize: 10,
      fontWeight: platformFontWeight('800'),
      letterSpacing: 1.6,
      opacity: 0.55,
      marginLeft: spacing.xs,
    },
    card: {
      borderRadius: radius.md + 6,
      backgroundColor: cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: border,
      padding: spacing.lg + 2,
      gap: spacing.md,
      shadowColor: scheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(6, 78, 59, 0.08)',
      shadowOpacity: 1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: scheme === 'dark' ? 'rgba(254,214,91,0.12)' : 'rgba(6, 78, 59, 0.08)',
    },
    countdownBlock: { alignItems: 'flex-end' },
    countdownKicker: { fontSize: 11, fontWeight: '700', opacity: 0.55 },
    countdownMain: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
    title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
    subtitle: { fontSize: 14, fontWeight: '700', opacity: 0.88, marginTop: 4 },
    note: { fontSize: 12, lineHeight: 17, opacity: 0.72, marginTop: spacing.sm },
    scheduleWrap: {
      marginTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: border,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    schedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md - 2,
    },
    schedRowActive: {
      backgroundColor: scheme === 'dark' ? 'rgba(254,214,91,0.1)' : c.surfaceContainerLowest,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme === 'dark' ? 'rgba(254,214,91,0.25)' : 'rgba(6, 78, 59, 0.08)',
    },
    schedTime: { fontSize: 12, fontWeight: '800', width: 56 },
    schedName: { flex: 1, fontSize: 14, fontWeight: '800' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary },
  });
}

export function PrayerWidgetGlance({ snapshot }: Props) {
  const { colors: c, scheme } = useThemePalette();
  const muted = snapshot?.mode === 'makruh';
  const styles = useMemo(() => createStyles(c, scheme, muted), [c, scheme, muted]);

  useEffect(() => {
    if (!snapshot) return;
    pushPrayerWidgetSnapshotToNative(JSON.stringify(snapshot));
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <View style={styles.section}>
      <SazdaText variant="label" color="onSurfaceVariant" style={styles.sectionLabel}>
        WIDGET GLANCE · UPDATES EVERY MINUTE
      </SazdaText>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.livePill}>
            <Clock size={14} color={c.primary} strokeWidth={2.4} />
            <SazdaText variant="label" color="secondary" style={{ fontSize: 9, letterSpacing: 1 }}>
              LIVE
            </SazdaText>
          </View>
          <View style={styles.countdownBlock}>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.countdownKicker}>
              Next in
            </SazdaText>
            <SazdaText variant="headlineLarge" color="primary" style={styles.countdownMain}>
              {snapshot.countdownLabelMin}
            </SazdaText>
          </View>
        </View>

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {snapshot.mode === 'makruh' ? (
              <Sparkles size={22} color={c.secondary} strokeWidth={2} />
            ) : null}
            <SazdaText variant="headlineMedium" color="primary" style={styles.title}>
              {snapshot.title}
            </SazdaText>
          </View>
          <SazdaText variant="bodyMedium" color="onSurfaceVariant" style={styles.subtitle}>
            {snapshot.subtitle}
          </SazdaText>
          {snapshot.periodNote ? (
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.note}>
              {snapshot.periodNote}
            </SazdaText>
          ) : null}
        </View>

        <View style={styles.scheduleWrap}>
          {snapshot.schedule.map(row => {
            const active = snapshot.highlight === row.name;
            return (
              <View
                key={row.name}
                style={[styles.schedRow, active ? styles.schedRowActive : null]}
                accessibilityLabel={`${row.name} ${row.time12}`}>
                <SazdaText
                  variant="label"
                  color={active ? 'primary' : 'onSurfaceVariant'}
                  style={styles.schedTime}>
                  {row.time12}
                </SazdaText>
                <SazdaText variant="bodyMedium" color={active ? 'primary' : 'onSurface'} style={styles.schedName}>
                  {row.name}
                </SazdaText>
                {active ? <View style={styles.dot} /> : <View style={{ width: 8 }} />}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
