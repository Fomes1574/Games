import type { UpgradeId } from '../data/content';
import type { GameSnapshot } from '../game/events';
import type { ExpeditionScene } from '../game/scenes/ExpeditionScene';

export interface GameTestApi {
  startRun(seed?: number): void;
  getState(): GameSnapshot | { scene: 'menu' };
  chooseUpgrade(id: UpgradeId): void;
  spawnBoss(): void;
  setElapsedSeconds(seconds: number): void;
  grantExperience(amount: number): void;
  forceVictory(): void;
  forceDefeat(): void;
}

declare global {
  interface Window {
    __GAME_TEST_API__?: GameTestApi;
  }
}

export function installGameTestApi(
  getScene: () => ExpeditionScene | undefined,
  startRun: (seed?: number) => void,
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  window.__GAME_TEST_API__ = {
    startRun,
    getState: () => getScene()?.getSnapshot() ?? { scene: 'menu' },
    chooseUpgrade: (id) => getScene()?.chooseUpgrade(id),
    spawnBoss: () => getScene()?.debugSpawnBoss(),
    setElapsedSeconds: (seconds) => getScene()?.debugSetElapsedSeconds(seconds),
    grantExperience: (amount) => getScene()?.debugGrantExperience(amount),
    forceVictory: () => getScene()?.debugVictory(),
    forceDefeat: () => getScene()?.debugDefeat(),
  };
}
