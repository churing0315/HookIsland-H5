import { DAILY_PLANT_LIMIT, STORAGE_KEY } from './config';
import type { PersistedGameData, PlacedItem } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function localDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function emptyData(now = new Date()): PersistedGameData {
  return {
    version: 1,
    daily: { dayKey: localDayKey(now), planted: 0 },
    placedItems: [],
  };
}

function normalize(value: unknown, now = new Date()): PersistedGameData {
  if (!value || typeof value !== 'object') return emptyData(now);
  const candidate = value as Partial<PersistedGameData>;
  const items = Array.isArray(candidate.placedItems)
    ? candidate.placedItems.filter((item): item is PlacedItem => {
        return Boolean(item && typeof item.id === 'string' && typeof item.x === 'number' && typeof item.y === 'number');
      })
    : [];
  const today = localDayKey(now);
  const storedDay = candidate.daily?.dayKey;
  const planted = storedDay === today ? Math.min(DAILY_PLANT_LIMIT, Math.max(0, Number(candidate.daily?.planted) || 0)) : 0;
  return {
    version: 1,
    daily: { dayKey: today, planted },
    placedItems: items,
  };
}

export function loadGameData(storage: StorageLike = window.localStorage, now = new Date()): PersistedGameData {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw), now) : emptyData(now);
  } catch {
    return emptyData(now);
  }
}

export function saveGameData(data: PersistedGameData, storage: StorageLike = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
