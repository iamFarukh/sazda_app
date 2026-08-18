import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { AnimationObject } from 'lottie-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { Button } from '../../atoms/Button/Button';
import { AppLottie } from '../../atoms/AppLottie/AppLottie';
import { useReduceMotion } from '../../../hooks/useReduceMotion';
import { useThemePalette } from '../../../theme/useThemePalette';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { motionDurations, motionEasing } from '../../../theme/motion';

type Props = {
  /** Lucide icon element (rendered inside a soft circle). The reliable default. */
  icon?: ReactNode;
  /** Optional Lottie that replaces the icon when its asset is present. */
  lottie?: AnimationObject;
  title: string;
  message?: string;
  /** Optional call-to-action. */
  actionLabel?: string;
  onAction?: () => void;
  /** Compact spacing for inline (in-list) empties vs full-screen. */
  compact?: boolean;
};

/**
 * Consistent, calm empty/no-results state. An empty screen is an invitation to act —
 * so it leads with a quiet illustration, says plainly what's here, and (optionally)
 * offers the next step. Used across Quran, Duas, bookmarks, search, etc.
 */
export function EmptyState({ icon, lottie, title, message, actionLabel, onAction, compact }: Props) {
  const { colors: c } = useThemePalette();
  const reduced = useReduceMotion();

  const illustration = lottie ? (
    <AppLottie source={lottie} size={140} fallback={icon} />
  ) : (
    <View style={[styles.iconCircle, { backgroundColor: c.surfaceContainerHighest }]}>{icon}</View>
  );

  const content = (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {illustration}
      <SazdaText variant="titleLarge" color="onSurface" align="center" style={styles.title}>
        {title}
      </SazdaText>
      {message ? (
        <SazdaText variant="body" color="onSurfaceVariant" align="center" style={styles.message}>
          {message}
        </SazdaText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );

  if (reduced) return content;

  return (
    <Animated.View
      entering={FadeInDown.duration(motionDurations.slow).easing(motionEasing.standardOut)}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.x3xl,
  },
  wrapCompact: {
    paddingVertical: spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 320,
    opacity: 0.9,
  },
  action: {
    marginTop: spacing.lg,
  },
});
