import { DAILY_PLANT_LIMIT } from '../config';
import { GameAudioManager } from '../audio/GameAudioManager';
import { FOCUS_ASSET_ROOT, formatFocusTime } from '../focus/focusConfig';
import { effectiveMapStage } from '../map/IslandExpansionService';
import { MAP_STAGES } from '../map/mapConfig';
import type { GameFlow } from '../state/GameFlow';
import { TaskSelectionExperience } from '../task/TaskSelectionExperience';
import { PactRitualOverlay } from '../task/PactRitualOverlay';
import type { GameSnapshot } from '../types';

export class AppUI {
  private unsubscribe: (() => void) | null = null;
  private snapshot!: GameSnapshot;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private taskExperience: TaskSelectionExperience | null = null;
  private ritualOverlay: PactRitualOverlay | null = null;
  private focusClockFrame: number | null = null;
  private readonly audio: GameAudioManager;

  constructor(
    private readonly root: HTMLElement,
    private readonly flow: GameFlow,
  ) {
    this.audio = new GameAudioManager(root);
  }

  mount(): void {
    this.audio.mount();
    this.root.addEventListener('click', this.handleClick);
    this.unsubscribe = this.flow.subscribe((snapshot) => {
      this.snapshot = snapshot;
      if (snapshot.screen === 'ritual' && this.taskExperience && this.renderedScreen === 'task-select') {
        this.renderedScreen = 'ritual';
        this.audio.setScreen('ritual');
        this.mountRitualOverlay();
        return;
      }
      if (snapshot.screen === 'task-select' && this.taskExperience && this.renderedScreen === 'task-select') {
        this.taskExperience.syncSnapshot(snapshot);
        return;
      }
      this.render();
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.ritualOverlay?.destroy();
    this.ritualOverlay = null;
    this.taskExperience?.destroy();
    this.taskExperience = null;
    this.stopFocusClock();
    this.root.removeEventListener('click', this.handleClick);
    this.audio.destroy();
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    if (target.matches(':disabled, [aria-disabled="true"]')) return;
    const action = target.dataset.action;
    if (action === 'open-task') this.flow.openTaskSelect();
    if (action === 'back-island') this.flow.returnToIsland();
    if (action === 'begin-ritual') this.flow.beginRitual();
    if (action === 'toggle-pause') this.flow.togglePause();
    if (action === 'request-focus-end') this.showFocusEndDialog(true);
    if (action === 'cancel-focus-end') this.showFocusEndDialog(false);
    if (action === 'confirm-focus-end') this.flow.returnToIsland();
    if (action === 'camera-zoom-in') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'zoom-in' }));
    if (action === 'camera-zoom-out') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'zoom-out' }));
    if (action === 'camera-reset') window.dispatchEvent(new CustomEvent('hook-island-camera', { detail: 'reset' }));
  };

  private render(): void {
    this.ritualOverlay?.destroy();
    this.ritualOverlay = null;
    this.taskExperience?.destroy();
    this.taskExperience = null;
    this.stopFocusClock();
    this.renderedScreen = this.snapshot.screen;
    this.audio.setScreen(this.snapshot.screen);
    const fastChip = this.snapshot.fastMode ? '<div class="demo-chip">演示加速</div>' : '';
    switch (this.snapshot.screen) {
      case 'island':
        this.root.innerHTML = `${fastChip}${this.islandMarkup()}`;
        break;
      case 'task-select':
        this.root.innerHTML = fastChip;
        this.taskExperience = new TaskSelectionExperience(this.root, this.flow, this.snapshot, this.audio);
        this.taskExperience.mount();
        break;
      case 'ritual':
        this.root.innerHTML = fastChip;
        this.mountRitualOverlay();
        break;
      case 'focus':
        this.root.innerHTML = this.focusMarkup();
        this.startFocusClock();
        break;
      case 'celebration':
        this.root.innerHTML = `${fastChip}${
          this.snapshot.celebrationKind === 'medal'
            ? '<section class="center-copy celebration-copy medal-copy" aria-live="polite"><p>今天的特别约定</p><h1>专注勋章已点亮！</h1><span>第 4 次完成不增加建造次数</span></section>'
            : '<section class="center-copy celebration-copy" aria-live="polite"><p>约定完成</p><h1>你做到了！</h1><span>一次建造机会正在等你</span></section>'
        }`;
        break;
      case 'build':
        this.root.innerHTML = this.snapshot.selectedAssetId
          ? `${fastChip}<header class="topbar build-topbar"><div><span class="eyebrow">一次约定 · 一次建造</span><h1>选择合法方格放置</h1></div></header>${this.cameraControlsMarkup()}`
          : '<section class="center-copy" aria-live="polite"><h1>这个等级的建筑暂时放不下</h1><span>这次未占用建造次数</span><button data-action="back-island">返回小岛</button></section>';
        break;
    }
  }

  private mountRitualOverlay(): void {
    if (this.ritualOverlay) return;
    this.ritualOverlay = new PactRitualOverlay(this.root, {
      onComplete: () => this.flow.completeRitual(),
    });
    this.ritualOverlay.mount();
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
        <div class="island-info-avatar"><div class="island-info-thumb">${stage + 1}</div></div>
        <div class="island-info-card">
          <strong>乐乐的小岛</strong>
          <span>${stageName} · 累计 ${this.snapshot.data.totalPlaced}</span>
          <span>今日建造 ${planted}/${DAILY_PLANT_LIMIT}</span>
        </div>
      </section>
      ${this.snapshot.fastMode ? `<div class="stage-preview-chip">演示 · 地图阶段 ${stage}</div>` : ''}
      ${this.cameraControlsMarkup()}
      <button class="pinky-button" data-action="open-task" ${full ? 'aria-disabled="true"' : ''} aria-label="${
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

  private focusMarkup(): string {
    const focus = this.snapshot.focus;
    if (!focus) return '';
    return `
      <section class="focus-ui" aria-label="专注计时">
        ${this.snapshot.fastMode ? '<div class="focus-demo-chip">演示加速</div>' : ''}
        <div class="focus-message-visual" aria-hidden="true">
          <img src="/assets/v2/btn-back.png" alt="">
        </div>
        <div class="focus-controls">
          <div class="focus-task-label">${focus.taskName} · ${focus.minutes} 分钟</div>
          <div class="focus-control-buttons">
            <button class="focus-icon-button is-disabled" aria-label="专注音乐暂未配置" aria-disabled="true">
              <img src="${FOCUS_ASSET_ROOT}/focus_btn_music.png" alt="">
            </button>
            <button class="focus-icon-button" data-action="request-focus-end" aria-label="结束本次专注">
              <img src="${FOCUS_ASSET_ROOT}/focus_btn_end.png" alt="">
            </button>
            <button class="focus-icon-button ${focus.paused ? 'is-active' : ''}" data-action="toggle-pause" aria-label="${
              focus.paused ? '继续专注' : '暂停专注'
            }" aria-pressed="${focus.paused}">
              <img src="${FOCUS_ASSET_ROOT}/focus_btn_pause.png" alt="">
            </button>
          </div>
        </div>
        <output class="focus-time" aria-live="off">${formatFocusTime(focus.remainingMs)}</output>
      </section>
      ${
        focus.paused
          ? '<section class="focus-pause-card" aria-live="polite"><strong>先休息一下</strong><span>计时已经暂停，准备好了再继续</span><button data-action="toggle-pause">继续专注</button></section>'
          : ''
      }
      <section class="focus-end-dialog" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="focus-end-title">
        <div class="focus-end-card">
          <strong id="focus-end-title">要结束这次专注吗？</strong>
          <span>现在离开不会获得建造机会。</span>
          <div>
            <button data-action="cancel-focus-end">继续专注</button>
            <button class="is-danger" data-action="confirm-focus-end">结束并返回</button>
          </div>
        </div>
      </section>
    `;
  }

  private startFocusClock(): void {
    const update = (): void => {
      const snapshot = this.flow.getSnapshot();
      if (snapshot.screen !== 'focus' || !snapshot.focus) {
        this.focusClockFrame = null;
        return;
      }
      const output = this.root.querySelector<HTMLOutputElement>('.focus-time');
      if (output) output.value = formatFocusTime(snapshot.focus.remainingMs);
      this.focusClockFrame = window.requestAnimationFrame(update);
    };
    update();
  }

  private stopFocusClock(): void {
    if (this.focusClockFrame === null) return;
    window.cancelAnimationFrame(this.focusClockFrame);
    this.focusClockFrame = null;
  }

  private showFocusEndDialog(show: boolean): void {
    const dialog = this.root.querySelector<HTMLElement>('.focus-end-dialog');
    if (!dialog) return;
    dialog.classList.toggle('is-open', show);
    dialog.setAttribute('aria-hidden', String(!show));
    if (show) dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
}
