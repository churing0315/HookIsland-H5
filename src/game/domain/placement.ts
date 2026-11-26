import { getAsset } from '../data/assetCatalog';
import { getMapStageConfig, getTile, tileKey } from '../map/mapConfig';
import type { Footprint, MapStage, PlacedItem, TerrainType } from '../types';

export type PlacementFailure = 'outside-map' | 'wrong-terrain' | 'overlap';

export interface PlacementResult {
  valid: boolean;
  reason: PlacementFailure | null;
  terrains: TerrainType[];
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
    const footprint = item.footprint ?? getAsset(item.assetId).footprint;
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
  const stage = getMapStageConfig(request.stage);
  const terrains: TerrainType[] = [];

  for (const cell of cells) {
    if (!stage.tileKeys.has(tileKey(cell.x, cell.y))) return { valid: false, reason: 'outside-map', terrains };
    const tile = getTile(request.stage, cell.x, cell.y);
    if (!tile) return { valid: false, reason: 'outside-map', terrains };
    terrains.push(tile.terrain);
    if (!asset.allowedTerrains.includes(tile.terrain)) return { valid: false, reason: 'wrong-terrain', terrains };
  }

  if (cells.some((cell) => occupied.has(tileKey(cell.x, cell.y)))) {
    return { valid: false, reason: 'overlap', terrains };
  }
  return { valid: true, reason: null, terrains };
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
