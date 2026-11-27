import { describe, expect, it } from 'vitest';
import type { PlacedItem } from '../types';
import { sortPlacedItemsForRender } from './renderOrder';

function item(id: string, assetId: string, gridY: number): PlacedItem {
  return { id, assetId, gridY, gridX: 8 } as PlacedItem;
}

describe('building render order', () => {
  it('sorts by baseY, then layer_bias, then placement order', () => {
    const house = item('house', 'cottage', 6);
    const treeBehind = item('tree-behind', 'apple_tree', 5);
    const treeSameRow = item('tree-same-row', 'apple_tree', 6);
    const decal = item('decal', 'picnic_mat', 6);
    expect(sortPlacedItemsForRender([house, treeSameRow, decal, treeBehind]).map(({ id }) => id)).toEqual([
      'tree-behind', 'decal', 'house', 'tree-same-row',
    ]);
  });

  it('keeps placement order when both configured keys match', () => {
    expect(sortPlacedItemsForRender([item('first', 'apple_tree', 5), item('second', 'cherry_tree', 5)]).map(({ id }) => id)).toEqual(['first', 'second']);
  });

  it('moves an editing draft behind or in front without changing saved coordinates', () => {
    const house = item('house', 'cottage', 6);
    const tree = item('tree', 'apple_tree', 7);
    const items = [house, tree];
    expect(sortPlacedItemsForRender(items, { id: tree.id, gridY: 5 })).toEqual([tree, house]);
    expect(sortPlacedItemsForRender(items, { id: tree.id, gridY: 7 })).toEqual([house, tree]);
    expect(tree.gridY).toBe(7);
  });
});
