import { bindPressFeedback } from './pressFeedback';
import { DURATION_VISUALS, type DurationVisualConfig } from './taskConfig';

interface DurationCallbacks {
  onSelected: (duration: DurationVisualConfig) => void;
}

export class DurationSelector {
  private readonly buttons = new Map<number, HTMLButtonElement>();
  private readonly cleanup: Array<() => void> = [];
  private selectedMinutes: 5 | 10 | 15 | 20 | null;

  constructor(
    private readonly root: HTMLElement,
    selectedMinutes: 5 | 10 | 15 | 20 | null,
    private readonly callbacks: DurationCallbacks,
  ) {
    this.selectedMinutes = selectedMinutes;
    this.build();
    this.setSelected(selectedMinutes);
  }

  setSelected(minutes: 5 | 10 | 15 | 20 | null): void {
    this.selectedMinutes = minutes;
    for (const [value, button] of this.buttons) {
      const selected = value === minutes;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  transitionToConfirm(): Promise<void> {
    if (this.selectedMinutes === null) return Promise.resolve();
    this.root.classList.add('is-confirming');
    for (const [value, button] of this.buttons) {
      button.classList.toggle('is-confirm-target', value === this.selectedMinutes);
      button.classList.toggle('is-confirm-away', value !== this.selectedMinutes);
    }
    return new Promise((resolve) => window.setTimeout(resolve, 520));
  }

  destroy(): void {
    for (const remove of this.cleanup) remove();
    this.cleanup.length = 0;
  }

  private build(): void {
    this.root.innerHTML = '';
    DURATION_VISUALS.forEach((duration, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'task-v2-duration';
      button.dataset.audioPolicy = 'custom';
      button.style.setProperty('--duration-index', String(index));
      button.style.setProperty('--confirm-shift', `${(1.5 - index) * this.root.clientWidth * 0.2044}px`);
      button.setAttribute('aria-label', `选择${duration.minutes}分钟`);
      button.innerHTML = `<span class="task-v2-duration-wobble-surface"><span class="task-v2-duration-press-surface pressable"><img src="${duration.image}" alt="${duration.minutes}分钟"></span></span>`;
      const click = (): void => {
        this.setSelected(duration.minutes);
        this.callbacks.onSelected(duration);
      };
      button.addEventListener('click', click);
      this.cleanup.push(() => button.removeEventListener('click', click));
      const pressSurface = button.querySelector<HTMLElement>('.task-v2-duration-press-surface');
      if (!pressSurface) throw new Error('Missing duration press surface');
      this.cleanup.push(bindPressFeedback(button, pressSurface));
      this.root.append(button);
      this.buttons.set(duration.minutes, button);
    });
  }
}
