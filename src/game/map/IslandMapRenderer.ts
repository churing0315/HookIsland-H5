import Phaser from 'phaser';
import { applyAssetDisplay } from '../assets/placementDisplay';
import { getAsset } from '../data/assetCatalog';
import { sortPlacedItemsForRender } from '../domain/renderOrder';
import { isFootprintUnlocked } from '../domain/placement';
import type { MapStage, PlacedItem } from '../types';
import { getMapStageConfig, gridToWorldAnchor, isStage2Beach, MAP_COLUMNS, MAP_ROWS, TILE_SIZE } from './mapConfig';
import { renderIsland, TileType } from './islandRenderer';

export interface IslandBuildingSprite {
  item: PlacedItem;
  image: Phaser.GameObjects.Image;
}

/** 把某阶段的 tile 配置转换为演示渲染器所需的二维格子地图（水域填 0） */
function stageToGrid(stage: MapStage): number[][] {
  const grid: number[][] = Array.from({ length: MAP_ROWS }, () =>
    new Array<number>(MAP_COLUMNS).fill(TileType.WATER),
  );
  for (const tile of getMapStageConfig(stage).tiles) {
    // 沙滩只影响绘制，建造继续使用同一份解锁 mask。
    grid[tile.y][tile.x] = stage === 2 && isStage2Beach(tile.x, tile.y) ? TileType.SAND : TileType.LAND;
  }
  return grid;
}

export class IslandMapRenderer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly container: Phaser.GameObjects.Container,
  ) {}

  render(stage: MapStage, items: PlacedItem[], alpha = 1, fixedSea = false) {
    // 岛屿地块：轮廓海岸 + 圆角裁剪棋盘地形（替代原先的逐格圆角矩形拼贴）
    renderIsland(this.scene, this.container, stageToGrid(stage), MAP_COLUMNS, MAP_ROWS, {
      cellSize: TILE_SIZE,
      alpha,
      fixedSea,
    });

    const layer = this.scene.add.container(0, 0);
    this.container.add(layer);
    const landItems = items.filter((item) =>
      isFootprintUnlocked(item.gridX, item.gridY, getAsset(item.assetId).footprint, stage));
    const sprites = new Map(landItems
      .map((item) => {
        const asset = getAsset(item.assetId);
        const anchor = gridToWorldAnchor(item.gridX, item.gridY, asset.footprint);
        const image = this.scene.add
          .image(anchor.x, anchor.y, asset.runtimeTextureKey)
          .setAlpha(alpha)
          .setFlipX(item.flipped === true);
        applyAssetDisplay(image, asset);
        image.setData('placedItemId', item.id);
        layer.add(image);
        return [item.id, { item, image }] as const;
      }));
    const sort = (draft?: Pick<PlacedItem, 'id' | 'gridY'>): IslandBuildingSprite[] =>
      sortPlacedItemsForRender(landItems, draft).map((item) => {
        const sprite = sprites.get(item.id)!;
        layer.bringToTop(sprite.image);
        return sprite;
      });
    return { sprites: sort(), sort };
  }
}
