import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { PressableScale } from '../../atoms/PressableScale/PressableScale';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';
import { hapticMedium } from '../../../utils/appHaptics';

type Props = {
  title: string;
  subtitle?: string;
};

export function ToolsSubheader({ title, subtitle }: Props) {
  const navigation = useNavigation();
  const { colors: c } = useThemePalette();

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => {
          hapticMedium();
          navigation.goBack();
        }}
        style={styles.iconHit}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <ChevronLeft size={26} color={c.primary} strokeWidth={2.25} />
      </PressableScale>
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
  titles: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
