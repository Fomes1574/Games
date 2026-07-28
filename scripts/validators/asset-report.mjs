import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(
  await readFile(resolve(root, 'public/manifests/assets.json'), 'utf8'),
);
const reportDirectory = resolve(root, 'reports/assets');

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, 'report.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), ...manifest }, null, 2)}\n`,
);
console.log(`Relatório criado com ${manifest.assets.length} asset(s).`);
