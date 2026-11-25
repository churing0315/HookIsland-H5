import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { getMapStageConfig } from '../map/mapConfig';
import type { FocusMinutes, MapStage, PlacedItem } from '../types';
import { findNearestValidPlacement } from './placement';

export function drawBuildingReward(minutes: FocusMinutes, stage: MapStage, items: PlacedItem[]): string | null {
  const { minX, minY } = getMapStageConfig(stage).bounds;
  const available = REWARD_BUILDINGS.filter(
    (reward) => reward.minutes === minutes && findNearestValidPlacement(reward.id, minX, minY, stage, items),
  );
  return available[Math.floor(Math.random() * available.length)]?.id ?? null;
}
