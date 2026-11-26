import { describe, expect, it } from 'vitest';
import type { PlacedItem } from '../types';
import { validatePlacement } from './placement';

const placed: PlacedItem = {
  id: 'existing',
  type: 'placeholder-tree',
  assetId: 'tree_round',
  gridX: 6,
  gridY: 5,
  footprint: { width: 2, height: 2 },
  x: 308,
  y: 264,
  taskId: 'book',
  taskName: '读绘本',
  minutes: 5,
  createdAt: '2026-11-20T00:00:00.000Z',
  mapVersion: 2,
};

describe('orthogonal footprint placement', () => {
  it('accepts a free 2x2 grass footprint on the initial island', () => {
    expect(validatePlacement({ assetId: 'tree_round', gridX: 6, gridY: 5, stage: 0, items: [] }).valid).toBe(true);
  });

  it('rejects water and overlap with placed items', () => {
    expect(validatePlacement({ assetId: 'tree_round', gridX: 0, gridY: 0, stage: 0, items: [] }).reason).toBe('outside-map');
    expect(validatePlacement({ assetId: 'tree_round', gridX: 6, gridY: 5, stage: 0, items: [placed] }).reason).toBe('overlap');
  });

  it.each([[8, 4], [12, 6]])('allows building on former starter landmark cells (%i, %i)', (gridX, gridY) => {
    expect(validatePlacement({ assetId: 'tree_round', gridX, gridY, stage: 0, items: [] }).valid).toBe(true);
  });

  it('enforces terrain constraints on stage 2 tiles', () => {
    expect(validatePlacement({ assetId: 'tree_round', gridX: 2, gridY: 2, stage: 2, items: [] }).reason).toBe('wrong-terrain');
    expect(validatePlacement({ assetId: 'beach_umbrella', gridX: 2, gridY: 2, stage: 2, items: [] }).valid).toBe(true);
    expect(validatePlacement({ assetId: 'waterfall_rocks', gridX: 17, gridY: 9, stage: 2, items: [] }).valid).toBe(true);
  });
});
