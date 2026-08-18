import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { PressableScale } from '../../atoms/PressableScale/PressableScale';

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
};

export function ListItem({
  title,
  subtitle,
  left,
  right,
  onPress,
  disabled,
  selected,
}: Props) {
  const { colors: c } = useThemePalette();
  const isDisabled = !!disabled || !onPress;

  const bgStyle = selected
    ? { backgroundColor: c.primaryContainer }
    : { backgroundColor: c.surfaceContainerLow };

  const titleColor = selected ? c.onPrimaryContainer : c.onSurface;
  const subtitleColor = selected ? c.onPrimaryContainer : c.onSurfaceVariant;

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ selected: !!selected, disabled: isDisabled }}
      to={0.98}
      style={[styles.base, bgStyle, isDisabled ? styles.disabled : null]}>
      <View style={styles.row}>
        {left ? <View style={styles.left}>{left}</View> : <View />}
        <View style={styles.texts}>
          <SazdaText variant="bodyMedium" color={titleColor}>
            {title}
          </SazdaText>
          {subtitle ? (
            <SazdaText variant="caption" color={subtitleColor}>
              {subtitle}
            </SazdaText>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : <View />}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    marginRight: spacing.sm,
  },
  texts: {
    flex: 1,
  },
  right: {
    marginLeft: spacing.sm,
  },
  disabled: {
    opacity: 0.55,
  },
});
