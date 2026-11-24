import Phaser from 'phaser';
import { createPlaceholderTextures, PLACEHOLDER_KEYS } from '../assets/placeholders';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getAsset } from '../data/assetCatalog';
import { validatePlacement } from '../domain/placement';
import { IslandCameraController } from '../map/IslandCameraController';
import { effectiveMapStage } from '../map/IslandExpansionService';
import { IslandMapRenderer } from '../map/IslandMapRenderer';
import { gridToWorldCenter, worldToGrid } from '../map/mapConfig';
import type { GameFlow } from '../state/GameFlow';
import type { GameSnapshot, MapStage, PlacedItem } from '../types';

export class PrototypeScene extends Phaser.Scene {
  private flow!: GameFlow;
  private unsubscribe: (() => void) | null = null;
  private worldLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private hudCamera!: Phaser.Cameras.Scene2D.Camera;
  private cameraController!: IslandCameraController;
  private mapRenderer!: IslandMapRenderer;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private dialGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('prototype');
  }

  create(): void {
    this.flow = this.registry.get('flow') as GameFlow;
    createPlaceholderTextures(this);
    this.worldLayer = this.add.container(0, 0);
    this.hudLayer = this.add.container(0, 0);
    this.hudCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, false, 'hud-camera');
    this.cameras.main.ignore(this.hudLayer);
    this.hudCamera.ignore(this.worldLayer);
    this.hudCamera.setBackgroundColor('rgba(0,0,0,0)');
    this.mapRenderer = new IslandMapRenderer(this, this.worldLayer);
    this.cameraController = new IslandCameraController(this, this.cameras.main);

    this.unsubscribe = this.flow.subscribe((snapshot) => {
      if (snapshot.screen !== this.renderedScreen) this.render(snapshot);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.cameraController.destroy();
    });
  }

  update(): void {
    if (this.flow.getSnapshot().screen === 'focus' && this.dialGraphics) {
      this.drawFocusDial(this.flow.getRemainingRatio());
    }
  }

  private render(snapshot: GameSnapshot): void {
    this.renderedScreen = snapshot.screen;
    this.tweens.killAll();
    this.worldLayer.removeAll(true);
    this.hudLayer.removeAll(true);
    this.dialGraphics = null;
    this.cameraController.setInteractionLocked(false);

    switch (snapshot.screen) {
      case 'island':
        this.renderIsland(snapshot.data.placedItems, effectiveMapStage(snapshot.data.mapStage));
        break;
      case 'task-select':
        this.prepareFixedScreen(0x92e6ee);
        break;
      case 'ritual':
        this.renderRitual();
        break;
      case 'focus':
        this.renderFocus();
        break;
      case 'celebration':
        this.renderCelebration(snapshot.celebrationKind);
        break;
      case 'build':
        this.renderBuild(snapshot.data.placedItems, effectiveMapStage(snapshot.data.mapStage), snapshot.selectedAssetId);
        break;
    }
  }

  private prepareMap(stage: MapStage, items: PlacedItem[], showGrid: boolean, alpha = 1): void {
    this.cameras.main.setBackgroundColor(COLORS.water);
    this.cameraController.setEnabled(true);
    this.mapRenderer.render(stage, items, showGrid, alpha);
    this.cameraController.fitStage(stage);
  }

  private prepareFixedScreen(color: number): void {
    this.cameraController.setEnabled(false);
    this.cameras.main.setZoom(1).setScroll(0, 0).setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(color);
    this.hudLayer.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color));
  }

  private renderIsland(items: PlacedItem[], stage: MapStage, alpha = 1): void {
    this.prepareMap(stage, items, false, alpha);
  }

  private renderRitual(): void {
    this.prepareFixedScreen(COLORS.card);
    const left = this.add.image(340, 190, PLACEHOLDER_KEYS.mascot).setScale(0.92);
    const promise = this.add.circle(455, 190, 28, COLORS.primary, 1);
    const line = this.add.rectangle(402, 190, 80, 12, COLORS.mascotBrown, 1).setOrigin(0.5);
    this.hudLayer.add([left, line, promise]);
    this.tweens.add({ targets: [left, promise], x: '+=8', duration: 700, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
  }

  private renderFocus(): void {
    this.prepareFixedScreen(0xfbf7ee);
    this.dialGraphics = this.add.graphics();
    this.hudLayer.add(this.dialGraphics);
    this.drawFocusDial(1);
    const mascot = this.add.image(545, 205, PLACEHOLDER_KEYS.mascot).setScale(0.96);
    this.hudLayer.add(mascot);
    this.tweens.add({ targets: mascot, y: mascot.y - 3, duration: 2_000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private drawFocusDial(ratio: number): void {
    if (!this.dialGraphics) return;
    const g = this.dialGraphics;
    g.clear();
    g.fillStyle(COLORS.elapsed, 1);
    g.fillCircle(330, 205, 78);
    if (ratio > 0.002) {
      g.fillStyle(COLORS.remaining, 1);
      g.slice(330, 205, 78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      g.fillPath();
    }
    g.lineStyle(4, 0xffffff, 0.82);
    g.strokeCircle(330, 205, 78);
  }

  private renderCelebration(kind: 'build' | 'medal'): void {
    this.prepareFixedScreen(0xfff9f0);
    const mascot = this.add.image(406, 195, PLACEHOLDER_KEYS.mascot).setScale(kind === 'medal' ? 1.2 : 1.1);
    this.hudLayer.add(mascot);
    this.tweens.add({ targets: mascot, scale: kind === 'medal' ? 1.34 : 1.22, y: mascot.y - 12, duration: 420, yoyo: true, repeat: 2 });
    const colors = [0xe88a6e, 0xfec845, 0x54cdfd, 0xb8cc7e];
    for (let index = 0; index < 18; index += 1) {
      const dot = this.add.circle(260 + (index % 9) * 36, 120 + Math.floor(index / 9) * 18, 5, colors[index % colors.length]);
      this.hudLayer.add(dot);
      this.tweens.add({ targets: dot, y: dot.y + 90 + (index % 3) * 8, alpha: 0, duration: 1_300, delay: index * 35 });
    }
  }

  private renderBuild(items: PlacedItem[], stage: MapStage, assetId: string): void {
    this.prepareMap(stage, items, true);
    const asset = getAsset(assetId);
    const tray = this.add.rectangle(406, 342, 780, 58, COLORS.card, 0.97).setStrokeStyle(2, 0xd8cbb8, 0.76);
    const candidate = this.add
      .image(78, 338, asset.runtimeTextureKey)
      .setScale(0.62)
      .setInteractive({ useHandCursor: true });
    const status = this.add
      .text(128, 338, '拖动圆冠树到合适的草地格', {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#4A3B2A',
      })
      .setOrigin(0, 0.5);
    this.hudLayer.add([tray, candidate, status]);

    const ghost = this.add
      .image(0, 0, asset.runtimeTextureKey)
      .setScale(0.74)
      .setAlpha(0.72)
      .setVisible(false)
      .setDepth(10_000);
    this.worldLayer.add(ghost);
    this.input.setDraggable(candidate);
    let candidateGrid: { x: number; y: number } | null = null;
    let candidateValid = false;

    candidate.on('dragstart', () => {
      this.cameraController.setInteractionLocked(true);
      ghost.setVisible(true);
    });
    candidate.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      candidate.setPosition(dragX, dragY);
      const world = this.cameraController.screenToWorld(dragX, dragY);
      candidateGrid = worldToGrid(world.x, world.y, asset.footprint);
      const center = gridToWorldCenter(candidateGrid.x, candidateGrid.y, asset.footprint);
      const result = validatePlacement({ assetId, gridX: candidateGrid.x, gridY: candidateGrid.y, stage, items });
      candidateValid = result.valid;
      ghost.setPosition(center.x, center.y).setTint(result.valid ? 0xffffff : COLORS.invalid);
      if (result.valid) status.setText('松手即可建造');
      else if (result.reason === 'wrong-terrain') status.setText('这个物件不适合当前地形');
      else if (result.reason === 'overlap') status.setText('这里已有建筑或公共地标');
      else status.setText('水域和岛外不能建造');
    });
    candidate.on('dragend', () => {
      this.cameraController.setInteractionLocked(false);
      if (candidateValid && candidateGrid) {
        candidate.disableInteractive();
        status.setText('建造成功！');
        ghost.clearTint().setAlpha(1);
        this.tweens.add({
          targets: ghost,
          scale: 0.84,
          duration: 260,
          yoyo: true,
          onComplete: () => this.flow.commitPlacement(assetId, candidateGrid!.x, candidateGrid!.y),
        });
      } else {
        ghost.setVisible(false).clearTint();
        candidate.setPosition(78, 338);
        status.setText('换一个空着的合法格子再试试');
      }
    });
  }
}
