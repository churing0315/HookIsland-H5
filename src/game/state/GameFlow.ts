import { DAILY_PLANT_LIMIT, DAILY_PLANT_LIMIT_ENABLED, FAST_MODE } from '../config';
import { getAsset } from '../data/assetCatalog';
import { TASKS } from '../data/tasks';
import { drawBuildingReward } from '../domain/buildingRewards';
import { findNearestValidPlacement, validatePlacement } from '../domain/placement';
import { effectiveMapStage, resolveStoredMapStage, unlockedTileSets } from '../map/IslandExpansionService';
import { getMapStageConfig, gridToWorldAnchor } from '../map/mapConfig';
import { loadGameData, saveGameData } from '../storage';
import type { FocusMinutes, GameSnapshot, PlacedItem, StoredBuilding } from '../types';

type Listener = (snapshot: GameSnapshot) => void;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `placed-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class GameFlow {
  private snapshot: GameSnapshot;
  private listeners = new Set<Listener>();
  private focusTimer: number | null = null;

  constructor() {
    this.snapshot = {
      screen: 'island',
      selectedTaskId: null,
      selectedMinutes: null,
      focus: null,
      data: loadGameData(),
      fastMode: FAST_MODE,
      selectedAssetId: null,
      selectedBuildingId: null,
    };
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  openTaskSelect(): void {
    this.patch({ screen: 'task-select', selectedTaskId: 'book', selectedMinutes: null });
  }

  returnToIsland(): void {
    this.clearTimers();
    this.patch({ screen: 'island', focus: null, selectedTaskId: null, selectedMinutes: null, selectedAssetId: null, selectedBuildingId: null });
  }

  selectTask(taskId: string): void {
    const task = TASKS.find((item) => item.id === taskId);
    if (!task) return;
    this.patch({ selectedTaskId: taskId });
  }

  selectMinutes(minutes: FocusMinutes): void {
    this.patch({ selectedMinutes: minutes });
  }

  canBeginRitual(): boolean {
    return Boolean(this.snapshot.selectedTaskId && this.snapshot.selectedMinutes);
  }

  beginRitual(): void {
    this.confirmContract();
  }

  confirmContract(): boolean {
    if (this.snapshot.screen !== 'task-select' || !this.canBeginRitual()) return false;
    this.clearTimers();
    this.patch({ screen: 'ritual' });
    return true;
  }

  completeRitual(): boolean {
    if (this.snapshot.screen !== 'ritual') return false;
    this.startFocus();
    return true;
  }

  togglePause(): void {
    const focus = this.snapshot.focus;
    if (!focus || this.snapshot.screen !== 'focus') return;
    if (focus.paused) {
      focus.paused = false;
      focus.lastTickAt = Date.now();
    } else {
      this.advanceFocus();
      if (this.snapshot.screen !== 'focus') return;
      focus.paused = true;
    }
    this.emit();
  }

  getRemainingRatio(): number {
    const focus = this.snapshot.focus;
    if (!focus) return 0;
    return Math.max(0, Math.min(1, focus.remainingMs / focus.totalMs));
  }

  markBuildingStorageRead(): void {
    const current = this.snapshot.data;
    if (!current.storedBuildings.some((building) => building.unread)) return;
    const data = {
      ...current,
      storedBuildings: current.storedBuildings.map((building) => building.unread ? { ...building, unread: false } : building),
    };
    saveGameData(data);
    this.patch({ data });
  }

  canMoveBuilding(item: PlacedItem, gridX: number, gridY: number): boolean {
    const { placedItems, mapStage } = this.snapshot.data;
    return validatePlacement({
      assetId: item.assetId, gridX, gridY, stage: effectiveMapStage(mapStage),
      items: placedItems.filter(({ id }) => id !== item.id),
    }).valid;
  }

  editPlacedBuilding(id: string, gridX: number, gridY: number, flipped: boolean): boolean {
    const current = this.snapshot.data;
    const item = current.placedItems.find((building) => building.id === id);
    if (this.snapshot.screen !== 'island' || !item || !this.canMoveBuilding(item, gridX, gridY)) return false;
    const center = gridToWorldAnchor(gridX, gridY, item.footprint);
    const data = {
      ...current,
      placedItems: current.placedItems.map((building) => building.id === id ? { ...item, ...center, gridX, gridY, flipped } : building),
    };
    saveGameData(data);
    this.patch({ data });
    return true;
  }

  storePlacedBuilding(id: string, flipped: boolean): void {
    const current = this.snapshot.data;
    const item = current.placedItems.find((building) => building.id === id);
    if (this.snapshot.screen !== 'island' || !item) return;
    const { assetId, taskId, taskName, minutes, createdAt } = item;
    const data = {
      ...current,
      placedItems: current.placedItems.filter((building) => building.id !== id),
      storedBuildings: [...current.storedBuildings, { id, assetId, taskId, taskName, minutes, createdAt, flipped, previouslyPlaced: true, unread: false }],
    };
    saveGameData(data);
    this.patch({ data });
  }

  placementProblem(assetId: string, previouslyPlaced = false): string | null {
    const { daily, mapStage, placedItems } = this.snapshot.data;
    if (!previouslyPlaced && DAILY_PLANT_LIMIT_ENABLED && daily.planted >= DAILY_PLANT_LIMIT) return '今日已达到放置上限';
    const stage = effectiveMapStage(mapStage);
    const { minX, minY } = getMapStageConfig(stage).bounds;
    return findNearestValidPlacement(assetId, minX, minY, stage, placedItems) ? null : '岛上暂时没有合适的空地';
  }

  placeStoredBuilding(id: string): boolean {
    if (this.snapshot.screen !== 'island' && this.snapshot.screen !== 'celebration') return false;
    const building = this.snapshot.data.storedBuildings.find((item) => item.id === id);
    if (!building || this.placementProblem(building.assetId, building.previouslyPlaced)) return false;
    this.patch({ screen: 'build', selectedBuildingId: id, selectedAssetId: building.assetId, focus: null });
    return true;
  }

  commitPlacement(assetId: string, gridX: number, gridY: number): void {
    const { data: currentData, selectedBuildingId } = this.snapshot;
    const building = currentData.storedBuildings.find((item) => item.id === selectedBuildingId);
    if (this.snapshot.screen !== 'build' || !building || assetId !== building.assetId) return;
    if ((!building.previouslyPlaced && DAILY_PLANT_LIMIT_ENABLED && currentData.daily.planted >= DAILY_PLANT_LIMIT) || !validatePlacement({
      assetId, gridX, gridY, stage: effectiveMapStage(currentData.mapStage), items: currentData.placedItems,
    }).valid) return;

    const asset = getAsset(assetId);
    const center = gridToWorldAnchor(gridX, gridY, asset.footprint);
    const { previouslyPlaced, unread: _unread, ...savedBuilding } = building;
    const placed: PlacedItem = {
      ...savedBuilding,
      createdAt: new Date().toISOString(),
      type: asset.runtimeTextureKey,
      assetId,
      gridX,
      gridY,
      footprint: asset.footprint,
      x: center.x,
      y: center.y,
      mapVersion: 2,
    };
    const increment = previouslyPlaced ? 0 : 1;
    const totalPlaced = currentData.totalPlaced + increment;
    const mapStage = resolveStoredMapStage(this.snapshot.data.mapStage, totalPlaced);
    const data = {
      ...this.snapshot.data,
      totalPlaced,
      mapStage,
      unlockedTileSet: unlockedTileSets(mapStage),
      daily: {
        ...this.snapshot.data.daily,
        planted: currentData.daily.planted + increment,
      },
      placedItems: [...this.snapshot.data.placedItems, placed],
      storedBuildings: currentData.storedBuildings.filter((item) => item.id !== building.id),
    };
    saveGameData(data);
    this.patch({
      screen: 'island',
      data,
      selectedTaskId: null,
      selectedMinutes: null,
      selectedAssetId: null,
      focus: null,
      selectedBuildingId: null,
    });
  }

  destroy(): void {
    this.clearTimers();
    this.listeners.clear();
  }

  private startFocus(): void {
    const task = TASKS.find((item) => item.id === this.snapshot.selectedTaskId);
    const minutes = this.snapshot.selectedMinutes;
    if (!task || !minutes) return;
    const totalMs = this.snapshot.fastMode ? minutes * 1_000 : minutes * 60_000;
    this.patch({
      screen: 'focus',
      focus: {
        taskId: task.id,
        taskName: task.name,
        minutes,
        totalMs,
        remainingMs: totalMs,
        lastTickAt: Date.now(),
        paused: false,
      },
    });
    this.focusTimer = window.setInterval(() => this.advanceFocus(), 100);
  }

  private advanceFocus(): void {
    const focus = this.snapshot.focus;
    if (!focus || focus.paused || this.snapshot.screen !== 'focus') return;
    const now = Date.now();
    focus.remainingMs = Math.max(0, focus.remainingMs - (now - focus.lastTickAt));
    focus.lastTickAt = now;
    if (focus.remainingMs <= 0) {
      if (this.focusTimer !== null) window.clearInterval(this.focusTimer);
      this.focusTimer = null;
      const current = this.snapshot.data;
      const building: StoredBuilding = {
        id: createId(),
        assetId: drawBuildingReward(focus.minutes, effectiveMapStage(current.mapStage), current.placedItems),
        minutes: focus.minutes,
        taskId: focus.taskId,
        taskName: focus.taskName,
        createdAt: new Date(now).toISOString(),
        unread: true,
      };
      const data = {
        ...current,
        daily: { ...current.daily, completed: current.daily.completed + 1 },
        storedBuildings: [...current.storedBuildings, building],
      };
      saveGameData(data);
      this.patch({ screen: 'celebration', data, selectedAssetId: building.assetId, selectedBuildingId: building.id });
    }
  }

  private patch(next: Partial<GameSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private clearTimers(): void {
    if (this.focusTimer !== null) window.clearInterval(this.focusTimer);
    this.focusTimer = null;
  }
}
