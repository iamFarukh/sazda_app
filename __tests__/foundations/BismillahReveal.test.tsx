import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import {
  BismillahReveal,
  bismillahRevealPlan,
} from '../../src/components/atoms/BismillahReveal/BismillahReveal';

describe('BismillahReveal', () => {
  it('reveal plan is instant under reduce-motion, timed otherwise', () => {
    expect(bismillahRevealPlan(true).durationMs).toBe(0);
    expect(bismillahRevealPlan(false).durationMs).toBeGreaterThan(0);
  });

  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<BismillahReveal reduceMotion />);
    });
    expect(tree!.toJSON()).toBeTruthy();
    act(() => tree!.unmount());
  });
});
