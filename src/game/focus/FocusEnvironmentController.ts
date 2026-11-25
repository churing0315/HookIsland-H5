import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { FOCUS_ENVIRONMENT, FOCUS_RING, FOCUS_TEXTURES, shouldReduceFocusMotion } from './focusConfig';

const GLINT_COLORS = [0x2cffe9, 0x74f4ff, 0x53e1ff] as const;
const GLINT_FLATTEN = 0.45;
const MIN_ACTIVE_GLINTS = 4;
// A square rotated 45° and compressed along the screen's vertical axis.
const GLINT_POINTS = [0.5, 0, 1, GLINT_FLATTEN / 2, 0.5, GLINT_FLATTEN, 0, GLINT_FLATTEN / 2];

export class FocusEnvironmentController {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly tweens: Array<Phaser.Tweens.Tween | Phaser.Tweens.TweenChain> = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly reducedMotion: boolean;
  private activeGlints = 0;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
  ) {
    this.reducedMotion = shouldReduceFocusMotion();
    this.layer = scene.add.container(0, 0);
    parent.add(this.layer);
    this.createWaves();
    this.createFishSchools();
    this.createClouds();
    this.createGlints();
    this.createBubbles();
    this.createSeagulls();
  }

  setPaused(paused: boolean): void {
    for (const tween of this.tweens) {
      if (paused) tween.pause();
      else tween.resume();
    }
    for (const timer of this.timers) timer.paused = paused;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const timer of this.timers) timer.remove(false);
    for (const tween of this.tweens) tween.stop();
    this.timers.length = 0;
    this.tweens.length = 0;
    this.layer.destroy(true);
  }

  private rememberTween(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
    if (this.reducedMotion) return;
    this.tweens.push(this.scene.tweens.add(config));
  }

  private createWaves(): void {
    const left = this.scene.add.image(150, 139, FOCUS_TEXTURES.wave1).setScale(0.46, 0.52).setAlpha(0.34);
    const right = this.scene.add.image(664, 252, FOCUS_TEXTURES.wave2).setScale(0.54, 0.58).setAlpha(0.4);
    this.layer.add([left, right]);
    this.rememberTween({
      targets: left,
      x: left.x + 8,
      y: left.y + 4,
      alpha: 0.48,
      duration: FOCUS_ENVIRONMENT.waveDurationMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.rememberTween({
      targets: right,
      x: right.x - 7,
      y: right.y - 4,
      alpha: 0.52,
      duration: FOCUS_ENVIRONMENT.waveDurationMs + 1_400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private createFishSchools(): void {
    this.createFishSchool(66, 70, 1, 0);
    this.createFishSchool(706, 310, -1, 3_800);
  }

  private createFishSchool(x: number, y: number, direction: 1 | -1, delay: number): void {
    const school = this.scene.add.container(x, y).setAlpha(0.32);
    this.layer.add(school);
    const layout = [
      { x: 0, y: 0, scale: 0.32, texture: FOCUS_TEXTURES.fish1 },
      { x: 34, y: 14, scale: 0.42, texture: FOCUS_TEXTURES.fish2 },
      { x: 72, y: -5, scale: 0.27, texture: FOCUS_TEXTURES.fish1 },
      { x: 104, y: 22, scale: 0.36, texture: FOCUS_TEXTURES.fish2 },
      { x: 132, y: 5, scale: 0.24, texture: FOCUS_TEXTURES.fish1 },
    ];
    for (const fish of layout) {
      school.add(
        this.scene.add
          .image(fish.x, fish.y, fish.texture)
          .setScale(fish.scale * direction, fish.scale)
          .setAlpha(0.55 + fish.scale * 0.55),
      );
    }
    this.rememberTween({
      targets: school,
      x: school.x + 34 * direction,
      y: school.y + 18,
      duration: FOCUS_ENVIRONMENT.fishDurationMs,
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private createClouds(): void {
    const left = this.scene.add.image(82, 292, FOCUS_TEXTURES.cloud).setScale(0.42).setAlpha(this.reducedMotion ? 0.7 : 0);
    const right = this.scene.add.image(724, 185, FOCUS_TEXTURES.cloud).setScale(0.36).setAlpha(this.reducedMotion ? 0.7 : 0);
    this.layer.add([left, right]);
    this.rememberTween({
      targets: left,
      x: left.x + 52,
      alpha: { from: 0, to: 1 },
      duration: FOCUS_ENVIRONMENT.cloudDurationMs / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.rememberTween({
      targets: right,
      x: right.x - 48,
      alpha: { from: 0, to: 1 },
      duration: (FOCUS_ENVIRONMENT.cloudDurationMs + 3_000) / 2,
      delay: 4_000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  private createGlints(): void {
    for (let index = 0; index < FOCUS_ENVIRONMENT.glintCount; index += 1) {
      const glint = this.scene.add.polygon(0, 0, GLINT_POINTS, GLINT_COLORS[0], 1).setVisible(false);
      this.layer.add(glint);
      if (this.reducedMotion) {
        this.configureGlint(glint, 0.3);
        continue;
      }
      if (index < MIN_ACTIVE_GLINTS) this.runGlintLifecycle(glint);
      else this.scheduleGlint(Phaser.Math.Between(0, 1_500), () => this.runGlintLifecycle(glint));
    }
  }

  private configureGlint(glint: Phaser.GameObjects.Polygon, alpha: number): { size: number; peakAlpha: number } {
    const size = Phaser.Math.Between(16, 50);
    const halfWidth = Math.ceil(size / 2);
    const halfHeight = Math.ceil(halfWidth * GLINT_FLATTEN);
    const y = Phaser.Math.Between(Math.ceil(GAME_HEIGHT / 2) + halfHeight, GAME_HEIGHT - halfHeight);
    const quietZone = FOCUS_RING.outerRadius + FOCUS_RING.ringWidth / 2 + halfWidth;
    const onLeft = Math.random() < 0.5;
    const x = onLeft
      ? Phaser.Math.Between(halfWidth, FOCUS_RING.centerX - quietZone)
      : Phaser.Math.Between(FOCUS_RING.centerX + quietZone, GAME_WIDTH - halfWidth);
    const color = Phaser.Utils.Array.GetRandom([...GLINT_COLORS]);
    const peakAlpha = Phaser.Math.Between(25, 55) / 100;
    glint
      .setPosition(x, y)
      .setFillStyle(color, 1)
      .setScale(Math.max(16, size * 0.95))
      .setAlpha(alpha)
      .setVisible(true);
    return { size, peakAlpha };
  }

  private runGlintLifecycle(glint: Phaser.GameObjects.Polygon): void {
    if (this.destroyed) return;
    const { size, peakAlpha } = this.configureGlint(glint, 0);
    const holdMs = Phaser.Math.Between(1_000, 3_000);
    const fadeInSize = Math.max(16, size * 0.96);
    const holdSize = Math.max(16, size * 0.99);
    this.activeGlints += 1;
    let chain: Phaser.Tweens.TweenChain;
    chain = this.scene.tweens.chain({
      targets: glint,
      tweens: [
        {
          alpha: peakAlpha,
          scaleX: fadeInSize,
          scaleY: fadeInSize,
          duration: 800,
          ease: 'Sine.InOut',
        },
        {
          alpha: peakAlpha * 0.94,
          scaleX: holdSize,
          scaleY: holdSize,
          duration: holdMs / 2,
          yoyo: true,
          ease: 'Sine.InOut',
        },
        {
          alpha: 0,
          scaleX: size,
          scaleY: size,
          duration: 800,
          ease: 'Sine.InOut',
        },
      ],
      onComplete: () => {
        glint.setVisible(false);
        this.removeTween(chain);
        this.activeGlints = Math.max(0, this.activeGlints - 1);
        if (this.destroyed) return;
        if (this.activeGlints < MIN_ACTIVE_GLINTS) this.runGlintLifecycle(glint);
        else this.scheduleGlint(Phaser.Math.Between(0, 1_500), () => this.runGlintLifecycle(glint));
      },
    });
    this.tweens.push(chain);
  }

  private scheduleGlint(delay: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.scene.time.delayedCall(delay, () => {
      const index = this.timers.indexOf(timer);
      if (index >= 0) this.timers.splice(index, 1);
      callback();
    });
    this.timers.push(timer);
  }

  private removeTween(tween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain): void {
    const index = this.tweens.indexOf(tween);
    if (index >= 0) this.tweens.splice(index, 1);
  }

  private createBubbles(): void {
    for (let index = 0; index < FOCUS_ENVIRONMENT.bubbleCount; index += 1) {
      const onLeft = index % 2 === 0;
      const x = onLeft ? 72 + ((index * 47) % 210) : 548 + ((index * 53) % 210);
      const y = 230 + ((index * 29) % 125);
      const bubble = this.scene.add.circle(x, y, 2 + (index % 4), 0xffffff, 0.36).setAlpha(this.reducedMotion ? 0.28 : 0.12);
      this.layer.add(bubble);
      this.rememberTween({
        targets: bubble,
        y: y - 18 - (index % 3) * 7,
        alpha: { from: 0.12, to: 0.58 },
        duration: 4_200 + (index % 4) * 620,
        delay: index * 360,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private createSeagulls(): void {
    const flock = this.scene.add.container(-95, 188).setAlpha(1);
    flock.add([
      this.scene.add.image(0, 6, FOCUS_TEXTURES.seagull).setScale(0.25),
      this.scene.add.image(42, -8, FOCUS_TEXTURES.seagull).setScale(0.34),
      this.scene.add.image(84, 9, FOCUS_TEXTURES.seagull).setScale(0.21),
    ]);
    this.layer.add(flock);
    if (this.reducedMotion) {
      flock.setPosition(104, 162);
      return;
    }
    const fly = (): void => {
      if (this.destroyed) return;
      flock.setPosition(-95, 188).setAlpha(1);
      const tween = this.scene.tweens.add({
        targets: flock,
        x: 300,
        y: -86,
        duration: FOCUS_ENVIRONMENT.seagullDurationMs,
        ease: 'Sine.InOut',
        onComplete: () => {
          if (this.destroyed) return;
          const timer = this.scene.time.delayedCall(FOCUS_ENVIRONMENT.seagullGapMs, fly);
          this.timers.push(timer);
        },
      });
      this.tweens.push(tween);
    };
    const start = this.scene.time.delayedCall(1_500, fly);
    this.timers.push(start);
  }
}
