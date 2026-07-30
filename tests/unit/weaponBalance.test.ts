import { describe, expect, it } from 'vitest';

import {
  atLevel,
  AXE_LEVELS,
  BARBARIAN_FURY_LEVELS,
  BLACK_WIDOW_LEVELS,
  DIVINE_AURA_LEVELS,
  HELL_STEPS_LEVELS,
} from '../../src/domain/weapons/weaponBalance';

describe('balanceamento das armas', () => {
  it('transforma o arco frontal do machado em dois giros completos', () => {
    expect(atLevel(AXE_LEVELS, 1).arcDegrees).toBeLessThan(180);
    expect(atLevel(AXE_LEVELS, 5).damage).toBe(96);
    expect(atLevel(BARBARIAN_FURY_LEVELS, 1).secondDamage).toBeLessThan(
      atLevel(BARBARIAN_FURY_LEVELS, 1).firstDamage,
    );
  });

  it('mantém Aura Divina constante e com lentidão menor no chefe', () => {
    const aura = atLevel(DIVINE_AURA_LEVELS, 3);
    expect(aura.tickInterval).toBe(0.5);
    expect(aura.bossSlow).toBeLessThan(aura.slow);
  });

  it('faz Viúva Negra durar mais e expor alvos sem amplificar indefinidamente', () => {
    const final = atLevel(BLACK_WIDOW_LEVELS, 3);
    expect(final.duration).toBe(8);
    expect(final.damageVulnerability).toBe(0.2);
    expect(final.maximumStacks).toBe(3);
  });

  it('faz Passos do Inferno explodir sem criar segmentos ilimitados', () => {
    const final = atLevel(HELL_STEPS_LEVELS, 3);
    expect(final.explosionDamage).toBe(72);
    expect(final.maximumSegments).toBe(11);
  });

  it('limita níveis fora da tabela ao valor válido mais próximo', () => {
    expect(atLevel(AXE_LEVELS, -8)).toEqual(AXE_LEVELS[0]);
    expect(atLevel(AXE_LEVELS, 99)).toEqual(AXE_LEVELS.at(-1));
    expect(() => atLevel([], 1)).toThrow('Nível de arma inválido');
  });
});
