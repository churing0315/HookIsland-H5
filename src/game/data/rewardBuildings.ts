import type { Footprint, TerrainType } from '../types';

type RewardTier = 1 | 2 | 3 | 4;

const MINUTES_BY_TIER = { 1: 5, 2: 10, 3: 15, 4: 20 } as const;
const FOOTPRINT_BY_TIER: Record<RewardTier, Footprint> = {
  1: { width: 1, height: 1 },
  2: { width: 2, height: 2 },
  3: { width: 3, height: 2 },
  4: { width: 3, height: 3 },
};

// Names and filenames are sourced from 素材清单.csv. Occupancy is game configuration.
const BUILDINGS: ReadonlyArray<readonly [RewardTier, string, string]> = [
  [1, 'tier1_decoration/berry_bush.png', '红果灌木'],
  [1, 'tier1_decoration/direction_sign.png', '指示牌'],
  [1, 'tier1_decoration/direction_sign_2.png', '指示牌（变体）'],
  [1, 'tier1_decoration/duck_sign.png', '鸭子立牌'],
  [1, 'tier1_decoration/flower_box.png', '花箱'],
  [1, 'tier1_decoration/flower_bush.png', '白花灌木'],
  [1, 'tier1_decoration/hay_bale.png', '干草捆'],
  [1, 'tier1_decoration/notice_board.png', '告示板'],
  [1, 'tier1_decoration/notice_board_2.png', '告示板（变体）'],
  [1, 'tier1_decoration/picket_fence.png', '白色尖桩栅栏'],
  [1, 'tier1_decoration/picnic_mat.png', '野餐布'],
  [1, 'tier1_decoration/red_mushroom.png', '红蘑菇'],
  [1, 'tier1_decoration/rock.png', '岩石'],
  [1, 'tier1_decoration/sprout_stump.png', '发芽树桩'],
  [1, 'tier1_decoration/star_plaza.png', '圆形地饰广场'],
  [1, 'tier1_decoration/street_lamp.png', '路灯'],
  [1, 'tier1_decoration/tree_stump.png', '树桩'],
  [1, 'tier1_decoration/wooden_bench.png', '木长凳'],
  [1, 'tier1_decoration/wooden_bench_2.png', '木长凳（变体）'],
  [1, 'tier1_decoration/wooden_fence.png', '木栅栏'],
  [1, 'tier1_decoration/wooden_lantern.png', '木杆灯笼'],
  [1, 'tier1_decoration/yellow_bush.png', '黄花灌木'],
  [2, 'tier2_common_building/apple_tree.png', '苹果树'],
  [2, 'tier2_common_building/apple_tree_2.png', '苹果树（变体）'],
  [2, 'tier2_common_building/autumn_tree.png', '黄叶树'],
  [2, 'tier2_common_building/autumn_tree_2.png', '黄叶树（变体）'],
  [2, 'tier2_common_building/cave_house.png', '洞穴石屋'],
  [2, 'tier2_common_building/cherry_tree.png', '樱花树'],
  [2, 'tier2_common_building/cherry_tree_2.png', '樱花树（变体·含飘落花瓣）'],
  [2, 'tier2_common_building/flower_arch.png', '花拱门'],
  [2, 'tier2_common_building/hay_barn.png', '草垛屋'],
  [2, 'tier2_common_building/leafy_tree.png', '阔叶树'],
  [2, 'tier2_common_building/leafy_tree_2.png', '阔叶树（变体）'],
  [2, 'tier2_common_building/market_stall.png', '集市摊位'],
  [2, 'tier2_common_building/market_stall_2.png', '集市摊位（变体）'],
  [2, 'tier2_common_building/orange_tree.png', '橘子树'],
  [2, 'tier2_common_building/palm_tree.png', '棕榈树'],
  [2, 'tier2_common_building/palm_tree_2.png', '棕榈树（变体）'],
  [2, 'tier2_common_building/pavilion.png', '凉亭'],
  [2, 'tier2_common_building/pine_tree.png', '松树'],
  [2, 'tier2_common_building/pine_tree_2.png', '松树（变体）'],
  [3, 'tier3_public_building/blue_roof_house.png', '蓝顶小屋'],
  [3, 'tier3_public_building/circus_tent.png', '马戏团帐篷'],
  [3, 'tier3_public_building/cottage.png', '小屋'],
  [3, 'tier3_public_building/cottage_2.png', '小屋（变体）'],
  [3, 'tier3_public_building/dome_house.png', '圆顶小屋'],
  [3, 'tier3_public_building/dome_house_2.png', '圆顶小屋（变体）'],
  [3, 'tier3_public_building/flag_canopy.png', '彩旗凉篷'],
  [3, 'tier3_public_building/fountain.png', '喷泉'],
  [3, 'tier3_public_building/fountain_2.png', '喷泉（变体）'],
  [3, 'tier3_public_building/lotus_pond.png', '荷花池'],
  [3, 'tier3_public_building/playground_slide.png', '儿童滑梯'],
  [3, 'tier3_public_building/post_office.png', '邮局'],
  [3, 'tier3_public_building/post_office_2.png', '邮局（变体）'],
  [3, 'tier3_public_building/rock_waterfall.png', '假山瀑布'],
  [3, 'tier3_public_building/stone_arch_gate.png', '石拱门'],
  [3, 'tier3_public_building/windmill.png', '风车'],
  [3, 'tier3_public_building/windmill_2.png', '风车（变体）'],
  [3, 'tier3_public_building/wizard_tent.png', '星月法师帐篷'],
  [3, 'tier3_public_building/wooden_bridge.png', '木拱桥'],
  [4, 'tier4_landmark/bakery_house.png', '面包房（厨师帽小屋）'],
  [4, 'tier4_landmark/carousel.png', '旋转木马'],
  [4, 'tier4_landmark/greenhouse.png', '玻璃温室'],
  [4, 'tier4_landmark/magic_tent.png', '魔法帐篷'],
];

const FOOTPRINT_OVERRIDES: Partial<Record<string, Footprint>> = {
  picket_fence: { width: 2, height: 1 },
  wooden_fence: { width: 2, height: 1 },
  wooden_bench: { width: 2, height: 1 },
  wooden_bench_2: { width: 2, height: 1 },
  lotus_pond: { width: 3, height: 3 },
  wooden_bridge: { width: 3, height: 1 },
  greenhouse: { width: 2, height: 2 },
  magic_tent: { width: 2, height: 2 },
};
const TERRAIN_OVERRIDES: Partial<Record<string, TerrainType[]>> = {
  rock: ['grass', 'rock'],
  palm_tree: ['grass', 'sand'],
  palm_tree_2: ['grass', 'sand'],
  rock_waterfall: ['grass', 'rock'],
};

export const REWARD_BUILDINGS = BUILDINGS.map(([tier, file, name]) => {
  const slug = file.split('/')[1].slice(0, -4);
  const id = `reward-${slug}`;
  return {
    id,
    name,
    tier,
    minutes: MINUTES_BY_TIER[tier],
    footprint: FOOTPRINT_OVERRIDES[slug] ?? FOOTPRINT_BY_TIER[tier],
    allowedTerrains: TERRAIN_OVERRIDES[slug] ?? (['grass'] as TerrainType[]),
    runtimeTextureKey: id,
    url: `/assets/building-rewards/${file}`,
  };
});
