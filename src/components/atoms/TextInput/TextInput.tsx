import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  Text,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { inputFocusBorder, inputFocusHaloOuter } from '../../../theme/themeSurfaces';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = Omit<RNTextInputProps, 'style'> & {
  left?: ReactNode;
  right?: ReactNode;
  error?: string;
  containerStyle?: RNTextInputProps['style'];
  /** Tighter vertical padding + shorter min height (e.g. landing search). */
  density?: 'default' | 'compact';
};

/** Outer ring width + inset — kept constant so focus does not resize the field (avoids layout jump). */
const RING = 2;

export function TextInput({
  left,
  right,
  error,
  containerStyle,
  density = 'default',
  onFocus,
  onBlur,
  ...props
}: Props) {
  const { colors: c, scheme } = useThemePalette();
  const [focused, setFocused] = useState(false);
  const compact = density === 'compact';

  const haloColor = inputFocusHaloOuter(scheme);
  const restingRing = inputFocusBorder({ primary: c.primary }, scheme);
  const ringColor = error ? c.error : focused ? haloColor : restingRing;

  const inputStyle = useMemo(() => {
    return [
      styles.input,
      compact && styles.inputCompact,
      { color: c.onSurface },
      containerStyle,
      props.editable === false ? styles.disabled : null,
    ];
  }, [compact, containerStyle, props.editable, c.onSurface]);

  return (
    <View>
      <View
        style={[
          styles.haloWrap,
          {
            borderRadius: radius.full,
            borderWidth: RING,
            borderColor: ringColor,
            padding: RING,
          },
        ]}>
        <View
          style={[
            styles.container,
            compact && styles.containerCompact,
            {
              borderRadius: radius.full,
              backgroundColor: c.surfaceContainerLow,
              minHeight: compact ? 40 : 48,
            },
          ]}>
          {left ? <View style={styles.side}>{left}</View> : null}
          <RNTextInput
            {...props}
            style={inputStyle}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholderTextColor={c.onSurfaceVariant}
            underlineColorAndroid="transparent"
          />
          {right ? <View style={styles.side}>{right}</View> : null}
        </View>
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: c.error }]} numberOfLines={2}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  haloWrap: {
    alignSelf: 'stretch',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  containerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'transparent',
    ...typography.body,
  },
  inputCompact: {
    paddingVertical: 2,
    minHeight: 34,
    fontSize: 15,
    lineHeight: 20,
  },
  side: {
    marginHorizontal: spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    ...typography.caption,
  },
});
