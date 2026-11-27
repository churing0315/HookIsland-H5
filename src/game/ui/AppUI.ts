import { GameAudioManager } from '../audio/GameAudioManager';
import { PLACEMENT_PREVIEW, type PlacementFeedback } from '../assets/placementDisplay';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getAsset } from '../data/assetCatalog';
import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { FOCUS_ASSET_ROOT, FOCUS_RING, focusRemainingRatio, formatFocusTime, shouldReduceFocusMotion } from '../focus/focusConfig';
import { GuideController, type GuidePoint } from '../guide/GuideController';
import { GUIDE_ASSETS } from '../guide/guideConfig';
import { effectiveMapStage } from '../map/IslandExpansionService';
import type { BuildingEditControls } from '../map/IslandBuildingEditor';
import type { GameFlow } from '../state/GameFlow';
import { TaskSelectionExperience } from '../task/TaskSelectionExperience';
import { PactRitualOverlay } from '../task/PactRitualOverlay';
import { VoiceManager } from '../task/VoiceManager';
import type { GameSnapshot } from '../types';
import { buildingIdAttribute, focusRewardMarkup } from './focusRewardMarkup';

export class AppUI {
  private unsubscribe: (() => void) | null = null;
  private snapshot!: GameSnapshot;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private taskExperience: TaskSelectionExperience | null = null;
  private ritualOverlay: PactRitualOverlay | null = null;
  private focusClockFrame: number | null = null;
  private readonly audio: GameAudioManager;
  private readonly voice = new VoiceManager();
  private readonly guide: GuideController;

  constructor(
    private readonly root: HTMLElement,
    private readonly flow: GameFlow,
  ) {
    this.audio = new GameAudioManager(root);
    this.guide = new GuideController(root, flow, this.voice);
  }

  mount(): void {
    this.audio.mount();
    this.flow.setBeforeSettlement(() => this.guide.focusEnded());
    this.root.addEventListener('click', this.handleClick);
    window.addEventListener('hook-island-placement-status', this.handlePlacementStatus);
    window.addEventListener('hook-island-edit-controls', this.handleBuildingEditControls);
    window.addEventListener('hook-island-guide-building-point', this.handleGuidePoint);
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
    window.removeEventListener('hook-island-placement-status', this.handlePlacementStatus);
    window.removeEventListener('hook-island-edit-controls', this.handleBuildingEditControls);
    this.audio.destroy();
    this.flow.setBeforeSettlement(null);
    window.removeEventListener('hook-island-guide-building-point', this.handleGuidePoint);
    this.guide.destroy();
    this.voice.destroy();
  }

  private readonly handleGuidePoint = (event: Event): void => {
    this.guide.pointAtBuilding((event as CustomEvent<GuidePoint | null>).detail);
  };

  private readonly handlePlacementStatus = (event: Event): void => {
    this.updatePlacementStatus((event as CustomEvent<PlacementFeedback>).detail);
  };

  private readonly handleBuildingEditControls = (event: Event): void => {
    const controls = (event as CustomEvent<BuildingEditControls | null>).detail;
    if (controls) this.guide.editedBuilding(controls.id);
    const toolbar = this.root.querySelector<HTMLElement>('.island-edit-tools');
    if (!toolbar) return;
    toolbar.hidden = controls === null;
    if (!controls) return;
    toolbar.style.setProperty('--edit-center-x', `${100 * controls.x / GAME_WIDTH}%`);
    toolbar.style.setProperty('--edit-bottom-y', `${100 * controls.y / GAME_HEIGHT}%`);
    toolbar.querySelector('[data-edit="flip"]')?.setAttribute('aria-pressed', String(controls.flipped));
    const confirm = toolbar.querySelector<HTMLButtonElement>('[data-edit="confirm"]');
    if (confirm) confirm.disabled = !controls.valid;
  };

  private updatePlacementStatus({ message, position }: PlacementFeedback): void {
    const status = this.root.querySelector('.placement-status');
    const preview = this.root.querySelector<HTMLImageElement>('.placement-preview');
    if (!status || !preview || !this.snapshot.selectedAssetId) return;
    const text = message ?? `拖动${getAsset(this.snapshot.selectedAssetId).name}到喜欢的地方吧！`;
    if (status.textContent !== text) status.textContent = text;
    preview.hidden = !position;
    if (position) {
      preview.style.left = `${100 * position.x / GAME_WIDTH}%`;
      preview.style.top = `${100 * position.y / GAME_HEIGHT}%`;
    }
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    if (target.matches(':disabled, [aria-disabled="true"]')) return;
    const action = target.dataset.action;
    if (action === 'open-task') {
      this.guide.openTask();
      this.flow.openTaskSelect();
    }
    if (action === 'back-island') this.flow.returnToIsland();
    if (action === 'pack-up-building') this.flow.returnToIsland();
    if (action === 'edit-building') window.dispatchEvent(new CustomEvent('hook-island-edit-action', { detail: target.dataset.edit }));
    if (action === 'open-building-storage' || action?.startsWith('camera-')) {
      window.dispatchEvent(new CustomEvent('hook-island-edit-action', { detail: 'cancel' }));
    }
    if (action === 'open-building-storage') {
      this.guide.openedStorage();
      this.flow.markBuildingStorageRead();
      this.root.querySelector<HTMLDialogElement>('.building-storage')?.showModal();
    }
    if (action === 'close-building-storage') this.root.querySelector<HTMLDialogElement>('.building-storage')?.close();
    if (action === 'place-building' && target.dataset.buildingId) this.flow.placeStoredBuilding(target.dataset.buildingId);
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
        this.guide.rendered('task-select');
        this.taskExperience = new TaskSelectionExperience(this.root, this.flow, this.snapshot, this.audio, this.voice, this.guide);
        this.taskExperience.mount();
        return;
      case 'ritual':
        this.root.innerHTML = fastChip;
        this.mountRitualOverlay();
        return;
      case 'focus':
        this.root.innerHTML = this.focusMarkup();
        this.startFocusClock();
        break;
      case 'celebration':
        if (this.snapshot.selectedBuildingId && this.snapshot.selectedAssetId) {
          const { selectedBuildingId, selectedAssetId } = this.snapshot;
          this.root.innerHTML = `
            ${this.focusRingsMarkup(0, true)}
            <output class="focus-time focus-time-ending" aria-hidden="true">00:00</output>
            ${focusRewardMarkup(selectedBuildingId, selectedAssetId, this.flow.placementProblem(selectedAssetId))}
            ${this.backButton('back-island')}`;
          const success = this.root.querySelector<HTMLElement>('.reward-success');
          if (success) {
            success.onanimationstart = (event) => {
              if (event.target !== success) return;
              success.onanimationstart = null;
              this.audio.playFocusSuccess();
            };
          }
          const rewardPage = this.root.querySelector<HTMLElement>('.reward-page');
          if (rewardPage) rewardPage.onanimationend = (event) => {
            if (event.target === rewardPage && event.animationName === 'reward-reveal') this.guide.rewardRevealed();
          };
        }
        break;
      case 'build': {
        const building = REWARD_BUILDINGS.find(({ id }) => id === this.snapshot.selectedAssetId);
        const stored = this.snapshot.data.storedBuildings.find(({ id }) => id === this.snapshot.selectedBuildingId);
        this.root.innerHTML = `<section class="placement-ui" aria-label="建筑放置">
          <div class="placement-card" aria-hidden="true"></div>
          <p class="placement-status" role="status"></p>
          ${stored ? `<img class="placement-preview${stored.flipped ? ' is-flipped' : ''}" src="${building?.url ?? '/assets/building-rewards/tier2_common_building/leafy_tree.png'}" alt="" draggable="false"
            style="width:${100 * PLACEMENT_PREVIEW.width / GAME_WIDTH}%;height:${100 * PLACEMENT_PREVIEW.height / GAME_HEIGHT}%">` : ''}
          <button class="placement-pack-up" type="button" data-action="pack-up-building" aria-label="收起建筑">
            <span>收起</span><img src="/assets/placement/placement_icon_packup.png" alt="">
          </button>
        </section>`;
        this.updatePlacementStatus({ message: null, position: PLACEMENT_PREVIEW });
        break;
      }
    }
    this.guide.rendered(this.snapshot.screen);
  }

  private mountRitualOverlay(): void {
    if (this.ritualOverlay) return;
    this.guide.rendered('ritual');
    this.ritualOverlay = new PactRitualOverlay(this.root, {
      onComplete: () => this.flow.completeRitual(),
    });
    this.ritualOverlay.mount();
    this.voice.play(`${GUIDE_ASSETS}/yes.mp3`);
  }

  private islandMarkup(): string {
    const stage = effectiveMapStage(this.snapshot.data.mapStage);
    const unread = this.snapshot.data.storedBuildings.some((building) => building.unread);
    return `
      <button class="island-back" data-action="camera-reset" aria-label="镜头归位">
        <img src="/assets/v2/btn-back.png" alt="">
      </button>
      <div class="mascot-dock" aria-label="小伴龙">
        <img class="mascot-cloud" src="/assets/v2/mascot-cloud.png" alt="">
        <img class="mascot-image" src="/assets/v2/mascot-xiaobanlong.png" alt="小伴龙">
      </div>
      <section class="island-info" aria-label="岛屿信息">
        <div class="island-info-avatar" aria-hidden="true"><img class="island-info-thumb" src="/assets/home/hookland_img_avatar.png" alt=""></div>
        <div class="island-info-card">
          <strong>乐乐的小岛</strong>
          <span class="island-info-total"><img src="/assets/home/home_user_number_icon.png" alt="">建造：${this.snapshot.data.totalPlaced}</span>
        </div>
      </section>
      ${this.snapshot.fastMode ? `<div class="stage-preview-chip">演示 · 地图阶段 ${stage}</div>` : ''}
      ${this.cameraControlsMarkup()}
      <button class="pinky-button" data-action="open-task" aria-label="和小伴龙拉钩">
        <img src="/assets/v2/btn-pinky.png" alt="">
      </button>
      <button class="building-storage-toggle" data-action="open-building-storage" aria-label="${unread ? '建筑收纳，有新建筑' : '建筑收纳'}">
        <img src="/assets/home/home_edit_store.png" alt="">
        ${unread ? '<span class="building-storage-unread" aria-hidden="true"></span>' : ''}
      </button>
      <div class="island-edit-tools" role="group" aria-label="编辑建筑" hidden>
        <button data-action="edit-building" data-edit="store" aria-label="收进收纳箱"><img src="/assets/home/home_edit_btn_bin.png" alt=""></button>
        <button data-action="edit-building" data-edit="flip" aria-label="水平翻转" aria-pressed="false"><img src="/assets/home/home_edit_btn_filp.png" alt=""></button>
        <button data-action="edit-building" data-edit="confirm" aria-label="确认编辑"><img src="/assets/home/home_edit_btn_ok.png" alt=""></button>
      </div>
      ${this.storageMarkup()}
    `;
  }

  private backButton(action: 'request-focus-end' | 'back-island'): string {
    return `<button class="focus-message-visual game-back-button" type="button" data-action="${action}" aria-label="返回小岛">
      <img src="/assets/v2/btn-back.png" alt="">
    </button>`;
  }

  private storageMarkup(): string {
    const items = this.snapshot.data.storedBuildings.map(({ id, assetId, flipped, previouslyPlaced }) => {
      const building = getAsset(assetId);
      const reward = REWARD_BUILDINGS.find((entry) => entry.id === assetId);
      const problem = this.flow.placementProblem(assetId, previouslyPlaced);
      return `<li><img src="${reward?.url ?? '/assets/building-rewards/tier2_common_building/leafy_tree.png'}" ${flipped ? 'class="is-flipped"' : ''} alt=""><strong>${building.name}</strong>
        <button type="button" data-action="place-building" data-building-id="${buildingIdAttribute(id)}"${problem ? ' disabled' : ''}
          aria-label="放置${building.name}">去放置</button>${problem ? `<small>${problem}</small>` : ''}</li>`;
    }).join('');
    return `<dialog class="building-storage" aria-labelledby="building-storage-title">
      <header><h2 id="building-storage-title">建筑收纳</h2><button data-action="close-building-storage">关闭</button></header>
      ${items ? `<ul>${items}</ul>` : '<p>暂无待放置的建筑</p>'}
    </dialog>`;
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
        ${this.focusRingsMarkup(focusRemainingRatio(focus.remainingMs, focus.totalMs))}
        ${this.snapshot.fastMode ? '<div class="focus-demo-chip">演示加速</div>' : ''}
        ${this.backButton('request-focus-end')}
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

  private focusRingsMarkup(remaining: number, ending = false): string {
    const whiteDiameter = (FOCUS_RING.innerRadius + 2) * 2 + FOCUS_RING.whiteStrokeWidth;
    const dialDiameter = FOCUS_RING.outerRadius * 2 + FOCUS_RING.ringWidth;
    const classes = ending ? ` is-ending${shouldReduceFocusMotion() ? ' is-reduced-motion' : ''}` : '';
    return `<div class="focus-ring-layer${classes}" aria-hidden="true" style="
        --focus-center-x:${100 * FOCUS_RING.centerX / GAME_WIDTH}%;
        --focus-center-y:${100 * FOCUS_RING.centerY / GAME_HEIGHT}%">
      <div class="focus-dial${remaining > 0.001 ? '' : ' is-empty'}" style="
        width:${100 * dialDiameter / GAME_WIDTH}%;
        height:${100 * dialDiameter / GAME_HEIGHT}%;
        --focus-ring-width:${100 * FOCUS_RING.ringWidth / dialDiameter}%;
        --focus-track-color:#${FOCUS_RING.trackColor.toString(16)};
        --focus-progress-color:#${FOCUS_RING.remainingColor.toString(16)};
        --focus-direction:${FOCUS_RING.clockwise ? 1 : -1};
        --focus-progress:${remaining}turn">
        <div class="focus-dial-band"></div>
        <span class="focus-dial-cap"></span>
        <span class="focus-dial-tip"><span class="focus-dial-cap"></span></span>
      </div>
      <div class="focus-white-ring" style="
        width:${100 * whiteDiameter / GAME_WIDTH}%;
        height:${100 * whiteDiameter / GAME_HEIGHT}%;
        border-width:${100 * FOCUS_RING.whiteStrokeWidth / GAME_WIDTH}cqw"></div>
    </div>`;
  }

  private startFocusClock(): void {
    const output = this.root.querySelector<HTMLOutputElement>('.focus-time');
    const dial = this.root.querySelector<HTMLElement>('.focus-dial');
    let previousRemaining = -1;
    const update = (): void => {
      const snapshot = this.flow.getSnapshot();
      if (snapshot.screen !== 'focus' || !snapshot.focus) {
        this.focusClockFrame = null;
        return;
      }
      const { remainingMs, totalMs } = snapshot.focus;
      if (remainingMs !== previousRemaining) {
        previousRemaining = remainingMs;
        if (output) output.value = formatFocusTime(remainingMs);
        const remaining = focusRemainingRatio(remainingMs, totalMs);
        dial?.style.setProperty('--focus-progress', `${remaining}turn`);
        dial?.classList.toggle('is-empty', remaining <= 0.001);
      }
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
