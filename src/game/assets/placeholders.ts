import Phaser from 'phaser';
import { COLORS } from '../config';

export const PLACEHOLDER_KEYS = {
  mascot: 'placeholder-mascot',
  tree: 'placeholder-tree',
} as const;

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(PLACEHOLDER_KEYS.mascot)) {
    const mascot = scene.add.graphics();
    mascot.fillStyle(COLORS.mascotGold, 1);
    mascot.fillRoundedRect(14, 8, 68, 82, 30);
    mascot.fillStyle(COLORS.mascotBrown, 1);
    mascot.fillCircle(36, 40, 5);
    mascot.fillCircle(60, 40, 5);
    mascot.fillStyle(COLORS.mascotBlue, 1);
    mascot.fillCircle(48, 68, 8);
    mascot.generateTexture(PLACEHOLDER_KEYS.mascot, 96, 96);
    mascot.destroy();
  }

  if (!scene.textures.exists(PLACEHOLDER_KEYS.tree)) {
    const tree = scene.add.graphics();
    tree.fillStyle(0x6e5236, 1);
    tree.fillRoundedRect(28, 40, 12, 34, 5);
    tree.fillStyle(0x8eae61, 1);
    tree.fillCircle(34, 30, 25);
    tree.fillStyle(0xaac77b, 1);
    tree.fillCircle(25, 23, 13);
    tree.generateTexture(PLACEHOLDER_KEYS.tree, 68, 78);
    tree.destroy();
  }
}
