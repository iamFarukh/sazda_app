import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { SazdaText } from '../../atoms/SazdaText/SazdaText';
import { useNavigateMainTab } from '../../../navigation/useNavigateMainTab';
import { useOpenDrawer } from '../../../navigation/useOpenDrawer';
import { useProfileStore } from '../../../store/profileStore';
import { radius } from '../../../theme/radius';
import { spacing } from '../../../theme/spacing';
import type { AppPalette } from '../../../theme/useThemePalette';
import type { ResolvedScheme } from '../../../theme/useThemePalette';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  /** Replace default profile avatar (e.g. Settings on Profile tab). */
  rightAccessory?: ReactNode;
  /** Tighter bottom padding when a location row sits directly below (e.g. Home). */
  denseBottom?: boolean;
};

/**
 * Shared top bar for main tab “landing” screens: menu · Sazda · profile (or custom right).
 */
export function TabLandingHeader({ rightAccessory, denseBottom }: Props) {
  const { colors: c, scheme } = useThemePalette();
  const styles = useMemo(
    () => createStyles(c, scheme, !!denseBottom),
    [c, scheme, denseBottom],
  );
  const openDrawer = useOpenDrawer();
  const goTab = useNavigateMainTab();
  const displayName = useProfileStore(s => s.displayName);
  const initial =
    displayName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}>
        <Menu size={22} color={c.primary} strokeWidth={2} />
      </Pressable>
      <SazdaText variant="titleSm" color="primary" style={styles.brand}>
        Sazda
      </SazdaText>
      {rightAccessory ? (
        <View style={styles.rightSlot}>{rightAccessory}</View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => goTab('ProfileTab')}
          style={styles.avatarOuter}>
          <View style={styles.avatarInner}>
            <SazdaText variant="caption" color="onSurfaceVariant" style={styles.avatarLetter}>
              {initial}
            </SazdaText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(c: AppPalette, _scheme: ResolvedScheme, denseBottom: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      /** Horizontal inset comes from parent `ScrollView` / wrapper so menu aligns with page titles. */
      paddingHorizontal: 0,
      paddingTop: denseBottom ? spacing.xxs : spacing.sm,
      paddingBottom: denseBottom ? spacing.xxs : spacing.sm,
      minHeight: denseBottom ? 44 : 56,
    },
    iconHit: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.85 },
    brand: {
      fontStyle: 'italic',
      letterSpacing: -0.3,
    },
    rightSlot: {
      minWidth: 40,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarOuter: {
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.secondaryContainer,
      overflow: 'hidden',
    },
    avatarInner: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surfaceContainerHighest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontWeight: '700',
    },
  });
}
