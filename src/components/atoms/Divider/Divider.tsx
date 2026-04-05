import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../theme/spacing';
import { useThemePalette } from '../../../theme/useThemePalette';

export type DividerProps = {
  thickness?: number;
  opacity?: number;
  marginVertical?: number;
  style?: ViewStyle;
};

export function Divider({
  thickness = 1,
  opacity = 0.15,
  marginVertical = spacing.xxs,
  style,
}: DividerProps) {
  const { colors: c } = useThemePalette();
  return (
    <View
      style={[
        styles.base,
        {
          height: thickness,
          backgroundColor: c.outlineVariant,
          opacity,
          marginVertical,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
