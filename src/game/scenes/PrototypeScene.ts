import Phaser from 'phaser';
import { createPlaceholderTextures, PLACEHOLDER_KEYS } from '../assets/placeholders';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ISLAND, isValidPlacement } from '../domain/placement';
import type { GameFlow } from '../state/GameFlow';
import type { GameSnapshot, PlacedItem } from '../types';

export class PrototypeScene extends Phaser.Scene {
  private flow!: GameFlow;
  private unsubscribe: (() => void) | null = null;
  private worldLayer!: Phaser.GameObjects.Container;
  private renderedScreen: GameSnapshot['screen'] | null = null;
  private dialGraphics: Phaser.GameObjects.Graphics | null = null;
  private mascot: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('prototype');
  }

  create(): void {
    this.flow = this.registry.get('flow') as GameFlow;
    createPlaceholderTextures(this);
    this.worldLayer = this.add.container(0, 0);
    this.unsubscribe = this.flow.subscribe((snapshot) => {
      if (snapshot.screen !== this.renderedScreen) {
        this.render(snapshot);
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
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
    this.dialGraphics = null;
    this.mascot = null;

    switch (snapshot.screen) {
      case 'island':
        this.renderIsland(snapshot.data.placedItems);
        break;
      case 'task-select':
        this.renderIsland(snapshot.data.placedItems, 0.48);
        break;
      case 'ritual':
        this.renderRitual();
        break;
      case 'focus':
        this.renderFocus();
        break;
      case 'celebration':
        this.renderCelebration();
        break;
      case 'build':
        this.renderBuild(snapshot.data.placedItems);
        break;
    }
  }

  private renderIsland(items: PlacedItem[], alpha = 1): void {
    this.drawWater();
    this.drawIslandBase(alpha);
    this.drawPlacedItems(items, alpha);

    this.mascot = this.add.image(675, 225, PLACEHOLDER_KEYS.mascot).setAlpha(alpha).setScale(0.82);
    this.worldLayer.add(this.mascot);
    if (alpha === 1) {
      this.tweens.add({
        targets: this.mascot,
        y: this.mascot.y - 3,
        duration: 2_000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      const label = this.add
        .text(675, 280, '角色占位', { fontFamily: 'sans-serif', fontSize: '12px', color: '#8A7A66' })
        .setOrigin(0.5);
      this.worldLayer.add(label);
    }
  }

  private renderRitual(): void {
    this.addWorldRectangle(COLORS.card);
    const left = this.add.image(340, 190, PLACEHOLDER_KEYS.mascot).setScale(0.92);
    const promise = this.add.circle(455, 190, 28, COLORS.primary, 1);
    const line = this.add.rectangle(402, 190, 80, 12, COLORS.mascotBrown, 1).setOrigin(0.5);
    this.worldLayer.add([left, line, promise]);
    this.tweens.add({ targets: [left, promise], x: '+=8', duration: 700, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
  }

  private renderFocus(): void {
    this.addWorldRectangle(0xfbf7ee);
    this.dialGraphics = this.add.graphics();
    this.worldLayer.add(this.dialGraphics);
    this.drawFocusDial(1);
    this.mascot = this.add.image(545, 205, PLACEHOLDER_KEYS.mascot).setScale(0.96);
    this.worldLayer.add(this.mascot);
    this.tweens.add({
      targets: this.mascot,
      y: this.mascot.y - 3,
      duration: 2_000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
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

  private renderCelebration(): void {
    this.addWorldRectangle(0xfff9f0);
    const mascot = this.add.image(406, 195, PLACEHOLDER_KEYS.mascot).setScale(1.1);
    this.worldLayer.add(mascot);
    this.tweens.add({ targets: mascot, scale: 1.22, y: mascot.y - 12, duration: 420, yoyo: true, repeat: 2 });
    const colors = [0xe88a6e, 0xfec845, 0x54cdfd, 0xb8cc7e];
    for (let index = 0; index < 18; index += 1) {
      const dot = this.add.circle(260 + (index % 9) * 36, 120 + Math.floor(index / 9) * 18, 5, colors[index % colors.length]);
      this.worldLayer.add(dot);
      this.tweens.add({
        targets: dot,
        y: dot.y + 90 + (index % 3) * 8,
        alpha: 0,
        duration: 1_300,
        delay: index * 35,
      });
    }
  }

  private renderBuild(items: PlacedItem[]): void {
    this.drawWater();
    this.drawIslandBase(1);
    this.drawGrid();
    this.drawPlacedItems(items, 1);

    const tray = this.add.rectangle(406, 338, 780, 62, COLORS.card, 0.97).setStrokeStyle(2, 0xd8cbb8, 0.7);
    this.worldLayer.add(tray);
    const candidate = this.add.image(100, 332, PLACEHOLDER_KEYS.tree).setScale(0.72).setInteractive({ useHandCursor: true });
    candidate.setData('homeX', candidate.x);
    candidate.setData('homeY', candidate.y);
    this.input.setDraggable(candidate);
    this.worldLayer.add(candidate);

    const status = this.add
      .text(170, 332, '拖动小树到草地上', { fontFamily: 'sans-serif', fontSize: '18px', color: '#4A3B2A' })
      .setOrigin(0, 0.5);
    this.worldLayer.add(status);

    candidate.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      candidate.setPosition(dragX, dragY);
      const valid = isValidPlacement(dragX, dragY, items);
      candidate.setTint(valid ? 0xffffff : COLORS.invalid);
      status.setText(valid ? '这里可以种下' : '请放在空着的草地上');
    });

    candidate.on('dragend', () => {
      const valid = isValidPlacement(candidate.x, candidate.y, items);
      if (valid) {
        candidate.disableInteractive();
        candidate.clearTint();
        status.setText('种下成功！');
        this.tweens.add({
          targets: candidate,
          scale: 0.86,
          duration: 300,
          yoyo: true,
          onComplete: () => this.flow.commitPlacement(candidate.x, candidate.y),
        });
      } else {
        candidate.clearTint();
        status.setText('这里不能种，再试试吧');
        this.tweens.add({
          targets: candidate,
          x: candidate.getData('homeX') as number,
          y: candidate.getData('homeY') as number,
          duration: 260,
          ease: 'Sine.Out',
        });
      }
    });
  }

  private drawWater(): void {
    this.addWorldRectangle(COLORS.water);
    const waves = this.add.graphics();
    waves.lineStyle(2, COLORS.waterLine, 0.58);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const x = 40 + col * 108 + (row % 2) * 22;
        const y = 86 + row * 70;
        waves.beginPath();
        waves.arc(x, y, 14, 0.2, Math.PI - 0.2);
        waves.strokePath();
      }
    }
    this.worldLayer.add(waves);
  }

  private drawIslandBase(alpha: number): void {
    const island = this.add.graphics().setAlpha(alpha);
    island.fillStyle(COLORS.sand, 1);
    island.fillEllipse(ISLAND.centerX, ISLAND.centerY + 8, ISLAND.radiusX * 2 + 20, ISLAND.radiusY * 2 + 18);
    island.fillStyle(COLORS.grass, 1);
    island.fillEllipse(ISLAND.centerX, ISLAND.centerY, ISLAND.radiusX * 2, ISLAND.radiusY * 2);
    island.fillStyle(COLORS.grassLight, 0.55);
    island.fillEllipse(330, 155, 190, 80);
    this.worldLayer.add(island);
  }

  private drawGrid(): void {
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.28);
    for (let x = 150; x <= 662; x += 32) {
      const normalizedX = (x - ISLAND.centerX) / (ISLAND.radiusX - ISLAND.safeInset);
      const halfHeight = (ISLAND.radiusY - ISLAND.safeInset) * Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
      grid.lineBetween(x, ISLAND.centerY - halfHeight, x, ISLAND.centerY + halfHeight);
    }
    for (let y = 115; y <= 275; y += 32) {
      const normalizedY = (y - ISLAND.centerY) / (ISLAND.radiusY - ISLAND.safeInset);
      const halfWidth = (ISLAND.radiusX - ISLAND.safeInset) * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
      grid.lineBetween(ISLAND.centerX - halfWidth, y, ISLAND.centerX + halfWidth, y);
    }
    this.worldLayer.add(grid);
  }

  private drawPlacedItems(items: PlacedItem[], alpha: number): void {
    [...items]
      .sort((a, b) => a.y - b.y)
      .forEach((item) => {
        const image = this.add.image(item.x, item.y, PLACEHOLDER_KEYS.tree).setScale(0.72).setAlpha(alpha);
        image.setDepth(item.y);
        this.worldLayer.add(image);
      });
  }

  private addWorldRectangle(color: number): void {
    const background = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, 1);
    this.worldLayer.add(background);
  }
}
