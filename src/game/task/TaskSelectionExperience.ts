import type { GameFlow } from '../state/GameFlow';
import type { GameAudioManager } from '../audio/GameAudioManager';
import type { GameSnapshot } from '../types';
import { ContractConfirm } from './ContractConfirm';
import { DurationSelector } from './DurationSelector';
import { bindPressFeedback } from './pressFeedback';
import { TaskCarousel } from './TaskCarousel';
import { TaskSelectionStateController, type TaskSelectionStep } from './TaskSelectionStateController';
import { VoiceManager } from './VoiceManager';
import { findTaskVisual, TASK_ASSETS, TASK_VISUALS } from './taskConfig';

export class TaskSelectionExperience {
  private snapshot: GameSnapshot;
  private readonly state = new TaskSelectionStateController();
  private readonly voice = new VoiceManager();
  private readonly cleanup: Array<() => void> = [];
  private carousel: TaskCarousel | null = null;
  private durationSelector: DurationSelector | null = null;
  private confirm: ContractConfirm | null = null;
  private nextButton: HTMLButtonElement | null = null;
  private prompt: HTMLImageElement | null = null;
  private durationRoot: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private confirmRoot: HTMLElement | null = null;
  private destroyed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly flow: GameFlow,
    snapshot: GameSnapshot,
    private readonly audio: GameAudioManager,
  ) {
    this.snapshot = snapshot;
  }

  mount(): void {
    this.renderStep('TASK_SELECT');
  }

  syncSnapshot(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    this.carousel?.setSelectedTask(snapshot.selectedTaskId);
    this.durationSelector?.setSelected(snapshot.selectedMinutes);
    this.updateNextAvailability();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearStep();
    this.voice.destroy();
  }

  private renderStep(step: TaskSelectionStep): void {
    this.clearStep();
    this.state.reset(step);
    this.host.innerHTML = `
      <section class="task-v2" aria-label="选择专注契约">
        <div class="task-v2-design">
        <img class="task-v2-cloud cloud-a" src="/assets/v2/mascot-cloud.png" alt="">
        <img class="task-v2-cloud cloud-b" src="/assets/v2/mascot-cloud.png" alt="">
        <img class="task-v2-cloud cloud-c" src="/assets/v2/mascot-cloud.png" alt="">
        <img class="task-v2-shadow task-v2-shadow-left" src="${TASK_ASSETS.sideShadow}" alt="">
        <img class="task-v2-shadow task-v2-shadow-right" src="${TASK_ASSETS.sideShadow}" alt="">
        <button class="task-v2-back pressable" type="button" aria-label="返回"><img src="/assets/v2/btn-back.png" alt=""></button>
        <div class="task-v2-carousel-viewport" aria-label="任务轮播"></div>
        <div class="task-v2-duration-root" aria-label="时长选择"></div>
        <div class="task-v2-bottom">
          <img class="task-v2-bottom-image" src="${TASK_ASSETS.panel}" alt="">
          <img class="task-v2-prompt" alt="">
          <button class="task-v2-next pressable" type="button" aria-label="下一步"><img src="${TASK_ASSETS.nextButton}" alt="下一步"></button>
        </div>
        <div class="task-v2-confirm-root"></div>
        </div>
      </section>
    `;
    const design = this.host.querySelector<HTMLElement>('.task-v2-design');
    if (!design) throw new Error('Task selection design surface failed to mount');
    const resize = (): void => {
      const scale = Math.min(this.host.clientWidth / 812, this.host.clientHeight / 375);
      design.style.setProperty('--task-scale', String(scale));
      design.style.left = `${(this.host.clientWidth - 812 * scale) / 2}px`;
      design.style.top = `${(this.host.clientHeight - 375 * scale) / 2}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(this.host);
    this.cleanup.push(() => observer.disconnect());
    const back = this.host.querySelector<HTMLButtonElement>('.task-v2-back');
    this.nextButton = this.host.querySelector<HTMLButtonElement>('.task-v2-next');
    this.prompt = this.host.querySelector<HTMLImageElement>('.task-v2-prompt');
    this.durationRoot = this.host.querySelector<HTMLElement>('.task-v2-duration-root');
    this.panel = this.host.querySelector<HTMLElement>('.task-v2-bottom');
    this.confirmRoot = this.host.querySelector<HTMLElement>('.task-v2-confirm-root');
    const carouselRoot = this.host.querySelector<HTMLElement>('.task-v2-carousel-viewport');
    if (!back || !this.nextButton || !this.prompt || !this.durationRoot || !this.panel || !this.confirmRoot || !carouselRoot) {
      throw new Error('Task selection UI failed to mount');
    }
    const onBack = (): void => this.goBack();
    const onNext = (): void => this.goNext();
    back.addEventListener('click', onBack);
    this.nextButton.addEventListener('click', onNext);
    this.cleanup.push(() => back.removeEventListener('click', onBack));
    this.cleanup.push(() => this.nextButton?.removeEventListener('click', onNext));
    this.cleanup.push(bindPressFeedback(back));
    this.cleanup.push(bindPressFeedback(this.nextButton));

    const noteActivity = (): void => this.voice.noteActivity();
    const onDrag = (event: PointerEvent): void => {
      if (event.buttons) noteActivity();
    };
    for (const event of ['pointerdown', 'pointerup', 'keydown', 'wheel', 'click']) {
      design.addEventListener(event, noteActivity, { capture: true, passive: true });
      this.cleanup.push(() => design.removeEventListener(event, noteActivity, true));
    }
    design.addEventListener('pointermove', onDrag, { passive: true });
    this.cleanup.push(() => design.removeEventListener('pointermove', onDrag));

    if (step === 'TASK_SELECT') {
      this.prompt.src = TASK_ASSETS.promptTask;
      this.durationRoot.hidden = true;
      this.carousel = new TaskCarousel(carouselRoot, this.snapshot.selectedTaskId, {
        onSelected: (task, playVoice) => {
          this.flow.selectTask(task.id);
          if (playVoice) this.voice.play(task.voice);
        },
      });
      this.voice.startPrompt(TASK_ASSETS.promptTaskVoice);
    } else if (step === 'DURATION_SELECT') {
      carouselRoot.hidden = true;
      this.prompt.src = TASK_ASSETS.promptDuration;
      this.mountDurationSelector();
      this.voice.startPrompt(TASK_ASSETS.promptDurationVoice);
    } else {
      carouselRoot.hidden = true;
      this.prompt.hidden = true;
      this.panel.classList.add('is-lowering', 'is-lowered');
      this.mountDurationSelector();
      this.durationRoot.classList.add('is-confirming');
      this.mountConfirmation();
    }
    this.updateNextAvailability();
  }

  private mountDurationSelector(): void {
    if (!this.durationRoot) return;
    this.durationRoot.hidden = false;
    this.durationSelector = new DurationSelector(this.durationRoot, this.snapshot.selectedMinutes, {
      onSelected: (duration) => {
        this.flow.selectMinutes(duration.minutes);
        this.voice.play(duration.voice);
      },
    });
  }

  private goNext(): void {
    if (this.state.current === 'TASK_SELECT') {
      void this.showDurationStep();
    } else if (this.state.current === 'DURATION_SELECT' && this.snapshot.selectedMinutes !== null) {
      void this.showConfirmStep();
    }
  }

  private goBack(): void {
    if (this.state.isLocked) return;
    if (this.state.current === 'TASK_SELECT') {
      this.flow.returnToIsland();
    } else if (this.state.current === 'DURATION_SELECT') {
      this.renderStep('TASK_SELECT');
    } else {
      this.renderStep('DURATION_SELECT');
    }
  }

  private async showDurationStep(): Promise<void> {
    if (!this.state.beginTransition()) return;
    this.voice.stopPrompt();
    if (this.nextButton) this.nextButton.setAttribute('aria-disabled', 'true');
    await this.carousel?.exit();
    if (this.destroyed || !this.durationRoot || !this.prompt) return;
    this.carousel?.destroy();
    this.carousel = null;
    const carouselRoot = this.host.querySelector<HTMLElement>('.task-v2-carousel-viewport');
    if (carouselRoot) carouselRoot.hidden = true;
    this.prompt.classList.add('is-switching');
    this.prompt.src = TASK_ASSETS.promptDuration;
    this.durationRoot.hidden = false;
    this.mountDurationSelector();
    window.setTimeout(() => this.prompt?.classList.remove('is-switching'), 180);
    this.state.finishTransition('DURATION_SELECT');
    this.updateNextAvailability();
    this.voice.startPrompt(TASK_ASSETS.promptDurationVoice);
  }

  private async showConfirmStep(): Promise<void> {
    if (!this.state.beginTransition() || !this.durationSelector || !this.panel) return;
    this.voice.stopPrompt();
    if (this.nextButton) this.nextButton.setAttribute('aria-disabled', 'true');
    await this.durationSelector.transitionToConfirm();
    if (this.destroyed) return;
    this.panel.classList.add('is-lowering');
    void this.panel.offsetHeight;
    this.panel.classList.add('is-lowered');
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    if (this.destroyed) return;
    this.mountConfirmation();
    this.state.finishTransition('CONTRACT_CONFIRM');
  }

  private mountConfirmation(): void {
    if (!this.confirmRoot || this.confirm || this.snapshot.selectedMinutes === null) return;
    const task = findTaskVisual(this.snapshot.selectedTaskId) ?? TASK_VISUALS[0];
    this.confirmRoot.classList.add('is-visible');
    this.confirm = new ContractConfirm(this.confirmRoot, task, this.snapshot.selectedMinutes, {
      onConfirmed: () => {
        this.audio.playConfirm();
        this.flow.confirmContract();
      },
    });
  }

  private updateNextAvailability(): void {
    if (!this.nextButton) return;
    const unavailable = this.state.isLocked ||
      (this.state.current === 'TASK_SELECT' ? this.snapshot.selectedTaskId === null : this.snapshot.selectedMinutes === null);
    this.nextButton.disabled = false;
    this.nextButton.setAttribute('aria-disabled', String(unavailable));
    this.nextButton.hidden = this.state.current === 'CONTRACT_CONFIRM';
  }

  private clearStep(): void {
    this.voice.stopPrompt();
    this.carousel?.destroy();
    this.durationSelector?.destroy();
    this.confirm?.destroy();
    this.carousel = null;
    this.durationSelector = null;
    this.confirm = null;
    for (const remove of this.cleanup.splice(0)) remove();
  }
}
