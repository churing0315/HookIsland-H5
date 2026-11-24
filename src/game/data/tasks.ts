import type { TaskDefinition } from '../types';
import { DURATION_VISUALS, TASK_VISUALS } from '../task/taskConfig';

export const TASKS: TaskDefinition[] = TASK_VISUALS.map(({ id, name, defaultMinutes }) => ({ id, name, defaultMinutes }));

export const DURATION_OPTIONS = DURATION_VISUALS.map(({ minutes }) => minutes);
