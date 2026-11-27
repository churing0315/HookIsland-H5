import { afterEach, expect, it, vi } from 'vitest';
import { VoiceManager } from './VoiceManager';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('plays prompts on entry, restarts the idle countdown on input, and clears it on exit', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  const played: string[] = [];
  vi.stubGlobal('Audio', class {
    src = '';
    currentTime = 0;
    getAttribute() { return this.src; }
    pause() {}
    play() {
      played.push(this.src);
      return Promise.resolve();
    }
  });

  const voice = new VoiceManager();
  voice.startPrompt('task');
  expect(played).toEqual(['task']);
  vi.advanceTimersByTime(8_000);
  voice.noteActivity();
  voice.play('selected-task');
  vi.advanceTimersByTime(9_999);
  expect(played).toEqual(['task', 'selected-task']);
  vi.advanceTimersByTime(10_001);
  expect(played).toEqual(['task', 'selected-task', 'task', 'task']);

  voice.stopPrompt();
  voice.startPrompt('duration');
  expect(played.at(-1)).toBe('duration');
  vi.advanceTimersByTime(10_000);
  expect(played.slice(-2)).toEqual(['duration', 'duration']);

  voice.stopPrompt();
  vi.advanceTimersByTime(20_000);
  expect(played).toHaveLength(6);
});
