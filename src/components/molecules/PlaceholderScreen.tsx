import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemePalette } from '../../theme/useThemePalette';

type Props = {
  title: string;
  subtitle?: string;
};

export function PlaceholderScreen({ title, subtitle }: Props) {
  const { colors: c } = useThemePalette();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
          backgroundColor: c.surface,
        },
        title: {
          ...typography.headlineMedium,
          color: c.primary,
          textAlign: 'center',
        },
        subtitle: {
          ...typography.body,
          color: c.onSurfaceVariant,
          marginTop: spacing.sm,
          textAlign: 'center',
        },
      }),
    [c],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
