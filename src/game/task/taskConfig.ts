import type { TaskDefinition } from '../types';

export interface TaskVisualConfig extends TaskDefinition {
  illustration: string;
  voice: string;
}

export interface DurationVisualConfig {
  minutes: 5 | 10 | 15 | 20;
  image: string;
  voice: string;
}

const ROOT = '/assets/task-v2';

export const TASK_VISUALS: TaskVisualConfig[] = [
  { id: 'english', name: '学英语', defaultMinutes: 10, illustration: `${ROOT}/illustrations/english.png`, voice: `${ROOT}/audio/english.wav` },
  { id: 'exercise', name: '做运动', defaultMinutes: 5, illustration: `${ROOT}/illustrations/exercise.png`, voice: `${ROOT}/audio/exercise.wav` },
  { id: 'story', name: '听故事', defaultMinutes: 10, illustration: `${ROOT}/illustrations/story.png`, voice: `${ROOT}/audio/story.wav` },
  { id: 'book', name: '读绘本', defaultMinutes: 10, illustration: `${ROOT}/illustrations/read.png`, voice: `${ROOT}/audio/read.wav` },
  { id: 'homework', name: '写作业', defaultMinutes: 15, illustration: `${ROOT}/illustrations/homework.png`, voice: `${ROOT}/audio/homework.wav` },
  { id: 'blocks', name: '搭积木', defaultMinutes: 10, illustration: `${ROOT}/illustrations/blocks.png`, voice: `${ROOT}/audio/blocks.wav` },
  { id: 'draw', name: '画画', defaultMinutes: 15, illustration: `${ROOT}/illustrations/draw.png`, voice: `${ROOT}/audio/draw.wav` },
  { id: 'tidy-toys', name: '整理玩具', defaultMinutes: 10, illustration: `${ROOT}/illustrations/tidy.png`, voice: `${ROOT}/audio/tidy.wav` },
];

export const DURATION_VISUALS: DurationVisualConfig[] = ([5, 10, 15, 20] as const).map((minutes) => ({
  minutes,
  image: `${ROOT}/time-${minutes}.png`,
  voice: `${ROOT}/audio/${minutes}.wav`,
}));

export const TASK_ASSETS = {
  panel: `${ROOT}/panel.png`,
  sideShadow: `${ROOT}/side-shadow.png`,
  cardDefault: `${ROOT}/card-default.png`,
  cardSelected: `${ROOT}/card-selected.png`,
  selectedSpot: `${ROOT}/card-selected-spot.png`,
  promptTask: `${ROOT}/prompt-task.png`,
  promptDuration: `${ROOT}/prompt-duration.png`,
  nextButton: `${ROOT}/button-next.png`,
  confirmPanel: `${ROOT}/confirm-panel.png`,
  confirmLabel: `${ROOT}/confirm-label.png`,
  mascot: `${ROOT}/mascot.png`,
  hourglass: `${ROOT}/hourglass.png`,
} as const;

export function findTaskVisual(taskId: string | null): TaskVisualConfig | undefined {
  return TASK_VISUALS.find((task) => task.id === taskId);
}
