import { describe, expect, it } from 'vitest';
import { ASSET_CATALOG } from '../data/assetCatalog';
import { MAP_STAGE_THRESHOLDS, stageForTotalPlaced } from './IslandExpansionService';
import { getMapStageConfig, getTile } from './mapConfig';

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

  it('contains computed sand at upper left and rock at lower right', () => {
    expect(getTile(2, 2, 2)?.terrain).toBe('sand');
    expect(getTile(2, 18, 10)?.terrain).toBe('rock');
    expect(getTile(1, 2, 2)).toBeUndefined();
  });

  it('keeps configurable 3/9 cumulative expansion thresholds', () => {
    expect(MAP_STAGE_THRESHOLDS).toEqual({ stage1TotalPlaced: 3, stage2TotalPlaced: 9 });
    expect(stageForTotalPlaced(2)).toBe(0);
    expect(stageForTotalPlaced(3)).toBe(1);
    expect(stageForTotalPlaced(9)).toBe(2);
  });

  it('tracks 36 replaceable assets with footprint and terrain metadata', () => {
    expect(ASSET_CATALOG).toHaveLength(36);
    expect(ASSET_CATALOG.some((asset) => asset.footprint.width === 4 && asset.footprint.height === 4)).toBe(true);
    expect(ASSET_CATALOG.every((asset) => asset.allowedTerrains.length > 0)).toBe(true);
  });
});
