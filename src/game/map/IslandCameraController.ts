import Phaser from 'phaser';
import { DEMO_ZOOM, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { MapStage } from '../types';
import { getMapWorldBounds } from './mapConfig';

type PointerState = { x: number; y: number };

export class IslandCameraController {
  private enabled = false;
  private interactionLocked = false;
  private stage: MapStage = 0;
  private placementMode = false;
  private homeZoom = 1;
  private minZoom = 0.48;
  private readonly maxZoom = 1.6;
  private pointers = new Map<number, PointerState>();
  private pinchDistance: number | null = null;
  private pinchZoom = 1;
  private pinchCenter: PointerState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.onPointerCancel);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
    window.addEventListener('hook-island-camera', this.onCommand);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onPointerCancel);
    this.scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.onWheel);
    window.removeEventListener('hook-island-camera', this.onCommand);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.resetGesture();
  }

  setInteractionLocked(locked: boolean): void {
    this.interactionLocked = locked;
    if (locked) this.resetGesture();
  }

  fitStage(stage: MapStage, useDemoZoom = true, placementMode = this.placementMode): void {
    this.stage = stage;
    this.placementMode = placementMode;
    const bounds = getMapWorldBounds(stage);
    const safeWidth = GAME_WIDTH - 176;
    const safeHeight = placementMode ? 203 : GAME_HEIGHT - 70;
    this.minZoom = placementMode ? 0.25 : stage === 2 ? 0.48 : 0.56;
    this.homeZoom = Phaser.Math.Clamp(
      Math.min(safeWidth / bounds.width, safeHeight / bounds.height),
      this.minZoom,
      1.08,
    );
    this.camera.removeBounds();
    this.camera.setZoom(useDemoZoom && DEMO_ZOOM ? DEMO_ZOOM : this.homeZoom);
    this.camera.centerOn(bounds.centerX, bounds.centerY + this.placementOffsetY());
    this.clampToBounds();
  }

  reset(): void {
    this.fitStage(this.stage, false);
  }

  zoomBy(factor: number, screenX = GAME_WIDTH / 2, screenY = GAME_HEIGHT / 2): void {
    this.zoomAt(screenX, screenY, this.camera.zoom * factor);
  }

  screenToWorld(screenX: number, screenY: number): Phaser.Math.Vector2 {
    return this.camera.getWorldPoint(screenX, screenY);
  }

  private readonly onCommand = (event: Event): void => {
    if (!this.enabled) return;
    const action = (event as CustomEvent<string>).detail;
    if (action === 'zoom-in') this.zoomBy(1.18);
    if (action === 'zoom-out') this.zoomBy(0.84);
    if (action === 'reset') this.reset();
  };

  private readonly onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.enabled || this.interactionLocked) return;
    this.pointers.set(pointer.id, { x: pointer.x, y: pointer.y });
    if (this.pointers.size >= 2) this.startPinch();
  };

  private readonly onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.enabled || this.interactionLocked || !pointer.isDown || !this.pointers.has(pointer.id)) return;
    const previous = this.pointers.get(pointer.id)!;
    this.pointers.set(pointer.id, { x: pointer.x, y: pointer.y });

    if (this.pointers.size >= 2) {
      const pair = [...this.pointers.values()].slice(0, 2);
      const distance = Phaser.Math.Distance.Between(pair[0].x, pair[0].y, pair[1].x, pair[1].y);
      const center = { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 };
      if (this.pinchDistance && this.pinchCenter) {
        this.camera.scrollX -= (center.x - this.pinchCenter.x) / this.camera.zoom;
        this.camera.scrollY -= (center.y - this.pinchCenter.y) / this.camera.zoom;
        this.zoomAt(center.x, center.y, this.pinchZoom * (distance / this.pinchDistance));
      }
      this.pinchCenter = center;
      return;
    }

    this.camera.scrollX -= (pointer.x - previous.x) / this.camera.zoom;
    this.camera.scrollY -= (pointer.y - previous.y) / this.camera.zoom;
    this.clampToBounds();
  };

  private readonly onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    this.pointers.delete(pointer.id);
    if (this.pointers.size < 2) {
      this.pinchDistance = null;
      this.pinchCenter = null;
    }
  };

  private readonly onPointerCancel = (): void => {
    this.resetGesture();
  };

  private readonly onWheel = (
    pointer: Phaser.Input.Pointer,
    _objects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    if (!this.enabled || this.interactionLocked) return;
    this.zoomAt(pointer.x, pointer.y, this.camera.zoom * (deltaY > 0 ? 0.9 : 1.1));
  };

  private startPinch(): void {
    const pair = [...this.pointers.values()].slice(0, 2);
    this.pinchDistance = Phaser.Math.Distance.Between(pair[0].x, pair[0].y, pair[1].x, pair[1].y);
    this.pinchZoom = this.camera.zoom;
    this.pinchCenter = { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 };
  }

  private zoomAt(screenX: number, screenY: number, requestedZoom: number): void {
    const before = this.camera.getWorldPoint(screenX, screenY);
    this.camera.setZoom(Phaser.Math.Clamp(requestedZoom, this.minZoom, this.maxZoom));
    const after = this.camera.getWorldPoint(screenX, screenY);
    this.camera.scrollX += before.x - after.x;
    this.camera.scrollY += before.y - after.y;
    this.clampToBounds();
  }

  private clampToBounds(): void {
    const bounds = getMapWorldBounds(this.stage);
    const viewWidth = GAME_WIDTH / this.camera.zoom;
    const viewHeight = GAME_HEIGHT / this.camera.zoom;
    const currentCenterX = this.camera.scrollX + GAME_WIDTH / 2;
    const offsetY = this.placementOffsetY();
    const currentCenterY = this.camera.scrollY + GAME_HEIGHT / 2 - offsetY;
    const centerX =
      viewWidth >= bounds.width
        ? bounds.centerX
        : Phaser.Math.Clamp(currentCenterX, bounds.left + viewWidth / 2, bounds.right - viewWidth / 2);
    const centerY =
      viewHeight >= bounds.height
        ? bounds.centerY
        : Phaser.Math.Clamp(currentCenterY, bounds.top + viewHeight / 2, bounds.bottom - viewHeight / 2);
    this.camera.centerOn(centerX, centerY + offsetY);
  }

  private placementOffsetY(): number {
    return this.placementMode ? (GAME_HEIGHT / 2 - 168) / this.camera.zoom : 0;
  }

  private resetGesture(): void {
    this.pointers.clear();
    this.pinchDistance = null;
    this.pinchCenter = null;
  }
}
