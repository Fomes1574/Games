import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const report = {
  version: 1,
  status: 'pending-full-run',
  reason:
    'A fatia jogável existe; a simulação massiva será ativada no marco de balanceamento.',
  simulations: 0,
};
const reportDirectory = resolve(process.cwd(), 'reports/balance');

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, 'summary.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log('Simulador preparado; a execução massiva pertence ao marco de balanceamento.');
