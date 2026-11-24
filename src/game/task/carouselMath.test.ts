import { describe, expect, it } from 'vitest';
import { cardTiltDegrees, clampCarouselPosition, nearestCarouselIndex } from './carouselMath';

describe('task carousel math', () => {
  it('clamps a non-looping carousel to both ends', () => {
    expect(clampCarouselPosition(-2, 8)).toBe(0);
    expect(clampCarouselPosition(9, 8)).toBe(7);
  });

  it('interpolates the required 0, 3 and 5 degree tilt pattern', () => {
    expect(cardTiltDegrees(0)).toBe(0);
    expect(cardTiltDegrees(-1)).toBe(-3);
    expect(cardTiltDegrees(1)).toBe(3);
    expect(cardTiltDegrees(-2)).toBe(-5);
    expect(cardTiltDegrees(2)).toBe(5);
    expect(cardTiltDegrees(0.5)).toBe(1.5);
  });

  it('snaps to the nearest valid card', () => {
    expect(nearestCarouselIndex(2.49, 8)).toBe(2);
    expect(nearestCarouselIndex(2.51, 8)).toBe(3);
    expect(nearestCarouselIndex(99, 8)).toBe(7);
  });
});
