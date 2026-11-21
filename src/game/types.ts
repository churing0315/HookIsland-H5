export type Screen = 'island' | 'task-select' | 'ritual' | 'focus' | 'celebration' | 'build';

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
  type: 'placeholder-tree';
  x: number;
  y: number;
  taskId: string;
  taskName: string;
  minutes: number;
  createdAt: string;
}

export interface PersistedGameData {
  version: 1;
  daily: {
    dayKey: string;
    planted: number;
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
}
