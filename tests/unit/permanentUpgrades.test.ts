import { describe, expect, it } from 'vitest';

import {
  createEmptyPermanentUpgradeLevels,
  nextPermanentUpgradeCost,
  permanentBonuses,
  purchasePermanentUpgrade,
} from '../../src/domain/progression/permanentUpgrades';

describe('melhorias permanentes', () => {
  it('mantém os limites e valores aprovados de Vida e Dano', () => {
    const levels = createEmptyPermanentUpgradeLevels();
    levels.health = 10;
    levels.damage = 8;
    const bonuses = permanentBonuses(levels);

    expect(bonuses.maximumHealthBonus).toBe(50);
    expect(bonuses.damageMultiplier).toBeCloseTo(1.32);
    expect(nextPermanentUpgradeCost('health', levels)).toBeNull();
    expect(nextPermanentUpgradeCost('damage', levels)).toBeNull();
  });

  it('cobra 1500 brasas pela Ressureição e concede uma carga', () => {
    const levels = createEmptyPermanentUpgradeLevels();
    expect(nextPermanentUpgradeCost('resurrection', levels)).toBe(1_500);

    const purchase = purchasePermanentUpgrade('resurrection', levels, 1_500);
    expect(purchase.embers).toBe(0);
    expect(permanentBonuses(purchase.levels).resurrectionCharges).toBe(1);
  });

  it('aplica utilidades sem juros compostos escondidos', () => {
    const levels = createEmptyPermanentUpgradeLevels();
    levels.cooldown = 6;
    levels.range = 5;
    levels.duration = 5;
    levels.reroll = 3;
    levels.banish = 2;
    levels.vision = 1;
    const bonuses = permanentBonuses(levels);

    expect(bonuses.cooldownMultiplier).toBeCloseTo(0.88);
    expect(bonuses.rangeMultiplier).toBeCloseTo(1.15);
    expect(bonuses.durationMultiplier).toBeCloseTo(1.15);
    expect(bonuses.rerolls).toBe(3);
    expect(bonuses.banishes).toBe(2);
    expect(bonuses.choiceCount).toBe(4);
  });
});
