import { describe, expect, it } from 'vitest';
import { emptyData, loadGameData, localDayKey, saveGameData, type StorageLike } from './storage';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('local persistence', () => {
  it('creates a stable local day key', () => {
    expect(localDayKey(new Date(2026, 10, 20, 12, 0, 0))).toBe('2026-11-20');
  });

  it('round-trips placed items', () => {
    const storage = new MemoryStorage();
    const now = new Date(2026, 10, 20, 12, 0, 0);
    const data = emptyData(now);
    data.daily.planted = 1;
    data.placedItems.push({
      id: 'tree-1',
      type: 'placeholder-tree',
      x: 400,
      y: 200,
      taskId: 'book',
      taskName: '读绘本',
      minutes: 5,
      createdAt: now.toISOString(),
    });
    saveGameData(data, storage);
    const restored = loadGameData(storage, now);
    expect(restored.daily.planted).toBe(1);
    expect(restored.placedItems).toHaveLength(1);
  });

  it('resets only daily progress on a new day', () => {
    const storage = new MemoryStorage();
    const oldDay = new Date(2026, 10, 19, 12, 0, 0);
    const data = emptyData(oldDay);
    data.daily.planted = 4;
    saveGameData(data, storage);
    expect(loadGameData(storage, new Date(2026, 10, 20, 8, 0, 0)).daily.planted).toBe(0);
  });
});
