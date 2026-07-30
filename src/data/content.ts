export type WeaponId = 'executioner-axe' | 'watch-crossbow' | 'funeral-bell';
export type PassiveId = 'runic-plate' | 'fallen-vigor' | 'hunter-steps';
export type EvolutionId = 'carnage-wheel' | 'piercing-oath' | 'iron-requiem';
export type UpgradeId = WeaponId | PassiveId | EvolutionId;

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  detail: string;
  kind: 'weapon' | 'passive' | 'evolution';
  maxLevel: number;
  requires?: {
    weapon: WeaponId;
    passive: PassiveId;
    weaponLevel: number;
  };
}

export interface EnemyDefinition {
  id: 'crawler' | 'runner' | 'cultist' | 'corrupted-executioner' | 'plague-bishop';
  name: string;
  role: 'mass' | 'runner' | 'ranged' | 'elite' | 'boss';
  health: number;
  speed: number;
  damage: number;
  experience: number;
  radius: number;
  color: number;
}

export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'executioner-axe',
    name: 'Machado do Carrasco',
    description: 'Um golpe circular automático despedaça inimigos próximos.',
    detail: '+35% de dano e -8% de intervalo por nível.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'watch-crossbow',
    name: 'Besta da Vigília',
    description: 'Dispara contra o inimigo mais próximo e atravessa alvos.',
    detail: '+1 perfuração nos níveis 3 e 5.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'funeral-bell',
    name: 'Sino Fúnebre',
    description: 'Ondas de lamento ferem tudo ao redor da companhia.',
    detail: '+22 de alcance e +30% de dano por nível.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'runic-plate',
    name: 'Couraça Rúnica',
    description: 'Placas antigas absorvem parte dos impactos.',
    detail: '+12 de armadura por nível.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'fallen-vigor',
    name: 'Vigor dos Caídos',
    description: 'A memória dos mortos fortalece seu corpo.',
    detail: '+18% de vida máxima e cura imediata.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'hunter-steps',
    name: 'Passos do Caçador',
    description: 'Movimento firme para atravessar a horda.',
    detail: '+8% de velocidade por nível.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'carnage-wheel',
    name: 'Roda da Carnificina',
    description: 'O machado torna-se uma tempestade de aço e sangue.',
    detail: 'Golpe duplo, área maior e execução de inimigos feridos.',
    kind: 'evolution',
    maxLevel: 1,
    requires: {
      weapon: 'executioner-axe',
      passive: 'runic-plate',
      weaponLevel: 3,
    },
  },
  {
    id: 'piercing-oath',
    name: 'Juramento Perfurante',
    description: 'A besta dispara uma rajada que caça alvos distantes.',
    detail: 'Três virotes, maior velocidade e perfuração.',
    kind: 'evolution',
    maxLevel: 1,
    requires: {
      weapon: 'watch-crossbow',
      passive: 'hunter-steps',
      weaponLevel: 3,
    },
  },
  {
    id: 'iron-requiem',
    name: 'Réquiem de Ferro',
    description: 'Cada badalada amaldiçoa e repele a horda inteira.',
    detail: 'Pulso duplo, alcance ampliado e cura por inimigo abatido.',
    kind: 'evolution',
    maxLevel: 1,
    requires: {
      weapon: 'funeral-bell',
      passive: 'fallen-vigor',
      weaponLevel: 3,
    },
  },
] as const;

export const ENEMIES = {
  crawler: {
    id: 'crawler',
    name: 'Rastejante da Cinza',
    role: 'mass',
    health: 28,
    speed: 54,
    damage: 8,
    experience: 6,
    radius: 16,
    color: 0x756968,
  },
  runner: {
    id: 'runner',
    name: 'Cão da Vigília',
    role: 'runner',
    health: 20,
    speed: 104,
    damage: 10,
    experience: 8,
    radius: 13,
    color: 0x9b513f,
  },
  cultist: {
    id: 'cultist',
    name: 'Cultista da Bruma',
    role: 'ranged',
    health: 48,
    speed: 42,
    damage: 13,
    experience: 10,
    radius: 17,
    color: 0x65517d,
  },
  'corrupted-executioner': {
    id: 'corrupted-executioner',
    name: 'Carrasco Corrompido',
    role: 'elite',
    health: 700,
    speed: 58,
    damage: 24,
    experience: 90,
    radius: 34,
    color: 0xb24738,
  },
  'plague-bishop': {
    id: 'plague-bishop',
    name: 'Bispo da Peste',
    role: 'boss',
    health: 4_800,
    speed: 36,
    damage: 30,
    experience: 500,
    radius: 58,
    color: 0x7b9947,
  },
} as const satisfies Record<string, EnemyDefinition>;

export function getUpgrade(id: UpgradeId): UpgradeDefinition {
  const definition = UPGRADES.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Melhoria desconhecida: ${id}`);
  }
  return definition;
}
