export type PermanentUpgradeId =
  | 'damage'
  | 'health'
  | 'regeneration'
  | 'experience'
  | 'resurrection'
  | 'cooldown'
  | 'movement'
  | 'range'
  | 'duration'
  | 'armor'
  | 'healing'
  | 'magnet'
  | 'embers'
  | 'reroll'
  | 'banish'
  | 'vision'
  | 'luck';

export type PermanentUpgradeLevels = Record<PermanentUpgradeId, number>;

export interface PermanentUpgradeDefinition {
  id: PermanentUpgradeId;
  name: string;
  effect: string;
  note?: string;
  costs: readonly number[];
  available: boolean;
  group: 'corpo' | 'arsenal' | 'conhecimento' | 'destino';
}

const linearCosts = (count: number, start: number, step: number): number[] =>
  Array.from({ length: count }, (_, index) => start + index * step);

export const PERMANENT_UPGRADES: readonly PermanentUpgradeDefinition[] = [
  {
    id: 'damage',
    name: 'Dano',
    effect: '+4% de dano',
    costs: linearCosts(8, 60, 40),
    available: true,
    group: 'arsenal',
  },
  {
    id: 'health',
    name: 'Vida',
    effect: '+5 de vida máxima',
    costs: [100, 150, 225, 325, 450, 600, 800, 1_050, 1_350, 1_700],
    available: true,
    group: 'corpo',
  },
  {
    id: 'regeneration',
    name: 'Regeneração',
    effect: '+0,05 de vida por segundo',
    costs: linearCosts(4, 100, 70),
    available: true,
    group: 'corpo',
  },
  {
    id: 'experience',
    name: 'Experiência',
    effect: '+4% de experiência',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'conhecimento',
  },
  {
    id: 'resurrection',
    name: 'Ressureição',
    effect: 'Volta com 50% da vida',
    note: '1s imortal · uma vez por expedição',
    costs: [1_500],
    available: true,
    group: 'destino',
  },
  {
    id: 'cooldown',
    name: 'Ritmo',
    effect: '-2% de recarga',
    costs: linearCosts(6, 100, 70),
    available: true,
    group: 'arsenal',
  },
  {
    id: 'movement',
    name: 'Passos',
    effect: '+2% de velocidade',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'corpo',
  },
  {
    id: 'range',
    name: 'Alcance',
    effect: '+3% de alcance',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'arsenal',
  },
  {
    id: 'duration',
    name: 'Duração',
    effect: '+3% de duração',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'arsenal',
  },
  {
    id: 'armor',
    name: 'Couraça',
    effect: '+1 de armadura',
    costs: linearCosts(8, 60, 40),
    available: true,
    group: 'corpo',
  },
  {
    id: 'healing',
    name: 'Cura',
    effect: '+4% de cura recebida',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'corpo',
  },
  {
    id: 'magnet',
    name: 'Imã',
    effect: '+8% de alcance de coleta',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'conhecimento',
  },
  {
    id: 'embers',
    name: 'Colheita',
    effect: '+5% de brasas',
    costs: linearCosts(5, 100, 70),
    available: true,
    group: 'conhecimento',
  },
  {
    id: 'reroll',
    name: 'Jackpot',
    effect: '+1 nova rolagem',
    costs: [180, 320, 520],
    available: true,
    group: 'destino',
  },
  {
    id: 'banish',
    name: 'Veto',
    effect: '+1 exclusão',
    costs: [300, 550],
    available: true,
    group: 'destino',
  },
  {
    id: 'vision',
    name: 'Visão',
    effect: '+1 opção por nível',
    costs: [900],
    available: true,
    group: 'destino',
  },
  {
    id: 'luck',
    name: 'Sorte',
    effect: '+3% de chance rara',
    note: 'Raridades ainda não descobertas',
    costs: [250, 400, 600, 850, 1_150],
    available: false,
    group: 'destino',
  },
] as const;

export const PERMANENT_UPGRADE_IDS = PERMANENT_UPGRADES.map(
  (upgrade) => upgrade.id,
) as readonly PermanentUpgradeId[];

export interface PermanentBonuses {
  damageMultiplier: number;
  maximumHealthBonus: number;
  regenerationPerSecond: number;
  experienceMultiplier: number;
  resurrectionCharges: number;
  cooldownMultiplier: number;
  movementMultiplier: number;
  rangeMultiplier: number;
  durationMultiplier: number;
  armorBonus: number;
  healingMultiplier: number;
  pickupRadiusMultiplier: number;
  emberMultiplier: number;
  rerolls: number;
  banishes: number;
  choiceCount: number;
  luck: number;
}

export function createEmptyPermanentUpgradeLevels(): PermanentUpgradeLevels {
  return Object.fromEntries(PERMANENT_UPGRADE_IDS.map((id) => [id, 0])) as
    PermanentUpgradeLevels;
}

export function permanentBonuses(levels: PermanentUpgradeLevels): PermanentBonuses {
  return {
    damageMultiplier: 1 + levels.damage * 0.04,
    maximumHealthBonus: levels.health * 5,
    regenerationPerSecond: levels.regeneration * 0.05,
    experienceMultiplier: 1 + levels.experience * 0.04,
    resurrectionCharges: levels.resurrection,
    cooldownMultiplier: 1 - levels.cooldown * 0.02,
    movementMultiplier: 1 + levels.movement * 0.02,
    rangeMultiplier: 1 + levels.range * 0.03,
    durationMultiplier: 1 + levels.duration * 0.03,
    armorBonus: levels.armor,
    healingMultiplier: 1 + levels.healing * 0.04,
    pickupRadiusMultiplier: 1 + levels.magnet * 0.08,
    emberMultiplier: 1 + levels.embers * 0.05,
    rerolls: levels.reroll,
    banishes: levels.banish,
    choiceCount: 3 + levels.vision,
    luck: levels.luck * 0.03,
  };
}

export function getPermanentUpgrade(
  id: PermanentUpgradeId,
): PermanentUpgradeDefinition {
  const definition = PERMANENT_UPGRADES.find((upgrade) => upgrade.id === id);
  if (!definition) {
    throw new Error(`Upgrade permanente desconhecido: ${id}`);
  }
  return definition;
}

export function nextPermanentUpgradeCost(
  id: PermanentUpgradeId,
  levels: PermanentUpgradeLevels,
): number | null {
  const definition = getPermanentUpgrade(id);
  return definition.costs[levels[id]] ?? null;
}

export function purchasePermanentUpgrade(
  id: PermanentUpgradeId,
  levels: PermanentUpgradeLevels,
  embers: number,
): { levels: PermanentUpgradeLevels; embers: number } {
  const definition = getPermanentUpgrade(id);
  const cost = nextPermanentUpgradeCost(id, levels);
  if (!definition.available || cost === null || embers < cost) {
    throw new Error('Upgrade permanente indisponível.');
  }
  return {
    levels: { ...levels, [id]: levels[id] + 1 },
    embers: embers - cost,
  };
}
