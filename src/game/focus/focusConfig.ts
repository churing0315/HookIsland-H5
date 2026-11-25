export const FOCUS_ASSET_ROOT = '/assets/focus-v2';

export const FOCUS_TEXTURES = {
  island: 'focus-island',
  fish1: 'focus-fish-1',
  fish2: 'focus-fish-2',
  wave1: 'focus-wave-1',
  wave2: 'focus-wave-2',
  seagull: 'focus-seagull',
  cloud: 'focus-cloud',
  clean: 'focus-xbl-clean',
  english: 'focus-xbl-english',
  homework: 'focus-xbl-homework',
  lego: 'focus-xbl-lego',
  listen: 'focus-xbl-listen',
  paint: 'focus-xbl-paint',
  read: 'focus-xbl-read',
  sport: 'focus-xbl-sport',
} as const;

export const FOCUS_TEXTURE_PATHS: ReadonlyArray<readonly [string, string]> = [
  [FOCUS_TEXTURES.island, `${FOCUS_ASSET_ROOT}/focus_img_island.png`],
  [FOCUS_TEXTURES.fish1, `${FOCUS_ASSET_ROOT}/focus_illust_fish1.png`],
  [FOCUS_TEXTURES.fish2, `${FOCUS_ASSET_ROOT}/focus_illust_fish2.png`],
  [FOCUS_TEXTURES.wave1, `${FOCUS_ASSET_ROOT}/focus_illust_wave1.png`],
  [FOCUS_TEXTURES.wave2, `${FOCUS_ASSET_ROOT}/focus_illust_wave2.png`],
  [FOCUS_TEXTURES.seagull, `${FOCUS_ASSET_ROOT}/focus_illust_seagull.png`],
  [FOCUS_TEXTURES.cloud, `${FOCUS_ASSET_ROOT}/focus_illust_cloud_1.png`],
  [FOCUS_TEXTURES.clean, `${FOCUS_ASSET_ROOT}/focus_xbl_clean.png`],
  [FOCUS_TEXTURES.english, `${FOCUS_ASSET_ROOT}/focus_xbl_english.png`],
  [FOCUS_TEXTURES.homework, `${FOCUS_ASSET_ROOT}/focus_xbl_homework.png`],
  [FOCUS_TEXTURES.lego, `${FOCUS_ASSET_ROOT}/focus_xbl_lego.png`],
  [FOCUS_TEXTURES.listen, `${FOCUS_ASSET_ROOT}/focus_xbl_listen.png`],
  [FOCUS_TEXTURES.paint, `${FOCUS_ASSET_ROOT}/focus_xbl_paint.png`],
  [FOCUS_TEXTURES.read, `${FOCUS_ASSET_ROOT}/focus_xbl_read.png`],
  [FOCUS_TEXTURES.sport, `${FOCUS_ASSET_ROOT}/focus_xbl_sport.png`],
];

export const FOCUS_TASK_TEXTURE: Readonly<Record<string, string>> = {
  'tidy-toys': FOCUS_TEXTURES.clean,
  english: FOCUS_TEXTURES.english,
  homework: FOCUS_TEXTURES.homework,
  blocks: FOCUS_TEXTURES.lego,
  story: FOCUS_TEXTURES.listen,
  draw: FOCUS_TEXTURES.paint,
  book: FOCUS_TEXTURES.read,
  exercise: FOCUS_TEXTURES.sport,
};

export const FOCUS_RING = {
  centerX: 406,
  centerY: 158,
  outerRadius: 102,
  ringWidth: 16,
  innerRadius: 90,
  trackColor: 0x1998dc,
  remainingColor: 0xf4f587,
  whiteStrokeWidth: 7,
  innerTopColor: 0x71d07c,
  innerBottomColor: 0x8bcf71,
  glowColor: 0xfcffb3,
  islandScale: 0.34,
  mascotScale: 0.27,
  mascotBreathScale: 0.277,
  clockwise: true,
} as const;

export const FOCUS_ENVIRONMENT = {
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
  waveDurationMs: 8_000,
  fishDurationMs: 16_000,
  cloudDurationMs: 20_000,
  seagullDurationMs: 13_000,
  seagullGapMs: 26_000,
  glintCount: 6,
  bubbleCount: 11,
} as const;

export function resolveFocusTexture(taskId: string): string {
  return FOCUS_TASK_TEXTURE[taskId] ?? FOCUS_TEXTURES.read;
}

export function focusElapsedRatio(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
}

export function focusRemainingRatio(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return Math.max(0, Math.min(1, remainingMs / totalMs));
}

export function formatFocusTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function shouldReduceFocusMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('reducedMotion') === '1' || window.matchMedia(FOCUS_ENVIRONMENT.reducedMotionQuery).matches;
}
