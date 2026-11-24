import { describe, expect, it } from 'vitest';
import { resolveButtonAudio } from './audioAssets';

describe('button audio policy', () => {
  it('uses the global click effect for ordinary enabled buttons', () => {
    expect(resolveButtonAudio(false)).toBe('click');
  });

  it('does not add a click effect when a control already has custom audio', () => {
    expect(resolveButtonAudio(false, 'custom')).toBeNull();
  });

  it('uses the unavailable effect for every disabled control', () => {
    expect(resolveButtonAudio(true)).toBe('unavailable');
    expect(resolveButtonAudio(true, 'custom')).toBe('unavailable');
  });
});
