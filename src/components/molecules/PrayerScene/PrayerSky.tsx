import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { PrayerAtmosphere } from '../../../theme/prayerAtmosphere';

type Props = {
  atmosphere: PrayerAtmosphere;
  width: number;
  height: number;
  /** Unique id suffix so multiple skies (crossfade) don't share gradient ids. */
  uid: string;
};

/**
 * One procedural "sky": a vertical color gradient + a soft sun/moon orb with halo.
 * Pure SVG, no animation — the parent (<PrayerAtmosphere>) crossfades two of these and
 * layers Lottie accents + breathing on top. Rendered at an explicit measured size so the
 * orb keeps its true circular shape regardless of card aspect ratio.
 */
function PrayerSkyBase({ atmosphere, width, height, uid }: Props) {
  if (width <= 0 || height <= 0) {
    return <View style={StyleSheet.absoluteFill} />;
  }

  const skyId = `sky-${uid}`;
  const haloId = `halo-${uid}`;
  const coreId = `core-${uid}`;
  const orb = atmosphere.orb;
  const ox = orb ? orb.cx * width : 0;
  const oy = orb ? orb.cy * height : 0;
  const coreR = orb ? orb.r * width : 0;
  const haloR = coreR * 2.7;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none">
      <Defs>
        <LinearGradient id={skyId} x1="0%" y1="0%" x2="0%" y2="100%">
          {atmosphere.skyStops.map((s, i) => (
            <Stop
              key={i}
              offset={s.offset}
              stopColor={s.color}
              stopOpacity={1}
            />
          ))}
        </LinearGradient>
        {orb ? (
          <>
            <RadialGradient
              id={haloId}
              cx={ox}
              cy={oy}
              r={haloR}
              gradientUnits="userSpaceOnUse">
              <Stop offset={0} stopColor={orb.glow} stopOpacity={1} />
              <Stop offset={0.6} stopColor={orb.glow} stopOpacity={0.35} />
              <Stop offset={1} stopColor={orb.glow} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id={coreId}
              cx={ox}
              cy={oy}
              r={coreR}
              gradientUnits="userSpaceOnUse">
              <Stop offset={0} stopColor={orb.color} stopOpacity={1} />
              <Stop offset={0.7} stopColor={orb.color} stopOpacity={0.95} />
              <Stop offset={1} stopColor={orb.color} stopOpacity={0} />
            </RadialGradient>
          </>
        ) : null}
      </Defs>

      <Rect x={0} y={0} width={width} height={height} fill={`url(#${skyId})`} />
      {orb ? (
        <>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${haloId})`}
          />
          <Circle cx={ox} cy={oy} r={coreR} fill={`url(#${coreId})`} />
        </>
      ) : null}
    </Svg>
  );
}

export const PrayerSky = memo(PrayerSkyBase);
