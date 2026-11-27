import type Phaser from 'phaser';
import { isFootprintUnlocked } from '../domain/placement';
import { shouldReduceFocusMotion } from '../focus/focusConfig';
import type { GameFlow } from '../state/GameFlow';
import type { MapStage, PlacedItem } from '../types';
import type { IslandCameraController } from './IslandCameraController';
import type { IslandBuildingSprite } from './IslandMapRenderer';
import { gridToWorldAnchor, worldToGrid } from './mapConfig';

type EditAction = 'flip' | 'store' | 'confirm' | 'cancel';
export interface BuildingEditControls { id: string; x: number; y: number; valid: boolean; flipped: boolean }
const EDIT_BOB_HEIGHT = 5;

interface Press {
  sprite: IslandBuildingSprite;
  id: number;
  x: number;
  y: number;
}

export class IslandBuildingEditor {
  private sprites: IslandBuildingSprite[];
  private pending: Press | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private active: (IslandBuildingSprite & { gridX: number; gridY: number; valid: boolean; flipped: boolean }) | null = null;
  private drag: (Press & { gridX: number; gridY: number }) | null = null;
  private dragOffset = { x: 0, y: 0 };
  private bob: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: IslandCameraController,
    private readonly flow: GameFlow,
    private readonly stage: MapStage,
    sprites: IslandBuildingSprite[],
    private readonly sortSprites: (draft?: Pick<PlacedItem, 'id' | 'gridY'>) => IslandBuildingSprite[],
  ) {
    this.sprites = sprites;
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    window.addEventListener('hook-island-edit-action', this.onAction);
    window.addEventListener('keydown', this.onKey);
  }

  destroy(): void {
    this.cancelPress();
    this.end();
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    this.scene.input.off('pointerupoutside', this.onUp);
    window.removeEventListener('hook-island-edit-action', this.onAction);
    window.removeEventListener('keydown', this.onKey);
  }

  /** 按实际绘制顺序反向拾取，重叠时先命中视觉最上层实例。 */
  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.wasTouch && pointer.button !== 0) return;
    const world = this.camera.screenToWorld(pointer.x, pointer.y);
    const sprite = [...this.sprites].reverse().find(({ image }) =>
      image.visible && image.getBounds().contains(world.x, world.y));
    if (!sprite) return;
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
  };

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
        targets: motion, y: -EDIT_BOB_HEIGHT, duration: 620, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        onUpdate: () => this.positionSprite(motion.y),
      });
    }
    this.publish();
  }

  private startDrag(sprite: IslandBuildingSprite, pointer: Phaser.Input.Pointer): void {
    if (this.drag || !this.active) return;
    this.drag = { sprite, id: pointer.id, x: pointer.x, y: pointer.y, gridX: this.active.gridX, gridY: this.active.gridY };
    const point = this.camera.screenToWorld(pointer.x, pointer.y);
    const center = gridToWorldAnchor(this.active.gridX, this.active.gridY, sprite.item.footprint);
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
    this.updateDraftPosition(grid.x, grid.y);
  };

  private readonly onUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.pending?.id === pointer.id) this.cancelPress();
    const drag = this.drag;
    if (drag?.id !== pointer.id) return;
    this.drag = null;
    if (this.active?.valid === false) this.updateDraftPosition(drag.gridX, drag.gridY);
  };

  private updateDraftPosition(gridX: number, gridY: number): void {
    const draft = this.active;
    if (!draft) return;
    const rowChanged = draft.gridY !== gridY;
    draft.gridX = gridX;
    draft.gridY = gridY;
    draft.valid = this.flow.canMoveBuilding(draft.item, gridX, gridY);
    draft.image
      .setVisible(isFootprintUnlocked(gridX, gridY, draft.item.footprint, this.stage))
      .setTint(draft.valid ? 0xffffff : 0x7c8491);
    this.positionSprite();
    if (rowChanged) this.sprites = this.sortSprites({ id: draft.item.id, gridY });
    this.publish();
  }

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
    const { x, y } = gridToWorldAnchor(draft.gridX, draft.gridY, draft.item.footprint);
    draft.image.setPosition(x, y + offsetY);
  }

  private publish(): void {
    const draft = this.active;
    if (!draft) return;
    const camera = this.scene.cameras.main;
    const origin = camera.getWorldPoint(0, 0);
    const { x, y } = gridToWorldAnchor(draft.gridX, draft.gridY, draft.item.footprint);
    const centerX = x + draft.image.displayWidth / 2 - draft.image.displayOriginX * draft.image.scaleX;
    const top = y - draft.image.displayOriginY * draft.image.scaleY - (this.bob ? EDIT_BOB_HEIGHT : 0);
    const controls: BuildingEditControls = {
      id: draft.item.id,
      x: (centerX - origin.x) * camera.zoom,
      y: (top - origin.y) * camera.zoom - 6,
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
    const center = gridToWorldAnchor(draft.item.gridX, draft.item.gridY, draft.item.footprint);
    draft.image.setPosition(center.x, center.y).setVisible(true).setFlipX(draft.item.flipped === true).clearTint();
    this.sprites = this.sortSprites();
    this.active = null;
    this.drag = null;
    this.camera.setInteractionLocked(false);
    window.dispatchEvent(new CustomEvent('hook-island-edit-controls', { detail: null }));
  }
}
