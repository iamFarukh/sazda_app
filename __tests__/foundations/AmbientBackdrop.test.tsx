import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import {
  AmbientBackdrop,
  shouldRenderAmbientLottie,
} from '../../src/components/atoms/AmbientBackdrop/AmbientBackdrop';

describe('AmbientBackdrop', () => {
  it('renders Lottie only when ambient enabled AND a source is provided', () => {
    expect(shouldRenderAmbientLottie(true, { uri: 'x' })).toBe(true);
    expect(shouldRenderAmbientLottie(false, { uri: 'x' })).toBe(false);
    expect(shouldRenderAmbientLottie(true, undefined)).toBe(false);
  });

  it('renders without crashing in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <AmbientBackdrop scheme={scheme} ambientEnabled={false} />,
        );
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
