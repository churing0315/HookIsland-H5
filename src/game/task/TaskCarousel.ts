import { TASK_ASSETS, TASK_VISUALS, type TaskVisualConfig } from './taskConfig';
import { cardTiltDegrees, clampCarouselPosition, nearestCarouselIndex } from './carouselMath';
import { bindPressFeedback } from './pressFeedback';

interface CarouselCallbacks {
  onSelected: (task: TaskVisualConfig, playVoice: boolean) => void;
}

export class TaskCarousel {
  private readonly cards: HTMLButtonElement[] = [];
  private readonly cleanup: Array<() => void> = [];
  private position: number;
  private selectedIndex: number;
  private dragging = false;
  private pointerId: number | null = null;
  private startX = 0;
  private lastX = 0;
  private lastAt = 0;
  private velocity = 0;
  private moved = false;
  private animationFrame: number | null = null;
  private pressedIndex: number | null = null;
  private lastPointerSelectionAt = 0;
  private destroyed = false;

  constructor(
    private readonly viewport: HTMLElement,
    selectedTaskId: string | null,
    private readonly callbacks: CarouselCallbacks,
  ) {
    const configuredIndex = TASK_VISUALS.findIndex((task) => task.id === selectedTaskId);
    this.selectedIndex = configuredIndex >= 0 ? configuredIndex : TASK_VISUALS.findIndex((task) => task.id === 'book');
    this.position = this.selectedIndex;
    this.build();
    this.bindInput();
    this.render();
  }

  setSelectedTask(taskId: string | null): void {
    const index = TASK_VISUALS.findIndex((task) => task.id === taskId);
    if (index < 0 || index === this.selectedIndex) return;
    this.selectedIndex = index;
    this.position = index;
    this.render();
  }

  exit(): Promise<void> {
    this.stopAnimation();
    this.viewport.classList.add('is-exiting');
    return new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  destroy(): void {
    this.destroyed = true;
    this.stopAnimation();
    for (const remove of this.cleanup) remove();
    this.cleanup.length = 0;
  }

  private build(): void {
    this.viewport.innerHTML = '';
    TASK_VISUALS.forEach((task, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'task-v2-card pressable';
      card.dataset.taskId = task.id;
      card.setAttribute('aria-label', `选择${task.name}`);
      card.style.setProperty('--entry-order', String(Math.abs(index - this.selectedIndex)));
      card.innerHTML = `
        <img class="task-v2-card-spot" src="${TASK_ASSETS.selectedSpot}" alt="">
        <img class="task-v2-card-base task-v2-card-base-default" src="${TASK_ASSETS.cardDefault}" alt="">
        <img class="task-v2-card-base task-v2-card-base-selected" src="${TASK_ASSETS.cardSelected}" alt="">
        <img class="task-v2-card-art" src="${task.illustration}" alt="">
        <span class="task-v2-card-name">${task.name}</span>
      `;
      const click = (): void => {
        if (performance.now() - this.lastPointerSelectionAt < 120 || this.moved || this.dragging) return;
        this.selectIndex(index, true);
      };
      card.addEventListener('click', click);
      this.cleanup.push(() => card.removeEventListener('click', click));
      this.cleanup.push(bindPressFeedback(card));
      this.viewport.append(card);
      this.cards.push(card);
    });
  }

  private bindInput(): void {
    const down = (event: PointerEvent): void => {
      if (this.pointerId !== null) return;
      this.stopAnimation();
      this.pointerId = event.pointerId;
      this.dragging = true;
      this.moved = false;
      this.startX = event.clientX;
      this.lastX = event.clientX;
      this.lastAt = event.timeStamp;
      this.velocity = 0;
      const card = (event.target as HTMLElement).closest<HTMLButtonElement>('.task-v2-card');
      this.pressedIndex = card ? this.cards.indexOf(card) : null;
      this.viewport.setPointerCapture(event.pointerId);
      this.viewport.classList.add('is-dragging');
    };
    const move = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointerId || !this.dragging) return;
      const spacing = this.cardSpacing();
      const dx = event.clientX - this.lastX;
      const elapsed = Math.max(8, event.timeStamp - this.lastAt);
      if (Math.abs(event.clientX - this.startX) > 7) this.moved = true;
      this.position = clampCarouselPosition(this.position - dx / spacing, TASK_VISUALS.length);
      this.velocity = (-dx / spacing) / elapsed;
      this.lastX = event.clientX;
      this.lastAt = event.timeStamp;
      this.render();
    };
    const end = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.pointerId = null;
      this.viewport.classList.remove('is-dragging');
      if (this.viewport.hasPointerCapture(event.pointerId)) this.viewport.releasePointerCapture(event.pointerId);
      if (this.moved) {
        this.startInertia();
        window.setTimeout(() => { this.moved = false; }, 0);
      } else if (this.pressedIndex !== null) {
        this.lastPointerSelectionAt = performance.now();
        this.selectIndex(this.pressedIndex, true);
      }
      this.pressedIndex = null;
    };
    this.viewport.addEventListener('pointerdown', down);
    this.viewport.addEventListener('pointermove', move);
    this.viewport.addEventListener('pointerup', end);
    this.viewport.addEventListener('pointercancel', end);
    this.cleanup.push(() => this.viewport.removeEventListener('pointerdown', down));
    this.cleanup.push(() => this.viewport.removeEventListener('pointermove', move));
    this.cleanup.push(() => this.viewport.removeEventListener('pointerup', end));
    this.cleanup.push(() => this.viewport.removeEventListener('pointercancel', end));
  }

  private selectIndex(index: number, playVoice: boolean): void {
    this.stopAnimation();
    this.selectedIndex = index;
    this.callbacks.onSelected(TASK_VISUALS[index], playVoice);
    this.springTo(index, false);
  }

  private startInertia(): void {
    let last = performance.now();
    let velocity = Math.max(-0.006, Math.min(0.006, this.velocity));
    const step = (now: number): void => {
      if (this.destroyed) return;
      const elapsed = Math.min(32, now - last);
      last = now;
      this.position = clampCarouselPosition(this.position + velocity * elapsed, TASK_VISUALS.length);
      velocity *= Math.pow(0.8, elapsed / 16);
      this.render();
      const atEdge = this.position <= 0 || this.position >= TASK_VISUALS.length - 1;
      if (Math.abs(velocity) < 0.00045 || atEdge) {
        this.springTo(nearestCarouselIndex(this.position, TASK_VISUALS.length), true);
        return;
      }
      this.animationFrame = requestAnimationFrame(step);
    };
    this.animationFrame = requestAnimationFrame(step);
  }

  private springTo(target: number, notify: boolean): void {
    let velocity = 0;
    let last = performance.now();
    const step = (now: number): void => {
      if (this.destroyed) return;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const displacement = target - this.position;
      velocity += displacement * 150 * dt;
      velocity *= Math.pow(0.00002, dt);
      this.position = clampCarouselPosition(this.position + velocity * dt, TASK_VISUALS.length);
      this.render();
      if (Math.abs(displacement) < 0.0015 && Math.abs(velocity) < 0.012) {
        this.position = target;
        this.selectedIndex = target;
        this.render();
        this.animationFrame = null;
        if (notify) this.callbacks.onSelected(TASK_VISUALS[target], false);
        return;
      }
      this.animationFrame = requestAnimationFrame(step);
    };
    this.animationFrame = requestAnimationFrame(step);
  }

  private render(): void {
    const nearest = nearestCarouselIndex(this.position, TASK_VISUALS.length);
    this.cards.forEach((card, index) => {
      const relative = index - this.position;
      const offset = relative * this.cardSpacing();
      const selected = index === nearest;
      card.classList.toggle('is-selected', selected);
      card.style.zIndex = String(20 - Math.round(Math.abs(relative)));
      card.style.transform = `translate3d(calc(-50% + ${offset}px), 0, 0) rotate(${cardTiltDegrees(relative)}deg) scale(${selected ? 1.1 : 1})`;
      card.setAttribute('aria-pressed', String(index === this.selectedIndex));
    });
  }

  private cardSpacing(): number {
    return Math.max(130, this.viewport.clientWidth * 0.225);
  }

  private stopAnimation(): void {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }
}
