import { DAILY_PLANT_LIMIT } from '../config';
import { DURATION_OPTIONS, TASKS } from '../data/tasks';
import { effectiveMapStage } from '../map/IslandExpansionService';
import { MAP_STAGES } from '../map/mapConfig';
import type { GameFlow } from '../state/GameFlow';
import type { GameSnapshot } from '../types';

export class AppUI {
  private unsubscribe: (() => void) | null = null;
  private snapshot!: GameSnapshot;

  constructor(
    private readonly root: HTMLElement,
    private readonly flow: GameFlow,
  ) {}

  mount(): void {
    this.root.addEventListener('click', this.handleClick);
    this.unsubscribe = this.flow.subscribe((snapshot) => {
      this.snapshot = snapshot;
      this.render();
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.root.removeEventListener('click', this.handleClick);
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'open-task') this.flow.openTaskSelect();
    if (action === 'back-island') this.flow.returnToIsland();
    if (action === 'select-task' && target.dataset.id) this.flow.selectTask(target.dataset.id);
    if (action === 'select-minutes' && target.dataset.minutes) {
      this.flow.selectMinutes(Number(target.dataset.minutes) as 5 | 10 | 15 | 20);
    }
    if (action === 'begin-ritual') this.flow.beginRitual();
    if (action === 'toggle-pause') this.flow.togglePause();
    if (action === 'camera-zoom-in') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'zoom-in' }));
    if (action === 'camera-zoom-out') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'zoom-out' }));
    if (action === 'camera-reset') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'reset' }));
  };

  private render(): void {
    const fastChip = this.snapshot.fastMode ? '<div class="demo-chip">演示加速</div>' : '';
    switch (this.snapshot.screen) {
      case 'island':
        this.root.innerHTML = `${fastChip}${this.islandMarkup()}`;
        break;
      case 'task-select':
        this.root.innerHTML = `${fastChip}${this.taskMarkup()}`;
        break;
      case 'ritual':
        this.root.innerHTML = `${fastChip}<section class="center-copy" aria-live="polite"><p>我们拉钩</p><h1>说到做到</h1><span>约定正在生效……</span></section>`;
        break;
      case 'focus':
        this.root.innerHTML = `${fastChip}${this.focusMarkup()}`;
        break;
      case 'celebration':
        this.root.innerHTML = `${fastChip}${
          this.snapshot.celebrationKind === 'medal'
            ? '<section class="center-copy celebration-copy medal-copy" aria-live="polite"><p>今天的特别约定</p><h1>专注勋章已点亮！</h1><span>第 4 次完成不增加建造次数</span></section>'
            : '<section class="center-copy celebration-copy" aria-live="polite"><p>约定完成</p><h1>你做到了！</h1><span>一次建造机会正在等你</span></section>'
        }`;
        break;
      case 'build':
        this.root.innerHTML = `${fastChip}<header class="topbar build-topbar"><div><span class="eyebrow">一次约定 · 一次建造</span><h1>选择合法方格放置</h1></div></header>${this.cameraControlsMarkup()}`;
        break;
    }
  }

  private islandMarkup(): string {
    const planted = this.snapshot.data.daily.planted;
    const stage = effectiveMapStage(this.snapshot.data.mapStage);
    const stageName = MAP_STAGES[stage].name;
    const medalPending = planted >= DAILY_PLANT_LIMIT && !this.snapshot.data.daily.bonusMedalAwarded;
    const full = planted >= DAILY_PLANT_LIMIT && this.snapshot.data.daily.bonusMedalAwarded;
    return `
      <button class="island-back" data-action="camera-reset" aria-label="镜头归位">
        <img src="/assets/v2/btn-back.png" alt="">
      </button>
      <div class="mascot-dock" aria-label="小伴龙">
        <img class="mascot-cloud" src="/assets/v2/mascot-cloud.png" alt="">
        <img class="mascot-image" src="/assets/v2/mascot-xiaobanlong.png" alt="小伴龙">
      </div>
      <section class="island-info" aria-label="岛屿信息">
        <div class="island-info-thumb">${stage + 1}</div>
        <div>
          <strong>乐乐的小岛</strong>
          <span>${stageName} · 累计 ${this.snapshot.data.totalPlaced}</span>
          <span>今日建造 ${planted}/${DAILY_PLANT_LIMIT}</span>
        </div>
      </section>
      ${this.snapshot.fastMode ? `<div class="stage-preview-chip">演示 · 地图阶段 ${stage}</div>` : ''}
      ${this.cameraControlsMarkup()}
      <button class="pinky-button" data-action="open-task" ${full ? 'disabled' : ''} aria-label="${
        full ? '今天已经完成' : '和小伴龙拉钩'
      }">
        <img src="/assets/v2/btn-pinky.png" alt="${full ? '今天已经完成啦' : '和小伴龙拉钩'}">
      </button>
      ${
        medalPending
          ? '<div class="gentle-notice">再完成第 4 次约定，可点亮今日独立勋章；不会增加建造次数。</div>'
          : full
            ? '<div class="gentle-notice">今天 3 次建造与特别勋章都完成啦，明天再来。</div>'
            : ''
      }
    `;
  }

  private cameraControlsMarkup(): string {
    return `
      <div class="camera-controls" aria-label="地图缩放控制">
        <button data-action="camera-zoom-out" aria-label="缩小地图">−</button>
        <button data-action="camera-reset" aria-label="地图归位">归位</button>
        <button data-action="camera-zoom-in" aria-label="放大地图">＋</button>
      </div>
    `;
  }

  private taskMarkup(): string {
    const selectedTask = this.snapshot.selectedTaskId;
    const selectedMinutes = this.snapshot.selectedMinutes;
    const taskCards = TASKS.map(
      (task) => `
        <button class="task-card ${selectedTask === task.id ? 'selected' : ''}" data-action="select-task" data-id="${task.id}">
          <span class="task-icon" aria-hidden="true">${task.icon}</span><span>${task.name}</span>
        </button>`,
    ).join('');
    const durationButtons = DURATION_OPTIONS.map(
      (minutes) => `<button class="duration ${selectedMinutes === minutes ? 'selected' : ''}" data-action="select-minutes" data-minutes="${minutes}">${minutes} 分钟</button>`,
    ).join('');
    return `
      <section class="task-panel">
        <header class="panel-header">
          <button class="back-button" data-action="back-island" aria-label="返回岛屿">←</button>
          <div><span class="eyebrow">今天想专注什么？</span><h1>选择一个小约定</h1></div>
        </header>
        <div class="task-grid">${taskCards}</div>
        <div class="duration-row" aria-label="选择约定时长">${durationButtons}</div>
        <button class="confirm-button" data-action="begin-ritual" ${this.flow.canBeginRitual() ? '' : 'disabled'}>开始拉钩</button>
      </section>
    `;
  }

  private focusMarkup(): string {
    const focus = this.snapshot.focus;
    if (!focus) return '';
    return `
      <header class="focus-header">
        <span class="eyebrow">我们的约定</span>
        <h1>${focus.taskName}</h1>
      </header>
      <button class="pause-button" data-action="toggle-pause">${focus.paused ? '继续专注' : '暂停一下'}</button>
      ${
        focus.paused
          ? '<section class="pause-card" aria-live="polite"><strong>小树在等你</strong><span>准备好了就继续吧</span></section>'
          : ''
      }
    `;
  }
}
