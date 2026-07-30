export interface GameSave {
  version: 1;
  id: string;
  updatedAt: string;
  guild: {
    embers: number;
    forgeLevel: number;
    expeditions: number;
    victories: number;
  };
  statistics: {
    enemiesDefeated: number;
    longestSurvivalSeconds: number;
  };
  checksum: string;
}

export function createDefaultSave(): GameSave {
  const base = {
    version: 1 as const,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    guild: {
      embers: 0,
      forgeLevel: 0,
      expeditions: 0,
      victories: 0,
    },
    statistics: {
      enemiesDefeated: 0,
      longestSurvivalSeconds: 0,
    },
  };

  return {
    ...base,
    checksum: calculateChecksum(base),
  };
}

export function normalizeSave(candidate: unknown): GameSave {
  if (!isRecord(candidate) || candidate.version !== 1) {
    throw new Error('Versão de save incompatível.');
  }

  const guild = candidate.guild;
  const statistics = candidate.statistics;
  if (!isRecord(guild) || !isRecord(statistics)) {
    throw new Error('Estrutura do save inválida.');
  }

  const base = {
    version: 1 as const,
    id: safeText(candidate.id, 80),
    updatedAt: safeText(candidate.updatedAt, 80),
    guild: {
      embers: safeInteger(guild.embers, 0, 1_000_000),
      forgeLevel: safeInteger(guild.forgeLevel, 0, 10),
      expeditions: safeInteger(guild.expeditions, 0, 1_000_000),
      victories: safeInteger(guild.victories, 0, 1_000_000),
    },
    statistics: {
      enemiesDefeated: safeInteger(statistics.enemiesDefeated, 0, 100_000_000),
      longestSurvivalSeconds: safeInteger(
        statistics.longestSurvivalSeconds,
        0,
        86_400,
      ),
    },
  };

  if (
    typeof candidate.checksum !== 'string' ||
    candidate.checksum !== calculateChecksum(base)
  ) {
    throw new Error('O checksum do save não confere.');
  }

  return {
    ...base,
    checksum: candidate.checksum,
  };
}

export function withChecksum(save: Omit<GameSave, 'checksum'> | GameSave): GameSave {
  const base = {
    version: save.version,
    id: save.id,
    updatedAt: save.updatedAt,
    guild: save.guild,
    statistics: save.statistics,
  };
  return {
    ...base,
    checksum: calculateChecksum(base),
  };
}

function calculateChecksum(value: Omit<GameSave, 'checksum'>): string {
  const source = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('O save contém um número inválido.');
  }
  if (value < minimum || value > maximum) {
    throw new Error('O save contém um número fora do limite.');
  }
  return value;
}

function safeText(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
    throw new Error('O save contém texto inválido.');
  }
  return value;
}
