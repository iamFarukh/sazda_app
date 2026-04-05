import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { useTrueSheetOpenSync } from '../../../hooks/useTrueSheetOpenSync';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedKey: string;
  maxKey: string;
  minKey: string;
  onSelectDate: (key: string) => void;
};

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const SHEET_NAME = 'prayer-month-calendar';

export function MonthCalendarModal({
  visible,
  onClose,
  selectedKey,
  maxKey,
  minKey,
  onSelectDate,
}: Props) {
  const { colors: c } = useThemePalette();
  const sheetRef = useRef<TrueSheet>(null);
  const onSheetDidDismiss = useTrueSheetOpenSync(sheetRef, visible, onClose);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.x3xl,
        },
        sheetHandle: {
          alignSelf: 'center',
          width: 44,
          height: 5,
          borderRadius: 3,
          marginBottom: spacing.md,
        },
        sheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        closeHit: { padding: spacing.sm },
        monthNav: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        monthArrow: { padding: spacing.sm },
        arrowDisabled: { opacity: 0.4 },
        monthTitle: { fontWeight: '800' },
        weekRow: {
          flexDirection: 'row',
          marginBottom: spacing.sm,
        },
        weekHead: {
          flex: 1,
          textAlign: 'center',
          fontWeight: '700',
          fontSize: 10,
        },
        row: {
          flexDirection: 'row',
        },
        cell: {
          flex: 1,
          aspectRatio: 1,
          alignItems: 'center',
          justifyContent: 'center',
          maxHeight: 48,
        },
        cellBtn: {
          borderRadius: radius.full,
          width: 40,
          height: 40,
        },
        cellSelected: {
          backgroundColor: c.secondaryContainer,
        },
        cellDisabled: {},
        cellNum: { fontWeight: '700', lineHeight: 40, textAlign: 'center' },
        cellNumDisabled: { opacity: 0.35 },
        pressed: { opacity: 0.85 },
      }),
    [c.secondaryContainer],
  );

  const initialMonth = dayjs(selectedKey).format('YYYY-MM');
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (visible) {
      setViewMonth(dayjs(selectedKey).format('YYYY-MM'));
    }
  }, [visible, selectedKey]);

  const viewStart = useMemo(() => dayjs(`${viewMonth}-01`), [viewMonth]);
  const minMonthStart = useMemo(() => dayjs(minKey).startOf('month'), [minKey]);
  const maxMonthStart = useMemo(() => dayjs(maxKey).startOf('month'), [maxKey]);

  const canPrev = viewStart.isAfter(minMonthStart, 'month');
  const canNext = viewStart.isBefore(maxMonthStart, 'month');

  const rows = useMemo(() => {
    const y = viewStart.year();
    const m = viewStart.month() + 1;
    const start = dayjs(`${y}-${String(m).padStart(2, '0')}-01`);
    const daysInMonth = start.daysInMonth();
    const startWeekday = start.day();
    const cells: ({ key: string } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayjs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`).format(
        'YYYY-MM-DD',
      );
      cells.push({ key });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const out: ({ key: string } | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      out.push(cells.slice(i, i + 7));
    }
    return out;
  }, [viewStart]);

  const prevMonth = () => {
    if (!canPrev) return;
    setViewMonth(viewStart.subtract(1, 'month').format('YYYY-MM'));
  };
  const nextMonth = () => {
    if (!canNext) return;
    setViewMonth(viewStart.add(1, 'month').format('YYYY-MM'));
  };

  return (
    <TrueSheet
      ref={sheetRef}
      name={SHEET_NAME}
      detents={['auto']}
      cornerRadius={radius.md + 14}
      backgroundColor={c.surface}
      dimmed
      grabber={false}
      draggable
      dismissible
      onDidDismiss={onSheetDidDismiss}>
      <View style={styles.sheet}>
        <View style={[styles.sheetHandle, { backgroundColor: c.surfaceContainerHighest }]} />
        <View style={styles.sheetHeader}>
          <SazdaText variant="headlineMedium" color="primary">
            Pick a day
          </SazdaText>
          <Pressable
            onPress={() => void sheetRef.current?.dismiss()}
            style={styles.closeHit}
            accessibilityLabel="Close calendar">
            <X size={24} color={c.primary} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.monthNav}>
          <Pressable
            onPress={prevMonth}
            disabled={!canPrev}
            style={[styles.monthArrow, !canPrev && styles.arrowDisabled]}
            accessibilityLabel="Previous month">
            <ChevronLeft size={26} color={canPrev ? c.primary : c.outlineVariant} />
          </Pressable>
          <SazdaText variant="titleSm" color="primary" style={styles.monthTitle}>
            {viewStart.format('MMMM YYYY')}
          </SazdaText>
          <Pressable
            onPress={nextMonth}
            disabled={!canNext}
            style={[styles.monthArrow, !canNext && styles.arrowDisabled]}
            accessibilityLabel="Next month">
            <ChevronRight size={26} color={canNext ? c.primary : c.outlineVariant} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEK.map((d, i) => (
            <SazdaText key={`${d}-${i}`} variant="caption" color="onSurfaceVariant" style={styles.weekHead}>
              {d}
            </SazdaText>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              if (!cell) {
                return <View key={`e-${ri}-${ci}`} style={styles.cell} />;
              }
              const disabled = cell.key > maxKey || cell.key < minKey;
              const isSel = cell.key === selectedKey;
              return (
                <Pressable
                  key={cell.key}
                  disabled={disabled}
                  onPress={() => {
                    onSelectDate(cell.key);
                    void sheetRef.current?.dismiss();
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.cellBtn,
                    isSel && styles.cellSelected,
                    disabled && styles.cellDisabled,
                    pressed && !disabled && styles.pressed,
                  ]}>
                  <SazdaText
                    variant="bodyMedium"
                    color={
                      disabled
                        ? 'onSurfaceVariant'
                        : isSel
                          ? 'onSecondaryContainer'
                          : 'primary'
                    }
                    style={[styles.cellNum, disabled && styles.cellNumDisabled]}>
                    {dayjs(cell.key).date()}
                  </SazdaText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </TrueSheet>
  );
}
