import Phaser from 'phaser';
import { fitAssetImage, placedAssetScale } from '../assets/placementDisplay';
import { createPlaceholderTextures, PLACEHOLDER_KEYS } from '../assets/placeholders';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getAsset } from '../data/assetCatalog';
import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { validatePlacement } from '../domain/placement';
import { FocusEnvironmentController } from '../focus/FocusEnvironmentController';
import {
  FOCUS_RING,
  FOCUS_TEXTURE_PATHS,
  FOCUS_TEXTURES,
  focusRemainingRatio,
  resolveFocusTexture,
  shouldReduceFocusMotion,
} from '../focus/focusConfig';
import { IslandCameraController } from '../map/IslandCameraController';
import { effectiveMapStage } from '../map/IslandExpansionService';
import { IslandMapRenderer } from '../map/IslandMapRenderer';
import { gridToWorldCenter, worldToGrid } from '../map/mapConfig';
import type { GameFlow } from '../state/GameFlow';
import type { GameSnapshot, MapStage, PlacedItem } from '../types';

export class PrototypeScene extends Phaser.Scene {
  private static readonly FOCUS_INNER_TEXTURE = 'focus-inner-gradient';
  private static readonly FOCUS_DIAL_TEXTURE = 'focus-dial-hires';
  private flow!: GameFlow;
  private unsubscribe: (() => void) | null = null;
  private worldLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private hudCamera!: Phaser.Cameras.Scene2D.Camera;
  private cameraController!: IslandCameraController;
  private mapRenderer!: IslandMapRenderer;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private dialTexture: Phaser.Textures.CanvasTexture | null = null;
  private focusEnvironment: FocusEnvironmentController | null = null;

  constructor() {
    super('prototype');
  }

  preload(): void {
    for (const [key, path] of FOCUS_TEXTURE_PATHS) this.load.image(key, path);
    for (const { runtimeTextureKey, url } of REWARD_BUILDINGS) this.load.image(runtimeTextureKey, url);
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
      if (snapshot.screen === 'focus') this.focusEnvironment?.setPaused(snapshot.focus?.paused ?? false);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.cameraController.destroy();
    });
  }

  update(): void {
    if (this.flow.getSnapshot().screen === 'focus' && this.dialTexture) {
      const focus = this.flow.getSnapshot().focus;
      if (focus) this.drawFocusDial(focusRemainingRatio(focus.remainingMs, focus.totalMs));
    }
  }

  private render(snapshot: GameSnapshot): void {
    this.renderedScreen = snapshot.screen;
    this.focusEnvironment?.destroy();
    this.focusEnvironment = null;
    this.tweens.killAll();
    this.worldLayer.removeAll(true);
    this.hudLayer.removeAll(true);
    this.dialTexture = null;
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
        this.renderFocus(snapshot);
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
    this.prepareFixedScreen(0x92e6ee);
  }

  private renderFocus(snapshot: GameSnapshot): void {
    this.cameraController.setEnabled(false);
    this.cameras.main.setZoom(1).setScroll(0, 0).setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(0x21ade8);

    const background = this.add.graphics();
    background.fillGradientStyle(0x74dffb, 0x74dffb, 0x21ade8, 0x21ade8, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.hudLayer.add(background);
    this.focusEnvironment = new FocusEnvironmentController(this, this.hudLayer);

    const innerCircle = this.add.image(
      FOCUS_RING.centerX,
      FOCUS_RING.centerY,
      this.ensureFocusInnerTexture(),
    ).setDisplaySize(FOCUS_RING.innerRadius * 2, FOCUS_RING.innerRadius * 2);
    this.hudLayer.add(innerCircle);
    this.dialTexture = this.ensureFocusDialTexture();
    const dialSize = (FOCUS_RING.outerRadius + FOCUS_RING.ringWidth / 2 + 3) * 2;
    const dial = this.add
      .image(FOCUS_RING.centerX, FOCUS_RING.centerY, PrototypeScene.FOCUS_DIAL_TEXTURE)
      .setDisplaySize(dialSize, dialSize);
    this.hudLayer.add(dial);
    const focus = snapshot.focus;
    const remaining = focus ? focusRemainingRatio(focus.remainingMs, focus.totalMs) : 0;
    this.drawFocusDial(remaining);

    const island = this.add.image(FOCUS_RING.centerX, 203, FOCUS_TEXTURES.island).setScale(FOCUS_RING.islandScale);
    const mascot = this.add
      .image(FOCUS_RING.centerX, 225, resolveFocusTexture(focus?.taskId ?? 'book'))
      .setOrigin(0.5, 1)
      .setScale(FOCUS_RING.mascotScale);
    this.hudLayer.add([island, mascot]);

    if (!shouldReduceFocusMotion()) {
      this.tweens.add({
        targets: mascot,
        scaleX: FOCUS_RING.mascotBreathScale,
        scaleY: FOCUS_RING.mascotBreathScale,
        duration: 1_400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    const glow = this.add.graphics();
    glow.lineStyle(12, FOCUS_RING.glowColor, 0.4);
    glow.strokeCircle(FOCUS_RING.centerX, FOCUS_RING.centerY, FOCUS_RING.innerRadius - 8);
    this.hudLayer.add(glow);
    this.focusEnvironment.setPaused(focus?.paused ?? false);
  }

  private drawFocusDial(remainingRatio: number): void {
    if (!this.dialTexture) return;
    const context = this.dialTexture.getContext();
    const textureScale = 3;
    const logicalSize = this.dialTexture.width / textureScale;
    const center = logicalSize / 2;
    context.setTransform(textureScale, 0, 0, textureScale, 0, 0);
    context.clearRect(0, 0, logicalSize, logicalSize);
    context.lineCap = 'round';
    context.lineWidth = FOCUS_RING.ringWidth;
    context.strokeStyle = '#1998dc';
    context.beginPath();
    context.arc(center, center, FOCUS_RING.outerRadius, 0, Math.PI * 2);
    context.stroke();

    const progress = Math.max(0, Math.min(1, remainingRatio));
    const start = -Math.PI / 2;
    if (progress > 0.001) {
      const end = start + Math.PI * 2 * progress * (FOCUS_RING.clockwise ? 1 : -1);
      context.lineWidth = FOCUS_RING.ringWidth;
      context.strokeStyle = '#f4f587';
      context.beginPath();
      context.arc(center, center, FOCUS_RING.outerRadius, start, end, !FOCUS_RING.clockwise);
      context.stroke();
    }
    context.lineWidth = FOCUS_RING.whiteStrokeWidth;
    context.strokeStyle = 'rgba(255,255,255,0.98)';
    context.beginPath();
    context.arc(center, center, FOCUS_RING.innerRadius + 2, 0, Math.PI * 2);
    context.stroke();
    this.dialTexture.refresh();
  }

  private ensureFocusDialTexture(): Phaser.Textures.CanvasTexture {
    const key = PrototypeScene.FOCUS_DIAL_TEXTURE;
    if (this.textures.exists(key)) return this.textures.get(key) as Phaser.Textures.CanvasTexture;
    const textureScale = 3;
    const logicalSize = (FOCUS_RING.outerRadius + FOCUS_RING.ringWidth / 2 + 3) * 2;
    const texture = this.textures.createCanvas(key, logicalSize * textureScale, logicalSize * textureScale);
    if (!texture) throw new Error('Unable to create focus dial texture');
    return texture;
  }

  private ensureFocusInnerTexture(): string {
    const key = PrototypeScene.FOCUS_INNER_TEXTURE;
    if (this.textures.exists(key)) return key;
    const diameter = FOCUS_RING.innerRadius * 2;
    const textureScale = 2;
    const textureDiameter = diameter * textureScale;
    const texture = this.textures.createCanvas(key, textureDiameter, textureDiameter);
    if (!texture) return key;
    const context = texture.getContext();
    const gradient = context.createLinearGradient(0, 0, 0, textureDiameter);
    gradient.addColorStop(0, '#71d07c');
    gradient.addColorStop(1, '#8bcf71');
    context.clearRect(0, 0, textureDiameter, textureDiameter);
    context.beginPath();
    context.arc(textureDiameter / 2, textureDiameter / 2, textureDiameter / 2, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    texture.refresh();
    return key;
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

  private renderBuild(items: PlacedItem[], stage: MapStage, assetId: string | null): void {
    this.prepareMap(stage, items, Boolean(assetId));
    if (!assetId) return;
    const asset = getAsset(assetId);
    const tray = this.add.rectangle(406, 342, 780, 58, COLORS.card, 0.97).setStrokeStyle(2, 0xd8cbb8, 0.76);
    const candidate = this.add
      .image(78, 338, asset.runtimeTextureKey)
      .setInteractive({ useHandCursor: true });
    candidate.setScale(fitAssetImage(candidate.width, candidate.height, 60, 46));
    const status = this.add
      .text(128, 338, `拖动${asset.name}到合适的空地`, {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#4A3B2A',
      })
      .setOrigin(0, 0.5);
    this.hudLayer.add([tray, candidate, status]);

    const ghost = this.add
      .image(0, 0, asset.runtimeTextureKey)
      .setAlpha(0.72)
      .setVisible(false)
      .setDepth(10_000);
    const ghostScale = placedAssetScale(asset, ghost.width, ghost.height);
    ghost.setScale(ghostScale);
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
          scale: ghostScale * 1.08,
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
