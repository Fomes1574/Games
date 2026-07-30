import { describe, expect, it } from 'vitest';

import { createUpgradePreview } from '../../src/domain/upgrades/upgradePresentation';
import type { EvolutionId, WeaponId } from '../../src/data/content';

describe('apresentação compacta de melhorias', () => {
  it('mostra o valor atual e o próximo sem texto por nível', () => {
    const preview = createUpgradePreview('executioner-axe', {
      'executioner-axe': 2,
    });

    expect(preview.tier).toBe('Nv. 3');
    expect(preview.stats[0]).toEqual({ label: 'Dano', value: '60 → 72' });
    expect(preview.effect).not.toContain('por nível');
  });

  it('mostra somente a transformação e seus valores diretos', () => {
    const preview = createUpgradePreview('divine-aura', {
      'celestial-aura': 5,
      'fallen-vigor': 3,
    });

    expect(preview.name).toBe('Aura Divina');
    expect(preview.tier).toBe('Evolução');
    expect(preview.stats.map((stat) => stat.label)).toEqual(['Dano', 'Lentidão']);
  });

  it.each([
    'executioner-axe',
    'watch-crossbow',
    'celestial-aura',
    'widow-venom',
    'spear',
    'ash-lantern',
  ] satisfies WeaponId[])('apresenta todos os níveis da arma %s', (id) => {
    const acquired = createUpgradePreview(id, {});
    const upgraded = createUpgradePreview(id, { [id]: 2 });

    expect(acquired.tier).toBe('Nv. 1');
    expect(acquired.stats).toHaveLength(2);
    expect(upgraded.tier).toBe('Nv. 3');
    expect(upgraded.stats.every((stat) => stat.value.includes('→'))).toBe(true);
  });

  it.each([
    'barbarian-fury',
    'piercing-oath',
    'divine-aura',
    'black-widow',
    'impaler',
    'hell-steps',
  ] satisfies EvolutionId[])('apresenta evolução e reforço de %s', (id) => {
    const evolution = createUpgradePreview(id, {});
    const reinforcement = createUpgradePreview(id, { [id]: 1 });

    expect(evolution.tier).toBe('Evolução');
    expect(evolution.stats).toHaveLength(2);
    expect(reinforcement.tier).toBe('E2');
    expect(reinforcement.stats.every((stat) => stat.value.includes('→'))).toBe(true);
  });

  it('mostra bônus acumulados das três passivas', () => {
    expect(createUpgradePreview('runic-plate', {}).stats[0]?.value).toBe('+5');
    expect(
      createUpgradePreview('fallen-vigor', { 'fallen-vigor': 2 }).stats[0]?.value,
    ).toBe('+24 → +36');
    expect(
      createUpgradePreview('hunter-steps', { 'hunter-steps': 1 }).stats[0]?.value,
    ).toContain('%');
  });
});
