import {
  ENEMIES,
  getUpgrade,
  type EnemyId,
  type PassiveId,
  type UpgradeId,
  type WeaponId,
} from '../../data/content';

export type CodexCategory = 'weapons' | 'passives' | 'enemies' | 'bosses' | 'maps';
export type CodexEntryId = `${CodexCategory}:${string}`;

export interface CodexStat {
  label: string;
  value: string;
}

export interface CodexEntry {
  id: CodexEntryId;
  category: CodexCategory;
  contentId: string;
  name: string;
  description: string;
  stats: readonly CodexStat[];
  accent: string;
  sigil: string;
  visualProfile: string;
}

const weaponRows = [
  ['executioner-axe', 'Machado do Carrasco', 'Golpeia a horda em um arco frontal.', '48', '1,00s', '125', '#c86a39', 'ᚷ'],
  ['watch-crossbow', 'Besta da Vigília', 'Persegue o inimigo mais próximo com virotes perfurantes.', '34', '1,20s', '1', '#d8b66f', '⌁'],
  ['celestial-aura', 'Aura Celestial', 'Libera pulsos ao redor do aventureiro.', '29', '2,65s', '177', '#c6bd78', '☼'],
  ['widow-venom', 'Peçonha da Viúva', 'Aplica um veneno que salta ao próximo hospedeiro.', '6/s', '5s', '1', '#84b85b', '◆'],
  ['spear', 'Lança', 'Perfura uma linha diante do aventureiro.', '40', '1,40s', '280', '#d4b778', '↟'],
  ['ash-lantern', 'Lanterna de Cinzas', 'Deixa brasas ardentes no caminho percorrido.', '5/pulso', '2,5s', '5', '#d46b35', '✦'],
] as const;

const weaponEvolutions: Record<WeaponId, string> = {
  'executioner-axe': 'Fúria Bárbara',
  'watch-crossbow': 'Juramento Perfurante',
  'celestial-aura': 'Aura Divina',
  'widow-venom': 'Viúva Negra',
  spear: 'Empaladora',
  'ash-lantern': 'Passos do Inferno',
};

const weaponEntries: readonly CodexEntry[] = weaponRows.map(
  ([contentId, name, description, damage, interval, reach, accent, sigil]) => ({
  id: `weapons:${contentId}` as const,
  category: 'weapons' as const,
  contentId,
  name,
  description,
  stats: [
    { label: 'Dano', value: damage },
    { label: 'Recarga', value: interval },
    { label: 'Alcance', value: reach },
    { label: 'Evolução', value: weaponEvolutions[contentId] },
  ],
  accent,
  sigil,
  visualProfile: `weapon-${contentId}`,
  }),
);

const passiveIds = [
  'runic-plate',
  'fallen-vigor',
  'hunter-steps',
  'quick-hands',
  'long-sight',
  'persistence',
  'ancient-blood',
  'wisdom',
  'blessing',
  'magnetism',
] as const satisfies readonly PassiveId[];

const passiveEntries: readonly CodexEntry[] = passiveIds.map((contentId, index) => {
  const definition = getUpgrade(contentId);
  return {
    id: `passives:${contentId}`,
    category: 'passives',
    contentId,
    name: definition.name,
    description: definition.description,
    stats: [
      { label: 'Por nível', value: definition.detail },
      { label: 'Máximo', value: String(definition.maxLevel) },
    ],
    accent: ['#9c8065', '#a85e52', '#668c79', '#c0a167', '#7b91a5'][index % 5] ?? '#9c8065',
    sigil: ['⬟', '♥', '➶', '⌁', '◈'][index % 5] ?? '◆',
    visualProfile: `passive-${contentId}`,
  };
});

const enemyIds = [
  'crawler',
  'runner',
  'cultist',
  'armored-penitent',
  'ruin-herald',
  'sepulchral-guardian',
  'ash-summoner',
  'plague-sower',
  'shattered',
  'pale-priest',
  'mist-hunter',
  'corrupted-executioner',
] as const satisfies readonly EnemyId[];

const enemyDescriptions: Partial<Record<EnemyId, string>> = {
  crawler: 'Avança em massa e fecha lentamente as rotas de fuga.',
  runner: 'Rompe a formação com velocidade e ataques rápidos.',
  cultist: 'Mantém distância e dispara através da bruma.',
  'armored-penitent': 'Absorve golpes e abre caminho para a procissão.',
  'ruin-herald': 'Fortalece inimigos próximos enquanto permanece vivo.',
  'sepulchral-guardian': 'Ergue a guarda entre ataques e reduz o dano recebido.',
  'ash-summoner': 'Convoca rastejantes enquanto não for interrompido.',
  'plague-sower': 'Contamina o chão e obriga o aventureiro a se mover.',
  shattered: 'Parte-se em duas criaturas quando é destruído.',
  'pale-priest': 'Recupera a vida dos aliados próximos.',
  'mist-hunter': 'Prepara investidas contra a direção do movimento.',
  'corrupted-executioner': 'Um elite brutal que exige espaço e atenção.',
};

const enemyEntries: readonly CodexEntry[] = enemyIds.map((contentId) => {
  const definition = ENEMIES[contentId];
  return {
    id: `enemies:${contentId}`,
    category: 'enemies',
    contentId,
    name: definition.name,
    description: enemyDescriptions[contentId] ?? 'Uma criatura tomada pela noite.',
    stats: [
      { label: 'Vida-base', value: String(definition.health) },
      { label: 'Dano-base', value: String(definition.damage) },
      { label: 'Velocidade', value: String(definition.speed) },
      { label: 'Experiência', value: String(definition.experience) },
    ],
    accent: `#${definition.color.toString(16).padStart(6, '0')}`,
    sigil: definition.role === 'elite' ? '✥' : '◉',
    visualProfile: definition.visual.profileId,
  };
});

const boss = ENEMIES['plague-bishop'];
const bossEntries: readonly CodexEntry[] = [
  {
    id: 'bosses:plague-bishop',
    category: 'bosses',
    contentId: boss.id,
    name: boss.name,
    description: 'Espalha zonas de peste e acelera quando sua vida cai pela metade.',
    stats: [
      { label: 'Vida-base', value: String(boss.health) },
      { label: 'Dano-base', value: String(boss.damage) },
      { label: 'Velocidade', value: String(boss.speed) },
      { label: 'Fases', value: '2' },
    ],
    accent: '#7b9947',
    sigil: '♜',
    visualProfile: boss.visual.profileId,
  },
];

const mapEntries: readonly CodexEntry[] = [
  {
    id: 'maps:bell-moor',
    category: 'maps',
    contentId: 'bell-moor',
    name: 'Charneca dos Sinos',
    description: 'Uma planície corrompida onde a procissão protege o Bispo da Peste.',
    stats: [
      { label: 'Duração', value: '05:00' },
      { label: 'Eventos', value: 'Silenciosos' },
      { label: 'Chefe', value: 'Bispo da Peste' },
    ],
    accent: '#8b4d42',
    sigil: '⌂',
    visualProfile: 'map-bell-moor',
  },
];

export const CODEX_ENTRIES = [
  ...weaponEntries,
  ...passiveEntries,
  ...enemyEntries,
  ...bossEntries,
  ...mapEntries,
] as const satisfies readonly CodexEntry[];

export const CODEX_ENTRY_IDS = CODEX_ENTRIES.map((entry) => entry.id) as
  readonly CodexEntryId[];

export function codexUpgradeId(id: UpgradeId): CodexEntryId {
  const definition = getUpgrade(id);
  const category = definition.kind === 'passive' ? 'passives' : 'weapons';
  const contentId = definition.kind === 'evolution' ? definition.requires?.weapon ?? id : id;
  return `${category}:${contentId}`;
}

export function codexEnemyId(id: EnemyId): CodexEntryId {
  return `${id === 'plague-bishop' ? 'bosses' : 'enemies'}:${id}`;
}

export function codexEntriesFor(category: CodexCategory): readonly CodexEntry[] {
  return CODEX_ENTRIES.filter((entry) => entry.category === category);
}

export function codexWeaponId(id: WeaponId): CodexEntryId {
  return `weapons:${id}`;
}
