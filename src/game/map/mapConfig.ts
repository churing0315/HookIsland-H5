import type { Footprint, MapStage } from '../types';

export const TILE_SIZE = 32;
export const MAP_COLUMNS = 22;
export const MAP_ROWS = 14;

export interface GridTile {
  x: number;
  y: number;
  unlockedAt: MapStage;
}

export interface IslandMapStageConfig {
  stage: MapStage;
  name: string;
  tiles: GridTile[];
  tileKeys: ReadonlySet<string>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function isStage0(x: number, y: number): boolean {
  const core = x >= 7 && x <= 14 && y >= 4 && y <= 9;
  const horizontalWing = (x === 6 || x === 15) && y >= 5 && y <= 8;
  const verticalWing = (y === 3 || y === 10) && x >= 8 && x <= 13;
  return core || horizontalWing || verticalWing;
}

function isStage1(x: number, y: number): boolean {
  if (isStage0(x, y)) return true;
  if (x < 4 || x > 17 || y < 2 || y > 11) return false;
  if (x <= 5 && y <= 4) return false;
  if (x >= 16 && y >= 9) return false;
  if ((x === 4 || x === 17) && (y === 2 || y === 11)) return false;
  return true;
}

export function isStage2Beach(x: number, y: number): boolean {
  return x >= 1 && x <= 6 && y >= 0 && y <= 5 && x + y >= 3 && x - y <= 5 && !isStage1(x, y);
}

function isStage2(x: number, y: number): boolean {
  if (isStage1(x, y)) return true;
  if (isStage2Beach(x, y)) return true;

  const rock = x >= 15 && x <= 21 && y >= 7 && y <= 13 && x + y <= 33 && y - x <= -3;
  if (rock) return true;

  const outerGrass = x >= 3 && x <= 19 && y >= 1 && y <= 12;
  return outerGrass && !((x <= 4 || x >= 18) && (y <= 2 || y >= 11));
}

const MASTER_TILES: GridTile[] = [];
for (let y = 0; y < MAP_ROWS; y += 1) {
  for (let x = 0; x < MAP_COLUMNS; x += 1) {
    if (isStage0(x, y)) {
      MASTER_TILES.push({ x, y, unlockedAt: 0 });
      continue;
    }
    if (isStage1(x, y)) {
      MASTER_TILES.push({ x, y, unlockedAt: 1 });
      continue;
    }
    if (isStage2(x, y)) MASTER_TILES.push({ x, y, unlockedAt: 2 });
  }
}

function createStage(stage: MapStage, name: string): IslandMapStageConfig {
  const tiles = MASTER_TILES.filter((tile) => tile.unlockedAt <= stage);
  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  return {
    stage,
    name,
    tiles,
    tileKeys: new Set(tiles.map((tile) => tileKey(tile.x, tile.y))),
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  };
}

export const MAP_STAGES: Record<MapStage, IslandMapStageConfig> = {
  0: createStage(0, '初始小岛'),
  1: createStage(1, '中型扩建岛'),
  2: createStage(2, '大型扩建岛'),
};

export function getMapStageConfig(stage: MapStage): IslandMapStageConfig {
  return MAP_STAGES[stage];
}

export function getTile(stage: MapStage, x: number, y: number): GridTile | undefined {
  return MAP_STAGES[stage].tiles.find((tile) => tile.x === x && tile.y === y);
}

export function gridToWorldCenter(
  gridX: number,
  gridY: number,
  footprint: Footprint = { width: 1, height: 1 },
): { x: number; y: number } {
  return {
    x: (gridX + footprint.width / 2) * TILE_SIZE,
    y: (gridY + footprint.height / 2) * TILE_SIZE,
  };
}

/** PNG pivot 对齐的占地区域底边中点。 */
export function gridToWorldAnchor(
  gridX: number,
  gridY: number,
  footprint: Footprint = { width: 1, height: 1 },
): { x: number; y: number } {
  return {
    x: (gridX + footprint.width / 2) * TILE_SIZE,
    y: (gridY + footprint.height) * TILE_SIZE,
  };
}

export function worldToGrid(worldX: number, worldY: number, footprint: Footprint = { width: 1, height: 1 }): { x: number; y: number } {
  return {
    x: Math.round(worldX / TILE_SIZE - footprint.width / 2),
    y: Math.round(worldY / TILE_SIZE - footprint.height),
  };
}

export function getMapWorldBounds(stage: MapStage, padding = TILE_SIZE): WorldBounds {
  const { bounds } = MAP_STAGES[stage];
  const left = bounds.minX * TILE_SIZE - padding;
  const top = bounds.minY * TILE_SIZE - padding;
  const right = (bounds.maxX + 1) * TILE_SIZE + padding;
  const bottom = (bounds.maxY + 1) * TILE_SIZE + padding;
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    top,
    right,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}
