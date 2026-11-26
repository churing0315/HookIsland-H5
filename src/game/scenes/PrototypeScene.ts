import Phaser from 'phaser';
import { fitAssetImage, placedAssetScale, PLACEMENT_PREVIEW, type PlacementFeedback } from '../assets/placementDisplay';
import { createPlaceholderTextures } from '../assets/placeholders';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getAsset } from '../data/assetCatalog';
import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { validatePlacement } from '../domain/placement';
import { FocusEnvironmentController } from '../focus/FocusEnvironmentController';
import {
  FOCUS_RING,
  FOCUS_TEXTURE_PATHS,
  FOCUS_TEXTURES,
  resolveFocusTexture,
  shouldReduceFocusMotion,
} from '../focus/focusConfig';
import { IslandCameraController } from '../map/IslandCameraController';
import { IslandBuildingEditor } from '../map/IslandBuildingEditor';
import { effectiveMapStage } from '../map/IslandExpansionService';
import { IslandMapRenderer } from '../map/IslandMapRenderer';
import { gridToWorldCenter, TILE_SIZE, worldToGrid } from '../map/mapConfig';
import type { GameFlow } from '../state/GameFlow';
import type { GameSnapshot, MapStage, PlacedItem } from '../types';

export class PrototypeScene extends Phaser.Scene {
  private static readonly FOCUS_INNER_TEXTURE = 'focus-inner-gradient';
  private flow!: GameFlow;
  private unsubscribe: (() => void) | null = null;
  private worldLayer!: Phaser.GameObjects.Container;
  private hudLayer!: Phaser.GameObjects.Container;
  private hudCamera!: Phaser.Cameras.Scene2D.Camera;
  private cameraController!: IslandCameraController;
  private mapRenderer!: IslandMapRenderer;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private focusEnvironment: FocusEnvironmentController | null = null;
  private focusContents: Phaser.GameObjects.Container | null = null;
  private focusMascot: Phaser.GameObjects.Image | null = null;
  private buildingEditor: IslandBuildingEditor | null = null;
  private renderedBuildings: PlacedItem[] | null = null;

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
      if (snapshot.screen !== this.renderedScreen || (snapshot.screen === 'island' && snapshot.data.placedItems !== this.renderedBuildings)) {
        this.render(snapshot);
      }
      if (snapshot.screen === 'focus') this.focusEnvironment?.setPaused(snapshot.focus?.paused ?? false);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.buildingEditor?.destroy();
      this.cameraController.destroy();
    });
  }

  private render(snapshot: GameSnapshot): void {
    const wasFocusing = this.renderedScreen === 'focus';
    const camera = this.cameras.main;
    const islandView = snapshot.screen === 'island' && this.renderedScreen === 'island'
      ? { zoom: camera.zoom, x: camera.scrollX, y: camera.scrollY }
      : null;
    this.renderedScreen = snapshot.screen;
    if (wasFocusing && snapshot.screen === 'celebration') {
      this.finishFocus();
      return;
    }
    this.buildingEditor?.destroy();
    this.buildingEditor = null;
    this.focusEnvironment?.destroy();
    this.focusEnvironment = null;
    this.tweens.killAll();
    this.worldLayer.removeAll(true);
    this.hudLayer.removeAll(true);
    this.focusContents = null;
    this.focusMascot = null;
    this.cameraController.setInteractionLocked(false);

    switch (snapshot.screen) {
      case 'island':
        this.renderedBuildings = snapshot.data.placedItems;
        this.renderIsland(snapshot.data.placedItems, effectiveMapStage(snapshot.data.mapStage));
        if (islandView) camera.setZoom(islandView.zoom).setScroll(islandView.x, islandView.y);
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
        this.prepareFixedScreen(0x21ade8);
        break;
      case 'build':
        this.renderBuild(snapshot.data.placedItems, effectiveMapStage(snapshot.data.mapStage), snapshot.selectedAssetId,
          snapshot.data.storedBuildings.find(({ id }) => id === snapshot.selectedBuildingId)?.flipped === true);
        break;
    }
  }

  private prepareMap(stage: MapStage, items: PlacedItem[], alpha = 1, placementMode = false) {
    this.cameras.main.setBackgroundColor(placementMode ? 0x60cee9 : COLORS.water);
    this.cameraController.setEnabled(true);
    const sprites = this.mapRenderer.render(stage, items, alpha, placementMode);
    this.cameraController.fitStage(stage, !placementMode, placementMode);
    return sprites;
  }

  private prepareFixedScreen(color: number): void {
    this.cameraController.setEnabled(false);
    this.cameras.main.setZoom(1).setScroll(0, 0).setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(color);
    this.hudLayer.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color));
  }

  private renderIsland(items: PlacedItem[], stage: MapStage, alpha = 1): void {
    const sprites = this.prepareMap(stage, items, alpha);
    this.buildingEditor = new IslandBuildingEditor(this, this.cameraController, this.flow, sprites);
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
    const centerY = GAME_HEIGHT / 2;
    const contents = this.add.container(-FOCUS_RING.centerX, -centerY);
    this.focusContents = this.add.container(FOCUS_RING.centerX, centerY, [contents]);
    this.hudLayer.add(this.focusContents);

    const innerCircle = this.add.image(
      FOCUS_RING.centerX,
      FOCUS_RING.centerY,
      this.ensureFocusInnerTexture(),
    ).setDisplaySize(FOCUS_RING.innerRadius * 2, FOCUS_RING.innerRadius * 2);
    contents.add(innerCircle);
    const focus = snapshot.focus;

    const island = this.add.image(FOCUS_RING.centerX, 203, FOCUS_TEXTURES.island).setScale(FOCUS_RING.islandScale);
    const mascot = this.add
      .image(FOCUS_RING.centerX, 225, resolveFocusTexture(focus?.taskId ?? 'book'))
      .setOrigin(0.5, 1)
      .setScale(FOCUS_RING.mascotScale);
    this.focusMascot = mascot;
    contents.add([island, mascot]);

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
    contents.add(glow);
    this.focusEnvironment.setPaused(focus?.paused ?? false);
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

  private finishFocus(): void {
    const reduced = shouldReduceFocusMotion();
    if (this.focusMascot) this.tweens.killTweensOf(this.focusMascot);
    this.focusEnvironment?.fadeForSettlement(reduced ? 150 : 300);
    if (!this.focusContents) return;
    this.tweens.add({
      targets: this.focusContents,
      scale: reduced ? 1 : 0,
      alpha: 0,
      duration: reduced ? 150 : 300,
      ease: 'Cubic.easeIn',
    });
  }

  private renderBuild(items: PlacedItem[], stage: MapStage, assetId: string | null, flipped: boolean): void {
    this.prepareMap(stage, items, 1, true);
    if (!assetId) return;
    const asset = getAsset(assetId);
    const edgeShading = this.add.graphics();
    const edge = 0x218fd5;
    edgeShading.fillGradientStyle(edge, edge, edge, edge, 1, 1, 0, 0);
    edgeShading.fillRect(0, 0, GAME_WIDTH, 96);
    edgeShading.fillGradientStyle(edge, edge, edge, edge, 0, 0, 1, 1);
    edgeShading.fillRect(0, GAME_HEIGHT - 105, GAME_WIDTH, 105);
    const { x, y, width, height } = PLACEMENT_PREVIEW;
    const frame = this.textures.getFrame(asset.runtimeTextureKey);
    const scale = fitAssetImage(frame.width, frame.height, width, height);
    // The DOM draws the preview over the card. This zone keeps Phaser's drag input and coordinates.
    const candidate = this.add
      .zone(x, y, frame.width * scale, frame.height * scale)
      .setInteractive({ useHandCursor: true });
    const updatePreview = (message: string | null, position: PlacementFeedback['position']): void => {
      window.dispatchEvent(new CustomEvent<PlacementFeedback>('hook-island-placement-status', { detail: { message, position } }));
    };
    this.hudLayer.add([edgeShading, candidate]);

    const highlight = this.add.rectangle(0, 0, asset.footprint.width * TILE_SIZE, asset.footprint.height * TILE_SIZE, 0x648d19, 0.24).setVisible(false);
    const ghost = this.add
      .image(0, 0, asset.runtimeTextureKey)
      .setFlipX(flipped)
      .setAlpha(0.72)
      .setVisible(false)
      .setDepth(10_000);
    const ghostScale = placedAssetScale(asset, ghost.width, ghost.height);
    ghost.setScale(ghostScale);
    this.worldLayer.add([highlight, ghost]);
    this.input.setDraggable(candidate);
    let candidateGrid: { x: number; y: number } | null = null;
    let candidateValid = false;

    candidate.on('dragstart', () => {
      this.cameraController.setInteractionLocked(true);
      candidateGrid = null;
      candidateValid = false;
    });
    candidate.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      candidate.setPosition(dragX, dragY);
      const world = this.cameraController.screenToWorld(dragX, dragY);
      candidateGrid = worldToGrid(world.x, world.y, asset.footprint);
      const center = gridToWorldCenter(candidateGrid.x, candidateGrid.y, asset.footprint);
      const result = validatePlacement({ assetId, gridX: candidateGrid.x, gridY: candidateGrid.y, stage, items });
      candidateValid = result.valid;
      ghost.setPosition(center.x, center.y).setVisible(true).setTint(result.valid ? 0xffffff : COLORS.invalid);
      highlight.setPosition(center.x, center.y).setVisible(true).setFillStyle(result.valid ? 0x648d19 : 0xc6544b, 0.24);
      const position = { x: dragX, y: dragY };
      if (result.valid) updatePreview('松手即可建造', position);
      else if (result.reason === 'wrong-terrain') updatePreview('这个物件不适合当前地形', position);
      else if (result.reason === 'overlap') updatePreview('这里已有建筑', position);
      else updatePreview('水域和岛外不能建造', position);
    });
    candidate.on('dragend', () => {
      this.cameraController.setInteractionLocked(false);
      highlight.setVisible(false);
      if (candidateValid && candidateGrid) {
        candidate.disableInteractive().setVisible(false);
        updatePreview('建造成功！', null);
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
        candidate.setPosition(x, y);
        updatePreview(null, PLACEMENT_PREVIEW);
      }
    });
  }
}
