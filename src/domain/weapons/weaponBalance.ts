export interface AxeStats {
  damage: number;
  cooldown: number;
  range: number;
  arcDegrees: number;
}

export interface BarbarianFuryStats {
  firstDamage: number;
  secondDamage: number;
  cooldown: number;
  range: number;
}

export interface CrossbowStats {
  damage: number;
  cooldown: number;
  piercing: number;
}

export interface PiercingOathStats {
  centerDamage: number;
  sideDamage: number;
  cooldown: number;
  piercing: number;
}

export interface CelestialAuraStats {
  damage: number;
  cooldown: number;
  range: number;
}

export interface DivineAuraStats {
  damagePerTick: number;
  tickInterval: number;
  range: number;
  slow: number;
  bossSlow: number;
}

export interface WidowVenomStats {
  impactDamage: number;
  damagePerSecond: number;
  duration: number;
  maximumStacks: number;
  cooldown: number;
}

export interface BlackWidowStats {
  impactDamage: number;
  damagePerSecond: number;
  duration: number;
  maximumStacks: number;
  cooldown: number;
  damageVulnerability: number;
  projectileCount: number;
  secondaryDamageScale: number;
}

export interface SpearStats {
  damage: number;
  cooldown: number;
  range: number;
  maximumTargets: number;
  width: number;
}

export interface ImpalerStats {
  outwardDamage: number;
  returnDamage: number;
  cooldown: number;
  range: number;
  maximumTargets: number;
  width: number;
}

export interface AshLanternStats {
  tickDamage: number;
  tickInterval: number;
  duration: number;
  maximumSegments: number;
  placementInterval: number;
  radius: number;
}

export interface HellStepsStats extends AshLanternStats {
  explosionDamage: number;
  explosionRadius: number;
}

export const AXE_LEVELS = [
  { damage: 48, cooldown: 1, range: 125, arcDegrees: 110 },
  { damage: 60, cooldown: 0.95, range: 130, arcDegrees: 120 },
  { damage: 72, cooldown: 0.9, range: 136, arcDegrees: 125 },
  { damage: 84, cooldown: 0.85, range: 143, arcDegrees: 135 },
  { damage: 96, cooldown: 0.8, range: 150, arcDegrees: 145 },
] as const satisfies readonly AxeStats[];

export const BARBARIAN_FURY_LEVELS = [
  { firstDamage: 96, secondDamage: 62, cooldown: 1.05, range: 170 },
  { firstDamage: 108, secondDamage: 76, cooldown: 1, range: 180 },
  { firstDamage: 120, secondDamage: 96, cooldown: 0.9, range: 190 },
] as const satisfies readonly BarbarianFuryStats[];

export const CROSSBOW_LEVELS = [
  { damage: 34, cooldown: 1.2, piercing: 1 },
  { damage: 44, cooldown: 1.12, piercing: 1 },
  { damage: 54, cooldown: 1.04, piercing: 2 },
  { damage: 64, cooldown: 0.96, piercing: 2 },
  { damage: 74, cooldown: 0.88, piercing: 3 },
] as const satisfies readonly CrossbowStats[];

export const PIERCING_OATH_LEVELS = [
  { centerDamage: 74, sideDamage: 48, cooldown: 1, piercing: 4 },
  { centerDamage: 82, sideDamage: 57, cooldown: 0.95, piercing: 5 },
  { centerDamage: 92, sideDamage: 69, cooldown: 0.88, piercing: 6 },
] as const satisfies readonly PiercingOathStats[];

export const CELESTIAL_AURA_LEVELS = [
  { damage: 29, cooldown: 2.65, range: 177 },
  { damage: 40, cooldown: 2.39, range: 199 },
  { damage: 51, cooldown: 2.15, range: 221 },
  { damage: 62, cooldown: 1.93, range: 243 },
  { damage: 73, cooldown: 1.74, range: 265 },
] as const satisfies readonly CelestialAuraStats[];

export const DIVINE_AURA_LEVELS = [
  { damagePerTick: 18, tickInterval: 0.5, range: 300, slow: 0.22, bossSlow: 0.08 },
  { damagePerTick: 20, tickInterval: 0.5, range: 320, slow: 0.26, bossSlow: 0.1 },
  { damagePerTick: 23, tickInterval: 0.5, range: 340, slow: 0.3, bossSlow: 0.12 },
] as const satisfies readonly DivineAuraStats[];

export const WIDOW_VENOM_LEVELS = [
  {
    impactDamage: 8,
    damagePerSecond: 6,
    duration: 5,
    maximumStacks: 1,
    cooldown: 1.2,
  },
  {
    impactDamage: 12,
    damagePerSecond: 8,
    duration: 5,
    maximumStacks: 1,
    cooldown: 1.15,
  },
  {
    impactDamage: 16,
    damagePerSecond: 10,
    duration: 5,
    maximumStacks: 2,
    cooldown: 1.1,
  },
  {
    impactDamage: 20,
    damagePerSecond: 12,
    duration: 5,
    maximumStacks: 2,
    cooldown: 1.05,
  },
  {
    impactDamage: 24,
    damagePerSecond: 14,
    duration: 5,
    maximumStacks: 3,
    cooldown: 1,
  },
] as const satisfies readonly WidowVenomStats[];

export const BLACK_WIDOW_LEVELS = [
  {
    impactDamage: 24,
    damagePerSecond: 16,
    duration: 7,
    maximumStacks: 3,
    cooldown: 1,
    damageVulnerability: 0.12,
    projectileCount: 1,
    secondaryDamageScale: 0,
  },
  {
    impactDamage: 28,
    damagePerSecond: 18,
    duration: 7.5,
    maximumStacks: 3,
    cooldown: 0.95,
    damageVulnerability: 0.16,
    projectileCount: 1,
    secondaryDamageScale: 0,
  },
  {
    impactDamage: 32,
    damagePerSecond: 20,
    duration: 8,
    maximumStacks: 3,
    cooldown: 0.9,
    damageVulnerability: 0.2,
    projectileCount: 2,
    secondaryDamageScale: 0.6,
  },
] as const satisfies readonly BlackWidowStats[];

export const SPEAR_LEVELS = [
  { damage: 40, cooldown: 1.4, range: 280, maximumTargets: 4, width: 34 },
  { damage: 52, cooldown: 1.32, range: 300, maximumTargets: 5, width: 36 },
  { damage: 64, cooldown: 1.24, range: 320, maximumTargets: 6, width: 38 },
  { damage: 76, cooldown: 1.16, range: 340, maximumTargets: 7, width: 40 },
  { damage: 88, cooldown: 1.08, range: 360, maximumTargets: 8, width: 42 },
] as const satisfies readonly SpearStats[];

export const IMPALER_LEVELS = [
  {
    outwardDamage: 88,
    returnDamage: 48,
    cooldown: 1.08,
    range: 380,
    maximumTargets: 12,
    width: 74,
  },
  {
    outwardDamage: 100,
    returnDamage: 60,
    cooldown: 1,
    range: 400,
    maximumTargets: 14,
    width: 80,
  },
  {
    outwardDamage: 114,
    returnDamage: 80,
    cooldown: 0.92,
    range: 420,
    maximumTargets: 16,
    width: 88,
  },
] as const satisfies readonly ImpalerStats[];

export const ASH_LANTERN_LEVELS = [
  {
    tickDamage: 5,
    tickInterval: 0.5,
    duration: 2.5,
    maximumSegments: 5,
    placementInterval: 0.5,
    radius: 52,
  },
  {
    tickDamage: 7,
    tickInterval: 0.5,
    duration: 2.7,
    maximumSegments: 6,
    placementInterval: 0.48,
    radius: 54,
  },
  {
    tickDamage: 9,
    tickInterval: 0.5,
    duration: 3,
    maximumSegments: 7,
    placementInterval: 0.46,
    radius: 56,
  },
  {
    tickDamage: 11,
    tickInterval: 0.5,
    duration: 3.2,
    maximumSegments: 8,
    placementInterval: 0.44,
    radius: 58,
  },
  {
    tickDamage: 13,
    tickInterval: 0.5,
    duration: 3.5,
    maximumSegments: 9,
    placementInterval: 0.42,
    radius: 60,
  },
] as const satisfies readonly AshLanternStats[];

export const HELL_STEPS_LEVELS = [
  {
    tickDamage: 13,
    tickInterval: 0.5,
    duration: 3.5,
    maximumSegments: 9,
    placementInterval: 0.42,
    radius: 60,
    explosionDamage: 45,
    explosionRadius: 86,
  },
  {
    tickDamage: 15,
    tickInterval: 0.5,
    duration: 3.8,
    maximumSegments: 10,
    placementInterval: 0.4,
    radius: 63,
    explosionDamage: 58,
    explosionRadius: 92,
  },
  {
    tickDamage: 18,
    tickInterval: 0.5,
    duration: 4,
    maximumSegments: 11,
    placementInterval: 0.38,
    radius: 66,
    explosionDamage: 72,
    explosionRadius: 100,
  },
] as const satisfies readonly HellStepsStats[];

export function atLevel<T>(levels: readonly T[], level: number): T {
  const index = Math.min(levels.length, Math.max(1, Math.floor(level))) - 1;
  const value = levels[index];
  if (!value) {
    throw new Error(`Nível de arma inválido: ${level}`);
  }
  return value;
}
