export type AudioEffect = 'click' | 'confirm' | 'unavailable';
export type ButtonAudioPolicy = 'default' | 'custom';

const ROOT = '/assets/audio';

export const AUDIO_ASSETS = {
  click: `${ROOT}/click.wav`,
  islandBgm: `${ROOT}/birds-morning.wav`,
  confirm: `${ROOT}/confirmbtn.wav`,
  unavailable: `${ROOT}/unableclick.wav`,
  homePinkyReserved: `${ROOT}/homepinky.wav`,
} as const;

export function resolveButtonAudio(
  unavailable: boolean,
  policy: ButtonAudioPolicy = 'default',
): AudioEffect | null {
  if (unavailable) return 'unavailable';
  return policy === 'custom' ? null : 'click';
}
