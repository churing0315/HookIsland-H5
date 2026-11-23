export type Screen = 'island' | 'task-select' | 'ritual' | 'focus' | 'celebration' | 'build';
export type MapStage = 0 | 1 | 2;
export type TerrainType = 'grass' | 'sand' | 'rock';

export interface Footprint {
  width: number;
  height: number;
}

export interface TaskDefinition {
  id: string;
  name: string;
  icon: string;
  defaultMinutes: 5 | 10 | 15 | 20;
}

export interface FocusSession {
  taskId: string;
  taskName: string;
  minutes: number;
  totalMs: number;
  remainingMs: number;
  lastTickAt: number;
  paused: boolean;
}

export interface PlacedItem {
  id: string;
  type: string;
  assetId: string;
  gridX: number;
  gridY: number;
  footprint: Footprint;
  x: number;
  y: number;
  taskId: string;
  taskName: string;
  minutes: number;
  createdAt: string;
  mapVersion: 2;
  legacyPosition?: { x: number; y: number };
}

export interface PersistedGameData {
  version: 2;
  schemaVersion: 2;
  mapVersion: 2;
  mapStage: MapStage;
  unlockedTileSet: string[];
  totalPlaced: number;
  daily: {
    dayKey: string;
    planted: number;
    completed: number;
    bonusMedalAwarded: boolean;
  };
  placedItems: PlacedItem[];
}

export interface GameSnapshot {
  screen: Screen;
  selectedTaskId: string | null;
  selectedMinutes: 5 | 10 | 15 | 20 | null;
  focus: FocusSession | null;
  data: PersistedGameData;
  fastMode: boolean;
  selectedAssetId: string;
  celebrationKind: 'build' | 'medal';
}
