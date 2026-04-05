import { useId, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { G, Path, Rect, Defs, Pattern } from 'react-native-svg';
import type { AppPalette } from '../../../theme/useThemePalette';

type Props = {
  palette: AppPalette;
  scheme: 'light' | 'dark';
};

/**
 * Subtle “Islamic geometric” plus-grid like Stitch `tasbeeh_counter` / qibla dot grid.
 */
export function TasbeehGeometricBackground({ palette, scheme }: Props) {
  const { width, height } = useWindowDimensions();
  const uid = useId().replace(/:/g, '');
  const patternId = `tasbeehGeo-${uid}`;
  const fill = palette.primary;
  const fillOpacity = scheme === 'dark' ? 0.05 : 0.03;

  const d = useMemo(
    () =>
      'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z',
    [],
  );

  const w = Math.ceil(width);
  const h = Math.ceil(height);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={60}
            height={60}
            viewBox="0 0 60 60">
            <G fill={fill} fillOpacity={fillOpacity}>
              <Path d={d} />
            </G>
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
