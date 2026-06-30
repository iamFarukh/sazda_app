import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import {
  GoldBloom,
  bloomDurationMs,
} from '../../src/components/atoms/GoldBloom/GoldBloom';

describe('GoldBloom', () => {
  it('duration is 0 under reduce-motion, 1-2s otherwise', () => {
    expect(bloomDurationMs(true)).toBe(0);
    const d = bloomDurationMs(false);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThanOrEqual(2000);
  });

  it('calls onFinish immediately under reduce-motion', () => {
    const onFinish = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GoldBloom reduceMotion onFinish={onFinish} />);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    act(() => tree!.unmount());
  });
});
