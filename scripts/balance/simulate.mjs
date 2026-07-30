import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ENCOUNTER_TIMELINE } from '../../src/domain/encounters/encounterTimeline.ts';
import {
  ASH_LANTERN_LEVELS,
  AXE_LEVELS,
  BLACK_WIDOW_LEVELS,
  CELESTIAL_AURA_LEVELS,
  CROSSBOW_LEVELS,
  DIVINE_AURA_LEVELS,
  SPEAR_LEVELS,
  WIDOW_VENOM_LEVELS,
} from '../../src/domain/weapons/weaponBalance.ts';

const last = (values) => values.at(-1);
const round = (value) => Math.round(value * 100) / 100;
const damageAfterArmor = (damage, armor) => damage * (100 / (100 + armor));

const axe = last(AXE_LEVELS);
const crossbow = last(CROSSBOW_LEVELS);
const aura = last(CELESTIAL_AURA_LEVELS);
const divineAura = last(DIVINE_AURA_LEVELS);
const venom = last(WIDOW_VENOM_LEVELS);
const blackWidow = last(BLACK_WIDOW_LEVELS);
const spear = last(SPEAR_LEVELS);
const lantern = last(ASH_LANTERN_LEVELS);

if (
  !axe ||
  !crossbow ||
  !aura ||
  !divineAura ||
  !venom ||
  !blackWidow ||
  !spear ||
  !lantern
) {
  throw new Error('Tabelas de balanceamento incompletas.');
}

const sustainedDamagePerSecond = {
  'executioner-axe': round(axe.damage / axe.cooldown),
  'watch-crossbow': round(crossbow.damage / crossbow.cooldown),
  'celestial-aura': round(aura.damage / aura.cooldown),
  'divine-aura': round(divineAura.damagePerTick / divineAura.tickInterval),
  'widow-venom': round(
    venom.impactDamage / venom.cooldown +
      venom.damagePerSecond * venom.maximumStacks,
  ),
  'black-widow': round(
    blackWidow.impactDamage / blackWidow.cooldown +
      blackWidow.damagePerSecond * blackWidow.maximumStacks,
  ),
  spear: round(spear.damage / spear.cooldown),
  'ash-lantern': round(lantern.tickDamage / lantern.tickInterval),
};

const invalidWeapons = Object.entries(sustainedDamagePerSecond).filter(
  ([, damage]) => damage < 10 || damage > 250,
);
if (invalidWeapons.length > 0) {
  throw new Error(`Armas fora do limite inicial: ${JSON.stringify(invalidWeapons)}`);
}
if (divineAura.bossSlow >= divineAura.slow) {
  throw new Error('A lentidão da Aura Divina precisa ser menor em chefes.');
}
if (blackWidow.damageVulnerability > 0.2) {
  throw new Error('Viúva Negra ultrapassou o limite de vulnerabilidade.');
}

const incomingHits = Object.fromEntries(
  Object.entries({
    crawler: 8,
    runner: 10,
    cultist: 13,
    elite: 24,
    boss: 30,
  }).map(([enemy, damage]) => [
    enemy,
    Math.ceil(80 / damageAfterArmor(damage, 5)),
  ]),
);

const report = {
  version: 2,
  status: 'passed',
  player: {
    maximumHealth: 80,
    armor: 5,
    crowdResistance: 0,
    incomingHits,
  },
  weapons: sustainedDamagePerSecond,
  effects: {
    divineAuraSlow: divineAura.slow,
    divineAuraBossSlow: divineAura.bossSlow,
    blackWidowVulnerability: blackWidow.damageVulnerability,
    poisonTransferDurationScale: 0.5,
  },
  encounters: {
    waves: ENCOUNTER_TIMELINE.length,
    scheduledEnemies: ENCOUNTER_TIMELINE.reduce(
      (total, wave) => total + wave.count,
      0,
    ),
    firstWaveSeconds: ENCOUNTER_TIMELINE[0]?.at ?? null,
    lastWaveSeconds: ENCOUNTER_TIMELINE.at(-1)?.at ?? null,
  },
};

const reportDirectory = resolve(process.cwd(), 'reports/balance');
await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, 'summary.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `Balanceamento aprovado: ${Object.keys(sustainedDamagePerSecond).length} perfis e ` +
    `${report.encounters.scheduledEnemies} inimigos cronometrados.`,
);
