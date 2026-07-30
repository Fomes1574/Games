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
});
