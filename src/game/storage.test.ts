import { describe, expect, it } from 'vitest';
import { emptyData, loadGameData, localDayKey, normalizeGameData, saveGameData, type StorageLike } from './storage';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  raw(key: string): string | null {
    return this.getItem(key);
  }
}

describe('V2 local persistence and migration', () => {
  it('initializes older saves and keeps active progress even after the first placement', () => {
    expect(normalizeGameData({}).guide).toEqual({ step: 0, completed: false });
    expect(normalizeGameData({ totalPlaced: 1 }).guide).toEqual({ step: 12, completed: true });
    expect(normalizeGameData({ totalPlaced: 1, guide: { step: 9, completed: false, buildingId: 'tree' } }).guide)
      .toEqual({ step: 9, completed: false, buildingId: 'tree' });
    expect(normalizeGameData({ guide: { step: -8, completed: false } }).guide).toEqual({ step: 0, completed: false });
  });

  it('creates a stable local day key', () => {
    expect(localDayKey(new Date(2026, 10, 20, 12, 0, 0))).toBe('2026-11-20');
  });

  it('round-trips map stage and grid items', () => {
    const storage = new MemoryStorage();
    const now = new Date(2026, 10, 20, 12, 0, 0);
    const data = emptyData(now);
    data.daily.planted = 1;
    data.totalPlaced = 1;
    data.placedItems.push({
      id: 'tree-1',
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
      createdAt: now.toISOString(),
      mapVersion: 2,
    });
    saveGameData(data, storage);
    expect(JSON.parse(storage.raw('lagou-island.prototype.v1')!).placedItems[0]).toEqual({
      id: 'tree-1', asset_id: 'tree_round', gridX: 6, gridY: 5, placed_at: now.toISOString(),
    });
    const restored = loadGameData(storage, now);
    expect(restored.version).toBe(2);
    expect(restored.placedItems[0].gridX).toBe(6);
    expect(restored.totalPlaced).toBe(1);
  });

  it('migrates V1 screen coordinates without dropping the item', () => {
    const now = new Date(2026, 10, 20, 12, 0, 0);
    const migrated = normalizeGameData(
      {
        version: 1,
        daily: { dayKey: '2026-11-20', planted: 1 },
        placedItems: [
          {
            id: 'legacy-tree',
            type: 'placeholder-tree',
            x: 406,
            y: 205,
            taskId: 'book',
            taskName: '读绘本',
            minutes: 10,
            createdAt: now.toISOString(),
          },
        ],
      },
      now,
    );
    expect(migrated.placedItems).toHaveLength(1);
    expect(migrated.placedItems[0].legacyPosition).toEqual({ x: 406, y: 205 });
    expect(Number.isInteger(migrated.placedItems[0].gridX)).toBe(true);
  });

  it('returns saved buildings with any off-island footprint cell to storage', () => {
    const data = normalizeGameData({
      mapStage: 0,
      totalPlaced: 2,
      placedItems: [
        { id: 'tree', asset_id: 'apple_tree', gridX: 8, gridY: 5 },
        { id: 'house', asset_id: 'cottage', gridX: 15, gridY: 5 },
      ],
    });
    expect(data.placedItems.map(({ id }) => id)).toEqual(['tree']);
    expect(data.storedBuildings).toMatchObject([{ id: 'house', assetId: 'cottage', previouslyPlaced: true }]);
    expect(data.totalPlaced).toBe(2);
  });

  it('round-trips daily counts above the disabled placement limit', () => {
    const now = new Date(2026, 10, 20, 12, 0, 0);
    const migrated = normalizeGameData(
      { version: 1, daily: { dayKey: '2026-11-20', planted: 4 }, placedItems: [] },
      now,
    );
    expect(migrated.daily.planted).toBe(4);
    expect(migrated.daily.completed).toBe(4);
    expect(migrated.daily.bonusMedalAwarded).toBe(false);
  });

  it('resets only daily progress on a new day', () => {
    const storage = new MemoryStorage();
    const oldDay = new Date(2026, 10, 19, 12, 0, 0);
    const data = emptyData(oldDay);
    data.daily.planted = 3;
    data.totalPlaced = 3;
    saveGameData(data, storage);
    const restored = loadGameData(storage, new Date(2026, 10, 20, 8, 0, 0));
    expect(restored.daily.planted).toBe(0);
    expect(restored.totalPlaced).toBe(3);
  });
});
