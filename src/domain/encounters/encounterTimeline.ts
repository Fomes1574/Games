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
    at: 135,
    enemy: 'armored-penitent',
    count: 12,
    formation: 'line',
    formationIndex: 2,
  },
  { at: 135.4, enemy: 'crawler', count: 22, formation: 'line', formationIndex: 2 },
  { at: 165, enemy: 'crawler', count: 28, formation: 'column', formationIndex: 1 },
  {
    at: 165.6,
    enemy: 'ruin-herald',
    count: 2,
    formation: 'column',
    formationIndex: 1,
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
  { at: 225, enemy: 'runner', count: 8, formation: 'line', formationIndex: 0 },
  { at: 226, enemy: 'crawler', count: 12, formation: 'line', formationIndex: 1 },
  { at: 227, enemy: 'runner', count: 8, formation: 'line', formationIndex: 2 },
  { at: 228, enemy: 'crawler', count: 12, formation: 'line', formationIndex: 3 },
] as const;

export function encounterWavesBetween(
  previousSeconds: number,
  elapsedSeconds: number,
): readonly EncounterWave[] {
  if (elapsedSeconds < previousSeconds) {
    return [];
  }
  return ENCOUNTER_TIMELINE.filter(
    (wave) => wave.at > previousSeconds && wave.at <= elapsedSeconds,
  );
}

export function ambientSpawnMultiplier(elapsedSeconds: number): number {
  const activeWave = ENCOUNTER_TIMELINE.some(
    (wave) => elapsedSeconds >= wave.at && elapsedSeconds < wave.at + 1.2,
  );
  if (activeWave) {
    return 0.25;
  }
  if (elapsedSeconds >= 240 && elapsedSeconds < 255) {
    return 0.3;
  }
  return 1;
}
