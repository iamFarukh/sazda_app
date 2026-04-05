import { useId } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useThemePalette } from '../../../theme/useThemePalette';

const DOT_SPACING = 24;
const DOT_R = 1;

type Props = {
  dotOpacity?: number;
};

export function CompassGridBackground({ dotOpacity = 0.55 }: Props) {
  const { colors: c } = useThemePalette();
  const { width, height } = useWindowDimensions();
  const uid = useId().replace(/:/g, '');
  const patternId = `compassGridDots-${uid}`;
  const radialId = `compassGridRadial-${uid}`;

  const w = Math.ceil(width);
  const h = Math.ceil(height);

  const radialOpacity = 0.035;

  return (
    <Svg width={w} height={h} style={[StyleSheet.absoluteFillObject, styles.svg]} pointerEvents="none">
      <Defs>
        <Pattern
          id={patternId}
          x={0}
          y={0}
          width={DOT_SPACING}
          height={DOT_SPACING}
          patternUnits="userSpaceOnUse">
          <Circle
            cx={DOT_SPACING / 2}
            cy={DOT_SPACING / 2}
            r={DOT_R}
            fill={c.surfaceContainerHighest}
            opacity={dotOpacity}
          />
        </Pattern>
        <RadialGradient id={radialId} cx="50%" cy="50%" r="75%" gradientUnits="objectBoundingBox">
          <Stop offset="0%" stopColor={c.primary} stopOpacity={radialOpacity} />
          <Stop offset="70%" stopColor={c.primary} stopOpacity={0} />
          <Stop offset="100%" stopColor={c.primary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={c.surface} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${patternId})`} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${radialId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    zIndex: 0,
  },
});
