import Phaser from 'phaser';
import { placedAssetScale } from '../assets/placementDisplay';
import { getAsset } from '../data/assetCatalog';
import type { MapStage, PlacedItem, TerrainType } from '../types';
import { getMapStageConfig, gridToWorldCenter, MAP_COLUMNS, MAP_ROWS, TILE_SIZE } from './mapConfig';
import { renderIsland, TileType } from './islandRenderer';

export interface IslandBuildingSprite {
  item: PlacedItem;
  image: Phaser.GameObjects.Image;
}

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

  render(stage: MapStage, items: PlacedItem[], alpha = 1, fixedSea = false): IslandBuildingSprite[] {
    // 岛屿地块：轮廓海岸 + 圆角裁剪棋盘地形（替代原先的逐格圆角矩形拼贴）
    renderIsland(this.scene, this.container, stageToGrid(stage), MAP_COLUMNS, MAP_ROWS, {
      cellSize: TILE_SIZE,
      alpha,
      fixedSea,
    });

    return [...items]
      .sort((a, b) => a.y - b.y)
      .map((item) => {
        const asset = getAsset(item.assetId);
        const center = gridToWorldCenter(item.gridX, item.gridY, asset.footprint);
        const image = this.scene.add
          .image(center.x, center.y, asset.runtimeTextureKey)
          .setAlpha(alpha)
          .setFlipX(item.flipped === true)
          .setDepth(center.y + 2);
        image.setScale(placedAssetScale(asset, image.width, image.height));
        image.setData('placedItemId', item.id);
        this.container.add(image);
        return { item, image };
      });
  }
}
