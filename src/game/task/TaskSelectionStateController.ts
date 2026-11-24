export type TaskSelectionStep = 'TASK_SELECT' | 'DURATION_SELECT' | 'CONTRACT_CONFIRM';

export class TaskSelectionStateController {
  private step: TaskSelectionStep = 'TASK_SELECT';
  private locked = false;

  get current(): TaskSelectionStep {
    return this.step;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  beginTransition(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  finishTransition(next: TaskSelectionStep): void {
    this.step = next;
    this.locked = false;
  }

  reset(next: TaskSelectionStep): void {
    this.step = next;
    this.locked = false;
  }
}
