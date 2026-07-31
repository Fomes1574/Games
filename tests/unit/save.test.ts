import { describe, expect, it } from 'vitest';

import {
  createDefaultSave,
  normalizeSave,
  withChecksum,
} from '../../src/domain/saving/saveModel';

describe('save', () => {
  it('cria e valida um save íntegro', () => {
    const save = createDefaultSave();

    expect(normalizeSave(save)).toEqual(save);
  });

  it('detecta alteração depois do checksum', () => {
    const save = createDefaultSave();
    const corrupted = {
      ...save,
      guild: { ...save.guild, embers: 999 },
    };

    expect(() => normalizeSave(corrupted)).toThrow(/checksum/i);
  });

  it('atualiza o checksum junto com o progresso', () => {
    const save = createDefaultSave();
    const updated = withChecksum({
      ...save,
      guild: { ...save.guild, embers: 50 },
    });

    expect(normalizeSave(updated).guild.embers).toBe(50);
  });

  it('limita campos importados', () => {
    const save = createDefaultSave();
    expect(() =>
      normalizeSave({
        ...save,
        statistics: {
          ...save.statistics,
          enemiesDefeated: Number.MAX_SAFE_INTEGER,
        },
      }),
    ).toThrow(/limite/i);
  });

  it('migra a Forja antiga para Dano sem perder brasas e estatísticas', () => {
    const base = {
      version: 1 as const,
      id: 'save-antigo',
      updatedAt: '2026-07-30T00:00:00.000Z',
      guild: {
        embers: 740,
        forgeLevel: 5,
        expeditions: 12,
        victories: 4,
      },
      statistics: {
        enemiesDefeated: 1_574,
        longestSurvivalSeconds: 300,
      },
    };
    const source = JSON.stringify(base);
    let hash = 2_166_136_261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }
    const migrated = normalizeSave({
      ...base,
      checksum: (hash >>> 0).toString(16).padStart(8, '0'),
    });

    expect(migrated.version).toBe(2);
    expect(migrated.guild.embers).toBe(740);
    expect(migrated.guild.permanentUpgrades.damage).toBe(5);
    expect(migrated.statistics.enemiesDefeated).toBe(1_574);
  });
});
