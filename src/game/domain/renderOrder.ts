import { getAsset } from '../data/assetCatalog';
import type { PlacedItem } from '../types';

export function placementBaseY(item: Pick<PlacedItem, 'assetId' | 'gridY'>): number {
  return item.gridY + getAsset(item.assetId).footprint.height - 1;
}

export function sortPlacedItemsForRender(items: readonly PlacedItem[], draft?: Pick<PlacedItem, 'id' | 'gridY'>): PlacedItem[] {
  return items
    .map((item, placementOrder) => ({
      item,
      placementOrder,
      asset: getAsset(item.assetId),
      baseY: placementBaseY({ assetId: item.assetId, gridY: draft?.id === item.id ? draft.gridY : item.gridY }),
    }))
    .sort((a, b) => {
      return a.baseY - b.baseY || (a.asset.layerBias ?? 0) - (b.asset.layerBias ?? 0) || a.placementOrder - b.placementOrder;
    })
    .map(({ item }) => item);
}
