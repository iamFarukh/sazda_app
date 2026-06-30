import { memo, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { getAmbientGradient } from '../../../theme/gradients';
import type { ResolvedScheme } from '../../../theme/useThemePalette';

type LottieSource = ComponentProps<typeof LottieView>['source'];

type Props = {
  scheme: ResolvedScheme;
  /** Pass the resolved value from useAmbientEnabled(). */
  ambientEnabled: boolean;
  /** Optional ambient Lottie layered over the gradient (e.g. particles, rays). */
  lottieSource?: LottieSource;
  /** Lottie opacity (kept low so it stays ambient, never wallpaper). */
  lottieOpacity?: number;
};

/** Decision rule (exported for tests): only show Lottie when enabled and a source exists. */
export function shouldRenderAmbientLottie(
  ambientEnabled: boolean,
  lottieSource: LottieSource | undefined,
): boolean {
  return ambientEnabled && !!lottieSource;
}

/** Soft gradient wash + optional ambient Lottie. Sits behind reading content. */
export const AmbientBackdrop = memo(function AmbientBackdrop({
  scheme,
  ambientEnabled,
  lottieSource,
  lottieOpacity = 0.5,
}: Props) {
  const grad = getAmbientGradient(scheme);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ambient" cx="50%" cy="0%" r="90%">
            {grad.colors.map((color, i) => (
              <Stop
                key={i}
                offset={grad.locations ? grad.locations[i] : i / (grad.colors.length - 1)}
                stopColor={color}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ambient)" />
      </Svg>
      {shouldRenderAmbientLottie(ambientEnabled, lottieSource) ? (
        <LottieView
          source={lottieSource as LottieSource}
          autoPlay
          loop
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: lottieOpacity }]}
        />
      ) : null}
    </View>
  );
});
