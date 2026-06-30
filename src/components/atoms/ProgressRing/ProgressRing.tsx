import { memo, useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ringGeometry } from './ringGeometry';

type Props = {
  /** Static progress 0..1. Ignored when startMs/endMs are provided. */
  progress?: number;
  /** Time-window mode: ring fills as the clock advances from startMs to endMs. */
  startMs?: number;
  endMs?: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  children?: React.ReactNode;
};

/** Maps a moment within [startMs, endMs] to progress 0..1 (clamped). 0 for an empty window. */
export function progressFromWindow(nowMs: number, startMs: number, endMs: number): number {
  if (!(endMs > startMs)) return 0;
  return Math.max(0, Math.min(1, (nowMs - startMs) / (endMs - startMs)));
}

/**
 * Circular progress ring. Two modes:
 * - static: pass `progress` (0..1).
 * - time-window: pass `startMs`+`endMs`; the ring fills live (ticks every second).
 * Children render centered inside the ring.
 */
export const ProgressRing = memo(function ProgressRing({
  progress,
  startMs,
  endMs,
  size = 48,
  strokeWidth = 4,
  trackColor = 'rgba(0,53,39,0.12)',
  progressColor = '#d4af37',
  children,
}: Props) {
  const windowMode = typeof startMs === 'number' && typeof endMs === 'number';
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!windowMode) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [windowMode, startMs, endMs]);

  const value = windowMode
    ? progressFromWindow(nowMs, startMs as number, endMs as number)
    : Math.max(0, Math.min(1, progress ?? 0));

  const radius = (size - strokeWidth) / 2;
  const { circumference, dashOffset } = ringGeometry(value, radius);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center} cy={center} r={radius}
          stroke={progressColor} strokeWidth={strokeWidth} fill="none"
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
