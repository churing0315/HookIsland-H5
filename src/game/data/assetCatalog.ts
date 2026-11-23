import type { Footprint, TerrainType } from '../types';

export type AssetCategory = 'nature' | 'building' | 'facility' | 'animal';
export type UnlockBatch = 'base' | 'focus-30' | 'focus-60';

export interface AssetCatalogEntry {
  id: string;
  name: string;
  category: AssetCategory;
  footprint: Footprint;
  allowedTerrains: TerrainType[];
  unlockBatch: UnlockBatch;
  runtimeTextureKey: string;
  runtimeStatus: 'placeholder' | 'ready';
}

const placeholder = 'placeholder-tree';

export const ASSET_CATALOG: AssetCatalogEntry[] = [
  { id: 'tree_round', name: '圆冠树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tree_sakura', name: '樱花树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tree_ginkgo', name: '金黄树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tree_pine', name: '松树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'bush_daisy', name: '白花灌木', category: 'nature', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'flower_pink', name: '粉色花丛', category: 'nature', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'flower_yellow', name: '黄色花丛', category: 'nature', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'rock_small', name: '小石头', category: 'nature', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass', 'rock'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'bench_wood', name: '木长椅', category: 'facility', footprint: { width: 2, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'sign_wood', name: '木告示牌', category: 'facility', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'fence_white', name: '白栅栏', category: 'facility', footprint: { width: 2, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'duck', name: '小鸭子', category: 'animal', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass', 'sand'], unlockBatch: 'base', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tree_palm', name: '椰子树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['sand', 'grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tree_apple', name: '苹果树', category: 'nature', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'shrub_berry', name: '浆果灌木', category: 'nature', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'house_cottage', name: '橙顶小屋', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'house_mushroom', name: '蘑菇小屋', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'kiosk_post', name: '邮局', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'kiosk_market', name: '小市集', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'fountain_round', name: '圆形喷泉', category: 'facility', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'picnic_table', name: '野餐桌', category: 'facility', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass', 'sand'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'beach_umbrella', name: '海滩遮阳伞', category: 'facility', footprint: { width: 2, height: 2 }, allowedTerrains: ['sand'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'rabbit', name: '小兔子', category: 'animal', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'squirrel', name: '小松鼠', category: 'animal', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'focus-30', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'castle_central', name: '大型城堡地标', category: 'building', footprint: { width: 4, height: 4 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'windmill', name: '风车房', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'tent_purple', name: '星星帐篷', category: 'building', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass', 'sand'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'bakery', name: '厨师小屋', category: 'building', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'carousel', name: '旋转木马', category: 'facility', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'slide_playground', name: '游乐滑梯', category: 'facility', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'gazebo', name: '圆顶凉亭', category: 'facility', footprint: { width: 3, height: 3 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'garden_arch', name: '花朵拱门', category: 'facility', footprint: { width: 2, height: 2 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'waterfall_rocks', name: '岩石小瀑布', category: 'facility', footprint: { width: 3, height: 3 }, allowedTerrains: ['rock'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'beach_shell', name: '贝壳装饰', category: 'facility', footprint: { width: 1, height: 1 }, allowedTerrains: ['sand'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'butterfly', name: '蝴蝶', category: 'animal', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
  { id: 'cat', name: '小猫', category: 'animal', footprint: { width: 1, height: 1 }, allowedTerrains: ['grass'], unlockBatch: 'focus-60', runtimeTextureKey: placeholder, runtimeStatus: 'placeholder' },
];

export function getAsset(assetId: string): AssetCatalogEntry {
  return ASSET_CATALOG.find((asset) => asset.id === assetId) ?? ASSET_CATALOG[0];
}
