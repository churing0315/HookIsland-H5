import Phaser from 'phaser';
import { getAsset } from '../data/assetCatalog';
import type { MapStage, PlacedItem, TerrainType } from '../types';
import { getMapStageConfig, gridToWorldCenter, LANDMARKS, MAP_COLUMNS, MAP_ROWS, TILE_SIZE } from './mapConfig';
import { renderIsland, TileType } from './islandRenderer';

/** 项目地形 → 演示渲染器地块类型的映射 */
const TERRAIN_TO_TILE: Record<TerrainType, number> = {
  grass: TileType.LAND,
  sand: TileType.SAND,
  rock: TileType.HIGH,
};

/** 把某阶段的 tile 配置转换为演示渲染器所需的二维格子地图（水域填 0） */
function stageToGrid(stage: MapStage): number[][] {
  const grid: number[][] = Array.from({ length: MAP_ROWS }, () =>
    new Array<number>(MAP_COLUMNS).fill(TileType.WATER),
  );
  for (const tile of getMapStageConfig(stage).tiles) {
    grid[tile.y][tile.x] = TERRAIN_TO_TILE[tile.terrain];
  }
  return grid;
}

export class IslandMapRenderer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly container: Phaser.GameObjects.Container,
  ) {}

  render(stage: MapStage, items: PlacedItem[], showPlacementGrid: boolean, alpha = 1): void {
    const config = getMapStageConfig(stage);

    // 岛屿地块：轮廓海岸 + 圆角裁剪棋盘地形（替代原先的逐格圆角矩形拼贴）
    renderIsland(this.scene, this.container, stageToGrid(stage), MAP_COLUMNS, MAP_ROWS, {
      cellSize: TILE_SIZE,
      alpha,
    });

    // 放置参考网格（建造模式可见）
    if (showPlacementGrid) {
      const gridLines = this.scene.add.graphics().setAlpha(alpha);
      gridLines.lineStyle(1.2, 0xffffff, 0.44);
      for (const tile of config.tiles) {
        gridLines.strokeRect(tile.x * TILE_SIZE + 2, tile.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
      this.container.add(gridLines);
    }

    for (const landmark of LANDMARKS) {
      const center = gridToWorldCenter(landmark.gridX, landmark.gridY, landmark.footprint);
      const image = this.scene.add
        .image(center.x, center.y, landmark.textureKey)
        .setAlpha(alpha)
        .setDepth(center.y)
        .setScale(0.92);
      image.setData('landmarkId', landmark.id);
      const label = this.scene.add
        .text(center.x, center.y + 37, landmark.label, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#5B452B',
          backgroundColor: 'rgba(255,249,240,0.88)',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 0)
        .setAlpha(alpha)
        .setDepth(center.y + 1);
      this.container.add([image, label]);
    }

    [...items]
      .sort((a, b) => a.y - b.y)
      .forEach((item) => {
        const asset = getAsset(item.assetId);
        const center = gridToWorldCenter(item.gridX, item.gridY, asset.footprint);
        const image = this.scene.add
          .image(center.x, center.y, asset.runtimeTextureKey)
          .setScale(asset.footprint.width === 1 ? 0.48 : 0.74)
          .setAlpha(alpha)
          .setDepth(center.y + 2);
        image.setData('placedItemId', item.id);
        this.container.add(image);
      });
  }
}
