import { DEMO_MAP_STAGE } from '../config';
import type { MapStage } from '../types';

export const MAP_STAGE_THRESHOLDS = {
  stage1TotalPlaced: 3,
  stage2TotalPlaced: 9,
} as const;

export function stageForTotalPlaced(totalPlaced: number): MapStage {
  if (totalPlaced >= MAP_STAGE_THRESHOLDS.stage2TotalPlaced) return 2;
  if (totalPlaced >= MAP_STAGE_THRESHOLDS.stage1TotalPlaced) return 1;
  return 0;
}

export function resolveStoredMapStage(storedStage: unknown, totalPlaced: number): MapStage {
  const normalized = storedStage === 1 || storedStage === 2 ? storedStage : 0;
  return Math.max(normalized, stageForTotalPlaced(totalPlaced)) as MapStage;
}

export function effectiveMapStage(storedStage: MapStage): MapStage {
  return DEMO_MAP_STAGE ?? storedStage;
}

export function unlockedTileSets(stage: MapStage): string[] {
  return Array.from({ length: stage + 1 }, (_, index) => `stage-${index}`);
}
