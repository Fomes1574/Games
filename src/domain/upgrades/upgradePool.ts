import { UPGRADES, type UpgradeDefinition, type UpgradeId } from '../../data/content';
import type { SeededRng } from '../../core/rng/SeededRng';

export type UpgradeLevels = Partial<Record<UpgradeId, number>>;

export function isUpgradeAvailable(
  definition: UpgradeDefinition,
  levels: UpgradeLevels,
): boolean {
  const current = levels[definition.id] ?? 0;
  if (current >= definition.maxLevel) {
    return false;
  }

  if (!definition.requires) {
    return true;
  }

  return (
    (levels[definition.requires.weapon] ?? 0) >= definition.requires.weaponLevel &&
    (levels[definition.requires.passive] ?? 0) >= 1
  );
}

export function createUpgradeChoices(
  levels: UpgradeLevels,
  rng: SeededRng,
  count = 3,
): UpgradeDefinition[] {
  const available = UPGRADES.filter((definition) => isUpgradeAvailable(definition, levels));
  const choices: UpgradeDefinition[] = [];
  const remaining = [...available];

  while (choices.length < count && remaining.length > 0) {
    const weighted = remaining.map((definition) => ({
      value: definition,
      weight:
        definition.kind === 'evolution'
          ? 8
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
