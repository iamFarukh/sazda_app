import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SazdaIcon } from '../../atoms/SazdaIcon/SazdaIcon';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { radius } from '../../../theme/radius';
import { headerGlassBackground } from '../../../theme/themeSurfaces';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  title: string;
  subtitle?: ReactNode;
  leftIconName?: string;
  onPressLeft?: () => void;
  rightIconName?: string;
  onPressRight?: () => void;
  avatarUri?: string;
  glass?: boolean;
};

export function HeaderBar({
  title,
  subtitle,
  leftIconName,
  onPressLeft,
  rightIconName,
  onPressRight,
  avatarUri,
  glass = true,
}: Props) {
  const { colors: c, scheme } = useThemePalette();

  return (
    <View
      style={[
        styles.root,
        glass ? { backgroundColor: headerGlassBackground(scheme) } : { backgroundColor: c.surface },
      ]}>
      <View style={styles.left}>
        {leftIconName ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressLeft}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <SazdaIcon name={leftIconName} size={20} color={c.primary} fill={0} />
          </Pressable>
        ) : null}

        <View style={styles.titleWrap}>
          <SazdaText variant="headlineLarge" color={c.primary}>
            {title}
          </SazdaText>
          {subtitle ? <View>{subtitle}</View> : null}
        </View>
      </View>

      <View style={styles.right}>
        {rightIconName ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressRight}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <SazdaIcon name={rightIconName} size={20} color={c.primary} fill={0} />
          </Pressable>
        ) : null}

        {avatarUri ? (
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarFallback, { backgroundColor: c.surfaceContainerHighest }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 64,
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.85 },
  titleWrap: { flexShrink: 1 },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  avatarFallback: {
    flex: 1,
  },
});
