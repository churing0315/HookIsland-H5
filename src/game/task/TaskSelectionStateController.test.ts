import { describe, expect, it } from 'vitest';
import { TaskSelectionStateController } from './TaskSelectionStateController';

describe('task selection state controller', () => {
  it('locks transitions so rapid clicks cannot advance twice', () => {
    const controller = new TaskSelectionStateController();
    expect(controller.beginTransition()).toBe(true);
    expect(controller.beginTransition()).toBe(false);
    controller.finishTransition('DURATION_SELECT');
    expect(controller.current).toBe('DURATION_SELECT');
    expect(controller.beginTransition()).toBe(true);
  });
});
