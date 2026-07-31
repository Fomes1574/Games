import type { UpgradeDefinition, UpgradeId } from '../data/content';
import type { CodexEntryId } from '../domain/codex/codex';
import type { ThreatLevel } from '../domain/encounters/threat';

export const GAME_EVENTS = {
  hud: 'ultima-companhia:hud',
  upgrade: 'ultima-companhia:upgrade',
  result: 'ultima-companhia:result',
  death: 'ultima-companhia:death',
  pause: 'ultima-companhia:pause',
  input: 'ultima-companhia:input',
  discovery: 'ultima-companhia:discovery',
} as const;

export interface HudDetail {
  health: number;
  maximumHealth: number;
  armor: number;
  experience: number;
  experienceForNext: number;
  level: number;
  elapsedSeconds: number;
  durationSeconds: number;
  enemies: number;
  kills: number;
  bossHealth: number | null;
  bossMaximumHealth: number | null;
  weapons: string[];
}

export interface UpgradeDetail {
  choices: UpgradeDefinition[];
  pendingLevels: number;
  levels: Partial<Record<UpgradeId, number>>;
  rerolls: number;
  banishes: number;
}

export interface DiscoveryDetail {
  discovered: CodexEntryId[];
  mastered: CodexEntryId[];
}

export interface ResultDetail {
  outcome: 'victory' | 'defeat';
  elapsedSeconds: number;
  kills: number;
  level: number;
  embers: number;
  seed: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  threatLevel: ThreatLevel;
  killsByEnemy: Record<string, number>;
  mapId: string;
}

export interface GameSnapshot extends HudDetail {
  scene: 'expedition';
  inputMode: 'keyboard' | 'gamepad' | 'touch';
  seed: number;
  playerPosition: {
    x: number;
    y: number;
  };
  parallaxOffset: {
    x: number;
    y: number;
  };
  playerVisual: {
    rotation: number;
    scaleX: number;
    scaleY: number;
    alpha: number;
  };
  phase: 'active' | 'dying' | 'ended';
  awaitingUpgrade: boolean;
  paused: boolean;
  ended: boolean;
  upgrades: Partial<Record<UpgradeId, number>>;
  threatLevel: ThreatLevel;
  resurrectionAvailable: boolean;
  rerolls: number;
  banishes: number;
}

export function dispatchGameEvent(name: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
