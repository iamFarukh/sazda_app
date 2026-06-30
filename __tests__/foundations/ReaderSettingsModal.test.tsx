import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ReaderSettingsModal } from '../../src/screens/quran/components/ReaderSettingsModal';

describe('ReaderSettingsModal', () => {
  it('renders and wires theme + size changes through clamp', () => {
    const setTheme = jest.fn(); const setScale = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ReaderSettingsModal visible theme="light" fontScale={1}
          onClose={jest.fn()} onSetTheme={setTheme} onSetFontScale={setScale} />,
      );
    });
    act(() => tree!.root.findByProps({ testID: 'theme-dark' }).props.onPress());
    expect(setTheme).toHaveBeenCalledWith('dark');
    act(() => tree!.root.findByProps({ testID: 'size-inc' }).props.onPress());
    expect(setScale).toHaveBeenCalled();
    const passed = setScale.mock.calls[0][0];
    expect(passed).toBeGreaterThanOrEqual(0.85);
    expect(passed).toBeLessThanOrEqual(1.6);
    act(() => tree!.unmount());
  });
});
