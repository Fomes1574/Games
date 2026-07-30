import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../src/core/rng/SeededRng';
import { getUpgrade } from '../../src/data/content';
import {
  applyUpgrade,
  createUpgradeChoices,
  isUpgradeAvailable,
} from '../../src/domain/upgrades/upgradePool';

describe('melhorias', () => {
  it('só libera uma evolução quando os requisitos existem', () => {
    const evolution = getUpgrade('carnage-wheel');

    expect(isUpgradeAvailable(evolution, { 'executioner-axe': 3 })).toBe(false);
    expect(
      isUpgradeAvailable(evolution, {
        'executioner-axe': 3,
        'runic-plate': 1,
      }),
    ).toBe(true);
  });

  it('nunca oferece melhoria maximizada', () => {
    const levels = {
      'executioner-axe': 5,
      'watch-crossbow': 5,
      'funeral-bell': 5,
    } as const;
    const choices = createUpgradeChoices(levels, new SeededRng(12), 6);

    expect(choices.map((choice) => choice.id)).not.toContain('executioner-axe');
    expect(choices.map((choice) => choice.id)).not.toContain('watch-crossbow');
    expect(choices.map((choice) => choice.id)).not.toContain('funeral-bell');
  });

  it('aplica um nível imutavelmente', () => {
    const previous = { 'executioner-axe': 1 } as const;
    const next = applyUpgrade(previous, 'executioner-axe');

    expect(previous['executioner-axe']).toBe(1);
    expect(next['executioner-axe']).toBe(2);
  });
});
