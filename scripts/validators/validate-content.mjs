import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifest = JSON.parse(
  await readFile(resolve(process.cwd(), 'public/manifests/content.json'), 'utf8'),
);
const collections = [
  'characters',
  'weapons',
  'passives',
  'evolutions',
  'enemies',
  'bosses',
];

if (manifest.version !== 1) {
  throw new Error('Versão do manifesto de conteúdo não suportada.');
}

for (const collection of collections) {
  if (!Array.isArray(manifest[collection])) {
    throw new Error(`Coleção ausente ou inválida: ${collection}.`);
  }
}

console.log(`Conteúdo válido: ${collections.length} coleções.`);
