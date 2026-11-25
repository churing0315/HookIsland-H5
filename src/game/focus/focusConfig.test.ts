import { describe, expect, it } from 'vitest';
import {
  FOCUS_TASK_TEXTURE,
  focusElapsedRatio,
  focusRemainingRatio,
  formatFocusTime,
  resolveFocusTexture,
} from './focusConfig';

describe('focus visual configuration', () => {
  it('maps every task id to one formal mascot texture', () => {
    expect(Object.keys(FOCUS_TASK_TEXTURE).sort()).toEqual(
      ['blocks', 'book', 'draw', 'english', 'exercise', 'homework', 'story', 'tidy-toys'].sort(),
    );
    expect(resolveFocusTexture('tidy-toys')).toBe('focus-xbl-clean');
    expect(resolveFocusTexture('exercise')).toBe('focus-xbl-sport');
  });

  it('formats the real remaining duration without introducing another timer', () => {
    expect(formatFocusTime(0)).toBe('00:00');
    expect(formatFocusTime(1)).toBe('00:01');
    expect(formatFocusTime(202_000)).toBe('03:22');
  });

  it('converts remaining time into elapsed progress', () => {
    expect(focusElapsedRatio(900_000, 900_000)).toBe(0);
    expect(focusElapsedRatio(202_000, 900_000)).toBeCloseTo(0.7756, 3);
    expect(focusElapsedRatio(0, 900_000)).toBe(1);
  });

  it('keeps the yellow countdown ring full initially and removes it over time', () => {
    expect(focusRemainingRatio(900_000, 900_000)).toBe(1);
    expect(focusRemainingRatio(202_000, 900_000)).toBeCloseTo(0.2244, 3);
    expect(focusRemainingRatio(0, 900_000)).toBe(0);
  });
});
