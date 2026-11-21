import { describe, expect, it } from 'vitest';
import { isPointOnGrass, isValidPlacement } from './placement';
import type { PlacedItem } from '../types';

const placed: PlacedItem = {
  id: 'existing',
  type: 'placeholder-tree',
  x: 406,
  y: 205,
  taskId: 'book',
  taskName: '读绘本',
  minutes: 5,
  createdAt: '2026-11-20T00:00:00.000Z',
};

describe('placement rules', () => {
  it('accepts the center grass area', () => {
    expect(isPointOnGrass(406, 205)).toBe(true);
  });

  it('rejects water and tray positions', () => {
    expect(isPointOnGrass(40, 40)).toBe(false);
    expect(isPointOnGrass(100, 332)).toBe(false);
  });

  it('rejects overlap and accepts a separated grass point', () => {
    expect(isValidPlacement(412, 208, [placed])).toBe(false);
    expect(isValidPlacement(520, 205, [placed])).toBe(true);
  });
});
