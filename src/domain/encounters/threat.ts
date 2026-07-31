export type ThreatLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ThreatModifiers {
  level: ThreatLevel;
  healthMultiplier: number;
  damageMultiplier: number;
  emberMultiplier: number;
}

export function clampThreatLevel(value: number): ThreatLevel {
  return Math.min(10, Math.max(1, Math.floor(value))) as ThreatLevel;
}

export function threatModifiers(value: number): ThreatModifiers {
  const level = clampThreatLevel(value);
  return {
    level,
    healthMultiplier: 1.18 ** (level - 1),
    damageMultiplier: 1.07 ** (level - 1),
    emberMultiplier: 1.15 ** (level - 1),
  };
}

export function romanThreat(level: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][
    clampThreatLevel(level) - 1
  ] ?? 'I';
}
