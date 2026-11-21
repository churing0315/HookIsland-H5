import type { TaskDefinition } from '../types';

export const TASKS: TaskDefinition[] = [
  { id: 'book', name: '读绘本', icon: '📖', defaultMinutes: 10 },
  { id: 'homework', name: '写作业', icon: '✏️', defaultMinutes: 15 },
  { id: 'piano', name: '练琴', icon: '🎹', defaultMinutes: 15 },
  { id: 'jump-rope', name: '跳绳', icon: '🪢', defaultMinutes: 5 },
  { id: 'tidy-toys', name: '整理玩具', icon: '🧸', defaultMinutes: 10 },
  { id: 'draw', name: '画画', icon: '🎨', defaultMinutes: 15 },
  { id: 'blocks', name: '搭积木', icon: '🧱', defaultMinutes: 10 },
  { id: 'story', name: '听故事', icon: '🎧', defaultMinutes: 10 },
];

export const DURATION_OPTIONS = [5, 10, 15, 20] as const;
