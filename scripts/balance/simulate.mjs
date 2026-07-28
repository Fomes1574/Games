import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const report = {
  version: 1,
  status: 'not-applicable',
  reason: 'O núcleo de combate começa no Marco 2.',
  simulations: 0,
};
const reportDirectory = resolve(process.cwd(), 'reports/balance');

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, 'summary.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log('Simulador preparado; nenhuma partida simulada antes do Marco 2.');
