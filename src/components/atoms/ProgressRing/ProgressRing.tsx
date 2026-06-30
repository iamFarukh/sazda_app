import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ringGeometry } from './ringGeometry';

type Props = {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
};

/** Static circular progress ring. Animated wrappers can drive `progress` via state. */
export const ProgressRing = memo(function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  trackColor = 'rgba(0,53,39,0.12)',
  progressColor = '#d4af37',
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const { circumference, dashOffset } = ringGeometry(progress, radius);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
});
