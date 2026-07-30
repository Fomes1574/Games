import { describe, expect, it } from 'vitest';

import { applyHealing, resolveDamage } from '../../src/domain/combat/damage';

describe('combate', () => {
  it('aplica armadura, resistência e crítico em ordem estável', () => {
    const result = resolveDamage({
      amount: 100,
      armor: 100,
      resistance: 0.2,
      criticalChance: 0.5,
      criticalMultiplier: 2,
      criticalRoll: 0.1,
    });

    expect(result.critical).toBe(true);
    expect(result.raw).toBe(200);
    expect(result.final).toBeCloseTo(80);
    expect(result.mitigated).toBeCloseTo(120);
  });

  it('limita resistência e rejeita números destrutivos', () => {
    const result = resolveDamage({
      amount: Number.POSITIVE_INFINITY,
      armor: -100,
      resistance: 4,
      criticalChance: -1,
      criticalMultiplier: -2,
      criticalRoll: 0,
    });

    expect(result.final).toBe(0);
    expect(result.critical).toBe(false);
  });

  it('não cura acima da vida máxima', () => {
    expect(applyHealing(90, 100, 50)).toBe(100);
    expect(applyHealing(30, 100, -20)).toBe(30);
  });
});
