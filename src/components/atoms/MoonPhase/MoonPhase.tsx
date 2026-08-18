import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const SYNODIC = 29.53;

type Props = {
  /** Hijri day of the month (1..30). Drives the illuminated fraction. */
  day: number;
  size?: number;
  /** Colour of the lit face (gold/cream). */
  litColor: string;
  /** Colour behind the moon — should match the surface it sits on so the shadow "cuts". */
  shadowColor: string;
  /** Thin rim for definition. */
  ringColor?: string;
};

/**
 * A theme-aware moon phase. Renders the lit disc and slides a same-radius shadow disc
 * across it to carve the crescent/gibbous for the given lunar day — so colours adapt to
 * light/dark (unlike a baked Lottie). Purely presentational.
 */
export const MoonPhase = memo(function MoonPhase({
  day,
  size = 40,
  litColor,
  shadowColor,
  ringColor,
}: Props) {
  const r = size / 2;
  const f = Math.min(1, Math.max(0, (day - 1) / SYNODIC)); // age within the lunar cycle
  const illum = (1 - Math.cos(2 * Math.PI * f)) / 2; // 0 = new, 1 = full
  const waxing = f < 0.5;
  const dx = 2 * r * (1 - illum) * (waxing ? -1 : 1);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: shadowColor,
          borderWidth: ringColor ? 1 : 0,
          borderColor: ringColor,
        },
      ]}>
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill={litColor} />
        <Circle cx={r + dx} cy={r} r={r} fill={shadowColor} />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});
