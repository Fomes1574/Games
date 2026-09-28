import type Phaser from 'phaser';

/**
 * Catálogo de arte pintada por IA (cenários, telas, retratos e ícones).
 *
 * Segue o mesmo contrato do spriteCatalog: a cena só requisita os arquivos
 * listados em public/assets/art/manifest.json. Com o manifesto vazio,
 * nenhuma requisição é feita e os visuais procedurais continuam ativos.
 */
export interface ArtAssetDefinition {
  id: string;
  file: string;
  textureKey: string;
}

export const ART_MANIFEST_KEY = 'ultima-companhia-art-manifest';
export const ART_MANIFEST_FILE = 'manifest.json';

const ART_DIRECTORY = 'assets/art';

export const ART_ASSETS: readonly ArtAssetDefinition[] = [
  {
    id: 'menu-backdrop',
    file: 'menu-backdrop.jpg',
    textureKey: 'art-menu-backdrop',
  },
  {
    id: 'ground-tile',
    file: 'ground-tile.jpg',
    textureKey: 'art-ground-tile',
  },
  {
    id: 'portrait-brutamontes',
    file: 'portrait-brutamontes.jpg',
    textureKey: 'art-portrait-brutamontes',
  },
  {
    id: 'icon-executioner-axe',
    file: 'icon-executioner-axe.png',
    textureKey: 'art-icon-executioner-axe',
  },
  {
    id: 'icon-watch-crossbow',
    file: 'icon-watch-crossbow.png',
    textureKey: 'art-icon-watch-crossbow',
  },
  {
    id: 'icon-celestial-aura',
    file: 'icon-celestial-aura.png',
    textureKey: 'art-icon-celestial-aura',
  },
  {
    id: 'icon-widow-venom',
    file: 'icon-widow-venom.png',
    textureKey: 'art-icon-widow-venom',
  },
  {
    id: 'icon-spear',
    file: 'icon-spear.png',
    textureKey: 'art-icon-spear',
  },
  {
    id: 'icon-ash-lantern',
    file: 'icon-ash-lantern.png',
    textureKey: 'art-icon-ash-lantern',
  },
];

export const artAssetUrl = (file: string): string =>
  `${import.meta.env.BASE_URL}${ART_DIRECTORY}/${file}`;

const definitionById = (id: string): ArtAssetDefinition | undefined =>
  ART_ASSETS.find((asset) => asset.id === id);

export const preloadArtManifest = (scene: Phaser.Scene): void => {
  if (!scene.cache.json.has(ART_MANIFEST_KEY)) {
    scene.load.json(ART_MANIFEST_KEY, artAssetUrl(ART_MANIFEST_FILE));
  }
};

const readAvailableArtIds = (scene: Phaser.Scene): Set<string> => {
  const manifest: unknown = scene.cache.json.get(ART_MANIFEST_KEY);
  if (typeof manifest !== 'object' || manifest === null || !('assets' in manifest)) {
    return new Set();
  }
  const assets: unknown = manifest.assets;
  if (!Array.isArray(assets)) {
    return new Set();
  }
  return new Set(assets.filter((id: unknown): id is string => typeof id === 'string'));
};

export const enqueueAvailableArt = (scene: Phaser.Scene): number => {
  const available = readAvailableArtIds(scene);
  let queued = 0;
  for (const asset of ART_ASSETS) {
    if (!available.has(asset.id) || scene.textures.exists(asset.textureKey)) {
      continue;
    }
    scene.load.image(asset.textureKey, artAssetUrl(asset.file));
    queued += 1;
  }
  return queued;
};

export const artTextureKey = (id: string): string | undefined =>
  definitionById(id)?.textureKey;

export const artTextureAvailable = (scene: Phaser.Scene, id: string): boolean => {
  const asset = definitionById(id);
  return asset !== undefined && scene.textures.exists(asset.textureKey);
};
