import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { shouldReduceFocusMotion } from '../focus/focusConfig';
import type { GameFlow } from '../state/GameFlow';
import type { IslandCameraController } from './IslandCameraController';
import type { IslandBuildingSprite } from './IslandMapRenderer';
import { gridToWorldCenter, worldToGrid } from './mapConfig';

type EditAction = 'flip' | 'store' | 'confirm' | 'cancel';
export interface BuildingEditControls { x: number; y: number; valid: boolean; flipped: boolean }

interface Press {
  sprite: IslandBuildingSprite;
  id: number;
  x: number;
  y: number;
}

export class IslandBuildingEditor {
  private pending: Press | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private active: (IslandBuildingSprite & { gridX: number; gridY: number; valid: boolean; flipped: boolean }) | null = null;
  private drag: Press | null = null;
  private dragOffset = { x: 0, y: 0 };
  private bob: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: IslandCameraController,
    private readonly flow: GameFlow,
    sprites: IslandBuildingSprite[],
  ) {
    for (const sprite of sprites) {
      sprite.image.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.wasTouch && pointer.button !== 0) return;
        if (this.active) {
          if (this.active.item.id === sprite.item.id) this.startDrag(sprite, pointer);
          return;
        }
        this.cancelPress();
        this.pending = { sprite, id: pointer.id, x: pointer.x, y: pointer.y };
        this.timer = this.scene.time.delayedCall(500, () => {
          const press = this.pending;
          this.cancelPress();
          if (!press || !pointer.isDown) return;
          this.begin(press.sprite);
          this.startDrag(press.sprite, pointer);
        });
      });
    }
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    window.addEventListener('hook-island-edit-action', this.onAction);
    window.addEventListener('keydown', this.onKey);
  }

  destroy(): void {
    this.cancelPress();
    this.end();
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    this.scene.input.off('pointerupoutside', this.onUp);
    window.removeEventListener('hook-island-edit-action', this.onAction);
    window.removeEventListener('keydown', this.onKey);
  }

  private begin(sprite: IslandBuildingSprite): void {
    const { item } = sprite;
    this.active = {
      ...sprite, gridX: item.gridX, gridY: item.gridY,
      valid: this.flow.canMoveBuilding(item, item.gridX, item.gridY),
      flipped: item.flipped === true,
    };
    this.camera.setInteractionLocked(true);
    if (!shouldReduceFocusMotion()) {
      const motion = { y: 0 };
      this.bob = this.scene.tweens.add({
        targets: motion, y: -5, duration: 620, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        onUpdate: () => this.positionSprite(motion.y),
      });
    }
    this.publish();
  }

  private startDrag(sprite: IslandBuildingSprite, pointer: Phaser.Input.Pointer): void {
    if (this.drag || !this.active) return;
    this.drag = { sprite, id: pointer.id, x: pointer.x, y: pointer.y };
    const point = this.camera.screenToWorld(pointer.x, pointer.y);
    const center = gridToWorldCenter(this.active.gridX, this.active.gridY, sprite.item.footprint);
    this.dragOffset = { x: center.x - point.x, y: center.y - point.y };
  }

  private readonly onMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.pending?.id === pointer.id && Math.hypot(pointer.x - this.pending.x, pointer.y - this.pending.y) > 7) {
      this.cancelPress();
    }
    const draft = this.active;
    if (!draft || this.drag?.id !== pointer.id || !pointer.isDown) return;
    if (Math.hypot(pointer.x - this.drag.x, pointer.y - this.drag.y) < 3) return;
    const point = this.camera.screenToWorld(pointer.x, pointer.y);
    const grid = worldToGrid(point.x + this.dragOffset.x, point.y + this.dragOffset.y, draft.item.footprint);
    if (grid.x === draft.gridX && grid.y === draft.gridY) return;
    draft.gridX = grid.x;
    draft.gridY = grid.y;
    draft.valid = this.flow.canMoveBuilding(draft.item, grid.x, grid.y);
    draft.image.setTint(draft.valid ? 0xffffff : 0xffaaa1);
    this.positionSprite();
    this.publish();
  };

  private readonly onUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.pending?.id === pointer.id) this.cancelPress();
    if (this.drag?.id === pointer.id) this.drag = null;
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.end();
  };

  private readonly onAction = (event: Event): void => {
    const action = (event as CustomEvent<EditAction>).detail;
    if (action === 'cancel') {
      this.cancelPress();
      this.end();
      return;
    }
    const draft = this.active;
    if (!draft) return;
    if (action === 'flip') {
      draft.flipped = !draft.flipped;
      draft.image.setFlipX(draft.flipped);
      this.publish();
    } else if (action === 'confirm' && draft.valid) {
      this.flow.editPlacedBuilding(draft.item.id, draft.gridX, draft.gridY, draft.flipped);
    } else if (action === 'store') {
      this.flow.storePlacedBuilding(draft.item.id, draft.flipped);
    }
  };

  private positionSprite(offsetY = 0): void {
    const draft = this.active;
    if (!draft) return;
    const { x, y } = gridToWorldCenter(draft.gridX, draft.gridY, draft.item.footprint);
    draft.image.setPosition(x, y + offsetY);
  }

  private publish(): void {
    const draft = this.active;
    if (!draft) return;
    const camera = this.scene.cameras.main;
    const origin = camera.getWorldPoint(0, 0);
    const { x, y } = gridToWorldCenter(draft.gridX, draft.gridY, draft.item.footprint);
    const right = (x - origin.x + draft.image.displayWidth / 2) * camera.zoom;
    const top = (y - origin.y - draft.image.displayHeight / 2) * camera.zoom;
    const controls: BuildingEditControls = {
      x: Math.min(GAME_WIDTH - 124, Math.max(8, right + 6)),
      y: Math.min(GAME_HEIGHT - 40, Math.max(8, top - 12)),
      valid: draft.valid,
      flipped: draft.flipped,
    };
    window.dispatchEvent(new CustomEvent('hook-island-edit-controls', { detail: controls }));
  }

  private cancelPress(): void {
    this.timer?.remove();
    this.timer = null;
    this.pending = null;
  }

  private end(): void {
    const draft = this.active;
    if (!draft) return;
    this.bob?.stop();
    this.bob = null;
    const center = gridToWorldCenter(draft.item.gridX, draft.item.gridY, draft.item.footprint);
    draft.image.setPosition(center.x, center.y).setFlipX(draft.item.flipped === true).clearTint();
    this.active = null;
    this.drag = null;
    this.camera.setInteractionLocked(false);
    window.dispatchEvent(new CustomEvent('hook-island-edit-controls', { detail: null }));
  }
}
