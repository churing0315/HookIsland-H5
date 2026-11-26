import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { drawBuildingReward } from '../domain/buildingRewards';
import { findNearestValidPlacement } from '../domain/placement';
import { emptyData, saveGameData } from '../storage';
import { GameFlow } from './GameFlow';

const tiers = [
  [5, 1, 22], [10, 2, 19], [15, 3, 19], [20, 4, 4],
] as const;

describe('building rewards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      setInterval, clearInterval, setTimeout, clearTimeout,
      localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(tiers)('awards and saves a %i-minute tier-%i building', (minutes, tier, count) => {
    const pool = REWARD_BUILDINGS.filter((reward) => reward.minutes === minutes);
    expect(pool).toHaveLength(count);
    expect(new Set(pool.map((reward) => reward.id)).size).toBe(count);
    for (const reward of pool) {
      expect(findNearestValidPlacement(reward.id, 6, 4, 0, [])).not.toBeNull();
    }

    const flow = new GameFlow();
    flow.openTaskSelect();
    flow.selectMinutes(minutes);
    expect(flow.confirmContract()).toBe(true);
    expect(flow.getSnapshot().screen).toBe('ritual');
    expect(flow.completeRitual()).toBe(true);
    vi.advanceTimersByTime(minutes * 60_000 + 3_000);
    const { selectedAssetId, screen } = flow.getSnapshot();
    expect(screen).toBe('build');
    expect(REWARD_BUILDINGS.find((reward) => reward.id === selectedAssetId)?.tier).toBe(tier);
    const id = selectedAssetId!;
    const position = findNearestValidPlacement(id, 6, 4, 0, [])!;
    flow.commitPlacement(id, 0, 0);
    flow.commitPlacement('tree_round', position.x, position.y);
    expect(flow.getSnapshot().data.placedItems).toHaveLength(0);
    flow.commitPlacement(id, position.x, position.y);
    expect(new GameFlow().getSnapshot().data.placedItems).toEqual([
      expect.objectContaining({ assetId: id, minutes, gridX: position.x, gridY: position.y }),
    ]);
    flow.destroy();
  });

  it('keeps the fourth completion medal-only', () => {
    const data = emptyData();
    data.daily.planted = 3;
    data.daily.completed = 3;
    saveGameData(data);
    const flow = new GameFlow();
    flow.openTaskSelect();
    flow.selectMinutes(5);
    flow.confirmContract();
    flow.completeRitual();
    vi.advanceTimersByTime(300_000);
    expect(flow.getSnapshot()).toMatchObject({ celebrationKind: 'medal', selectedAssetId: null });
    vi.advanceTimersByTime(3_000);
    expect(flow.getSnapshot()).toMatchObject({ screen: 'island', data: { daily: { planted: 3, bonusMedalAwarded: true } } });
    flow.destroy();
  });

  it('does not fall back to a different tier on a crowded island', () => {
    const occupied = { gridX: 6, gridY: 3, footprint: { width: 10, height: 8 } };
    expect(drawBuildingReward(20, 0, [occupied as Parameters<typeof drawBuildingReward>[2][number]])).toBeNull();
  });
});
