import { describe, expect, it } from 'vitest';

import {
  applyDamageVulnerability,
  slowMultiplier,
  transferredPoisonDuration,
} from '../../src/domain/combat/statusEffects';

describe('efeitos de estado', () => {
  it('transfere o veneno com metade do tempo restante', () => {
    expect(transferredPoisonDuration(6)).toBe(3);
    expect(transferredPoisonDuration(-4)).toBe(0);
  });

  it('Viúva Negra amplia outras fontes, mas não o próprio veneno', () => {
    expect(applyDamageVulnerability(100, 0.2, 'weapon')).toBe(120);
    expect(applyDamageVulnerability(100, 0.2, 'poison')).toBe(100);
    expect(applyDamageVulnerability(100, 9, 'weapon')).toBe(150);
  });

  it('Aura Divina desacelera chefes menos que inimigos comuns', () => {
    expect(slowMultiplier(0.3, 0.12, false)).toBeCloseTo(0.7);
    expect(slowMultiplier(0.3, 0.12, true)).toBeCloseTo(0.88);
    expect(slowMultiplier(Number.NaN, Number.POSITIVE_INFINITY, false)).toBe(1);
  });
});
