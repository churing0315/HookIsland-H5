import Phaser from 'phaser';
import { COLORS } from '../config';
import { getAsset } from '../data/assetCatalog';
import type { MapStage, PlacedItem, TerrainType } from '../types';
import { getMapStageConfig, gridToWorldCenter, LANDMARKS, TILE_SIZE } from './mapConfig';

const TERRAIN_COLORS: Record<TerrainType, [number, number]> = {
  grass: [COLORS.grass, COLORS.grassLight],
  sand: [COLORS.sand, 0xffefb5],
  rock: [COLORS.rock, COLORS.rockLight],
};

export class IslandMapRenderer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly container: Phaser.GameObjects.Container,
  ) {}

  render(stage: MapStage, items: PlacedItem[], showPlacementGrid: boolean, alpha = 1): void {
    const config = getMapStageConfig(stage);
    const coast = this.scene.add.graphics().setAlpha(alpha);
    coast.fillStyle(COLORS.coast, 0.74);
    for (const tile of config.tiles) {
      coast.fillRoundedRect(tile.x * TILE_SIZE - 7, tile.y * TILE_SIZE - 7, TILE_SIZE + 14, TILE_SIZE + 14, 14);
    }
    coast.fillStyle(COLORS.sand, 1);
    for (const tile of config.tiles) {
      coast.fillRoundedRect(tile.x * TILE_SIZE - 3, tile.y * TILE_SIZE - 3, TILE_SIZE + 6, TILE_SIZE + 6, 11);
    }
    this.container.add(coast);

    const terrain = this.scene.add.graphics().setAlpha(alpha);
    for (const tile of config.tiles) {
      const palette = TERRAIN_COLORS[tile.terrain];
      terrain.fillStyle(palette[(tile.x + tile.y) % 2], 1);
      terrain.fillRoundedRect(tile.x * TILE_SIZE + 1, tile.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2, 7);
      if (showPlacementGrid) {
        terrain.lineStyle(1.2, 0xffffff, 0.44);
        terrain.strokeRoundedRect(tile.x * TILE_SIZE + 2, tile.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
      }
    }
    this.container.add(terrain);

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
