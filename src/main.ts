import Phaser from 'phaser';

import { BootScene } from './game/scenes/BootScene';
import { ExpeditionScene } from './game/scenes/ExpeditionScene';
import { installGameTestApi } from './test-api/GameTestApi';
import { AppController } from './ui/AppController';
import './ui/styles/global.css';

export const GAME_VERSION = '0.5.0';

const gameRoot = document.querySelector<HTMLElement>('#game-root');
if (!gameRoot) {
  throw new Error('A raiz do jogo não foi encontrada.');
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameRoot,
  width: 1600,
  height: 900,
  backgroundColor: '#090b10',
  transparent: false,
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, ExpeditionScene],
});

const controller = new AppController(game, GAME_VERSION);

void controller
  .initialize()
  .then(() => {
    installGameTestApi(
      () => controller.getExpeditionScene(),
      (seed) => controller.startRun(seed),
    );
  })
  .catch((error: unknown) => controller.showError(error));

window.addEventListener('error', (event) => controller.showError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => controller.showError(event.reason));

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
