import { DAILY_FOCUS_LIMIT, DAILY_PLANT_LIMIT, STORAGE_KEY } from './config';
import { getAsset } from './data/assetCatalog';
import { findNearestValidPlacement } from './domain/placement';
import { resolveStoredMapStage, unlockedTileSets } from './map/IslandExpansionService';
import { getMapStageConfig, gridToWorldCenter } from './map/mapConfig';
import type { PersistedGameData, PlacedItem } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object');
}

export function localDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function emptyData(now = new Date()): PersistedGameData {
  return {
    version: 2,
    schemaVersion: 2,
    mapVersion: 2,
    mapStage: 0,
    unlockedTileSet: ['stage-0'],
    totalPlaced: 0,
    daily: {
      dayKey: localDayKey(now),
      planted: 0,
      completed: 0,
      bonusMedalAwarded: false,
    },
    placedItems: [],
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function finite(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function legacyGridTarget(x: number, y: number): { x: number; y: number } {
  const bounds = getMapStageConfig(0).bounds;
  const normalizedX = Math.max(0, Math.min(1, (x - 142) / 528));
  const normalizedY = Math.max(0, Math.min(1, (y - 107) / 196));
  return {
    x: Math.round(bounds.minX + normalizedX * (bounds.maxX - bounds.minX - 1)),
    y: Math.round(bounds.minY + normalizedY * (bounds.maxY - bounds.minY - 1)),
  };
}

function normalizeItems(value: unknown): PlacedItem[] {
  if (!Array.isArray(value)) return [];
  const normalized: PlacedItem[] = [];

  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== 'string') continue;
    const assetId = text(raw.assetId, 'tree_round');
    const asset = getAsset(assetId);
    let gridX = finite(raw.gridX, Number.NaN);
    let gridY = finite(raw.gridY, Number.NaN);
    let legacyPosition: { x: number; y: number } | undefined;

    if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) {
      const oldX = finite(raw.x, 406);
      const oldY = finite(raw.y, 205);
      legacyPosition = { x: oldX, y: oldY };
      const target = legacyGridTarget(oldX, oldY);
      const nearest = findNearestValidPlacement(assetId, target.x, target.y, 0, normalized);
      gridX = nearest?.x ?? target.x;
      gridY = nearest?.y ?? target.y;
    }

    const center = gridToWorldCenter(gridX, gridY, asset.footprint);
    normalized.push({
      id: raw.id,
      type: text(raw.type, asset.runtimeTextureKey),
      assetId,
      gridX,
      gridY,
      footprint: asset.footprint,
      x: center.x,
      y: center.y,
      taskId: text(raw.taskId, 'legacy'),
      taskName: text(raw.taskName, '旧版约定'),
      minutes: Math.max(0, finite(raw.minutes, 0)),
      createdAt: text(raw.createdAt, new Date(0).toISOString()),
      mapVersion: 2,
      legacyPosition: isRecord(raw.legacyPosition)
        ? {
            x: finite(raw.legacyPosition.x, finite(raw.x, center.x)),
            y: finite(raw.legacyPosition.y, finite(raw.y, center.y)),
          }
        : legacyPosition,
    });
  }
  return normalized;
}

export function normalizeGameData(value: unknown, now = new Date()): PersistedGameData {
  if (!isRecord(value)) return emptyData(now);
  const items = normalizeItems(value.placedItems);
  const today = localDayKey(now);
  const daily = isRecord(value.daily) ? value.daily : {};
  const storedDay = daily.dayKey;
  const sameDay = storedDay === today;
  const rawPlanted = sameDay ? Math.max(0, finite(daily.planted, 0)) : 0;
  const planted = Math.min(DAILY_PLANT_LIMIT, rawPlanted);
  const completed = sameDay
    ? Math.min(DAILY_FOCUS_LIMIT, Math.max(planted, finite(daily.completed, rawPlanted)))
    : 0;
  const bonusMedalAwarded = sameDay
    ? Boolean(daily.bonusMedalAwarded) || rawPlanted > DAILY_PLANT_LIMIT || completed >= DAILY_FOCUS_LIMIT
    : false;
  const totalPlaced = Math.max(items.length, finite(value.totalPlaced, items.length));
  const mapStage = resolveStoredMapStage(value.mapStage, totalPlaced);

  return {
    version: 2,
    schemaVersion: 2,
    mapVersion: 2,
    mapStage,
    unlockedTileSet: unlockedTileSets(mapStage),
    totalPlaced,
    daily: { dayKey: today, planted, completed, bonusMedalAwarded },
    placedItems: items,
  };
}

export function loadGameData(storage: StorageLike = window.localStorage, now = new Date()): PersistedGameData {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? normalizeGameData(JSON.parse(raw), now) : emptyData(now);
  } catch {
    return emptyData(now);
  }
}

export function saveGameData(data: PersistedGameData, storage: StorageLike = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
