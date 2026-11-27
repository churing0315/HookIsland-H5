import { describe, expect, it } from 'vitest';
import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { MAP_STAGE_THRESHOLDS, stageForTotalPlaced } from './IslandExpansionService';
import { getMapStageConfig, getTile, gridToWorldAnchor, TILE_SIZE, worldToGrid } from './mapConfig';

describe('island map stages', () => {
  it('only adds tiles as the island expands', () => {
    const stage0 = getMapStageConfig(0);
    const stage1 = getMapStageConfig(1);
    const stage2 = getMapStageConfig(2);
    expect(stage1.tiles.length).toBeGreaterThan(stage0.tiles.length);
    expect(stage2.tiles.length).toBeGreaterThan(stage1.tiles.length);
    expect(stage0.tiles.every((tile) => stage1.tileKeys.has(tile.x + ',' + tile.y))).toBe(true);
    expect(stage1.tiles.every((tile) => stage2.tileKeys.has(tile.x + ',' + tile.y))).toBe(true);
  });

  it('uses a boolean unlock mask without terrain types', () => {
    expect(getTile(2, 2, 2)).toMatchObject({ x: 2, y: 2, unlockedAt: 2 });
    expect(getTile(2, 18, 10)).toMatchObject({ x: 18, y: 10, unlockedAt: 2 });
    expect(getTile(1, 2, 2)).toBeUndefined();
  });

  it('round-trips the configured bottom-center anchor through grid snapping', () => {
    const footprint = { width: 3, height: 1 };
    const anchor = gridToWorldAnchor(8, 6, footprint);
    expect(anchor).toEqual({ x: (8 + 1.5) * TILE_SIZE, y: 7 * TILE_SIZE });
    expect(worldToGrid(anchor.x, anchor.y, footprint)).toEqual({ x: 8, y: 6 });
  });

  it('keeps configurable 3/9 cumulative expansion thresholds', () => {
    expect(MAP_STAGE_THRESHOLDS).toEqual({ stage1TotalPlaced: 3, stage2TotalPlaced: 9 });
    expect(stageForTotalPlaced(2)).toBe(0);
    expect(stageForTotalPlaced(3)).toBe(1);
    expect(stageForTotalPlaced(9)).toBe(2);
  });

  it('tracks all 64 configured assets on the 32px grid', () => {
    expect(REWARD_BUILDINGS).toHaveLength(64);
    expect(REWARD_BUILDINGS.every((asset) => asset.terrain[0] === 'unlocked')).toBe(true);
    expect(new Set(REWARD_BUILDINGS.map((asset) => `${asset.footprint.width}x${asset.footprint.height}`))).toEqual(new Set(['1x1', '2x1', '3x1']));
  });
});
