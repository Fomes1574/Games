import Phaser from 'phaser';

import { BootScene } from './game/scenes/BootScene';
import './ui/styles/global.css';

export const GAME_VERSION = '0.1.0';

const gameRoot = document.querySelector<HTMLElement>('#game-root');
const buildLabel = document.querySelector<HTMLElement>('#build-label');
const primaryAction = document.querySelector<HTMLButtonElement>('#primary-action');

if (!gameRoot || !buildLabel || !primaryAction) {
  throw new Error('A estrutura principal da aplicação não foi encontrada.');
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameRoot,
  width: 1600,
  height: 900,
  backgroundColor: '#090b10',
  transparent: true,
  render: {
    antialias: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});

buildLabel.textContent = `Versão ${GAME_VERSION} · WebGL com fallback Canvas`;

primaryAction.addEventListener('click', () => {
  primaryAction.textContent = 'A expedição será aberta no próximo marco';
  primaryAction.dataset.acknowledged = 'true';
});

window.addEventListener('error', (event) => {
  buildLabel.textContent = `Falha ao carregar: ${event.message}`;
});

window.addEventListener('unhandledrejection', () => {
  buildLabel.textContent = 'Uma operação inesperada falhou. Recarregue a página.';
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
