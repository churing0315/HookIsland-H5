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

  it('restores the reward at the end cue and settles exactly once', async () => {
    const flow = new GameFlow();
    flow.setGuide({ step: 4, completed: false, taskId: 'book', minutes: 5 });
    flow.openTaskSelect();
    flow.selectMinutes(5);
    flow.confirmContract();
    flow.completeRitual();
    flow.setBeforeSettlement(() => new Promise(() => undefined));
    vi.advanceTimersByTime(5 * 60_000);
    expect(flow.getSnapshot()).toMatchObject({ screen: 'focus', data: { guide: { step: 6 } } });
    const [reward] = flow.getSnapshot().data.storedBuildings;
    flow.destroy();

    const resumed = new GameFlow();
    let endCue!: () => void;
    resumed.setBeforeSettlement(() => new Promise<void>(resolve => { endCue = resolve; }));
    vi.advanceTimersByTime(100);
    expect(resumed.getSnapshot().data.storedBuildings).toHaveLength(1);
    endCue();
    await Promise.resolve();
    expect(resumed.getSnapshot()).toMatchObject({
      screen: 'celebration', selectedBuildingId: reward.id, data: { guide: { step: 7 } },
    });
    expect(resumed.placeStoredBuilding(reward.id)).toBe(true);
    const restoredBuild = new GameFlow();
    expect(restoredBuild.getSnapshot()).toMatchObject({ screen: 'build', selectedBuildingId: reward.id });
    const position = findNearestValidPlacement(reward.assetId, 8, 5, 0, [])!;
    restoredBuild.commitPlacement(reward.assetId, position.x, position.y);
    expect(new GameFlow().getSnapshot()).toMatchObject({
      screen: 'island', data: { guide: { step: 9, buildingId: reward.id }, totalPlaced: 1 },
    });
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
    vi.advanceTimersByTime(minutes * 60_000);
    const { selectedAssetId, selectedBuildingId, screen } = flow.getSnapshot();
    expect(screen).toBe('celebration');
    expect(REWARD_BUILDINGS.find((reward) => reward.id === selectedAssetId)?.tier).toBe(tier);
    expect(flow.placeStoredBuilding(selectedBuildingId!)).toBe(true);
    expect(flow.getSnapshot().screen).toBe('build');
    flow.returnToIsland();
    expect(flow.getSnapshot().data.storedBuildings).toEqual([expect.objectContaining({ id: selectedBuildingId })]);
    expect(flow.placeStoredBuilding(selectedBuildingId!)).toBe(true);
    const id = selectedAssetId!;
    const position = findNearestValidPlacement(id, 6, 4, 0, [])!;
    flow.commitPlacement(id, 0, 0);
    flow.commitPlacement('tree_round', position.x, position.y);
    expect(flow.getSnapshot().data.placedItems).toHaveLength(0);
    flow.commitPlacement(id, position.x, position.y);
    expect(flow.getSnapshot().data.storedBuildings).toEqual([]);
    expect(new GameFlow().getSnapshot().data.placedItems).toEqual([
      expect.objectContaining({ assetId: id, gridX: position.x, gridY: position.y }),
    ]);
    flow.destroy();
  });

  it('saves the fourth reward before leaving settlement and places it after reloading', () => {
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
    expect(flow.getSnapshot()).toMatchObject({ screen: 'celebration', data: { daily: { planted: 3, completed: 4 } } });
    flow.returnToIsland();
    const reloaded = new GameFlow();
    const [building] = reloaded.getSnapshot().data.storedBuildings;
    expect(reloaded.placeStoredBuilding(building.id)).toBe(true);
    const position = findNearestValidPlacement(building.assetId, 6, 4, 0, [])!;
    reloaded.commitPlacement(building.assetId, position.x, position.y);
    expect(reloaded.getSnapshot().data.daily.planted).toBe(4);
    expect(reloaded.getSnapshot().data.storedBuildings).toEqual([]);
    reloaded.destroy();
    flow.destroy();
  });

  it('guarantees a reward of the right tier even without space to place it', () => {
    const data = emptyData();
    data.placedItems.push({ id: 'blocker', assetId: 'tree_round', gridX: 6, gridY: 3, footprint: { width: 10, height: 8 } } as typeof data.placedItems[number]);
    const id = drawBuildingReward(20, 0, data.placedItems);
    expect(REWARD_BUILDINGS.find((reward) => reward.id === id)?.tier).toBe(4);
    expect(findNearestValidPlacement(id, 6, 4, 0, data.placedItems)).toBeNull();
  });

  it('persists unread state, edits an existing building and re-places it without counting twice', () => {
    const flow = new GameFlow();
    flow.openTaskSelect();
    flow.selectMinutes(5);
    flow.confirmContract();
    flow.completeRitual();
    vi.advanceTimersByTime(300_000);
    flow.returnToIsland();
    const [reward] = flow.getSnapshot().data.storedBuildings;
    expect(reward.unread).toBe(true);
    flow.markBuildingStorageRead();
    expect(new GameFlow().getSnapshot().data.storedBuildings[0].unread).toBe(false);
    expect(flow.placeStoredBuilding(reward.id)).toBe(true);
    flow.commitPlacement(reward.assetId, 8, 5);
    expect(flow.editPlacedBuilding(reward.id, 0, 0, true)).toBe(false);
    expect(flow.editPlacedBuilding(reward.id, 10, 5, true)).toBe(true);
    expect(new GameFlow().getSnapshot().data.placedItems).toMatchObject([{ id: reward.id, gridX: 10, gridY: 5 }]);
    flow.storePlacedBuilding(reward.id, true);
    expect(flow.getSnapshot().data.placedItems).toHaveLength(0);
    expect(flow.getSnapshot().data.storedBuildings[0]).toMatchObject({ id: reward.id, flipped: true, previouslyPlaced: true, unread: false });
    expect(flow.placeStoredBuilding(reward.id)).toBe(true);
    flow.commitPlacement(reward.assetId, 11, 5);
    expect(flow.getSnapshot().data).toMatchObject({ totalPlaced: 1, daily: { planted: 1 }, storedBuildings: [], placedItems: [{ id: reward.id, flipped: true }] });
    flow.destroy();
  });
});
