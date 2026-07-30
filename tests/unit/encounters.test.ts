import { describe, expect, it } from 'vitest';

import {
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

  it('reduz o surgimento ambiente durante formações e antes do chefe', () => {
    expect(ambientSpawnMultiplier(30.5)).toBe(0.25);
    expect(ambientSpawnMultiplier(242)).toBe(0.3);
    expect(ambientSpawnMultiplier(120)).toBe(1);
  });
});
