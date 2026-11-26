import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { getMapStageConfig } from '../map/mapConfig';
import type { FocusMinutes, MapStage, PlacedItem } from '../types';
import { findNearestValidPlacement } from './placement';

export function drawBuildingReward(minutes: FocusMinutes, stage: MapStage, items: PlacedItem[]): string {
  const { minX, minY } = getMapStageConfig(stage).bounds;
  const tier = REWARD_BUILDINGS.filter((reward) => reward.minutes === minutes);
  const placeable = tier.filter((reward) => findNearestValidPlacement(reward.id, minX, minY, stage, items));
  const pool = placeable.length ? placeable : tier;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
