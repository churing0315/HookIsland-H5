import { bindPressFeedback } from './pressFeedback';
import { TASK_ASSETS, type TaskVisualConfig } from './taskConfig';

interface ConfirmCallbacks {
  onConfirmed: () => void;
}

export class ContractConfirm {
  private readonly button: HTMLButtonElement;
  private readonly cleanup: Array<() => void> = [];
  private pointerId: number | null = null;
  private startedAt = 0;
  private animationFrame: number | null = null;
  private resetTimer: number | null = null;
  private completed = false;
  private progress = 0;

  constructor(
    root: HTMLElement,
    task: TaskVisualConfig,
    minutes: 5 | 10 | 15 | 20,
    private readonly callbacks: ConfirmCallbacks,
  ) {
    root.innerHTML = `
      <img class="task-v2-confirm-mascot" src="${TASK_ASSETS.mascot}" alt="小伴龙">
      <section class="task-v2-confirm-card" aria-label="确认专注契约">
        <img class="task-v2-confirm-panel" src="${TASK_ASSETS.confirmPanel}" alt="">
        <img class="task-v2-confirm-art" src="${task.illustration}" alt="${task.name}">
        <strong class="task-v2-confirm-name">${task.name}</strong>
        <div class="task-v2-confirm-time"><img src="${TASK_ASSETS.hourglass}" alt=""><b>${minutes} 分钟</b></div>
        <button class="task-v2-hold-button pressable" type="button" aria-label="长按一秒拉钩确认">
          <svg class="task-v2-hold-progress" viewBox="0 0 440 120" aria-hidden="true">
            <rect x="7" y="7" width="426" height="106" rx="53" pathLength="100"></rect>
          </svg>
          <img src="${TASK_ASSETS.confirmLabel}" alt="拉钩">
          <span class="task-v2-hold-exclamation">!</span>
        </button>
      </section>
    `;
    const button = root.querySelector<HTMLButtonElement>('.task-v2-hold-button');
    if (!button) throw new Error('Missing contract confirmation button');
    this.button = button;
    this.bind();
  }

  destroy(): void {
    this.cancelProgress(false);
    for (const remove of this.cleanup) remove();
    this.cleanup.length = 0;
  }

  private bind(): void {
    const down = (event: PointerEvent): void => {
      if (this.completed || this.pointerId !== null || !event.isPrimary) return;
      if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
      this.pointerId = event.pointerId;
      this.startedAt = performance.now() - this.progress * 1_000;
      this.button.setPointerCapture(event.pointerId);
      this.button.classList.add('is-holding');
      this.tick();
    };
    const end = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointerId || this.completed) return;
      this.cancelProgress(true);
    };
    const move = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointerId || this.completed) return;
      const bounds = this.button.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        this.cancelProgress(true);
      }
    };
    this.button.addEventListener('pointerdown', down);
    this.button.addEventListener('pointerup', end);
    this.button.addEventListener('pointercancel', end);
    this.button.addEventListener('lostpointercapture', end);
    this.button.addEventListener('pointermove', move);
    this.cleanup.push(() => this.button.removeEventListener('pointerdown', down));
    this.cleanup.push(() => this.button.removeEventListener('pointerup', end));
    this.cleanup.push(() => this.button.removeEventListener('pointercancel', end));
    this.cleanup.push(() => this.button.removeEventListener('lostpointercapture', end));
    this.cleanup.push(() => this.button.removeEventListener('pointermove', move));
    this.cleanup.push(bindPressFeedback(this.button));
  }

  private tick = (): void => {
    if (this.pointerId === null || this.completed) return;
    this.progress = Math.min(1, (performance.now() - this.startedAt) / 1_000);
    this.updateProgress();
    if (this.progress >= 1) {
      this.completed = true;
      this.pointerId = null;
      this.button.classList.remove('is-holding');
      this.button.classList.add('is-complete');
      this.button.disabled = true;
      this.callbacks.onConfirmed();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private cancelProgress(animate: boolean): void {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    const capturedPointer = this.pointerId;
    this.pointerId = null;
    if (capturedPointer !== null && this.button.hasPointerCapture(capturedPointer)) {
      this.button.releasePointerCapture(capturedPointer);
    }
    this.button.classList.remove('is-holding');
    if (this.completed) return;
    if (animate) {
      this.button.classList.add('is-resetting');
      this.progress = 0;
      this.updateProgress();
      this.resetTimer = window.setTimeout(() => this.button.classList.remove('is-resetting'), 210);
    } else {
      this.progress = 0;
      this.updateProgress();
    }
  }

  private updateProgress(): void {
    this.button.style.setProperty('--hold-progress', String(this.progress * 100));
  }
}
