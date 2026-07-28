import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'public/manifests/assets.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.version !== 1 || !Array.isArray(manifest.assets)) {
  throw new Error('Manifesto de assets inválido.');
}

const ids = new Set();
for (const asset of manifest.assets) {
  if (typeof asset.id !== 'string' || ids.has(asset.id)) {
    throw new Error(`ID de asset inválido ou duplicado: ${String(asset.id)}`);
  }
  ids.add(asset.id);

  if (asset.required && typeof asset.source === 'string') {
    await access(resolve(root, asset.source));
  }
}

console.log(`Assets válidos: ${manifest.assets.length}.`);
