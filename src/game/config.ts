export const GAME_WIDTH = 812;
export const GAME_HEIGHT = 375;
export const DAILY_PLANT_LIMIT = 3;
export const DAILY_PLANT_LIMIT_ENABLED: boolean = false;
export const STORAGE_KEY = 'lagou-island.prototype.v1';

export const COLORS = {
  water: 0x55cbe4,
  waterLine: 0x92eaf4,
  grass: 0x9edc39,
  grassLight: 0xb4e84a,
  grassDark: 0x86c82e,
  sand: 0xffe59a,
  rock: 0xc9865d,
  rockLight: 0xdf9d70,
  coast: 0xa5edf0,
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

function readDemoStage(): 0 | 1 | 2 | null {
  if (!FAST_MODE || typeof window === 'undefined') return null;
  const value = Number(new URLSearchParams(window.location.search).get('mapStage'));
  return value === 0 || value === 1 || value === 2 ? value : null;
}

function readDemoZoom(): number | null {
  if (!FAST_MODE || typeof window === 'undefined') return null;
  const value = Number(new URLSearchParams(window.location.search).get('zoom'));
  return Number.isFinite(value) && value >= 0.65 && value <= 1.6 ? value : null;
}

export const DEMO_MAP_STAGE = readDemoStage();
export const DEMO_ZOOM = readDemoZoom();
