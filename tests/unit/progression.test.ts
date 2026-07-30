import { describe, expect, it } from 'vitest';

import {
  addExperience,
  experienceRequired,
} from '../../src/domain/progression/experience';

describe('progressão de experiência', () => {
  it('cresce o requisito a cada nível', () => {
    expect(experienceRequired(2)).toBeGreaterThan(experienceRequired(1));
    expect(experienceRequired(10)).toBeGreaterThan(experienceRequired(5));
  });

  it('processa vários níveis sem perder experiência restante', () => {
    const result = addExperience(1, 0, 500);

    expect(result.levelsGained).toBeGreaterThan(1);
    expect(result.level).toBe(1 + result.levelsGained);
    expect(result.experience).toBeGreaterThanOrEqual(0);
    expect(result.experience).toBeLessThan(result.experienceForNext);
  });
});
