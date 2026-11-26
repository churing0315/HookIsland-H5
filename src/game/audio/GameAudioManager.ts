import type { Screen } from '../types';
import { AUDIO_ASSETS, resolveButtonAudio, type AudioEffect, type ButtonAudioPolicy } from './audioAssets';

export class GameAudioManager {
  private screen: Screen = 'island';
  private unlocked = false;
  private mounted = false;
  private bgm: HTMLAudioElement | null = null;
  private readonly effects = new Map<AudioEffect, HTMLAudioElement>();
  private lastUnavailableAt = 0;

  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.root.addEventListener('pointerdown', this.handlePointerDown, true);
    this.root.addEventListener('click', this.handleClick, true);
    this.syncBgm();
  }

  setScreen(screen: Screen): void {
    if (screen === this.screen) return;
    this.screen = screen;
    if (screen === 'focus') this.getEffect('focusSuccess');
    this.syncBgm();
  }

  playConfirm(): void {
    this.playEffect('confirm');
  }

  playFocusSuccess(): void {
    this.playEffect('focusSuccess');
  }

  destroy(): void {
    this.root.removeEventListener('pointerdown', this.handlePointerDown, true);
    this.root.removeEventListener('click', this.handleClick, true);
    this.stopBgm();
    if (this.bgm) this.bgm.src = '';
    this.bgm = null;
    for (const audio of this.effects.values()) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    this.effects.clear();
    this.mounted = false;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.unlocked = true;
    this.syncBgm();
    const button = this.findButton(event.target);
    if (!button || !this.isUnavailable(button)) return;
    this.lastUnavailableAt = performance.now();
    this.playEffect('unavailable');
  };

  private readonly handleClick = (event: MouseEvent): void => {
    this.unlocked = true;
    const button = this.findButton(event.target);
    if (!button) return;
    const unavailable = this.isUnavailable(button);
    const policy = button.dataset.audioPolicy === 'custom' ? 'custom' : 'default';
    const effect = resolveButtonAudio(unavailable, policy as ButtonAudioPolicy);
    if (!effect) return;
    if (effect === 'unavailable' && performance.now() - this.lastUnavailableAt < 200) return;
    this.playEffect(effect);
  };

  private findButton(target: EventTarget | null): HTMLButtonElement | null {
    return target instanceof Element ? target.closest<HTMLButtonElement>('button') : null;
  }

  private isUnavailable(button: HTMLButtonElement): boolean {
    return button.disabled || button.getAttribute('aria-disabled') === 'true';
  }

  private playEffect(effect: AudioEffect): void {
    const audio = this.getEffect(effect);
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  private getEffect(effect: AudioEffect): HTMLAudioElement {
    let audio = this.effects.get(effect);
    if (!audio) {
      audio = new Audio(AUDIO_ASSETS[effect]);
      audio.preload = 'auto';
      this.effects.set(effect, audio);
    }
    return audio;
  }

  private syncBgm(): void {
    if (this.screen !== 'island' || !this.unlocked) {
      this.stopBgm();
      return;
    }
    if (!this.bgm) {
      this.bgm = new Audio(AUDIO_ASSETS.islandBgm);
      this.bgm.preload = 'auto';
      this.bgm.loop = true;
      this.bgm.volume = 0.35;
    }
    void this.bgm.play().catch(() => undefined);
  }

  private stopBgm(): void {
    if (!this.bgm) return;
    this.bgm.pause();
  }
}
