import { describe, expect, it } from 'vitest';

import { clampThreatLevel, romanThreat, threatModifiers } from '../../src/domain/encounters/threat';

describe('níveis de Ameaça', () => {
  it('aumenta principalmente a vida e amplia a recompensa', () => {
    const five = threatModifiers(5);
    const ten = threatModifiers(10);

    expect(five.healthMultiplier).toBeCloseTo(1.94, 2);
    expect(five.damageMultiplier).toBeCloseTo(1.31, 2);
    expect(five.emberMultiplier).toBeCloseTo(1.75, 2);
    expect(ten.healthMultiplier).toBeCloseTo(4.44, 2);
    expect(ten.damageMultiplier).toBeCloseTo(1.84, 2);
    expect(ten.emberMultiplier).toBeCloseTo(3.52, 2);
  });

  it('limita os níveis e apresenta numerais curtos', () => {
    expect(clampThreatLevel(-10)).toBe(1);
    expect(clampThreatLevel(50)).toBe(10);
    expect(romanThreat(1)).toBe('I');
    expect(romanThreat(10)).toBe('X');
  });
});
