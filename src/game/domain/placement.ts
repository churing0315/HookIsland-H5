import { getAsset } from '../data/assetCatalog';
import { getMapStageConfig, tileKey } from '../map/mapConfig';
import type { Footprint, MapStage, PlacedItem } from '../types';

export type PlacementFailure = 'outside-map' | 'overlap';

export interface PlacementResult {
  valid: boolean;
  reason: PlacementFailure | null;
}

export interface PlacementRequest {
  assetId: string;
  gridX: number;
  gridY: number;
  stage: MapStage;
  items: PlacedItem[];
}

export function footprintCells(gridX: number, gridY: number, footprint: Footprint): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < footprint.height; y += 1) {
    for (let x = 0; x < footprint.width; x += 1) cells.push({ x: gridX + x, y: gridY + y });
  }
  return cells;
}

function occupiedCells(items: PlacedItem[]): Set<string> {
  const occupied = new Set<string>();
  for (const item of items) {
    const asset = getAsset(item.assetId);
    if (asset.blocksCell === false) continue;
    const footprint = item.footprint ?? asset.footprint;
    for (const cell of footprintCells(item.gridX, item.gridY, footprint)) occupied.add(tileKey(cell.x, cell.y));
  }
  return occupied;
}

export function validatePlacement(request: PlacementRequest): PlacementResult {
  return validateFootprint(request, occupiedCells(request.items));
}

function validateFootprint(request: PlacementRequest, occupied: ReadonlySet<string>): PlacementResult {
  const asset = getAsset(request.assetId);
  const cells = footprintCells(request.gridX, request.gridY, asset.footprint);
  if (!cellsAreUnlocked(cells, request.stage)) return { valid: false, reason: 'outside-map' };

  if (cells.some((cell) => occupied.has(tileKey(cell.x, cell.y)))) {
    return { valid: false, reason: 'overlap' };
  }
  return { valid: true, reason: null };
}

function cellsAreUnlocked(cells: ReturnType<typeof footprintCells>, stage: MapStage): boolean {
  const { tileKeys } = getMapStageConfig(stage);
  return cells.every(({ x, y }) => tileKeys.has(tileKey(x, y)));
}

export function isFootprintUnlocked(gridX: number, gridY: number, footprint: Footprint, stage: MapStage): boolean {
  return cellsAreUnlocked(footprintCells(gridX, gridY, footprint), stage);
}

export function findNearestValidPlacement(
  assetId: string,
  preferredX: number,
  preferredY: number,
  stage: MapStage,
  items: PlacedItem[],
): { x: number; y: number } | null {
  const bounds = getMapStageConfig(stage).bounds;
  const occupied = occupiedCells(items);
  const candidates: Array<{ x: number; y: number; distance: number }> = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      candidates.push({ x, y, distance: Math.abs(x - preferredX) + Math.abs(y - preferredY) });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const match = candidates.find((candidate) =>
    validateFootprint({ assetId, gridX: candidate.x, gridY: candidate.y, stage, items }, occupied).valid,
  );
  return match ? { x: match.x, y: match.y } : null;
}
