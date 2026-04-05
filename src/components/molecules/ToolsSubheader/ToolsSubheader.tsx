import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  title: string;
  subtitle?: string;
};

export function ToolsSubheader({ title, subtitle }: Props) {
  const navigation = useNavigation();
  const { colors: c } = useThemePalette();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <ChevronLeft size={26} color={c.primary} strokeWidth={2.25} />
      </Pressable>
      <View style={styles.titles}>
        <SazdaText variant="headlineMedium" color="primary" numberOfLines={1}>
          {title}
        </SazdaText>
        {subtitle ? (
          <SazdaText variant="caption" color="onSurfaceVariant" numberOfLines={2}>
            {subtitle}
          </SazdaText>
        ) : null}
      </View>
      <View style={styles.iconHit} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  iconHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  titles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
