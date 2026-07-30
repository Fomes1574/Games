import {
  getUpgrade,
  type EvolutionId,
  type UpgradeId,
  type WeaponId,
} from '../../data/content';
import {
  ASH_LANTERN_LEVELS,
  atLevel,
  AXE_LEVELS,
  BARBARIAN_FURY_LEVELS,
  BLACK_WIDOW_LEVELS,
  CELESTIAL_AURA_LEVELS,
  CROSSBOW_LEVELS,
  DIVINE_AURA_LEVELS,
  HELL_STEPS_LEVELS,
  IMPALER_LEVELS,
  PIERCING_OATH_LEVELS,
  SPEAR_LEVELS,
  WIDOW_VENOM_LEVELS,
} from '../weapons/weaponBalance';
import type { UpgradeLevels } from './upgradePool';

export interface UpgradeStatPreview {
  label: string;
  value: string;
}

export interface UpgradePreview {
  name: string;
  tier: string;
  effect: string;
  stats: UpgradeStatPreview[];
}

const weaponPreview = (
  id: WeaponId,
  current: number,
  next: number,
): UpgradeStatPreview[] => {
  switch (id) {
    case 'executioner-axe': {
      const before = current > 0 ? atLevel(AXE_LEVELS, current) : undefined;
      const after = atLevel(AXE_LEVELS, next);
      return [
        transition('Dano', before?.damage, after.damage),
        transition('Intervalo', before?.cooldown, after.cooldown, 's', 2),
      ];
    }
    case 'watch-crossbow': {
      const before = current > 0 ? atLevel(CROSSBOW_LEVELS, current) : undefined;
      const after = atLevel(CROSSBOW_LEVELS, next);
      return [
        transition('Dano', before?.damage, after.damage),
        transition('Perfuração', before?.piercing, after.piercing),
      ];
    }
    case 'celestial-aura': {
      const before =
        current > 0 ? atLevel(CELESTIAL_AURA_LEVELS, current) : undefined;
      const after = atLevel(CELESTIAL_AURA_LEVELS, next);
      return [
        transition('Dano', before?.damage, after.damage),
        transition('Alcance', before?.range, after.range),
      ];
    }
    case 'widow-venom': {
      const before = current > 0 ? atLevel(WIDOW_VENOM_LEVELS, current) : undefined;
      const after = atLevel(WIDOW_VENOM_LEVELS, next);
      return [
        transition('Veneno', before?.damagePerSecond, after.damagePerSecond, '/s'),
        transition('Acúmulos', before?.maximumStacks, after.maximumStacks),
      ];
    }
    case 'spear': {
      const before = current > 0 ? atLevel(SPEAR_LEVELS, current) : undefined;
      const after = atLevel(SPEAR_LEVELS, next);
      return [
        transition('Dano', before?.damage, after.damage),
        transition('Alvos', before?.maximumTargets, after.maximumTargets),
      ];
    }
    case 'ash-lantern': {
      const before = current > 0 ? atLevel(ASH_LANTERN_LEVELS, current) : undefined;
      const after = atLevel(ASH_LANTERN_LEVELS, next);
      return [
        transition('Dano', before?.tickDamage, after.tickDamage, '/pulso'),
        transition('Trechos', before?.maximumSegments, after.maximumSegments),
      ];
    }
  }
};

const evolutionPreview = (
  id: EvolutionId,
  current: number,
  next: number,
): UpgradeStatPreview[] => {
  switch (id) {
    case 'barbarian-fury': {
      const before =
        current > 0 ? atLevel(BARBARIAN_FURY_LEVELS, current) : undefined;
      const after = atLevel(BARBARIAN_FURY_LEVELS, next);
      return [
        transition('Primeiro giro', before?.firstDamage, after.firstDamage),
        transition('Segundo giro', before?.secondDamage, after.secondDamage),
      ];
    }
    case 'piercing-oath': {
      const before =
        current > 0 ? atLevel(PIERCING_OATH_LEVELS, current) : undefined;
      const after = atLevel(PIERCING_OATH_LEVELS, next);
      return [
        transition('Virote central', before?.centerDamage, after.centerDamage),
        transition('Perfuração', before?.piercing, after.piercing),
      ];
    }
    case 'divine-aura': {
      const before = current > 0 ? atLevel(DIVINE_AURA_LEVELS, current) : undefined;
      const after = atLevel(DIVINE_AURA_LEVELS, next);
      return [
        transition('Dano', before?.damagePerTick, after.damagePerTick, '/pulso'),
        transitionPercent('Lentidão', before?.slow, after.slow),
      ];
    }
    case 'black-widow': {
      const before = current > 0 ? atLevel(BLACK_WIDOW_LEVELS, current) : undefined;
      const after = atLevel(BLACK_WIDOW_LEVELS, next);
      return [
        transition('Veneno', before?.damagePerSecond, after.damagePerSecond, '/s'),
        transitionPercent(
          'Dano recebido',
          before?.damageVulnerability,
          after.damageVulnerability,
        ),
      ];
    }
    case 'impaler': {
      const before = current > 0 ? atLevel(IMPALER_LEVELS, current) : undefined;
      const after = atLevel(IMPALER_LEVELS, next);
      return [
        transition('Ida', before?.outwardDamage, after.outwardDamage),
        transition('Retorno', before?.returnDamage, after.returnDamage),
      ];
    }
    case 'hell-steps': {
      const before = current > 0 ? atLevel(HELL_STEPS_LEVELS, current) : undefined;
      const after = atLevel(HELL_STEPS_LEVELS, next);
      return [
        transition('Dano', before?.tickDamage, after.tickDamage, '/pulso'),
        transition('Explosão', before?.explosionDamage, after.explosionDamage),
      ];
    }
  }
};

export function createUpgradePreview(
  id: UpgradeId,
  levels: UpgradeLevels,
): UpgradePreview {
  const definition = getUpgrade(id);
  const current = levels[id] ?? 0;
  const next = Math.min(definition.maxLevel, current + 1);
  let stats: UpgradeStatPreview[];

  if (definition.kind === 'weapon') {
    stats = weaponPreview(definition.id as WeaponId, current, next);
  } else if (definition.kind === 'evolution') {
    stats = evolutionPreview(definition.id as EvolutionId, current, next);
  } else if (definition.id === 'runic-plate') {
    stats = [
      transition(
        'Armadura',
        current > 0 ? current * 5 : undefined,
        next * 5,
        undefined,
        0,
        true,
      ),
    ];
  } else if (definition.id === 'fallen-vigor') {
    stats = [
      transition(
        'Vida máxima',
        current > 0 ? current * 12 : undefined,
        next * 12,
        undefined,
        0,
        true,
      ),
    ];
  } else {
    const before = (1.08 ** current - 1) * 100;
    const after = (1.08 ** next - 1) * 100;
    stats = [
      transition(
        'Velocidade',
        current > 0 ? before : undefined,
        after,
        '%',
        0,
        true,
      ),
    ];
  }

  return {
    name: definition.name,
    tier:
      definition.kind === 'evolution'
        ? current === 0
          ? 'Evolução'
          : `E${next}`
        : `Nv. ${next}`,
    effect: definition.description,
    stats,
  };
}

function transition(
  label: string,
  before: number | undefined,
  after: number,
  unit = '',
  fractionDigits = 0,
  showPlus = false,
): UpgradeStatPreview {
  const next = format(after, unit, fractionDigits, showPlus);
  return {
    label,
    value:
      before === undefined
        ? next
        : `${format(before, unit, fractionDigits, showPlus)} → ${next}`,
  };
}

function transitionPercent(
  label: string,
  before: number | undefined,
  after: number,
): UpgradeStatPreview {
  return transition(
    label,
    before === undefined ? undefined : before * 100,
    after * 100,
    '%',
    0,
    true,
  );
}

function format(
  value: number,
  unit: string,
  fractionDigits: number,
  showPlus: boolean,
): string {
  const numeric = value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${showPlus && value > 0 ? '+' : ''}${numeric}${unit ? ` ${unit}` : ''}`;
}
