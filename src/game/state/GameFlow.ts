import { DAILY_FOCUS_LIMIT, DAILY_PLANT_LIMIT, FAST_MODE } from '../config';
import { getAsset } from '../data/assetCatalog';
import { TASKS } from '../data/tasks';
import { drawBuildingReward } from '../domain/buildingRewards';
import { validatePlacement } from '../domain/placement';
import { effectiveMapStage, resolveStoredMapStage, unlockedTileSets } from '../map/IslandExpansionService';
import { gridToWorldCenter } from '../map/mapConfig';
import { loadGameData, saveGameData } from '../storage';
import type { FocusMinutes, GameSnapshot, PlacedItem } from '../types';

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
  private transitionTimer: number | null = null;

  constructor() {
    this.snapshot = {
      screen: 'island',
      selectedTaskId: null,
      selectedMinutes: null,
      focus: null,
      data: loadGameData(),
      fastMode: FAST_MODE,
      selectedAssetId: null,
      celebrationKind: 'build',
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
    const daily = this.snapshot.data.daily;
    if (daily.planted >= DAILY_PLANT_LIMIT && daily.bonusMedalAwarded) return;
    this.patch({ screen: 'task-select', selectedTaskId: 'book', selectedMinutes: null });
  }

  returnToIsland(): void {
    this.clearTimers();
    this.patch({ screen: 'island', focus: null, selectedAssetId: null });
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
      focus.paused = true;
    }
    this.emit();
  }

  getRemainingRatio(): number {
    const focus = this.snapshot.focus;
    if (!focus) return 0;
    return Math.max(0, Math.min(1, focus.remainingMs / focus.totalMs));
  }

  commitPlacement(assetId: string, gridX: number, gridY: number): void {
    const task = TASKS.find((item) => item.id === this.snapshot.selectedTaskId);
    const minutes = this.snapshot.selectedMinutes;
    const { data: currentData, selectedAssetId } = this.snapshot;
    if (this.snapshot.screen !== 'build' || !task || !minutes || assetId !== selectedAssetId) return;
    if (currentData.daily.planted >= DAILY_PLANT_LIMIT || !validatePlacement({
      assetId, gridX, gridY, stage: effectiveMapStage(currentData.mapStage), items: currentData.placedItems,
    }).valid) return;

    const asset = getAsset(assetId);
    const center = gridToWorldCenter(gridX, gridY, asset.footprint);
    const placed: PlacedItem = {
      id: createId(),
      type: asset.runtimeTextureKey,
      assetId,
      gridX,
      gridY,
      footprint: asset.footprint,
      x: center.x,
      y: center.y,
      taskId: task.id,
      taskName: task.name,
      minutes,
      createdAt: new Date().toISOString(),
      mapVersion: 2,
    };
    const totalPlaced = this.snapshot.data.totalPlaced + 1;
    const mapStage = resolveStoredMapStage(this.snapshot.data.mapStage, totalPlaced);
    const data = {
      ...this.snapshot.data,
      totalPlaced,
      mapStage,
      unlockedTileSet: unlockedTileSets(mapStage),
      daily: {
        ...this.snapshot.data.daily,
        planted: Math.min(DAILY_PLANT_LIMIT, this.snapshot.data.daily.planted + 1),
        completed: Math.min(DAILY_FOCUS_LIMIT, this.snapshot.data.daily.completed + 1),
      },
      placedItems: [...this.snapshot.data.placedItems, placed],
    };
    saveGameData(data);
    this.patch({
      screen: 'island',
      data,
      selectedTaskId: null,
      selectedMinutes: null,
      selectedAssetId: null,
      focus: null,
      celebrationKind: 'build',
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
      const isMedalFocus =
        this.snapshot.data.daily.planted >= DAILY_PLANT_LIMIT && !this.snapshot.data.daily.bonusMedalAwarded;
      if (isMedalFocus) {
        const data = {
          ...this.snapshot.data,
          daily: {
            ...this.snapshot.data.daily,
            completed: DAILY_FOCUS_LIMIT,
            bonusMedalAwarded: true,
          },
        };
        saveGameData(data);
        this.patch({ screen: 'celebration', celebrationKind: 'medal', data });
        this.transitionTimer = window.setTimeout(
          () =>
            this.patch({
              screen: 'island',
              selectedTaskId: null,
              selectedMinutes: null,
              focus: null,
            }),
          3_000,
        );
      } else {
        const { mapStage, placedItems } = this.snapshot.data;
        const selectedAssetId = drawBuildingReward(focus.minutes, effectiveMapStage(mapStage), placedItems);
        this.patch({ screen: 'celebration', celebrationKind: 'build', selectedAssetId });
        this.transitionTimer = window.setTimeout(() => this.patch({ screen: 'build' }), 3_000);
      }
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
    if (this.transitionTimer !== null) window.clearTimeout(this.transitionTimer);
    this.focusTimer = null;
    this.transitionTimer = null;
  }
}
