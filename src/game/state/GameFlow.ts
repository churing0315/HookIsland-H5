import { DAILY_PLANT_LIMIT, DAILY_PLANT_LIMIT_ENABLED, FAST_MODE } from '../config';
import { getAsset } from '../data/assetCatalog';
import { TASKS } from '../data/tasks';
import { drawBuildingReward } from '../domain/buildingRewards';
import { findNearestValidPlacement, validatePlacement } from '../domain/placement';
import { effectiveMapStage, resolveStoredMapStage, unlockedTileSets } from '../map/IslandExpansionService';
import { getMapStageConfig, gridToWorldAnchor } from '../map/mapConfig';
import { loadGameData, saveGameData } from '../storage';
import type { FocusMinutes, GameSnapshot, GuideProgress, PlacedItem, StoredBuilding } from '../types';

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
  private beforeSettlement: (() => Promise<void>) | null = null;

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
    this.restoreGuide();
  }

  setGuide(progress: GuideProgress): void {
    const data = { ...this.snapshot.data, guide: progress };
    this.saveGuideData(data);
    this.snapshot = { ...this.snapshot, data };
  }

  setBeforeSettlement(callback: (() => Promise<void>) | null): void {
    this.beforeSettlement = callback;
  }

  private saveGuideData(data: GameSnapshot['data']): void {
    try { saveGameData(data); } catch { /* Keep the in-memory guide usable if storage is unavailable. */ }
  }

  private restoreGuide(): void {
    const { guide, storedBuildings } = this.snapshot.data;
    if (!guide || guide.completed) return;
    const task = TASKS.find(({ id }) => id === guide.taskId);
    if (guide.step >= 2 && guide.step <= 4) {
      this.patch({ screen: 'task-select', selectedTaskId: task?.id ?? 'book', selectedMinutes: guide.minutes ?? null });
    } else if ((guide.step === 5 || guide.step === 6) && guide.focus && task && guide.minutes) {
      const { totalMs, remainingMs, deadline } = guide.focus;
      const now = Date.now();
      this.patch({ screen: 'focus', selectedTaskId: task.id, selectedMinutes: guide.minutes, focus: {
        taskId: task.id, taskName: task.name, minutes: guide.minutes, totalMs,
        remainingMs: deadline === null ? remainingMs : Math.min(remainingMs, Math.max(0, deadline - now)),
        lastTickAt: now, paused: deadline === null,
      } });
      this.focusTimer = window.setInterval(() => this.advanceFocus(), 100);
    } else if (guide.step === 7 || guide.step === 8) {
      const building = storedBuildings.find(({ id }) => id === guide.buildingId);
      if (building) this.patch({
        screen: guide.step === 7 ? 'celebration' : 'build',
        selectedBuildingId: building.id, selectedAssetId: building.assetId,
      });
    }
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
    const { screen, data: { guide } } = this.snapshot;
    if (screen === 'focus' && guide?.focus) {
      if (guide.buildingId) this.setGuide({ step: 7, completed: false, buildingId: guide.buildingId });
      else this.setGuide({ step: guide.step, completed: false });
    }
    this.patch({ screen: 'island', focus: null, selectedTaskId: null, selectedMinutes: null, selectedAssetId: null, selectedBuildingId: null });
  }

  selectTask(taskId: string): void {
    const task = TASKS.find((item) => item.id === taskId);
    if (!task) return;
    const guide = this.snapshot.data.guide;
    if (guide && !guide.completed && guide.step === 3) this.setGuide({ ...guide, taskId });
    this.patch({ selectedTaskId: taskId });
  }

  selectMinutes(minutes: FocusMinutes): void {
    const guide = this.snapshot.data.guide;
    if (guide && !guide.completed && (guide.step === 3 || guide.step === 4)) this.setGuide({
      ...guide, taskId: this.snapshot.selectedTaskId ?? undefined, minutes,
    });
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
    if (!focus || focus.remainingMs <= 0 || this.snapshot.screen !== 'focus') return;
    if (focus.paused) {
      focus.paused = false;
      focus.lastTickAt = Date.now();
    } else {
      this.advanceFocus();
      if (this.snapshot.screen !== 'focus' || focus.remainingMs <= 0) return;
      focus.paused = true;
    }
    this.saveGuideFocus();
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
    const guide = this.snapshot.data.guide;
    if (guide?.step === 7 && guide.buildingId === id) this.setGuide({ ...guide, step: 8 });
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
      guide: currentData.guide?.step === 8 && currentData.guide.buildingId === building.id
        ? { step: 9, completed: false, buildingId: building.id } : currentData.guide,
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
    const now = Date.now();
    const guide = this.snapshot.data.guide;
    if (guide && !guide.completed && guide.step >= 4 && guide.step <= 6) this.setGuide({
      step: Math.max(5, guide.step), completed: false, taskId: task.id, minutes,
      focus: { totalMs, remainingMs: totalMs, deadline: now + totalMs },
    });
    this.patch({
      screen: 'focus',
      focus: {
        taskId: task.id,
        taskName: task.name,
        minutes,
        totalMs,
        remainingMs: totalMs,
        lastTickAt: now,
        paused: false,
      },
    });
    this.focusTimer = window.setInterval(() => this.advanceFocus(), 100);
  }

  private saveGuideFocus(): void {
    const { focus, data: { guide } } = this.snapshot;
    if (!guide?.focus || !focus) return;
    this.setGuide({ ...guide, focus: {
      totalMs: focus.totalMs,
      remainingMs: focus.remainingMs,
      deadline: focus.paused ? null : focus.lastTickAt + focus.remainingMs,
    } });
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
      const guide = current.guide;
      const guided = Boolean(guide?.focus && (guide.step === 5 || guide.step === 6));
      const pending = guided ? current.storedBuildings.find(({ id }) => id === guide?.buildingId) : undefined;
      const building: StoredBuilding = pending ?? {
        id: createId(),
        assetId: drawBuildingReward(focus.minutes, effectiveMapStage(current.mapStage), current.placedItems),
        minutes: focus.minutes,
        taskId: focus.taskId,
        taskName: focus.taskName,
        createdAt: new Date(now).toISOString(),
        unread: true,
      };
      const data = pending ? current : {
        ...current,
        daily: { ...current.daily, completed: current.daily.completed + 1 },
        storedBuildings: [...current.storedBuildings, building],
        guide: guided && guide ? { ...guide, step: 6, buildingId: building.id } : guide,
      };
      saveGameData(data);
      this.snapshot = { ...this.snapshot, data };
      const settle = (): void => {
        if (this.snapshot.focus !== focus || this.snapshot.screen !== 'focus') return;
        if (guided) this.setGuide({ step: 7, completed: false, buildingId: building.id });
        this.patch({ screen: 'celebration', selectedAssetId: building.assetId, selectedBuildingId: building.id });
      };
      if (guided && this.beforeSettlement) void this.beforeSettlement().then(settle, settle);
      else settle();
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
