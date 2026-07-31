import { CODEX_ENTRY_IDS, type CodexEntryId } from '../codex/codex';
import {
  createEmptyPermanentUpgradeLevels,
  getPermanentUpgrade,
  PERMANENT_UPGRADE_IDS,
  type PermanentUpgradeLevels,
} from '../progression/permanentUpgrades';

export interface GameSave {
  version: 2;
  id: string;
  updatedAt: string;
  guild: {
    embers: number;
    permanentUpgrades: PermanentUpgradeLevels;
    expeditions: number;
    victories: number;
    maximumThreatUnlocked: number;
    selectedThreat: number;
  };
  statistics: {
    enemiesDefeated: number;
    longestSurvivalSeconds: number;
    killsByEnemy: Record<string, number>;
    runsByMap: Record<string, number>;
    victoriesByMap: Record<string, number>;
  };
  codex: {
    discovered: CodexEntryId[];
    mastered: CodexEntryId[];
  };
  checksum: string;
}

interface LegacySaveV1 {
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
  const base: Omit<GameSave, 'checksum'> = {
    version: 2,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    guild: {
      embers: 0,
      permanentUpgrades: createEmptyPermanentUpgradeLevels(),
      expeditions: 0,
      victories: 0,
      maximumThreatUnlocked: 1,
      selectedThreat: 1,
    },
    statistics: {
      enemiesDefeated: 0,
      longestSurvivalSeconds: 0,
      killsByEnemy: {},
      runsByMap: {},
      victoriesByMap: {},
    },
    codex: {
      discovered: [],
      mastered: [],
    },
  };

  return withChecksum(base);
}

export function normalizeSave(candidate: unknown): GameSave {
  if (!isRecord(candidate)) {
    throw new Error('Estrutura do save inválida.');
  }
  if (candidate.version === 1) {
    return migrateLegacySave(candidate);
  }
  if (candidate.version !== 2) {
    throw new Error('Versão de save incompatível.');
  }

  const guild = candidate.guild;
  const statistics = candidate.statistics;
  const codex = candidate.codex;
  if (!isRecord(guild) || !isRecord(statistics) || !isRecord(codex)) {
    throw new Error('Estrutura do save inválida.');
  }

  const permanentUpgrades = normalizePermanentUpgrades(guild.permanentUpgrades);
  const maximumThreatUnlocked = safeInteger(guild.maximumThreatUnlocked, 1, 10);
  const base: Omit<GameSave, 'checksum'> = {
    version: 2,
    id: safeText(candidate.id, 80),
    updatedAt: safeText(candidate.updatedAt, 80),
    guild: {
      embers: safeInteger(guild.embers, 0, 100_000_000),
      permanentUpgrades,
      expeditions: safeInteger(guild.expeditions, 0, 1_000_000),
      victories: safeInteger(guild.victories, 0, 1_000_000),
      maximumThreatUnlocked,
      selectedThreat: Math.min(
        maximumThreatUnlocked,
        safeInteger(guild.selectedThreat, 1, 10),
      ),
    },
    statistics: {
      enemiesDefeated: safeInteger(statistics.enemiesDefeated, 0, 100_000_000),
      longestSurvivalSeconds: safeInteger(
        statistics.longestSurvivalSeconds,
        0,
        86_400,
      ),
      killsByEnemy: normalizeCountRecord(statistics.killsByEnemy),
      runsByMap: normalizeCountRecord(statistics.runsByMap),
      victoriesByMap: normalizeCountRecord(statistics.victoriesByMap),
    },
    codex: {
      discovered: normalizeCodexIds(codex.discovered),
      mastered: normalizeCodexIds(codex.mastered),
    },
  };

  verifyChecksum(candidate.checksum, base);
  return { ...base, checksum: candidate.checksum };
}

export function withChecksum(save: Omit<GameSave, 'checksum'> | GameSave): GameSave {
  const base: Omit<GameSave, 'checksum'> = {
    version: 2,
    id: save.id,
    updatedAt: save.updatedAt,
    guild: save.guild,
    statistics: save.statistics,
    codex: save.codex,
  };
  return { ...base, checksum: calculateChecksum(base) };
}

function migrateLegacySave(candidate: Record<string, unknown>): GameSave {
  const guild = candidate.guild;
  const statistics = candidate.statistics;
  if (!isRecord(guild) || !isRecord(statistics)) {
    throw new Error('Estrutura do save inválida.');
  }
  const legacyBase: Omit<LegacySaveV1, 'checksum'> = {
    version: 1,
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
  verifyChecksum(candidate.checksum, legacyBase);

  const permanentUpgrades = createEmptyPermanentUpgradeLevels();
  permanentUpgrades.damage = Math.min(
    getPermanentUpgrade('damage').costs.length,
    legacyBase.guild.forgeLevel,
  );
  return withChecksum({
    version: 2,
    id: legacyBase.id,
    updatedAt: legacyBase.updatedAt,
    guild: {
      embers: legacyBase.guild.embers,
      permanentUpgrades,
      expeditions: legacyBase.guild.expeditions,
      victories: legacyBase.guild.victories,
      maximumThreatUnlocked: 1,
      selectedThreat: 1,
    },
    statistics: {
      ...legacyBase.statistics,
      killsByEnemy: {},
      runsByMap: {},
      victoriesByMap: {},
    },
    codex: { discovered: [], mastered: [] },
  });
}

function normalizePermanentUpgrades(value: unknown): PermanentUpgradeLevels {
  if (!isRecord(value)) {
    throw new Error('Upgrades permanentes inválidos.');
  }
  const result = createEmptyPermanentUpgradeLevels();
  for (const id of PERMANENT_UPGRADE_IDS) {
    result[id] = safeInteger(
      value[id],
      0,
      getPermanentUpgrade(id).costs.length,
    );
  }
  return result;
}

function normalizeCodexIds(value: unknown): CodexEntryId[] {
  if (!Array.isArray(value) || value.length > CODEX_ENTRY_IDS.length) {
    throw new Error('Descobertas do grimório inválidas.');
  }
  const known = new Set<string>(CODEX_ENTRY_IDS);
  const unique = new Set<CodexEntryId>();
  for (const item of value) {
    if (typeof item !== 'string' || !known.has(item)) {
      throw new Error('O grimório contém uma descoberta desconhecida.');
    }
    unique.add(item as CodexEntryId);
  }
  return [...unique];
}

function normalizeCountRecord(value: unknown): Record<string, number> {
  if (!isRecord(value) || Object.keys(value).length > 200) {
    throw new Error('Estatísticas detalhadas inválidas.');
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, count]) => [
      safeText(key, 80),
      safeInteger(count, 0, 100_000_000),
    ]),
  );
}

function verifyChecksum(checksum: unknown, base: object): asserts checksum is string {
  if (typeof checksum !== 'string' || checksum !== calculateChecksum(base)) {
    throw new Error('O checksum do save não confere.');
  }
}

function calculateChecksum(value: object): string {
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
