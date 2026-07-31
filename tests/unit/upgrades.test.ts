import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../src/core/rng/SeededRng';
import { getUpgrade } from '../../src/data/content';
import {
  applyUpgrade,
  countOwnedWeapons,
  createUpgradeChoices,
  isUpgradeAvailable,
} from '../../src/domain/upgrades/upgradePool';

describe('melhorias', () => {
  it('só libera uma evolução quando os requisitos existem', () => {
    const evolution = getUpgrade('barbarian-fury');

    expect(isUpgradeAvailable(evolution, { 'executioner-axe': 5 })).toBe(false);
    expect(
      isUpgradeAvailable(evolution, {
        'executioner-axe': 5,
        'runic-plate': 3,
      }),
    ).toBe(true);
    expect(
      isUpgradeAvailable(
        evolution,
        { 'executioner-axe': 5, 'runic-plate': 3 },
        { evolutionsUnlocked: false },
      ),
    ).toBe(false);
  });

  it('nunca oferece melhoria maximizada', () => {
    const levels = {
      'executioner-axe': 5,
      'watch-crossbow': 5,
      'celestial-aura': 5,
    } as const;
    const choices = createUpgradeChoices(levels, new SeededRng(12), 6);

    expect(choices.map((choice) => choice.id)).not.toContain('executioner-axe');
    expect(choices.map((choice) => choice.id)).not.toContain('watch-crossbow');
    expect(choices.map((choice) => choice.id)).not.toContain('celestial-aura');
  });

  it('aplica um nível imutavelmente', () => {
    const previous = { 'executioner-axe': 1 } as const;
    const next = applyUpgrade(previous, 'executioner-axe');

    expect(previous['executioner-axe']).toBe(1);
    expect(next['executioner-axe']).toBe(2);
  });

  it('limita a build a quatro armas sem bloquear níveis existentes', () => {
    const levels = {
      'executioner-axe': 2,
      'watch-crossbow': 1,
      'celestial-aura': 1,
      'widow-venom': 1,
    } as const;

    expect(countOwnedWeapons(levels)).toBe(4);
    expect(isUpgradeAvailable(getUpgrade('spear'), levels)).toBe(false);
    expect(isUpgradeAvailable(getUpgrade('executioner-axe'), levels)).toBe(true);
  });

  it('permite dois níveis após a transformação', () => {
    const evolution = getUpgrade('divine-aura');
    const requirements = {
      'celestial-aura': 5,
      'fallen-vigor': 3,
    } as const;

    expect(isUpgradeAvailable(evolution, requirements)).toBe(true);
    expect(isUpgradeAvailable(evolution, { ...requirements, 'divine-aura': 2 })).toBe(
      true,
    );
    expect(isUpgradeAvailable(evolution, { ...requirements, 'divine-aura': 3 })).toBe(
      false,
    );
  });

  it('usa combinações coerentes nas armas revisadas', () => {
    expect(getUpgrade('piercing-oath').requires?.passive).toBe('quick-hands');
    expect(getUpgrade('black-widow').requires?.passive).toBe('persistence');
    expect(getUpgrade('impaler').requires?.passive).toBe('long-sight');
  });

  it('reserva uma sinergia relacionada quando a proteção contra azar ativa', () => {
    const choices = createUpgradeChoices(
      { 'watch-crossbow': 3 },
      new SeededRng(1574),
      3,
      { guaranteeSynergy: true },
    );
    expect(choices.map((choice) => choice.id)).toContain('quick-hands');
  });
});
