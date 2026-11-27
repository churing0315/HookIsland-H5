export type Screen = 'island' | 'task-select' | 'ritual' | 'focus' | 'celebration' | 'build';
export type MapStage = 0 | 1 | 2;
export type FocusMinutes = 5 | 10 | 15 | 20;

export interface Footprint {
  width: number;
  height: number;
}

export interface TaskDefinition {
  id: string;
  name: string;
  defaultMinutes: FocusMinutes;
}

export interface FocusSession {
  taskId: string;
  taskName: string;
  minutes: FocusMinutes;
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
  flipped?: boolean;
  legacyPosition?: { x: number; y: number };
}

export type StoredBuilding = Pick<PlacedItem, 'id' | 'assetId' | 'taskId' | 'taskName' | 'minutes' | 'createdAt' | 'flipped'> & {
  previouslyPlaced?: boolean;
  unread?: boolean;
};

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
  storedBuildings: StoredBuilding[];
}

export interface GameSnapshot {
  screen: Screen;
  selectedTaskId: string | null;
  selectedMinutes: FocusMinutes | null;
  focus: FocusSession | null;
  data: PersistedGameData;
  fastMode: boolean;
  selectedAssetId: string | null;
  selectedBuildingId: string | null;
}
