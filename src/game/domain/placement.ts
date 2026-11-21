import type { PlacedItem } from '../types';

export const ISLAND = {
  centerX: 406,
  centerY: 205,
  radiusX: 292,
  radiusY: 126,
  safeInset: 28,
} as const;

const ITEM_RADIUS = 24;

export function isPointOnGrass(x: number, y: number): boolean {
  const rx = ISLAND.radiusX - ISLAND.safeInset;
  const ry = ISLAND.radiusY - ISLAND.safeInset;
  const dx = (x - ISLAND.centerX) / rx;
  const dy = (y - ISLAND.centerY) / ry;
  return dx * dx + dy * dy <= 1;
}

export function overlapsPlacedItem(x: number, y: number, items: PlacedItem[]): boolean {
  return items.some((item) => Math.hypot(item.x - x, item.y - y) < ITEM_RADIUS * 2.2);
}

export function isValidPlacement(x: number, y: number, items: PlacedItem[]): boolean {
  return isPointOnGrass(x, y) && !overlapsPlacedItem(x, y, items);
}
