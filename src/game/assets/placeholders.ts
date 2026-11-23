import Phaser from 'phaser';
import { COLORS } from '../config';

export const PLACEHOLDER_KEYS = {
  mascot: 'placeholder-mascot',
  tree: 'placeholder-tree',
  landmarkHouse: 'placeholder-landmark-house',
  landmarkPost: 'placeholder-landmark-post',
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

  if (!scene.textures.exists(PLACEHOLDER_KEYS.landmarkHouse)) {
    const house = scene.add.graphics();
    house.fillStyle(0xfff3d0, 1);
    house.fillRoundedRect(12, 30, 72, 48, 12);
    house.fillStyle(0xf08b4f, 1);
    house.fillTriangle(4, 35, 48, 4, 92, 35);
    house.fillStyle(0x9d623c, 1);
    house.fillRoundedRect(40, 50, 18, 28, 7);
    house.fillStyle(0xffffff, 0.8);
    house.fillCircle(26, 51, 7);
    house.generateTexture(PLACEHOLDER_KEYS.landmarkHouse, 96, 88);
    house.destroy();
  }

  if (!scene.textures.exists(PLACEHOLDER_KEYS.landmarkPost)) {
    const post = scene.add.graphics();
    post.fillStyle(0xfff5db, 1);
    post.fillRoundedRect(10, 28, 76, 48, 12);
    post.fillStyle(0x4c9be8, 1);
    post.fillRoundedRect(8, 16, 80, 28, 12);
    post.fillStyle(0xfec845, 1);
    post.fillRoundedRect(34, 45, 28, 12, 5);
    post.fillStyle(0xed4836, 1);
    post.fillRoundedRect(65, 52, 20, 17, 4);
    post.generateTexture(PLACEHOLDER_KEYS.landmarkPost, 96, 84);
    post.destroy();
  }
}
