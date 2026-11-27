import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { GameFlow } from '../state/GameFlow';
import type { TaskSelectionStep } from '../task/TaskSelectionStateController';
import type { VoiceManager } from '../task/VoiceManager';
import type { Screen } from '../types';
import { GUIDE_ASSETS, GUIDE_STEPS, guideVoiceSource } from './guideConfig';

export interface GuidePoint { x: number; y: number }

export class GuideController {
  private playing: number | null = null;
  private generation = 0;
  private timer: number | undefined;
  private frame = 0;
  private readyAt = 0;
  private screen: Screen = 'island';
  private phase: TaskSelectionStep | null = null;
  private rewardReady = false;
  private buildingPoint: GuidePoint | null = null;
  private welcomeGesture: (() => void) | null = null;
  private layer: HTMLElement | null = null;
  private finger: HTMLImageElement | null = null;
  private bubble: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, private readonly flow: GameFlow, private readonly voice: VoiceManager) {}

  get active(): boolean {
    return this.progress?.completed === false;
  }

  private get progress() { return this.flow.getSnapshot().data.guide; }

  rendered(screen: Screen): void {
    this.screen = screen;
    if (screen !== 'task-select') this.phase = null;
    this.rewardReady = false;
    if (screen !== 'island') this.buildingPoint = null;
    this.sync();
  }

  taskPhase(phase: TaskSelectionStep): void {
    this.screen = 'task-select';
    this.phase = phase;
    const { selectedTaskId, selectedMinutes } = this.flow.getSnapshot();
    if (phase === 'DURATION_SELECT' && this.progress?.step === 2) {
      this.flow.setGuide({ step: 3, completed: false, taskId: selectedTaskId ?? undefined });
    } else if (phase === 'CONTRACT_CONFIRM' && this.progress?.step === 3) {
      this.flow.setGuide({ step: 4, completed: false, taskId: selectedTaskId ?? undefined, minutes: selectedMinutes ?? undefined });
    }
    this.sync();
  }

  openTask(): void {
    if (this.active && this.progress!.step < 2) this.advance(2, false);
  }

  rewardRevealed(): void {
    this.rewardReady = true;
    this.sync();
  }

  async focusEnded(): Promise<void> {
    this.begin(6);
    const generation = this.generation;
    const result = await this.voice.playGuide(guideVoiceSource(6));
    if (this.generation !== generation || result === 'ended' || result === 'cancelled') return;
    this.caption(GUIDE_STEPS[6].text);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1_600));
  }

  pointAtBuilding(point: GuidePoint | null): void { this.buildingPoint = point; }

  editedBuilding(id: string): void {
    if (this.active && this.progress?.step === 9 && this.progress.buildingId === id) this.advance(10);
  }

  openedStorage(): void {
    if (this.active && this.progress?.step === 10) this.advance(11);
  }

  destroy(): void { this.reset(); }

  private advance(step: number, sync = true): void {
    this.flow.setGuide(step === 12 ? { step, completed: true } : { ...this.progress!, step });
    if (sync) this.sync();
  }

  private sync(): void {
    const progress = this.progress;
    const step = this.active && progress ? this.visibleStep(progress.step) : null;
    if (step === this.playing) {
      if (this.layer && this.layer.parentElement !== this.root) this.root.append(this.layer);
      return;
    }
    if (step === null) {
      this.reset();
      return;
    }
    this.begin(step);
    if (step === 9) {
      this.readyAt = performance.now() + 500;
      this.timer = window.setTimeout(() => this.narrate(step), 500);
    } else {
      this.narrate(step);
    }
  }

  private visibleStep(step: number): number | null {
    if (this.screen === 'island' && (step < 2 || step >= 7)) return step;
    if (this.screen === 'task-select' && (
      (step === 2 && this.phase === 'TASK_SELECT') ||
      (step === 3 && this.phase === 'DURATION_SELECT') ||
      (step === 4 && this.phase === 'CONTRACT_CONFIRM')
    )) return step;
    if (this.screen === 'focus' && (step === 5 || this.playing === 6)) return this.playing === 6 ? 6 : 5;
    if (this.screen === 'celebration' && step === 7 && this.rewardReady) return 7;
    if (this.screen === 'build' && step === 8) return 8;
    return null;
  }

  private begin(step: number): void {
    this.reset();
    this.playing = step;
    this.layer = document.createElement('div');
    this.layer.className = 'guide-layer';
    this.bubble = document.createElement('p');
    this.bubble.className = 'guide-bubble';
    this.bubble.setAttribute('role', 'status');
    this.bubble.hidden = true;
    this.finger = document.createElement('img');
    this.finger.src = `${GUIDE_ASSETS}/guide_finger.png`;
    this.finger.className = 'guide-finger';
    this.finger.alt = '';
    this.finger.hidden = true;
    this.layer.append(this.bubble, this.finger);
    this.root.append(this.layer);
    const config: { target?: string } = GUIDE_STEPS[step];
    const target = this.screen === 'island' && (step === 7 || step === 8) ? '.building-storage-toggle' : config.target;
    if (target || step === 9) this.trackFinger(step, target);
  }

  private narrate(step: number): void {
    const generation = this.generation;
    const automatic = step === 0 || step === 5 || step === 10 || step === 11;
    const play = (): void => {
      this.clearWelcomeGesture();
      if (step === 0) {
        const dismissWelcome = (): void => this.advance(1);
        this.welcomeGesture = dismissWelcome;
        window.addEventListener('click', dismissWelcome, true);
      }
      this.caption('');
      void this.voice.playGuide(guideVoiceSource(step)).then((result) => {
        if (this.generation !== generation || result === 'cancelled') return;
        const next = (): void => this.advance(step + 1);
        if (result === 'ended') {
          if (automatic) next();
          return;
        }
        if (step === 0 && result === 'blocked') {
          this.caption('你好呀，欢迎来到拉勾岛！点击任意处开始介绍');
          this.clearWelcomeGesture();
          this.welcomeGesture = play;
          window.addEventListener('click', play, true);
          window.addEventListener('WeixinJSBridgeReady', play, true);
          return;
        }
        this.caption(GUIDE_STEPS[step].text);
        if (automatic) this.timer = window.setTimeout(next, 3_000);
      });
    };
    if (step === 9) this.timer = window.setTimeout(() => this.advance(10), 8_000);
    play();
  }

  private caption(text: string): void {
    if (!this.bubble) return;
    this.bubble.textContent = text;
    this.bubble.hidden = !text;
    this.bubble.classList.toggle('guide-bubble-welcome', this.playing === 0);
  }

  private trackFinger(step: number, selector?: string): void {
    const update = (): void => {
      const finger = this.finger!;
      const area = this.root.getBoundingClientRect();
      const activeSelector = step === 3 && this.flow.getSnapshot().selectedMinutes !== null ? '.task-v2-next' : selector;
      const target = activeSelector ? this.root.querySelector<HTMLElement>(activeSelector) : null;
      const rect = target?.getBoundingClientRect();
      const isNext = target?.classList.contains('task-v2-next');
      const isDurationOption = step === 3 && !isNext;
      // The original finger points up and left, so it approaches controls from their right side.
      const anchorX = isNext ? 0.92 : isDurationOption ? 0.74 : 0.73;
      const anchorY = isNext ? 0.4 : isDurationOption ? 0.78 : 1;
      const point = activeSelector
        ? (rect && target && !target.hidden && rect.width && getComputedStyle(target).visibility === 'visible'
          ? { x: rect.left - area.left + rect.width * anchorX, y: rect.top - area.top + rect.height * anchorY } : null)
        : (this.buildingPoint && { x: this.buildingPoint.x * area.width / GAME_WIDTH, y: this.buildingPoint.y * area.height / GAME_HEIGHT });
      finger.hidden = !point || performance.now() < this.readyAt;
      if (point) {
        const width = finger.offsetWidth || 64;
        finger.style.left = `${Math.max(0, Math.min(area.width - width, point.x - width * 0.18))}px`;
        finger.style.top = `${Math.max(0, Math.min(area.height - width - 8, point.y - width * 0.12))}px`;
      }
      this.frame = window.requestAnimationFrame(update);
    };
    this.frame = window.requestAnimationFrame(update);
  }

  private clearWelcomeGesture(): void {
    if (!this.welcomeGesture) return;
    window.removeEventListener('click', this.welcomeGesture, true);
    window.removeEventListener('WeixinJSBridgeReady', this.welcomeGesture, true);
    this.welcomeGesture = null;
  }

  private reset(): void {
    if (this.playing !== null) this.voice.stopPrompt();
    this.generation++;
    this.playing = null;
    this.clearWelcomeGesture();
    window.clearTimeout(this.timer);
    window.cancelAnimationFrame(this.frame);
    this.readyAt = 0;
    this.layer?.remove();
    this.layer = null;
    this.bubble = null;
    this.finger = null;
  }
}
