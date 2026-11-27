import type Phaser from 'phaser';
import type { AssetCatalogEntry } from '../data/assetCatalog';
import { TILE_SIZE } from '../map/mapConfig';

export const PLACEMENT_PREVIEW = { x: 273, y: 300, width: 84, height: 82 };

export interface PlacementFeedback {
  message: string | null;
  position: { x: number; y: number } | null;
}

export function fitAssetImage(width: number, height: number, maxWidth: number, maxHeight: number): number {
  return Math.min(maxWidth / width, maxHeight / height);
}

export function placedAssetScale(asset: AssetCatalogEntry, width: number, height: number): number {
  if (asset.runtimeStatus === 'placeholder') return asset.footprint.width === 1 ? 0.48 : 0.74;
  return asset.renderScale ?? fitAssetImage(width, height, asset.footprint.width * TILE_SIZE - 4, asset.footprint.height * TILE_SIZE - 4);
}

/** 静态图、拖拽剪影和后续生长动画统一使用配置表 pivot 与缩放。 */
export function applyAssetDisplay(image: Phaser.GameObjects.Image, asset: AssetCatalogEntry): number {
  const pivot = asset.pivotPx ?? { x: image.width / 2, y: image.height };
  const scale = placedAssetScale(asset, image.width, image.height);
  image.setOrigin(pivot.x / image.width, pivot.y / image.height).setScale(scale);
  return scale;
}
