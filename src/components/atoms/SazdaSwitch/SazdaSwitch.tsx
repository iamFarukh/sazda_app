import { Switch } from 'react-native';
import type { SwitchProps } from 'react-native';
import { hapticSelection } from '../../../utils/appHaptics';

/**
 * Drop-in replacement for React Native's `Switch` that fires a selection haptic on every
 * toggle. The native `Switch` emits no app-level haptic and the OS vibration is
 * inconsistent across devices — this gives every toggle the same crisp tactile confirm.
 *
 * Fully API-compatible: pass `value`, `onValueChange`, `trackColor`, `thumbColor`, etc.
 * exactly as before. Honors `disabled` (no haptic when disabled).
 */
export function SazdaSwitch({ onValueChange, disabled, ...props }: SwitchProps) {
  return (
    <Switch
      {...props}
      disabled={disabled}
      onValueChange={value => {
        if (!disabled) hapticSelection();
        onValueChange?.(value);
      }}
    />
  );
}
