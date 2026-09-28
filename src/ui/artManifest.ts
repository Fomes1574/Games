import { ART_ASSETS, artAssetUrl, ART_MANIFEST_FILE } from '../game/visuals/artCatalog';

/**
 * Lado DOM do catálogo de arte: lê o manifesto uma única vez e expõe URLs
 * prontas para <img>. Se o manifesto ou os arquivos não existirem, a
 * interface simplesmente mantém os visuais procedurais (sem erros).
 */
let availableArt = new Set<string>();
let manifestLoaded = false;

export const loadArtManifest = async (): Promise<void> => {
  if (manifestLoaded) {
    return;
  }
  manifestLoaded = true;
  try {
    const response = await fetch(artAssetUrl(ART_MANIFEST_FILE));
    if (!response.ok) {
      return;
    }
    const manifest: unknown = await response.json();
    if (typeof manifest !== 'object' || manifest === null || !('assets' in manifest)) {
      return;
    }
    const assets: unknown = manifest.assets;
    if (!Array.isArray(assets)) {
      return;
    }
    availableArt = new Set(
      assets.filter((id: unknown): id is string => typeof id === 'string'),
    );
  } catch {
    // Arte opcional indisponível: a interface segue com os visuais de origem.
  }
};

export const artImageUrl = (id: string): string | undefined => {
  if (!availableArt.has(id)) {
    return undefined;
  }
  const asset = ART_ASSETS.find((candidate) => candidate.id === id);
  return asset ? artAssetUrl(asset.file) : undefined;
};
