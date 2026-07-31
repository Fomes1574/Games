import { describe, expect, it } from 'vitest';

import {
  ambientEnemyForRoll,
  ambientSpawnMultiplier,
  encounterWavesBetween,
  ENCOUNTER_TIMELINE,
} from '../../src/domain/encounters/encounterTimeline';

describe('cronograma de encontros', () => {
  it('aciona as ondas somente quando o relógio atravessa o horário', () => {
    expect(encounterWavesBetween(29.9, 30)).toEqual([ENCOUNTER_TIMELINE[0]]);
    expect(encounterWavesBetween(30, 31)).toEqual([]);
    expect(encounterWavesBetween(32, 32.5).map((wave) => wave.at)).toEqual([32.4]);
    expect(encounterWavesBetween(40, 30)).toEqual([]);
  });

  it('mantém horários ordenados e o chefe fora do cronograma comum', () => {
    const times = ENCOUNTER_TIMELINE.map((wave) => wave.at);
    expect(times).toEqual([...times].sort((left, right) => left - right));
    expect(ENCOUNTER_TIMELINE.some((wave) => wave.enemy === 'plague-bishop')).toBe(
      false,
    );
  });

  it('só libera funções novas na Ameaça prevista', () => {
    expect(encounterWavesBetween(119.9, 120, 1)).toEqual([]);
    expect(encounterWavesBetween(119.9, 120, 2).map((wave) => wave.enemy)).toEqual([
      'sepulchral-guardian',
    ]);
    expect(encounterWavesBetween(241.9, 242, 6)).toEqual([]);
    expect(encounterWavesBetween(241.9, 242, 7).map((wave) => wave.enemy)).toEqual([
      'mist-hunter',
    ]);
  });

  it('reduz o surgimento ambiente durante formações e antes do chefe', () => {
    expect(ambientSpawnMultiplier(30.5)).toBe(0.25);
    expect(ambientSpawnMultiplier(242)).toBe(0.3);
    expect(ambientSpawnMultiplier(120)).toBe(1);
  });

  it('preserva exatamente a composição ambiente da Ameaça I', () => {
    expect(ambientEnemyForRoll(200, 0.034, 1, 0)).toBe('ruin-herald');
    expect(ambientEnemyForRoll(200, 0.04, 1, 0)).toBe('armored-penitent');
    expect(ambientEnemyForRoll(200, 0.2, 1, 0)).toBe('cultist');
    expect(ambientEnemyForRoll(200, 0.4, 1, 0)).toBe('runner');
    expect(ambientEnemyForRoll(200, 0.7, 1, 0)).toBe('crawler');
  });

  it('adiciona inimigos especiais sem deslocar a tabela ambiente base', () => {
    expect(ambientEnemyForRoll(200, 0.7, 2, 0.1)).toBe(
      'sepulchral-guardian',
    );
    expect(ambientEnemyForRoll(200, 0.04, 7, 0.5)).toBe(
      'armored-penitent',
    );
  });
});
