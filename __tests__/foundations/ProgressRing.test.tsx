import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import { ProgressRing } from '../../src/components/atoms/ProgressRing/ProgressRing';

describe('ProgressRing', () => {
  it('renders without crashing at various progress values', () => {
    for (const p of [0, 0.5, 1]) {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ProgressRing progress={p} />);
      });
      expect(tree!.toJSON()).toBeTruthy();
      act(() => tree!.unmount());
    }
  });
});
