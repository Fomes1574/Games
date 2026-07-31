import {
  UPGRADES,
  type UpgradeDefinition,
  type UpgradeId,
  type WeaponId,
} from '../../data/content';
import type { SeededRng } from '../../core/rng/SeededRng';

export type UpgradeLevels = Partial<Record<UpgradeId, number>>;

export interface UpgradeAvailabilityOptions {
  evolutionsUnlocked?: boolean;
  maximumWeapons?: number;
  excludedIds?: readonly UpgradeId[];
  guaranteeSynergy?: boolean;
  guaranteeEvolution?: boolean;
}

export function isUpgradeAvailable(
  definition: UpgradeDefinition,
  levels: UpgradeLevels,
  options: UpgradeAvailabilityOptions = {},
): boolean {
  const current = levels[definition.id] ?? 0;
  if (options.excludedIds?.includes(definition.id)) {
    return false;
  }
  if (current >= definition.maxLevel) {
    return false;
  }

  if (
    definition.kind === 'weapon' &&
    current === 0 &&
    countOwnedWeapons(levels) >= (options.maximumWeapons ?? 4)
  ) {
    return false;
  }

  if (!definition.requires) {
    return true;
  }

  if (options.evolutionsUnlocked === false) {
    return false;
  }

  return (
    (levels[definition.requires.weapon] ?? 0) >= definition.requires.weaponLevel &&
    (levels[definition.requires.passive] ?? 0) >= definition.requires.passiveLevel
  );
}

export function createUpgradeChoices(
  levels: UpgradeLevels,
  rng: SeededRng,
  count = 3,
  options: UpgradeAvailabilityOptions = {},
): UpgradeDefinition[] {
  const available = UPGRADES.filter((definition) =>
    isUpgradeAvailable(definition, levels, options),
  );
  const choices: UpgradeDefinition[] = [];
  const remaining = [...available];

  const eligibleEvolution = remaining.filter(
    (definition) => definition.kind === 'evolution',
  );
  const relatedPassives = remaining.filter(
    (definition) =>
      definition.kind === 'passive' &&
      UPGRADES.some(
        (evolution) =>
          evolution.requires?.passive === definition.id &&
          (levels[evolution.requires.weapon] ?? 0) >= 3 &&
          (levels[definition.id] ?? 0) < evolution.requires.passiveLevel,
      ),
  );

  const guaranteedPool =
    options.guaranteeEvolution && eligibleEvolution.length > 0
      ? eligibleEvolution
      : options.guaranteeSynergy && relatedPassives.length > 0
        ? relatedPassives
        : [];
  if (guaranteedPool.length > 0 && choices.length < count) {
    const guaranteed = rng.pick(guaranteedPool);
    choices.push(guaranteed);
    remaining.splice(remaining.indexOf(guaranteed), 1);
  }

  while (choices.length < count && remaining.length > 0) {
    const weighted = remaining.map((definition) => ({
      value: definition,
      weight:
        definition.kind === 'evolution'
          ? 8
          : relatedPassives.includes(definition)
            ? 7
          : (levels[definition.id] ?? 0) > 0
            ? 4
            : 2,
    }));
    const selected = rng.weightedPick(weighted);
    choices.push(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }

  return choices;
}

export function applyUpgrade(levels: UpgradeLevels, id: UpgradeId): UpgradeLevels {
  const definition = UPGRADES.find((candidate) => candidate.id === id);
  if (!definition || !isUpgradeAvailable(definition, levels)) {
    throw new Error(`Melhoria indisponível: ${id}`);
  }

  return {
    ...levels,
    [id]: (levels[id] ?? 0) + 1,
  };
}

export function countOwnedWeapons(levels: UpgradeLevels): number {
  return (
    UPGRADES.filter(
      (definition) =>
        definition.kind === 'weapon' &&
        (levels[definition.id as WeaponId] ?? 0) > 0,
    ).length
  );
}
