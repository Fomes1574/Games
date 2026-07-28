import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifest = JSON.parse(
  await readFile(resolve(process.cwd(), 'public/manifests/assets.json'), 'utf8'),
);
const pending = manifest.assets.filter((asset) => asset.status === 'planned');

console.log(
  JSON.stringify(
    {
      dryRun: true,
      count: pending.length,
      pending: pending.map(({ id, kind }) => ({ id, kind })),
    },
    null,
    2,
  ),
);
