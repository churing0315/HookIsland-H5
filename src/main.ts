import Phaser from 'phaser';
import './styles.css';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config';
import { AppUI } from './game/ui/AppUI';
import { GameFlow } from './game/state/GameFlow';
import { PrototypeScene } from './game/scenes/PrototypeScene';

const flow = new GameFlow();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#C3D8EC',
  transparent: false,
  antialias: true,
  render: {
    pixelArt: false,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    activePointers: 3,
  },
  scene: [PrototypeScene],
  callbacks: {
    preBoot: (instance) => {
      instance.registry.set('flow', flow);
    },
  },
});

const uiRoot = document.querySelector<HTMLElement>('#game-ui');
if (!uiRoot) {
  throw new Error('Missing #game-ui root');
}

const appUI = new AppUI(uiRoot, flow);
appUI.mount();

window.addEventListener('beforeunload', () => {
  appUI.destroy();
  flow.destroy();
  game.destroy(true);
});
