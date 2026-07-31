import type { EnemyId } from '../../data/content';

export type EncounterFormation =
  | 'arc'
  | 'ring'
  | 'line'
  | 'opposite-line'
  | 'cardinal'
  | 'column';

export interface EncounterWave {
  at: number;
  enemy: EnemyId;
  count: number;
  formation: EncounterFormation;
  formationIndex?: number;
  minimumThreat?: number;
}

export const ENCOUNTER_TIMELINE: readonly EncounterWave[] = [
  { at: 30, enemy: 'crawler', count: 12, formation: 'arc', formationIndex: 0 },
  { at: 31.2, enemy: 'crawler', count: 12, formation: 'arc', formationIndex: 1 },
  { at: 32.4, enemy: 'crawler', count: 12, formation: 'arc', formationIndex: 2 },
  { at: 33.6, enemy: 'crawler', count: 12, formation: 'arc', formationIndex: 3 },
  { at: 60, enemy: 'cultist', count: 10, formation: 'line', formationIndex: 0 },
  { at: 90, enemy: 'runner', count: 6, formation: 'cardinal', formationIndex: 0 },
  { at: 91, enemy: 'runner', count: 6, formation: 'cardinal', formationIndex: 1 },
  { at: 92, enemy: 'runner', count: 6, formation: 'cardinal', formationIndex: 2 },
  { at: 93, enemy: 'runner', count: 6, formation: 'cardinal', formationIndex: 3 },
  {
    at: 105,
    enemy: 'corrupted-executioner',
    count: 1,
    formation: 'ring',
  },
  { at: 105.4, enemy: 'crawler', count: 10, formation: 'arc', formationIndex: 1 },
  {
    at: 120,
    enemy: 'sepulchral-guardian',
    count: 4,
    formation: 'line',
    formationIndex: 1,
    minimumThreat: 2,
  },
  {
    at: 135,
    enemy: 'armored-penitent',
    count: 12,
    formation: 'line',
    formationIndex: 2,
  },
  { at: 135.4, enemy: 'crawler', count: 22, formation: 'line', formationIndex: 2 },
  {
    at: 150,
    enemy: 'plague-sower',
    count: 4,
    formation: 'arc',
    formationIndex: 3,
    minimumThreat: 3,
  },
  { at: 165, enemy: 'crawler', count: 28, formation: 'column', formationIndex: 1 },
  {
    at: 165.6,
    enemy: 'ruin-herald',
    count: 2,
    formation: 'column',
    formationIndex: 1,
  },
  {
    at: 180,
    enemy: 'ash-summoner',
    count: 3,
    formation: 'ring',
    minimumThreat: 4,
  },
  { at: 195, enemy: 'cultist', count: 8, formation: 'line', formationIndex: 0 },
  {
    at: 195.4,
    enemy: 'cultist',
    count: 8,
    formation: 'opposite-line',
    formationIndex: 0,
  },
  {
    at: 205,
    enemy: 'corrupted-executioner',
    count: 1,
    formation: 'ring',
    formationIndex: 2,
  },
  {
    at: 205.3,
    enemy: 'armored-penitent',
    count: 6,
    formation: 'arc',
    formationIndex: 2,
  },
  { at: 205.8, enemy: 'crawler', count: 16, formation: 'arc', formationIndex: 2 },
  {
    at: 210,
    enemy: 'shattered',
    count: 10,
    formation: 'column',
    formationIndex: 2,
    minimumThreat: 5,
  },
  { at: 225, enemy: 'runner', count: 8, formation: 'line', formationIndex: 0 },
  { at: 226, enemy: 'crawler', count: 12, formation: 'line', formationIndex: 1 },
  { at: 227, enemy: 'runner', count: 8, formation: 'line', formationIndex: 2 },
  { at: 228, enemy: 'crawler', count: 12, formation: 'line', formationIndex: 3 },
  {
    at: 235,
    enemy: 'pale-priest',
    count: 3,
    formation: 'opposite-line',
    minimumThreat: 6,
  },
  {
    at: 242,
    enemy: 'mist-hunter',
    count: 6,
    formation: 'cardinal',
    minimumThreat: 7,
  },
] as const;

export function encounterWavesBetween(
  previousSeconds: number,
  elapsedSeconds: number,
  threatLevel = 1,
): readonly EncounterWave[] {
  if (elapsedSeconds < previousSeconds) {
    return [];
  }
  return ENCOUNTER_TIMELINE.filter(
    (wave) =>
      wave.at > previousSeconds &&
      wave.at <= elapsedSeconds &&
      (wave.minimumThreat ?? 1) <= threatLevel,
  );
}

export function ambientSpawnMultiplier(elapsedSeconds: number, threatLevel = 1): number {
  if (elapsedSeconds >= 240 && elapsedSeconds < 255) {
    return 0.3;
  }
  const activeWave = ENCOUNTER_TIMELINE.some(
    (wave) =>
      (wave.minimumThreat ?? 1) <= threatLevel &&
      elapsedSeconds >= wave.at &&
      elapsedSeconds < wave.at + 1.2,
  );
  if (activeWave) {
    return 0.25;
  }
  return 1;
}

export function ambientEnemyForRoll(
  elapsedSeconds: number,
  roll: number,
  threatLevel = 1,
  specialRoll = 1,
): EnemyId {
  if (threatLevel >= 7 && elapsedSeconds > 180 && specialRoll < 0.018) {
    return 'mist-hunter';
  }
  if (threatLevel >= 6 && elapsedSeconds > 170 && specialRoll < 0.036) {
    return 'pale-priest';
  }
  if (threatLevel >= 5 && elapsedSeconds > 150 && specialRoll < 0.06) {
    return 'shattered';
  }
  if (threatLevel >= 4 && elapsedSeconds > 140 && specialRoll < 0.075) {
    return 'ash-summoner';
  }
  if (threatLevel >= 3 && elapsedSeconds > 120 && specialRoll < 0.095) {
    return 'plague-sower';
  }
  if (threatLevel >= 2 && elapsedSeconds > 100 && specialRoll < 0.12) {
    return 'sepulchral-guardian';
  }

  if (elapsedSeconds > 165 && roll < 0.035) {
    return 'ruin-herald';
  }
  if (elapsedSeconds > 125 && roll < 0.13) {
    return 'armored-penitent';
  }
  if (elapsedSeconds > 90 && roll < 0.29) {
    return 'cultist';
  }
  if (elapsedSeconds > 35 && roll < 0.52) {
    return 'runner';
  }
  return 'crawler';
}
