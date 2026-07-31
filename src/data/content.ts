export type WeaponId =
  | 'executioner-axe'
  | 'watch-crossbow'
  | 'celestial-aura'
  | 'widow-venom'
  | 'spear'
  | 'ash-lantern';

export type PassiveId =
  | 'runic-plate'
  | 'fallen-vigor'
  | 'hunter-steps'
  | 'quick-hands'
  | 'long-sight'
  | 'persistence'
  | 'ancient-blood'
  | 'wisdom'
  | 'blessing'
  | 'magnetism';

export type EvolutionId =
  | 'barbarian-fury'
  | 'piercing-oath'
  | 'divine-aura'
  | 'black-widow'
  | 'impaler'
  | 'hell-steps';

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
    passiveLevel: number;
  };
}

export type EnemyId =
  | 'crawler'
  | 'runner'
  | 'cultist'
  | 'armored-penitent'
  | 'ruin-herald'
  | 'sepulchral-guardian'
  | 'ash-summoner'
  | 'plague-sower'
  | 'shattered'
  | 'pale-priest'
  | 'mist-hunter'
  | 'corrupted-executioner'
  | 'plague-bishop';

export type EnemyRole =
  | 'mass'
  | 'runner'
  | 'ranged'
  | 'tank'
  | 'support'
  | 'guardian'
  | 'summoner'
  | 'hazard'
  | 'splitter'
  | 'healer'
  | 'hunter'
  | 'elite'
  | 'boss';

export interface VisualProfile {
  profileId: string;
  animationSet: string;
  baseScale: number;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  role: EnemyRole;
  health: number;
  speed: number;
  damage: number;
  experience: number;
  radius: number;
  color: number;
  visual: VisualProfile;
}

const evolutionRequirement = (
  weapon: WeaponId,
  passive: PassiveId,
): NonNullable<UpgradeDefinition['requires']> => ({
  weapon,
  passive,
  weaponLevel: 5,
  passiveLevel: 3,
});

export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'executioner-axe',
    name: 'Machado do Carrasco',
    description: 'Golpe em arco diante do personagem.',
    detail: 'Dano frontal, alcance e velocidade.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'watch-crossbow',
    name: 'Besta da Vigília',
    description: 'Dispara contra o inimigo mais próximo.',
    detail: 'Dano, velocidade e perfuração.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'celestial-aura',
    name: 'Aura Celestial',
    description: 'Pulso que atinge a horda ao redor.',
    detail: 'Dano, alcance e intervalo.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'widow-venom',
    name: 'Peçonha da Viúva',
    description: 'Agulhas aplicam veneno prolongado.',
    detail: 'Impacto, veneno e acúmulos.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'spear',
    name: 'Lança',
    description: 'Perfura uma linha diante do personagem.',
    detail: 'Dano, alcance e alvos.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'ash-lantern',
    name: 'Lanterna de Cinzas',
    description: 'Deixa brasas no caminho percorrido.',
    detail: 'Dano, duração e trechos.',
    kind: 'weapon',
    maxLevel: 5,
  },
  {
    id: 'runic-plate',
    name: 'Couraça Rúnica',
    description: 'Aumenta a armadura.',
    detail: '+5 de armadura.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'fallen-vigor',
    name: 'Vigor dos Caídos',
    description: 'Aumenta a vida máxima.',
    detail: '+12 de vida máxima e +6 de cura.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'hunter-steps',
    name: 'Passos do Caçador',
    description: 'Aumenta a velocidade de movimento.',
    detail: '+8% de velocidade.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'quick-hands',
    name: 'Mãos Ligeiras',
    description: 'Reduz a recarga das armas.',
    detail: '-4% de recarga.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'long-sight',
    name: 'Visão Longa',
    description: 'Aumenta o alcance das armas.',
    detail: '+6% de alcance.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'persistence',
    name: 'Persistência',
    description: 'Prolonga áreas e efeitos.',
    detail: '+6% de duração.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'ancient-blood',
    name: 'Sangue Antigo',
    description: 'Regenera vida continuamente.',
    detail: '+0,08 de vida por segundo.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'wisdom',
    name: 'Sabedoria',
    description: 'Aumenta a experiência recebida.',
    detail: '+8% de experiência.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'blessing',
    name: 'Bênção',
    description: 'Aumenta a cura recebida.',
    detail: '+10% de cura.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'magnetism',
    name: 'Magnetismo',
    description: 'Atrai itens de mais longe.',
    detail: '+20% de alcance de coleta.',
    kind: 'passive',
    maxLevel: 5,
  },
  {
    id: 'barbarian-fury',
    name: 'Fúria Bárbara',
    description: 'Dois giros completos ao redor do personagem.',
    detail: 'O segundo giro causa dano reduzido.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('executioner-axe', 'runic-plate'),
  },
  {
    id: 'piercing-oath',
    name: 'Juramento Perfurante',
    description: 'Dispara três virotes perfurantes.',
    detail: 'O virote central causa mais dano.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('watch-crossbow', 'quick-hands'),
  },
  {
    id: 'divine-aura',
    name: 'Aura Divina',
    description: 'Área constante que causa dano e lentidão.',
    detail: 'Chefes sofrem lentidão reduzida.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('celestial-aura', 'fallen-vigor'),
  },
  {
    id: 'black-widow',
    name: 'Viúva Negra',
    description: 'Veneno mais longo que expõe o inimigo.',
    detail: 'Outras fontes causam dano aumentado.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('widow-venom', 'persistence'),
  },
  {
    id: 'impaler',
    name: 'Empaladora',
    description: 'A lança atinge na ida e no retorno.',
    detail: 'Faixa maior e mais inimigos perfurados.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('spear', 'long-sight'),
  },
  {
    id: 'hell-steps',
    name: 'Passos do Inferno',
    description: 'As brasas explodem ao desaparecer.',
    detail: 'Dano contínuo seguido por uma explosão.',
    kind: 'evolution',
    maxLevel: 3,
    requires: evolutionRequirement('ash-lantern', 'hunter-steps'),
  },
] as const;

const visual = (
  profileId: string,
  animationSet: string,
  baseScale = 1,
): VisualProfile => ({
  profileId,
  animationSet,
  baseScale,
});

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
    visual: visual('crawler', 'enemy-common'),
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
    visual: visual('runner', 'enemy-runner', 0.92),
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
    visual: visual('cultist', 'enemy-ranged'),
  },
  'armored-penitent': {
    id: 'armored-penitent',
    name: 'Penitente Blindado',
    role: 'tank',
    health: 135,
    speed: 35,
    damage: 16,
    experience: 20,
    radius: 23,
    color: 0x7f745f,
    visual: visual('armored-penitent', 'enemy-heavy', 1.08),
  },
  'ruin-herald': {
    id: 'ruin-herald',
    name: 'Arauto da Ruína',
    role: 'support',
    health: 72,
    speed: 45,
    damage: 11,
    experience: 24,
    radius: 19,
    color: 0x9a7846,
    visual: visual('ruin-herald', 'enemy-caster'),
  },
  'sepulchral-guardian': {
    id: 'sepulchral-guardian',
    name: 'Guardião Sepulcral',
    role: 'guardian',
    health: 110,
    speed: 38,
    damage: 15,
    experience: 22,
    radius: 23,
    color: 0x667886,
    visual: visual('sepulchral-guardian', 'enemy-guardian', 1.08),
  },
  'ash-summoner': {
    id: 'ash-summoner',
    name: 'Invocador da Cinza',
    role: 'summoner',
    health: 65,
    speed: 36,
    damage: 10,
    experience: 25,
    radius: 19,
    color: 0x725481,
    visual: visual('ash-summoner', 'enemy-summoner'),
  },
  'plague-sower': {
    id: 'plague-sower',
    name: 'Semeador da Praga',
    role: 'hazard',
    health: 80,
    speed: 40,
    damage: 14,
    experience: 22,
    radius: 20,
    color: 0x73834a,
    visual: visual('plague-sower', 'enemy-hazard'),
  },
  shattered: {
    id: 'shattered',
    name: 'Estilhaçado',
    role: 'splitter',
    health: 55,
    speed: 62,
    damage: 12,
    experience: 15,
    radius: 18,
    color: 0x7d6d79,
    visual: visual('shattered', 'enemy-splitter'),
  },
  'pale-priest': {
    id: 'pale-priest',
    name: 'Sacerdote Pálido',
    role: 'healer',
    health: 95,
    speed: 38,
    damage: 10,
    experience: 30,
    radius: 21,
    color: 0xb0a47a,
    visual: visual('pale-priest', 'enemy-healer'),
  },
  'mist-hunter': {
    id: 'mist-hunter',
    name: 'Caçador da Bruma',
    role: 'hunter',
    health: 70,
    speed: 70,
    damage: 18,
    experience: 28,
    radius: 18,
    color: 0x526b74,
    visual: visual('mist-hunter', 'enemy-hunter'),
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
    visual: visual('corrupted-executioner', 'enemy-elite', 1.16),
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
    visual: visual('plague-bishop', 'enemy-boss', 1.24),
  },
} as const satisfies Record<EnemyId, EnemyDefinition>;

export function getUpgrade(id: UpgradeId): UpgradeDefinition {
  const definition = UPGRADES.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Melhoria desconhecida: ${id}`);
  }
  return definition;
}
