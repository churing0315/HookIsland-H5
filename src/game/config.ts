export const GAME_WIDTH = 812;
export const GAME_HEIGHT = 375;
export const DAILY_PLANT_LIMIT = 5;
export const STORAGE_KEY = 'lagou-island.prototype.v1';

export const COLORS = {
  water: 0xc3d8ec,
  waterLine: 0xaec9e0,
  grass: 0xb8cc7e,
  grassLight: 0xc9da92,
  grassDark: 0xa3b96c,
  sand: 0xf2e3c2,
  cloud: 0xfdfaf3,
  card: 0xfff9f0,
  text: 0x4a3b2a,
  primary: 0xe88a6e,
  remaining: 0x5fae57,
  elapsed: 0xefebe0,
  invalid: 0xb9bcb4,
  mascotGold: 0xfec845,
  mascotRed: 0xed4836,
  mascotBlue: 0x54cdfd,
  mascotBrown: 0x602711,
} as const;

export const FAST_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fast') === '1';
