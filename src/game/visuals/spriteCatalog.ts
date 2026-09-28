import type Phaser from 'phaser';

/**
 * Catálogo de sprites gerados por IA para personagens do jogo.
 *
 * Cada personagem possui quatro quadros de caminhada em PNG com transparência,
 * servidos a partir de `public/assets/sprites`. Os quadros foram normalizados
 * com pivô nos pés e escala estável, conforme `docs/ANIMATION_SPEC.md`.
 *
 * O carregamento é guiado por `public/assets/sprites/manifest.json`: somente os
 * conjuntos listados ali são solicitados, evitando erros de console enquanto os
 * PNGs ainda não foram publicados.
 */

export interface CharacterSpriteSet {
  readonly id: string;
  readonly idleFrameKey: string;
  readonly frameKeys: readonly string[];
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameRate: number;
  readonly facesRight: boolean;
  readonly walkAnimationKey: string;
}

const WALK_FRAME_COUNT = 4;
const SPRITE_MANIFEST_KEY = 'character-sprite-manifest';
const SPRITE_MANIFEST_FILE = 'manifest.json';

const defineSet = (
  id: string,
  cellSize: number,
  facesRight = true,
  frameRate = 9,
): CharacterSpriteSet => ({
  id,
  idleFrameKey: `sprite-${id}-walk-0`,
  frameKeys: Array.from(
    { length: WALK_FRAME_COUNT },
    (_unused, index) => `sprite-${id}-walk-${index}`,
  ),
  frameWidth: cellSize,
  frameHeight: cellSize,
  frameRate,
  facesRight,
  walkAnimationKey: `anim-${id}-walk`,
});

export const PLAYER_SPRITE_SET = defineSet('brutamontes', 128, true, 10);

export const ENEMY_SPRITE_SETS: Readonly<Record<string, CharacterSpriteSet>> = {
  crawler: defineSet('crawler', 96, true, 10),
  runner: defineSet('runner', 96, true, 12),
  cultist: defineSet('cultist', 96, true, 9),
  'armored-penitent': defineSet('armored-penitent', 96, true, 7),
  'ruin-herald': defineSet('ruin-herald', 96, true, 8),
  'sepulchral-guardian': defineSet('sepulchral-guardian', 96, true, 6),
  'ash-summoner': defineSet('ash-summoner', 96, true, 7),
  'plague-sower': defineSet('plague-sower', 96, true, 7),
  shattered: defineSet('shattered', 96, true, 8),
  'pale-priest': defineSet('pale-priest', 96, true, 7),
  'mist-hunter': defineSet('mist-hunter', 96, false, 10),
  'corrupted-executioner': defineSet('corrupted-executioner', 128, true, 8),
  'plague-bishop': defineSet('plague-bishop', 256, true, 6),
};

const spriteUrl = (file: string): string =>
  `${import.meta.env.BASE_URL}assets/sprites/${file}`;

const allSets = (): CharacterSpriteSet[] => [
  PLAYER_SPRITE_SET,
  ...Object.values(ENEMY_SPRITE_SETS),
];

/** Carrega o manifesto que lista os conjuntos de sprites publicados. */
export const preloadSpriteManifest = (scene: Phaser.Scene): void => {
  if (!scene.cache.json.has(SPRITE_MANIFEST_KEY)) {
    scene.load.json(SPRITE_MANIFEST_KEY, spriteUrl(SPRITE_MANIFEST_FILE));
  }
};

const readAvailableSetIds = (scene: Phaser.Scene): ReadonlySet<string> => {
  const manifest: unknown = scene.cache.json.get(SPRITE_MANIFEST_KEY);
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('sets' in manifest)
  ) {
    return new Set();
  }
  const { sets } = manifest;
  if (!Array.isArray(sets)) {
    return new Set();
  }
  return new Set(
    sets.filter((id: unknown): id is string => typeof id === 'string'),
  );
};

/**
 * Enfileira os quadros dos conjuntos listados no manifesto e retorna quantos
 * arquivos entraram na fila. Cabe à cena iniciar o carregamento.
 */
export const enqueueAvailableCharacterSprites = (scene: Phaser.Scene): number => {
  const available = readAvailableSetIds(scene);
  let queued = 0;
  for (const set of allSets()) {
    if (!available.has(set.id)) {
      continue;
    }
    set.frameKeys.forEach((key, index) => {
      if (!scene.textures.exists(key)) {
        scene.load.image(key, spriteUrl(`${set.id}-walk-${index}.png`));
        queued += 1;
      }
    });
  }
  return queued;
};

/** Indica se todos os quadros de um conjunto estão disponíveis na textura. */
export const spriteSetAvailable = (
  scene: Phaser.Scene,
  set: CharacterSpriteSet,
): boolean => set.frameKeys.every((key) => scene.textures.exists(key));

/** Cria as animações de caminhada uma única vez por jogo. */
export const ensureCharacterAnimations = (scene: Phaser.Scene): void => {
  for (const set of allSets()) {
    if (
      scene.anims.exists(set.walkAnimationKey) ||
      !spriteSetAvailable(scene, set)
    ) {
      continue;
    }
    scene.anims.create({
      key: set.walkAnimationKey,
      frames: set.frameKeys.map((key) => ({ key })),
      frameRate: set.frameRate,
      repeat: -1,
    });
  }
};
