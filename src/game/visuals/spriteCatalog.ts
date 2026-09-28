import type Phaser from 'phaser';

/**
 * Catálogo de sprites gerados por IA para personagens do jogo.
 *
 * Cada personagem possui quatro quadros de caminhada em PNG com transparência,
 * servidos a partir de `public/assets/sprites`. Os quadros foram normalizados
 * com pivô nos pés e escala estável, conforme `docs/ANIMATION_SPEC.md`.
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

/** Registra todos os quadros de caminhada no carregador da cena. */
export const preloadCharacterSprites = (
  loader: Phaser.Loader.LoaderPlugin,
): void => {
  const sets = [PLAYER_SPRITE_SET, ...Object.values(ENEMY_SPRITE_SETS)];
  for (const set of sets) {
    set.frameKeys.forEach((key, index) => {
      if (!loader.textureManager.exists(key)) {
        loader.image(key, spriteUrl(`${set.id}-walk-${index}.png`));
      }
    });
  }
};

/** Indica se todos os quadros de um conjunto estão disponíveis na textura. */
export const spriteSetAvailable = (
  scene: Phaser.Scene,
  set: CharacterSpriteSet,
): boolean => set.frameKeys.every((key) => scene.textures.exists(key));

/** Cria as animações de caminhada uma única vez por jogo. */
export const ensureCharacterAnimations = (scene: Phaser.Scene): void => {
  const sets = [PLAYER_SPRITE_SET, ...Object.values(ENEMY_SPRITE_SETS)];
  for (const set of sets) {
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
